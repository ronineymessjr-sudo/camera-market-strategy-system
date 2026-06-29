import './globals.css'
import './v012-interactions.css'
import { AppShell } from '@/components/app-shell'

export const metadata = { title: '影价追踪', description: '摄影数码价格追踪与策略平台' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body><AppShell>{children}</AppShell></body></html>
}
