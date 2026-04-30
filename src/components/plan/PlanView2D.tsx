import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  /**
   * Batch 24: when set, PlanView2D enters click-to-draw polygon mode for
   * the named element. Each click on empty canvas appends a vertex; the
   * existing polygon is rendered ghosted underneath so the contractor
   * can trace its outline. Clicking on the first vertex (when ≥3 placed)
   * commits. Enter / Done button also commits. Esc cancels.
   */
  drawingPolygonForElementId?: string | null
  /**
   * Fires once when the contractor exits draw mode (commit OR cancel).
   * Parent is responsible for clearing its `drawingPolygonForElementId`
   * state so PlanView2D returns to normal interaction.
   */
  onDrawingExit?: () => void
  /**
   * Sprint AI-Buildable: AI-identified buildable polygon (lawn / dirt /
   * non-paved non-rooftop) in plan-feet. Rendered as a translucent
   * green fill with dashed outline so the contractor sees where the
   * AI thinks the yard is. Null = no overlay.
   */
  buildableArea?: Array<{ x: number; y: number }> | null
  /**
   * Sprint AI-Buildable: AI-identified obstacle polygons (rooftop, road,
   * driveway, pool, canopy) in plan-feet. Rendered as faint red dashed
   * outlines so the contractor sees what the AI considered "do not place
   * elements here." Empty array = no obstacles.
   */
  obstacles?: Array<Array<{ x: number; y: number }>>
}

/** Snap feet to the nearest integer — keeps dragged elements on 1-ft grid. */
function snapFt(v: number): number {
  return Math.round(v)
}

/** Snap rotation to 15-degree increments. */
function snapDeg(v: number): number {
  return Math.round(v / 15) * 15
}

// Sprint AI-Buildable / jbluhm-feedback fix:
//
// The PlanView2D backdrop used to be a 1200x800 tile rendered as an
// absolute-positioned `<img>` with `objectFit: cover`, COMPLETELY
// independent of the SVG's viewBox. Result: a 16-ft patio rendered as
// 30% of the screen on a satellite that geographically covered ~955 ft
// across the same screen — wildly out of scale, and the AI-buildable
// polygon overlays (which live in plan-feet) didn't align with the
// satellite imagery either.
//
// Fix: import the shared 1200x1200 URL builder + zoom constant from
// `@/lib/mapboxStatic` (the same one PlanView3D and aiPlacement use),
// compute the tile's geographic footprint in feet via mapTileMath, and
// render the satellite as a `<image>` element INSIDE the SVG so it
// shares the plan-feet coordinate space with elements + overlays.
//
// Net effect:
//   - elements render at correct relative scale on the satellite
//   - "10 ft" scale bar matches a 10-ft feature on the imagery
//   - buildable + obstacle overlays land where the AI intended
//   - same imagery in 2D and 3D
import {
  buildMapboxStaticUrl as buildMapboxStaticUrlShared,
  BACKDROP_ZOOM,
  BACKDROP_IMAGE_PX,
} from '@/lib/mapboxStatic'
import { tileFootprintFt } from '@/lib/mapTileMath'
import { pointInPolygon } from '@/lib/polygonGeom'

