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
  model: string = DEFAULT_MODEL
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
      max_tokens: 1024,
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
