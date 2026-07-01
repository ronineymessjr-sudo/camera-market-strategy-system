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
  Strategy,
} from '@/lib/types'

function cash(value?: number | null, fallback = 'No price') {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return `CNY ${Math.round(value).toLocaleString('en-US')}`
}

function best(price?: Pick<Price, 'checkout_price' | 'promotion_price' | 'list_price'> | null) {
  return price?.checkout_price ?? price?.promotion_price ?? price?.list_price ?? null
}

function ago(value?: string | null) {
  if (!value) return 'No update'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No update'
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
  return best(row.latest_verified) ?? best(row.latest_clue)
}

function productPrice(row: ProductOverview) {
  return best(row.latest_verified) ?? best(row.latest_clue) ?? best(row.latest_any)
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
        <span className="experience-kicker">COMMAND CENTER</span>
        <h2>Today&apos;s operator desk</h2>
        <p>Prioritize verified opportunity, review pressure, and the next action in one scan.</p>
      </div>
      <Link className="experience-action" href="/opportunities">Open opportunity pool</Link>
    </div>
    <div className="command-grid">
      <article className="command-priority">
        <span className="module-index">01</span>
        <div>
          <small>Priority target</small>
          <h3>{focus?.product.name ?? 'No tracked product yet'}</h3>
          <p>{leader?.status ?? 'Waiting for the next real run'}</p>
        </div>
        <strong>{focus ? cash(productPrice(focus)) : 'No price'}</strong>
      </article>
      {[
        ['Buy signals', buySignals.length, 'Only verified checkout prices can trigger action'],
        ['Verified products', verified.length, 'Products with executable evidence'],
        ['Review queue', stats?.needs_review ?? review.length, 'Clues waiting for manual checkout'],
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
        <strong>{cash(candidatePrice(row))}</strong>
        <em className={row.is_buy_signal ? 'hot' : 'watch'}>{row.is_buy_signal ? 'ACT' : 'WATCH'}</em>
      </Link>)}
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
        <span className="experience-kicker">VERIFICATION COCKPIT</span>
        <h2>Turn visible prices into trusted decisions</h2>
        <p>Review the highest-risk clues first, then promote only confirmed checkout prices.</p>
      </div>
      <Link className="experience-action" href="/verification">Open queue</Link>
    </div>
    <div className="cockpit-grid">
      <div className="cockpit-meter">
        <span>Queue pressure</span>
        <strong>{stats?.needs_review ?? queue.length}</strong>
        <small>{stats?.verified_checkout ?? 0} verified checkout records available</small>
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
        <p>{first ? `${first.platform ?? 'Unknown source'} / ${cash(best(first))} / ${ago(first.captured_at)}` : 'Run the real flow to refill the review lane.'}</p>
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
  const latest = usable[0]
  const low = usable.reduce<Price | null>((winner, price) => {
    if (!winner) return price
    return (best(price) ?? Infinity) < (best(winner) ?? Infinity) ? price : winner
  }, null)
  const events = [
    { label: 'Latest evidence', value: cash(best(latest)), detail: latest ? `${trustLabel(latest)} / ${ago(latest.captured_at)}` : 'No captured price yet' },
    { label: 'Lowest captured point', value: cash(best(low)), detail: low ? `${low.platform ?? 'Unknown source'} / ${ago(low.captured_at)}` : 'No history yet' },
    { label: 'Strategy target', value: cash(strategy?.trigger_price), detail: strategy?.strategy_name ?? 'No active strategy' },
    { label: 'Current trend', value: analytics?.trend ?? 'Unknown', detail: `${analytics?.sample_count ?? 0} samples in window` },
  ]

  return <section className="experience-band price-story">
    <div className="experience-head">
      <div>
        <span className="experience-kicker">PRICE STORY</span>
        <h2>{product.name}</h2>
        <p>A compact timeline for drops, trusted checkpoints, missed windows, and strategy context.</p>
      </div>
      <span className="experience-chip">{signals?.filter((signal) => signal.triggered).length ?? 0} triggered signals</span>
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
        title={`${trustLabel(price)} ${cash(best(price))}`}
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
        <span className="experience-kicker">STRATEGY LAB</span>
        <h2>Strategy behavior before it becomes a signal</h2>
        <p>Compare active rules, confidence limits, and how strict each product&apos;s buying logic is.</p>
      </div>
      <span className="experience-chip">{active.length}/{strategies.length} active</span>
    </div>
    <div className="lab-grid">
      {[
        ['Active rules', active.length, 'Currently watching'],
        ['Strong-buy lines', strong.length, 'Configured hard entries'],
        ['Freshness limit', `${avgAge}h`, 'Average max price age'],
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
        <strong>{cash(strategy.trigger_price, 'No target')}</strong>
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
}: {
  providers: ProviderStatus[]
  integrationRuns?: IntegrationRun[]
  latestRun?: FlowRun | null
  stats?: PriceStats | null
}) {
  const configured = providers.filter((provider) => provider.configured).length
  const health = providers.length ? Math.round((configured / providers.length) * 100) : 0

  return <section className="experience-band source-atlas">
    <div className="experience-head">
      <div>
        <span className="experience-kicker">SOURCE HEALTH ATLAS</span>
        <h2>Know which sources deserve trust</h2>
        <p>Connection state, sync freshness, and crawler health sit next to the price evidence layer.</p>
      </div>
      <span className="experience-chip">{health}% configured</span>
    </div>
    <div className="source-grid">
      {providers.map((provider) => <article key={provider.provider} className={provider.configured ? 'ready' : 'missing'}>
        <span>{provider.display_name}</span>
        <strong>{provider.configured ? 'READY' : 'MISSING KEY'}</strong>
        <small>{provider.mode}</small>
      </article>)}
    </div>
    <div className="source-footer">
      <div><span>Latest crawler run</span><b>{latestRun?.status ?? 'No run'}</b><small>{latestRun ? ago(latestRun.finished_at ?? latestRun.started_at) : 'Start a run to populate health'}</small></div>
      <div><span>API sync logs</span><b>{integrationRuns?.length ?? 0}</b><small>Recent provider import attempts</small></div>
      <div><span>Price records</span><b>{stats?.total ?? 0}</b><small>{stats?.verified_checkout ?? 0} checkout-verified</small></div>
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
        <span className="experience-kicker">OPERATOR MODE</span>
        <h2>Five-minute self-use pass</h2>
        <p>A compact mobile-friendly routine: act, verify, ignore, then generate the daily report.</p>
      </div>
      <span className="experience-chip">{stats?.needs_review ?? verify.length} to review</span>
    </div>
    <div className="operator-columns">
      <div>
        <h3>Act now</h3>
        {act.length ? act.map((row) => <Link href={`/products/${row.product.id}`} key={row.product.id}>
          <b>{row.product.name}</b>
          <span>{cash(candidatePrice(row))}</span>
        </Link>) : <p>No executable buy signal.</p>}
      </div>
      <div>
        <h3>Verify next</h3>
        {verify.length ? verify.map((row) => <Link href="/verification" key={row.product.id}>
          <b>{row.product.name}</b>
          <span>{cash(productPrice(row))}</span>
        </Link>) : <p>No urgent verification lane.</p>}
      </div>
      <div>
        <h3>Close the loop</h3>
        <Link href="/sources"><b>Run source health</b><span>Check provider and crawler status</span></Link>
        <Link href="/reports"><b>Generate report</b><span>Capture decisions for GPT handoff</span></Link>
      </div>
    </div>
  </section>
}
