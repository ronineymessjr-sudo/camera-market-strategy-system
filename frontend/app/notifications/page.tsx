import { MetricCard, SectionCard, StatusPill } from '@/components/dashboard-ui'
import { NotificationActions } from '@/components/notification-actions'
import { api } from '@/lib/api'
import { shortDate } from '@/lib/format'
import type { Notification, PriceStats } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function loadNotifications() {
  try {
    const [notifications, stats] = await Promise.all([
      api<Notification[]>('/api/notifications?limit=100'),
      api<PriceStats>('/api/prices/stats'),
    ])
    return { notifications, stats }
  } catch {
    return { notifications: [] as Notification[], stats: null as PriceStats | null }
  }
}

export default async function Notifications() {
  const { notifications, stats } = await loadNotifications()
  const unread = notifications.filter(item => item.status === 'UNREAD')
  const signalAlerts = notifications.filter(item => item.type === 'SIGNAL_TRIGGERED')

  return <>
    <div className="page-title">
      <div><h1>通知中心</h1><p>这里仅展示后端真实生成并持久化的通知。</p></div>
      <NotificationActions />
    </div>
    <div className="metrics">
      <MetricCard label="全部通知" value={notifications.length} />
      <MetricCard label="未读通知" value={unread.length} tone="amber" />
      <MetricCard label="策略触发" value={signalAlerts.length} tone="green" />
      <MetricCard label="待核验价格" value={stats?.needs_review ?? 0} tone="cyan" />
    </div>
    <SectionCard title="真实通知记录">
      <div className="list">
        {notifications.length ? notifications.map(item => <div className="list-row" key={item.id}>
          <div>
            <strong>{item.title}</strong>
            <small>{item.body || item.type}</small>
            <small>{shortDate(item.created_at)}</small>
          </div>
          <div>
            <StatusPill tone={item.status === 'UNREAD' ? 'amber' : 'green'}>{item.status}</StatusPill>
            {item.status === 'UNREAD' && <NotificationActions notificationId={item.id} />}
          </div>
        </div>) : <div className="empty">暂无持久化通知。只有可信证据触发策略后才会生成提醒。</div>}
      </div>
    </SectionCard>
  </>
}
