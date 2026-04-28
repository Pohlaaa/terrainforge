import type { Page } from '@playwright/test'

/**
 * Shared helpers for the E2E walkthrough suite.
 *
 * Selector philosophy: prefer text-based + role-based selectors that
 * mirror what a contractor sees on screen. Fall back to data-testid
 * only when text is dynamic. We deliberately avoid CSS-class selectors
 * (Tailwind generates randomized utility names that change with the
 * Tailwind version).
 */

export const STAGING_URL =
  process.env.E2E_BASE_URL ?? 'https://terrainforge-staging.netlify.app'

/**
 * Required env. Throws fast at import time so the suite doesn't get
 * 30 seconds in before failing on a missing password.
 */
export function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) {
    throw new Error(
      `Missing env var ${name}. Copy .env.e2e.example → .env.e2e and fill in.`,
    )
  }
  return v
}

/**
 * E2E project name prefix. Cleanup teardown deletes any project on the
 * test account whose name starts with this string. Wide enough to
 * catch projects from prior partial runs, narrow enough to never
 * touch real data.
 */
export const E2E_PROJECT_PREFIX = 'E2E_TEST_'

export function uniqueProjectName(label: string): string {
  return `${E2E_PROJECT_PREFIX}${label}_${Date.now()}`
}

/**
 * Wait for both Anthropic API calls (project recommendations + element
 * inference) that fire on Step 1 → Step 2 transition. Returns the array
 * of response statuses so callers can assert all 200.
 */
export async function waitForStep2AICalls(page: Page) {
  const responses = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('api.anthropic.com/v1/messages') && r.request().method() === 'POST',
      { timeout: 30_000 },
    ),
    page.waitForResponse(
      (r) => r.url().includes('api.anthropic.com/v1/messages') && r.request().method() === 'POST',
      { timeout: 30_000 },
    ),
  ])
  return responses.map((r) => r.status())
}

/**
 * Wait for one per-element inferMaterialsForElement call (smaller
 * Anthropic POST). Times out at 20s — the call itself is ~1-2s but we
 * give headroom for transient backoff.
 */
export async function waitForPerElementMaterialCall(page: Page) {
  return page.waitForResponse(
    (r) =>
      r.url().includes('api.anthropic.com/v1/messages') &&
      r.request().method() === 'POST',
    { timeout: 20_000 },
  )
}

/**
 * Common Step 1 form fill. Returns the project name used so teardown
 * can find it.
 */
export async function fillStep1(
  page: Page,
  args: {
    projectName: string
    description: string
    workType?: string
  },
) {
  await page.getByPlaceholder('e.g., Johnson Backyard Renovation').fill(args.projectName)
  if (args.workType) {
    await page.locator('select').first().selectOption(args.workType)
  }
  await page.getByRole('button', { name: 'Medium', exact: false }).first().click()
  await page.getByPlaceholder(/Describe the work/).fill(args.description)
  // Address: pick first autocomplete suggestion. Mapbox response can be
  // slow on cold connections; wait then click first suggestion if present.
  const addressBox = page.getByPlaceholder('123 Main St')
  await addressBox.click()
  await addressBox.fill('100 Tunnel Road, Asheville')
  await page.waitForTimeout(2000)
  // Click the first dropdown item containing the typed text.
  const firstSuggestion = page
    .locator('text=/100 Tunnel Road, Asheville, North Carolina/')
    .first()
  if (await firstSuggestion.isVisible({ timeout: 5000 })) {
    await firstSuggestion.click()
  }
}

/**
 * Generate a fresh test client email so contractor → client emails
 * never collide with real test runs in the inbox.
 */
export function uniqueClientEmail(): string {
  return `e2e+${Date.now()}@test.invalid`
}
