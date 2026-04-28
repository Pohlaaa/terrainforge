#!/usr/bin/env node
/**
 * Perf budget enforcement (P0 #5).
 *
 * Reads dist/assets/*.js after a build and compares each chunk against the
 * targets documented in .claude/TESTING/PERF_BUDGET.md. Exits non-zero if
 * any chunk exceeds its budget so CI can gate on it.
 *
 * The budgets are encoded as a name-prefix → max-KB map below. Prefix match
 * means the script is robust to Vite's content-hash suffix (e.g. the
 * `index-Dogo9KvM.js` chunk matches the `index` prefix).
 *
 * Usage:
 *   npm run build
 *   node scripts/check-perf-budget.mjs
 *
 * Outputs a table on success; on failure, prints the offenders and exits 1.
 */

import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ── Budgets (matches PERF_BUDGET.md targets) ────────────────────────────────
// Map of chunk-name prefix → max size in KB. Order matters: more specific
// prefixes should appear before less specific ones.
const BUDGETS = [
  // Eager / first-paint
  { prefix: 'index-',             maxKB: 600,  label: 'app shell (eager)' },
  { prefix: 'vendor-react-',      maxKB: 200,  label: 'react vendor (eager)' },
  { prefix: 'vendor-supabase-',   maxKB: 250,  label: 'supabase vendor (eager)' },

  // Lazy routes
  { prefix: 'ProjectDashboard-',  maxKB: 200,  label: 'ProjectDashboard (lazy)' },
  { prefix: 'ProjectWizard-',     maxKB: 150,  label: 'ProjectWizard (lazy)' },
  { prefix: 'BudgetHub-',         maxKB: 100,  label: 'BudgetHub (lazy)' },
  { prefix: 'MaterialLibrary-',   maxKB: 100,  label: 'MaterialLibrary (lazy)' },
  { prefix: 'Onboarding-',        maxKB: 100,  label: 'Onboarding (lazy)' },
  { prefix: 'Landing-',           maxKB: 80,   label: 'Landing (lazy)' },
  { prefix: 'CrewEquipmentHub-',  maxKB: 80,   label: 'CrewEquipmentHub (lazy)' },
  { prefix: 'Settings-',          maxKB: 80,   label: 'Settings (lazy)' },
  { prefix: 'WorkOrders-',        maxKB: 80,   label: 'WorkOrders (lazy)' },
  { prefix: 'PriceResearch-',     maxKB: 80,   label: 'PriceResearch (lazy)' },
  { prefix: 'SharedProjectView-', maxKB: 80,   label: 'SharedProjectView (lazy)' },
  { prefix: 'CrewJobDetail-',     maxKB: 50,   label: 'CrewJobDetail (lazy)' },
  { prefix: 'CrewDashboard-',     maxKB: 50,   label: 'CrewDashboard (lazy)' },

  // Heavy library chunks (intentionally large; ceilings here are sanity caps,
  // not aggressive targets — bumping these means a real cost regression).
  { prefix: 'mapbox-gl-',         maxKB: 1900, label: 'mapbox-gl (heavy)' },
  { prefix: 'vendor-pdf-',        maxKB: 1700, label: '@react-pdf/renderer (heavy)' },
  { prefix: 'PlanView3D-',        maxKB: 1000, label: 'PlanView3D / three.js (heavy)' },
];

// Files we don't budget at all — too small or too dynamic to be worth tracking.
const IGNORE_PREFIXES = ['vendor-stripe-']; // stripe varies; size is fine

function findBudget(name) {
  for (const b of BUDGETS) if (name.startsWith(b.prefix)) return b;
  return null;
}

function shouldIgnore(name) {
  return IGNORE_PREFIXES.some((p) => name.startsWith(p));
}

const distAssetsDir = resolve(process.cwd(), 'dist', 'assets');

let entries;
try {
  entries = readdirSync(distAssetsDir);
} catch (err) {
  console.error(`× Cannot read ${distAssetsDir}. Run \`npm run build\` first.`);
  console.error(`  Underlying error: ${err.message}`);
  process.exit(2);
}

const jsFiles = entries
  .filter((f) => f.endsWith('.js'))
  .map((name) => {
    const sizeBytes = statSync(join(distAssetsDir, name)).size;
    return { name, sizeBytes, sizeKB: sizeBytes / 1024 };
  })
  .sort((a, b) => b.sizeKB - a.sizeKB);

const results = [];
const failures = [];
const unbudgeted = [];

for (const f of jsFiles) {
  if (shouldIgnore(f.name)) continue;
  const budget = findBudget(f.name);
  if (!budget) {
    unbudgeted.push(f);
    continue;
  }
  const passing = f.sizeKB <= budget.maxKB;
  const row = {
    name: f.name,
    label: budget.label,
    sizeKB: Math.round(f.sizeKB),
    maxKB: budget.maxKB,
    passing,
  };
  results.push(row);
  if (!passing) failures.push(row);
}

// ── Output ──────────────────────────────────────────────────────────────────

const padR = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

console.log('\nPerf budget check (.claude/TESTING/PERF_BUDGET.md)');
console.log('─'.repeat(80));
console.log(
  padR('Chunk', 36) + padL('Size', 10) + padL('Budget', 10) + '   Status',
);
console.log('─'.repeat(80));
for (const r of results) {
  const status = r.passing ? '✓' : '× OVER';
  console.log(
    padR(r.name.slice(0, 35), 36) +
      padL(`${r.sizeKB} KB`, 10) +
      padL(`${r.maxKB} KB`, 10) +
      `   ${status}  ${r.label}`,
  );
}

if (unbudgeted.length > 0) {
  console.log('\nUnbudgeted chunks (not tracked):');
  for (const f of unbudgeted) {
    console.log(`  · ${f.name}  (${Math.round(f.sizeKB)} KB)`);
  }
  console.log(
    '  → Add a budget to scripts/check-perf-budget.mjs if any of these matter.',
  );
}

if (failures.length > 0) {
  console.log('\n× Perf budget exceeded:');
  for (const f of failures) {
    const over = f.sizeKB - f.maxKB;
    console.log(`  · ${f.label}: ${f.sizeKB} KB (budget ${f.maxKB} KB, +${over} KB)`);
  }
  console.log(
    '\nUpdate the budget in scripts/check-perf-budget.mjs only if the regression is intentional;',
  );
  console.log(
    'otherwise split further or revert the change that bumped the chunk.',
  );
  process.exit(1);
}

console.log('\n✓ All tracked chunks within budget.');
process.exit(0);
