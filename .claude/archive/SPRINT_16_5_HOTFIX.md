# Sprint 16.5 Hotfix — Enum Mismatch Fix

> **Branch**: `sprint-16.5-hotfix`
> **Base**: `main`
> **Scope**: Fix frontend ↔ database enum mismatches that block all material and equipment creates/updates
> **Requires SQL migration**: YES — migration 006

---

## Context Files to Read First

1. `CLAUDE.md` (project root)
2. `.claude/CODE_GUIDE.md`
3. This file

---

## Background

The Postgres database uses strict ENUM types for `material_category`, `equipment_type`, `equipment_status`, `unit_type`, and others. The frontend TypeScript types use different values than the DB enums. This causes `22P02: invalid input value for enum` errors whenever the frontend tries to INSERT or UPDATE rows.

Example: Frontend sends `category: "seed"` → DB expects `material_category` enum value `turf_seed` → INSERT fails.

**The fix**: Replace Postgres ENUM columns with TEXT columns that use CHECK constraints matching the frontend values. This eliminates the mismatch permanently. ENUMs are rigid (can't easily add values), while CHECK constraints on TEXT columns are flexible and can be updated with ALTER TABLE.

---

## Task 1 (S16.5-1): SQL Migration — Replace ENUMs with TEXT + CHECK constraints

**Migration file**: `supabase/migrations/006_fix_enum_mismatch.sql` (already created)

Charlie runs this migration in Supabase SQL Editor BEFORE Code starts. Code does NOT run SQL against Supabase — Code only needs to be aware the schema has changed.

**Acceptance criteria**: Migration runs without errors in Supabase SQL Editor. Existing data is preserved with mapped values.

---

## Task 2 (S16.5-2): Update supabaseData.ts column name for materials.unit

**Problem**: After migration 006, the materials table column changes from `unit_type` to `unit`. The `toSnakeCase`/`toCamelCase` helpers handle general conversion, but the SELECT and INSERT code in `supabaseData.ts` may reference `unit_type` explicitly.

**File**: `src/services/supabaseData.ts`

**Search for** any explicit references to `unit_type` in the materials CRUD functions. If `fetchMaterials` uses `SELECT *`, this is fine (column rename is transparent). But check `createMaterial` and `updateMaterial` — if they explicitly map `unit` to `unit_type`, update those references.

Specifically, check the `createMaterial` function. The frontend `Material` interface has `unit: string`. The `toSnakeCase` helper will convert `unit` to `unit` (no change needed since it's already snake_case). So this should work automatically.

**However**: If there's any hardcoded `unit_type` reference in the INSERT, change it to `unit`.

Also verify: after migration, the `toCamelCase` conversion will receive `unit` from the DB and map it to `unit` in the frontend (no conversion needed). Previously it received `unit_type` and mapped to `unitType` — but the frontend `Material` interface has `unit`, not `unitType`. Check if there was already a manual mapping here.

**Acceptance criteria**: `npm run build` passes. Materials can be created, read, and updated with the new column name.

---

## Task 3 (S16.5-3): Verify all CRUD operations work end-to-end

After Tasks 1 and 2, verify by running `npm run build`. Then manually trace through the code:

1. `createMaterial` in supabaseData.ts — the data object should have `category` (TEXT, matches frontend) and `unit` (TEXT, matches frontend). No enum conversion needed.
2. `createEquipment` in supabaseData.ts — the data object should have `type` (TEXT, free form) and `status` (TEXT, matches frontend values like `in-use`).
3. `fetchMaterials` — `SELECT *` returns `category` and `unit` as TEXT. `toCamelCase` passes them through.
4. `fetchEquipment` — `SELECT *` returns `type` and `status` as TEXT. `toCamelCase` passes them through.

If any function still references old enum column names or does explicit mapping, fix it.

**Acceptance criteria**: `npm run build` passes. No remaining references to old enum column names.

---

## Post-Sprint: What to Test

**IMPORTANT**: Charlie must run migration 006 in Supabase SQL Editor BEFORE testing locally.

### Material Library
1. Navigate to /materials → page loads without error toast
2. Add a new material with category "seed" → saves successfully
3. Add a material with category "paver" → saves successfully
4. Edit a material's category → saves correctly
5. Delete a material → removes from list
6. All three tabs (Inventory, Suppliers, Library) load content

### Equipment Manager
7. Navigate to /equipment → page loads without error toast
8. Add new equipment with type "truck" → saves successfully
9. Add equipment with status "in-use" → saves correctly
10. Edit equipment → saves correctly

### Work Orders
11. Navigate to /work-orders with active project → page loads

### Regression Checks
12. Dashboard loads, all widgets render
13. Schedule page: create, edit, drag-drop, equipment assignment all work
14. Projects page: list, detail, zones all work
15. Crew Manager: add/edit/delete works

---

## Commit Format

- `S16.5-1: Add migration 006 — replace enum columns with TEXT + CHECK`
- `S16.5-2: Update supabaseData column references for new schema`
- `S16.5-3: Verify and fix remaining CRUD operations`

## PR

```
"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --title "Sprint 16.5: Fix enum mismatch — replace DB enums with TEXT + CHECK" --body "Fixes the root cause of material/equipment create failures. DB enum values didn't match frontend TypeScript types. Migration 006 replaces all enum columns with TEXT + CHECK constraints that match frontend values exactly."
```
