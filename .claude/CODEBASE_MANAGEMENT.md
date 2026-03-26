# TerrainForge — Codebase Management

## Guiding Principle
The codebase is an asset. It should get easier to extend over time, not harder. Every feature added should leave the code slightly cleaner than it found it — this is the "scout rule" applied to software.

## Before Adding a Feature
Ask these questions in order:
1. Does a function already exist in `src/lib/` that does 80% of this? Extend it.
2. Does a component already exist in `src/components/shared/` that handles this UI pattern? Reuse it.
3. Does this need a new store, or can it live in an existing one? Default to existing.
4. Does this require a new database table, or can it use an existing one with a JSONB field? Default to existing.

## Technical Debt Rules
Classify tech debt into three buckets:
- **Pay now:** Debt that will cause bugs or block the next sprint (fix before starting new work)
- **Pay soon:** Debt that slows down velocity (schedule in the next 1–2 sprints)
- **Accept:** Debt that has low impact and high cost to fix (document it, leave it)

When debt is identified, label it in comments: `// DEBT: [description] [pay-now|pay-soon|accept]`

## Refactor Triggers
Suggest a refactor sprint when any of these are true:
- The same type of bug has appeared 3+ times in the same module
- A new feature requires editing more than 6 existing files
- A component has grown beyond 300 lines
- A store action is duplicated across 2+ stores
- TypeScript errors are being suppressed instead of fixed

## Feature Integration Checklist
When wiring a new feature into the existing codebase:
- [ ] New types added to `src/types/index.ts` (not inline)
- [ ] New constants added to `src/lib/constants.ts`
- [ ] Store updated with new state shape and actions
- [ ] Supabase table/column identified or migration written
- [ ] Error and loading states handled
- [ ] Existing tests still pass (or updated if behavior changed)
- [ ] No new `any` types introduced
- [ ] Feature works without Supabase connection (offline mode)

## File Size Limits
These are soft limits — hitting them signals a conversation about splitting:
- Page component: 300 lines
- Shared component: 200 lines
- Store: 400 lines
- Service file: 500 lines
- Lib function file: 300 lines

## Dependency Management
- Don't add a dependency for something that takes <30 lines to write
- Before adding: check bundle size impact on bundlephobia.com
- Prefer well-maintained packages (>1M weekly downloads, updated in last 6 months)
- Lock major versions in package.json — don't use `*` or `^` for major versions of critical deps
- Current heavy deps to be aware of: @react-pdf/renderer (large), leaflet (medium), three.js (Phase 2, very large)

## The Dual-Mode Invariant
Every feature must work in both modes. If you break offline mode while adding Supabase sync, that's a regression, not a tradeoff. Test both paths:
1. With `VITE_SUPABASE_URL` set (online mode)
2. Without or with network disabled (offline mode — should fall back to localStorage)

## Store Evolution Pattern
When a store needs a new shape that's incompatible with the persisted version:
1. Increment the `version` field in the `persist` config
2. Add a `migrate` function to handle the old shape
3. Never delete fields from the persisted state without migration — this will break existing users

## Unused Code Policy
- Dead code gets deleted, not commented out
- If you're unsure something is dead, check git blame and ask before deleting
- `noUnusedLocals` and `noUnusedParameters` are intentionally off — turn them on when Phase 1 is stable

## Documentation Standard
- Public functions in `src/lib/` get a JSDoc comment with params and return value
- Complex business rules get an inline comment explaining the *why*, not the *what*
- New environment variables get added to `.env.example` immediately
- Database schema changes get documented in `supabase/README.md`
