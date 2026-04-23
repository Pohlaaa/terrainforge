import React, { useCallback, useMemo, useRef, useState } from 'react'
import type { ProjectElement, ElementGeometry } from '@/types'
import { autoLayout, computeBoundingBox, elementColor } from '@/lib/planLayout'
import { ELEMENT_TYPE_LABELS } from '@/lib/elements'

// ===== PlanView2D =====
//
// Pure-SVG top-down plan viewer for a project's elements. Scales the
// bounding box of all geometries into the given viewport with padding.
//
// - Reads real geometry when present (future design editor).
// - Falls back to tiled auto-layout when geometry is null (day-one state).
// - No three.js, no heavy deps. Responsive via viewBox + preserveAspectRatio.
//
// Used on both the contractor-side ProjectDashboard and the public
// /share/:token viewer. Same component, same data shape.

const PADDING_FT = 6 // feet of breathing room around the bbox
const SCALE_BAR_FT = 10 // draw a "10 ft" scale bar in the corner

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
   * renders a Mapbox satellite backdrop behind the plan. Element positions
   * are NOT yet geolocated against the tile — the satellite is a visual
   * context layer only. True geoalignment (element.position_lat/lng matching
   * the tile's pixel space) is a Sprint 3 job once we have a site_geometry
   * boundary to anchor to.
   */
  backdrop?: { lat: number; lng: number } | null
  /**
   * Sprint 3a: enables drag-to-reposition. Elements become grabbable;
   * dropping them calls onElementMove with the new feet-space position.
   * Client viewer omits this (defaults to false) so the link stays read-only.
   */
  editable?: boolean
  /**
   * Fires once per drag when the user releases an element. Parent is
   * responsible for persisting the new geometry (typically via
   * projectStore.updateElement(id, { geometry: {...} })).
   */
  onElementMove?: (elementId: string, position: { x: number; y: number }) => void
}

/** Snap feet to the nearest integer — keeps dragged elements on 1-ft grid. */
function snapFt(v: number): number {
  return Math.round(v)
}

/** Zoom level for the satellite backdrop. 19 ≈ residential-lot close view. */
const BACKDROP_ZOOM = 19

