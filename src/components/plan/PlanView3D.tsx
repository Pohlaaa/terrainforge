import React, { useMemo, Suspense, useRef, useState, useEffect } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, Grid, Html, TransformControls } from '@react-three/drei'
import { TextureLoader, SRGBColorSpace, RepeatWrapping } from 'three'
import type { Texture, Group } from 'three'
import type { ProjectElement, Material, ElementGeometry } from '@/types'
import { autoLayout, computeBoundingBox, elementColor, elementHeightFt, elementMaterial } from '@/lib/planLayout'

// ===== PlanView3D (Sprint 4) =====
//
// Same data as PlanView2D, rendered in 3D. Each rectangle element
// becomes an extruded box at its feet position, rotated around its
// center, sized to its measured dimensions. Ground plane + grid + a
// single directional light with shadows.
//
// Currently VIEW-ONLY. Editing stays in 2D mode — 3D editing adds
// significant UX complexity (camera-space drag math, handle depth
// disambiguation) that's better addressed in a later sprint. Both the
// contractor's OverviewTab and the client's /share/:token pass the
// same elements array through a 2D/3D toggle.
//
// Coordinate mapping:
// - Feet on the plan → meters equivalent? No — we keep feet everywhere
//   (it's just a unit; three.js doesn't care).
// - PlanView2D's (x, y) becomes three.js (x, -z). Y=up in 3D, so we
//   extrude by elementHeightFt on the Y axis. Negating z flips the
//   plan so "down" on screen in 2D matches "further from camera" in 3D.
// - Rotation in 2D is clockwise around element center; in 3D we rotate
//   around the Y axis by the same angle (negated to match visual direction).

interface Props {
  elements: ProjectElement[]
  height?: number
  /**
   * Property coordinates. When present + VITE_MAPBOX_TOKEN set, the
   * 3D ground plane gets a satellite texture. Otherwise a solid color.
   * Same shape as PlanView2D's backdrop prop.
   */
  backdrop?: { lat: number; lng: number } | null
  /**
   * Sprint 7c: Material catalog lookup by id. When provided, each element's
   * first material with `textureAlbedoUrl` set has that URL loaded as an
   * albedo texture on the 3D mesh. Falls back to flat color when absent.
   * OverviewTab passes `useMaterialStore().materials` indexed by id;
   * SharedProjectView gets it from `fetchSharedProjectByToken`.
   */
  materialsById?: Record<string, Material>
  /**
   * Sprint 7a-translate: enables click-to-select + drag translate via drei's
   * TransformControls. When true, clicking an element adds a 3-axis gizmo
   * that the contractor drags to reposition. OrbitControls auto-disables
   * while a gizmo is being dragged.
   * Client viewer omits this (defaults false) → /share/:token stays read-only.
   */
  editable?: boolean
  /**
   * Fires when a drag ends. Parent persists via projectStore.updateElement.
   */
  onElementGeometryChange?: (elementId: string, geometry: ElementGeometry) => void
}

const BACKDROP_ZOOM = 19
const BACKDROP_IMAGE_PX = 1200 // geographic coverage; @2x only doubles resolution

/**
 * Earth's equatorial circumference in meters. Used by the Web Mercator
 * projection that Mapbox (and every slippy-map provider) derives from.
 */
const EARTH_CIRCUMFERENCE_M = 40075016.686
const METERS_PER_FOOT = 0.3048

