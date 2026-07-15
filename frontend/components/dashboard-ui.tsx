'use client'

import Link from 'next/link'
import { useId, type ReactNode } from 'react'

import { Pressable, Reveal } from '@/components/motion-system'

export function MetricCard({ label, value, note, tone = 'blue', icon = '00' }: { label:string; value:ReactNode; note?:string; tone?:string; icon?:string }) {
  return <Reveal><Pressable className={`metric-card tone-${tone}`}>
    <span className="metric-index">{icon}</span>
    <div><span className="metric-label">{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>
    <span className="metric-icon">{icon}</span>
  </Pressable></Reveal>
}

export function SectionCard({ title, action, children, className='' }: { title:string; action?:string; children:ReactNode; className?:string }) {
  return <Reveal className={className}><section className="panel"><div className="panel-head"><h2>{title}</h2>{action && (action.startsWith('/') ? <Link className="text-btn" href={action}>打开 →</Link> : <span className="panel-meta">{action}</span>)}</div>{children}</section></Reveal>
}

export function Sparkline({ points, color='var(--blue)' }: { points:number[]; color?:string }) {
  const values = points.filter(Number.isFinite)
  if (values.length < 2) return <span className="muted">数据不足</span>
  const max=Math.max(...values), min=Math.min(...values); const w=220,h=54; const coords=values.map((p,i)=>`${(i/(values.length-1))*w},${h-((p-min)/(max-min||1))*h}`).join(' ')
  return <svg viewBox={`0 0 ${w} ${h}`} className="spark"><polyline fill="none" stroke={color} strokeWidth="3" points={coords}/></svg>
}

export type PriceChartPoint = { value:number; label?:string }

export function PriceChart({ points, compact=false, currency='CNY' }: { points:PriceChartPoint[]; compact?:boolean; currency?:string }) {
  const gradientId = useId().replace(/:/g, '')
  const values = points.filter((point) => Number.isFinite(point.value))
  if (values.length < 2) return <div className="empty">至少需要两条真实价格记录才能绘制趋势。</div>

  const max = Math.max(...values.map((point) => point.value))
  const min = Math.min(...values.map((point) => point.value))
  const range = max - min || 1
  const width = 760
  const top = 20
  const bottom = 240
  const coords = values.map((point, index) => ({
    ...point,
    x: (index / (values.length - 1)) * width,
    y: top + ((max - point.value) / range) * (bottom - top),
  }))
  const line = coords.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')
  const area = `${line} L${width},${bottom} L0,${bottom} Z`
  const labelIndexes = [...new Set([0, Math.floor((values.length - 1) / 2), values.length - 1])]
  const priceLabel = (value: number) => `${currency === 'CNY' ? '¥' : `${currency} `}${Math.round(value).toLocaleString('zh-CN')}`

  return <div className={`price-chart ${compact?'compact':''}`}>
    <div className="chart-y"><span>{priceLabel(max)}</span><span>{priceLabel((max + min) / 2)}</span><span>{priceLabel(min)}</span></div>
    <svg viewBox="0 0 760 260" preserveAspectRatio="none">
      <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b82f6" stopOpacity=".35"/><stop offset="1" stopColor="#3b82f6" stopOpacity="0"/></linearGradient></defs>
      {[30,85,140,195,250].map(y=><line key={y} x1="0" y1={y} x2="760" y2={y} stroke="#213044" strokeDasharray="4 6"/>)}
      <path d={area} fill={`url(#${gradientId})`}/>
      <path d={line} fill="none" stroke="#4ea1ff" strokeWidth="4" vectorEffect="non-scaling-stroke"/>
      <circle cx={coords.at(-1)?.x} cy={coords.at(-1)?.y} r="6" fill="#60a5fa"/>
    </svg>
    <div className="chart-x">{labelIndexes.map((index) => <span key={index}>{values[index].label ?? `#${index + 1}`}</span>)}</div>
  </div>
}

export function StatusPill({ children, tone='blue' }: { children:ReactNode; tone?:string }) { return <span className={`status-pill ${tone}`}>{children}</span> }

export function TrustBadge({ state }: { state:'verified'|'visible'|'unverified'|'stale' }) {
  const labels = {
    verified: '已核验到手价',
    visible: '仅网页可见价',
    unverified: '未核验证据',
    stale: '数据已过期',
  }
  return <span className={`trust-badge ${state}`}>{labels[state]}</span>
}

