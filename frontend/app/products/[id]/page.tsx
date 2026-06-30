import { PriceStory } from '@/components/experience-modules'
import { SectionCard, StatusPill } from '@/components/dashboard-ui'
import { api } from '@/lib/api'
import type { Listing, Price, PriceAnalytics, Product, Signal, Strategy } from '@/lib/types'

export const dynamic = 'force-dynamic'

function cash(value?: number | null, fallback = 'No price') {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return `CNY ${Math.round(value).toLocaleString('en-US')}`
}

function best(price?: Price | null) {
  return price?.checkout_price ?? price?.promotion_price ?? price?.list_price ?? null
}

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
    return <div className="panel empty">Product not found, or the backend is not available.</div>
  }

  const verified = data.prices.filter((price) => price.verification_status === 'VERIFIED_CHECKOUT')
  const clues = data.prices.filter((price) => price.needs_review)

  return <>
    <div className="page-title">
      <div>
        <span className="eyebrow">PRICE STORY</span>
        <h1>{data.product.name}</h1>
        <p>{[data.product.brand, data.product.category, data.product.mount_type, data.product.sensor_format].filter(Boolean).join(' / ') || 'Tracked camera-market product'}</p>
      </div>
    </div>

    <PriceStory product={data.product} prices={data.prices} analytics={data.analytics} signals={data.signals} strategy={data.strategy} />

    <div className="three-col" style={{ marginTop: 16 }}>
      <SectionCard title="Trust state">
        <div className="list">
          <div className="list-row"><span>Verified checkout records</span><b>{verified.length}</b></div>
          <div className="list-row"><span>Review clues</span><b>{clues.length}</b></div>
          <div className="list-row"><span>Active source links</span><b>{data.listings.filter((item) => item.is_active).length}</b></div>
        </div>
      </SectionCard>
      <SectionCard title="Strategy target">
        <div className="list">
          <div className="list-row"><span>Watch price</span><b>{cash(data.strategy?.watch_price)}</b></div>
          <div className="list-row"><span>Trigger price</span><b>{cash(data.strategy?.trigger_price)}</b></div>
          <div className="list-row"><span>Strong-buy price</span><b>{cash(data.strategy?.strong_buy_price)}</b></div>
        </div>
      </SectionCard>
      <SectionCard title="Analytics window">
        <div className="list">
          <div className="list-row"><span>Trend</span><b>{data.analytics.trend}</b></div>
          <div className="list-row"><span>Samples</span><b>{data.analytics.sample_count}</b></div>
          <div className="list-row"><span>Volatility</span><b>{typeof data.analytics.volatility_pct === 'number' ? `${data.analytics.volatility_pct.toFixed(1)}%` : 'n/a'}</b></div>
        </div>
      </SectionCard>
    </div>

    <SectionCard title="Evidence ledger" className="ledger-panel">
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Captured</th><th>Source</th><th>Seller / title</th><th>Best price</th><th>Trust</th><th>Action</th></tr></thead>
          <tbody>{data.prices.slice(0, 40).map((price) => <tr key={price.id}>
            <td>{new Date(price.captured_at).toLocaleString('en-US', { hour12: false })}</td>
            <td>{price.platform || 'Unknown'}</td>
            <td>{price.seller_name || price.title || data.product.name}</td>
            <td>{cash(best(price))}</td>
            <td><StatusPill tone={price.verification_status === 'VERIFIED_CHECKOUT' ? 'green' : price.verification_status === 'INVALID' ? 'red' : 'amber'}>{price.verification_status}</StatusPill></td>
            <td>{price.source_url ? <a className="text-btn" href={price.source_url} target="_blank" rel="noreferrer">Open source</a> : 'Local record'}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </SectionCard>
  </>
}
