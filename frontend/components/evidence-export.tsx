'use client'

import { useState } from 'react'

import { operatorFetch } from '@/lib/operator-api'

export function EvidenceExport() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function download() {
    setBusy(true)
    setError('')
    try {
      const response = await operatorFetch('/api/evidence/export.csv?trusted_only=true')
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = 'verified-price-evidence.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Evidence export failed')
    } finally {
      setBusy(false)
    }
  }

  return <div className="inline-action"><button className="btn" onClick={download} disabled={busy}>{busy ? 'Exporting…' : 'Export verified evidence'}</button>{error && <small>{error}</small>}</div>
}
