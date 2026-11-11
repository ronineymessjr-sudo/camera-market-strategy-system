import { PriceStory } from '@/components/experience-modules'
import { ConfirmPurchaseForm } from '@/components/confirm-purchase-form'
import { SectionCard, StatusPill } from '@/components/dashboard-ui'
import { api } from '@/lib/api'
import { dateTimeLabel, parseApiDate } from '@/lib/format'
import type { Listing, Price, PriceAnalytics, Product, Signal, Strategy } from '@/lib/types'

export const dynamic = 'force-dynamic'

function cash(value?: number | null, currency = 'CNY', fallback = '暂无价格') {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return `${currency} ${Math.round(value).toLocaleString('zh-CN')}`
}

function best(price?: Price | null) {
  return price?.checkout_price ?? price?.promotion_price ?? price?.list_price ?? null
}

function latestByTime(prices: Price[]) {
  return prices.slice().sort((a, b) => (parseApiDate(b.captured_at)?.getTime() ?? 0) - (parseApiDate(a.captured_at)?.getTime() ?? 0))[0] ?? null
}

function trustTone(price?: Price | null) {
  if (price?.verification_status === 'VERIFIED_CHECKOUT') return 'green'
  if (price?.verification_status === 'INVALID') return 'red'
  return 'amber'
}

