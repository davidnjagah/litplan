/**
 * Run Migration Helper - Execute SQL migrations
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    const supabase = createServiceClient();

    // Add columns to GroupFlow table if they don't exist
    // We'll do this by trying to select from the table and checking for errors

    // First, check current columns by selecting a sample row
    const { data: sample, error: sampleError } = await supabase
      .from('GroupFlow')
      .select('id, costMin, costMax, planType, tags')
      .limit(1);

    if (sampleError) {
      // Columns might not exist, try to add them one by one
      const results: string[] = [];

      // Try adding costMin
      const { error: e1 } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE "GroupFlow" ADD COLUMN IF NOT EXISTS "costMin" INTEGER'
      }).single();
      results.push(`costMin: ${e1 ? e1.message : 'OK'}`);

      // Try adding costMax
      const { error: e2 } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE "GroupFlow" ADD COLUMN IF NOT EXISTS "costMax" INTEGER'
      }).single();
      results.push(`costMax: ${e2 ? e2.message : 'OK'}`);

      // Try adding planType
      const { error: e3 } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE "GroupFlow" ADD COLUMN IF NOT EXISTS "planType" TEXT'
      }).single();
      results.push(`planType: ${e3 ? e3.message : 'OK'}`);

      // Try adding tags
      const { error: e4 } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE "GroupFlow" ADD COLUMN IF NOT EXISTS "tags" TEXT[]'
      }).single();
      results.push(`tags: ${e4 ? e4.message : 'OK'}`);

      return jsonResponse({
        success: false,
        message: 'Columns may not exist, tried to add them',
        results,
        sampleError: sampleError.message
      });
    }

    return jsonResponse({
      success: true,
      message: 'All columns exist',
      sample: sample?.[0] || null
    });
  } catch (error) {
    console.error('[run-migration] Error:', error);
    return errorResponse(error.message, 500, 'SERVER_ERROR');
  }
});
