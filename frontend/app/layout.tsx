import './globals.css'
import './v012-interactions.css'
import './v012-experience.css'

import { AppShell } from '@/components/app-shell'

export const metadata = {
  title: 'Camera Market Command Center',
  description: 'Verified camera-market price intelligence and strategy platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><AppShell>{children}</AppShell></body></html>
}
