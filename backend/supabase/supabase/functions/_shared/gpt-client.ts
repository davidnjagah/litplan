/**
 * GPT API Client for AI Agents
 * Wrapper for OpenAI GPT-4 API
 */

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * GPT API message format
 */
interface GPTMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * GPT API request options
 */
interface GPTRequestOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  jsonMode?: boolean;
}

/**
 * GPT API response
 */
interface GPTResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Make a request to GPT API with retry logic
 */
export async function gptRequest(
  messages: { role: 'user' | 'assistant'; content: string }[],
  options: GPTRequestOptions = {}
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }

  const {
    model = DEFAULT_MODEL,
    maxTokens = 4096,
    temperature = 0.7,
    systemPrompt,
    jsonMode = false,
  } = options;

  // Build messages array with system prompt
  const allMessages: GPTMessage[] = [];

  if (systemPrompt) {
    const effectiveSystemPrompt = jsonMode
      ? `${systemPrompt}\n\nIMPORTANT: You must respond with valid JSON only. No markdown, no explanation, just the JSON object.`
      : systemPrompt;
    allMessages.push({ role: 'system', content: effectiveSystemPrompt });
  }

  // Add user/assistant messages
  for (const msg of messages) {
    allMessages.push({ role: msg.role, content: msg.content });
  }

  // gpt-5.x models use max_completion_tokens instead of max_tokens
  const tokenParam = model.startsWith('gpt-5') ? 'max_completion_tokens' : 'max_tokens';

  const requestBody: any = {
    model,
    [tokenParam]: maxTokens,
    temperature,
    messages: allMessages,
  };

  // Add JSON response format if requested
  if (jsonMode) {
    requestBody.response_format = { type: 'json_object' };
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`GPT API error ${response.status}: ${errorBody}`);
      }

      const data: GPTResponse = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content in GPT response');
      }

      console.log(`[gpt-client] Request successful. Tokens: ${data.usage.prompt_tokens} in, ${data.usage.completion_tokens} out`);

      return content;
    } catch (error) {
      lastError = error as Error;
      console.error(`[gpt-client] Attempt ${attempt + 1} failed:`, error);

      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw lastError || new Error('GPT API request failed after retries');
}

/**
 * Parse JSON response from GPT with error handling
 */
export function parseGPTJSON<T>(response: string): T {
  // Try to extract JSON from markdown code blocks
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

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a plan using GPT
 */
export async function generatePlanWithGPT(
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

  const response = await gptRequest(
    [{ role: 'user', content: userPrompt }],
    {
      systemPrompt,
      temperature: 0.8,
      maxTokens: 2048,
      jsonMode: true,
    }
  );

  return parseGPTJSON(response);
}

/**
 * Verify plan accuracy using GPT
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

  const response = await gptRequest(
    [{ role: 'user', content: userPrompt }],
    {
      systemPrompt,
      temperature: 0.3,
      maxTokens: 1024,
      jsonMode: true,
    }
  );

  return parseGPTJSON(response);
}

/**
 * Check plan content quality using GPT
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

  const response = await gptRequest(
    [{ role: 'user', content: userPrompt }],
    {
      systemPrompt,
      temperature: 0.3,
      maxTokens: 1024,
      jsonMode: true,
    }
  );

  return parseGPTJSON(response);
}

export { OPENAI_API_KEY, DEFAULT_MODEL };
