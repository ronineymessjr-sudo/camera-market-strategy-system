import Link from 'next/link'

import { MetricCard, SectionCard, Sparkline, StatusPill } from '@/components/dashboard-ui'
import { api } from '@/lib/api'
import { bestPrice, money } from '@/lib/format'
import type { SelectionCandidate } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function loadCandidates() {
  try {
    return await api<SelectionCandidate[]>('/api/selection/candidates?limit=100')
  } catch {
    return []
  }
}

function currentPrice(row: SelectionCandidate) {
  return bestPrice(row.latest_verified) ?? bestPrice(row.latest_clue)
}

export default async function Opportunities() {
  const rows = await loadCandidates()
  const buy = rows.filter((row) => row.is_buy_signal)
  const highConfidence = rows.filter((row) => (row.latest_verified || row.latest_clue?.confidence_score && row.latest_clue.confidence_score >= 0.8))
  const volatile = rows.filter((row) => (row.analytics.volatility_pct ?? 0) >= 5)
  const avgScore = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 0

  return <>
    <div className="page-title"><div><h1>机会发现</h1><p>按价格趋势、目标距离与置信度综合排序</p></div><button className="btn">导出列表</button></div>
    <div className="metrics">
      <MetricCard label="买入信号" value={buy.length} tone="amber" icon="◎" />
      <MetricCard label="波动较大" value={volatile.length} icon="∿" />
      <MetricCard label="已验证机会" value={rows.filter((row) => row.latest_verified).length} tone="green" icon="✓" />
      <MetricCard label="高置信机会" value={highConfidence.length} tone="cyan" icon="✦" />
    </div>
    <SectionCard title="候选池">
      <div className="tabs"><button className="tab active">综合排序</button><button className="tab">全部品类</button><button className="tab">全部平台</button><button className="tab">目标状态</button><button className="tab">只看已验证</button></div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>优先级</th><th>商品</th><th>当前价格</th><th>策略目标</th><th>趋势</th><th>评分</th><th>近期波动</th><th>推荐状态</th></tr></thead>
          <tbody>{rows.map((row, index) => <tr key={row.product.id}>
            <td><b style={{ color: index < 3 ? '#f7b64b' : '#7f91a8' }}>#{index + 1}</b></td>
            <td><div className="product-cell"><div className="thumb">◉</div><Link href={`/products/${row.product.id}`}><strong>{row.product.name}</strong></Link></div></td>
            <td>{money(currentPrice(row))}</td>
            <td>{money(row.strategy?.trigger_price, '未设置')}</td>
            <td>{row.analytics.trend}</td>
            <td>{Math.round(row.score)}</td>
            <td><Sparkline points={[32, 34, 31, 38, 36, 43, 45, 42, 49]} color={row.is_buy_signal ? '#2dd4bf' : '#4ea1ff'} /></td>
            <td><StatusPill tone={row.is_buy_signal ? 'green' : row.status === 'NEAR_TARGET' ? 'amber' : 'blue'}>{row.status}</StatusPill></td>
          </tr>)}</tbody>
        </table>
      </div>
      {!rows.length && <div className="empty">暂无机会。请先运行完整流程或为商品配置策略。</div>}
    </SectionCard>
    <div className="three-col" style={{ marginTop: 16 }}>
      <SectionCard title="机会分布"><div className="gauge"><b>{buy.length}</b></div><p className="muted" style={{ textAlign: 'center' }}>当前买入信号数量</p></SectionCard>
      <SectionCard title="机会概览"><div className="list">{[['平均评分', String(avgScore)], ['候选总数', String(rows.length)], ['已验证机会占比', rows.length ? `${Math.round((rows.filter((row) => row.latest_verified).length / rows.length) * 100)}%` : '0%'], ['高置信机会', String(highConfidence.length)]].map((item) => <div className="list-row" key={item[0]}><span>{item[0]}</span><b>{item[1]}</b></div>)}</div></SectionCard>
      <SectionCard title="推荐理由"><div className="list">{rows.slice(0, 4).map((row) => <div className="list-row" key={row.product.id}><div><strong>{row.product.name}</strong><small>{row.reasons[0] ?? '等待更多真实数据'}</small></div><b>{Math.round(row.score)}</b></div>)}</div></SectionCard>
    </div>
  </>
}
