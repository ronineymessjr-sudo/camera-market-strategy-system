import { StrategyManagement } from '@/components/strategy-management'
import { SectionCard, Sparkline, StatusPill } from '@/components/dashboard-ui'
import { api } from '@/lib/api'
import { money } from '@/lib/format'
import type { Product, Strategy } from '@/lib/types'

export const dynamic = 'force-dynamic'

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
  const active = strategies.filter((strategy) => strategy.is_active)

  return <>
    <div className="page-title"><div><h1>策略管理</h1><p>创建、管理和优化你的价格策略，自动捕捉最佳入手时机</p></div><button className="btn primary">＋ 新建策略</button></div>
    <div className="three-col">{strategies.slice(0, 6).map((strategy, index) => <div className="panel" key={strategy.id}>
      <StatusPill tone={strategy.is_active ? 'green' : 'amber'}>{strategy.is_active ? '运行中' : '已暂停'}</StatusPill>
      <h3>{productMap.get(strategy.product_id)?.name ?? `商品 #${strategy.product_id}`}</h3>
      <p className="muted">{strategy.strategy_name} · {strategy.mode}</p>
      <div className="price-row">
        <div><span>触发价</span><strong>{money(strategy.trigger_price, '未设置')}</strong></div>
        <div><span>强买线</span><strong>{money(strategy.strong_buy_price, '未设置')}</strong></div>
      </div>
      <Sparkline points={[55, 60, 58, 64, 62, 70, 68, 72, 75, 79].map((value) => value - index * 2)} />
      <div className={strategy.is_active ? 'toggle' : 'toggle off'} />
    </div>)}</div>
    {!strategies.length && <div className="panel empty">暂无策略。可以先为监控商品创建触发价策略。</div>}
    <div className="detail-grid" style={{ marginTop: 16 }}>
      <SectionCard title={`策略详情 - ${active.length} 个运行中`}>
        <StrategyManagement strategies={strategies} products={products} />
      </SectionCard>
      <aside>
        <SectionCard title="策略回测 / 评估">
          <div className="three-col">
            <div className="panel"><b>{strategies.length}</b><small className="muted">策略总数</small></div>
            <div className="panel"><b style={{ color: '#34d399' }}>{active.length}</b><small className="muted">运行中</small></div>
            <div className="panel"><b>{products.length}</b><small className="muted">商品池</small></div>
          </div>
          <Sparkline points={[55, 60, 58, 64, 62, 70, 68, 72, 75, 79]} />
          <div className="list">{[['平均有效期', `${strategies.length ? Math.round(strategies.reduce((sum, item) => sum + item.max_price_age_hours, 0) / strategies.length) : 0} 小时`], ['平均接近阈值', `${strategies.length ? (strategies.reduce((sum, item) => sum + item.near_target_pct, 0) / strategies.length).toFixed(1) : 0}%`], ['已配置强买线', String(strategies.filter((item) => item.strong_buy_price).length)]].map((item) => <div className="list-row" key={item[0]}><span>{item[0]}</span><b>{item[1]}</b></div>)}</div>
        </SectionCard>
      </aside>
    </div>
  </>
}
