# 消费策略量化引擎

V0.4 借鉴量化研究系统的“数据序列 → 指标 → 策略 → 回测 → 风险度量”结构，但不把摄影器材伪装成证券，也不生成自动交易指令。

## 已实现指标

```http
GET /api/quant/products/{product_id}/indicators
```

返回：

- SMA 短/长周期
- EMA 短/长周期
- RSI(14)
- Bollinger 中轨/上下轨
- 当前价格 Z-Score
- 最大回撤
- 下行波动
- 价格历史分位
- 市场状态：折价、高溢价、下降、上涨、震荡、数据不足
- 风险等级

默认只分析 `VERIFIED_CHECKOUT`。前端可显式设置 `include_visible=true` 查看线索序列，但 UI 必须标记为混合数据。

## 策略回测

```http
POST /api/quant/backtests
```

请求示例：

```json
{
  "product_id": 1,
  "strategy_id": 1,
  "window_days": 365,
  "currency": "CNY",
  "include_visible_prices": false
}
```

输出：

- 样本数
- 触发次数、强触发次数
- 首次/最近触发时间
- 区间最低价、中位价
- 平均触发价
- 相对市场中位价节省比例
- 相对区间最低价的错失差距
- 最大回撤、波动率
- 触发率
- 回测评价：`NO_DATA`、`NEVER_TRIGGERED`、`TOO_LOOSE`、`MODERATE`、`EFFECTIVE`

## 重要限制

- 这不是收益率回测，因为商品消费不是股票持仓。
- 系统评估的是目标价策略在历史价格序列中的触发质量。
- 数据样本不足时不会输出伪精确结论。
- 未核验线索默认不进入回测。
