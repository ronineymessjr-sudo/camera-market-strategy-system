'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { operatorRequest } from '@/lib/operator-api'
import type { PurchaseConfirmation } from '@/lib/types'

export function PurchaseStatusActions({ purchase }: { purchase: PurchaseConfirmation }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function update(status: 'COMPLETED' | 'CANCELLED') {
    setBusy(true)
    try {
      await operatorRequest(`/api/purchases/${purchase.id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  if (purchase.status !== 'CONFIRMED') return null
  return <div className="verify-actions">
    <button className="btn-primary" disabled={busy} type="button" onClick={() => update('COMPLETED')}>Mark bought</button>
    <button className="btn-secondary" disabled={busy} type="button" onClick={() => update('CANCELLED')}>Cancel</button>
  </div>
}
