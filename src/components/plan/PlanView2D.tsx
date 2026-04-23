import React, { useMemo } from 'react'
import type { ProjectElement } from '@/types'
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
}) => {
  const laid = useMemo(() => autoLayout(elements), [elements])
  const bbox = useMemo(() => computeBoundingBox(laid), [laid])
  const backdropUrl = useMemo(
    () => (backdrop ? buildMapboxStaticUrl(backdrop.lat, backdrop.lng) : null),
    [backdrop],
  )

  const viewMinX = bbox.minX - PADDING_FT
  const viewMinY = bbox.minY - PADDING_FT
  const viewWidth = bbox.maxX - bbox.minX + PADDING_FT * 2
  const viewHeight = bbox.maxY - bbox.minY + PADDING_FT * 2

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
          width="100%"
          height="100%"
          viewBox={`${viewMinX} ${viewMinY} ${viewWidth} ${viewHeight}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block', position: 'relative', zIndex: 1 }}
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

            return (
              <g
                key={element.id}
                transform={`translate(${position.x} ${position.y}) rotate(${rotation})`}
                style={{ cursor: clickable ? 'pointer' : 'default' }}
                onClick={clickable ? () => onElementClick?.(element) : undefined}
                role={clickable ? 'button' : undefined}
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
