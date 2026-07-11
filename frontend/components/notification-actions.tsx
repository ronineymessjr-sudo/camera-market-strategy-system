'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { operatorRequest } from '@/lib/operator-api'


export function NotificationActions({ notificationId }: { notificationId?: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function markRead() {
    setBusy(true)
    try {
      await operatorRequest(notificationId ? `/api/notifications/${notificationId}/read` : '/api/notifications/read-all', {
        method: 'POST',
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return <button className={notificationId ? 'text-btn' : 'btn'} disabled={busy} onClick={markRead}>
    {busy ? '处理中...' : notificationId ? '标记已读' : '标记全部已读'}
  </button>
}
