'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { type BackgroundJob, operatorRequest, waitForJob } from '@/lib/operator-api'

export function DailyRunButton() {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState('')

  async function run() {
    setRunning(true)
    setMessage('正在抓取价格并生成今日报告…')
    try {
      const queued = await operatorRequest<BackgroundJob>('/api/jobs/daily-flow?force=false', { method: 'POST' })
      setMessage(`任务 #${queued.id} 已排队，后台工作器会继续抓取并生成报告。`)
      const completed = await waitForJob(queued.id)
      const result = JSON.parse(completed.result_json || '{}')
      setMessage(`已完成：成功 ${result.crawl?.success_count ?? 0}，失败 ${result.crawl?.failure_count ?? 0}，报告日期 ${result.report_date ?? '已生成'}`)
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '流程运行失败')
    } finally {
      setRunning(false)
    }
  }

  return <div className="daily-run">
    <button className="btn-primary" disabled={running} onClick={run}>{running ? '运行中…' : '运行今日完整流程'}</button>
    {message && <span>{message}</span>}
  </div>
}
