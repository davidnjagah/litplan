/**
 * QA Accuracy Agent
 * Verifies factual accuracy of generated plans
 *
 * Endpoints:
 * POST /ai-agents/qa-accuracy - Verify plan accuracy
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../../_shared/cors.ts';
import { createServiceClient } from '../../_shared/supabase-client.ts';
import { verifyPlanAccuracy } from '../../_shared/gpt-client.ts';
import { QUALITY_THRESHOLDS } from '../../_shared/quality-criteria.ts';
import { QA_ACCURACY_SYSTEM_PROMPT } from './prompts.ts';

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    const body = await req.json();
    const { planId, plan } = body;

    if (!planId && !plan) {
      return errorResponse('planId or plan object required', 400, 'BAD_REQUEST');
    }

    const supabase = createServiceClient();

    // Get plan from database if planId provided
    let planData = plan;
    if (planId && !plan) {
      const { data, error } = await supabase
        .from('Plan')
        .select('*')
        .eq('id', planId)
        .single();

      if (error) {
        return errorResponse('Plan not found', 404, 'NOT_FOUND');
      }
      planData = data;
    }

    // Verify plan accuracy using GPT
    const result = await verifyPlanAccuracy(planData, QA_ACCURACY_SYSTEM_PROMPT);

    // Update plan with accuracy score
    if (planId) {
      await supabase
        .from('Plan')
        .update({
          qualityScore: result.score,
          lastVerifiedAt: new Date().toISOString(),
        })
        .eq('id', planId);
    }

    // Log verification
    await logVerification(supabase, planData.cityId, planData.schedule?.date, result);

    return jsonResponse({
      success: true,
      data: {
        planId: planId || planData.id,
        score: result.score,
        issues: result.issues,
        verified: result.verified,
        passed: result.score >= QUALITY_THRESHOLDS.MINIMUM_ACCURACY_SCORE,
      },
    });
  } catch (error) {
    console.error('[qa-accuracy] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500, 'SERVER_ERROR');
  }
});

/**
 * Log verification to database
 */
async function logVerification(
  supabase: any,
  cityId: string,
  date: string,
  result: { score: number; verified: boolean }
): Promise<void> {
  try {
    await supabase.from('AIAgentLog').insert({
      agentType: 'qa-accuracy',
      cityId: cityId || 'unknown',
      date: date || new Date().toISOString().split('T')[0],
      plansGenerated: 1,
      plansApproved: result.verified ? 1 : 0,
      plansRejected: result.verified ? 0 : 1,
    });
  } catch (error) {
    console.error('[qa-accuracy] Failed to log verification:', error);
  }
}
