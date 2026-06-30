import { VerificationCockpit } from '@/components/experience-modules'
import { VerifyPriceForm } from '@/components/verify-price-form'
import { MetricCard, SectionCard, StatusPill } from '@/components/dashboard-ui'
import { api } from '@/lib/api'
import type { Price, PriceStats } from '@/lib/types'

export const dynamic = 'force-dynamic'

function cash(value?: number | null, fallback = 'No price') {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return `CNY ${Math.round(value).toLocaleString('en-US')}`
}

function best(price?: Price | null) {
  return price?.checkout_price ?? price?.promotion_price ?? price?.list_price ?? null
}

function confidence(value?: number | null) {
  if (typeof value !== 'number') return 'Pending'
  return `${Math.round(value * 100)}%`
}

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
    <div className="page-title">
      <div>
        <span className="eyebrow">VERIFICATION</span>
        <h1>Verification Cockpit</h1>
        <p>Only checkout-verified records can trigger strategy action. Everything else stays evidence.</p>
      </div>
    </div>

    <div className="metrics">
      <MetricCard label="Needs review" value={stats?.needs_review ?? queue.length} />
      <MetricCard label="Checkout verified" value={stats?.verified_checkout ?? 0} tone="green" />
      <MetricCard label="Visible clues" value={stats?.visible_price ?? 0} tone="amber" />
      <MetricCard label="Invalid records" value={stats?.invalid ?? 0} tone="cyan" />
    </div>

    <VerificationCockpit queue={queue} stats={stats} />

    <div className="detail-grid" style={{ marginTop: 16 }}>
      <SectionCard title={`${queue.length} clues waiting for checkout review`}>
        <div className="list">{queue.length ? queue.map((price) => <div className="list-row verification-row" key={price.id}>
          <div>
            <strong>{price.title || `Product #${price.product_id}`}</strong>
            <small>{price.platform || 'Unknown platform'} · captured {cash(best(price))}</small>
          </div>
          <div className="verification-row-actions">
            <StatusPill tone={(price.confidence_score ?? 0) > 0.85 ? 'green' : 'amber'}>{confidence(price.confidence_score)}</StatusPill>
          </div>
        </div>) : <div className="empty">The review lane is clear. Run the real data flow to discover fresh clues.</div>}</div>
      </SectionCard>

      <aside>
        <SectionCard title="Current evidence">
          {first ? <>
            <div className="evidence-summary">
              <span className="experience-chip">{first.verification_status}</span>
              <h3>{first.title || `Product #${first.product_id}`}</h3>
              <p>{first.platform || 'Unknown platform'}</p>
            </div>
            <div className="form-row"><label>Raw price text</label><b>{first.raw_price_text || cash(best(first))}</b></div>
            <div className="form-row"><label>Extracted price</label><b>{cash(best(first))}</b></div>
            <div className="form-row"><label>Currency</label><span>{first.currency || 'CNY'}</span></div>
            <div className="form-row"><label>Confidence</label><StatusPill tone={(first.confidence_score ?? 0) > 0.85 ? 'green' : 'amber'}>{confidence(first.confidence_score)}</StatusPill></div>
            <div className="form-row"><label>Coupon context</label><span>{first.coupon_text || 'None captured'}</span></div>
            {first.source_url && <p><a className="text-btn" href={first.source_url} target="_blank" rel="noreferrer">Open source page</a></p>}
            <VerifyPriceForm price={first} />
          </> : <div className="empty">No pending evidence right now.</div>}
        </SectionCard>
      </aside>
    </div>
  </>
}
