import { test as setup, expect } from '@playwright/test'
import { requireEnv } from './helpers'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * One-time auth: signs the contractor into staging and persists Supabase
 * session tokens to e2e/.auth/contractor.json. All subsequent specs
 * load that storage state via the projects.dependencies wiring in
 * playwright.config.ts.
 *
 * Re-runs every CI invocation but locally the storage state survives
 * across runs (fast feedback). Delete the .auth/ directory to force a
 * fresh sign-in.
 */
// ESM-safe __dirname (package.json sets "type": "module")
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const authFile = path.join(__dirname, '.auth', 'contractor.json')

setup('authenticate as contractor', async ({ page }) => {
  const email = requireEnv('E2E_EMAIL')
  const password = requireEnv('E2E_PASSWORD')

  fs.mkdirSync(path.dirname(authFile), { recursive: true })

  await page.goto('/login')

  // The login page has an email input and a password input, plus a sign-in
  // button. Use placeholder/text selectors over CSS so this survives
  // styling changes.
  const emailInput = page
    .getByPlaceholder(/email/i)
    .or(page.getByLabel(/email/i))
    .first()
  await emailInput.fill(email)

  const passwordInput = page
    .getByPlaceholder(/password/i)
    .or(page.getByLabel(/password/i))
    .first()
  await passwordInput.fill(password)

  const submit = page
    .getByRole('button', { name: /sign in|log in/i })
    .first()
  await submit.click()

  // Successful sign-in lands on /dashboard or /. Wait for either a
  // visible dashboard element or the URL change.
  await page.waitForURL(/\/(dashboard|projects|$)/, { timeout: 15_000 })

  // Sanity: the top nav shows a "Projects" button (not <a>) once the
  // org context loads. The TopNav component uses <button> elements.
  await expect(page.getByRole('button', { name: 'Projects', exact: true })).toBeVisible({
    timeout: 15_000,
  })

  await page.context().storageState({ path: authFile })
})
