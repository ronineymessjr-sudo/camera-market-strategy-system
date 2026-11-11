import Link from 'next/link'

import type {
  FlowRun,
  IntegrationRun,
  Price,
  PriceAnalytics,
  PriceStats,
  Product,
  ProductOverview,
  ProviderStatus,
  SelectionCandidate,
  Signal,
  SourceHealth,
  Strategy,
} from '@/lib/types'
import { parseApiDate } from '@/lib/format'

function cash(value?: number | null, fallback = '暂无价格', currency = 'CNY') {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return `${currency} ${Math.round(value).toLocaleString('zh-CN')}`
}

function best(price?: Pick<Price, 'checkout_price' | 'promotion_price' | 'list_price'> | null) {
  return price?.checkout_price ?? price?.promotion_price ?? price?.list_price ?? null
}

function cashPrice(price?: Price | null, fallback = '暂无价格') {
  return cash(best(price), fallback, price?.currency ?? 'CNY')
}

function ago(value?: string | null) {
  if (!value) return 'No update'
  const date = parseApiDate(value)
  if (!date) return 'No update'
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function trustLabel(price?: Price | null) {
  if (!price) return 'UNVERIFIED'
  if (price.verification_status === 'VERIFIED_CHECKOUT') return 'VERIFIED_CHECKOUT'
  if (price.verification_status === 'VISIBLE_PRICE') return 'VISIBLE_PRICE'
  if (price.verification_status === 'INVALID') return 'INVALID'
  return 'UNVERIFIED'
}

function candidatePrice(row: SelectionCandidate) {
  if (!row.strategy || row.status === 'STALE_VERIFIED') return row.latest_clue ?? null
  return row.latest_verified ?? row.latest_clue ?? null
}

function productPrice(row: ProductOverview) {
  return row.latest_fresh_verified ?? row.latest_clue ?? null
}

function productName(products: Product[], id: number) {
  return products.find((product) => product.id === id)?.name ?? `Product #${id}`
}

function pct(value?: number | null, digits = 0) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'n/a'
  return `${value.toFixed(digits)}%`
}

export function CommandCenter({
  products,
  candidates,
  stats,
}: {
  products: ProductOverview[]
  candidates: SelectionCandidate[]
  stats?: PriceStats | null
}) {
  const buySignals = candidates.filter((row) => row.is_buy_signal)
  const verified = products.filter((row) => row.latest_verified)
  const review = products.filter((row) => row.latest_clue && !row.latest_verified)
  const leader = candidates[0]
  const focus = leader ? products.find((row) => row.product.id === leader.product.id) ?? products[0] : products[0]

  return <section className="experience-band command-center">
    <div className="experience-head">
      <div>
        <span className="experience-kicker">今日决策台</span>
        <h2>今日运营工作台</h2>
        <p>在一个视图里处理可信机会、核验压力和下一步动作。</p>
      </div>
      <Link className="experience-action" href="/opportunities">打开机会池</Link>
    </div>
    <div className="command-grid">
      <article className="command-priority">
        <span className="module-index">01</span>
        <div>
          <small>优先目标</small>
          <h3>{focus?.product.name ?? '还没有监控商品'}</h3>
          <p>{leader?.status ?? '等待下一次真实运行'}</p>
        </div>
        <strong>{focus ? cashPrice(productPrice(focus)) : '暂无价格'}</strong>
      </article>
      {[
        ['策略机会', buySignals.length, '只有核验到手价才能触发动作'],
        ['可信商品', verified.length, '已有可执行证据的商品'],
        ['待核验队列', stats?.needs_review ?? review.length, '等待人工确认结算页价格'],
      ].map(([label, value, note]) => <article className="command-stat" key={label}>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </article>)}
    </div>
    <div className="radar-list">
      {candidates.slice(0, 5).map((row, index) => <Link href={`/products/${row.product.id}`} className="radar-row" key={row.product.id}>
        <span>{String(index + 1).padStart(2, '0')}</span>
        <div>
          <b>{row.product.name}</b>
          <small>{row.reasons[0] ?? row.status}</small>
        </div>
        <strong>{cashPrice(candidatePrice(row))}</strong>
        <em className={row.is_buy_signal ? 'hot' : 'watch'}>{row.is_buy_signal ? '可复核' : '观察'}</em>
      </Link>)}
      {!candidates.length && <div className="empty">暂无候选机会，先运行一次真实流程。</div>}
    </div>
  </section>
}

