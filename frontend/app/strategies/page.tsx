import { StrategyLab } from '@/components/experience-modules'
import { StrategyManagement } from '@/components/strategy-management'
import { SectionCard, StatusPill } from '@/components/dashboard-ui'
import { api } from '@/lib/api'
import type { Product, Strategy } from '@/lib/types'

export const dynamic = 'force-dynamic'

function cash(value?: number | null, fallback = 'No price') {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return `CNY ${Math.round(value).toLocaleString('en-US')}`
}

async function loadStrategies() {
  try {
    const [strategies, products] = await Promise.all([
      api<Strategy[]>('/api/strategies'),
      api<Product[]>('/api/products'),
    ])
    return { strategies, products }
  } catch {
    return { strategies: [], products: [] }
  }
}

export default async function Strategies() {
  const { strategies, products } = await loadStrategies()
  const productMap = new Map(products.map((product) => [product.id, product]))

  return <>
    <div className="page-title">
      <div>
        <span className="eyebrow">STRATEGY LAB</span>
        <h1>Strategy Lab</h1>
        <p>Design the behavior of each buying rule before the system turns evidence into action.</p>
      </div>
    </div>

    <StrategyLab strategies={strategies} products={products} />

    <SectionCard title="Strategy cards" className="ledger-panel">
      <div className="strategy-card-grid">
        {strategies.map((strategy) => <article className="strategy-card" key={strategy.id}>
          <div>
            <StatusPill tone={strategy.is_active ? 'green' : 'amber'}>{strategy.is_active ? 'LIVE' : 'PAUSED'}</StatusPill>
            <h3>{productMap.get(strategy.product_id)?.name ?? `Product #${strategy.product_id}`}</h3>
            <p>{strategy.strategy_name} · {strategy.mode}</p>
          </div>
          <div className="strategy-card-prices">
            <span>Watch <b>{cash(strategy.watch_price)}</b></span>
            <span>Trigger <b>{cash(strategy.trigger_price)}</b></span>
            <span>Strong <b>{cash(strategy.strong_buy_price)}</b></span>
          </div>
        </article>)}
      </div>
      {!strategies.length && <div className="empty">No strategy configured yet. Add a trigger price from the management panel below.</div>}
    </SectionCard>

    <div className="detail-grid" style={{ marginTop: 16 }}>
      <SectionCard title="Management">
        <StrategyManagement strategies={strategies} products={products} />
      </SectionCard>
      <aside>
        <SectionCard title="Lab notes">
          <div className="list">
            <div className="list-row"><span>Trust rule</span><b>VERIFIED_CHECKOUT only</b></div>
            <div className="list-row"><span>Noise guard</span><b>Visible prices stay clues</b></div>
            <div className="list-row"><span>Best next pass</span><b>Backtest thresholds per product</b></div>
          </div>
        </SectionCard>
      </aside>
    </div>
  </>
}
