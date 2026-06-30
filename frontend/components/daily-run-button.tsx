'use client'

import { useState } from 'react'

import { API_BASE } from '@/lib/api'

export function DailyRunButton() {
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState('')

  async function run() {
    setRunning(true)
    setMessage('Crawling prices and generating today report...')
    try {
      const crawlResponse = await fetch(`${API_BASE}/api/prices/crawl-all?force=true`, { method: 'POST' })
      const crawlBody = await crawlResponse.json()
      if (!crawlResponse.ok) throw new Error(crawlBody.detail ?? 'Crawl failed')

      const reportResponse = await fetch(`${API_BASE}/api/reports/generate`, { method: 'POST' })
      const reportBody = await reportResponse.json()
      if (!reportResponse.ok) throw new Error(reportBody.detail ?? 'Report generation failed')

      setMessage(`Done: ${crawlBody.run.success_count} success, ${crawlBody.run.failure_count} failed, report ${reportBody.report_date}`)
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
