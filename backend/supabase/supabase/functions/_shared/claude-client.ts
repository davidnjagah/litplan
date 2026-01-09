/**
 * Claude API Client for AI Agents
 * Wrapper for Anthropic Claude API
 */

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514'; // Upgraded for high-quality group plan generation
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Claude API message format
 */
interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Claude API request options
 */
interface ClaudeRequestOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  jsonMode?: boolean;
}

/**
 * Claude API response
 */
interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: { type: string; text: string }[];
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Make a request to Claude API with retry logic
 */
export async function claudeRequest(
  messages: ClaudeMessage[],
  options: ClaudeRequestOptions = {}
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  const {
    model = DEFAULT_MODEL,
    maxTokens = 4096,
    temperature = 0.7,
    systemPrompt,
    jsonMode = false,
  } = options;

  // Add JSON formatting instruction if jsonMode is enabled
  const effectiveSystemPrompt = jsonMode
    ? `${systemPrompt || ''}\n\nIMPORTANT: You must respond with valid JSON only. No markdown, no explanation, just the JSON object.`
    : systemPrompt;

  const requestBody = {
    model,
    max_tokens: maxTokens,
    temperature,
    ...(effectiveSystemPrompt ? { system: effectiveSystemPrompt } : {}),
    messages,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Claude API error ${response.status}: ${errorBody}`);
      }

      const data: ClaudeResponse = await response.json();
      const textContent = data.content.find((c) => c.type === 'text');

      if (!textContent) {
        throw new Error('No text content in Claude response');
      }

      console.log(`[claude-client] Request successful. Tokens: ${data.usage.input_tokens} in, ${data.usage.output_tokens} out`);

      return textContent.text;
    } catch (error) {
      lastError = error as Error;
      console.error(`[claude-client] Attempt ${attempt + 1} failed:`, error);

      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw lastError || new Error('Claude API request failed after retries');
}

/**
 * Parse JSON response from Claude with error handling
 */
export function parseClaudeJSON<T>(response: string): T {
  // Try to extract JSON from markdown code blocks
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : response;

  try {
    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error('[claude-client] Failed to parse JSON:', error);
    console.error('[claude-client] Raw response:', response.substring(0, 500));
    throw new Error(`Failed to parse Claude response as JSON: ${(error as Error).message}`);
  }
}

/**
 * Generate a plan using Claude
 */
export async function generatePlanWithClaude(
  cityName: string,
  country: string,
  date: string,
  dayOfWeek: string,
  systemPrompt: string
): Promise<any> {
  const userPrompt = `Generate a detailed nightlife/entertainment plan for ${cityName}, ${country} on ${dayOfWeek}, ${date}.

Return a JSON object with the following structure:
{
  "title": "Engaging plan title",
  "venueName": "Actual venue name",
  "description": "Detailed description (minimum 100 words)",
  "category": "Category type",
  "location": {
    "address": "Full street address",
    "neighborhood": "Neighborhood name",
    "coordinates": { "latitude": 0.0, "longitude": 0.0 }
  },
  "schedule": {
    "date": "${date}",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "dayOfWeek": "${dayOfWeek}",
    "isWeekend": boolean
  },
  "pricing": {
    "entryFee": number,
    "priceRange": "$" | "$$" | "$$$" | "$$$$",
    "currency": "USD"
  },
  "aiTags": ["tag1", "tag2", "tag3"],
  "flags": {
    "isWeekendPlan": boolean,
    "requiresReservation": boolean,
    "ageRestriction": number or null
  }
}`;

  const response = await claudeRequest(
    [{ role: 'user', content: userPrompt }],
    {
      systemPrompt,
      temperature: 0.8,
      maxTokens: 2048,
      jsonMode: true,
    }
  );

  return parseClaudeJSON(response);
}

/**
 * Verify plan accuracy using Claude
 */
export async function verifyPlanAccuracy(
  plan: any,
  systemPrompt: string
): Promise<{ score: number; issues: string[]; verified: boolean }> {
  const userPrompt = `Verify the accuracy of this plan:

${JSON.stringify(plan, null, 2)}

Return a JSON object with:
{
  "score": number (0-100),
  "issues": ["issue1", "issue2"],
  "verified": boolean
}

Check:
1. Is the venue name plausible for this city?
2. Is the address format correct?
3. Is the pricing reasonable for this type of venue?
4. Are the times appropriate for the category?`;

  const response = await claudeRequest(
    [{ role: 'user', content: userPrompt }],
    {
      systemPrompt,
      temperature: 0.3,
      maxTokens: 1024,
      jsonMode: true,
    }
  );

  return parseClaudeJSON(response);
}

/**
 * Check plan content quality using Claude
 */
export async function checkPlanQuality(
  plan: any,
  systemPrompt: string
): Promise<{ score: number; issues: string[]; passed: boolean }> {
  const userPrompt = `Evaluate the content quality of this plan:

${JSON.stringify(plan, null, 2)}

Return a JSON object with:
{
  "score": number (0-100),
  "issues": ["issue1", "issue2"],
  "passed": boolean
}

Evaluate:
1. Description length (minimum 100 words, detailed)
2. Tags appropriateness
3. Uniqueness/originality
4. Cultural sensitivity
5. Information completeness`;

  const response = await claudeRequest(
    [{ role: 'user', content: userPrompt }],
    {
      systemPrompt,
      temperature: 0.3,
      maxTokens: 1024,
      jsonMode: true,
    }
  );

  return parseClaudeJSON(response);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { ANTHROPIC_API_KEY, DEFAULT_MODEL };
