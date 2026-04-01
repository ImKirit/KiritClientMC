import { useEffect, useRef } from 'react'

export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = glowRef.current
    if (!el) return

    const onMove = (e: MouseEvent) => {
      el.style.setProperty('--glow-x', `${e.clientX}px`)
      el.style.setProperty('--glow-y', `${e.clientY}px`)
      el.style.opacity = '1'
    }

    const onLeave = () => {
      el.style.opacity = '0'
    }

    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return <div ref={glowRef} className="cursor-glow" />
}
