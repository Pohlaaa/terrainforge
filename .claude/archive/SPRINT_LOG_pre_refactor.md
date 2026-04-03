# TerrainForge — Sprint Log

> **What this file is**: Charlie's product-eye-view of each sprint. After testing and passing a sprint, add a quick entry below. Cowork reads this during batch checkpoints to understand what felt right, what felt off, and what was discovered.
>
> **When to update**: After every sprint pass. Takes ~2 minutes.
> **When to read**: Every Cowork session opener (alongside CONTEXT.md and ROADMAP.md).
> **Archiving**: Cowork moves entries to `.claude/archive/sprint_log_archive.md` during batch checkpoints to keep this file short.
> **Previous entries**: Sprints 28-36 archived in Batch 4 (2026-03-31).

---

## Entry Template

Copy this block, fill it in, paste it below the line.

```

```

---

## Active Entries

### Sprint [37] — [3/31]
**Shipped**: Landing page
**Felt right**: Landing page looks and functions well
**Felt off**: Signing into accounts that previously had some data saved did not load, some got the onboarding workflow. Signing out goes back to login page, not landing page.
**Discovered I need**: No way to back out once onboarding workflow has begun without signing out
**Notes**: We should resolve the issue with lost data

### Sprint [38-40] — [3/31]
**Shipped**: Landing page
**Felt right**: Landing page functions well
**Felt off**: Brand new account already had some 'Get started' tasks complete. Initial sign up page asks for company name, so does onboarding workflow
**Discovered I need**: No way to back out once onboarding workflow has begun without completing it and signing out. Projects should be listed on the schedule with their timeline.
**Notes**: Did not test striple checkout flow.

### Sprint [41] — [3/31]
**Shipped**: Landing page and onboarding fixes
**Felt right**: Sign in and out flow, data loadings
**Felt off**: Going from manifest data to projects shows the old project menu. Sample data doesn't create zones or tasks
**Discovered I need**: N/A
**Notes**: N/A

### Sprint [42] — [3/31]
**Shipped**: Sample data and manifest updates
**Felt right**: Option for sample data didn't appear for existing accounts, only new accounts. Within a project with sample data: default overview and tasks look good. 
**Felt off**: 
For both existing and new accounts: dashboard widget layout carried over between accounts, was not stored per account. 

When viewing the projects cards/list, task completion does not match what is within the actual project

Within a project, materials tab says "No materials yet, add zones and materials to track costs here" but there is no zone tracking within each project 

Within a project, sample data for equipment states [sample], but then states the project description.

Sample data doesn't include crew scheduling. 

After clicking into a project in manifest engine, going back takes you to the main dashboard instead of the main manifest engine menu where I could pick a project from cards.

**Discovered I need**: N/A for this sprint
**Notes**: Found out that it makes sense to only have the option to load sample data for new accounts. One console error: createMaterial error: 
Object { code: "22007", details: null, hint: null, message: 'invalid input syntax for type timestamp with time zone: ""' }

Sprint 43 Results: PARTIAL (5 pass / 5 fail)
Passed: Sample data load (no errors), dashboard default layout, project cards task counts, Tasks tab, Materials tab

Failed: Resources tab, Schedule page, Manifest back nav, Widget persistence, Clear sample data

Sprint 44 Results: partial
8. Failed - back button went to schedule page 
9. Failed - custom layout not preserved

Sprint 44.5 Results: Partial
4. Failed - dashboard layouts not preserved, even on switching pages within the site without logging out
5. Failed - dashboard layouts not preserved, even on switching pages within the site without logging out

Sprint 44.6 Results: Partial
3. Failed - dashboard layouts not preserved
4. Failed - dashboard layouts not preserved