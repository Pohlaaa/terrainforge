# TerrainForge — AI Integration Strategy

## Philosophy
AI in TerrainForge is not a chatbot tacked on. It's embedded reasoning that makes every workflow smarter without requiring the user to understand AI. The landscaper shouldn't know they're using Claude — they should just feel like the product is unusually smart.

## API Setup
- Service file: `src/services/anthropic.ts`
- API key: `VITE_ANTHROPIC_API_KEY` in `.env`
- Use the `claude-haiku-4-5-20251001` model for fast in-product features (price lookups, suggestions)
- Use `claude-sonnet-4-6` for reasoning-heavy tasks (project analysis, manifest review)
- Always stream responses for features with visible output — don't make users wait for a wall of text

## Existing AI Integration Points (stub → wire these)

### 1. Price Research Page
The user enters a material type and location. Claude searches for current regional supplier pricing and returns structured results.
```
Prompt pattern: "You are a materials cost estimator for landscaping projects in [location].
Research current retail and wholesale prices for [material]. Return: supplier name, unit,
price range (low/high), notes on seasonal variation. Format as JSON."
```

### 2. Crew Skill Suggestions
When adding a crew member, Claude suggests relevant certifications based on their role.
```
Prompt pattern: "For a [role] on a landscaping team, what certifications are most valuable?
Return top 5 as: cert name, issuing body, why it matters for this role."
```

### 3. Manifest Review
After generating a manifest, Claude reviews it for red flags — missing materials, unusual quantities, cost outliers.
```
Prompt pattern: "Review this landscaping project manifest: [JSON]. Flag: missing materials
for the described scope, quantities that seem high or low, cost items that appear miscategorized.
Return findings as: issue, severity (high/medium/low), suggestion."
```

## New AI Features to Build (Phase 1)

### 4. Project Estimate Assistant
User describes a project in plain text. Claude extracts zones, dimensions, material categories, and pre-populates the project form. This is the highest-value AI feature in Phase 1.
```
Prompt pattern: "Extract a structured landscaping project from this description: [text].
Return JSON matching the Project schema: name, client, zones (array with name, area_sqft,
perimeter_ft, materials array). Use your best estimates for any missing dimensions."
```

### 5. Inventory Alert Explainer
When an alert fires, Claude explains what it means and what to do about it in contractor-friendly language (no technical jargon).

### 6. Work Order Auto-Scheduler
Given a project, crew availability, and equipment schedule, Claude suggests an optimal task sequence and crew assignment. Inputs come from existing stores.

## AI Feature Implementation Pattern
All AI calls follow this structure:
```typescript
// src/services/anthropic.ts
export async function callClaude(prompt: string, model = 'claude-haiku-4-5-20251001') {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await response.json();
  return data.content[0].text;
}
```

## Cost Management
- Haiku for all real-time features (price: ~$0.001/request)
- Sonnet only for batch/async features (manifest review, estimate extraction)
- Cache AI results in localStorage for 24 hours — don't re-query the same material/location
- Rate limit to 10 requests/minute per org in the Supabase edge function layer (Phase 2)

## UX Rules for AI Features
- Never block the UI waiting for AI — use optimistic empty states, stream in results
- Show a subtle "AI-powered" indicator, not a chatbot interface
- Allow users to edit AI suggestions — they're starting points, not mandates
- If AI fails, degrade gracefully — show the form without pre-population, show manual lookup instead of price research
- Log AI feature usage to PostHog for each org — this data drives Phase 2 feature prioritization

## What AI Should NOT Do in TerrainForge
- Make financial commitments (billing, contracts, invoicing) — these are user-controlled
- Auto-submit work orders or manifests — always require user approval
- Store raw prompts or completions in Supabase — only store the structured output
