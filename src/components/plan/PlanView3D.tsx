import React, { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Html } from '@react-three/drei'
import type { ProjectElement } from '@/types'
import { autoLayout, computeBoundingBox, elementColor, elementHeightFt } from '@/lib/planLayout'

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
}

export const PlanView3D: React.FC<Props> = ({ elements, height = 560 }) => {
  const boxes = useMemo<ExtrudedBox[]>(() => {
    return autoLayout(elements).flatMap(({ element, geometry }) => {
      if (geometry.shape.kind !== 'rectangle') return []
      const { shape, position, rotation } = geometry
      const cx = position.x + shape.width / 2
      const cy = position.y + shape.height / 2
      const h = elementHeightFt(element)
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
  const cameraDist = Math.max(spanX, spanZ) * 1.6
  const cameraY = Math.max(spanX, spanZ) * 1.2

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

        {/* Ground plane — large enough to always contain shadows */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centerX, 0, -centerPlanY]} receiveShadow>
          <planeGeometry args={[spanX * 4, spanZ * 4]} />
          <meshStandardMaterial color="#1b241c" roughness={0.95} />
        </mesh>

        {/* 1-ft grid, fades with distance, positioned over the ground */}
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

        {/* Extruded elements */}
        {boxes.map((b) => (
          <group
            key={b.key}
            position={[b.x, 0, b.z]}
            rotation={[0, b.rot, 0]}
          >
            <mesh position={[0, b.height / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[b.width, b.height, b.depth]} />
              <meshStandardMaterial color={b.color} roughness={0.7} metalness={0.05} />
            </mesh>
            {/* Floating label above each element */}
            <Html
              position={[0, b.height + 1, 0]}
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
          minDistance={Math.max(spanX, spanZ) * 0.5}
          maxDistance={Math.max(spanX, spanZ) * 5}
          maxPolarAngle={Math.PI / 2.05}
        />
      </Canvas>
    </div>
  )
}

export default PlanView3D
