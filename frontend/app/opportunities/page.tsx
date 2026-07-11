import Link from 'next/link'

import { CommandCenter, OperatorMode } from '@/components/experience-modules'
import { MetricCard, SectionCard, Sparkline, StatusPill } from '@/components/dashboard-ui'
import { api } from '@/lib/api'
import type { FrontendBootstrap, SelectionCandidate } from '@/lib/types'

export const dynamic = 'force-dynamic'

function cash(value?: number | null, fallback = 'No price') {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return `CNY ${Math.round(value).toLocaleString('en-US')}`
}

function best(row: SelectionCandidate) {
  return row.latest_verified?.checkout_price ?? row.latest_verified?.promotion_price ?? row.latest_verified?.list_price ?? row.latest_clue?.checkout_price ?? row.latest_clue?.promotion_price ?? row.latest_clue?.list_price ?? null
}

async function loadData() {
  try {
    const [rows, bootstrap] = await Promise.all([
      api<SelectionCandidate[]>('/api/selection/candidates?limit=100'),
      api<FrontendBootstrap>('/api/frontend/bootstrap?product_limit=30&candidate_limit=12'),
    ])
    return { rows, bootstrap }
  } catch {
    return { rows: [] as SelectionCandidate[], bootstrap: null as FrontendBootstrap | null }
  }
}

export default async function Opportunities() {
  const { rows, bootstrap } = await loadData()
  const buy = rows.filter((row) => row.is_buy_signal)
  const highConfidence = rows.filter((row) => row.latest_verified || ((row.latest_clue?.confidence_score ?? 0) >= 0.8))
  const volatile = rows.filter((row) => (row.analytics.volatility_pct ?? 0) >= 5)
  const avgScore = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 0

  return <>
    <div className="page-title">
      <div>
        <span className="eyebrow">OPPORTUNITIES</span>
        <h1>Opportunity Radar</h1>
        <p>Rank candidates by strategy fit, verification trust, trend pressure, and how close they are to action.</p>
      </div>
    </div>

    <div className="metrics">
      <MetricCard label="Buy signals" value={buy.length} tone="amber" icon="01" />
      <MetricCard label="Volatile products" value={volatile.length} icon="02" />
      <MetricCard label="Verified opportunities" value={rows.filter((row) => row.latest_verified).length} tone="green" icon="03" />
      <MetricCard label="High-confidence clues" value={highConfidence.length} tone="cyan" icon="04" />
    </div>

    {bootstrap && <CommandCenter products={bootstrap.products} candidates={rows.slice(0, 12)} stats={bootstrap.price_stats} />}

    <SectionCard title="Candidate pool" className="ledger-panel">
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Rank</th><th>Product</th><th>Current price</th><th>Target</th><th>Trend</th><th>Score</th><th>Recent motion</th><th>Status</th></tr></thead>
          <tbody>{rows.map((row, index) => <tr key={row.product.id}>
            <td><b style={{ color: index < 3 ? '#f7b64b' : '#7f91a8' }}>#{index + 1}</b></td>
            <td><div className="product-cell"><div className="thumb">CM</div><Link href={`/products/${row.product.id}`}><strong>{row.product.name}</strong></Link></div></td>
            <td>{cash(best(row))}</td>
            <td>{cash(row.strategy?.trigger_price, 'No target')}</td>
            <td>{row.analytics.trend}</td>
            <td>{Math.round(row.score)}</td>
            <td><Sparkline points={[32, 34, 31, 38, 36, 43, 45, 42, 49]} color={row.is_buy_signal ? '#f2f2ee' : '#8d8d8d'} /></td>
            <td><StatusPill tone={row.is_buy_signal ? 'green' : row.status === 'NEAR_TARGET' ? 'amber' : 'blue'}>{row.status}</StatusPill></td>
          </tr>)}</tbody>
        </table>
      </div>
      {!rows.length && <div className="empty">No opportunities yet. Run the full real-data workflow or add strategies to tracked products.</div>}
    </SectionCard>

    <div className="three-col" style={{ marginTop: 16 }}>
      <SectionCard title="Signal distribution"><div className="gauge"><b>{buy.length}</b></div><p className="muted" style={{ textAlign: 'center' }}>Executable buy signals</p></SectionCard>
      <SectionCard title="Opportunity summary"><div className="list">{[['Average score', String(avgScore)], ['Candidates', String(rows.length)], ['Verified share', rows.length ? `${Math.round((rows.filter((row) => row.latest_verified).length / rows.length) * 100)}%` : '0%'], ['High confidence', String(highConfidence.length)]].map((item) => <div className="list-row" key={item[0]}><span>{item[0]}</span><b>{item[1]}</b></div>)}</div></SectionCard>
      <SectionCard title="Top reasons"><div className="list">{rows.slice(0, 4).map((row) => <div className="list-row" key={row.product.id}><div><strong>{row.product.name}</strong><small>{row.reasons[0] ?? 'Waiting for more real evidence'}</small></div><b>{Math.round(row.score)}</b></div>)}</div></SectionCard>
    </div>

    {bootstrap && <OperatorMode products={bootstrap.products} candidates={rows.slice(0, 12)} stats={bootstrap.price_stats} />}
  </>
}