async function loadProduct(id: string) {
  try {
    const productId = Number(id)
    const [product, listings, prices, analytics, signals, strategies] = await Promise.all([
      api<Product>(`/api/products/${productId}`),
      api<Listing[]>(`/api/products/${productId}/listings`),
      api<Price[]>(`/api/prices/product/${productId}?limit=240`),
      api<PriceAnalytics>(`/api/analytics/products/${productId}?window_days=180`),
      api<Signal[]>(`/api/signals/product/${productId}`),
      api<Strategy[]>('/api/strategies'),
    ])
    return {
      product,
      listings,
      prices,
      analytics,
      signals,
      strategy: strategies.find((item) => item.product_id === productId && item.is_active) ?? strategies.find((item) => item.product_id === productId) ?? null,
    }
  } catch {
    return null
  }
}

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await loadProduct(id)
  if (!data) {
    return <div className="panel empty">Product not found, or the backend is not available.</div>
  }

  const verified = data.prices.filter((price) => price.verification_status === 'VERIFIED_CHECKOUT')
  const clues = data.prices.filter((price) => price.needs_review && best(price) !== null)
  const latestTrusted = latestByTime(verified)
  const latestClue = latestByTime(clues)
  const hasCurrentVerification = Boolean(latestTrusted?.valid_until && (parseApiDate(latestTrusted.valid_until)?.getTime() ?? 0) > Date.now())

  return <>
    <div className="page-title">
      <div>
        <span className="eyebrow">商品价格轨迹</span>
        <h1>{data.product.name}</h1>
        <p>{[data.product.brand, data.product.category, data.product.mount_type, data.product.sensor_format].filter(Boolean).join(' / ') || '正在追踪的商品'}</p>
      </div>
    </div>

    <PriceStory product={data.product} prices={data.prices} analytics={data.analytics} signals={data.signals} strategy={data.strategy} />

    <div className="detail-grid" style={{ marginTop: 16 }}>
      <SectionCard title="可信结算证据">
        {latestTrusted ? <div className="evidence-summary">
          <span className="experience-chip">{hasCurrentVerification ? '当前核验有效' : '历史核验记录'}</span>
          <h3>{cash(best(latestTrusted), latestTrusted.currency ?? 'CNY')}</h3>
          <p>{latestTrusted.seller_name || latestTrusted.title || data.product.name}</p>
            <div className="list">
            <div className="list-row"><span>核验时间</span><b>{dateTimeLabel(latestTrusted.verified_at || latestTrusted.captured_at)}</b></div>
            <div className="list-row"><span>币种</span><b>{latestTrusted.currency || '未知'}</b></div>
            <div className="list-row"><span>有效期至</span><b>{latestTrusted.valid_until ? dateTimeLabel(latestTrusted.valid_until) : '未设置'}</b></div>
            </div>
            {hasCurrentVerification ? <ConfirmPurchaseForm price={latestTrusted} /> : <p className="muted">该记录已过期或没有有效期。请重新上传当前结算页证据并完成核验后，再保存购买决定。</p>}
        </div> : <div className="empty">暂无可信结算价。上传并核验当前结算页证据后，才可触发策略或保存购买决定。</div>}
      </SectionCard>

      <SectionCard title="最近网页价格线索">
        {latestClue ? <div className="evidence-summary clue-warning">
          <span className="experience-chip">{latestClue.verification_status === 'VISIBLE_PRICE' ? '网页可见价 · 不可直接执行' : '未核验线索'}</span>
          <h3>{cash(best(latestClue), latestClue.currency ?? 'CNY')}</h3>
          <p>这是公开页面的价格线索，不代表当前结算到手价。请核对来源和采集时间。</p>
          <div className="list">
            <div className="list-row"><span>采集时间</span><b>{dateTimeLabel(latestClue.captured_at)}</b></div>
            <div className="list-row"><span>提取置信度</span><b>{typeof latestClue.confidence_score === 'number' ? `${Math.round(latestClue.confidence_score * 100)}%` : '待评估'}</b></div>
          </div>
        </div> : <div className="empty">暂无可展示的网页价格线索；未提取到价格的采集记录仍保留在下方审计账本中。</div>}
      </SectionCard>
    </div>

    <div className="three-col" style={{ marginTop: 16 }}>
      <SectionCard title="信任状态">
        <div className="list">
          <div className="list-row"><span>已核验结算记录</span><b>{verified.length}</b></div>
          <div className="list-row"><span>可展示线索</span><b>{clues.length}</b></div>
          <div className="list-row"><span>有效数据源</span><b>{data.listings.filter((item) => item.is_active).length}</b></div>
        </div>
      </SectionCard>
      <SectionCard title="策略目标">
        <div className="list">
          <div className="list-row"><span>观察价</span><b>{cash(data.strategy?.watch_price, data.strategy?.currency ?? 'CNY')}</b></div>
          <div className="list-row"><span>触发价</span><b>{cash(data.strategy?.trigger_price, data.strategy?.currency ?? 'CNY')}</b></div>
          <div className="list-row"><span>强买价</span><b>{cash(data.strategy?.strong_buy_price, data.strategy?.currency ?? 'CNY')}</b></div>
        </div>
      </SectionCard>
      <SectionCard title="价格分析">
        <div className="list">
          <div className="list-row"><span>趋势</span><b>{data.analytics.trend}</b></div>
          <div className="list-row"><span>样本数</span><b>{data.analytics.sample_count}</b></div>
          <div className="list-row"><span>波动率</span><b>{typeof data.analytics.volatility_pct === 'number' ? `${data.analytics.volatility_pct.toFixed(1)}%` : '暂无'}</b></div>
        </div>
      </SectionCard>
    </div>

    <SectionCard title="价格证据账本" className="ledger-panel">
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>采集时间</th><th>平台</th><th>店铺 / 标题</th><th>网页价格</th><th>信任状态</th><th>来源</th></tr></thead>
          <tbody>{data.prices.slice(0, 40).map((price) => <tr key={price.id}>
            <td>{dateTimeLabel(price.captured_at)}</td>
            <td>{price.platform || '未知平台'}</td>
            <td>{price.seller_name || price.title || data.product.name}</td>
            <td>{cash(best(price), price.currency ?? 'CNY')}</td>
            <td><StatusPill tone={trustTone(price)}>{price.verification_status === 'VERIFIED_CHECKOUT' ? '已核验结算价' : price.verification_status === 'VISIBLE_PRICE' ? '网页可见价 · 不可执行' : price.verification_status === 'INVALID' ? '已失效' : '未核验 · 不可执行'}</StatusPill></td>
            <td>{price.source_url ? <a className="text-btn" href={price.source_url} target="_blank" rel="noreferrer">查看来源</a> : '本地记录'}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </SectionCard>
  </>
}