function buildMapboxStaticUrl(lat: number, lng: number): string | null {
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
  if (!token) return null
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},${BACKDROP_ZOOM},0/${BACKDROP_IMAGE_PX}x${BACKDROP_IMAGE_PX}@2x?access_token=${token}&attribution=false&logo=false`
}

/**
 * Width (= height) in FEET of the satellite backdrop at the given latitude,
 * Mapbox zoom level, and image pixel dimension. Web Mercator: a single
 * 256-pixel tile at zoom z covers `EARTH_CIRCUMFERENCE / 2^z` meters at
 * the equator; actual horizontal coverage scales with cos(latitude).
 */
function backdropFootprintFt(lat: number, zoom: number, pxWide: number): number {
  const metersPerPixelAtEquator = EARTH_CIRCUMFERENCE_M / Math.pow(2, zoom) / 256
  const metersPerPixelAtLat = metersPerPixelAtEquator * Math.cos((lat * Math.PI) / 180)
  const totalMeters = metersPerPixelAtLat * pxWide
  return totalMeters / METERS_PER_FOOT
}

// ===== Primitive renderers (Sprint 7e) =====
//
// For organic/decorative element types, swap the default box extrusion for a
// better-suited primitive (trunk+canopy for trees, sphere for shrubs, disk
// for fire pits). The parent <group> handles position + rotation; primitives
// are rendered in local space relative to the ground.

/** Height in feet of the top of the rendered primitive, used for label placement. */
function labelHeightFt(b: {
  elementType: import('@/types').ElementType
  height: number
}): number {
  switch (b.elementType) {
    case 'tree_planting':
      return 15 // trunk 6 + canopy 6 above
    case 'shrub_planting':
      return 4.5
    case 'fire_pit':
      return 2
    default:
      return b.height
  }
}

/**
 * A textured meshStandardMaterial. Loads the albedo from URL + tiles it
 * (RepeatWrapping) so boxes don't stretch one image across a big surface.
 * SRGB color space keeps the texture from washing out under PBR lighting.
 */
function TexturedBoxMaterial({
  url,
  roughness,
  metalness,
  color,
  tileUnits,
}: {
  url: string
  roughness: number
  metalness: number
  color: string
  tileUnits: number // feet per tile — e.g. 2 means each 2ft×2ft patch gets one tile
}) {
  const texture = useLoader(TextureLoader, url) as Texture
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = texture.wrapT = RepeatWrapping
  // Cheap heuristic: ~1 tile every 3ft so a 15ft patio reads as pavers
  const repeat = Math.max(1, tileUnits / 3)
  texture.repeat.set(repeat, repeat)
  return (
    <meshStandardMaterial
      map={texture}
      // Tint the texture with the element's color at low intensity so
      // the category color still reads through a grayscale texture
      color={color}
      roughness={roughness}
      metalness={metalness}
    />
  )
}

function FlatBoxMaterial({
  color,
  roughness,
  metalness,
}: {
  color: string
  roughness: number
  metalness: number
}) {
  return <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
}

function BoxMaterial(props: {
  textureAlbedoUrl: string | null
  color: string
  roughness: number
  metalness: number
  tileUnits: number
}) {
  if (props.textureAlbedoUrl) {
    return (
      <Suspense fallback={<FlatBoxMaterial color={props.color} roughness={props.roughness} metalness={props.metalness} />}>
        <TexturedBoxMaterial
          url={props.textureAlbedoUrl}
          color={props.color}
          roughness={props.roughness}
          metalness={props.metalness}
          tileUnits={props.tileUnits}
        />
      </Suspense>
    )
  }
  return <FlatBoxMaterial color={props.color} roughness={props.roughness} metalness={props.metalness} />
}

function ElementPrimitive({ b }: { b: ExtrudedBox }) {
  const { elementType, width, depth, height, color, roughness, metalness, textureAlbedoUrl } = b

  if (elementType === 'tree_planting') {
    // Radius based on element footprint (smaller of width/depth), minimum 1.5
    const canopyR = Math.max(Math.min(width, depth) / 2, 1.5)
    const trunkH = 6
    return (
      <>
        {/* Trunk */}
        <mesh position={[0, trunkH / 2, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.5, trunkH, 8]} />
          <meshStandardMaterial color="#6b3a15" roughness={0.95} />
        </mesh>
        {/* Canopy */}
        <mesh position={[0, trunkH + canopyR * 0.6, 0]} castShadow>
          <sphereGeometry args={[canopyR, 16, 12]} />
          <meshStandardMaterial color="#166534" roughness={0.95} />
        </mesh>
      </>
    )
  }

  if (elementType === 'shrub_planting') {
    const r = Math.max(Math.min(width, depth) / 2, 1.5)
    return (
      <mesh position={[0, r * 0.8, 0]} castShadow>
        <sphereGeometry args={[r, 16, 10]} />
        <meshStandardMaterial color="#15803d" roughness={0.98} />
      </mesh>
    )
  }

  if (elementType === 'fire_pit') {
    const r = Math.max(Math.min(width, depth) / 2, 1.5)
    return (
      <>
        {/* Stone rim */}
        <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[r, r, 1.5, 24]} />
          <meshStandardMaterial color="#57534e" roughness={0.9} metalness={0.05} />
        </mesh>
        {/* Glowing ember top */}
        <mesh position={[0, 1.55, 0]}>
          <cylinderGeometry args={[r * 0.8, r * 0.8, 0.1, 24]} />
          <meshStandardMaterial color="#f97316" emissive="#dc2626" emissiveIntensity={0.6} />
        </mesh>
      </>
    )
  }

  // Default: box extrusion (with optional PBR albedo texture per Sprint 7c)
  const tileUnits = Math.max(width, depth)
  return (
    <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <BoxMaterial
        textureAlbedoUrl={textureAlbedoUrl}
        color={color}
        roughness={roughness}
        metalness={metalness}
        tileUnits={tileUnits}
      />
    </mesh>
  )
}

// Inner component so useLoader's Suspense can fallback cleanly.
function SatelliteGround({
  url,
  centerX,
  centerZ,
  size,
}: {
  url: string
  centerX: number
  centerZ: number
  size: number
}) {
  const texture = useLoader(TextureLoader, url) as Texture
  // SRGBColorSpace keeps the satellite image from looking washed-out under
  // PBR lighting. Vanilla three defaults to linear which darkens color maps.
  texture.colorSpace = SRGBColorSpace
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centerX, 0, centerZ]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial map={texture} roughness={0.95} metalness={0} />
    </mesh>
  )
}

interface ExtrudedBox {
  key: string
  name: string
  color: string
  x: number // feet, world
  z: number // feet, world (= -plan y)
  rot: number // radians, around Y
  width: number // feet
  depth: number // feet (plan height)
  height: number // feet (3D extrusion)
  roughness: number
  metalness: number
  /** Sprint 7e: element type drives primitive choice (tree/shrub/fire_pit get special shapes). */
  elementType: import('@/types').ElementType
  /** Sprint 7c: albedo texture URL from first element-material with one set. Null = flat color. */
  textureAlbedoUrl: string | null
}

// ===== Sprint 7a-translate / 7a-rotate / 7a-resize: editable 3D element layer =====
//
// Renders every element as a draggable <group>. Clicking an element in
// edit mode selects it; the selected element gets a drei TransformControls
// gizmo. The mode (translate / rotate / scale) is toggleable via a
// floating toolbar — the commit path converts each mode's live object
// state back to plan-feet geometry.
//
// - translate: new group.position → new geometry.position
// - rotate: new group.rotation.y (space=local) → new geometry.rotation
// - scale: new group.scale.x/z → new shape.width/height; reset scale to 1

export type TransformMode = 'translate' | 'rotate' | 'scale'

function ElementsLayer({
  boxes,
  editable,
  selectedId,
  setSelectedId,
  draggingGizmo,
  setDraggingGizmo,
  onElementGeometryChange,
  elements,
  bboxSpanMax,
  transformMode,
}: {
  boxes: ExtrudedBox[]
  editable: boolean
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  draggingGizmo: boolean
  setDraggingGizmo: (v: boolean) => void
  onElementGeometryChange?: (id: string, geometry: ElementGeometry) => void
  elements: ProjectElement[]
  bboxSpanMax: number
  transformMode: TransformMode
}) {
  // A ref-per-element so TransformControls can target the selected one.
  const groupRefs = useRef(new Map<string, Group>())

  const selectedBox = selectedId ? boxes.find((b) => b.key === selectedId) ?? null : null
  const selectedGroup = selectedId ? groupRefs.current.get(selectedId) ?? null : null

  // Commit on drag end. TransformControls mutates the live three.js object
  // directly, so we read the group's live transform state and convert back
  // to plan-feet geometry based on which mode was active.
  const handleTransformEnd = () => {
    setDraggingGizmo(false)
    if (!selectedBox || !selectedGroup) return
    const el = elements.find((e) => e.id === selectedBox.key)
    if (!el) return
    const snap = (v: number) => Math.round(v)
    const snapDeg = (v: number) => Math.round(v / 15) * 15

    // Existing shape determines width/height unless we're scaling (below).
    const existing = el.geometry
    let newWidth = (existing?.shape && existing.shape.kind === 'rectangle')
      ? existing.shape.width
      : selectedBox.width
    let newHeight = (existing?.shape && existing.shape.kind === 'rectangle')
      ? existing.shape.height
      : selectedBox.depth

    // Rotation in degrees CCW (we invert later because plan rotation is CW).
    // Group's rotation.y is current live state — in translate/scale modes this
    // stays at the start value (same as selectedBox.rot); in rotate mode it's
    // the new value.
    const liveRotY = selectedGroup.rotation.y
    let newRotationDeg = -(liveRotY * 180) / Math.PI

    // Position (world center) → plan top-left (in the unrotated frame)
    // regardless of mode — rotate/scale don't change the group's translate.
    let planCenterX = selectedGroup.position.x
    let planCenterZ = selectedGroup.position.z

    if (transformMode === 'scale') {
      // Local-space scale → element width/height multipliers.
      // After commit we reset scale to 1 so subsequent operations start fresh.
      const sx = selectedGroup.scale.x
      const sz = selectedGroup.scale.z
      newWidth = Math.max(2, snap(newWidth * sx))
      newHeight = Math.max(2, snap(newHeight * sz))
      selectedGroup.scale.set(1, 1, 1)
    }

    if (transformMode === 'rotate') {
      newRotationDeg = snapDeg(newRotationDeg)
      // Normalize to [-180, 180]
      while (newRotationDeg > 180) newRotationDeg -= 360
      while (newRotationDeg < -180) newRotationDeg += 360
    }

    // World (x, z) is the CENTER of the box (our render groups position at
    // element center). Plan position is the TOP-LEFT pre-rotation.
    const planX = planCenterX - newWidth / 2
    const planY = -planCenterZ - newHeight / 2

    const newGeometry: ElementGeometry = {
      position:
        transformMode === 'translate'
          ? { x: snap(planX), y: snap(planY) }
          : { x: snap(planX), y: snap(planY) },
      rotation: newRotationDeg,
      shape: {
        kind: 'rectangle',
        width: newWidth,
        height: newHeight,
      },
    }
    onElementGeometryChange?.(selectedBox.key, newGeometry)
  }

  // Clean up refs for unmounted elements (prevents the map from growing).
  useEffect(() => {
    const liveIds = new Set(boxes.map((b) => b.key))
    for (const id of groupRefs.current.keys()) {
      if (!liveIds.has(id)) groupRefs.current.delete(id)
    }
  }, [boxes])

  return (
    <>
      {boxes.map((b) => {
        const isSelected = editable && selectedId === b.key
        return (
          <group
            key={b.key}
            position={[b.x, 0, b.z]}
            rotation={[0, b.rot, 0]}
            ref={(ref) => {
              if (ref) groupRefs.current.set(b.key, ref as unknown as Group)
            }}
            onClick={
              editable
                ? (e) => {
                    e.stopPropagation()
                    setSelectedId(b.key)
                  }
                : undefined
            }
          >
            <ElementPrimitive b={b} />
            <Html
              position={[0, labelHeightFt(b) + 1, 0]}
              center
              distanceFactor={bboxSpanMax * 0.5}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              <div
                style={{
                  padding: '3px 8px',
                  background: isSelected ? 'rgba(16,185,129,0.9)' : 'rgba(0,0,0,0.65)',
                  color: '#fff',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  border: `1px solid ${isSelected ? 'rgba(16,185,129,1)' : 'rgba(255,255,255,0.15)'}`,
                }}
              >
                {b.name}
              </div>
            </Html>
          </group>
        )
      })}
      {/* Drag gizmo on the selected element. TransformControls auto-handles
          the pointer capture + raycast math. We only care about commit.
          F-PHC-07: when the boxes array recomputes (parent state mutated
          via onElementGeometryChange or external Phase C client edit),
          the underlying group ref is a fresh three.js object and the
          gizmo can stay attached to the stale instance. Keying on
          selectedId + position/rotation/size signature forces a clean
          remount whenever the selected element's resolved geometry
          changes — the gizmo always re-anchors to the live object. */}
      {editable && selectedGroup && selectedBox && (
        <TransformControls
          key={`tc-${selectedId}-${selectedBox.x}-${selectedBox.z}-${selectedBox.rot}-${selectedBox.width}-${selectedBox.depth}`}
          object={selectedGroup}
          mode={transformMode}
          // translate: X + Z (ground plane); no Y (elements don't move up).
          // rotate: only Y (yaw); no X/Z (no pitch/roll for 2D plan elements).
          // scale: X + Z (in-plane dimensions); no Y.
          showX={transformMode !== 'rotate'}
          showY={transformMode === 'rotate'}
          showZ={transformMode !== 'rotate'}
          space={transformMode === 'translate' ? 'world' : 'local'}
          size={0.8}
          onMouseDown={() => setDraggingGizmo(true)}
          onMouseUp={handleTransformEnd}
        />
      )}
    </>
  )
}

export const PlanView3D: React.FC<Props> = ({
  elements,
  height = 560,
  backdrop,
  materialsById,
  editable = false,
  onElementGeometryChange,
}) => {
  // Sprint 7a: edit state. Selected element id + current gizmo mode.
  // Only used when editable; null/false means no selection/no gizmo.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draggingGizmo, setDraggingGizmo] = useState(false)
  const [transformMode, setTransformMode] = useState<TransformMode>('translate')
  const backdropUrl = useMemo(
    () => (backdrop ? buildMapboxStaticUrl(backdrop.lat, backdrop.lng) : null),
    [backdrop],
  )
  const boxes = useMemo<ExtrudedBox[]>(() => {
    return autoLayout(elements).flatMap(({ element, geometry }) => {
      if (geometry.shape.kind !== 'rectangle') return []
      const { shape, position, rotation } = geometry
      const cx = position.x + shape.width / 2
      const cy = position.y + shape.height / 2
      const h = elementHeightFt(element)
      const mat = elementMaterial(element.elementType)
      // Sprint 7c: first material with a textureAlbedoUrl wins. A patio with
      // `pavers + base sand + polymeric sand` will render with the pavers'
      // texture (since contractors always set the primary material first).
      let textureAlbedoUrl: string | null = null
      if (materialsById && element.materials) {
        for (const em of element.materials) {
          if (!em.materialId) continue
          const mat = materialsById[em.materialId]
          if (mat?.textureAlbedoUrl) {
            textureAlbedoUrl = mat.textureAlbedoUrl
            break
          }
        }
      }
      return [
        {
          key: element.id,
          name: element.name,
          color: elementColor(element.elementType),
          x: cx,
          z: -cy, // flip plan-Y so the 2D top-down "down" becomes +z in 3D
          rot: -(rotation * Math.PI) / 180, // match SVG clockwise rotation
          width: shape.width,
          depth: shape.height,
          height: h,
          roughness: mat.roughness,
          metalness: mat.metalness,
          elementType: element.elementType,
          textureAlbedoUrl,
        },
      ]
    })
  }, [elements, materialsById])

  const bbox = useMemo(() => {
    // Re-use 2D bbox in feet for camera framing
    return computeBoundingBox(autoLayout(elements))
  }, [elements])

  const centerX = (bbox.minX + bbox.maxX) / 2
  const centerPlanY = (bbox.minY + bbox.maxY) / 2
  const spanX = Math.max(bbox.maxX - bbox.minX, 10)
  const spanZ = Math.max(bbox.maxY - bbox.minY, 10)

  // Geo-aligned satellite footprint (Sprint 7b): when a backdrop is set,
  // compute the real-world width of the Mapbox static image in feet so
  // the ground plane matches the actual property scale. The image is
  // centered on the project's lat/lng, which we treat as world-origin
  // (0, 0, 0). Elements stored in plan feet read directly as world coords.
  const backdropFootprint = useMemo(() => {
    if (!backdrop) return null
    return backdropFootprintFt(backdrop.lat, BACKDROP_ZOOM, BACKDROP_IMAGE_PX)
  }, [backdrop])

  // Camera framing: snap tight to the element bbox so the design is the
  // focal point, not the neighborhood. The satellite sits behind at
  // whatever real-world footprint it has — users orbit/zoom outward if
  // they want more context. Minimum 30 ft so solo elements still frame well.
  const frameSpan = Math.max(spanX, spanZ, 30)
  const cameraDist = frameSpan * 1.6
  const cameraY = frameSpan * 1.2

  return (
    <div
      style={{
        width: '100%',
        height,
        background: '#0F1510',
        borderRadius: 12,
        border: '1px solid var(--border-default, #1F2937)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Sprint 7a toolbar — mode switcher. Appears only when editable + an
          element is selected so clients never see it. */}
      {editable && selectedId && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 5,
            display: 'flex',
            gap: 4,
            padding: 4,
            borderRadius: 8,
            background: 'rgba(0,0,0,0.65)',
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(6px)',
          }}
          role="toolbar"
          aria-label="Transform mode"
        >
          {(['translate', 'rotate', 'scale'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setTransformMode(m)}
              aria-pressed={transformMode === m}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                background: transformMode === m ? '#10B981' : 'transparent',
                color: transformMode === m ? '#fff' : 'rgba(255,255,255,0.85)',
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                cursor: 'pointer',
              }}
            >
              {m === 'translate' ? 'Move' : m === 'rotate' ? 'Rotate' : 'Resize'}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              marginLeft: 4,
            }}
            aria-label="Deselect"
          >
            ✕
          </button>
        </div>
      )}
      <Canvas
        shadows
        camera={{
          position: [centerX + cameraDist * 0.7, cameraY, -centerPlanY + cameraDist * 0.7],
          fov: 45,
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#0F1510']} />
        <hemisphereLight args={['#bfd4ff', '#443322', 0.9]} />
        <ambientLight intensity={0.25} />
        <directionalLight
          position={[cameraDist, cameraDist * 1.3, cameraDist]}
          intensity={1.1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-cameraDist}
          shadow-camera-right={cameraDist}
          shadow-camera-top={cameraDist}
          shadow-camera-bottom={-cameraDist}
        />

        {/* Ground plane.
            - With a satellite backdrop: the plane is centered at world
              origin (0, 0, 0) and sized to the REAL-WORLD footprint of
              the Mapbox tile at this lat/zoom. Project lat/lng is the
              origin of plan-feet coords, so elements at (x, y) feet from
              origin appear exactly at their geographic offset from the
              property center — the house outline visible in the
              satellite lines up with element placement.
            - No backdrop: a dark plane centered on the element bbox. */}
        {backdropUrl && backdropFootprint ? (
          <Suspense
            fallback={
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[backdropFootprint, backdropFootprint]} />
                <meshStandardMaterial color="#1b241c" roughness={0.95} />
              </mesh>
            }
          >
            <SatelliteGround
              url={backdropUrl}
              centerX={0}
              centerZ={0}
              size={backdropFootprint}
            />
          </Suspense>
        ) : (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centerX, 0, -centerPlanY]} receiveShadow>
            <planeGeometry args={[spanX * 4, spanZ * 4]} />
            <meshStandardMaterial color="#1b241c" roughness={0.95} />
          </mesh>
        )}

        {/* Grid — only when there's no satellite (it competes visually) */}
        {!backdropUrl && (
          <Grid
            args={[Math.max(spanX, spanZ) * 3, Math.max(spanX, spanZ) * 3]}
            cellSize={1}
            cellColor="#374151"
            sectionSize={10}
            sectionColor="#4B5563"
            fadeDistance={Math.max(spanX, spanZ) * 2}
            fadeStrength={1}
            infiniteGrid={false}
            position={[centerX, 0.005, -centerPlanY]}
          />
        )}

        {/* Extruded elements */}
        <ElementsLayer
          boxes={boxes}
          editable={editable}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          draggingGizmo={draggingGizmo}
          setDraggingGizmo={setDraggingGizmo}
          onElementGeometryChange={onElementGeometryChange}
          elements={elements}
          bboxSpanMax={Math.max(spanX, spanZ)}
          transformMode={transformMode}
        />

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          target={[centerX, 0, -centerPlanY]}
          minDistance={frameSpan * 0.4}
          // Zoom-out cap: wider of (5x frame) OR (the satellite footprint)
          // so the client can pan out to see the whole property context.
          maxDistance={Math.max(frameSpan * 5, backdropFootprint ?? 0)}
          maxPolarAngle={Math.PI / 2.05}
          // Sprint 7a-translate: lock orbit while the drag gizmo is active
          // so rotating-the-camera doesn't fight dragging-the-element.
          enabled={!draggingGizmo}
        />
      </Canvas>
    </div>
  )
}

export default PlanView3D
