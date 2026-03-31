import { useRef, useCallback, type RefObject, type MouseEvent } from 'react'

export function useDraggable(): {
  ref: RefObject<HTMLDivElement | null>
  onMouseDown: (e: MouseEvent) => void
} {
  const ref = useRef<HTMLDivElement>(null)
  const offset = useRef({ x: 0, y: 0 })

  const onMouseDown = useCallback((e: MouseEvent) => {
    // Only drag from the header area (first 50px) or if target is the modal itself
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (e.clientY - rect.top > 50) return

    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }

    const onMove = (ev: globalThis.MouseEvent) => {
      const x = ev.clientX - offset.current.x
      const y = ev.clientY - offset.current.y
      el.style.left = `${x}px`
      el.style.top = `${y}px`
      el.style.transform = 'none'
    }

    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  return { ref, onMouseDown }
}
