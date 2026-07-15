'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { AppMotion, RouteStage } from '@/components/motion-system'
import { Breadcrumbs, RouteProgress } from '@/components/navigation-feedback'
import { GlobalSearch } from '@/components/global-search'
import { RuntimeStatus } from '@/components/runtime-status'

const nav = [
  ['Command', '/', '01'],
  ['Products', '/products', '02'],
  ['Opportunities', '/opportunities', '03'],
  ['Verification', '/verification', '04'],
  ['Notifications', '/notifications', '05'],
  ['History', '/history', '06'],
  ['Reports', '/reports', '07'],
  ['Strategy Lab', '/strategies', '08'],
  ['Source Atlas', '/sources', '09'],
  ['Settings', '/settings', '10'],
]

const mobileNav = [
  ['Command', '/', '01'],
  ['Deals', '/opportunities', '03'],
  ['Verify', '/verification', '04'],
  ['Sources', '/sources', '09'],
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  return <AppMotion><div className="app-frame">
    <RouteProgress />
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-mark">CM</span><div><strong>Camera Market</strong><small>verified price intelligence</small></div></Link>
      <nav className="side-nav">
        {nav.map(([label, href, icon]) => <Link key={href} href={href} className={`side-link ${path === href || (href !== '/' && path.startsWith(href)) ? 'active' : ''}`}><span>{icon}</span>{label}</Link>)}
      </nav>
      <div className="sidebar-foot"><div className="health-dot" /><div><strong>Human review required</strong><small>the system never buys automatically</small></div></div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <GlobalSearch />
        <div className="top-actions"><Link href="/sources">Sources</Link><Link href="/history">30d history</Link><RuntimeStatus /><div className="avatar">YM</div></div>
      </header>
      <main className="content"><Breadcrumbs /><RouteStage>{children}</RouteStage></main>
      <nav className="mobile-tabbar" aria-label="Primary mobile navigation">
        {mobileNav.map(([label, href, icon]) => <Link key={href} href={href} className={path === href || (href !== '/' && path.startsWith(href)) ? 'active' : ''}>
          <span>{icon}</span>
          <b>{label}</b>
        </Link>)}
      </nav>
    </div>
  </div></AppMotion>
}
