import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import type { Mesh } from 'three'

// ===== DesignSandbox =====
//
// DEV-only route: /design/sandbox
//
// Purpose (Sprint 3b): prove the react-three-fiber + drei stack loads,
// typechecks, and renders inside TerrainForge without tangling with the
// main app surfaces. Intentionally minimal — a gently rotating cube on a
// grid, orbit controls, environment lighting. If this page renders in
// your dev build, we're unblocked to start layering real 3D features
// (property terrain, PBR materials, element geometry extrusions) in
// future sprints.
//
// Not reachable in production builds — gated on import.meta.env.DEV at
// the route layer (see src/App.tsx).

function RotatingCube() {
  const meshRef = useRef<Mesh>(null)
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.35
      meshRef.current.rotation.y += delta * 0.5
    }
  })
  return (
    <mesh ref={meshRef} position={[0, 1, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial color="#10B981" roughness={0.4} metalness={0.1} />
    </mesh>
  )
}

const DesignSandbox: React.FC = () => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0A0A0A',
        color: '#F9FAFB',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 10,
          padding: '10px 14px',
          borderRadius: 8,
          background: 'rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          fontSize: 12,
          maxWidth: 380,
          backdropFilter: 'blur(6px)',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: '#10B981' }}>
          Design Sandbox
        </div>
        <div style={{ opacity: 0.8, lineHeight: 1.5 }}>
          react-three-fiber + drei proof-of-life. Drag to orbit, scroll to zoom.
          This route is DEV-only; it's stripped from production builds.
        </div>
      </div>

      <Canvas
        shadows
        camera={{ position: [4, 4, 4], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#0A0A0A']} />
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 8, 3]}
          intensity={1.1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        <RotatingCube />

        {/* Ground plane that receives shadows */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#1F2937" roughness={0.9} />
        </mesh>

        <Grid
          args={[20, 20]}
          cellSize={1}
          cellColor="#374151"
          sectionSize={5}
          sectionColor="#4B5563"
          fadeDistance={25}
          fadeStrength={1}
          infiniteGrid={false}
          position={[0, 0.01, 0]}
        />

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={2}
          maxDistance={20}
          target={[0, 1, 0]}
        />
      </Canvas>
    </div>
  )
}

export default DesignSandbox
