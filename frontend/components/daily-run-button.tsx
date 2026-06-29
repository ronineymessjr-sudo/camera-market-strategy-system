'use client'

import { useState } from 'react'

import { API_BASE } from '@/lib/api'

export function DailyRunButton() {
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState('')

  async function run() {
    setRunning(true)
    setMessage('正在抓取价格并生成日报…')
    try {
      const crawlResponse = await fetch(`${API_BASE}/api/prices/crawl-all?force=true`, { method: 'POST' })
      const crawlBody = await crawlResponse.json()
      if (!crawlResponse.ok) throw new Error(crawlBody.detail ?? '抓取失败')

      const reportResponse = await fetch(`${API_BASE}/api/reports/generate`, { method: 'POST' })
      const reportBody = await reportResponse.json()
      if (!reportResponse.ok) throw new Error(reportBody.detail ?? '日报生成失败')

      setMessage(`完成：成功 ${crawlBody.run.success_count}，失败 ${crawlBody.run.failure_count}，日报 ${reportBody.report_date}`)
      window.location.reload()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '运行失败')
    } finally {
      setRunning(false)
    }
  }

  return <div className="flex flex-wrap items-center gap-3">
    <button className="btn-primary" disabled={running} onClick={run}>{running ? '运行中…' : '运行今日完整流程'}</button>
    {message && <span className="text-sm text-slate-400">{message}</span>}
  </div>
}
