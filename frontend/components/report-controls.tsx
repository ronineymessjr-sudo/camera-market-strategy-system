'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { API_BASE } from '@/lib/api'

export function ReportControls() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function generate() {
    setBusy(true)
    setMessage('')
    const response = await fetch(`${API_BASE}/api/reports/generate`, { method: 'POST' })
    setBusy(false)
    if (!response.ok) {
      setMessage(await response.text())
      return
    }
    setMessage('今日日报已重新生成。')
    router.refresh()
  }
  return <div className="flex items-center gap-3">
    <button className="btn-primary" onClick={generate} disabled={busy}>{busy ? '生成中…' : '生成/刷新今日日报'}</button>
    {message && <span className="text-sm text-slate-400">{message}</span>}
  </div>
}
