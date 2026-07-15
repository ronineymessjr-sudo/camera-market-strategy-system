'use client'

import { useState } from 'react'

import { operatorFetch } from '@/lib/operator-api'

export function HistoryExport({ status = 'all' }: { status?: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function download() {
    setBusy(true)
    setError('')
    try {
      const response = await operatorFetch(`/api/prices/export.csv?status=${encodeURIComponent(status)}`)
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = `price-history-${status}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (value) {
      setError(value instanceof Error ? value.message : '价格历史导出失败')
    } finally {
      setBusy(false)
    }
  }

  return <div className="inline-action"><button className="btn" onClick={download} disabled={busy}>{busy ? '正在导出…' : '导出 CSV'}</button>{error && <small>{error}</small>}</div>
}
