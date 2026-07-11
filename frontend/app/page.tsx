import Link from 'next/link'

import { CommandCenter, OperatorMode, VerificationCockpit } from '@/components/experience-modules'
import { AmbientField } from '@/components/ambient-field'
import { AnimatedNumber } from '@/components/animated-number'
import { DailyRunButton } from '@/components/daily-run-button'
import { MetricCard, SectionCard, StatusPill } from '@/components/dashboard-ui'
import { api } from '@/lib/api'
import type { FrontendBootstrap } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function loadBootstrap() {
  try {
    return await api<FrontendBootstrap>('/api/frontend/bootstrap?product_limit=30&candidate_limit=12')
  } catch {
    return null
  }
}

export default async function Home() {
  const data = await loadBootstrap()
  const products = data?.products ?? []
  const candidates = data?.selection_candidates ?? []
  const stats = data?.price_stats ?? null
  const buySignals = candidates.filter((row) => row.is_buy_signal)
  const verifiedProducts = products.filter((row) => row.latest_verified)
  const reviewQueue = products.filter((row) => row.latest_clue && !row.latest_verified)
  const topCandidate = candidates[0]

  return <div className="dashboard-stage">
    <AmbientField />
    <div className="dashboard-content">
      <section className="opening-hero">
        <div className="opening-copy">
          <span className="eyebrow">V0.15 / VERIFIED PRICE INTELLIGENCE</span>
          <h1>Camera Market<br />Command Center</h1>
          <p>Bring back the drama at the door, then get straight to the work: checkout evidence, strategy signals, source health, and daily operator flow.</p>
          <div className="opening-actions">
            <DailyRunButton />
            <Link className="hero-secondary" href="/verification">Review evidence</Link>
          </div>
        </div>
        <div className="opening-visual" aria-label="Camera market signal overview">
          <div className="device-plate">
            <div className="lens-orbit">
              <span />
              <i />
            </div>
            <div className="signal-card primary">
              <small>Top candidate</small>
              <b>{topCandidate?.product.name ?? 'Waiting for real flow'}</b>
              <em>{topCandidate?.status ?? 'NO_SIGNAL'}</em>
            </div>
            <div className="signal-card secondary">
              <small>Trust gate</small>
              <b>VERIFIED_CHECKOUT</b>
              <em>required for action</em>
            </div>
          </div>
        </div>
        <div className="opening-stats">
          <div><span>Executable</span><strong>{buySignals.length}</strong><small>signals</small></div>
          <div><span>Trusted</span><strong>{verifiedProducts.length}</strong><small>products</small></div>
          <div><span>Review</span><strong>{stats?.needs_review ?? reviewQueue.length}</strong><small>clues</small></div>
        </div>
      </section>

      <div className="metrics">
        <MetricCard label="Executable signals" value={<AnimatedNumber value={buySignals.length} />} note="Triggered only by checkout-verified evidence" icon="01" tone="amber" />
        <MetricCard label="Trusted products" value={<AnimatedNumber value={verifiedProducts.length} />} note="Have VERIFIED_CHECKOUT records" icon="02" tone="green" />
        <MetricCard label="Review pressure" value={<AnimatedNumber value={stats?.needs_review ?? reviewQueue.length} />} note="Visible clues waiting for manual checkout" icon="03" />
      </div>

      <CommandCenter products={products} candidates={candidates} stats={stats} />
      <OperatorMode products={products} candidates={candidates} stats={stats} />
      <VerificationCockpit queue={products.flatMap((row) => row.latest_clue && !row.latest_verified ? [row.latest_clue] : [])} stats={stats} />

      <div className="two-col compact-sections">
        <SectionCard title="Action lanes">
          <div className="next-actions">
            <Link href="/verification"><span>01</span><div><b>Verify price evidence</b><small>Promote only real checkout prices</small></div></Link>
            <Link href="/opportunities"><span>02</span><div><b>Review opportunity pool</b><small>{buySignals.length} executable signals</small></div></Link>
            <Link href="/sources"><span>03</span><div><b>Check source health</b><small>Provider keys, crawler runs, API sync</small></div></Link>
            <Link href="/reports"><span>04</span><div><b>Generate daily report</b><small>Prepare the GPT handoff loop</small></div></Link>
          </div>
        </SectionCard>

        <SectionCard title="Top candidates" action="/opportunities">
          {candidates.length ? <div className="compact-list">{candidates.slice(0, 6).map((candidate, index) => <Link href={`/products/${candidate.product.id}`} key={candidate.product.id} className="compact-row">
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div><b>{candidate.product.name}</b><small>{candidate.reasons[0] ?? candidate.status}</small></div>
            <StatusPill tone={candidate.is_buy_signal ? 'solid' : 'muted'}>{candidate.is_buy_signal ? 'ACT' : 'WATCH'}</StatusPill>
          </Link>)}</div> : <div className="empty">No candidates yet. Run the real flow to populate the desk.</div>}
        </SectionCard>
      </div>
    </div>
  </div>
}
