'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import type { Product } from '@/lib/types'

export function GlobalSearch() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  async function loadProducts() {
    if (loaded || loading) return
    setLoading(true)
    setLoadFailed(false)
    try {
      const response = await fetch('/api/products', { cache: 'no-store' })
      if (!response.ok) throw new Error('Product search request failed')
      setProducts(await response.json())
      setLoaded(true)
    } catch {
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }

  const normalized = query.trim().toLocaleLowerCase()
  const matches = normalized
    ? products.filter((product) => [product.name, product.brand, product.category, product.tags]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase().includes(normalized))).slice(0, 8)
    : []

  return <div className="global-search">
    <input
      ref={inputRef}
      value={query}
      onFocus={loadProducts}
      onChange={(event) => setQuery(event.target.value)}
      placeholder="搜索商品、品牌或标签…"
      aria-label="Search tracked products"
    />
    <kbd>Ctrl K</kbd>
    {normalized && <div className="search-results">
      {matches.map((product) => <Link href={`/products/${product.id}`} key={product.id} onClick={() => setQuery('')}>
        <strong>{product.name}</strong>
        <small>{[product.brand, product.category].filter(Boolean).join(' / ') || '已监控商品'}</small>
      </Link>)}
      {!matches.length && loading && <span>正在读取监控商品…</span>}
      {!matches.length && loadFailed && <button type="button" onMouseDown={event => event.preventDefault()} onClick={loadProducts}>商品列表读取失败，点击重试</button>}
      {!matches.length && loaded && <span>没有匹配“{query}”的监控商品。</span>}
    </div>}
  </div>
}
