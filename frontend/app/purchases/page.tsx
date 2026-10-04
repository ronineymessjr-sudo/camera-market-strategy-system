import { headers } from 'next/headers'

import { PurchaseStatusActions } from '@/components/purchase-status-actions'
import { SectionCard, StatusPill } from '@/components/dashboard-ui'
import { api } from '@/lib/api'
import { dateTimeLabel } from '@/lib/format'
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
  let loadFailed = false
  try {
    const requestHeaders = await headers()
    const accessAssertion = requestHeaders.get('cf-access-jwt-assertion')
    purchases = await api<PurchaseConfirmation[]>('/api/purchases', {
      headers: accessAssertion ? { 'cf-access-jwt-assertion': accessAssertion } : {},
    })
  } catch {
    loadFailed = true
  }

  return <>
    <div className="page-title"><div><span className="eyebrow">MANUAL PURCHASES</span><h1>购买确认记录</h1><p>只保存购买决定和已核验价格。下单与付款始终由你在商家页面手动完成。</p></div></div>
    <SectionCard title={loadFailed ? '记录读取失败' : `${purchases.length} 条购买记录`}>
      {!loadFailed && <div className="table-wrap"><table className="data-table"><thead><tr><th>确认时间</th><th>商品</th><th>核验快照</th><th>状态</th><th>来源</th><th>操作</th></tr></thead><tbody>
        {purchases.map(purchase => <tr key={purchase.id}>
          <td>{dateTimeLabel(purchase.confirmed_at)}</td>
          <td><strong>{purchase.product_name}</strong>{purchase.note && <small className="muted">{purchase.note}</small>}</td>
          <td>{money(purchase.checkout_price, purchase.currency)}</td>
          <td><StatusPill tone={purchase.status === 'COMPLETED' ? 'green' : purchase.status === 'CANCELLED' ? 'red' : 'amber'}>{purchase.status}</StatusPill></td>
          <td>{purchase.source_url ? <a className="text-btn" href={purchase.source_url} target="_blank" rel="noreferrer">打开商品页</a> : '无商品链接'}</td>
          <td><PurchaseStatusActions purchase={purchase} /></td>
        </tr>)}
      </tbody></table></div>}
      {loadFailed ? <div className="empty">购买记录暂时无法读取。请确认接口连接状态后重新加载。</div> : !purchases.length && <div className="empty">还没有购买确认记录。先核验当前结算价，再到商品详情页保存购买决定。</div>}
    </SectionCard>
  </>
}