function buildMapboxStaticUrl(lat: number, lng: number): string | null {
  return buildMapboxStaticUrlShared(lat, lng)
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
  | {
      // Batch 22: drag a single polygon vertex (mig 034 polygon shape).
      // Cursor coords arrive in world feet; we transform back into the
      // element's LOCAL space (un-rotate around center) so the vertex
      // delta makes sense regardless of element rotation.
      mode: 'vertex'
      elementId: string
      vertexIndex: number
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
  drawingPolygonForElementId,
  onDrawingExit,
  buildableArea = null,
  obstacles = [],
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const [, setDragTick] = useState(0)
  // Batch 24: click-to-draw polygon state.
  const [drawingPoints, setDrawingPoints] = useState<Array<{ x: number; y: number }>>([])
  const [drawingCursor, setDrawingCursor] = useState<{ x: number; y: number } | null>(null)
  // Reset draw state when entering/exiting draw mode.
  useEffect(() => {
    setDrawingPoints([])
    setDrawingCursor(null)
  }, [drawingPolygonForElementId])

  // How close to the first vertex (in feet) counts as "click to close
  // the polygon." Generous enough that contractors don't have to hit it
  // exactly; tight enough that nearby spurious clicks don't auto-close.
  const CLOSE_THRESHOLD_FT = 1.5

  const baseLaid = useMemo(() => autoLayout(elements), [elements])

  // Overlay the live-drag geometry (if any) on top of the base layout.
  // resize/rotate/vertex modes all carry a `live` ElementGeometry that
  // reflects the in-progress edit; move tracks position separately.
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
      // resize / rotate / vertex
      return { ...item, geometry: d.live }
    })
  }, [baseLaid])

  const bbox = useMemo(() => computeBoundingBox(laid), [laid])
  const backdropUrl = useMemo(
    () => (backdrop ? buildMapboxStaticUrl(backdrop.lat, backdrop.lng) : null),
    [backdrop],
  )

  // Satellite tile footprint in plan-feet. The tile is centered on the
  // property's lat/lng (which equals plan-feet origin). At zoom 19 +
  // Asheville lat + 1200 px = ~955 ft. Used to size the SVG viewBox
  // when a backdrop is present so the satellite imagery and the
  // elements share the SAME plan-feet coordinate space.
  const tileFootprint = useMemo(
    () =>
      backdrop ? tileFootprintFt(backdrop.lat, BACKDROP_ZOOM, BACKDROP_IMAGE_PX) : null,
    [backdrop],
  )

  // Compute the SVG viewBox.
  // - With backdrop: cover the satellite tile centered on origin AND
  //   the element bbox (in case some elements drifted outside the tile).
  //   This is what makes elements render at correct relative scale to
  //   imagery — a 16-ft patio sized as ~16/955ths of the screen width.
  // - Without backdrop: tight to the element bbox + padding (legacy).
  const view = useMemo(() => {
    if (tileFootprint != null) {
      const half = tileFootprint / 2
      const minX = Math.min(-half, bbox.minX) - PADDING_FT
      const maxX = Math.max(half, bbox.maxX) + PADDING_FT
      const minY = Math.min(-half, bbox.minY) - PADDING_FT
      const maxY = Math.max(half, bbox.maxY) + PADDING_FT
      return {
        minX,
        minY,
        width: maxX - minX,
        height: maxY - minY,
      }
    }
    return {
      minX: bbox.minX - PADDING_FT,
      minY: bbox.minY - PADDING_FT,
      width: bbox.maxX - bbox.minX + PADDING_FT * 2,
      height: bbox.maxY - bbox.minY + PADDING_FT * 2,
    }
  }, [tileFootprint, bbox])

  const viewMinX = view.minX
  const viewMinY = view.minY
  const viewWidth = view.width
  const viewHeight = view.height

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
      // Bail if the pointer landed on a handle. Handles set their own drag
      // mode via beginResize / beginRotate; stopPropagation should block
      // us, but React's root delegation makes that unreliable across
      // browsers, so a data-attribute check is the belt + suspenders.
      const target = e.target as Element | null
      if (target && typeof target.getAttribute === 'function' && target.getAttribute('data-handle')) {
        return
      }
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

  // ── Batch 24: click-to-draw polygon ─────────────────────────────────
  const commitDrawing = useCallback(() => {
    const id = drawingPolygonForElementId
    if (!id || drawingPoints.length < 3) return
    const existing = elements.find((e) => e.id === id)
    if (!existing) {
      onDrawingExit?.()
      return
    }
    // Clicked points are world-space (in feet, in the SVG's coord system).
    // The element's polygon points are stored in element-LOCAL space —
    // i.e., relative to geometry.position. Translate before saving so
    // the rendered polygon lands where the contractor drew it.
    const basePosition = existing.geometry?.position ?? { x: 0, y: 0 }
    const localPoints = drawingPoints.map((p) => ({
      x: p.x - basePosition.x,
      y: p.y - basePosition.y,
    }))
    const baseGeometry = existing.geometry ?? {
      position: basePosition,
      rotation: 0,
      shape: { kind: 'polygon' as const, points: localPoints },
    }
    onElementGeometryChange?.(id, {
      ...baseGeometry,
      shape: { kind: 'polygon', points: localPoints },
    })
    setDrawingPoints([])
    setDrawingCursor(null)
    onDrawingExit?.()
  }, [drawingPolygonForElementId, drawingPoints, elements, onElementGeometryChange, onDrawingExit])

  const cancelDrawing = useCallback(() => {
    setDrawingPoints([])
    setDrawingCursor(null)
    onDrawingExit?.()
  }, [onDrawingExit])

  // Esc/Enter handlers when drawing.
  useEffect(() => {
    if (!drawingPolygonForElementId) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        cancelDrawing()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        commitDrawing()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [drawingPolygonForElementId, commitDrawing, cancelDrawing])

  const onSvgClickDrawing = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!drawingPolygonForElementId) return
      const cursor = clientToFeet(e.clientX, e.clientY)
      if (!cursor) return
      // Click-to-close: if ≥3 points and click landed near the first
      // vertex, commit. Skips if the click happened to be exactly on a
      // later vertex (rare; would still snap to grid anyway).
      if (drawingPoints.length >= 3) {
        const first = drawingPoints[0]
        const dist = Math.hypot(cursor.x - first.x, cursor.y - first.y)
        if (dist < CLOSE_THRESHOLD_FT) {
          commitDrawing()
          return
        }
      }
      setDrawingPoints((pts) => [
        ...pts,
        { x: snapFt(cursor.x), y: snapFt(cursor.y) },
      ])
    },
    [drawingPolygonForElementId, drawingPoints, clientToFeet, commitDrawing],
  )

  const onSvgMouseMoveDrawing = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!drawingPolygonForElementId) return
      const cursor = clientToFeet(e.clientX, e.clientY)
      if (cursor) setDrawingCursor(cursor)
    },
    [drawingPolygonForElementId, clientToFeet],
  )

  // ── Vertex drag (mig 034 polygons) ─────────────────────────────────
  // Click + drag a polygon vertex handle. Snap-to-foot via snapFt() in
  // onPointerMove; commit fires on pointerup which writes the new
  // points[] back through onElementGeometryChange.
  const beginVertexMove = useCallback(
    (
      e: React.PointerEvent,
      element: ProjectElement,
      geometry: ElementGeometry,
      vertexIndex: number,
    ) => {
      if (!editable) return
      if (geometry.shape.kind !== 'polygon') return
      dragRef.current = {
        mode: 'vertex',
        elementId: element.id,
        vertexIndex,
        live: geometry,
      }
      ;(e.target as Element).setPointerCapture(e.pointerId)
      e.stopPropagation()
      setDragTick((t) => t + 1)
    },
    [editable],
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

      if (d.mode === 'vertex' && d.live.shape.kind === 'polygon') {
        // Cursor is in world feet; convert into element-local space by
        // subtracting position and inverse-rotating around the element's
        // current bbox center. The polygon's points array stores
        // local-coordinate vertices; updating points[i] live re-renders
        // the polygon at the new position.
        const localCursor = (() => {
          const p = d.live.position
          // First un-translate
          const tx = cursorFt.x - p.x
          const ty = cursorFt.y - p.y
          // Then un-rotate around the local origin. Note: position is the
          // unrotated top-left, so local space starts at (0,0) regardless
          // of rotation. rotate2d returns a fresh vector — we negate the
          // rotation since we're going world → local.
          if (d.live.rotation === 0) return { x: tx, y: ty }
          // The element transform applies rotate(rot, cx, cy) AFTER translate
          // so we need to undo around the element center, not (0,0).
          const center = elementCenter(d.live)
          const cx = center.x - p.x
          const cy = center.y - p.y
          const offX = tx - cx
          const offY = ty - cy
          const undone = rotate2d(offX, offY, -d.live.rotation)
          return { x: cx + undone.x, y: cy + undone.y }
        })()
        const newX = snapFt(localCursor.x)
        const newY = snapFt(localCursor.y)
        const points = d.live.shape.points
        const cur = points[d.vertexIndex]
        if (cur && cur.x === newX && cur.y === newY) return
        const nextPoints = points.map((p, i) =>
          i === d.vertexIndex ? { x: newX, y: newY } : p,
        )
        d.live = {
          ...d.live,
          shape: { kind: 'polygon', points: nextPoints },
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
      {/* Satellite backdrop is now rendered as an `<image>` element
          inside the SVG (see below) so it shares the plan-feet coord
          space with elements + overlays. The pre-fix absolute-positioned
          <img> rendered independently of the SVG viewBox, which produced
          out-of-scale elements + a misaligned scale bar + drifting
          AI-buildable overlays. */}
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
            cursor: drawingPolygonForElementId ? 'crosshair' : undefined,
          }}
          onClick={drawingPolygonForElementId ? onSvgClickDrawing : undefined}
          onMouseMove={drawingPolygonForElementId ? onSvgMouseMoveDrawing : undefined}
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

          {/* Satellite backdrop — rendered as a SVG <image> sized to the
              actual geographic footprint of the tile in plan-feet, so
              elements + buildable overlays land at the correct relative
              scale. Brightness/saturate filter keeps element labels
              legible against bright daylight imagery. */}
          {backdropUrl && tileFootprint != null && (
            <image
              href={backdropUrl}
              x={-tileFootprint / 2}
              y={-tileFootprint / 2}
              width={tileFootprint}
              height={tileFootprint}
              preserveAspectRatio="xMidYMid meet"
              style={{ filter: 'brightness(0.7) saturate(0.85)', pointerEvents: 'none' }}
            />
          )}

          {/* Sprint AI-Buildable: AI-identified polygons. Drawn BEFORE
              elements so the elements render on top, but AFTER the
              satellite backdrop so they're visible. Buildable area is
              translucent green; obstacles are faint red dashed outlines.
              Both are decorative — no pointer events, no interaction. */}
          {(buildableArea && buildableArea.length >= 3) && (
            <polygon
              points={buildableArea.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="rgba(16,185,129,0.10)"
              stroke="rgba(16,185,129,0.55)"
              strokeWidth={ftPerPx * 1.5}
              strokeDasharray={`${ftPerPx * 4} ${ftPerPx * 3}`}
              style={{ pointerEvents: 'none' }}
            />
          )}
          {obstacles.length > 0 &&
            obstacles.map((poly, i) =>
              poly.length >= 3 ? (
                <polygon
                  key={`obstacle-${i}`}
                  points={poly.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="rgba(239,68,68,0.06)"
                  stroke="rgba(239,68,68,0.40)"
                  strokeWidth={ftPerPx * 1}
                  strokeDasharray={`${ftPerPx * 3} ${ftPerPx * 2}`}
                  style={{ pointerEvents: 'none' }}
                />
              ) : null,
            )}

          {/* Elements */}
          {laid.map(({ element, geometry }) => {
            const { shape } = geometry
            const color = elementColor(element.elementType)
            const clickable = Boolean(onElementClick)
            const isBeingDragged = dragRef.current?.elementId === element.id
            const transform = elementTransform(geometry)

            // Sprint AI-Buildable Phase 2: soft-clip drag violation. When
            // the element is being dragged AND its center has moved into
            // an obstacle polygon (or out of the buildable polygon),
            // surface a red halo + "outside buildable area" tooltip near
            // the element. We don't BLOCK the drag — contractors might
            // know better than the AI (overlay is decoration, not a
            // hard rule). Only computed during move (resize/rotate
            // don't reposition the center).
            let violationKind: 'obstacle' | 'outside-buildable' | null = null
            if (
              isBeingDragged &&
              dragRef.current?.mode === 'move' &&
              (buildableArea || obstacles.length > 0)
            ) {
              const c = elementCenter(geometry)
              if (
                obstacles.length > 0 &&
                obstacles.some((poly) => pointInPolygon(c.x, c.y, poly))
              ) {
                violationKind = 'obstacle'
              } else if (
                buildableArea &&
                buildableArea.length >= 3 &&
                !pointInPolygon(c.x, c.y, buildableArea)
              ) {
                violationKind = 'outside-buildable'
              }
            }

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
                  onContextMenu={
                    editable && !drawingPolygonForElementId
                      ? (ev) => {
                          ev.preventDefault()
                          ev.stopPropagation()
                          // Batch 28: right-click polygon → insert vertex at
                          // click point, between the two existing vertices
                          // bounding the closest edge. Handles inverse-rotate
                          // around element center so the inserted vertex
                          // lands where the contractor clicked even when
                          // the element is rotated.
                          const cursorWorld = clientToFeet(ev.clientX, ev.clientY)
                          if (!cursorWorld) return
                          const points = shape.points
                          if (points.length < 2) return
                          // World → element-local. Same math as the vertex
                          // drag onPointerMove path.
                          const p = geometry.position
                          const tx = cursorWorld.x - p.x
                          const ty = cursorWorld.y - p.y
                          let localX = tx
                          let localY = ty
                          if (geometry.rotation !== 0) {
                            const center = elementCenter(geometry)
                            const cx = center.x - p.x
                            const cy = center.y - p.y
                            const offX = tx - cx
                            const offY = ty - cy
                            const undone = rotate2d(offX, offY, -geometry.rotation)
                            localX = cx + undone.x
                            localY = cy + undone.y
                          }
                          const click = { x: snapFt(localX), y: snapFt(localY) }
                          // Find closest edge by point-to-segment distance.
                          let bestIdx = 0
                          let bestDist = Infinity
                          const n = points.length
                          for (let i = 0; i < n; i++) {
                            const a = points[i]
                            const b = points[(i + 1) % n]
                            const abx = b.x - a.x
                            const aby = b.y - a.y
                            const lenSq = abx * abx + aby * aby
                            let t = 0
                            if (lenSq > 0) {
                              t = ((click.x - a.x) * abx + (click.y - a.y) * aby) / lenSq
                              t = Math.max(0, Math.min(1, t))
                            }
                            const projX = a.x + t * abx
                            const projY = a.y + t * aby
                            const dx = click.x - projX
                            const dy = click.y - projY
                            const dist = dx * dx + dy * dy
                            if (dist < bestDist) {
                              bestDist = dist
                              bestIdx = i
                            }
                          }
                          // Insert click point between bestIdx and bestIdx+1.
                          const next = [
                            ...points.slice(0, bestIdx + 1),
                            click,
                            ...points.slice(bestIdx + 1),
                          ]
                          onElementGeometryChange?.(element.id, {
                            ...geometry,
                            shape: { kind: 'polygon', points: next },
                          })
                        }
                      : undefined
                  }
                >
                  <title>
                    {editable && !drawingPolygonForElementId
                      ? 'Right-click to insert a vertex on this edge'
                      : ''}
                  </title>
                </polygon>
              )
            }

            return (
              <g
                key={element.id}
                transform={transform}
                style={{
                  cursor: drawingPolygonForElementId
                    ? 'crosshair'
                    : editable
                    ? isBeingDragged && dragRef.current?.mode === 'move'
                      ? 'grabbing'
                      : 'grab'
                    : clickable
                      ? 'pointer'
                      : 'default',
                  opacity:
                    drawingPolygonForElementId === element.id
                      ? 0.18 // ghost the element being redrawn
                      : isBeingDragged
                      ? 0.75
                      : 1,
                  pointerEvents: drawingPolygonForElementId ? 'none' : undefined,
                }}
                onClick={clickable && !editable && !drawingPolygonForElementId ? () => onElementClick?.(element) : undefined}
                onPointerDown={editable && !drawingPolygonForElementId ? (e) => beginMove(e, element, geometry) : undefined}
                onPointerMove={editable && !drawingPolygonForElementId ? onPointerMove : undefined}
                onPointerUp={editable && !drawingPolygonForElementId ? onPointerUp : undefined}
                onPointerCancel={editable && !drawingPolygonForElementId ? onPointerUp : undefined}
                role={clickable || editable ? 'button' : undefined}
                aria-label={element.name}
              >
                {/* Sprint AI-Buildable Phase 2: violation halo. Renders
                    BEFORE shapeEl so it sits behind the element fill but
                    in front of the satellite. Sized to the rectangle
                    bbox of the shape; for non-rectangle shapes the halo
                    just over-covers slightly which still reads as a
                    warning. */}
                {violationKind && shape.kind === 'rectangle' && (
                  <rect
                    x={-ftPerPx * 4}
                    y={-ftPerPx * 4}
                    width={shape.width + ftPerPx * 8}
                    height={shape.height + ftPerPx * 8}
                    fill="rgba(239,68,68,0.15)"
                    stroke="rgba(239,68,68,0.85)"
                    strokeWidth={ftPerPx * 2}
                    strokeDasharray={`${ftPerPx * 4} ${ftPerPx * 3}`}
                    rx={1}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                {violationKind && shape.kind === 'circle' && (
                  <circle
                    cx={shape.radius}
                    cy={shape.radius}
                    r={shape.radius + ftPerPx * 4}
                    fill="rgba(239,68,68,0.15)"
                    stroke="rgba(239,68,68,0.85)"
                    strokeWidth={ftPerPx * 2}
                    strokeDasharray={`${ftPerPx * 4} ${ftPerPx * 3}`}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                {shapeEl}

                {/* Polygon vertex handles (mig 034, edit mode). Click + drag
                    a vertex to reshape the polygon. Right-click removes
                    a vertex (only when 4+ remain — polygons need 3 to be
                    valid, and removing the last "movable" vertex would
                    collapse the shape). The textarea editor in the wizard
                    sidebar stays usable for bulk coord entry + insert. */}
                {editable && shape.kind === 'polygon' && (
                  <>
                    {shape.points.map((p, i) => (
                      <circle
                        key={`vtx-${i}`}
                        cx={p.x}
                        cy={p.y}
                        r={handleRadiusFt}
                        fill="#10B981"
                        stroke="#ffffff"
                        strokeWidth={ftPerPx * 1}
                        style={{ cursor: 'move' }}
                        data-handle="vertex"
                        data-vertex-index={i}
                        onPointerDown={(ev) => beginVertexMove(ev, element, geometry, i)}
                        onContextMenu={(ev) => {
                          ev.preventDefault()
                          ev.stopPropagation()
                          if (shape.points.length <= 3) return // need 3+ for valid polygon
                          const nextPoints = shape.points.filter((_, idx) => idx !== i)
                          onElementGeometryChange?.(element.id, {
                            ...geometry,
                            shape: { kind: 'polygon', points: nextPoints },
                          })
                        }}
                      >
                        <title>
                          Drag to move · right-click to remove
                          {shape.points.length <= 3 ? ' (locked at 3 vertices)' : ''}
                        </title>
                      </circle>
                    ))}
                  </>
                )}

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
                        data-handle="corner"
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
                      data-handle="rotate"
                      onPointerDown={(ev) => beginRotate(ev, element, geometry)}
                    />
                  </>
                )}
              </g>
            )
          })}

          {/* Sprint AI-Buildable Phase 2: violation tooltip. Renders
              once for the currently-dragged element when it crosses
              into an obstacle / outside the buildable area. Positioned
              just above the element center so it stays in the
              contractor's eyeline. */}
          {(() => {
            const d = dragRef.current
            if (!d || d.mode !== 'move') return null
            if (!buildableArea && obstacles.length === 0) return null
            const item = laid.find((x) => x.element.id === d.elementId)
            if (!item) return null
            const c = elementCenter(item.geometry)
            let kind: 'obstacle' | 'outside-buildable' | null = null
            if (
              obstacles.length > 0 &&
              obstacles.some((poly) => pointInPolygon(c.x, c.y, poly))
            ) {
              kind = 'obstacle'
            } else if (
              buildableArea &&
              buildableArea.length >= 3 &&
              !pointInPolygon(c.x, c.y, buildableArea)
            ) {
              kind = 'outside-buildable'
            }
            if (!kind) return null
            const msg =
              kind === 'obstacle'
                ? 'On obstacle (rooftop / road / driveway)'
                : 'Outside buildable area'
            const tipFontFt = Math.max(ftPerPx * 11, 1.2)
            const padX = ftPerPx * 5
            const padY = ftPerPx * 3
            // Approx text width — SVG can't measure text without DOM read;
            // err on generous so the pill always fits.
            const w = msg.length * tipFontFt * 0.55 + padX * 2
            const h = tipFontFt * 1.4 + padY * 2
            // Position above the element center, with margin.
            const tipX = c.x - w / 2
            const tipY = c.y - h - tipFontFt * 2
            return (
              <g style={{ pointerEvents: 'none' }}>
                <rect
                  x={tipX}
                  y={tipY}
                  width={w}
                  height={h}
                  rx={padY}
                  fill="rgba(127,29,29,0.92)"
                  stroke="rgba(239,68,68,0.85)"
                  strokeWidth={ftPerPx * 0.75}
                />
                <text
                  x={c.x}
                  y={tipY + h / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontSize={tipFontFt}
                  fontWeight={600}
                  style={{ userSelect: 'none' }}
                >
                  {msg}
                </text>
              </g>
            )
          })()}

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

          {/* Batch 24: in-progress polygon outline while drawing.
              - Solid green polyline through committed clicks
              - Dashed green segment from last click to mouse cursor
              - Vertex circles on each committed click (the first one
                gets a thicker ring + larger radius as the click-target
                for closing the polygon) */}
          {drawingPolygonForElementId && drawingPoints.length > 0 && (
            <g style={{ pointerEvents: 'none' }}>
              {/* Committed segments */}
              {drawingPoints.length >= 2 && (
                <polyline
                  points={drawingPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth={ftPerPx * 1.5}
                  strokeLinejoin="round"
                />
              )}
              {/* Live preview segment from last point to cursor */}
              {drawingCursor && (
                <line
                  x1={drawingPoints[drawingPoints.length - 1].x}
                  y1={drawingPoints[drawingPoints.length - 1].y}
                  x2={drawingCursor.x}
                  y2={drawingCursor.y}
                  stroke="#10B981"
                  strokeWidth={ftPerPx * 1}
                  strokeDasharray={`${ftPerPx * 4} ${ftPerPx * 3}`}
                  opacity={0.7}
                />
              )}
              {/* Vertex circles. First click gets a larger close-target ring. */}
              {drawingPoints.map((p, i) => (
                <circle
                  key={`draw-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r={i === 0 && drawingPoints.length >= 3
                    ? handleRadiusFt * 1.6
                    : handleRadiusFt}
                  fill={i === 0 && drawingPoints.length >= 3 ? 'transparent' : '#10B981'}
                  stroke={i === 0 && drawingPoints.length >= 3 ? '#10B981' : '#ffffff'}
                  strokeWidth={ftPerPx * 1}
                />
              ))}
            </g>
          )}
        </svg>
      )}

      {/* Batch 24: floating instructions + commit/cancel buttons while
          drawing. HTML overlay (not SVG) so button styling matches the
          rest of the app. Positioned absolute over the canvas. */}
      {drawingPolygonForElementId && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 21, 16, 0.92)',
            border: '1px solid #10B981',
            borderRadius: 8,
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            zIndex: 5,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>
            {drawingPoints.length === 0
              ? 'Click on the canvas to start drawing the polygon'
              : drawingPoints.length < 3
              ? `Click to add vertex (${drawingPoints.length} placed, need 3+)`
              : `Click first vertex or press Enter to close (${drawingPoints.length} placed)`}
          </span>
          <button
            type="button"
            onClick={commitDrawing}
            disabled={drawingPoints.length < 3}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: 'none',
              background: drawingPoints.length >= 3 ? '#10B981' : 'rgba(16,185,129,0.3)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 600,
              cursor: drawingPoints.length >= 3 ? 'pointer' : 'not-allowed',
            }}
          >
            Done (⏎)
          </button>
          <button
            type="button"
            onClick={cancelDrawing}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: '#fff',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel (Esc)
          </button>
        </div>
      )}
    </div>
  )
}

export default PlanView2D
