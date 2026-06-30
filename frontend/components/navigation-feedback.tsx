'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

const routeNames: Record<string, string> = {
  '/': 'Command',
  '/products': 'Products',
  '/opportunities': 'Opportunities',
  '/verification': 'Verification',
  '/notifications': 'Notifications',
  '/history': 'History',
  '/reports': 'Reports',
  '/strategies': 'Strategy Lab',
  '/sources': 'Source Atlas',
}

export function RouteProgress() {
  const pathname = usePathname()
  const reduced = useReducedMotion()
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (reduced) return
    setActive(true)
    const timer = window.setTimeout(() => setActive(false), 520)
    return () => window.clearTimeout(timer)
  }, [pathname, reduced])

  if (reduced) return null

  return <motion.div
    aria-hidden="true"
    className="route-progress"
    initial={false}
    animate={active ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
    transition={{ duration: active ? .42 : .18, ease: [0.22, 1, 0.36, 1] }}
  />
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const parts = useMemo(() => pathname.split('/').filter(Boolean), [pathname])
  if (!parts.length) return null

  const crumbs = parts.map((part, index) => {
    const href = '/' + parts.slice(0, index + 1).join('/')
    return {
      href,
      label: routeNames[href] ?? decodeURIComponent(part),
      current: index === parts.length - 1,
    }
  })

  return <nav className="breadcrumbs" aria-label="Breadcrumb">
    <Link href="/">Command</Link>
    {crumbs.map((crumb) => <span key={crumb.href}>
      <i>/</i>
      {crumb.current ? <b aria-current="page">{crumb.label}</b> : <Link href={crumb.href}>{crumb.label}</Link>}
    </span>)}
  </nav>
}

export function ClickableSurface({
  href,
  children,
  className = '',
  ariaLabel,
}: {
  href: string
  children: ReactNode
  className?: string
  ariaLabel?: string
}) {
  const reduced = useReducedMotion()

  return <motion.div
    className={`clickable-surface ${className}`}
    whileHover={reduced ? undefined : { y: -3 }}
    whileTap={reduced ? undefined : { scale: .99 }}
    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
  >
    <Link href={href} className="surface-link" aria-label={ariaLabel}>
      {children}
      <span className="surface-arrow" aria-hidden="true">Open</span>
    </Link>
  </motion.div>
}
