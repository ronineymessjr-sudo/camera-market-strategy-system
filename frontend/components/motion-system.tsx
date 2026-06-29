'use client'

import { MotionConfig, motion, useReducedMotion } from 'motion/react'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export function AppMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user" transition={{ duration: .42, ease: [0.22, 1, 0.36, 1] }}>
    {children}
  </MotionConfig>
}

export function RouteStage({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const reduced = useReducedMotion()
  return <motion.div
    key={pathname}
    initial={reduced ? false : { opacity: 0, y: 14, filter: 'blur(7px)' }}
    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    transition={{ duration: reduced ? 0 : .45 }}
    className="route-stage"
  >
    {children}
  </motion.div>
}

export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const reduced = useReducedMotion()
  return <motion.div
    className={className}
    initial={reduced ? false : { opacity: 0, y: 18 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-8% 0px' }}
    transition={{ duration: reduced ? 0 : .5, delay }}
  >
    {children}
  </motion.div>
}

export function Pressable({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <motion.div
    className={className}
    whileHover={{ y: -2 }}
    whileTap={{ scale: .985 }}
    transition={{ type: 'spring', stiffness: 420, damping: 30 }}
  >
    {children}
  </motion.div>
}
