from __future__ import annotations

from datetime import date, datetime, time, timedelta

from sqlalchemy import asc, desc, func
from sqlalchemy.orm import Session

from app import models
from app.services.chart_generator import generate_market_chart
from app.services.price_analytics import calculate_product_analytics
from app.services.selection_engine import build_selection_candidates
from app.services.signal_service import latest_verified_price, refresh_signal_for_strategy


class ReportGenerator:
    def __init__(self, db: Session):
        self.db = db

    def generate(self, report_date: date | None = None) -> models.DailyReport:
        report_date = report_date or date.today()
        day_start = datetime.combine(report_date, time.min)
        day_end = day_start + timedelta(days=1)

        products = (
            self.db.query(models.Product)
            .filter(models.Product.is_active.is_(True))
            .order_by(desc(models.Product.priority), asc(models.Product.id))
            .all()
        )
        product_by_id = {product.id: product for product in products}
        today_records = (
            self.db.query(models.PriceRecord)
            .filter(models.PriceRecord.captured_at >= day_start, models.PriceRecord.captured_at < day_end)
            .order_by(desc(models.PriceRecord.captured_at), desc(models.PriceRecord.id))
            .all()
        )
        today_verified = (
            self.db.query(models.PriceRecord)
            .filter(
                models.PriceRecord.verification_status == "VERIFIED_CHECKOUT",
                models.PriceRecord.checkout_price.isnot(None),
                models.PriceRecord.verified_at >= day_start,
                models.PriceRecord.verified_at < day_end,
            )
            .order_by(desc(models.PriceRecord.verified_at), desc(models.PriceRecord.id))
            .all()
        )

        status_counts = {name: 0 for name in ("VERIFIED_CHECKOUT", "VISIBLE_PRICE", "UNVERIFIED", "INVALID")}
        for row in today_records:
            status_counts[row.verification_status] = status_counts.get(row.verification_status, 0) + 1

        strategy_lines: list[str] = []
        verified_lines: list[str] = []
        signal_lines: list[str] = []
        historical_lines: list[str] = []
        analytics_lines: list[str] = []
        chart_rows: list[dict] = []
        trigger_count = 0
        stale_count = 0

        for row in today_verified:
            product = product_by_id.get(row.product_id)
            if not product:
                continue
            verified_lines.append(
                "| {product} | {platform} | {seller} | {price} | {currency} | {region} | {coupon} | {time} | {valid_until} | {source} |".format(
                    product=product.name,
                    platform=row.platform or "-",
                    seller=row.seller_name or "-",
                    price=_money(row.checkout_price, row.currency),
                    currency=row.currency or "CNY",
                    region=row.region or "-",
                    coupon=_escape(row.coupon_text or row.review_note or "人工核验"),
                    time=_format_dt(row.verified_at or row.captured_at),
                    valid_until=_format_dt(row.valid_until),
                    source=_source_link(row.source_url),
                )
            )

        for product in products:
            strategy = (
                self.db.query(models.Strategy)
                .filter(models.Strategy.product_id == product.id, models.Strategy.is_active.is_(True))
                .order_by(desc(models.Strategy.id))
                .first()
            )
            historical_verified = latest_verified_price(
                self.db,
                product.id,
                currency=strategy.currency if strategy else None,
            )
            fresh_verified = None
            if strategy:
                fresh_verified = latest_verified_price(
                    self.db,
                    product.id,
                    currency=strategy.currency,
                    max_age_hours=strategy.max_price_age_hours,
                    fresh_only=True,
                )
                signal = refresh_signal_for_strategy(self.db, strategy, historical_verified, commit=False)
                if signal.triggered:
                    trigger_count += 1
                if signal.signal_type == "STALE":
                    stale_count += 1

                shown_price = fresh_verified or historical_verified
                current_price = _money(shown_price.checkout_price, shown_price.currency) if shown_price else "无可核验到手价"
                freshness = "当前有效" if fresh_verified else ("已过期" if historical_verified else "无数据")
                gap = _gap_text(fresh_verified, strategy)
                strategy_lines.append(
                    f"| {product.name} | {current_price} | {freshness} | {_money(strategy.trigger_price, strategy.currency)} | "
                    f"{_money(strategy.strong_buy_price, strategy.currency)} | {signal.signal_type} | {gap} |"
                )
                signal_lines.append(f"- **{product.name}**：`{signal.signal_type}`。{signal.message}")
                chart_rows.append(
                    {
                        "label": product.name,
                        "verified_price": float(fresh_verified.checkout_price) if fresh_verified and fresh_verified.checkout_price is not None else None,
                        "trigger_price": float(strategy.trigger_price) if strategy.trigger_price is not None else None,
                        "strong_buy_price": float(strategy.strong_buy_price) if strategy.strong_buy_price is not None else None,
                    }
                )

            historical_min = (
                self.db.query(func.min(models.PriceRecord.checkout_price))
                .filter(
                    models.PriceRecord.product_id == product.id,
                    models.PriceRecord.verification_status == "VERIFIED_CHECKOUT",
                    models.PriceRecord.checkout_price.isnot(None),
                )
                .scalar()
            )
            if historical_min is not None:
                historical_lines.append(
                    f"| {product.name} | {_money(historical_min, strategy.currency if strategy else 'CNY')} | 本地数据库已核验到手价最小值 |"
                )
            elif strategy and strategy.notes:
                historical_lines.append(
                    f"| {product.name} | 未形成已核验最低价 | {_escape(strategy.notes)} |"
                )

            analytics = calculate_product_analytics(
                self.db,
                product.id,
                window_days=30,
                preferred_currency=strategy.currency if strategy else "CNY",
            )
            analytics_lines.append(
                f"| {product.name} | {analytics.series_type} | {analytics.sample_count} | "
                f"{_money(analytics.min_price, analytics.currency)} | {_money(analytics.median_price, analytics.currency)} | "
                f"{_money(analytics.max_price, analytics.currency)} | {_pct(analytics.volatility_pct)} | "
                f"{_pct(analytics.change_pct)} | {analytics.trend} |"
            )

        self.db.commit()

        clue_rows = [
            row for row in today_records
            if row.verification_status in {"VISIBLE_PRICE", "UNVERIFIED"}
        ]
        clue_rows = sorted(
            clue_rows,
            key=lambda row: (
                0 if row.needs_review else 1,
                -(row.confidence_score or 0),
                -(row.id or 0),
            ),
        )
        clue_lines = [self._clue_line(row, product_by_id.get(row.product_id)) for row in clue_rows]

        candidates = build_selection_candidates(self.db, user_name="ronin", window_days=30, limit=100)
        candidate_lines = [
            f"| {candidate.product.name} | {candidate.score:.1f} | {candidate.status} | "
            f"{'是' if candidate.is_buy_signal else '否'} | {_escape('；'.join(candidate.reasons[:3]))} |"
            for candidate in candidates[:15]
        ]

        blocked = [row for row in today_records if row.stock_status in {"ACCESS_DENIED", "CRAWL_ERROR"}]
        blocked_lines = [
            f"- {product_by_id.get(row.product_id).name if product_by_id.get(row.product_id) else row.product_id} / "
            f"{row.platform or '-'}：{row.stock_status}；{_escape(row.raw_price_context or '')[:180]}"
            for row in blocked
        ]

        verified_today_count = len(today_verified)
        active_strategy_count = sum(1 for product in products if self.db.query(models.Strategy).filter(
            models.Strategy.product_id == product.id,
            models.Strategy.is_active.is_(True),
        ).first())
        if trigger_count:
            conclusion = f"今日有 {trigger_count} 个用户策略被新鲜已核验价格触发。"
        elif verified_today_count:
            conclusion = f"今日新增可核验到手价 {verified_today_count} 条，但没有触发用户策略。"
        else:
            conclusion = "今日暂无可核验好价。"

        chart_path = generate_market_chart(chart_rows, report_date)
        summary = (
            f"活跃商品 {len(products)}；已核验新增 {verified_today_count}；可见线索 {status_counts.get('VISIBLE_PRICE', 0)}；"
            f"未核验 {status_counts.get('UNVERIFIED', 0)}；策略触发 {trigger_count}；过期策略价 {stale_count}。"
        )

        markdown = f"""# 摄影数码策略日报｜{report_date.isoformat()}

## 今日结论

**{conclusion}**

- 活跃观察商品：{len(products)}
- 启用策略：{active_strategy_count}
- 今日抓取记录：{len(today_records)}
- 今日新核验到手价：{verified_today_count}
- 今日可见价格线索：{status_counts.get('VISIBLE_PRICE', 0)}
- 今日未核验记录：{status_counts.get('UNVERIFIED', 0)}
- 当前策略触发：{trigger_count}
- 已过期策略价格：{stale_count}

## 市场事实：今日真实价格

| 产品 | 平台 | 店铺 | 最终到手价 | 币种 | 地区 | 优惠/核验说明 | 核验时间 | 有效至 | 来源 |
|---|---|---|---:|---|---|---|---|---|---|
{chr(10).join(verified_lines) if verified_lines else '| 今日暂无可核验好价 | - | - | - | - | - | - | - | - | - |'}

## 用户策略状态

| 产品 | 最近已核验价 | 时效 | 触发线 | 强买线 | 信号 | 距离/说明 |
|---|---:|---|---:|---:|---|---|
{chr(10).join(strategy_lines) if strategy_lines else '| 暂无启用策略 | - | - | - | - | - | - |'}

## 信号触发结果

{chr(10).join(signal_lines) if signal_lines else '- 暂无启用策略。'}

## 自动选品候选（只排序，不替用户决定）

| 商品 | 关注分 | 状态 | 用户买入信号 | 主要原因 |
|---|---:|---|---|---|
{chr(10).join(candidate_lines) if candidate_lines else '| 暂无候选 | - | - | - | - |'}

## 近 30 日价格范围与波动

| 商品 | 数据序列 | 样本数 | 最低 | 中位数 | 最高 | 稳健波动率 | 首尾变化 | 趋势 |
|---|---|---:|---:|---:|---:|---:|---:|---|
{chr(10).join(analytics_lines) if analytics_lines else '| 暂无 | - | 0 | - | - | - | - | - | INSUFFICIENT_DATA |'}

## 历史神价库

| 产品 | 已核验历史最低 | 来源/状态 |
|---|---:|---|
{chr(10).join(historical_lines) if historical_lines else '| 暂无 | - | 尚未形成已核验历史价格库 |'}

## 今日线索（按人工核验优先级）

| 产品 | 平台 | 可见价线索 | 币种 | 置信度 | 状态 | 上下文 | 来源 |
|---|---|---:|---|---:|---|---|---|
{chr(10).join(clue_lines) if clue_lines else '| 暂无线索 | - | - | - | - | - | - | - |'}

## 被拦截或抓取失败来源

{chr(10).join(blocked_lines) if blocked_lines else '- 今日没有记录到被拦截或抓取失败来源。'}

## 视觉行情图

![market chart]({chart_path})

## 网站 / API 数据缺口

- 商品池已经改为运行时可增删、归档和恢复；不再依赖固定 7 个商品。
- 只有新鲜的 `VERIFIED_CHECKOUT` 可以触发用户策略；旧价格会进入 `STALE`，避免每天重复显示“可以买”。
- 国内电商登录态、地区化价格与实际结算页价格仍需人工核验或平台授权数据。
- 淘金币、88VIP、平台券、店铺券、国补、运费需要拆分为结构化优惠字段。
- 二手平台需要成色、维修史、保修、卖家信誉与真实成交价字段。
- 波动统计在样本不足时明确返回 `INSUFFICIENT_DATA`，不会伪造趋势。
"""

        report = self.db.query(models.DailyReport).filter(models.DailyReport.report_date == report_date).first()
        if report is None:
            report = models.DailyReport(
                report_date=report_date,
                title=f"摄影数码策略日报｜{report_date.isoformat()}",
                summary=summary,
                markdown_content=markdown,
                chart_path=chart_path,
            )
            self.db.add(report)
        else:
            report.title = f"摄影数码策略日报｜{report_date.isoformat()}"
            report.summary = summary
            report.markdown_content = markdown
            report.chart_path = chart_path
            report.updated_at = datetime.now()
        self.db.commit()
        self.db.refresh(report)
        return report

    @staticmethod
    def _clue_line(row: models.PriceRecord, product: models.Product | None) -> str:
        visible = row.promotion_price if row.promotion_price is not None else row.list_price
        context = _escape(row.raw_price_context or row.review_note or "-")[:220]
        return (
            f"| {product.name if product else row.product_id} | {row.platform or '-'} | {_money(visible, row.currency)} | "
            f"{row.currency or '-'} | {(row.confidence_score or 0):.2f} | {row.verification_status} | {context} | {_source_link(row.source_url)} |"
        )


def _money(value, currency: str | None = "CNY") -> str:
    if value is None:
        return "-"
    symbol = "¥" if not currency or currency.upper() == "CNY" else f"{currency.upper()} "
    return f"{symbol}{float(value):,.0f}"


def _pct(value: float | None) -> str:
    return "-" if value is None else f"{value:.2f}%"


def _gap_text(price: models.PriceRecord | None, strategy: models.Strategy) -> str:
    if price is None or price.checkout_price is None:
        return "等待新鲜的人工核验到手价"
    if strategy.trigger_price is None:
        return "用户未设置触发线"
    gap = float(price.checkout_price) - float(strategy.trigger_price)
    if gap <= 0:
        return f"已低于触发线 ¥{abs(gap):,.0f}"
    return f"距离触发线 ¥{gap:,.0f}"


def _source_link(url: str | None) -> str:
    return f"[打开]({url})" if url else "-"


def _format_dt(value: datetime | None) -> str:
    if value is None:
        return "-"
    return value.strftime("%Y-%m-%d %H:%M")


def _escape(value: str) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ")
