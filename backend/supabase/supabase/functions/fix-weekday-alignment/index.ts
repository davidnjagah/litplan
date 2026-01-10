/**
 * Fix Weekday Alignment - One-time data fix
 * Updates all Plan records to have the correct weekday based on their date
 *
 * POST /fix-weekday-alignment
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

    // Fetch all plans with date and weekday
    const { data: plans, error: fetchError } = await supabase
      .from('Plan')
      .select('id, date, weekday')
      .not('date', 'is', null);

    if (fetchError) {
      console.error('[fix-weekday] Fetch error:', fetchError);
      return errorResponse('Failed to fetch plans', 500, 'FETCH_ERROR');
    }

    const results = {
      total: plans?.length || 0,
      fixed: 0,
      alreadyCorrect: 0,
      noDate: 0,
      errors: [] as string[],
    };

    // Process each plan
    for (const plan of plans || []) {
      if (!plan.date) {
        results.noDate++;
        continue;
      }

      const correctWeekday = getWeekdayFromDate(plan.date);

      if (plan.weekday === correctWeekday) {
        results.alreadyCorrect++;
        continue;
      }

      // Update the weekday
      const { error: updateError } = await supabase
        .from('Plan')
        .update({
          weekday: correctWeekday,
          isWeekend: isWeekendDate(plan.date),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', plan.id);

      if (updateError) {
        results.errors.push(`${plan.id}: ${updateError.message}`);
      } else {
        results.fixed++;
        console.log(`[fix-weekday] Fixed ${plan.id}: ${plan.weekday} -> ${correctWeekday}`);
      }
    }

    // Also fix GroupFlow isWeekend if needed
    const { data: flows, error: flowFetchError } = await supabase
      .from('GroupFlow')
      .select('id, isWeekend');

    let flowsUpdated = 0;
    if (!flowFetchError && flows) {
      // For GroupFlows, we set isWeekend based on today's date for now
      // In the future, this should be based on the actual event date
      const todayIsWeekend = isWeekendDate(new Date().toISOString().split('T')[0]);

      // Note: GroupFlows intentionally have weekend/weekday designation
      // so we don't automatically "fix" them - they're designed this way
    }

    return jsonResponse({
      success: true,
      message: `Fixed ${results.fixed} plans out of ${results.total}`,
      results,
      flowsUpdated,
    });

  } catch (error) {
    console.error('[fix-weekday] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500, 'SERVER_ERROR');
  }
});
