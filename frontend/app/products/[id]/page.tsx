import { PriceChart, SectionCard, StatusPill } from '@/components/dashboard-ui'
import { api } from '@/lib/api'
import { ageLabel, bestPrice, money, percent, shortDate } from '@/lib/format'
import type { Listing, Price, PriceAnalytics, Product, Signal, Strategy } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function loadProduct(id: string) {
  try {
    const productId = Number(id)
    const [product, listings, prices, analytics, signals, strategies] = await Promise.all([
      api<Product>(`/api/products/${productId}`),
      api<Listing[]>(`/api/products/${productId}/listings`),
      api<Price[]>(`/api/prices/product/${productId}?limit=80`),
      api<PriceAnalytics>(`/api/analytics/products/${productId}?window_days=30`),
      api<Signal[]>(`/api/signals/product/${productId}`),
      api<Strategy[]>('/api/strategies'),
    ])
    return { product, listings, prices, analytics, signals, strategies: strategies.filter((item) => item.product_id === productId) }
  } catch {
    return null
  }
}

export default async function ProductDetail({ params }: { params: { id: string } }) {
  const data = await loadProduct(params.id)
  if (!data) {
    return <div className="panel empty">没有找到该商品，或后端服务暂时不可用。</div>
  }

  const verified = data.prices.find((price) => price.verification_status === 'VERIFIED_CHECKOUT')
  const latest = data.prices[0]
  const strategy = data.strategies[0]

  return <>
    <div className="page-title"><div><p className="muted">首页 / 商品详情 / 价格趋势</p><h1>{data.product.name}</h1></div><button className="btn">♡ 收藏</button></div>
    <div className="detail-grid">
      <div>
        <SectionCard title="商品概览">
          <div className="hero-product"><div className="lens-visual" /><div><StatusPill tone={data.product.is_active ? 'green' : 'amber'}>{data.product.is_active ? '追踪中' : '已暂停'}</StatusPill><h3>{data.product.name}</h3><p className="muted">{[data.product.brand, data.product.mount_type, data.product.sensor_format].filter(Boolean).join(' · ') || '摄影器材'}</p><div className="price-row"><div><span>当前已核验价</span><strong>{money(bestPrice(verified))}</strong></div><div><span>策略触发价</span><strong>{money(strategy?.trigger_price, '未设置')}</strong></div><div><span>强力入手区</span><strong style={{ color: '#f7b64b' }}>{money(strategy?.strong_buy_price, '未设置')}</strong></div></div></div></div>
        </SectionCard>
        <SectionCard title="价格趋势（30天）" action="7天　30天　90天"><PriceChart /></SectionCard>
        <SectionCard title="近期价格记录">
          <table className="data-table"><thead><tr><th>时间</th><th>平台</th><th>商品 / 店铺</th><th>价格</th><th>状态</th><th>来源</th></tr></thead><tbody>{data.prices.slice(0, 10).map((price) => <tr key={price.id}><td>{shortDate(price.captured_at)}</td><td>{price.platform || '未知'}</td><td>{price.seller_name || price.title || data.product.name}</td><td>{money(bestPrice(price))}</td><td><StatusPill tone={price.verification_status === 'VERIFIED_CHECKOUT' ? 'green' : price.verification_status === 'INVALID' ? 'red' : 'amber'}>{price.verification_status}</StatusPill></td><td>{price.source_url ? <a className="text-btn" href={price.source_url} target="_blank" rel="noreferrer">打开</a> : '本地'}</td></tr>)}</tbody></table>
          {!data.prices.length && <div className="empty">暂无价格记录。</div>}
        </SectionCard>
      </div>
      <aside>
        <SectionCard title="关键提醒"><div className="list">
          <div className="list-row"><div><strong>样本数量 {data.analytics.sample_count}</strong><small>30 天数据序列：{data.analytics.series_type}</small></div><span>›</span></div>
          <div className="list-row"><div><strong>价格趋势 {data.analytics.trend}</strong><small>波动率 {percent(data.analytics.volatility_pct)}</small></div><span>›</span></div>
          <div className="list-row"><div><strong>最近更新</strong><small>{ageLabel(latest?.captured_at)}</small></div><span>›</span></div>
        </div></SectionCard>
        <SectionCard title="机会洞察"><div className="list">
          {data.signals.slice(0, 5).map((signal) => <div className="list-row" key={signal.id}><div><strong>{signal.signal_type}</strong><small>{signal.message || signal.reason_code || '策略信号'}</small></div></div>)}
          {!data.signals.length && <div className="empty">暂无策略信号。</div>}
        </div></SectionCard>
        <SectionCard title="当前策略">
          <div className="form-row"><label>目标价</label><b>{money(strategy?.trigger_price, '未设置')}</b></div>
          <div className="form-row"><label>强买线</label><b>{money(strategy?.strong_buy_price, '未设置')}</b></div>
          <div className="form-row"><label>状态</label><StatusPill tone={strategy?.is_active ? 'green' : 'amber'}>{strategy?.is_active ? '运行中' : '未启用'}</StatusPill></div>
          <div className="form-row"><label>来源链接</label><b>{data.listings.length}</b></div>
        </SectionCard>
      </aside>
    </div>
  </>
}
