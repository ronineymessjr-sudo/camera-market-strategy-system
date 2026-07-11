'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { type BackgroundJob, operatorRequest, waitForJob } from '@/lib/operator-api'

export function CrawlControls() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function run(force = false) {
    setBusy(true)
    setMessage('正在低频抓取，请稍候…')
    try {
      const queued = await operatorRequest<BackgroundJob>(`/api/jobs/crawls?force=${force}`, { method: 'POST' })
      setMessage(`任务 #${queued.id} 已进入云端队列。`)
      const completed = await waitForJob(queued.id)
      const data = JSON.parse(completed.result_json || '{}')
      setMessage(`完成：成功 ${data.success_count ?? 0}，失败 ${data.failure_count ?? 0}，跳过 ${data.skipped_count ?? 0}。`)
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
