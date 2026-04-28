import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest config (Sprint U).
 *
 * Mirrors the @ alias from vite.config.ts so tests that import from @/types,
 * @/services, etc. resolve identically to the runtime build. Tests live next
 * to source as *.test.ts; the include pattern matches src/**.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      // Edge Function handlers are extracted into pure modules for testing
      // (e.g. supabase/functions/stripe-webhook/handlers.ts). Co-located
      // tests live next to them.
      'supabase/functions/**/*.test.ts',
    ],
    exclude: ['node_modules', 'dist', 'e2e'],
  },
});
