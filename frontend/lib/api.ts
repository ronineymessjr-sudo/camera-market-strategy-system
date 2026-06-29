export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  ''

const SERVER_API_BASE =
  process.env.INTERNAL_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  'http://127.0.0.1:8000'

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const base = typeof window === 'undefined' ? SERVER_API_BASE : API_BASE
  const res = await fetch(`${base}${path}`, {
    cache: 'no-store',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${res.status} ${body}`)
  }
  return res.json()
}
