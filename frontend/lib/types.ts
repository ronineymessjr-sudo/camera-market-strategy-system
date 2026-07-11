export type Product = {
  id: number
  name: string
  brand?: string | null
  category?: string | null
  mount_type?: string | null
  sensor_format?: string | null
  priority: number
  tags?: string | null
  notes?: string | null
  is_active: boolean
  archived_at?: string | null
  created_at: string
}

export type Listing = {
  id: number
  product_id: number
  platform: string
  seller_name?: string | null
  seller_type?: string | null
  url: string
  sku_id?: string | null
  is_active: boolean
  created_at: string
}

export type Price = {
  id: number
  product_id: number
  listing_id?: number | null
  platform?: string | null
  seller_name?: string | null
  title?: string | null
  list_price?: number | null
  promotion_price?: number | null
  checkout_price?: number | null
  coupon_text?: string | null
  shipping_fee?: number | null
  stock_status?: string | null
  verification_status: string
  source_url?: string | null
  screenshot_path?: string | null
  raw_price_text?: string | null
  raw_price_context?: string | null
  currency?: string | null
  region?: string | null
  confidence_score?: number | null
  extraction_method?: string | null
  needs_review: boolean
  screenshot_hash?: string | null
  review_note?: string | null
  verified_at?: string | null
  valid_until?: string | null
  verified_by?: string | null
  captured_at: string
}

export type Signal = {
  id: number
  product_id: number
  strategy_id?: number | null
  price_record_id?: number | null
  signal_type: string
  reason_code?: string | null
  message?: string | null
  triggered: boolean
  is_current: boolean
  created_at: string
}

export type PriceAnalytics = {
  product_id: number
  window_days: number
  series_type: string
  currency?: string | null
  sample_count: number
  is_sufficient: boolean
  latest_price?: number | null
  min_price?: number | null
  max_price?: number | null
  median_price?: number | null
  mean_price?: number | null
  range_pct?: number | null
  volatility_pct?: number | null
  change_pct?: number | null
  latest_percentile?: number | null
  anomaly_score?: number | null
  trend: string
  updated_at?: string | null
}

export type ProductOverview = {
  product: Product
  latest_any?: Price | null
  latest_verified?: Price | null
  latest_fresh_verified?: Price | null
  latest_clue?: Price | null
  latest_signal?: Signal | null
  recent_prices: Price[]
  active_listing_count: number
  analytics?: PriceAnalytics | null
}

export type Strategy = {
  id: number
  user_name: string
  product_id: number
  strategy_name: string
  trigger_price?: number | null
  strong_buy_price?: number | null
  watch_price?: number | null
  currency: string
  mode: string
  max_price_age_hours: number
  near_target_pct: number
  notes?: string | null
  is_active: boolean
  created_at: string
}

export type SelectionCandidate = {
  product: Product
  strategy?: Strategy | null
  latest_verified?: Price | null
  latest_clue?: Price | null
  analytics: PriceAnalytics
  score: number
  status: string
  is_buy_signal: boolean
  reasons: string[]
}

export type FlowRun = {
  id: number
  run_type: string
  status: string
  started_at: string
  finished_at?: string | null
  duration_seconds?: number | null
  total_count: number
  success_count: number
  failure_count: number
  skipped_count: number
  details_json?: string | null
  log_path?: string | null
}

export type Report = {
  id: number
  title: string
  summary?: string | null
  markdown_content: string
  chart_path?: string | null
  report_date: string
  created_at: string
  updated_at?: string | null
}

export type PriceStats = {
  total: number
  verified_checkout: number
  visible_price: number
  unverified: number
  invalid: number
  needs_review: number
}

export type ProviderStatus = {
  provider: string
  display_name: string
  configured: boolean
  mode: string
}

export type SourceHealth = {
  provider: string
  configured: boolean
  mode: string
  status: string
  last_checked_at?: string | null
  last_success_at?: string | null
  last_error?: string | null
  success_count: number
  failure_count: number
  success_rate: number
  average_latency_ms?: number | null
  stale: boolean
}

export type IntegrationRun = {
  id: number
  provider: string
  keyword?: string | null
  status: string
  request_id?: string | null
  started_at: string
  finished_at?: string | null
  offer_count: number
  ingested_count: number
  error_message?: string | null
  request_json?: string | null
  response_summary_json?: string | null
}

export type FrontendBootstrap = {
  generated_at: string
  providers: ProviderStatus[]
  source_health: SourceHealth[]
  notifications: Notification[]
  price_stats: PriceStats
  latest_run?: FlowRun | null
  integration_runs: IntegrationRun[]
  selection_candidates: SelectionCandidate[]
  products: ProductOverview[]
}

export type Notification = {
  id: number
  product_id?: number | null
  signal_id?: number | null
  type: string
  title: string
  body?: string | null
  status: string
  created_at: string
  read_at?: string | null
}

export type ReviewPage = {
  items: Price[]
  total: number
  page: number
  page_size: number
  status_counts: Record<string, number>
  platforms: string[]
}
