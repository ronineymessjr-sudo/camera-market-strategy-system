'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

import { operatorRequest } from '@/lib/operator-api'
import type { Price } from '@/lib/types'

type EvidenceUpload = {
  id: number
  object_path: string
  evidence_hash: string
}

export function VerifyPriceForm({ price }: { price: Price }) {
  const router = useRouter()
  const [checkoutPrice, setCheckoutPrice] = useState(String(price.promotion_price ?? price.list_price ?? ''))
  const [currency, setCurrency] = useState(price.currency || 'CNY')
  const [region, setRegion] = useState(price.region || 'CN')
  const [note, setNote] = useState('Manual checkout verification from order page or cart page.')
  const [couponText, setCouponText] = useState(price.coupon_text || '')
  const [evidenceType, setEvidenceType] = useState('CHECKOUT')
  const [evidenceNote, setEvidenceNote] = useState('Checkout/cart page reviewed manually.')
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [validForHours, setValidForHours] = useState('24')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function verify(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (!evidenceFile) throw new Error('Upload a checkout, cart, or order screenshot/PDF first.')
      const uploadBody = new FormData()
      uploadBody.set('file', evidenceFile)
      const upload = await operatorRequest<EvidenceUpload>('/api/evidence/upload', {
        method: 'POST',
        body: uploadBody,
      })
      await operatorRequest(`/api/prices/${price.id}/verify-checkout`, {
        method: 'POST',
        body: JSON.stringify({
          checkout_price: Number(checkoutPrice),
          note,
          currency,
          region,
          coupon_text: couponText || null,
          valid_for_hours: Number(validForHours),
          evidence: [{
            upload_id: upload.id,
            evidence_type: evidenceType,
            source_url: price.source_url || null,
            seller_name: price.seller_name || null,
            region,
            captured_at: new Date().toISOString(),
            note: evidenceNote,
          }],
          adjustments: couponText ? [{
            adjustment_type: 'COUPON',
            label: couponText,
            amount: 0,
            currency,
          }] : [],
        }),
      })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed')
    } finally {
      setBusy(false)
    }
  }

  async function invalidate() {
    const reason = window.prompt('Why is this clue invalid?', 'Wrong product, wrong spec, fake discount, or unavailable checkout price.')
    if (!reason) return
    setBusy(true)
    setError('')
    try {
      await operatorRequest(`/api/prices/${price.id}/invalidate`, {
        method: 'POST',
        body: JSON.stringify({ note: reason }),
      })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalidation failed')
    } finally {
      setBusy(false)
    }
  }

  return <details className="verify-form">
    <summary>Verify this clue manually</summary>
    <form onSubmit={verify} className="verify-form-grid">
      <label>Final checkout price
        <input className="input" type="number" min="0.01" step="0.01" required value={checkoutPrice} onChange={e => setCheckoutPrice(e.target.value)} />
      </label>
      <label>Currency
        <input className="input" value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} />
      </label>
      <label>Region
        <input className="input" value={region} onChange={e => setRegion(e.target.value)} />
      </label>
      <label>Coupon context
        <input className="input" value={couponText} onChange={e => setCouponText(e.target.value)} placeholder="Membership, coupon, store credit, shipping discount" />
      </label>
      <label>Valid for hours
        <input className="input" type="number" min="1" max="720" value={validForHours} onChange={e => setValidForHours(e.target.value)} />
      </label>
      <label>Evidence type
        <select className="input" value={evidenceType} onChange={e => setEvidenceType(e.target.value)}>
          <option value="CHECKOUT">Checkout page</option>
          <option value="CART">Cart page</option>
          <option value="ORDER">Order page</option>
        </select>
      </label>
      <label className="full">Checkout evidence file
        <input className="input" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setEvidenceFile(e.target.files?.[0] || null)} />
        <small>The server stores this in private Supabase Storage and computes the evidence hash.</small>
      </label>
      <label className="full">Verification note
        <textarea className="input" required minLength={2} value={note} onChange={e => setNote(e.target.value)} />
      </label>
      <label className="full">Evidence note
        <textarea className="input" required minLength={2} value={evidenceNote} onChange={e => setEvidenceNote(e.target.value)} />
      </label>
      {error && <p className="verify-error">{error}</p>}
      <div className="verify-actions">
        <button disabled={busy} className="btn-primary" type="submit">{busy ? 'Processing...' : 'Promote to VERIFIED_CHECKOUT'}</button>
        <button disabled={busy} className="btn-secondary" type="button" onClick={invalidate}>Mark clue invalid</button>
      </div>
    </form>
  </details>
}
