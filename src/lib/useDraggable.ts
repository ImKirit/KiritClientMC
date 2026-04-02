import { useRef, useCallback, type RefObject, type MouseEvent } from 'react'

export function useDraggable(): {
  ref: RefObject<HTMLDivElement | null>
  onMouseDown: (e: MouseEvent) => void
} {
  const ref = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })
  const startOffset = useRef({ x: 0, y: 0 })

  const onMouseDown = useCallback((e: MouseEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()

    // Allow drag from header (top 50px) or edges (16px border on each side)
    const relX = e.clientX - rect.left
    const relY = e.clientY - rect.top
    const edgeThreshold = 16
    const isInHeader = relY <= 50
    const isOnEdge = relX <= edgeThreshold || relX >= rect.width - edgeThreshold ||
                     relY <= edgeThreshold || relY >= rect.height - edgeThreshold

    if (!isInHeader && !isOnEdge) return

    // Don't drag if clicking on an interactive element
    const target = e.target as HTMLElement
    if (target.closest('button, input, select, textarea, a, [role="button"]')) return

    e.preventDefault()
    isDragging.current = true

    startPos.current = { x: e.clientX, y: e.clientY }

    // Get current translate values (if any)
    const style = window.getComputedStyle(el)
    const matrix = new DOMMatrix(style.transform)
    startOffset.current = { x: matrix.m41, y: matrix.m42 }

    const onMove = (ev: globalThis.MouseEvent) => {
      const dx = ev.clientX - startPos.current.x
      const dy = ev.clientY - startPos.current.y
      el.style.transform = `translate(${startOffset.current.x + dx}px, ${startOffset.current.y + dy}px)`
    }

    const onUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  return { ref, onMouseDown }
}
