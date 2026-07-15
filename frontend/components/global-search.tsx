'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import type { Product } from '@/lib/types'

export function GlobalSearch() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loaded, setLoaded] = useState(false)

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
    if (loaded) return
    setLoaded(true)
    try {
      const response = await fetch('/api/products', { cache: 'no-store' })
      if (response.ok) setProducts(await response.json())
    } catch {
      setProducts([])
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
      placeholder="Search real products, brands, or tags…"
      aria-label="Search tracked products"
    />
    <kbd>Ctrl K</kbd>
    {normalized && <div className="search-results">
      {matches.map((product) => <Link href={`/products/${product.id}`} key={product.id} onClick={() => setQuery('')}>
        <strong>{product.name}</strong>
        <small>{[product.brand, product.category].filter(Boolean).join(' / ') || 'Tracked product'}</small>
      </Link>)}
      {!matches.length && <span>No tracked product matches “{query}”.</span>}
    </div>}
  </div>
}
