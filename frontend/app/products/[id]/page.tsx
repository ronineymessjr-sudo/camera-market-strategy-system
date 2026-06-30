import { ProductIntelligence } from '@/components/product-intelligence'
import { api } from '@/lib/api'
import type { Listing, Price, PriceAnalytics, Product, Signal, Strategy } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function loadProduct(id: string) {
  try {
    const productId = Number(id)
    const [product, listings, prices, analytics, signals, strategies] = await Promise.all([
      api<Product>(`/api/products/${productId}`),
      api<Listing[]>(`/api/products/${productId}/listings`),
      api<Price[]>(`/api/prices/product/${productId}?limit=240`),
      api<PriceAnalytics>(`/api/analytics/products/${productId}?window_days=180`),
      api<Signal[]>(`/api/signals/product/${productId}`),
      api<Strategy[]>('/api/strategies'),
    ])
    return {
      product,
      listings,
      prices,
      analytics,
      signals,
      strategy: strategies.find((item) => item.product_id === productId && item.is_active) ?? strategies.find((item) => item.product_id === productId) ?? null,
    }
  } catch {
    return null
  }
}

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await loadProduct(id)
  if (!data) {
    return <div className="panel empty">没有找到该商品，或后端服务暂时不可用。</div>
  }

  return <ProductIntelligence {...data} />
}
