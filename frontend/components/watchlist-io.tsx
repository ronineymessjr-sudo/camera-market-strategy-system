'use client'

import { FormEvent, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { WatchlistCommand } from '@/components/watchlist-command'
import { operatorFetch, operatorRequest } from '@/lib/operator-api'

type ImportResult = {
  created_products: number
  updated_products: number
  created_listings: number
  updated_listings: number
  created_strategies: number
  updated_strategies: number
}

const TEMPLATE = 'name,brand,category,source_url,platform,trigger_price,strong_buy_price,watch_price,priority,tags,notes\nSony A7 IV,Sony,Camera,https://example.com/product,jd,12000,11000,12500,10,full-frame,Replace this row with a real source\n'

export function WatchlistIO() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function importCsv(event: FormEvent) {
    event.preventDefault()
    if (!file) return
    setBusy(true)
    setMessage('')
    const form = new FormData()
    form.append('file', file)
    try {
      const result = await operatorRequest<ImportResult>('/api/watchlist/import.csv', { method: 'POST', body: form })
      setMessage(`Imported ${result.created_products} new and ${result.updated_products} existing products; ${result.created_listings + result.updated_listings} sources and ${result.created_strategies + result.updated_strategies} strategies synchronized.`)
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  async function downloadExport() {
    setBusy(true)
    setMessage('')
    try {
      const response = await operatorFetch('/api/watchlist/export.csv?include_archived=true')
      download(await response.blob(), 'camera-market-watchlist.csv')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  function downloadTemplate() {
    download(new Blob(['\ufeff', TEMPLATE], { type: 'text/csv;charset=utf-8' }), 'camera-market-watchlist-template.csv')
  }

  return <div className="watchlist-tools">
    <WatchlistCommand />
    <section className="card">
      <p className="eyebrow">BULK WATCHLIST</p>
      <h2>Import or export real tracking sources</h2>
      <p className="muted">CSV import updates products by exact name, deduplicates source URLs, and synchronizes price strategies in one transaction.</p>
      <form className="watchlist-import" onSubmit={importCsv}>
        <input ref={fileRef} className="input" type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <button className="btn primary" disabled={!file || busy}>{busy ? 'Working…' : 'Import CSV'}</button>
        <button className="btn" type="button" onClick={downloadExport} disabled={busy}>Export all</button>
        <button className="text-btn" type="button" onClick={downloadTemplate}>Download template</button>
      </form>
      {message && <p className="watchlist-message">{message}</p>}
    </section>
  </div>
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
