import { VerifyPriceForm } from '@/components/verify-price-form'
import { MetricCard, SectionCard, StatusPill } from '@/components/dashboard-ui'
import { api } from '@/lib/api'
import { ageLabel, bestPrice, confidence, money } from '@/lib/format'
import type { Price, PriceStats } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function loadQueue() {
  try {
    const [queue, stats] = await Promise.all([
      api<Price[]>('/api/prices/review-queue?limit=100'),
      api<PriceStats>('/api/prices/stats'),
    ])
    return { queue, stats }
  } catch {
    return { queue: [], stats: null }
  }
}

export default async function Verification() {
  const { queue, stats } = await loadQueue()
  const first = queue[0]

  return <>
    <div className="page-title"><div><h1>线索核验中心</h1><p>核验抓取到的价格线索，确保数据准确可靠</p></div></div>
    <div className="metrics">
      <MetricCard label="待核验" value={stats?.needs_review ?? queue.length} />
      <MetricCard label="已通过" value={stats?.verified_checkout ?? 0} tone="green" />
      <MetricCard label="可见价线索" value={stats?.visible_price ?? 0} tone="amber" />
      <MetricCard label="无效记录" value={stats?.invalid ?? 0} tone="cyan" />
    </div>
    <div className="detail-grid">
      <SectionCard title={`${queue.length} 条待核验线索`}>
        <div className="list">{queue.length ? queue.map((price) => <div className="list-row" key={price.id}>
          <div className="product-cell">
            <div className="thumb">◉</div>
            <div><strong>{price.title || `商品 #${price.product_id}`}</strong><small>{price.platform || '未知平台'} · 抓取价格 {money(bestPrice(price))} · {ageLabel(price.captured_at)}</small></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusPill tone={(price.confidence_score ?? 0) > 0.85 ? 'green' : 'amber'}>{confidence(price.confidence_score)}</StatusPill>
          </div>
        </div>) : <div className="empty">当前没有待核验线索。运行完整流程后，低置信或未验证价格会进入这里。</div>}</div>
      </SectionCard>
      <aside>
        <SectionCard title="线索详情">
          {first ? <>
            <div className="hero-product"><div className="lens-visual" /><div><strong>{first.title || `商品 #${first.product_id}`}</strong><p className="muted">{first.platform || '未知平台'}</p></div></div>
            <div className="form-row"><label>原始价格文本</label><b style={{ color: '#59aaff' }}>{first.raw_price_text || money(bestPrice(first))}</b></div>
            <div className="form-row"><label>提取价格</label><b>{money(bestPrice(first))}</b></div>
            <div className="form-row"><label>货币</label><span>{first.currency || 'CNY'}</span></div>
            <div className="form-row"><label>置信度</label><StatusPill tone={(first.confidence_score ?? 0) > 0.85 ? 'green' : 'amber'}>{confidence(first.confidence_score)}</StatusPill></div>
            <div className="form-row"><label>促销 / 优惠</label><span>{first.coupon_text || '暂无'}</span></div>
            {first.source_url && <p><a className="text-btn" href={first.source_url} target="_blank" rel="noreferrer">打开来源 →</a></p>}
            <VerifyPriceForm price={first} />
          </> : <div className="empty">暂无待处理线索。</div>}
        </SectionCard>
      </aside>
    </div>
  </>
}
