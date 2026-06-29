import Link from 'next/link'

import { AmbientField } from '@/components/ambient-field'
import { AnimatedNumber } from '@/components/animated-number'
import { DailyRunButton } from '@/components/daily-run-button'
import { MetricCard, SectionCard, StatusPill, TrustBadge } from '@/components/dashboard-ui'
import { api } from '@/lib/api'
import { ageLabel, bestPrice, money } from '@/lib/format'
import type { FrontendBootstrap, ProductOverview, SelectionCandidate } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function loadBootstrap() {
  try { return await api<FrontendBootstrap>('/api/frontend/bootstrap?product_limit=30&candidate_limit=12') }
  catch { return null }
}
function price(row?: ProductOverview | null) {
  return bestPrice(row?.latest_verified) ?? bestPrice(row?.latest_clue) ?? bestPrice(row?.latest_any)
}
function candidatePrice(row: SelectionCandidate) {
  return bestPrice(row.latest_verified) ?? bestPrice(row.latest_clue)
}

export default async function Home() {
  const data = await loadBootstrap()
  const products = data?.products ?? []
  const candidates = data?.selection_candidates ?? []
  const stats = data?.price_stats
  const verified = products.filter((row) => row.latest_verified)
  const lowest = verified.map((row) => bestPrice(row.latest_verified)).filter((v): v is number => typeof v === 'number').sort((a,b)=>a-b)[0]
  const signals = candidates.filter((row) => row.is_buy_signal)
  const focus = products[0]
  const review = products.filter((row) => row.latest_clue && !row.latest_verified).slice(0,5)

  return <div className="dashboard-stage">
    <AmbientField />
    <div className="dashboard-content">
      <div className="page-title">
        <div>
          <span className="eyebrow">TODAY / CAMERA MARKET</span>
          <h1>今天只看三件事</h1>
          <p>最低可信价、真正触发的机会、仍需人工核验的证据。</p>
        </div>
        <DailyRunButton />
      </div>

      <div className="metrics">
        <MetricCard label="最低已核验价" value={money(lowest)} note={`${verified.length} 款商品有可信价格`} icon="01" />
        <MetricCard label="已触发机会" value={<AnimatedNumber value={signals.length}/>} note={`${candidates.length} 个候选`} icon="02" />
        <MetricCard label="待核验线索" value={<AnimatedNumber value={stats?.needs_review ?? 0}/>} note="不会直接触发购买策略" icon="03" />
      </div>

      <div className="focus-grid">
        <SectionCard title="当前最值得关注" action={focus ? `/products/${focus.product.id}` : undefined}>
          {focus ? <div className="focus-product">
            <div className="focus-mark" aria-hidden="true"><span>{focus.product.brand?.slice(0,1) ?? 'C'}</span><i/></div>
            <div>
              <div className="badge-row"><TrustBadge state={focus.latest_verified ? 'verified' : focus.latest_clue ? 'visible' : 'unverified'} /></div>
              <h2>{focus.product.name}</h2>
              <p>{[focus.product.brand,focus.product.mount_type,focus.product.sensor_format].filter(Boolean).join(' · ')}</p>
              <div className="focus-facts">
                <div><span>当前可信价</span><strong>{money(price(focus))}</strong></div>
                <div><span>最近更新</span><strong>{ageLabel(focus.latest_any?.captured_at)}</strong></div>
              </div>
            </div>
          </div> : <div className="empty">还没有监控商品。</div>}
        </SectionCard>

        <SectionCard title="下一步">
          <div className="next-actions">
            <Link href="/verification"><span>01</span><div><b>核验价格证据</b><small>{stats?.needs_review ?? 0} 条等待确认</small></div></Link>
            <Link href="/opportunities"><span>02</span><div><b>查看触发机会</b><small>{signals.length} 个可执行信号</small></div></Link>
            <Link href="/reports"><span>03</span><div><b>打开今日日报</b><small>查看完整原因与记录</small></div></Link>
          </div>
        </SectionCard>
      </div>

      <div className="two-col compact-sections">
        <SectionCard title="机会清单" action="/opportunities">
          {candidates.length ? <div className="compact-list">{candidates.slice(0,6).map((c,i)=><Link href={`/products/${c.product.id}`} key={c.product.id} className="compact-row">
            <span>{String(i+1).padStart(2,'0')}</span>
            <div><b>{c.product.name}</b><small>{c.status}</small></div>
            <strong>{money(candidatePrice(c))}</strong>
            <StatusPill tone={c.is_buy_signal?'solid':'muted'}>{c.is_buy_signal?'触发':'观察'}</StatusPill>
          </Link>)}</div> : <div className="empty">暂无候选机会。</div>}
        </SectionCard>

        <SectionCard title="待核验证据" action="/verification">
          {review.length ? <div className="compact-list">{review.map((r,i)=><Link href={`/products/${r.product.id}`} key={r.product.id} className="compact-row">
            <span>{String(i+1).padStart(2,'0')}</span>
            <div><b>{r.product.name}</b><small>{r.latest_clue?.platform ?? '未知平台'}</small></div>
            <strong>{money(price(r))}</strong>
          </Link>)}</div> : <div className="empty">当前没有待核验线索。</div>}
        </SectionCard>
      </div>
    </div>
  </div>
}
