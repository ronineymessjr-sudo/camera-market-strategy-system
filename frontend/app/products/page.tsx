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

  return <>
    <div className="page-title">
      <div><h1>监控商品</h1><p>动态维护商品池、目标价格与监控状态</p></div>
      <div><button className="btn">导出</button> <button className="btn primary">＋ 添加监控</button></div>
    </div>
    <div className="metrics">
      <MetricCard label="全部商品" value={rows.length} note="来自本地数据库" />
      <MetricCard label="监控中" value={active.length} note="正常参与流程" tone="green" />
      <MetricCard label="策略触发" value={reached.length} note="等待复核/行动" tone="amber" />
      <MetricCard label="已暂停" value={paused.length} note="可随时恢复" tone="cyan" />
    </div>
    <div className="panel">
      <div className="tabs">
        <button className="tab active">全部状态 {rows.length}</button>
        <button className="tab">监控中 {active.length}</button>
        <button className="tab">策略触发 {reached.length}</button>
        <button className="tab">已暂停 {paused.length}</button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>商品信息</th><th>平台数</th><th>最新可信价</th><th>最新线索</th><th>价格置信度</th><th>最后更新</th><th>状态</th><th /></tr></thead>
          <tbody>{rows.map((row) => {
            const trusted = row.latest_verified ?? row.latest_fresh_verified
            const clue = row.latest_clue ?? row.latest_any
            const price = bestPrice(trusted) ?? bestPrice(clue)
            return <tr key={row.product.id}>
              <td><div className="product-cell"><div className="thumb">◉</div><div><Link href={`/products/${row.product.id}`}><strong>{row.product.name}</strong></Link><small className="muted">{[row.product.brand, row.product.category, row.product.mount_type].filter(Boolean).join(' / ') || '摄影器材'}</small></div></div></td>
              <td>{row.active_listing_count}</td>
              <td><b>{money(bestPrice(trusted))}</b></td>
              <td>{money(price)}</td>
              <td><div className="confidence"><StatusPill tone={trusted ? 'green' : 'amber'}>{trusted ? '已核验' : confidence(clue?.confidence_score)}</StatusPill><i style={{ '--w': `${Math.round((clue?.confidence_score ?? 0.4) * 100)}%` } as React.CSSProperties} /></div></td>
              <td>{ageLabel(clue?.captured_at)}</td>
              <td><StatusPill tone={row.product.is_active ? 'green' : 'amber'}>{row.product.is_active ? '监控中' : '已暂停'}</StatusPill></td>
              <td>•••</td>
            </tr>
          })}</tbody>
        </table>
      </div>
      {!rows.length && <div className="empty">暂无商品。请先运行种子数据或使用命令添加监控商品。</div>}
    </div>
  </>
}
