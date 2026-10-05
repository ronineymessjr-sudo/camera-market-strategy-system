import Link from 'next/link'

import { AmbientField } from '@/components/ambient-field'
import { DailyRunButton } from '@/components/daily-run-button'
import { TrustBadge } from '@/components/dashboard-ui'
import { api } from '@/lib/api'
import { ageLabel, bestPrice, confidence, money, parseApiDate } from '@/lib/format'
import type { FrontendBootstrap, Price, ProductOverview, SelectionCandidate } from '@/lib/types'

export const dynamic = 'force-dynamic'
const PRODUCT_LIMIT = 500
const CANDIDATE_LIMIT = 200

async function loadBootstrap() {
  try {
    return await api<FrontendBootstrap>(`/api/frontend/bootstrap?product_limit=${PRODUCT_LIMIT}&candidate_limit=${CANDIDATE_LIMIT}`)
  } catch {
    return null
  }
}

function priceOf(row?: ProductOverview | null) {
  if (!row) return null
  return row.latest_fresh_verified ?? row.latest_clue ?? row.latest_any ?? null
}

function candidatePrice(row: SelectionCandidate) {
  if (!row.strategy || row.status === 'STALE_VERIFIED') return row.latest_clue ?? null
  return row.latest_verified ?? row.latest_clue ?? null
}

function trustState(price?: Price | null, isFresh = false): 'verified' | 'visible' | 'unverified' | 'stale' {
  if (!price) return 'unverified'
  if (price.verification_status === 'VERIFIED_CHECKOUT') return isFresh ? 'verified' : 'stale'
  if (price.verification_status === 'VISIBLE_PRICE') return 'visible'
  if (price.verification_status === 'INVALID' || (price.valid_until && (parseApiDate(price.valid_until)?.getTime() ?? 0) < Date.now())) return 'stale'
  return 'unverified'
}

function countLabel(data: FrontendBootstrap | null, count: number, limit: number) {
  if (!data) return '—'
  return count >= limit ? `${limit}+` : String(count)
}

function snapshotTime(value?: string | null) {
  if (!value) return '等待首次运行'
  const date = parseApiDate(value)
  return !date ? '时间不可用' : `快照 ${date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`
}

