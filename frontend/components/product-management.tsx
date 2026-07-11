'use client'

import { useRouter } from 'next/navigation'
import { API_BASE } from '@/lib/api'
import { operatorRequest } from '@/lib/operator-api'
import type { ProductOverview, Price } from '@/lib/types'
import { StatusBadge } from './status-badge'
import { VerifyPriceForm } from './verify-price-form'

function money(value?: number | null, currency = 'CNY') {
  if (value == null) return '—'
  return `${currency} ${Number(value).toLocaleString('zh-CN')}`
}

function pct(value?: number | null) {
  if (value == null) return '—'
  return `${Number(value).toFixed(2)}%`
}

function PriceRow({ row }: { row: Price }) {
  const visible = row.checkout_price ?? row.promotion_price ?? row.list_price
  return <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="font-semibold">{money(visible, row.currency || 'CNY')}</div>
        <div className="mt-1 text-xs text-slate-400">{row.platform || 'unknown'} · {new Date(row.captured_at).toLocaleString('zh-CN')}</div>
      </div>
      <StatusBadge status={row.verification_status} />
    </div>
    <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
      <div>原始文本：{row.raw_price_text || '—'}</div>
      <div>置信度：{row.confidence_score == null ? '—' : row.confidence_score.toFixed(2)}</div>
      <div>有效至：{row.valid_until ? new Date(row.valid_until).toLocaleString('zh-CN') : '—'}</div>
      <div className="md:col-span-2 break-words">上下文：{row.raw_price_context || row.review_note || '—'}</div>
      {row.source_url && <a className="text-sky-300 hover:underline" href={row.source_url} target="_blank" rel="noreferrer">打开来源</a>}
      {row.screenshot_path && <a className="text-sky-300 hover:underline" href={`${API_BASE}${row.screenshot_path}`} target="_blank" rel="noreferrer">查看截图</a>}
    </div>
    {row.needs_review && <VerifyPriceForm price={row} />}
  </div>
}

export function ProductManagement({ rows }: { rows: ProductOverview[] }) {
  const router = useRouter()
  const activeRows = rows.filter(row => row.product.is_active)
  const archivedRows = rows.filter(row => !row.product.is_active)

  async function archive(productId: number) {
    if (!window.confirm('暂停监控并归档这个商品？历史价格不会删除。')) return
    await operatorRequest(`/api/products/${productId}`, { method: 'DELETE' })
    router.refresh()
  }

  async function restore(productId: number) {
    await operatorRequest(`/api/products/${productId}/restore`, { method: 'POST' })
    router.refresh()
  }

  return <div className="space-y-5">
    {activeRows.map(row => <section key={row.product.id} className="card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{row.product.name}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {row.product.brand || '—'} · {row.product.category || '—'} · {row.product.mount_type || '—'} · {row.product.sensor_format || '—'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-sm text-slate-400">
            <div>优先级 {row.product.priority}</div>
            <div>{row.active_listing_count} 个活跃来源</div>
          </div>
          <button className="btn-secondary" onClick={() => archive(row.product.id)}>归档</button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <Metric label="当前有效核验价" value={money(row.latest_fresh_verified?.checkout_price, row.latest_fresh_verified?.currency || 'CNY')} />
        <Metric label="最近历史核验价" value={money(row.latest_verified?.checkout_price, row.latest_verified?.currency || 'CNY')} />
        <Metric label="30日稳健波动率" value={pct(row.analytics?.volatility_pct)} />
        <Metric label="最新信号" value={row.latest_signal?.signal_type || '—'} />
      </div>
      <div className="mt-3 text-xs text-slate-500">
        30日样本 {row.analytics?.sample_count ?? 0} · 数据序列 {row.analytics?.series_type || 'NO_DATA'} · 趋势 {row.analytics?.trend || 'INSUFFICIENT_DATA'}
      </div>

      <details className="mt-5">
        <summary className="cursor-pointer text-sm font-semibold text-sky-300">查看最近价格记录 ({row.recent_prices.length})</summary>
        <div className="mt-3 space-y-3">
          {row.recent_prices.length ? row.recent_prices.map(price => <PriceRow key={price.id} row={price} />) : <p className="text-sm text-slate-500">暂无记录。</p>}
        </div>
      </details>
    </section>)}

    {archivedRows.length > 0 && <details className="card">
      <summary className="cursor-pointer font-semibold">已归档商品（{archivedRows.length}）</summary>
      <div className="mt-4 space-y-3">
        {archivedRows.map(row => <div key={row.product.id} className="flex items-center justify-between rounded-xl border border-slate-800 p-3">
          <div>
            <div className="font-medium">{row.product.name}</div>
            <div className="text-xs text-slate-500">历史数据保留，当前不爬取、不参与日报和策略。</div>
          </div>
          <button className="btn-secondary" onClick={() => restore(row.product.id)}>恢复</button>
        </div>)}
      </div>
    </details>}
  </div>
}

function Metric({ label, value }: { label: string, value: string }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
    <div className="text-xs text-slate-500">{label}</div>
    <div className="mt-2 font-semibold">{value}</div>
  </div>
}
