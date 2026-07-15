'use client'

import { useEffect, useState } from 'react'

type ReadyState = 'checking' | 'ready' | 'degraded' | 'offline'

export function RuntimeStatus() {
  const [state, setState] = useState<ReadyState>('checking')

  useEffect(() => {
    let active = true
    async function check() {
      try {
        const response = await fetch('/api/system/ready', { cache: 'no-store' })
        const body = response.ok ? await response.json() : null
        if (active) setState(body?.status === 'ready' ? 'ready' : 'degraded')
      } catch {
        if (active) setState('offline')
      }
    }
    check()
    const timer = window.setInterval(check, 30_000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  const label = state === 'ready' ? 'API ready' : state === 'checking' ? 'Checking API' : state === 'degraded' ? 'API degraded' : 'API offline'
  return <span className={`live runtime-${state}`} title="Live backend readiness check"><i />{label}</span>
}
