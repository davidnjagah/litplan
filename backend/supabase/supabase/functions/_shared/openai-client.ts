/**
 * OpenAI API Client for AI Agents
 * Wrapper for OpenAI Chat Completions API
 */

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * OpenAI API message format
 */
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * OpenAI API request options
 */
interface OpenAIRequestOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  jsonMode?: boolean;
}

/**
 * OpenAI API response
 */
interface OpenAIResponse {
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
 * Make a request to OpenAI API with retry logic
 */
export async function openaiRequest(
  messages: OpenAIMessage[],
  options: OpenAIRequestOptions = {}
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

  // Build messages array with system prompt if provided
  const allMessages: OpenAIMessage[] = [];

  if (systemPrompt) {
    // Add JSON formatting instruction if jsonMode is enabled
    const effectiveSystemPrompt = jsonMode
      ? `${systemPrompt}\n\nIMPORTANT: You must respond with valid JSON only. No markdown, no explanation, just the JSON object.`
      : systemPrompt;
    allMessages.push({ role: 'system', content: effectiveSystemPrompt });
  } else if (jsonMode) {
    allMessages.push({
      role: 'system',
      content: 'IMPORTANT: You must respond with valid JSON only. No markdown, no explanation, just the JSON object.'
    });
  }

  allMessages.push(...messages);

  const requestBody: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: allMessages,
  };

  // Enable JSON mode if supported by model
  if (jsonMode && (model.includes('gpt-4') || model.includes('gpt-3.5-turbo'))) {
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

        // Handle rate limiting with exponential backoff
        if (response.status === 429) {
          console.warn(`[openai-client] Rate limited, attempt ${attempt + 1}`);
          if (attempt < MAX_RETRIES - 1) {
            await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
            continue;
          }
        }

        throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
      }

      const data: OpenAIResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No choices in OpenAI response');
      }

      const messageContent = data.choices[0].message?.content;

      if (!messageContent) {
        throw new Error('No content in OpenAI response');
      }

      console.log(`[openai-client] Request successful. Tokens: ${data.usage.prompt_tokens} in, ${data.usage.completion_tokens} out`);

      return messageContent;
    } catch (error) {
      lastError = error as Error;
      console.error(`[openai-client] Attempt ${attempt + 1} failed:`, error);

      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw lastError || new Error('OpenAI API request failed after retries');
}

/**
 * Parse JSON response from OpenAI with error handling
 */
export function parseOpenAIJSON<T>(response: string): T {
  // Try to extract JSON from markdown code blocks
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : response;

  try {
    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error('[openai-client] Failed to parse JSON:', error);
    console.error('[openai-client] Raw response:', response.substring(0, 500));
    throw new Error(`Failed to parse OpenAI response as JSON: ${(error as Error).message}`);
  }
}

/**
 * Generate structured output using OpenAI
 */
export async function generateWithOpenAI<T>(
  userPrompt: string,
  systemPrompt: string,
  options: Omit<OpenAIRequestOptions, 'systemPrompt' | 'jsonMode'> = {}
): Promise<T> {
  const response = await openaiRequest(
    [{ role: 'user', content: userPrompt }],
    {
      ...options,
      systemPrompt,
      jsonMode: true,
    }
  );

  return parseOpenAIJSON<T>(response);
}

/**
 * Chat completion with conversation history
 */
export async function chatCompletion(
  messages: OpenAIMessage[],
  options: OpenAIRequestOptions = {}
): Promise<string> {
  return openaiRequest(messages, options);
}

/**
 * Simple single-turn completion
 */
export async function simpleCompletion(
  prompt: string,
  options: OpenAIRequestOptions = {}
): Promise<string> {
  return openaiRequest(
    [{ role: 'user', content: prompt }],
    options
  );
}

/**
 * Generate embeddings using OpenAI
 */
export async function generateEmbedding(
  text: string,
  model: string = 'text-embedding-3-small'
): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      input: text,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI Embeddings API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { OPENAI_API_KEY, DEFAULT_MODEL };
