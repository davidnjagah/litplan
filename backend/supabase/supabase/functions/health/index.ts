/**
 * Health Check Edge Function
 * Simple health check endpoint
 *
 * Endpoints:
 * GET /health - Check API health
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse } from '../_shared/cors.ts';

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  return jsonResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    runtime: 'supabase-edge-functions',
  });
});
