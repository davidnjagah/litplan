/**
 * GPT API Client (Railway port from Supabase shared module)
 * Node.js + global fetch, with 429 backoff respecting Retry-After header.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o';
const MAX_RETRIES = 4;
const PER_CALL_TIMEOUT_MS = 90_000; // 90s per OpenAI call, matches scaling doc

interface GPTMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GPTRequestOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  jsonMode?: boolean;
}

interface GPTResponse {
  id: string;
  choices: { message: { content: string } }[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function gptRequest(
  messages: { role: 'user' | 'assistant'; content: string }[],
  options: GPTRequestOptions = {}
): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');

  const {
    model = DEFAULT_MODEL,
    maxTokens = 4096,
    temperature = 0.7,
    systemPrompt,
    jsonMode = false,
  } = options;

  const allMessages: GPTMessage[] = [];
  if (systemPrompt) {
    const effective = jsonMode
      ? `${systemPrompt}\n\nIMPORTANT: You must respond with valid JSON only. No markdown, no explanation, just the JSON object.`
      : systemPrompt;
    allMessages.push({ role: 'system', content: effective });
  }
  for (const m of messages) allMessages.push({ role: m.role, content: m.content });

  const tokenParam = model.startsWith('gpt-5') ? 'max_completion_tokens' : 'max_tokens';
  const body: Record<string, unknown> = {
    model,
    [tokenParam]: maxTokens,
    temperature,
    messages: allMessages,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PER_CALL_TIMEOUT_MS);

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      // Respect 429 with Retry-After header + exponential backoff fallback
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const waitMs = retryAfter
          ? Math.min(parseInt(retryAfter, 10) * 1000, 30_000)
          : Math.min(1000 * Math.pow(2, attempt), 30_000);
        console.warn(`[gpt-client] 429 from OpenAI, waiting ${waitMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(waitMs);
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`GPT API ${response.status}: ${errorBody}`);
      }

      const data = await response.json() as GPTResponse;
      const content = data.choices[0]?.message?.content;
      if (!content) throw new Error('No content in GPT response');

      console.log(`[gpt-client] ${model} OK — ${data.usage.prompt_tokens} in / ${data.usage.completion_tokens} out`);
      return content;
    } catch (error) {
      clearTimeout(timer);
      lastError = error as Error;
      const isAbort = (error as Error).name === 'AbortError';
      console.error(`[gpt-client] Attempt ${attempt + 1} failed: ${isAbort ? 'timeout' : (error as Error).message}`);
      if (attempt < MAX_RETRIES - 1) await sleep(1000 * Math.pow(2, attempt));
    }
  }

  throw lastError || new Error('GPT API request failed after retries');
}

export function parseGPTJSON<T>(response: string): T {
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : response;
  try {
    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error('[gpt-client] Failed to parse JSON:', error);
    console.error('[gpt-client] Raw response:', response.substring(0, 500));
    throw new Error(`Failed to parse GPT response as JSON: ${(error as Error).message}`);
  }
}
