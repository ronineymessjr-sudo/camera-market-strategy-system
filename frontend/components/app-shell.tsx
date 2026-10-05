'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { AppMotion, RouteStage } from '@/components/motion-system'
import { Breadcrumbs, RouteProgress } from '@/components/navigation-feedback'
import { GlobalSearch } from '@/components/global-search'
import { RuntimeStatus } from '@/components/runtime-status'

const navGroups = [
  {
    label: '工作台',
    items: [
      ['总览', '/', '01'],
      ['监控商品', '/products', '02'],
      ['机会雷达', '/opportunities', '03'],
    ],
  },
  {
    label: '验证与执行',
    items: [
      ['价格核验', '/verification', '04'],
      ['购买确认', '/purchases', '05'],
      ['通知收件箱', '/notifications', '06'],
    ],
  },
  {
    label: '复盘与系统',
    items: [
      ['历史记录', '/history', '07'],
      ['报告中心', '/reports', '08'],
      ['策略实验室', '/strategies', '09'],
      ['数据源', '/sources', '10'],
      ['连接器', '/connectors', '11'],
      ['设置', '/settings', '12'],
    ],
  },
]

const mobileNav = [
  ['总览', '/', '01'],
  ['机会', '/opportunities', '03'],
  ['核验', '/verification', '04'],
  ['数据源', '/sources', '10'],
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isActive = (href: string) => path === href || (href !== '/' && path.startsWith(href))
  const mobileMenuActive = !mobileNav.some(([, href]) => isActive(href))
  return <AppMotion><div className="app-frame">
    <RouteProgress />
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-mark">影</span><div><strong>影价追踪</strong><small>camera price intelligence</small></div></Link>
      <div className="sidebar-context"><span className="context-dot" />私有运营工作台</div>
      <nav className="side-nav">
        {navGroups.map((group) => <div className="nav-group" key={group.label}>
          <span className="nav-group-label">{group.label}</span>
          {group.items.map(([label, href, icon]) => <Link key={href} href={href} title={label} aria-label={label} className={`side-link ${isActive(href) ? 'active' : ''}`}><span>{icon}</span><b>{label}</b>{isActive(href) && <i aria-hidden="true" />}</Link>)}
        </div>)}
      </nav>
      <div className="sidebar-foot"><div className="health-dot" /><div><strong>人工核验门槛已启用</strong><small>系统不会自动下单或支付</small></div></div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <div className="topbar-context"><span>PRICE INTELLIGENCE</span><i /> <small>只读线索 / 人工确认后执行</small></div>
        <GlobalSearch />
        <div className="top-actions"><Link className="topbar-action" href="/verification">去核验</Link><RuntimeStatus /><div className="avatar">YM</div></div>
      </header>
      <main className="content"><Breadcrumbs /><RouteStage>{children}</RouteStage></main>
      {mobileMenuOpen && <button type="button" className="mobile-menu-backdrop" aria-label="关闭导航菜单" onClick={() => setMobileMenuOpen(false)} />}
      {mobileMenuOpen && <nav id="mobile-menu" className="mobile-menu" aria-label="全部页面">
        {navGroups.map((group) => <section key={group.label}><strong>{group.label}</strong>{group.items.map(([label, href, icon]) => <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)} className={isActive(href) ? 'active' : ''}><span>{icon}</span>{label}</Link>)}</section>)}
      </nav>}
      <nav className="mobile-tabbar" aria-label="Primary mobile navigation">
        {mobileNav.map(([label, href, icon]) => <Link key={href} href={href} className={path === href || (href !== '/' && path.startsWith(href)) ? 'active' : ''}>
          <span>{icon}</span>
          <b>{label}</b>
        </Link>)}
        <button type="button" aria-expanded={mobileMenuOpen} aria-controls="mobile-menu" className={mobileMenuOpen || mobileMenuActive ? 'active' : ''} onClick={() => setMobileMenuOpen(open => !open)}><span>•••</span><b>全部</b></button>
      </nav>
    </div>
  </div></AppMotion>
}
