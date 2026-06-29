const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export type ProviderStatus = {
  provider: "jd" | "taobao" | "pdd" | string;
  display_name: string;
  configured: boolean;
  mode: string;
};

export type IntegrationSearchRequest = {
  keyword: string;
  product_id?: number;
  page?: number;
  page_size?: number;
  sort?: string;
  min_price?: number;
  max_price?: number;
  ingest?: boolean;
};

export type QuantIndicators = {
  product_id: number;
  window_days: number;
  currency: string;
  series_type: string;
  sample_count: number;
  latest_price?: number;
  sma_short?: number;
  sma_long?: number;
  ema_short?: number;
  ema_long?: number;
  rsi_14?: number;
  bollinger_mid?: number;
  bollinger_upper?: number;
  bollinger_lower?: number;
  z_score?: number;
  max_drawdown_pct?: number;
  downside_deviation_pct?: number;
  price_percentile?: number;
  market_regime: string;
  risk_level: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${body}`);
  }
  return response.json() as Promise<T>;
}

export const apiV04 = {
  bootstrap: () => request<unknown>("/api/frontend/bootstrap"),
  providers: () => request<ProviderStatus[]>("/api/integrations/providers"),
  syncProvider: (provider: string, payload: IntegrationSearchRequest) =>
    request<unknown>(`/api/integrations/${provider}/sync`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  offers: (query = "") => request<unknown[]>(`/api/integrations/offers${query ? `?${query}` : ""}`),
  indicators: (productId: number, windowDays = 180) =>
    request<QuantIndicators>(`/api/quant/products/${productId}/indicators?window_days=${windowDays}`),
  backtest: (payload: Record<string, unknown>) =>
    request<unknown>("/api/quant/backtests", { method: "POST", body: JSON.stringify(payload) }),
};
