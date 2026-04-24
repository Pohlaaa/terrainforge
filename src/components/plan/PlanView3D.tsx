import React, { useMemo, Suspense } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, Grid, Html } from '@react-three/drei'
import { TextureLoader, SRGBColorSpace } from 'three'
import type { Texture } from 'three'
import type { ProjectElement } from '@/types'
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

function ElementPrimitive({ b }: { b: ExtrudedBox }) {
  const { elementType, width, depth, height, color, roughness, metalness } = b

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

  // Default: box extrusion
  return (
    <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
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
}

export const PlanView3D: React.FC<Props> = ({ elements, height = 560, backdrop }) => {
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
        },
      ]
    })
  }, [elements])

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
        {boxes.map((b) => (
          <group
            key={b.key}
            position={[b.x, 0, b.z]}
            rotation={[0, b.rot, 0]}
          >
            <ElementPrimitive b={b} />
            {/* Floating label above each element — positioned above the top of
                whichever primitive this element renders as (tree canopy,
                shrub dome, fire pit, or default box). */}
            <Html
              position={[0, labelHeightFt(b) + 1, 0]}
              center
              distanceFactor={Math.max(spanX, spanZ) * 0.5}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              <div
                style={{
                  padding: '3px 8px',
                  background: 'rgba(0,0,0,0.65)',
                  color: '#fff',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                {b.name}
              </div>
            </Html>
          </group>
        ))}

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
        />
      </Canvas>
    </div>
  )
}

export default PlanView3D
