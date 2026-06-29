'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { API_BASE } from '@/lib/api'

export function CrawlControls() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function run(force = false) {
    setBusy(true)
    setMessage('正在低频抓取，请稍候…')
    try {
      const response = await fetch(`${API_BASE}/api/prices/crawl-all?force=${force}`, { method: 'POST' })
      const text = await response.text()
      if (!response.ok) throw new Error(text)
      const data = JSON.parse(text)
      setMessage(`完成：成功 ${data.run.success_count}，失败 ${data.run.failure_count}，跳过 ${data.run.skipped_count}。`)
      router.refresh()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '运行失败')
    } finally {
      setBusy(false)
    }
  }
  return <div className="flex flex-wrap items-center gap-3">
    <button className="btn-primary" disabled={busy} onClick={() => run(false)}>运行增量抓取</button>
    <button className="btn-secondary" disabled={busy} onClick={() => run(true)}>强制抓取全部</button>
    {message && <span className="text-sm text-slate-400">{message}</span>}
  </div>
}
