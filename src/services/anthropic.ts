/**
 * Anthropic / Claude API client
 *
 * Sprint S: Calls go through the `proxy-claude` Supabase Edge Function so the
 * Anthropic API key stays server-side. The function authenticates the caller
 * via Supabase JWT and rate-limits per org.
 *
 * Pre-Sprint-S behavior (direct fetch with VITE_ANTHROPIC_API_KEY) has been
 * removed — that key was being shipped to every browser. Rotate it after
 * deploy: https://console.anthropic.com/settings/keys
 *
 * See .claude/AI_PRODUCT.md for model selection guidelines and cost targets.
 */

import { supabase } from '@/services/supabase';

export const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

interface ProxyResponseBody {
  content?: Array<{ type: string; text: string }>;
  error?: string;
}

/**
 * Send a single-turn prompt to Claude (via the proxy-claude Edge Function)
 * and return the text response.
 *
 * @param prompt    The user message.
 * @param model     Model ID — defaults to claude-haiku-4-5-20251001.
 * @param maxTokens Max output tokens. Capped at 8192 by the proxy.
 * @returns         The assistant's text response.
 * @throws          Error on auth failure, rate limit, or upstream failure.
 */
export async function callClaude(
  prompt: string,
  model: string = DEFAULT_MODEL,
  maxTokens: number = 1024
): Promise<string> {
  const { data, error } = await supabase.functions.invoke<ProxyResponseBody>(
    'proxy-claude',
    {
      body: { prompt, model, max_tokens: maxTokens },
    },
  );

  if (error) {
    // FunctionsHttpError carries an upstream response body — try to surface it.
    let message = error.message || 'AI request failed';
    const ctx = (error as unknown as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = (await ctx.json()) as ProxyResponseBody;
        if (body?.error) message = body.error;
      } catch {
        /* ignore */
      }
    }
    throw new Error(message);
  }

  if (!data?.content) {
    throw new Error('No content in proxy response');
  }

  const textBlock = data.content.find((b) => b.type === 'text');
  if (!textBlock) {
    throw new Error('No text content in Claude response');
  }
  return textBlock.text;
}

/**
 * Sprint S: lightweight feature-flag helper. The proxy needs an authenticated
 * Supabase session, so AI features should hide when no user is signed in.
 * Replaces the prior `import.meta.env.VITE_ANTHROPIC_API_KEY` truthy checks
 * scattered across services.
 */
export async function isAIAvailable(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

// ── AI Wizard: Task Generation ────────────────────────────────────────────────

export interface AIGeneratedTask {
  name: string;
  phase: string;
  estimatedHours: number;
  description: string;
}

/**
 * Generate a task breakdown from a project description.
 * Returns an array of tasks grouped by phase.
 */
export async function generateTasksFromDescription(opts: {
  description: string;
  projectType: string | null;
  scopeSize: string | null;
  propertyType: string | null;
}): Promise<AIGeneratedTask[] | null> {
  const prompt = `You are an experienced landscaping project estimator. Given a project description, generate a detailed task breakdown.

Project description: "${opts.description}"
${opts.projectType ? `Project type: ${opts.projectType}` : ''}
${opts.scopeSize ? `Scope size: ${opts.scopeSize}` : ''}
${opts.propertyType ? `Property type: ${opts.propertyType}` : ''}

Return a JSON array of tasks. Each task must have:
- "name": short task name (e.g., "Remove existing pavers")
- "phase": one of: "demo_prep", "rough_grade", "hardscape", "softscape", "irrigation", "lighting", "cleanup_punchlist"
- "estimatedHours": realistic hour estimate for a crew
- "description": one-sentence description of the work

Rules:
- Generate 6-15 tasks depending on project scope
- Group tasks in logical phase order (demo_prep first, cleanup_punchlist last)
- Use realistic hour estimates for a professional landscaping crew
- Only include phases relevant to the project description
- Always return valid JSON array with no markdown fencing`;

  try {
    const raw = await callClaude(prompt, DEFAULT_MODEL);
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned) as AIGeneratedTask[];
  } catch {
    return null;
  }
}

// ── AI Wizard: Site Condition Inference ───────────────────────────────────────

export interface AISiteInference {
  climateZone: string | null;
  soilType: string | null;
  permitRequirements: string[];
  hoaLikelihood: 'low' | 'medium' | 'high';
  permitZone: string | null;
}

/**
 * Infer site conditions from an address and coordinates.
 */
export async function inferSiteConditions(opts: {
  address: string;
  lat: number;
  lng: number;
  existingConditions?: string;
}): Promise<AISiteInference | null> {
  const prompt = `You are a landscaping site analyst. Given a project address and coordinates, infer likely site conditions.

Address: "${opts.address}"
Coordinates: ${opts.lat}, ${opts.lng}
${opts.existingConditions ? `User-entered conditions: "${opts.existingConditions}"` : ''}

Return JSON matching this schema exactly:
{
  "climateZone": string or null,
  "soilType": string or null,
  "permitRequirements": string[],
  "hoaLikelihood": "low" | "medium" | "high",
  "permitZone": string or null
}

Rules:
- climateZone: USDA hardiness zone (e.g., "7b", "8a", "9b"). Infer from latitude.
- soilType: Most common soil type for the region (e.g., "Clay", "Sandy loam", "Silt loam"). Be specific to the geographic region.
- permitRequirements: Array of likely permit types needed for landscaping in this area. Use these keys: "grading", "building", "electrical", "plumbing", "stormwater", "tree_removal", "fence", "parking". Only include permits that are commonly required in this jurisdiction.
- hoaLikelihood: Based on the neighborhood type — suburban subdivisions = "high", rural = "low", urban mixed = "medium".
- permitZone: The city or county jurisdiction name for permitting purposes (e.g., "City of Austin", "Harris County", "Unincorporated Maricopa County"). Infer from the address.
- Always return valid JSON with no markdown fencing`;

  try {
    const raw = await callClaude(prompt, DEFAULT_MODEL);
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned) as AISiteInference;
  } catch {
    return null;
  }
}
