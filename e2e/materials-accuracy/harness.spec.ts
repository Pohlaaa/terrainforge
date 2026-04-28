import { test } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SCENARIOS } from './scenarios'
import { scoreScenario, summariseSuite, renderMarkdown } from './scoring'

import {
  buildPerElementMaterialPrompt,
  safeParsePerElementMaterials,
  validatePerElementMaterials,
} from '../../src/services/aiRecommendations'

import type { Material } from '../../src/types'

/**
 * Sprint M harness runner.
 *
 * For each scenario:
 *   1. Build the same prompt the production `inferMaterialsForElement`
 *      builds (imported as a named export — single source of truth).
 *   2. POST it to the Anthropic API directly. We bypass `callClaude`
 *      because that helper reads the API key from `import.meta.env`
 *      (Vite-only) — Node-side reads from `process.env` instead.
 *   3. Run the response through the same parser + validator the
 *      production path uses.
 *   4. Score against the scenario's expected/forbidden categories +
 *      quantity ranges (e2e/materials-accuracy/scoring.ts).
 *
 * Outputs to `.claude/TESTING/`:
 *   materials-scorecard-<ISO>.json  — full machine-readable report
 *   MATERIALS_ACCURACY.md           — human-readable summary
 *
 * Run with `npm run materials:score`. Costs ~$0.50 per pass against
 * Claude Haiku at current pricing.
 *
 * Skips automatically if `ANTHROPIC_API_KEY` (or `VITE_ANTHROPIC_API_KEY`
 * via the .env.e2e dotenv shim) isn't set, so CI without the key just
 * marks the test as skipped instead of failing red.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'
// Mirror the production max_tokens — Sprint M iteration 1 raised this
// from 1024 → 1500 after observing empty responses on retaining-wall
// and drainage scenarios that didn't fit the strengthened prompt.
const MAX_TOKENS = 1500

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const OUTPUT_DIR = path.resolve(__dirname, '../../.claude/TESTING')

function getApiKey(): string | undefined {
  // Prefer E2E_ANTHROPIC_KEY because some shells (Claude Code's Anthropic
  // CLI environment in particular) pre-define ANTHROPIC_API_KEY as an
  // empty string, which dotenv-cli then refuses to override.
  return (
    process.env.E2E_ANTHROPIC_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.VITE_ANTHROPIC_API_KEY
  )
}

async function callAnthropicNode(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Anthropic API ${res.status}: ${errBody.slice(0, 200)}`)
  }
  const data = (await res.json()) as { content: Array<{ type: string; text: string }> }
  const block = data.content.find((b) => b.type === 'text')
  if (!block) throw new Error('No text content in response')
  return block.text
}

// Minimal stub catalog — the harness operates on the prompt's catalog
// hint, but we want the dimensions + categories only. An empty array
// makes the prompt's "Org Library Hint" empty too, which slightly
// changes behaviour from production. To mirror production realistically
// we'd seed with a representative org library. For Sprint M we accept
// the small bias — the harness is testing prompt + validator behaviour,
// not catalog-match accuracy.
const STUB_CATALOG: Material[] = []

test.describe('Materials engine accuracy', () => {
  test('runs all scenarios and writes scorecard', async () => {
    test.setTimeout(15 * 60_000) // 15 min wall clock for 30 scenarios
    const apiKey = getApiKey()
    console.log('[harness] apiKey set?', !!apiKey, 'len:', apiKey?.length ?? 0)
    if (!apiKey) {
      console.warn('[harness] No ANTHROPIC_API_KEY (or VITE_ANTHROPIC_API_KEY) — skipping')
      test.skip()
      return
    }

    const reports = []
    for (const scenario of SCENARIOS) {
      console.log(`\n[harness] ${scenario.id} (${scenario.tier})`)
      const prompt = buildPerElementMaterialPrompt(scenario.element, STUB_CATALOG)
      let recs
      try {
        const raw = await callAnthropicNode(prompt, apiKey!)
        const parsed = safeParsePerElementMaterials(raw)
        recs = validatePerElementMaterials(parsed, STUB_CATALOG, scenario.element)
      } catch (err) {
        console.error(`[harness] ${scenario.id} call failed:`, err)
        recs = []
      }
      const report = scoreScenario(scenario, recs)
      reports.push(report)
      console.log(
        `  score: ${(report.clampedScore * 100).toFixed(1)}% | required ${report.expectedFound.length}/${report.expectedFound.length + report.expectedMissing.length} | forbidden ${report.forbiddenHitCount} | qty ${report.quantityResults.filter((q) => q.inRange).length}/${report.quantityResults.length}`,
      )
      if (report.reasons.length > 0) {
        for (const r of report.reasons) console.log(`    - ${r}`)
      }
    }

    const suite = summariseSuite(reports)

    // Write JSON scorecard with timestamp so successive runs accumulate
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const jsonPath = path.join(OUTPUT_DIR, `materials-scorecard-${stamp}.json`)
    fs.writeFileSync(jsonPath, JSON.stringify(suite, null, 2))

    // Write canonical markdown summary (overwrites)
    const mdPath = path.join(OUTPUT_DIR, 'MATERIALS_ACCURACY.md')
    fs.writeFileSync(mdPath, renderMarkdown(suite))

    console.log('\n[harness] Suite summary:')
    console.log(`  scenarios:   ${suite.scenarioCount}`)
    console.log(`  mean score:  ${(suite.meanScore * 100).toFixed(1)}%`)
    console.log(`  min score:   ${(suite.minScore * 100).toFixed(1)}%`)
    console.log(`  max score:   ${(suite.maxScore * 100).toFixed(1)}%`)
    console.log(`  forbidden hits: ${suite.forbiddenHitTotal}`)
    console.log(`  scorecard JSON: ${jsonPath}`)
    console.log(`  scorecard MD:   ${mdPath}`)
  })
})
