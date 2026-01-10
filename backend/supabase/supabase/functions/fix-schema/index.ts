/**
 * Schema Fix - One-time function to fix database schema issues
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { getWeekdayFromDate, isWeekendDate } from '../_shared/date-utils.ts';

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    const supabase = createServiceClient();

    // Get supabase URL for direct postgres connection
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Execute raw SQL to alter the schema
    // Use the postgres REST endpoint
    const { data, error } = await supabase.rpc('alter_groupflowstep_planid');

    if (error) {
      // If RPC doesn't exist, we need to work around it
      // Instead, let's create a dummy plan and use it
      console.log('[fix-schema] RPC not available, creating dummy plan');

      // Create a dummy plan for AI-generated group flows
      const { data: dummyPlan, error: planError } = await supabase
        .from('Plan')
        .upsert({
          id: 'ai-generated-placeholder',
          title: 'AI Generated Activity',
          venueName: 'AI Generated',
          description: 'Placeholder for AI-generated group flow activities',
          category: 'activity',
          cityId: 'cmjrcg43r0000wbxrw025frc8', // NYC as default
          date: new Date().toISOString().split('T')[0],
          weekday: getWeekdayFromDate(new Date().toISOString().split('T')[0]),
          startTime: '20:00',
          endTime: '23:00',
          latitude: 0,
          longitude: 0,
          address: 'See GroupFlow for details',
          neighborhood: 'Various',
          priceRange: '$$',
          entryFee: 0,
          currency: 'USD',
          rank: 999,
          source: 'ai-agent',
          aiGenerated: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { onConflict: 'id' })
        .select()
        .single();

      if (planError) {
        console.error('[fix-schema] Failed to create dummy plan:', planError);
        return jsonResponse({
          success: false,
          error: planError.message,
          hint: 'You need to manually run: ALTER TABLE "GroupFlowStep" ALTER COLUMN "planId" DROP NOT NULL;'
        });
      }

      return jsonResponse({
        success: true,
        message: 'Created dummy plan for AI-generated activities',
        dummyPlanId: dummyPlan?.id || 'ai-generated-placeholder',
        hint: 'Update pipelines to use this planId for GroupFlowSteps'
      });
    }

    return jsonResponse({
      success: true,
      message: 'Schema updated successfully',
    });

  } catch (error) {
    console.error('[fix-schema] Error:', error);
    return errorResponse((error as Error).message, 500, 'SERVER_ERROR');
  }
});
