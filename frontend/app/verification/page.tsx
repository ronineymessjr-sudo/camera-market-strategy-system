import Link from 'next/link'

import { VerificationCockpit } from '@/components/experience-modules'
import { VerifyPriceForm } from '@/components/verify-price-form'
import { MetricCard, SectionCard, StatusPill } from '@/components/dashboard-ui'
import { api } from '@/lib/api'
import type { Price, PriceStats, ReviewPage } from '@/lib/types'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 12

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

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort()
}

function queryLink(base: Record<string, string | undefined>, patch: Record<string, string | number | undefined>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(base)) {
    if (value !== undefined) params.set(key, value)
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === '' || value === 'all') params.delete(key)
    else params.set(key, String(value))
  }
  return `/verification?${params.toString()}`
}

async function loadQueue(params: Record<string, string | undefined>) {
  try {
    const query = new URLSearchParams()
    if (params.status && params.status !== 'all') query.set('status', params.status)
    if (params.platform && params.platform !== 'all') query.set('platform', params.platform)
    if (params.product_id) query.set('product_id', params.product_id)
    query.set('page', String(Math.max(1, Number(params.page || 1))))
    query.set('page_size', String(PAGE_SIZE))
    const [reviews, stats] = await Promise.all([
      api<ReviewPage>(`/api/reviews?${query.toString()}`),
      api<PriceStats>('/api/prices/stats'),
    ])
    return { reviews, stats }
  } catch {
    return { reviews: { items: [], total: 0, page: 1, page_size: PAGE_SIZE, status_counts: {}, platforms: [] } as ReviewPage, stats: null }
  }
}

export default async function Verification({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams ?? {}
  const { reviews, stats } = await loadQueue(params)
  const queue = reviews.items
  const status = params.status || 'all'
  const platform = params.platform || 'all'
  const page = Math.max(1, Number(params.page || 1))
  const filtered = queue
  const pageCount = Math.max(1, Math.ceil(reviews.total / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageItems = filtered
  const first = pageItems[0] ?? filtered[0]
  const platforms = reviews.platforms
  const statusCounts = reviews.status_counts
  const grouped = pageItems.reduce<Record<number, Price[]>>((acc, price) => {
    acc[price.product_id] = [...(acc[price.product_id] || []), price]
    return acc
  }, {})

  return <>
    <div className="page-title">
      <div>
        <span className="eyebrow">VERIFICATION</span>
        <h1>Verification Cockpit</h1>
        <p>Only checkout evidence can promote a clue into a trusted price. Visible prices stay locked until reviewed.</p>
      </div>
    </div>

    <div className="metrics">
      <MetricCard label="Needs review" value={stats?.needs_review ?? queue.length} />
      <MetricCard label="Visible clues" value={statusCounts.VISIBLE_PRICE ?? 0} tone="amber" />
      <MetricCard label="Unverified clues" value={statusCounts.UNVERIFIED ?? 0} tone="cyan" />
      <MetricCard label="Showing" value={reviews.total} note="After server filters" />
    </div>

    <VerificationCockpit queue={filtered.slice(0, 8)} stats={stats} />

    <div className="panel" style={{ marginTop: 16 }}>
      <div className="tabs">
        {['all', 'VISIBLE_PRICE', 'UNVERIFIED'].map((item) => <Link key={item} className={`tab ${status === item ? 'active' : ''}`} href={queryLink(params, { status: item, page: 1 })}>{item === 'all' ? 'All' : item} {item === 'all' ? Object.values(statusCounts).reduce((sum, count) => sum + count, 0) : statusCounts[item] ?? 0}</Link>)}
      </div>
      <div className="tabs">
        <Link className={`tab ${platform === 'all' ? 'active' : ''}`} href={queryLink(params, { platform: 'all', page: 1 })}>All platforms</Link>
        {platforms.map((item) => <Link key={item} className={`tab ${platform === item ? 'active' : ''}`} href={queryLink(params, { platform: item, page: 1 })}>{item}</Link>)}
      </div>
    </div>

    <div className="detail-grid" style={{ marginTop: 16 }}>
      <SectionCard title={`${reviews.total} clues waiting, grouped by product`}>
        <div className="list">
          {Object.entries(grouped).length ? Object.entries(grouped).map(([productId, prices]) => <div className="verification-group" key={productId}>
            <div className="list-row">
              <div>
                <strong>Product #{productId}</strong>
                <small>{prices.length} clue{prices.length > 1 ? 's' : ''} on this page</small>
              </div>
              <Link className="text-btn" href={`/products/${productId}`}>Open product</Link>
            </div>
            {prices.map((price) => <div className="list-row verification-row" key={price.id}>
              <div>
                <strong>{price.title || `Price #${price.id}`}</strong>
                <small>{price.platform || 'Unknown platform'} / {price.verification_status} / captured {cash(best(price))}</small>
              </div>
              <div className="verification-row-actions">
                <StatusPill tone={(price.confidence_score ?? 0) > 0.85 ? 'green' : 'amber'}>{confidence(price.confidence_score)}</StatusPill>
                <a className="text-btn" href={`#verify-${price.id}`}>Review</a>
              </div>
            </div>)}
          </div>) : <div className="empty">No clues match these filters.</div>}
        </div>
        <div className="pagination">
          <Link className="btn" href={queryLink(params, { page: Math.max(1, currentPage - 1) })}>Previous</Link>
          <span>Page {currentPage} / {pageCount}</span>
          <Link className="btn" href={queryLink(params, { page: Math.min(pageCount, currentPage + 1) })}>Next</Link>
        </div>
      </SectionCard>

      <aside>
        <SectionCard title="Current evidence">
          {first ? <div id={`verify-${first.id}`}>
            <div className="evidence-summary">
              <span className="experience-chip">{first.verification_status}</span>
              <h3>{first.title || `Product #${first.product_id}`}</h3>
              <p>{first.platform || 'Unknown platform'} / not actionable until checkout evidence is attached.</p>
            </div>
            <div className="form-row"><label>Raw price text</label><b>{first.raw_price_text || cash(best(first))}</b></div>
            <div className="form-row"><label>Extracted clue</label><b>{cash(best(first))}</b></div>
            <div className="form-row"><label>Currency</label><span>{first.currency || 'UNKNOWN'}</span></div>
            <div className="form-row"><label>Confidence</label><StatusPill tone={(first.confidence_score ?? 0) > 0.85 ? 'green' : 'amber'}>{confidence(first.confidence_score)}</StatusPill></div>
            <div className="form-row"><label>Coupon context</label><span>{first.coupon_text || 'None captured'}</span></div>
            {first.source_url && <p><a className="text-btn" href={first.source_url} target="_blank" rel="noreferrer">Open source page</a></p>}
            <VerifyPriceForm price={first} />
          </div> : <div className="empty">No pending evidence right now.</div>}
        </SectionCard>
      </aside>
    </div>
  </>
}
