import React, { useCallback, useMemo, useRef, useState } from 'react'
import type { ProjectElement, ElementGeometry } from '@/types'
import { autoLayout, computeBoundingBox, elementColor } from '@/lib/planLayout'
import { ELEMENT_TYPE_LABELS } from '@/lib/elements'

// ===== PlanView2D =====
//
// Pure-SVG top-down plan viewer for a project's elements.
// - Reads real geometry when present (design editor).
// - Falls back to tiled auto-layout when geometry is null.
// - Edit mode (Sprint 3a/c/d): drag to move, corner handles to resize,
//   top handle to rotate. Rotation is applied around the element's visual
//   center so resize feels natural in any orientation.
// - No three.js, no heavy deps. Responsive via viewBox + preserveAspectRatio.
//
// Used on both the contractor-side ProjectDashboard and the public
// /share/:token viewer. Same component, same data shape.

const PADDING_FT = 6 // feet of breathing room around the bbox
const SCALE_BAR_FT = 10 // draw a "10 ft" scale bar in the corner
const ROT_HANDLE_OFFSET_FT = 3 // rotation handle sits this many feet above top edge
const MIN_SIZE_FT = 2 // don't let resize shrink below this

interface Props {
  elements: ProjectElement[]
  /** Height of the viewer in CSS pixels. Width is always 100% of parent. */
  height?: number
  /** Label overlay style. Full shows the element name; compact just uses a numbered badge. */
  labelMode?: 'full' | 'compact' | 'none'
  /** Called when a user clicks an element. Viewer-side, omit; editor will wire this. */
  onElementClick?: (element: ProjectElement) => void
  /**
   * Optional property coordinates. When present AND VITE_MAPBOX_TOKEN is set,
   * renders a Mapbox satellite backdrop behind the plan.
   */
  backdrop?: { lat: number; lng: number } | null
  /**
   * Sprint 3: enables drag-to-move + resize corners + rotate handle.
   * Client viewer omits this (defaults to false) so /share/:token stays read-only.
   */
  editable?: boolean
  /**
   * Fires once per drag when the user releases. Parent is responsible for
   * persisting the new geometry (typically via
   * projectStore.updateElement(id, { geometry: newGeometry })).
   */
  onElementGeometryChange?: (elementId: string, geometry: ElementGeometry) => void
}

/** Snap feet to the nearest integer — keeps dragged elements on 1-ft grid. */
function snapFt(v: number): number {
  return Math.round(v)
}

/** Snap rotation to 15-degree increments. */
function snapDeg(v: number): number {
  return Math.round(v / 15) * 15
}

/** Zoom level for the satellite backdrop. 19 ≈ residential-lot close view. */
const BACKDROP_ZOOM = 19

