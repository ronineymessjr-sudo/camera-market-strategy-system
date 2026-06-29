import { MetricCard, SectionCard, StatusPill } from '@/components/dashboard-ui'
import { api } from '@/lib/api'
import { bestPrice, money, shortDate } from '@/lib/format'
import type { Price, Report, Signal } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function loadNotifications() {
  try {
    const [signals, queue, reports] = await Promise.all([
      api<Signal[]>('/api/signals?limit=50'),
      api<Price[]>('/api/prices/review-queue?limit=50'),
      api<Report[]>('/api/reports/daily'),
    ])
    return { signals, queue, reports }
  } catch {
    return { signals: [], queue: [], reports: [] }
  }
}

export default async function Notifications() {
  const { signals, queue, reports } = await loadNotifications()
  const triggered = signals.filter((signal) => signal.triggered)
  const messages = [
    ...triggered.slice(0, 8).map((signal) => ({
      id: `signal-${signal.id}`,
      title: `商品 #${signal.product_id}`,
      body: signal.message || signal.reason_code || '策略触发',
      type: '策略触发',
      date: signal.created_at,
    })),
    ...queue.slice(0, 8).map((price) => ({
      id: `price-${price.id}`,
      title: price.title || `商品 #${price.product_id}`,
      body: `${price.platform || '未知平台'} 待核验 ${money(bestPrice(price))}`,
      type: '需验证',
      date: price.captured_at,
    })),
    ...reports.slice(0, 4).map((report) => ({
      id: `report-${report.id}`,
      title: report.title,
      body: report.summary || '日报已生成',
      type: '报告完成',
      date: report.created_at,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return <>
    <div className="page-title"><div><h1>通知中心</h1><p>策略触发、价格下跌、核验待办与日报更新</p></div><button className="btn">标记全部已读</button></div>
    <div className="metrics">
      <MetricCard label="全部通知" value={messages.length} />
      <MetricCard label="未处理待办" value={queue.length + triggered.length} />
      <MetricCard label="价格提醒" value={triggered.length} tone="green" />
      <MetricCard label="需处理事项" value={queue.length} tone="amber" />
    </div>
    <div className="two-col">
      <SectionCard title="按类型分组"><div className="list">{[['策略触发提醒', String(triggered.length), '⚡'], ['需验证提醒', String(queue.length), '✓'], ['报告完成提醒', String(reports.length), '▤']].map((item) => <div className="list-row" key={item[0]}><div><strong>{item[2]}　{item[0]}</strong><small>点击查看对应消息</small></div><b>{item[1]} ›</b></div>)}</div></SectionCard>
      <SectionCard title="提醒记录"><div className="list">{messages.length ? messages.slice(0, 16).map((item) => <div className="list-row" key={item.id}><div><strong>{item.title}</strong><small>{item.body}</small><small>{shortDate(item.date)}</small></div><div><StatusPill tone={item.type === '策略触发' ? 'blue' : item.type === '需验证' ? 'amber' : 'green'}>{item.type}</StatusPill><small>未读</small></div></div>) : <div className="empty">暂无通知。运行完整流程后会按真实信号生成提醒。</div>}</div></SectionCard>
    </div>
    <SectionCard title="通知设置">
      <div className="three-col"><div className="panel"><strong>应用内通知</strong><p className="muted">当前页面内展示实时提醒</p><div className="toggle" /></div><div className="panel"><strong>邮件通知</strong><p className="muted">待配置 SMTP 后启用</p><div className="toggle off" /></div><div className="panel"><strong>Webhook 推送</strong><p className="muted">待配置目标 URL 后启用</p><div className="toggle off" /></div></div>
    </SectionCard>
  </>
}
