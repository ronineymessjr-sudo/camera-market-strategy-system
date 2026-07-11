import Link from 'next/link'

import { MetricCard, StatusPill } from '@/components/dashboard-ui'
import { api } from '@/lib/api'
import { ageLabel, bestPrice, confidence, money } from '@/lib/format'
import type { ProductOverview } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function loadProducts() {
  try {
    return await api<ProductOverview[]>('/api/products/overview')
  } catch {
    return []
  }
}

export default async function Products() {
  const rows = await loadProducts()
  const active = rows.filter((row) => row.product.is_active)
  const reached = rows.filter((row) => row.latest_signal?.triggered)
  const paused = rows.filter((row) => !row.product.is_active)
  const needsReview = rows.filter((row) => row.latest_clue && !row.latest_verified)

  return <>
    <div className="page-title">
      <div>
        <h1>Tracked Products</h1>
        <p>Verified checkout prices stay separate from visible or unverified clues.</p>
      </div>
      <div><button className="btn">Export</button> <button className="btn primary">+ Add product</button></div>
    </div>
    <div className="metrics">
      <MetricCard label="All products" value={rows.length} note="Current watchlist" />
      <MetricCard label="Active" value={active.length} note="Included in monitoring" tone="green" />
      <MetricCard label="Strategy triggered" value={reached.length} note="Requires final operator review" tone="amber" />
      <MetricCard label="Needs verification" value={needsReview.length} note="Clues are not actionable" tone="cyan" />
    </div>
    <div className="panel">
      <div className="tabs">
        <button className="tab active">All {rows.length}</button>
        <button className="tab">Active {active.length}</button>
        <button className="tab">Needs review {needsReview.length}</button>
        <button className="tab">Paused {paused.length}</button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Sources</th>
              <th>Trusted checkout price</th>
              <th>Latest clue</th>
              <th>Trust state</th>
              <th>Last clue</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>{rows.map((row) => {
            const trusted = row.latest_fresh_verified ?? row.latest_verified
            const clue = row.latest_clue ?? (row.latest_any?.verification_status === 'VERIFIED_CHECKOUT' ? null : row.latest_any)
            const clueOnly = Boolean(clue && !trusted)
            return <tr key={row.product.id} className={clueOnly ? 'needs-review-row' : undefined}>
              <td>
                <div className="product-cell">
                  <div className="thumb">P</div>
                  <div>
                    <Link href={`/products/${row.product.id}`}><strong>{row.product.name}</strong></Link>
                    <small className="muted">{[row.product.brand, row.product.category, row.product.mount_type].filter(Boolean).join(' / ') || 'Camera gear'}</small>
                  </div>
                </div>
              </td>
              <td>{row.active_listing_count}</td>
              <td>
                <b>{trusted ? money(bestPrice(trusted)) : 'No trusted price'}</b>
                {!trusted && <small className="muted">Strategy action locked</small>}
              </td>
              <td>
                {clue ? <div className="clue-cell">
                  <b>{money(bestPrice(clue))}</b>
                  <small>{clueOnly ? 'UNVERIFIED CLUE / not actionable' : 'Fresh clue for review'}</small>
                </div> : 'No clue'}
              </td>
              <td>
                <div className="confidence">
                  <StatusPill tone={trusted ? 'green' : 'amber'}>{trusted ? 'VERIFIED_CHECKOUT' : `NEEDS REVIEW ${confidence(clue?.confidence_score)}`}</StatusPill>
                  <i style={{ '--w': `${Math.round((clue?.confidence_score ?? 0.4) * 100)}%` } as React.CSSProperties} />
                </div>
              </td>
              <td>{ageLabel(clue?.captured_at)}</td>
              <td><StatusPill tone={row.product.is_active ? 'green' : 'amber'}>{row.product.is_active ? 'Active' : 'Paused'}</StatusPill></td>
              <td><Link className="text-btn" href={`/products/${row.product.id}`}>Open</Link></td>
            </tr>
          })}</tbody>
        </table>
      </div>
      {!rows.length && <div className="empty">No products yet. Add watchlist items or import seed data first.</div>}
    </div>
  </>
}
