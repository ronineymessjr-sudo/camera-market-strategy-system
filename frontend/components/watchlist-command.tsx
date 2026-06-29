'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { API_BASE } from '@/lib/api'

export function WatchlistCommand() {
  const router = useRouter()
  const [command, setCommand] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!command.trim()) return
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(`${API_BASE}/api/watchlist/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.detail || JSON.stringify(body))
      setMessage(body.message)
      setCommand('')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }

  return <section className="card">
    <div>
      <p className="eyebrow">Dynamic watchlist</p>
      <h2 className="mt-2 text-xl font-bold">一句话增删商品池</h2>
      <p className="mt-2 text-sm text-slate-400">例：添加 Sigma 17-40 F1.8 触发价4500 强买价4300 https://…；或“移除 DJI Pocket 3”。</p>
    </div>
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3 md:flex-row">
      <input className="input flex-1" value={command} onChange={event => setCommand(event.target.value)} placeholder="添加/移除/暂停/恢复 商品名，可附链接和价格策略" />
      <button className="btn-primary" disabled={busy}>{busy ? '执行中…' : '执行'}</button>
    </form>
    {message && <p className="mt-3 text-sm text-slate-300">{message}</p>}
  </section>
}
