'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

import { operatorRequest } from '@/lib/operator-api'
import type { Price, PurchaseConfirmation } from '@/lib/types'

export function ConfirmPurchaseForm({ price }: { price: Price }) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!confirmed) return setError('请确认由你本人手动完成下单。')
    setBusy(true)
    setError('')
    try {
      await operatorRequest<PurchaseConfirmation>('/api/purchases', {
        method: 'POST',
        body: JSON.stringify({ price_record_id: price.id, note: note || null }),
      })
      router.push('/purchases')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存购买确认失败')
    } finally {
      setBusy(false)
    }
  }

  return <details className="verify-form">
    <summary>保存购买确认</summary>
    <form onSubmit={submit} className="verify-form-grid">
      <p className="full muted">这里只记录决定和价格快照。商品页会单独打开；系统不会收集付款、地址、账户或订单信息。</p>
      <label className="full">备注
        <textarea className="input" value={note} onChange={event => setNote(event.target.value)} maxLength={2000} placeholder="购买原因、期望店铺或后续提醒" />
      </label>
      <label className="full"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> 我会在商家页面检查最终金额，并自行完成下单和付款。</label>
      {error && <p className="verify-error">{error}</p>}
      <div className="verify-actions"><button className="btn-primary" disabled={busy} type="submit">{busy ? '保存中…' : '保存购买确认'}</button></div>
    </form>
  </details>
}