function buildMapboxStaticUrl(lat: number, lng: number): string | null {
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
  if (!token) return null
  // Mapbox Static Images API — satellite tile centered on lng/lat
  // @2x gets a retina image; the `auto` attribution flag is fine for embeds.
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},${BACKDROP_ZOOM},0/1200x800@2x?access_token=${token}&attribution=false&logo=false`
}

export const PlanView2D: React.FC<Props> = ({
  elements,
  height = 480,
  labelMode = 'full',
  onElementClick,
  backdrop,
  editable = false,
  onElementMove,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null)

  // Local position overrides during a drag. We use a ref so we don't
  // re-render on every pointer tick for state we only use visually on one
  // element. A companion `dragTick` state forces re-render at animation rate.
  const dragRef = useRef<{
    elementId: string
    offsetFt: { x: number; y: number } // cursor offset from element origin at drag start
    currentFt: { x: number; y: number } // current element origin in feet (snapped)
  } | null>(null)
  const [, setDragTick] = useState(0)

  const baseLaid = useMemo(() => autoLayout(elements), [elements])

  // Overlay the live-drag position (if any) on top of the base layout.
  const laid = useMemo(() => {
    const d = dragRef.current
    if (!d) return baseLaid
    return baseLaid.map((item) => {
      if (item.element.id !== d.elementId) return item
      return {
        ...item,
        geometry: {
          ...item.geometry,
          position: { x: d.currentFt.x, y: d.currentFt.y },
        } as ElementGeometry,
      }
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

  const beginDrag = useCallback(
    (e: React.PointerEvent<SVGGElement>, element: ProjectElement, originFt: { x: number; y: number }) => {
      if (!editable) return
      const cursorFt = clientToFeet(e.clientX, e.clientY)
      if (!cursorFt) return
      dragRef.current = {
        elementId: element.id,
        offsetFt: { x: cursorFt.x - originFt.x, y: cursorFt.y - originFt.y },
        currentFt: { x: originFt.x, y: originFt.y },
      }
      // Capture the pointer so pointermove/up fire on this element even
      // if the cursor leaves it.
      ;(e.target as Element).setPointerCapture(e.pointerId)
      setDragTick((t) => t + 1)
    },
    [editable, clientToFeet],
  )

  const continueDrag = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      const d = dragRef.current
      if (!d) return
      const cursorFt = clientToFeet(e.clientX, e.clientY)
      if (!cursorFt) return
      const nextX = snapFt(cursorFt.x - d.offsetFt.x)
      const nextY = snapFt(cursorFt.y - d.offsetFt.y)
      if (nextX === d.currentFt.x && nextY === d.currentFt.y) return
      d.currentFt = { x: nextX, y: nextY }
      setDragTick((t) => t + 1)
    },
    [clientToFeet],
  )

  const endDrag = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      const d = dragRef.current
      if (!d) return
      try {
        ;(e.target as Element).releasePointerCapture(e.pointerId)
      } catch {
        /* pointer already released */
      }
      const final = { x: d.currentFt.x, y: d.currentFt.y }
      const id = d.elementId
      dragRef.current = null
      setDragTick((t) => t + 1)
      // Fire the move callback once the user releases. Parent persists.
      onElementMove?.(id, final)
    },
    [onElementMove],
  )

  // Pixel-feet scale for the label font size. viewBox uses feet; we want
  // labels to render at ~11-13px regardless of how the SVG stretches.
  // Assuming ~700px CSS width, feet-per-pixel = viewWidth / 700.
  const ftPerPx = viewWidth / 700
  const labelFontSizeFt = Math.max(ftPerPx * 11, 0.8)

  const isEmpty = elements.length === 0

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
      {/* Mapbox satellite backdrop (Phase A) — positioned under the SVG.
          Not geoaligned to element coordinates yet; purely visual context. */}
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
            // A subtle darkening keeps element labels readable on top.
            filter: 'brightness(0.7) saturate(0.85)',
            pointerEvents: 'none',
          }}
          onError={(e) => {
            // Gracefully hide the image if Mapbox 401s or the URL fails.
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
            // Prevent the browser's touch/pan behavior while dragging.
            touchAction: editable ? 'none' : 'auto',
          }}
        >
          {/* Grid background — 5-ft minor, 25-ft major. When the satellite
              backdrop is showing, skip the grid (it competes visually). */}
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
          {laid.map(({ element, geometry }, idx) => {
            const { position, rotation, shape } = geometry
            const color = elementColor(element.elementType)
            const clickable = Boolean(onElementClick)
            const label =
              labelMode === 'none'
                ? null
                : labelMode === 'compact'
                  ? String(idx + 1)
                  : element.name || ELEMENT_TYPE_LABELS[element.elementType]

            let shapeEl: React.ReactNode = null
            let centerX = position.x
            let centerY = position.y

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
              centerX = position.x + shape.width / 2
              centerY = position.y + shape.height / 2
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
              centerX = position.x + shape.radius
              centerY = position.y + shape.radius
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
              centerX = position.x + shape.length / 2
              centerY = position.y + 0.5
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
              const xs = shape.points.map((p) => p.x)
              const ys = shape.points.map((p) => p.y)
              centerX = position.x + (Math.min(...xs) + Math.max(...xs)) / 2
              centerY = position.y + (Math.min(...ys) + Math.max(...ys)) / 2
            }

            const isBeingDragged = dragRef.current?.elementId === element.id
            return (
              <g
                key={element.id}
                transform={`translate(${position.x} ${position.y}) rotate(${rotation})`}
                style={{
                  cursor: editable
                    ? isBeingDragged
                      ? 'grabbing'
                      : 'grab'
                    : clickable
                      ? 'pointer'
                      : 'default',
                  opacity: isBeingDragged ? 0.75 : 1,
                }}
                onClick={clickable && !editable ? () => onElementClick?.(element) : undefined}
                onPointerDown={editable ? (e) => beginDrag(e, element, position) : undefined}
                onPointerMove={editable ? continueDrag : undefined}
                onPointerUp={editable ? endDrag : undefined}
                onPointerCancel={editable ? endDrag : undefined}
                role={clickable || editable ? 'button' : undefined}
                aria-label={element.name}
              >
                {shapeEl}
              </g>
            )
          })}

          {/* Labels drawn in a second pass so they always sit above shapes */}
          {labelMode !== 'none' &&
            laid.map(({ element, geometry }, idx) => {
              const { position, shape } = geometry
              let cx = position.x
              let cy = position.y
              if (shape.kind === 'rectangle') {
                cx = position.x + shape.width / 2
                cy = position.y + shape.height / 2
              } else if (shape.kind === 'circle') {
                cx = position.x + shape.radius
                cy = position.y + shape.radius
              } else if (shape.kind === 'line') {
                cx = position.x + shape.length / 2
                cy = position.y + 0.5
              }

              const text =
                labelMode === 'compact'
                  ? String(idx + 1)
                  : element.name || ELEMENT_TYPE_LABELS[element.elementType]

              return (
                <text
                  key={`lbl-${element.id}`}
                  x={cx}
                  y={cy}
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
