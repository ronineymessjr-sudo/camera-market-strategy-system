import { PriceChart, SectionCard, StatusPill } from '@/components/dashboard-ui'
import { api } from '@/lib/api'
import { bestPrice, money, shortDate } from '@/lib/format'
import type { Price, Signal } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function loadHistory() {
  try {
    const [prices, signals] = await Promise.all([
      api<Price[]>('/api/prices/latest?limit=100'),
      api<Signal[]>('/api/signals?limit=100'),
    ])
    return { prices, signals }
  } catch {
    return { prices: [], signals: [] }
  }
}

export default async function History() {
  const { prices, signals } = await loadHistory()
  const lows = [...prices]
    .filter((price) => price.verification_status === 'VERIFIED_CHECKOUT')
    .sort((a, b) => (bestPrice(a) ?? Number.MAX_SAFE_INTEGER) - (bestPrice(b) ?? Number.MAX_SAFE_INTEGER))
    .slice(0, 5)
  const signalByPrice = new Map(signals.filter((signal) => signal.price_record_id).map((signal) => [signal.price_record_id, signal]))

  return <>
    <div className="page-title"><div><h1>历史记录</h1><p>查询已核验价格、历史低点与策略触发记录</p></div><button className="btn">导出 CSV</button></div>
    <div className="two-col">
      <SectionCard title="全局历史价格趋势"><PriceChart /></SectionCard>
      <SectionCard title="历史低价摘要"><div className="list">{lows.length ? lows.map((price) => <div className="list-row" key={price.id}><div><strong>{price.title || `商品 #${price.product_id}`}</strong><small>{shortDate(price.captured_at)} · {price.platform || '未知平台'}</small></div><b style={{ color: '#36d5a0' }}>{money(bestPrice(price))}</b></div>) : <div className="empty">暂无已核验历史低价。</div>}</div></SectionCard>
    </div>
    <SectionCard title="历史价格记录">
      <div className="tabs"><button className="tab active">全部记录</button><button className="tab">已核验</button><button className="tab">策略触发</button><button className="tab">失效记录</button></div>
      <div className="table-wrap">
        <table className="data-table"><thead><tr><th>时间</th><th>商品</th><th>平台</th><th>价格</th><th>状态</th><th>策略结果</th><th>操作</th></tr></thead><tbody>{prices.map((price) => {
          const signal = signalByPrice.get(price.id)
          return <tr key={price.id}><td>{shortDate(price.captured_at)}</td><td>{price.title || `商品 #${price.product_id}`}</td><td>{price.platform || '未知'}</td><td>{money(bestPrice(price))}</td><td><StatusPill tone={price.verification_status === 'VERIFIED_CHECKOUT' ? 'green' : price.verification_status === 'INVALID' ? 'red' : 'amber'}>{price.verification_status}</StatusPill></td><td><StatusPill tone={signal?.triggered ? 'amber' : 'blue'}>{signal?.signal_type || '等待'}</StatusPill></td><td>{price.source_url ? <a className="text-btn" href={price.source_url} target="_blank" rel="noreferrer">查看来源</a> : '详情'}</td></tr>
        })}</tbody></table>
      </div>
      {!prices.length && <div className="empty">暂无历史价格记录。</div>}
    </SectionCard>
  </>
}