export function VerificationCockpit({ queue, stats }: { queue: Price[]; stats?: PriceStats | null }) {
  const first = queue[0]
  const evidenceSteps = [
    ['01', 'Visible price', 'Clue'],
    ['02', 'Checkout review', 'Manual'],
    ['03', 'Verified checkout', 'Trusted'],
    ['04', 'Strategy signal', 'Action'],
  ]

  return <section className="experience-band verification-cockpit">
    <div className="experience-head">
      <div>
        <span className="experience-kicker">证据核验舱</span>
        <h2>把网页价格变成可信决策</h2>
        <p>优先处理风险最高的线索，只把已确认的结算价提升为可信事实。</p>
      </div>
      <Link className="experience-action" href="/verification">打开核验队列</Link>
    </div>
    <div className="cockpit-grid">
      <div className="cockpit-meter">
        <span>队列压力</span>
        <strong>{stats?.needs_review ?? queue.length}</strong>
        <small>当前有 {stats?.verified_checkout ?? 0} 条核验到手价记录</small>
      </div>
      <div className="evidence-ladder">
        {evidenceSteps.map(([index, step, note]) => <div key={step}>
          <span>{index}</span>
          <b>{step}</b>
          <small>{note}</small>
        </div>)}
      </div>
      <article className="cockpit-focus">
        <span>Current evidence</span>
        <h3>{first?.title ?? (first ? `Product #${first.product_id}` : 'No pending clue')}</h3>
        <p>{first ? `${first.platform ?? '未知来源'} / ${cashPrice(first)} / ${ago(first.captured_at)}` : '运行真实流程后，待核验队列会在这里更新。'}</p>
      </article>
    </div>
  </section>
}

export function PriceStory({
  product,
  prices,
  analytics,
  signals,
  strategy,
}: {
  product: Product
  prices: Price[]
  analytics?: PriceAnalytics | null
  signals?: Signal[]
  strategy?: Strategy | null
}) {
  const usable = prices.filter((price) => typeof best(price) === 'number')
  const trusted = usable.filter((price) => price.verification_status === 'VERIFIED_CHECKOUT')
  const clues = usable.filter((price) => price.verification_status !== 'VERIFIED_CHECKOUT' && price.verification_status !== 'INVALID')
  const latestTrusted = trusted[0]
  const latestClue = clues[0]
  const lowTrusted = trusted.reduce<Price | null>((winner, price) => {
    if (!winner) return price
    return (best(price) ?? Infinity) < (best(winner) ?? Infinity) ? price : winner
  }, null)
  const events = [
    { label: '最新可信到手价', value: cashPrice(latestTrusted), detail: latestTrusted ? `已核验结算价 / ${ago(latestTrusted.captured_at)}` : '暂无可执行价格' },
    { label: '历史最低可信价', value: cashPrice(lowTrusted), detail: lowTrusted ? `${lowTrusted.platform ?? '未知来源'} / ${ago(lowTrusted.captured_at)}` : '暂无可信历史' },
    { label: '最新网页线索', value: cashPrice(latestClue), detail: latestClue ? `${trustLabel(latestClue)} / 仅供核验` : '暂无待处理线索' },
    { label: '策略触发价', value: cash(strategy?.trigger_price, '暂无价格', strategy?.currency ?? 'CNY'), detail: strategy?.strategy_name ?? '暂无启用策略' },
  ]

  return <section className="experience-band price-story">
    <div className="experience-head">
      <div>
        <span className="experience-kicker">价格轨迹</span>
        <h2>{product.name}</h2>
        <p>集中查看价格变化、可信检查点、错过窗口与策略上下文。</p>
      </div>
      <span className="experience-chip">{signals?.filter((signal) => signal.triggered).length ?? 0} 个策略触发信号</span>
    </div>
    <div className="story-timeline">
      {events.map((event, index) => <article key={event.label}>
        <span>{String(index + 1).padStart(2, '0')}</span>
        <div>
          <small>{event.label}</small>
          <strong>{event.value}</strong>
          <p>{event.detail}</p>
        </div>
      </article>)}
    </div>
    <div className="story-strip">
      {usable.slice(0, 12).reverse().map((price) => <i
        key={price.id}
        className={price.verification_status === 'VERIFIED_CHECKOUT' ? 'verified' : 'clue'}
        title={`${trustLabel(price)} ${cashPrice(price)}`}
      />)}
    </div>
  </section>
}