export default async function Home() {
  const data = await loadBootstrap()
  const products = data?.products ?? []
  const candidates = data?.selection_candidates ?? []
  const stats = data?.price_stats ?? null
  const buySignals = candidates.filter((row) => row.is_buy_signal)
  const verifiedProducts = products.filter((row) => row.latest_fresh_verified)
  const reviewQueue = products.filter((row) => row.latest_clue && !row.latest_fresh_verified)
  const focusCandidate = candidates[0]
  const focus = focusCandidate ? products.find((row) => row.product.id === focusCandidate.product.id) ?? products[0] : products[0]
  const focusPrice = priceOf(focus)
  const reviewCount = stats?.needs_review ?? reviewQueue.length
  const runState = data?.latest_run?.status === 'SUCCESS'
    ? '成功'
    : data?.latest_run?.status === 'PARTIAL'
      ? '部分失败'
      : data?.latest_run?.status === 'FAILED'
        ? '失败'
        : '待抓取'
  const trustedPrice = focus?.latest_fresh_verified

  return <div className="overview-page">
    <AmbientField />
    <div className="overview-stack">
      <section className="overview-hero">
        <div className="hero-topline">
          <div><span className="eyebrow">TODAY / CAMERA MARKET</span><span className="hero-refresh">{snapshotTime(data?.generated_at)}</span></div>
          <span className="hero-mode"><i /> 私有运营工作台</span>
        </div>
        <div className="hero-main">
          <div className="hero-copy">
            <h1>先核验，<em>再行动。</em></h1>
            <p>公开价格只是线索，结算页证据才是事实。把每一次抓取、人工确认和策略判断放进同一条可追溯的工作流。</p>
            <div className="hero-cta"><DailyRunButton /><Link className="hero-link" href="/verification">打开核验队列 <span>↗</span></Link></div>
          </div>
          <div className="trust-lock" aria-label="执行门槛">
            <div className="lock-ring"><span>04</span></div>
            <div><span className="lock-label">执行门槛</span><strong>VERIFIED_CHECKOUT</strong><small>只有带可信证据的到手价，才允许触发策略。</small></div>
          </div>
        </div>
        <div className="workflow-strip" aria-label="价格追踪流程">
          <Link href="/products" className="workflow-step"><span className="step-no">01</span><div><span>监控商品</span><strong>{countLabel(data, products.length, PRODUCT_LIMIT)}</strong><small>持续追踪中</small></div><b>→</b></Link>
          <Link href="/verification" className={`workflow-step ${reviewCount ? 'attention' : ''}`}><span className="step-no">02</span><div><span>人工核验</span><strong>{data ? reviewCount : '—'}</strong><small>{!data ? '等待接口恢复' : reviewCount ? '等待证据' : '队列已清空'}</small></div><b>→</b></Link>
          <Link href="/opportunities" className={`workflow-step ${buySignals.length ? 'ready' : ''}`}><span className="step-no">03</span><div><span>策略机会</span><strong>{countLabel(data, buySignals.length, CANDIDATE_LIMIT)}</strong><small>{buySignals.length ? '可复核信号' : '暂无可执行信号'}</small></div><b>→</b></Link>
          <Link href="/history" className="workflow-step"><span className="step-no">04</span><div><span>最近抓取</span><strong>{data ? runState : '—'}</strong><small>{data?.latest_run ? `${data.latest_run.success_count} 成功 · ${data.latest_run.failure_count} 失败` : data ? '还没有抓取记录' : '等待接口恢复'}</small></div><b>↗</b></Link>
        </div>
      </section>

      {!data && <div className="connection-warning" role="alert"><strong>暂时无法读取系统数据</strong><span>后端接口没有返回工作台快照。检查顶部接口状态后重试。</span><Link href="/" prefetch={false}>重新加载</Link></div>}

      <div className="overview-kpis">
        <article><span>焦点商品可信价</span><strong>{data ? money(bestPrice(trustedPrice), '暂无可信价', trustedPrice?.currency ?? 'CNY') : '—'}</strong><small>{verifiedProducts.length} 个商品有新鲜核验记录</small><i className="kpi-mark cyan">↘</i></article>
        <article><span>策略触发机会</span><strong>{countLabel(data, buySignals.length, CANDIDATE_LIMIT)}</strong><small>{countLabel(data, candidates.length, CANDIDATE_LIMIT)} 个候选已排序</small><i className="kpi-mark amber">!</i></article>
        <article><span>待人工核验</span><strong>{data ? reviewCount : '—'}</strong><small>{data ? `${stats?.visible_price ?? 0} 条网页可见价` : '等待接口恢复'}</small><i className="kpi-mark blue">✓</i></article>
        <article><span>价格记录</span><strong>{data ? stats?.total ?? 0 : '—'}</strong><small>{data ? `无效记录 ${stats?.invalid ?? 0} 条` : '等待接口恢复'}</small><i className="kpi-mark green">✦</i></article>
      </div>

      <div className="overview-grid overview-grid-primary">
        <section className="panel spotlight-panel">
          <div className="section-heading"><div><span className="section-kicker">FOCUS PRODUCT</span><h2>当前最值得关注</h2></div>{focus && <Link href={`/products/${focus.product.id}`} className="quiet-link">查看轨迹 ↗</Link>}</div>
          {focus ? <div className="spotlight-content">
            <div className="product-orbit"><span>{focus.product.name.slice(0, 1)}</span><i /></div>
            <div className="spotlight-copy"><div className="badge-row"><TrustBadge state={trustState(focusPrice, Boolean(focus?.latest_fresh_verified))} />{focusCandidate && <span className="score-badge">评分 {Math.round(focusCandidate.score)}</span>}</div><h3>{focus.product.name}</h3><p>{[focus.product.brand, focus.product.category, focus.product.mount_type].filter(Boolean).join(' · ') || '摄像器材'}</p><div className="spotlight-facts"><div><span>当前可信价</span><strong>{money(bestPrice(trustedPrice), '暂无可信价', trustedPrice?.currency ?? 'CNY')}</strong></div><div><span>最新价格记录</span><strong>{ageLabel(focusPrice?.captured_at)}</strong></div><div><span>来源</span><strong>{focusPrice?.platform ?? '等待来源'}</strong></div></div></div>
          </div> : <div className="empty-state"><strong>{data ? '还没有监控商品' : '暂时无法读取商品'}</strong><span>{data ? '先添加商品或导入 watchlist，再运行第一次价格抓取。' : '后端接口恢复后，商品和价格状态会重新显示。'}</span>{data && <Link className="btn-primary" href="/products#watchlist-tools">添加监控</Link>}</div>}
        </section>

        <section className="panel action-panel">
          <div className="section-heading"><div><span className="section-kicker">NEXT ACTION</span><h2>现在做什么</h2></div><span className={`live-badge ${data ? '' : 'offline'}`}><i />{data ? '快照已读取' : '接口不可用'}</span></div>
          <div className="action-list">
            <Link href="/verification" className={reviewCount ? 'action-item urgent' : 'action-item'}><span>01</span><div><strong>核验价格证据</strong><small>{reviewCount ? `${reviewCount} 条线索等待人工确认` : '当前没有待核验线索'}</small></div><b>→</b></Link>
            <Link href="/opportunities" className="action-item"><span>02</span><div><strong>复核策略机会</strong><small>{buySignals.length ? `${buySignals.length} 个信号可进一步确认` : '等待可信到手价触发策略'}</small></div><b>→</b></Link>
            <Link href="/sources" className="action-item"><span>03</span><div><strong>检查数据源</strong><small>{data ? `${data.source_health.filter((item) => item.status === 'HEALTHY').length}/${data.source_health.length} 个运行状态健康` : '等待接口恢复'}</small></div><b>→</b></Link>
            <Link href="/reports" className="action-item"><span>04</span><div><strong>生成今日报告</strong><small>{data?.latest_run ? `上次运行 ${ageLabel(data.latest_run.finished_at ?? data.latest_run.started_at)}` : '还没有今日运行记录'}</small></div><b>↗</b></Link>
          </div>
        </section>
      </div>

      <div className="overview-grid overview-grid-secondary">
        <section className="panel candidate-panel">
          <div className="section-heading"><div><span className="section-kicker">OPPORTUNITY RADAR</span><h2>候选商品优先级</h2></div><Link href="/opportunities" className="quiet-link">查看全部 ↗</Link></div>
          {candidates.length ? <div className="candidate-list">{candidates.slice(0, 6).map((row, index) => { const price = candidatePrice(row); return <Link href={`/products/${row.product.id}`} className="candidate-row" key={row.product.id}><span className="candidate-rank">{String(index + 1).padStart(2, '0')}</span><div><strong>{row.product.name}</strong><small>{row.reasons[0] ?? row.status}</small></div><b>{money(bestPrice(price), '暂无价格', price?.currency ?? row.analytics.currency ?? 'CNY')}</b><span className={`candidate-state ${row.is_buy_signal ? 'hot' : 'watch'}`}>{row.is_buy_signal ? '可复核' : '观察'}</span></Link> })}</div> : <div className="empty-state compact"><strong>{data ? '暂无候选机会' : '暂时无法读取机会'}</strong><span>{data ? '运行每日流程或先为商品配置策略。' : '后端接口恢复后再试。'}</span></div>}
        </section>

        <section className="panel evidence-panel">
          <div className="section-heading"><div><span className="section-kicker">EVIDENCE QUEUE</span><h2>待核验线索</h2></div><Link href="/verification" className="quiet-link">打开队列 ↗</Link></div>
          <div className="evidence-count"><strong>{reviewCount}</strong><span>条线索未形成执行事实</span></div>
          <div className="evidence-list">{reviewQueue.slice(0, 4).map((row) => <Link href="/verification" className="evidence-row" key={row.product.id}><div><strong>{row.product.name}</strong><small>{row.latest_clue?.platform ?? '未知来源'} · {ageLabel(row.latest_clue?.captured_at)}</small></div><span>{confidence(row.latest_clue?.confidence_score)}</span></Link>)}{!reviewQueue.length && <div className="empty-state compact"><strong>{data ? '核验队列为空' : '暂时无法读取队列'}</strong><span>{data ? '新的网页价格线索会出现在这里。' : '后端接口恢复后再试。'}</span></div>}</div>
          <div className="trust-note"><span>信任规则</span><strong>VISIBLE_PRICE ≠ 可执行</strong><small>只有上传并验证结算证据后，价格才可进入策略。</small></div>
        </section>
      </div>
    </div>
  </div>
}
