/**
 * Simple test function to verify Claude API connection
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

  if (!ANTHROPIC_API_KEY) {
    return errorResponse('ANTHROPIC_API_KEY not set', 500, 'CONFIG_ERROR');
  }

  console.log('[test-claude] API Key exists:', ANTHROPIC_API_KEY.substring(0, 10) + '...');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Say "Hello, World!" in JSON format: {"message": "..."}' }],
      }),
    });

    const status = response.status;
    const body = await response.text();

    console.log('[test-claude] Response status:', status);
    console.log('[test-claude] Response body:', body.substring(0, 500));

    if (!response.ok) {
      return jsonResponse({
        success: false,
        error: `Claude API error ${status}`,
        body: body,
      });
    }

    return jsonResponse({
      success: true,
      status,
      response: JSON.parse(body),
    });
  } catch (error) {
    const err = error as Error;
    console.error('[test-claude] Error:', err.message);
    return errorResponse(err.message, 500, 'API_ERROR');
  }
});
