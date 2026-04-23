import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3000,
    open: true,
  },
  optimizeDeps: {
    include: [
      '@react-pdf/renderer',
      // Sprint 5 fix: @react-three/fiber imports THREE at the module top
      // but doesn't declare it in a way Vite's dep-optimizer sees. Without
      // this include, fiber's bundle has `new THREE.WebGLRenderer(...)`
      // referring to nothing and the Canvas silently fails to paint.
      'three',
      '@react-three/fiber',
      '@react-three/drei',
    ],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
