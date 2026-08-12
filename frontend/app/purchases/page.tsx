import { headers } from 'next/headers'

import { PurchaseStatusActions } from '@/components/purchase-status-actions'
import { SectionCard, StatusPill } from '@/components/dashboard-ui'
import { api } from '@/lib/api'
import type { PurchaseConfirmation } from '@/lib/types'

export const dynamic = 'force-dynamic'

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(currency === 'CNY' ? 'zh-CN' : 'en-US', { style: 'currency', currency }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

export default async function Purchases() {
  let purchases: PurchaseConfirmation[] = []
  try {
    const requestHeaders = await headers()
    const accessAssertion = requestHeaders.get('cf-access-jwt-assertion')
    purchases = await api<PurchaseConfirmation[]>('/api/purchases', {
      headers: accessAssertion ? { 'cf-access-jwt-assertion': accessAssertion } : {},
    })
  } catch {
    purchases = []
  }

  return <>
    <div className="page-title"><div><span className="eyebrow">MANUAL PURCHASES</span><h1>Purchase confirmations</h1><p>Decisions and verified price snapshots. Payments and orders always happen on the seller website.</p></div></div>
    <SectionCard title={`${purchases.length} saved decisions`}>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Confirmed</th><th>Product</th><th>Snapshot</th><th>Status</th><th>Source</th><th>Action</th></tr></thead><tbody>
        {purchases.map(purchase => <tr key={purchase.id}>
          <td>{new Date(purchase.confirmed_at).toLocaleString('en-US', { hour12: false })}</td>
          <td><strong>{purchase.product_name}</strong>{purchase.note && <small className="muted">{purchase.note}</small>}</td>
          <td>{money(purchase.checkout_price, purchase.currency)}</td>
          <td><StatusPill tone={purchase.status === 'COMPLETED' ? 'green' : purchase.status === 'CANCELLED' ? 'red' : 'amber'}>{purchase.status}</StatusPill></td>
          <td>{purchase.source_url ? <a className="text-btn" href={purchase.source_url} target="_blank" rel="noreferrer">Open source</a> : 'No source URL'}</td>
          <td><PurchaseStatusActions purchase={purchase} /></td>
        </tr>)}
      </tbody></table></div>
      {!purchases.length && <div className="empty">No purchase confirmation yet. Verify a current checkout price, then save the decision from its product page.</div>}
    </SectionCard>
  </>
}
