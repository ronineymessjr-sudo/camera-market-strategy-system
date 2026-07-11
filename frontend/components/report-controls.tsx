'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { type BackgroundJob, operatorRequest, waitForJob } from '@/lib/operator-api'

export function ReportControls() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function generate() {
    setBusy(true)
    setMessage('')
    try {
      const queued = await operatorRequest<BackgroundJob>('/api/jobs/reports', { method: 'POST' })
      setMessage(`报告任务 #${queued.id} 已进入云端队列。`)
      await waitForJob(queued.id)
      setMessage('今日日报已重新生成。')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '报告生成失败')
    } finally {
      setBusy(false)
    }
  }
  return <div className="flex items-center gap-3">
    <button className="btn-primary" onClick={generate} disabled={busy}>{busy ? '生成中…' : '生成/刷新今日日报'}</button>
    {message && <span className="text-sm text-slate-400">{message}</span>}
  </div>
}
