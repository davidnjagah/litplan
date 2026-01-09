/**
 * Plan Generator AI Agent
 * Generates nightlife/entertainment plans for cities using Claude
 *
 * Endpoints:
 * POST /ai-agents/plan-generator - Generate plans for a city
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../../_shared/cors.ts';
import { createServiceClient } from '../../_shared/supabase-client.ts';
import { generatePlanWithGPT } from '../../_shared/gpt-client.ts';
import { validatePlan, generatePlanId, isWeekend, GeneratedPlan } from '../../_shared/plan-schema.ts';
import { QUALITY_THRESHOLDS, RATE_LIMITS } from '../../_shared/quality-criteria.ts';
import { getCityById, CityInfo } from '../../_shared/city-list.ts';
import { GENERATOR_SYSTEM_PROMPT } from './prompts.ts';

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    const body = await req.json();
    const { cityId, date, count = 3 } = body;

    if (!cityId || !date) {
      return errorResponse('cityId and date required', 400, 'BAD_REQUEST');
    }

    // Get city info
    const city = getCityById(cityId);
    if (!city) {
      return errorResponse(`City not found: ${cityId}`, 404, 'NOT_FOUND');
    }

    const supabase = createServiceClient();

    // Generate plans
    const results = await generatePlansForCity(supabase, city, date, count);

    return jsonResponse({
      success: true,
      data: {
        cityId,
        date,
        generated: results.generated,
        approved: results.approved,
        rejected: results.rejected,
        plans: results.plans,
      },
    });
  } catch (error) {
    console.error('[plan-generator] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500, 'SERVER_ERROR');
  }
});

/**
 * Generate plans for a city on a specific date
 */
async function generatePlansForCity(
  supabase: any,
  city: CityInfo,
  date: string,
  count: number
): Promise<{
  generated: number;
  approved: number;
  rejected: number;
  plans: any[];
}> {
  const dayOfWeek = getDayOfWeek(date);
  const results = {
    generated: 0,
    approved: 0,
    rejected: 0,
    plans: [] as any[],
  };

  console.log(`[plan-generator] Generating ${count} plans for ${city.name} on ${dayOfWeek}, ${date}`);

  for (let i = 0; i < count; i++) {
    try {
      // Rate limiting delay
      if (i > 0) {
        await sleep(RATE_LIMITS.CLAUDE_CALL_DELAY_MS);
      }

      // Generate plan using GPT
      const generatedPlan = await generatePlanWithGPT(
        city.name,
        city.country,
        date,
        dayOfWeek,
        GENERATOR_SYSTEM_PROMPT
      );

      results.generated++;

      // Validate plan structure
      const validation = validatePlan(generatedPlan);
      if (!validation.isValid) {
        console.log(`[plan-generator] Plan validation failed:`, validation.errors);
        results.rejected++;
        continue;
      }

      // Add metadata
      const plan: GeneratedPlan = {
        ...generatedPlan,
        id: generatePlanId(city.id, date),
        cityId: city.id,
        cityName: city.name,
        images: [], // Will be populated later with image search
        aiGenerated: true,
        qualityScore: 0, // Will be set by QA agents
        generatedAt: new Date().toISOString(),
        schedule: {
          ...generatedPlan.schedule,
          date,
          dayOfWeek,
          isWeekend: isWeekend(dayOfWeek),
        },
        pricing: {
          ...generatedPlan.pricing,
          currency: city.currency,
        },
      };

      // Store plan in database
      const { data, error } = await supabase
        .from('Plan')
        .insert(plan)
        .select()
        .single();

      if (error) {
        console.error(`[plan-generator] Failed to store plan:`, error);
        results.rejected++;
        continue;
      }

      results.approved++;
      results.plans.push(data);

      console.log(`[plan-generator] Created plan: ${plan.title} (${plan.id})`);
    } catch (error) {
      console.error(`[plan-generator] Error generating plan ${i + 1}:`, error);
      results.rejected++;
    }
  }

  // Log agent execution
  await logAgentExecution(supabase, city.id, date, results);

  return results;
}

/**
 * Log agent execution to database
 */
async function logAgentExecution(
  supabase: any,
  cityId: string,
  date: string,
  results: { generated: number; approved: number; rejected: number }
): Promise<void> {
  try {
    await supabase.from('AIAgentLog').insert({
      agentType: 'generator',
      cityId,
      date,
      plansGenerated: results.generated,
      plansApproved: results.approved,
      plansRejected: results.rejected,
    });
  } catch (error) {
    console.error('[plan-generator] Failed to log execution:', error);
  }
}

/**
 * Get day of week from date string using UTC to prevent timezone errors
 * Prevents off-by-one-day errors that can occur with local time zones
 */
function getDayOfWeek(dateStr: string): string {
  // Use noon UTC to avoid timezone edge cases
  const date = new Date(dateStr + 'T12:00:00Z');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getUTCDay()];
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
