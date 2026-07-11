import Link from 'next/link'

import { DailyRunButton } from '@/components/daily-run-button'
import { MetricCard, PriceChart, SectionCard, Sparkline, StatusPill } from '@/components/dashboard-ui'
import { api } from '@/lib/api'
import { ageLabel, bestPrice, confidence, money, percent } from '@/lib/format'
import type { FrontendBootstrap, ProductOverview, SelectionCandidate } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function loadBootstrap() {
  try {
    return await api<FrontendBootstrap>('/api/frontend/bootstrap?product_limit=50&candidate_limit=20')
  } catch {
    return null
  }
}

function candidatePrice(candidate: SelectionCandidate) {
  return bestPrice(candidate.latest_verified) ?? bestPrice(candidate.latest_clue)
}

function productPrice(row?: ProductOverview | null) {
  return bestPrice(row?.latest_verified) ?? bestPrice(row?.latest_clue) ?? bestPrice(row?.latest_any)
}

export default async function Home() {
  const data = await loadBootstrap()
  const products = data?.products ?? []
  const candidates = data?.selection_candidates ?? []
  const stats = data?.price_stats
  const lowestVerified = products
    .map((row) => bestPrice(row.latest_verified))
    .filter((value): value is number => typeof value === 'number')
    .sort((a, b) => a - b)[0]
  const buySignals = candidates.filter((candidate) => candidate.is_buy_signal).length
  const core = products[0]
  const clues = products
    .filter((row) => row.latest_clue || row.latest_verified)
    .slice(0, 5)

  return <>
    <div className="page-title">
      <div><h1>概览</h1><p>真实价格、策略触发与待核验线索的一站式视图</p></div>
      <DailyRunButton />
    </div>

    <div className="metrics">
      <MetricCard label="当前最低已核验价" value={money(lowestVerified)} note={`覆盖商品 ${products.length} 款`} tone="cyan" icon="⌁" />
      <MetricCard label="策略触发机会" value={buySignals} note={`候选池 ${candidates.length} 条`} tone="amber" icon="⚡" />
      <MetricCard label="待人工核验" value={stats?.needs_review ?? 0} note={`价格记录 ${stats?.total ?? 0} 条`} tone="blue" icon="✓" />
      <MetricCard label="已核验记录" value={stats?.verified_checkout ?? 0} note={`无效 ${stats?.invalid ?? 0} 条`} tone="green" icon="✦" />
    </div>

    <div className="dashboard-grid">
      <SectionCard title="核心追踪商品" action="查看详情">
        {core ? <div className="hero-product">
          <div className="lens-visual" />
          <div>
            <StatusPill tone={core.product.is_active ? 'green' : 'amber'}>{core.product.is_active ? '追踪中' : '已暂停'}</StatusPill>
            <h3>{core.product.name}</h3>
            <p className="muted">{[core.product.brand, core.product.mount_type, core.product.sensor_format].filter(Boolean).join(' · ') || '摄影器材'}</p>
            <div className="price-row">
              <div><span>当前可信价</span><strong>{money(productPrice(core))}</strong></div>
              <div><span>平台链接</span><strong>{core.active_listing_count}</strong></div>
              <div><span>最新线索</span><strong style={{ color: '#34d399' }}>{ageLabel(core.latest_any?.captured_at)}</strong></div>
            </div>
          </div>
        </div> : <div className="empty">还没有监控商品，先在商品页添加或运行初始化数据。</div>}
        <Sparkline points={[62, 59, 61, 56, 54, 58, 50, 48, 46, 44, 43, 41]} />
      </SectionCard>
      <SectionCard title="全局价格趋势（近30天）"><PriceChart /></SectionCard>
      <SectionCard title="今日策略漏斗">
        <div className="funnel">
          <div>商品池 {products.length}</div>
          <div>候选机会 {candidates.length}</div>
          <div>待核验 {stats?.needs_review ?? 0}</div>
          <div>买入信号 {buySignals}</div>
        </div>
        <div className="list" style={{ marginTop: 18 }}>
          <div className="list-row"><div><strong>最近流程</strong><small>{data?.latest_run ? ageLabel(data.latest_run.finished_at ?? data.latest_run.started_at) : '暂无运行记录'}</small></div><StatusPill tone={data?.latest_run?.status === 'SUCCESS' ? 'green' : 'amber'}>{data?.latest_run?.status ?? '未运行'}</StatusPill></div>
          <div className="list-row"><div><strong>数据源配置</strong><small>{data?.providers.filter((item) => item.configured).length ?? 0} / {data?.providers.length ?? 0} 个平台已配置</small></div><b>{data?.providers.length ? percent((data.providers.filter((item) => item.configured).length / data.providers.length) * 100, 0) : '0%'}</b></div>
        </div>
      </SectionCard>
    </div>

    <div className="two-col" style={{ marginTop: 16 }}>
      <SectionCard title="候选商品优先级" action="查看全部">
        {candidates.length ? <table className="data-table">
          <thead><tr><th>排名</th><th>商品</th><th>当前可信价</th><th>策略价</th><th>评分</th><th>建议</th></tr></thead>
          <tbody>{candidates.slice(0, 6).map((candidate, index) => <tr key={candidate.product.id}>
            <td>#{index + 1}</td>
            <td><Link href={`/products/${candidate.product.id}`}>{candidate.product.name}</Link></td>
            <td>{money(candidatePrice(candidate))}</td>
            <td>{money(candidate.strategy?.trigger_price, '未设置')}</td>
            <td>{Math.round(candidate.score)}</td>
            <td><StatusPill tone={candidate.is_buy_signal ? 'green' : candidate.status === 'NEAR_TARGET' ? 'amber' : 'blue'}>{candidate.status}</StatusPill></td>
          </tr>)}</tbody>
        </table> : <div className="empty">暂无候选机会。运行完整流程后会根据真实价格和策略生成。</div>}
      </SectionCard>
      <SectionCard title="最新线索" action="查看核验中心">
        <div className="list">{clues.length ? clues.map((row) => <div className="list-row" key={row.product.id}>
          <div><strong>{row.product.name}</strong><small>{row.latest_clue?.platform ?? row.latest_verified?.platform ?? '未知平台'} · {money(productPrice(row))}</small></div>
          <StatusPill tone={row.latest_verified ? 'green' : 'amber'}>{row.latest_verified ? '已核验' : confidence(row.latest_clue?.confidence_score)}</StatusPill>
        </div>) : <div className="empty">暂无价格线索。</div>}</div>
      </SectionCard>
    </div>
  </>
}
