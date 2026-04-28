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
    // Sprint P: split heavy vendor libs into named chunks. Browser caches
    // each independently across deploys, so a Sprint A code change doesn't
    // re-bust the 1.7 MB mapbox-gl bundle. Already-lazy chunks stay where
    // they are; this only tunes the eager `index.js` payload.
    rollupOptions: {
      output: {
        manualChunks: {
          // React framework — stable across deploys, almost never changes
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase client + auth — changes occasionally
          'vendor-supabase': ['@supabase/supabase-js'],
          // Stripe — only loaded by Billing page (already lazy via App.tsx),
          // but its top-level import in main bundles the SDK eagerly. Pin
          // it to its own chunk so the Billing-only payload is correct.
          'vendor-stripe': ['@stripe/stripe-js'],
          // PDF renderer — used only by manifest export. Pin separately.
          'vendor-pdf': ['@react-pdf/renderer'],
        },
      },
    },
    // Bump the warn ceiling to 1 MB; Mapbox's standalone chunk is 1.7 MB
    // and three.js is 893 kB. Both are intentionally large + already
    // lazy-loaded behind the canvas mount.
    chunkSizeWarningLimit: 1024,
  },
})
