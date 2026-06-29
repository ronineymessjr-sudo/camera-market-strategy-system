'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  ['概览','/','⌂'],['监控商品','/products','▣'],['机会发现','/opportunities','✦'],['线索核验','/verification','✓'],['价格提醒','/notifications','♢'],['历史记录','/history','◴'],['日报中心','/reports','▤'],['策略管理','/strategies','⌁'],['平台与数据源','/sources','◉'],
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  return <div className="app-frame">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">◉</span><div><strong>影价追踪</strong><small>摄影器材价格追踪助手</small></div></div>
      <nav className="side-nav">
        {nav.map(([label,href,icon]) => <Link key={href} href={href} className={`side-link ${path===href || (href!=='/' && path.startsWith(href)) ? 'active':''}`}><span>{icon}</span>{label}</Link>)}
      </nav>
      <div className="sidebar-foot"><div className="health-dot"/><div><strong>本地流程可用</strong><small>数据以接口实时结果为准</small></div></div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <div className="searchbox">⌕ <span>搜索商品型号、品牌、平台...</span><kbd>⌘ K</kbd></div>
        <div className="top-actions"><button>全部平台⌄</button><button>最近30天⌄</button><span className="live"><i/>连接后端</span><button className="icon-btn">◔</button><div className="avatar">YM</div></div>
      </header>
      <main className="content">{children}</main>
    </div>
  </div>
}
