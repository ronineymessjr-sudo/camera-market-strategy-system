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
    if (!confirmed) return setError('Confirm that you will complete the order manually.')
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
      setError(cause instanceof Error ? cause.message : 'Purchase confirmation failed')
    } finally {
      setBusy(false)
    }
  }

  return <details className="verify-form">
    <summary>Confirm manual purchase</summary>
    <form onSubmit={submit} className="verify-form-grid">
      <p className="full muted">This saves a decision and price snapshot only. The source page opens separately; no payment, address, account, or order details are collected.</p>
      <label className="full">Decision note
        <textarea className="input" value={note} onChange={event => setNote(event.target.value)} maxLength={2000} placeholder="Reason, preferred seller, or follow-up reminder" />
      </label>
      <label className="full"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> I will review the final order and pay directly on the seller website.</label>
      {error && <p className="verify-error">{error}</p>}
      <div className="verify-actions"><button className="btn-primary" disabled={busy} type="submit">{busy ? 'Saving...' : 'Save purchase confirmation'}</button></div>
    </form>
  </details>
}