function buildMapboxStaticUrl(lat: number, lng: number): string | null {
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
  if (!token) return null
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},${BACKDROP_ZOOM},0/1200x800@2x?access_token=${token}&attribution=false&logo=false`
}

/** Rotate (dx, dy) by `deg` around origin. Math convention: +y down. */
function rotate2d(dx: number, dy: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  return { x: dx * c - dy * s, y: dx * s + dy * c }
}

/**
 * Visual center of an element in world-space feet. For rectangles the center
 * is (position + size/2) regardless of rotation because rotation pivots there.
 */
function elementCenter(geometry: ElementGeometry): { x: number; y: number } {
  const { position, shape } = geometry
  if (shape.kind === 'rectangle') {
    return { x: position.x + shape.width / 2, y: position.y + shape.height / 2 }
  }
  if (shape.kind === 'circle') {
    return { x: position.x + shape.radius, y: position.y + shape.radius }
  }
  if (shape.kind === 'line') {
    return { x: position.x + shape.length / 2, y: position.y + 0.5 }
  }
  // polygon fallback: bbox center
  const xs = shape.points.map((p) => p.x)
  const ys = shape.points.map((p) => p.y)
  return {
    x: position.x + (Math.min(...xs) + Math.max(...xs)) / 2,
    y: position.y + (Math.min(...ys) + Math.max(...ys)) / 2,
  }
}

/**
 * Transform string for an element's <g>. Applies rotation around the
 * element's visual center, then translates to position. Equivalent to:
 *   (translate to center) · (rotate) · (translate back to top-left of unrotated box)
 */
function elementTransform(geometry: ElementGeometry): string {
  const { position, rotation } = geometry
  const c = elementCenter(geometry)
  return `rotate(${rotation} ${c.x} ${c.y}) translate(${position.x} ${position.y})`
}

type Corner = 'nw' | 'ne' | 'se' | 'sw'

type DragState =
  | {
      mode: 'move'
      elementId: string
      // Cursor offset from element top-left at drag start (in feet, local = world here for axis-aligned delta)
      offsetFt: { x: number; y: number }
      // Live element origin during drag
      currentPosition: { x: number; y: number }
      baseGeometry: ElementGeometry
    }
  | {
      mode: 'resize'
      elementId: string
      corner: Corner
      // World position of the anchor (opposite) corner at drag start — stays fixed
      anchorWorld: { x: number; y: number }
      rotation: number
      live: ElementGeometry
    }
  | {
      mode: 'rotate'
      elementId: string
      centerWorld: { x: number; y: number }
      startCursorAngleDeg: number
      startRotationDeg: number
      baseGeometry: ElementGeometry
      live: ElementGeometry
    }

export const PlanView2D: React.FC<Props> = ({
  elements,
  height = 480,
  labelMode = 'full',
  onElementClick,
  backdrop,
  editable = false,
  onElementGeometryChange,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const [, setDragTick] = useState(0)

  const baseLaid = useMemo(() => autoLayout(elements), [elements])

  // Overlay the live-drag geometry (if any) on top of the base layout.
  const laid = useMemo(() => {
    const d = dragRef.current
    if (!d) return baseLaid
    return baseLaid.map((item) => {
      if (item.element.id !== d.elementId) return item
      if (d.mode === 'move') {
        return {
          ...item,
          geometry: {
            ...item.geometry,
            position: { x: d.currentPosition.x, y: d.currentPosition.y },
          } as ElementGeometry,
        }
      }
      return { ...item, geometry: d.live }
    })
  }, [baseLaid])

  const bbox = useMemo(() => computeBoundingBox(laid), [laid])
  const backdropUrl = useMemo(
    () => (backdrop ? buildMapboxStaticUrl(backdrop.lat, backdrop.lng) : null),
    [backdrop],
  )

  const viewMinX = bbox.minX - PADDING_FT
  const viewMinY = bbox.minY - PADDING_FT
  const viewWidth = bbox.maxX - bbox.minX + PADDING_FT * 2
  const viewHeight = bbox.maxY - bbox.minY + PADDING_FT * 2

  const ftPerPx = viewWidth / 700
  const labelFontSizeFt = Math.max(ftPerPx * 11, 0.8)
  const handleRadiusFt = Math.max(ftPerPx * 6, 0.5)

  const isEmpty = elements.length === 0

  // Convert a clientX/clientY from a pointer event to feet in the SVG's
  // user coordinate system. Accounts for preserveAspectRatio="xMidYMid meet"
  // letterboxing (uniform scale + centered offset).
  const clientToFeet = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const svg = svgRef.current
      if (!svg) return null
      const rect = svg.getBoundingClientRect()
      const scale = Math.min(rect.width / viewWidth, rect.height / viewHeight)
      if (scale <= 0 || !isFinite(scale)) return null
      const offsetX = (rect.width - viewWidth * scale) / 2
      const offsetY = (rect.height - viewHeight * scale) / 2
      const x = viewMinX + (clientX - rect.left - offsetX) / scale
      const y = viewMinY + (clientY - rect.top - offsetY) / scale
      return { x, y }
    },
    [viewMinX, viewMinY, viewWidth, viewHeight],
  )

  const commit = useCallback(() => {
    const d = dragRef.current
    if (!d) return
    const id = d.elementId
    let geom: ElementGeometry
    if (d.mode === 'move') {
      geom = { ...d.baseGeometry, position: d.currentPosition }
    } else {
      geom = d.live
    }
    dragRef.current = null
    setDragTick((t) => t + 1)
    onElementGeometryChange?.(id, geom)
  }, [onElementGeometryChange])

  // ── Move handlers ────────────────────────────────────────────────────
  const beginMove = useCallback(
    (e: React.PointerEvent, element: ProjectElement, geometry: ElementGeometry) => {
      if (!editable) return
      const cursorFt = clientToFeet(e.clientX, e.clientY)
      if (!cursorFt) return
      dragRef.current = {
        mode: 'move',
        elementId: element.id,
        offsetFt: { x: cursorFt.x - geometry.position.x, y: cursorFt.y - geometry.position.y },
        currentPosition: { x: geometry.position.x, y: geometry.position.y },
        baseGeometry: geometry,
      }
      ;(e.target as Element).setPointerCapture(e.pointerId)
      setDragTick((t) => t + 1)
    },
    [editable, clientToFeet],
  )

  // ── Resize handlers ──────────────────────────────────────────────────
  const beginResize = useCallback(
    (e: React.PointerEvent, element: ProjectElement, geometry: ElementGeometry, corner: Corner) => {
      if (!editable) return
      if (geometry.shape.kind !== 'rectangle') return
      const cursorFt = clientToFeet(e.clientX, e.clientY)
      if (!cursorFt) return
      const { width, height } = geometry.shape
      const center = elementCenter(geometry)
      // Opposite corner is the anchor — stays world-fixed during drag.
      const oppLocal: Record<Corner, { x: number; y: number }> = {
        nw: { x: width / 2, y: height / 2 },   // SE corner is anchor
        ne: { x: -width / 2, y: height / 2 },  // SW anchor
        se: { x: -width / 2, y: -height / 2 }, // NW anchor
        sw: { x: width / 2, y: -height / 2 },  // NE anchor
      }
      const anchorLocal = oppLocal[corner]
      const rotated = rotate2d(anchorLocal.x, anchorLocal.y, geometry.rotation)
      const anchorWorld = { x: center.x + rotated.x, y: center.y + rotated.y }
      dragRef.current = {
        mode: 'resize',
        elementId: element.id,
        corner,
        anchorWorld,
        rotation: geometry.rotation,
        live: geometry,
      }
      ;(e.target as Element).setPointerCapture(e.pointerId)
      e.stopPropagation()
      setDragTick((t) => t + 1)
    },
    [editable, clientToFeet],
  )

  // ── Rotate handlers ──────────────────────────────────────────────────
  const beginRotate = useCallback(
    (e: React.PointerEvent, element: ProjectElement, geometry: ElementGeometry) => {
      if (!editable) return
      const cursorFt = clientToFeet(e.clientX, e.clientY)
      if (!cursorFt) return
      const center = elementCenter(geometry)
      const dx = cursorFt.x - center.x
      const dy = cursorFt.y - center.y
      const cursorAngleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
      dragRef.current = {
        mode: 'rotate',
        elementId: element.id,
        centerWorld: center,
        startCursorAngleDeg: cursorAngleDeg,
        startRotationDeg: geometry.rotation,
        baseGeometry: geometry,
        live: geometry,
      }
      ;(e.target as Element).setPointerCapture(e.pointerId)
      e.stopPropagation()
      setDragTick((t) => t + 1)
    },
    [editable, clientToFeet],
  )

  // ── Common pointer move / up dispatch ────────────────────────────────
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const cursorFt = clientToFeet(e.clientX, e.clientY)
      if (!cursorFt) return

      if (d.mode === 'move') {
        const nextX = snapFt(cursorFt.x - d.offsetFt.x)
        const nextY = snapFt(cursorFt.y - d.offsetFt.y)
        if (nextX === d.currentPosition.x && nextY === d.currentPosition.y) return
        d.currentPosition = { x: nextX, y: nextY }
        setDragTick((t) => t + 1)
        return
      }

      if (d.mode === 'resize' && d.live.shape.kind === 'rectangle') {
        // New center is midpoint of anchorWorld and cursor
        const newCenter = {
          x: (d.anchorWorld.x + cursorFt.x) / 2,
          y: (d.anchorWorld.y + cursorFt.y) / 2,
        }
        // Cursor relative to new center, inverse-rotated → local-frame offset
        const localDelta = rotate2d(
          cursorFt.x - newCenter.x,
          cursorFt.y - newCenter.y,
          -d.rotation,
        )
        // Half-dimensions in local frame
        const halfW = Math.abs(localDelta.x)
        const halfH = Math.abs(localDelta.y)
        let newWidth = snapFt(halfW * 2)
        let newHeight = snapFt(halfH * 2)
        if (newWidth < MIN_SIZE_FT) newWidth = MIN_SIZE_FT
        if (newHeight < MIN_SIZE_FT) newHeight = MIN_SIZE_FT
        // New position = newCenter - (newW/2, newH/2) in local, but since
        // position is stored in world coords as the top-left of the unrotated
        // box, it's simply newCenter - half-sizes axis-aligned.
        const newPosition = {
          x: newCenter.x - newWidth / 2,
          y: newCenter.y - newHeight / 2,
        }
        d.live = {
          ...d.live,
          position: newPosition,
          shape: { kind: 'rectangle', width: newWidth, height: newHeight },
        }
        setDragTick((t) => t + 1)
        return
      }

      if (d.mode === 'rotate') {
        const dx = cursorFt.x - d.centerWorld.x
        const dy = cursorFt.y - d.centerWorld.y
        const cursorAngleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
        const deltaAngle = cursorAngleDeg - d.startCursorAngleDeg
        let next = d.startRotationDeg + deltaAngle
        next = snapDeg(next)
        // Normalize to [-180, 180] for compactness
        while (next > 180) next -= 360
        while (next < -180) next += 360
        if (next === d.live.rotation) return
        d.live = { ...d.live, rotation: next }
        setDragTick((t) => t + 1)
        return
      }
    },
    [clientToFeet],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return
      try {
        ;(e.target as Element).releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
      commit()
    },
    [commit],
  )

  return (
    <div
      style={{
        width: '100%',
        height,
        background: 'var(--surface-card, #0F1510)',
        borderRadius: 12,
        border: '1px solid var(--border-default, #1F2937)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Mapbox satellite backdrop */}
      {backdropUrl && !isEmpty && (
        <img
          src={backdropUrl}
          alt=""
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'brightness(0.7) saturate(0.85)',
            pointerEvents: 'none',
          }}
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.display = 'none'
          }}
        />
      )}
      {isEmpty ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-tertiary, #9CA3AF)',
            fontSize: 13,
            padding: 24,
            textAlign: 'center',
          }}
        >
          No elements yet — add measurements in the project wizard to see the plan view.
        </div>
      ) : (
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`${viewMinX} ${viewMinY} ${viewWidth} ${viewHeight}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            display: 'block',
            position: 'relative',
            zIndex: 1,
            touchAction: editable ? 'none' : 'auto',
          }}
        >
          {!backdropUrl && (
            <>
              <defs>
                <pattern
                  id="plan-grid-minor"
                  width="5"
                  height="5"
                  patternUnits="userSpaceOnUse"
                >
                  <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={ftPerPx * 0.5} />
                </pattern>
                <pattern
                  id="plan-grid-major"
                  width="25"
                  height="25"
                  patternUnits="userSpaceOnUse"
                >
                  <rect width="25" height="25" fill="url(#plan-grid-minor)" />
                  <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={ftPerPx * 0.75} />
                </pattern>
              </defs>
              <rect
                x={viewMinX}
                y={viewMinY}
                width={viewWidth}
                height={viewHeight}
                fill="url(#plan-grid-major)"
              />
            </>
          )}

          {/* Elements */}
          {laid.map(({ element, geometry }) => {
            const { shape } = geometry
            const color = elementColor(element.elementType)
            const clickable = Boolean(onElementClick)
            const isBeingDragged = dragRef.current?.elementId === element.id
            const transform = elementTransform(geometry)

            let shapeEl: React.ReactNode = null
            if (shape.kind === 'rectangle') {
              shapeEl = (
                <rect
                  x={0}
                  y={0}
                  width={shape.width}
                  height={shape.height}
                  fill={color}
                  fillOpacity={0.85}
                  stroke={color}
                  strokeWidth={ftPerPx * 1.5}
                  rx={0.5}
                />
              )
            } else if (shape.kind === 'circle') {
              shapeEl = (
                <circle
                  cx={shape.radius}
                  cy={shape.radius}
                  r={shape.radius}
                  fill={color}
                  fillOpacity={0.85}
                  stroke={color}
                  strokeWidth={ftPerPx * 1.5}
                />
              )
            } else if (shape.kind === 'line') {
              shapeEl = (
                <rect
                  x={0}
                  y={0}
                  width={shape.length}
                  height={1}
                  fill={color}
                  stroke={color}
                  strokeWidth={ftPerPx * 1.5}
                />
              )
            } else if (shape.kind === 'polygon') {
              const pts = shape.points.map((p) => `${p.x},${p.y}`).join(' ')
              shapeEl = (
                <polygon
                  points={pts}
                  fill={color}
                  fillOpacity={0.85}
                  stroke={color}
                  strokeWidth={ftPerPx * 1.5}
                />
              )
            }

            return (
              <g
                key={element.id}
                transform={transform}
                style={{
                  cursor: editable
                    ? isBeingDragged && dragRef.current?.mode === 'move'
                      ? 'grabbing'
                      : 'grab'
                    : clickable
                      ? 'pointer'
                      : 'default',
                  opacity: isBeingDragged ? 0.75 : 1,
                }}
                onClick={clickable && !editable ? () => onElementClick?.(element) : undefined}
                onPointerDown={editable ? (e) => beginMove(e, element, geometry) : undefined}
                onPointerMove={editable ? onPointerMove : undefined}
                onPointerUp={editable ? onPointerUp : undefined}
                onPointerCancel={editable ? onPointerUp : undefined}
                role={clickable || editable ? 'button' : undefined}
                aria-label={element.name}
              >
                {shapeEl}

                {/* Resize corner handles (rectangles only, edit mode only). */}
                {editable && shape.kind === 'rectangle' && (
                  <>
                    {([
                      { k: 'nw' as const, cx: 0, cy: 0, cursor: 'nwse-resize' },
                      { k: 'ne' as const, cx: shape.width, cy: 0, cursor: 'nesw-resize' },
                      { k: 'se' as const, cx: shape.width, cy: shape.height, cursor: 'nwse-resize' },
                      { k: 'sw' as const, cx: 0, cy: shape.height, cursor: 'nesw-resize' },
                    ]).map(({ k, cx, cy, cursor }) => (
                      <circle
                        key={k}
                        cx={cx}
                        cy={cy}
                        r={handleRadiusFt}
                        fill="#ffffff"
                        stroke={color}
                        strokeWidth={ftPerPx * 1}
                        style={{ cursor }}
                        onPointerDown={(ev) => beginResize(ev, element, geometry, k)}
                      />
                    ))}
                    {/* Rotation handle — above top-center, connected by a line */}
                    <line
                      x1={shape.width / 2}
                      y1={0}
                      x2={shape.width / 2}
                      y2={-ROT_HANDLE_OFFSET_FT}
                      stroke={color}
                      strokeWidth={ftPerPx * 1}
                      opacity={0.7}
                      style={{ pointerEvents: 'none' }}
                    />
                    <circle
                      cx={shape.width / 2}
                      cy={-ROT_HANDLE_OFFSET_FT}
                      r={handleRadiusFt * 1.1}
                      fill="#F59E0B"
                      stroke="#ffffff"
                      strokeWidth={ftPerPx * 0.75}
                      style={{ cursor: 'grab' }}
                      onPointerDown={(ev) => beginRotate(ev, element, geometry)}
                    />
                  </>
                )}
              </g>
            )
          })}

          {/* Labels drawn in a second pass so they always sit above shapes.
              Labels are positioned at the ROTATED visual center. */}
          {labelMode !== 'none' &&
            laid.map(({ element, geometry }, idx) => {
              const c = elementCenter(geometry)
              const text =
                labelMode === 'compact'
                  ? String(idx + 1)
                  : element.name || ELEMENT_TYPE_LABELS[element.elementType]

              return (
                <text
                  key={`lbl-${element.id}`}
                  x={c.x}
                  y={c.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="rgba(255,255,255,0.95)"
                  stroke="rgba(0,0,0,0.55)"
                  strokeWidth={ftPerPx * 0.5}
                  paintOrder="stroke fill"
                  fontSize={labelFontSizeFt}
                  fontWeight={600}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {text}
                </text>
              )
            })}

          {/* Scale bar — bottom-left, inside padding */}
          <g transform={`translate(${viewMinX + PADDING_FT / 2} ${viewMinY + viewHeight - PADDING_FT / 2})`}>
            <rect x={0} y={-0.5} width={SCALE_BAR_FT} height={1} fill="rgba(255,255,255,0.9)" />
            <text
              x={SCALE_BAR_FT + 1}
              y={0}
              dominantBaseline="middle"
              fontSize={labelFontSizeFt}
              fill="rgba(255,255,255,0.9)"
              fontWeight={600}
              style={{ userSelect: 'none' }}
            >
              {SCALE_BAR_FT} ft
            </text>
          </g>
        </svg>
      )}
    </div>
  )
}

export default PlanView2D
