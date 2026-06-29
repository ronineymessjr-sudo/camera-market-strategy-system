'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { API_BASE } from '@/lib/api'
import type { Price } from '@/lib/types'

export function VerifyPriceForm({ price }: { price: Price }) {
  const router = useRouter()
  const [checkoutPrice, setCheckoutPrice] = useState(String(price.promotion_price ?? price.list_price ?? ''))
  const [currency, setCurrency] = useState(price.currency || 'CNY')
  const [region, setRegion] = useState(price.region || 'CN')
  const [note, setNote] = useState('人工核验结算页/订单截图')
  const [couponText, setCouponText] = useState(price.coupon_text || '')
  const [validForHours, setValidForHours] = useState('24')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function verify(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/prices/${price.id}/verify-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkout_price: Number(checkoutPrice),
          note,
          currency,
          region,
          coupon_text: couponText || null,
          verified_by: 'ronin',
          valid_for_hours: Number(validForHours),
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '核验失败')
    } finally {
      setBusy(false)
    }
  }

  async function invalidate() {
    const reason = window.prompt('请输入该线索无效的原因：', '错误价格、规格数字或非目标商品')
    if (!reason) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/prices/${price.id}/invalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: reason }),
      })
      if (!res.ok) throw new Error(await res.text())
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '标记失败')
    } finally {
      setBusy(false)
    }
  }

  return <details className="mt-3 rounded-xl border border-slate-700 bg-slate-950/50 p-3">
    <summary className="cursor-pointer text-sm font-medium text-sky-300">人工核验这条线索</summary>
    <form onSubmit={verify} className="mt-4 grid gap-3 md:grid-cols-2">
      <label className="text-sm">最终到手价
        <input className="input mt-1" type="number" min="0.01" step="0.01" required value={checkoutPrice} onChange={e => setCheckoutPrice(e.target.value)} />
      </label>
      <label className="text-sm">币种
        <input className="input mt-1" value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} />
      </label>
      <label className="text-sm">地区
        <input className="input mt-1" value={region} onChange={e => setRegion(e.target.value)} />
      </label>
      <label className="text-sm">优惠构成
        <input className="input mt-1" value={couponText} onChange={e => setCouponText(e.target.value)} placeholder="88VIP、淘金币、店铺券、运费…" />
      </label>
      <label className="text-sm">价格有效时长（小时）
        <input className="input mt-1" type="number" min="1" max="720" value={validForHours} onChange={e => setValidForHours(e.target.value)} />
      </label>
      <label className="text-sm md:col-span-2">核验备注（必填）
        <textarea className="input mt-1 min-h-20" required minLength={2} value={note} onChange={e => setNote(e.target.value)} />
      </label>
      {error && <p className="text-sm text-rose-300 md:col-span-2">{error}</p>}
      <div className="flex gap-3 md:col-span-2">
        <button disabled={busy} className="btn-primary" type="submit">{busy ? '处理中…' : '核验为到手价'}</button>
        <button disabled={busy} className="btn-secondary" type="button" onClick={invalidate}>标记为无效线索</button>
      </div>
    </form>
  </details>
}
