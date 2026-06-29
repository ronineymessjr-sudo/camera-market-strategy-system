import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000'
  return ['', '/products', '/strategies', '/reports'].map(path => ({ url: `${base}${path}`, lastModified: new Date() }))
}
