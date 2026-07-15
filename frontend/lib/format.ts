export function money(value?: number | null, fallback = '暂无价格', currency = 'CNY') {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback
  const normalized = currency.toUpperCase()
  try {
    return new Intl.NumberFormat(normalized === 'CNY' ? 'zh-CN' : 'en-US', {
      style: 'currency',
      currency: normalized,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${normalized} ${Math.round(value).toLocaleString('en-US')}`
  }
}

export function bestPrice(price?: {
  checkout_price?: number | null
  promotion_price?: number | null
  list_price?: number | null
} | null) {
  if (!price) return null
  return price.checkout_price ?? price.promotion_price ?? price.list_price ?? null
}

export function percent(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '暂无'
  return `${value.toFixed(digits)}%`
}

export function confidence(value?: number | null) {
  if (value === null || value === undefined) return '待核验'
  return `${Math.round(value * 100)}%`
}

export function shortDate(value?: string | null) {
  if (!value) return '暂无'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '暂无'
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ageLabel(value?: string | null) {
  if (!value) return '暂无更新'
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  if (Number.isNaN(diffMs)) return '暂无更新'
  const minutes = Math.max(0, Math.round(diffMs / 60000))
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.round(hours / 24)} 天前`
}
