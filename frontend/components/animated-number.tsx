'use client'

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'

export function AnimatedNumber({ value }: { value: number }) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(reduced ? value : 0)
  const previous = useRef(0)

  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      previous.current = value
      return
    }
    const start = performance.now()
    const from = previous.current
    const duration = 650
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
      else previous.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, reduced])

  return <>{display.toLocaleString('zh-CN')}</>
}
