import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for the TerrainForge E2E walkthrough suite.
 *
 * Tests run against the staging deployment by default
 * (https://terrainforge-staging.netlify.app). Credentials are read from
 * env vars — see `.env.e2e.example` for the required keys. The CI flow
 * never commits secrets; local devs copy the example and fill in.
 *
 * Setup is split:
 *   - `auth.setup.ts` runs once per session, signs in, persists Supabase
 *     auth tokens to `e2e/.auth/contractor.json` (gitignored). All other
 *     specs reuse this storage state via `storageState`.
 *   - `walkthrough.spec.ts` runs the full contractor-flow regression
 *     gate (auth → wizard → create → share → client edit → submit →
 *     contractor accept → cleanup).
 *   - `rpc-negative.spec.ts` hits Supabase RPCs directly to verify
 *     security boundaries (token validity, role enforcement, cross-
 *     project blocks, malformed-payload rejection).
 *
 * Headed mode: `npm run e2e:headed`.
 * Debug mode (slow + DevTools): `npm run e2e:debug`.
 */

const BASE_URL = process.env.E2E_BASE_URL ?? 'https://terrainforge-staging.netlify.app'

export default defineConfig({
  testDir: './e2e',
  // Sequential: tests share auth state + create real projects against the
  // staging DB. Parallel runs would race for unique-project-name slots
  // and could collide on the dev account session token.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  // One retry handles transient Anthropic / Mapbox / Netlify hiccups.
  retries: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 120_000, // 2 min per test — AI calls + 3D mount can be slow
  expect: {
    timeout: 15_000, // assertions can wait up to 15s for async UI
  },
  use: {
    baseURL: BASE_URL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Default viewport — desktop. Mobile sweep is a separate sprint.
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'contractor-walkthrough',
      testMatch: /walkthrough\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/contractor.json',
      },
    },
    {
      name: 'rpc-negative',
      testMatch: /rpc-negative\.spec\.ts/,
      // No auth dependency — uses anon key directly to test the public
      // SECURITY DEFINER RPCs. Faster, runs alongside the walkthrough.
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      // Sprint M — materials accuracy harness. Long-running (~15 min for
      // 30 scenarios). Excluded from `npm run e2e` default; invoke via
      // `npm run materials:score`. No auth dependency — calls Anthropic
      // directly with the production prompt + validator.
      name: 'materials-accuracy',
      testMatch: /materials-accuracy\/harness\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
      timeout: 15 * 60_000,
      retries: 0,
    },
  ],
})