export function StrategyLab({ strategies, products }: { strategies: Strategy[]; products: Product[] }) {
  const active = strategies.filter((strategy) => strategy.is_active)
  const strong = strategies.filter((strategy) => strategy.strong_buy_price)
  const avgAge = strategies.length ? Math.round(strategies.reduce((sum, item) => sum + item.max_price_age_hours, 0) / strategies.length) : 0

  return <section className="experience-band strategy-lab">
    <div className="experience-head">
      <div>
        <span className="experience-kicker">策略实验室</span>
        <h2>信号触发前，先看清策略行为</h2>
        <p>比较启用规则、可信度边界和每个商品的执行门槛。</p>
      </div>
      <span className="experience-chip">{active.length}/{strategies.length} active</span>
    </div>
    <div className="lab-grid">
      {[
        ['启用规则', active.length, '当前正在监控'],
        ['强买入线', strong.length, '已配置硬触发价'],
        ['新鲜度上限', `${avgAge}h`, '平均允许价格年龄'],
      ].map(([label, value, note]) => <article className="lab-metric" key={label}>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </article>)}
    </div>
    <div className="strategy-stack">
      {strategies.slice(0, 6).map((strategy, index) => <article key={strategy.id}>
        <span>{String(index + 1).padStart(2, '0')}</span>
        <div>
          <b>{productName(products, strategy.product_id)}</b>
          <small>{strategy.strategy_name} / {strategy.mode}</small>
        </div>
        <strong>{cash(strategy.trigger_price, '暂无目标价', strategy.currency)}</strong>
        <em>{strategy.is_active ? 'LIVE' : 'PAUSED'}</em>
      </article>)}
    </div>
  </section>
}

export function SourceHealthAtlas({
  providers,
  integrationRuns,
  latestRun,
  stats,
  sourceHealth = [],
}: {
  providers: ProviderStatus[]
  integrationRuns?: IntegrationRun[]
  latestRun?: FlowRun | null
  stats?: PriceStats | null
  sourceHealth?: SourceHealth[]
}) {
  const healthy = sourceHealth.filter((item) => item.status === 'HEALTHY').length
  const health = sourceHealth.length ? Math.round((healthy / sourceHealth.length) * 100) : 0
  const healthByProvider = new Map(sourceHealth.map((item) => [item.provider, item]))

  return <section className="experience-band source-atlas">
    <div className="experience-head">
      <div>
        <span className="experience-kicker">数据源健康图谱</span>
        <h2>知道哪些来源值得信任</h2>
        <p>连接状态、同步新鲜度和抓取健康度，与价格证据层放在一起判断。</p>
      </div>
      <span className="experience-chip">{health}% runtime healthy</span>
    </div>
    <div className="source-grid">
      {providers.map((provider) => <article key={provider.provider} className={healthByProvider.get(provider.provider)?.status === 'HEALTHY' ? 'ready' : 'missing'}>
        <span>{provider.display_name}</span>
        <strong>{healthByProvider.get(provider.provider)?.status ?? (provider.configured ? 'NO RUNS' : 'MISSING KEY')}</strong>
        <small>{healthByProvider.get(provider.provider)?.success_rate ?? 0}% success / {healthByProvider.get(provider.provider)?.average_latency_ms ?? 'n/a'} ms</small>
      </article>)}
    </div>
    <div className="source-footer">
      <div><span>最近抓取任务</span><b>{latestRun?.status ?? '尚未运行'}</b><small>{latestRun ? ago(latestRun.finished_at ?? latestRun.started_at) : '运行一次后开始记录健康度'}</small></div>
      <div><span>API 同步记录</span><b>{integrationRuns?.length ?? 0}</b><small>最近的供应商导入尝试</small></div>
      <div><span>价格记录</span><b>{stats?.total ?? 0}</b><small>{stats?.verified_checkout ?? 0} 条已核验到手价</small></div>
    </div>
  </section>
}

export function OperatorMode({
  products,
  candidates,
  stats,
}: {
  products: ProductOverview[]
  candidates: SelectionCandidate[]
  stats?: PriceStats | null
}) {
  const act = candidates.filter((row) => row.is_buy_signal).slice(0, 3)
  const verify = products.filter((row) => row.latest_clue && !row.latest_verified).slice(0, 3)

  return <section className="experience-band operator-mode">
    <div className="experience-head">
      <div>
        <span className="experience-kicker">运营模式</span>
        <h2>五分钟完成一次自用检查</h2>
        <p>适合移动端的短流程：行动、核验、忽略，再生成今日报告。</p>
      </div>
      <span className="experience-chip">{stats?.needs_review ?? verify.length} to review</span>
    </div>
    <div className="operator-columns">
      <div>
        <h3>现在行动</h3>
        {act.length ? act.map((row) => <Link href={`/products/${row.product.id}`} key={row.product.id}>
          <b>{row.product.name}</b>
          <span>{cashPrice(candidatePrice(row))}</span>
        </Link>) : <p>暂无可执行信号。</p>}
      </div>
      <div>
        <h3>下一步核验</h3>
        {verify.length ? verify.map((row) => <Link href="/verification" key={row.product.id}>
          <b>{row.product.name}</b>
          <span>{cashPrice(productPrice(row))}</span>
        </Link>) : <p>暂无紧急核验项。</p>}
      </div>
      <div>
        <h3>完成闭环</h3>
        <Link href="/sources"><b>检查数据源健康</b><span>查看供应商与抓取状态</span></Link>
        <Link href="/reports"><b>生成今日报告</b><span>沉淀决策与运行证据</span></Link>
      </div>
    </div>
  </section>
}
