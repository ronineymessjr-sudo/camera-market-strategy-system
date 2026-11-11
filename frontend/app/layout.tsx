import './globals.css'
import './v012-interactions.css'
import './v012-experience.css'
import './v016-console.css'

import { AppShell } from '@/components/app-shell'

export const metadata = {
  title: '影价追踪 · 价格决策台',
  description: '摄像器材价格追踪、人工核验与策略决策工作台',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body><AppShell>{children}</AppShell></body></html>
}
