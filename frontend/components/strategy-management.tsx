'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { operatorRequest } from '@/lib/operator-api'
import type { Product, Strategy } from '@/lib/types'

export function StrategyManagement({ strategies, products }: { strategies: Strategy[], products: Product[] }) {
  const router = useRouter()
  const productMap = new Map(products.map(product => [product.id, product.name]))
  return <div className="space-y-4">
    {strategies.map(strategy => <StrategyEditor key={strategy.id} strategy={strategy} productName={productMap.get(strategy.product_id) || `#${strategy.product_id}`} onSaved={() => router.refresh()} />)}
  </div>
}

function StrategyEditor({ strategy, productName, onSaved }: { strategy: Strategy, productName: string, onSaved: () => void }) {
  const [trigger, setTrigger] = useState(strategy.trigger_price == null ? '' : String(strategy.trigger_price))
  const [strong, setStrong] = useState(strategy.strong_buy_price == null ? '' : String(strategy.strong_buy_price))
  const [active, setActive] = useState(strategy.is_active)
  const [notes, setNotes] = useState(strategy.notes || '')
  const [maxAge, setMaxAge] = useState(String(strategy.max_price_age_hours || 24))
  const [nearTargetPct, setNearTargetPct] = useState(String(strategy.near_target_pct ?? 5))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function save(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const payload = {
      trigger_price: trigger === '' ? null : Number(trigger),
      strong_buy_price: strong === '' ? null : Number(strong),
      max_price_age_hours: Number(maxAge),
      near_target_pct: Number(nearTargetPct),
      is_active: active,
      notes,
    }
    try {
      await operatorRequest(`/api/strategies/${strategy.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      setMessage('已保存，并按价格时效重新计算信号。')
      onSaved()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  return <form onSubmit={save} className="card grid gap-4 md:grid-cols-2">
    <div className="md:col-span-2">
      <div className="text-lg font-bold">{strategy.strategy_name}</div>
      <div className="text-sm text-slate-400">{productName} · {strategy.mode}</div>
    </div>
    <label className="text-sm">触发线
      <input className="input mt-1" type="number" step="0.01" value={trigger} onChange={e => setTrigger(e.target.value)} />
    </label>
    <label className="text-sm">强买线
      <input className="input mt-1" type="number" step="0.01" value={strong} onChange={e => setStrong(e.target.value)} />
    </label>
    <label className="text-sm">已核验价格最大有效期（小时）
      <input className="input mt-1" type="number" min="1" max="720" value={maxAge} onChange={e => setMaxAge(e.target.value)} />
    </label>
    <label className="text-sm">接近目标阈值（%）
      <input className="input mt-1" type="number" min="0" max="100" step="0.1" value={nearTargetPct} onChange={e => setNearTargetPct(e.target.value)} />
    </label>
    <label className="text-sm md:col-span-2">策略备注
      <textarea className="input mt-1 min-h-20" value={notes} onChange={e => setNotes(e.target.value)} />
    </label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />启用策略</label>
    <div className="flex items-center justify-end gap-3">
      {message && <span className="text-xs text-slate-400">{message}</span>}
      <button className="btn-primary" disabled={busy}>{busy ? '保存中…' : '保存'}</button>
    </div>
  </form>
}
