import { useEffect, useRef, useState, useCallback } from 'react'

interface SkinRendererProps {
  skinData: string
  slim?: boolean
  height?: number
  className?: string
}

type SkinSide = 'front' | 'right' | 'back' | 'left'

// Skin texture regions: [sx, sy, sw, sh] for each body part per side
function getRegions(slim: boolean, side: SkinSide, isLegacy: boolean) {
  const armW = slim ? 3 : 4

  // Front/Back/Left/Right regions from the skin texture
  // Format: { base: [sx,sy,sw,sh], overlay?: [sx,sy,sw,sh] }
  const regions: Record<string, { base: number[]; overlay?: number[]; mirror?: boolean }> = {}

  if (side === 'front') {
    regions.head = { base: [8, 8, 8, 8], overlay: isLegacy ? undefined : [40, 8, 8, 8] }
    regions.body = { base: [20, 20, 8, 12], overlay: isLegacy ? undefined : [20, 36, 8, 12] }
    regions.rightArm = { base: [44, 20, armW, 12], overlay: isLegacy ? undefined : [44, 36, armW, 12] }
    regions.leftArm = isLegacy
      ? { base: [44, 20, armW, 12], mirror: true }
      : { base: [36, 52, armW, 12], overlay: [52, 52, armW, 12] }
    regions.rightLeg = { base: [4, 20, 4, 12], overlay: isLegacy ? undefined : [4, 36, 4, 12] }
    regions.leftLeg = isLegacy
      ? { base: [4, 20, 4, 12], mirror: true }
      : { base: [20, 52, 4, 12], overlay: [4, 52, 4, 12] }
  } else if (side === 'back') {
    regions.head = { base: [24, 8, 8, 8], overlay: isLegacy ? undefined : [56, 8, 8, 8] }
    regions.body = { base: [32, 20, 8, 12], overlay: isLegacy ? undefined : [32, 36, 8, 12] }
    regions.rightArm = { base: [48 + armW, 20, armW, 12], overlay: isLegacy ? undefined : [48 + armW, 36, armW, 12] }
    regions.leftArm = isLegacy
      ? { base: [48 + armW, 20, armW, 12], mirror: true }
      : { base: [40 + armW, 52, armW, 12], overlay: [56 + armW, 52, armW, 12] }
    regions.rightLeg = { base: [12, 20, 4, 12], overlay: isLegacy ? undefined : [12, 36, 4, 12] }
    regions.leftLeg = isLegacy
      ? { base: [12, 20, 4, 12], mirror: true }
      : { base: [28, 52, 4, 12], overlay: [12, 52, 4, 12] }
  } else if (side === 'right') {
    regions.head = { base: [0, 8, 8, 8], overlay: isLegacy ? undefined : [32, 8, 8, 8] }
    regions.body = { base: [16, 20, 4, 12], overlay: isLegacy ? undefined : [16, 36, 4, 12] }
    regions.rightArm = { base: [40, 20, 4, 12], overlay: isLegacy ? undefined : [40, 36, 4, 12] }
    regions.rightLeg = { base: [0, 20, 4, 12], overlay: isLegacy ? undefined : [0, 36, 4, 12] }
  } else { // left
    regions.head = { base: [16, 8, 8, 8], overlay: isLegacy ? undefined : [48, 8, 8, 8] }
    regions.body = { base: [28, 20, 4, 12], overlay: isLegacy ? undefined : [28, 36, 4, 12] }
    regions.leftArm = isLegacy
      ? { base: [40, 20, 4, 12], mirror: true }
      : { base: [32, 52, 4, 12], overlay: [48, 52, 4, 12] }
    regions.leftLeg = isLegacy
      ? { base: [0, 20, 4, 12], mirror: true }
      : { base: [24, 52, 4, 12], overlay: [8, 52, 4, 12] }
  }

  return regions
}

