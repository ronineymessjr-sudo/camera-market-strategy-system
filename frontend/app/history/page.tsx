import Link from 'next/link'

import { PriceChart, SectionCard, StatusPill } from '@/components/dashboard-ui'
import { HistoryExport } from '@/components/history-export'
import { api } from '@/lib/api'
import { bestPrice, money, shortDate } from '@/lib/format'
import type { Price, Signal } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function loadHistory() {
  try {
    const [prices, signals] = await Promise.all([
      api<Price[]>('/api/prices/latest?limit=500'),
      api<Signal[]>('/api/signals?limit=500'),
    ])
    return { prices, signals }
  } catch {
    return { prices: [], signals: [] }
  }
}

export default async function History({ searchParams }: { searchParams?: Promise<{ status?: string }> }) {
  const params = await searchParams ?? {}
  const status = ['all', 'verified', 'triggered', 'invalid', 'review'].includes(params.status ?? '') ? params.status! : 'all'
  const { prices, signals } = await loadHistory()
  const signalByPrice = new Map(signals.filter((signal) => signal.price_record_id).map((signal) => [signal.price_record_id, signal]))
  const filteredPrices = prices.filter((price) => {
    if (status === 'verified') return price.verification_status === 'VERIFIED_CHECKOUT'
    if (status === 'triggered') return signalByPrice.get(price.id)?.triggered === true
    if (status === 'invalid') return price.verification_status === 'INVALID'
    if (status === 'review') return price.needs_review
    return true
  })
  const pricedRows = filteredPrices.filter((price) => typeof bestPrice(price) === 'number')
  const currencyCounts = pricedRows.reduce<Record<string, number>>((counts, price) => {
    const currency = (price.currency || 'CNY').toUpperCase()
    counts[currency] = (counts[currency] ?? 0) + 1
    return counts
  }, {})
  const chartCurrency = Object.entries(currencyCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'CNY'
  const chartPoints = pricedRows
    .filter((price) => (price.currency || 'CNY').toUpperCase() === chartCurrency)
    .slice(0, 60)
    .reverse()
    .map((price) => ({
      value: bestPrice(price)!,
      label: new Date(price.captured_at).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
    }))
  const lows = [...prices]
    .filter((price) => price.verification_status === 'VERIFIED_CHECKOUT' && (price.currency || 'CNY').toUpperCase() === chartCurrency)
    .sort((a, b) => (bestPrice(a) ?? Number.MAX_SAFE_INTEGER) - (bestPrice(b) ?? Number.MAX_SAFE_INTEGER))
    .slice(0, 5)
  const tabs = [
    ['all', '全部记录'],
    ['verified', '已核验'],
    ['triggered', '策略触发'],
    ['invalid', '失效记录'],
    ['review', '待复核'],
  ]

  return <>
    <div className="page-title"><div><h1>历史记录</h1><p>查询已核验价格、历史低点与策略触发记录</p></div><HistoryExport status={status} /></div>
    <div className="two-col">
      <SectionCard title={`最近真实价格观察序列（${chartCurrency}）`}><PriceChart points={chartPoints} currency={chartCurrency} /></SectionCard>
      <SectionCard title={`历史低价摘要（${chartCurrency}）`}><div className="list">{lows.length ? lows.map((price) => <div className="list-row" key={price.id}><div><strong>{price.title || `商品 #${price.product_id}`}</strong><small>{shortDate(price.captured_at)} · {price.platform || '未知平台'}</small></div><b style={{ color: '#36d5a0' }}>{money(bestPrice(price), '暂无价格', price.currency || chartCurrency)}</b></div>) : <div className="empty">暂无已核验历史低价。</div>}</div></SectionCard>
    </div>
    <SectionCard title="历史价格记录">
      <div className="tabs">{tabs.map(([value, label]) => <Link key={value} className={`tab ${status === value ? 'active' : ''}`} href={value === 'all' ? '/history' : `/history?status=${value}`}>{label}</Link>)}</div>
      <div className="table-wrap">
        <table className="data-table"><thead><tr><th>时间</th><th>商品</th><th>平台</th><th>价格</th><th>状态</th><th>策略结果</th><th>操作</th></tr></thead><tbody>{filteredPrices.map((price) => {
          const signal = signalByPrice.get(price.id)
          return <tr key={price.id}><td>{shortDate(price.captured_at)}</td><td>{price.title || `商品 #${price.product_id}`}</td><td>{price.platform || '未知'}</td><td>{money(bestPrice(price), '暂无价格', price.currency || 'CNY')}</td><td><StatusPill tone={price.verification_status === 'VERIFIED_CHECKOUT' ? 'green' : price.verification_status === 'INVALID' ? 'red' : 'amber'}>{price.verification_status}</StatusPill></td><td><StatusPill tone={signal?.triggered ? 'amber' : 'blue'}>{signal?.signal_type || '等待'}</StatusPill></td><td>{price.source_url ? <a className="text-btn" href={price.source_url} target="_blank" rel="noreferrer">查看来源</a> : '详情'}</td></tr>
        })}</tbody></table>
      </div>
      {!filteredPrices.length && <div className="empty">当前筛选条件下暂无历史价格记录。</div>}
    </SectionCard>
  </>
}
