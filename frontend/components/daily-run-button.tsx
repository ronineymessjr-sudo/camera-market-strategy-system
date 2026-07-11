'use client'

import { useState } from 'react'

import { type BackgroundJob, operatorRequest, waitForJob } from '@/lib/operator-api'

export function DailyRunButton() {
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState('')

  async function run() {
    setRunning(true)
    setMessage('Crawling prices and generating today report...')
    try {
      const queued = await operatorRequest<BackgroundJob>('/api/jobs/daily-flow?force=true', { method: 'POST' })
      setMessage(`Job #${queued.id} queued. Crawling and report generation continue in the cloud worker...`)
      const completed = await waitForJob(queued.id)
      const result = JSON.parse(completed.result_json || '{}')
      setMessage(`Done: ${result.crawl?.success_count ?? 0} success, ${result.crawl?.failure_count ?? 0} failed, report ${result.report_date ?? 'ready'}`)
      window.location.reload()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Run failed')
    } finally {
      setRunning(false)
    }
  }

  return <div className="daily-run">
    <button className="btn-primary" disabled={running} onClick={run}>{running ? 'Running...' : 'Run daily flow'}</button>
    {message && <span>{message}</span>}
  </div>
}