function renderSide(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  slim: boolean,
  side: SkinSide,
) {
  const armW = slim ? 3 : 4
  const isLegacy = img.height === 32
  const isSide = side === 'left' || side === 'right'
  const charW = isSide ? 8 : armW + 8 + armW
  const charH = 32

  ctx.canvas.width = charW
  ctx.canvas.height = charH
  ctx.clearRect(0, 0, charW, charH)
  ctx.imageSmoothingEnabled = false

  const regions = getRegions(slim, side, isLegacy)

  const draw = (r: number[], dx: number, dy: number, mirror?: boolean) => {
    if (mirror) {
      ctx.save()
      ctx.translate(dx + r[2], dy)
      ctx.scale(-1, 1)
      ctx.drawImage(img, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3])
      ctx.restore()
    } else {
      ctx.drawImage(img, r[0], r[1], r[2], r[3], dx, dy, r[2], r[3])
    }
  }

  if (isSide) {
    // Side view: head(8) + body(4) + leg(4), stacked, centered at 8px width
    const headX = 0
    if (regions.head) {
      draw(regions.head.base, headX, 0, regions.head.mirror)
      if (regions.head.overlay) draw(regions.head.overlay, headX, 0)
    }
    const bodyX = 2 // center 4px body in 8px width
    if (regions.body) {
      draw(regions.body.base, bodyX, 8, regions.body.mirror)
      if (regions.body.overlay) draw(regions.body.overlay, bodyX, 8)
    }
    // Arm (visible arm on this side)
    const armKey = side === 'right' ? 'rightArm' : 'leftArm'
    if (regions[armKey]) {
      draw(regions[armKey].base, 2, 8, regions[armKey].mirror)
      if (regions[armKey].overlay) draw(regions[armKey].overlay, 2, 8)
    }
    // Leg
    const legKey = side === 'right' ? 'rightLeg' : 'leftLeg'
    if (regions[legKey]) {
      draw(regions[legKey].base, 2, 20, regions[legKey].mirror)
      if (regions[legKey].overlay) draw(regions[legKey].overlay, 2, 20)
    }
  } else {
    // Front/Back: full character
    const headX = (charW - 8) / 2
    if (regions.head) {
      draw(regions.head.base, headX, 0, regions.head.mirror)
      if (regions.head.overlay) draw(regions.head.overlay, headX, 0)
    }
    if (regions.body) {
      draw(regions.body.base, armW, 8, regions.body.mirror)
      if (regions.body.overlay) draw(regions.body.overlay, armW, 8)
    }
    if (regions.rightArm) {
      draw(regions.rightArm.base, 0, 8, regions.rightArm.mirror)
      if (regions.rightArm.overlay) draw(regions.rightArm.overlay, 0, 8)
    }
    if (regions.leftArm) {
      draw(regions.leftArm.base, armW + 8, 8, regions.leftArm.mirror)
      if (regions.leftArm.overlay) draw(regions.leftArm.overlay, armW + 8, 8)
    }
    if (regions.rightLeg) {
      draw(regions.rightLeg.base, armW, 20, regions.rightLeg.mirror)
      if (regions.rightLeg.overlay) draw(regions.rightLeg.overlay, armW, 20)
    }
    if (regions.leftLeg) {
      draw(regions.leftLeg.base, armW + 4, 20, regions.leftLeg.mirror)
      if (regions.leftLeg.overlay) draw(regions.leftLeg.overlay, armW + 4, 20)
    }
  }
}

const SIDES: SkinSide[] = ['front', 'right', 'back', 'left']

export function SkinRenderer({ skinData, slim = false, height = 200, className }: SkinRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [sideIndex, setSideIndex] = useState(0)
  const dragRef = useRef<{ startX: number; startIndex: number } | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  // Load image
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      renderCurrent(img, SIDES[sideIndex])
    }
    img.src = skinData
  }, [skinData, slim])

  // Re-render when side changes
  useEffect(() => {
    if (imgRef.current) {
      renderCurrent(imgRef.current, SIDES[sideIndex])
    }
  }, [sideIndex, slim])

  const renderCurrent = (img: HTMLImageElement, side: SkinSide) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    renderSide(ctx, img, slim, side)
  }

  // Mouse drag rotation
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startIndex: sideIndex }
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const dx = ev.clientX - dragRef.current.startX
      const steps = Math.round(dx / 40) // 40px per side
      const newIndex = ((dragRef.current.startIndex + steps) % 4 + 4) % 4
      setSideIndex(newIndex)
    }
    const onUp = () => {
      dragRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [sideIndex])

  // Size
  const armW = slim ? 3 : 4
  const isSide = SIDES[sideIndex] === 'left' || SIDES[sideIndex] === 'right'
  const charW = isSide ? 8 : armW + 8 + armW
  const charH = 32
  const scale = height / charH
  const displayW = Math.round(charW * scale)

  return (
    <div
      className={className}
      style={{ cursor: 'grab', userSelect: 'none', display: 'inline-block' }}
      onMouseDown={onMouseDown}
      title="Drag to rotate"
    >
      <canvas
        ref={canvasRef}
        style={{
          width: displayW,
          height,
          imageRendering: 'pixelated',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
