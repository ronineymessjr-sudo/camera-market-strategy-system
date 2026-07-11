'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function AmbientField() {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = host.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, 1, .1, 100)
    camera.position.z = 6

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    el.appendChild(renderer.domElement)

    const count = window.innerWidth < 800 ? 420 : 820
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 1.1 + Math.random() * 3.2
      const a = Math.random() * Math.PI * 2
      const arm = (i % 5) * Math.PI * .4
      positions[i * 3] = Math.cos(a + arm + r * .7) * r
      positions[i * 3 + 1] = Math.sin(a + arm + r * .7) * r * .54
      positions[i * 3 + 2] = (Math.random() - .5) * 1.5
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: .018,
      transparent: true,
      opacity: .34,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const points = new THREE.Points(geometry, material)
    scene.add(points)

    let raf = 0
    const resize = () => {
      const { width, height } = el.getBoundingClientRect()
      renderer.setSize(width, height, false)
      camera.aspect = width / Math.max(1, height)
      camera.updateProjectionMatrix()
    }
    const render = (time: number) => {
      points.rotation.z = time * .000035
      points.rotation.x = Math.sin(time * .00016) * .08
      renderer.render(scene, camera)
      raf = requestAnimationFrame(render)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(el)
    resize()
    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={host} className="ambient-field" aria-hidden="true" />
}
