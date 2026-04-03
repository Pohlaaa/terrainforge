/**
 * Anthropic / Claude API client
 *
 * Calls the Claude API directly from the browser using VITE_ANTHROPIC_API_KEY.
 *
 * Phase 1 MVP note: Direct browser access is acceptable here because usage is
 * low and controlled. For production scale, proxy through a Supabase Edge
 * Function to keep the key server-side and add per-org rate limiting.
 * See .claude/AI_PRODUCT.md for model selection guidelines and cost targets.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

interface AnthropicErrorBody {
  error?: { message?: string };
}

interface AnthropicSuccessBody {
  content: Array<{ type: string; text: string }>;
}

/**
 * Send a single-turn prompt to Claude and return the text response.
 *
 * @param prompt  The user message.
 * @param model   Model ID — defaults to claude-haiku-4-5-20251001 (fast, ~$0.001/req).
 * @returns       The assistant's text response.
 * @throws        Error on missing API key, network failure, or non-2xx response.
 */
export async function callClaude(
  prompt: string,
  model: string = DEFAULT_MODEL,
  maxTokens: number = 1024
): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

  if (!apiKey) {
    throw new Error(
      'VITE_ANTHROPIC_API_KEY is not set. Add it to your .env.local file to enable AI features.'
    );
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      // Required for direct browser access — see Anthropic CORS docs
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    let message = `Anthropic API error ${response.status}`;
    try {
      const body = (await response.json()) as AnthropicErrorBody;
      if (body.error?.message) message = body.error.message;
    } catch {
      // ignore JSON parse failure — use status code message
    }
    throw new Error(message);
  }

  const data = (await response.json()) as AnthropicSuccessBody;
  const textBlock = data.content.find((b) => b.type === 'text');

  if (!textBlock) {
    throw new Error('No text content in Claude response');
  }

  return textBlock.text;
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
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (!apiKey) return null;

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
    const raw = await callClaude(prompt, 'claude-haiku-4-5-20251001');
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
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (!apiKey) return null;

  const prompt = `You are a landscaping site analyst. Given a project address and coordinates, infer likely site conditions.

Address: "${opts.address}"
Coordinates: ${opts.lat}, ${opts.lng}
${opts.existingConditions ? `User-entered conditions: "${opts.existingConditions}"` : ''}

Return JSON matching this schema exactly:
{
  "climateZone": string or null,
  "soilType": string or null,
  "permitRequirements": string[],
  "hoaLikelihood": "low" | "medium" | "high"
}

Rules:
- climateZone: USDA hardiness zone (e.g., "7b", "8a", "9b"). Infer from latitude.
- soilType: Most common soil type for the region (e.g., "Clay", "Sandy loam", "Silt loam"). Be specific to the geographic region.
- permitRequirements: Array of likely permit types needed for landscaping in this area. Use these keys: "grading", "building", "electrical", "plumbing", "stormwater", "tree_removal", "fence", "parking". Only include permits that are commonly required in this jurisdiction.
- hoaLikelihood: Based on the neighborhood type — suburban subdivisions = "high", rural = "low", urban mixed = "medium".
- Always return valid JSON with no markdown fencing`;

  try {
    const raw = await callClaude(prompt, 'claude-haiku-4-5-20251001');
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned) as AISiteInference;
  } catch {
    return null;
  }
}

// ── AI Smart Project Creation ─────────────────────────────────────────────────

export interface AIProjectSuggestion {
  name: string;
  address: string;
  totalAreaSqft: number;
  budget: number;
  startDate: string | null;
  targetDate: string | null;
  notes: string;
  suggestedMaterials: Array<{ name: string; estimatedQuantity: number; unit: string }>;
  checklistSuggestions: {
    permit: boolean;
    utility: boolean;
    deposit: boolean;
    design: boolean;
    access: boolean;
    materials: boolean;
    crew: boolean;
    equipment: boolean;
  };
}

/**
 * Parse a natural-language project description into structured project data.
 * Uses Haiku for speed and low cost (~$0.001/call).
 * Returns null if the API key is missing or the response is not valid JSON.
 */
export async function generateProjectFromDescription(
  description: string
): Promise<AIProjectSuggestion | null> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (!apiKey) return null;

  const prompt = `You are a project estimator for a landscaping and contracting company.
Parse this project description and return structured JSON.

Description: "${description}"

Return JSON matching this schema exactly:
{
  "name": string,
  "address": string,
  "totalAreaSqft": number,
  "budget": number,
  "startDate": string or null,
  "targetDate": string or null,
  "notes": string,
  "suggestedMaterials": [{ "name": string, "estimatedQuantity": number, "unit": string }],
  "checklistSuggestions": {
    "permit": boolean,
    "utility": boolean,
    "deposit": boolean,
    "design": boolean,
    "access": boolean,
    "materials": boolean,
    "crew": boolean,
    "equipment": boolean
  }
}

Rules:
- name: short descriptive project name (e.g. "Oak St Sod Installation")
- address: extracted address string, or "" if not mentioned
- totalAreaSqft: numeric area estimate, 0 if not mentioned
- budget: estimated total cost in dollars (not cents), 0 if not mentioned
- startDate / targetDate: ISO date string (YYYY-MM-DD) or null
- suggestedMaterials: 2-5 likely materials with realistic quantities
- checklistSuggestions: set permit=true for hardscape/large installs, utility=true if digging involved
- Always return valid JSON with no markdown fencing`;

  try {
    const raw = await callClaude(prompt, 'claude-haiku-4-5-20251001');
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned) as AIProjectSuggestion;
  } catch {
    return null;
  }
}
