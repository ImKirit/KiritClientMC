import { useEffect, useRef, useCallback, type ReactNode, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  children: ReactNode
  onClose?: () => void
  className?: string
}

export function Modal({ children, onClose, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })
  const startOffset = useRef({ x: 0, y: 0 })

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Draggable from header area (top 56px) or edges (12px border)
  const onMouseDown = useCallback((e: MouseEvent) => {
    const el = contentRef.current
    if (!el) return

    // Don't drag if clicking interactive elements
    const target = e.target as HTMLElement
    if (target.closest('button, input, select, textarea, a, [role="button"], label')) return

    const rect = el.getBoundingClientRect()
    const relX = e.clientX - rect.left
    const relY = e.clientY - rect.top
    const edge = 12

    const isInHeader = relY <= 56
    const isOnEdge = relX <= edge || relX >= rect.width - edge ||
                     relY <= edge || relY >= rect.height - edge

    if (!isInHeader && !isOnEdge) return

    e.preventDefault()
    isDragging.current = true
    startPos.current = { x: e.clientX, y: e.clientY }

    const style = window.getComputedStyle(el)
    const matrix = new DOMMatrix(style.transform)
    startOffset.current = { x: matrix.m41, y: matrix.m42 }

    const onMove = (ev: globalThis.MouseEvent) => {
      if (!isDragging.current) return
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

  const handleOverlayClick = (e: MouseEvent) => {
    if (e.target === overlayRef.current && onClose) {
      onClose()
    }
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={handleOverlayClick}
    >
      <div
        ref={contentRef}
        className={`modal-content ${className || ''}`}
        onMouseDown={onMouseDown}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}
