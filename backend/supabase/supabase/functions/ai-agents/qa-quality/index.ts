/**
 * QA Quality Agent
 * Evaluates content quality of generated plans
 *
 * Endpoints:
 * POST /ai-agents/qa-quality - Check plan quality
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../../_shared/cors.ts';
import { createServiceClient } from '../../_shared/supabase-client.ts';
import { checkPlanQuality } from '../../_shared/gpt-client.ts';
import { QUALITY_THRESHOLDS } from '../../_shared/quality-criteria.ts';
import { QA_QUALITY_SYSTEM_PROMPT } from './prompts.ts';

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

    // Check plan quality using GPT
    const result = await checkPlanQuality(planData, QA_QUALITY_SYSTEM_PROMPT);

    // Update plan quality score (combine with existing if available)
    if (planId) {
      const { data: existingPlan } = await supabase
        .from('Plan')
        .select('qualityScore')
        .eq('id', planId)
        .single();

      const existingScore = existingPlan?.qualityScore || 0;
      const combinedScore = Math.round((existingScore + result.score) / 2);

      await supabase
        .from('Plan')
        .update({
          qualityScore: combinedScore,
          lastVerifiedAt: new Date().toISOString(),
        })
        .eq('id', planId);
    }

    // Log quality check
    await logQualityCheck(supabase, planData.cityId, planData.schedule?.date, result);

    return jsonResponse({
      success: true,
      data: {
        planId: planId || planData.id,
        score: result.score,
        issues: result.issues,
        passed: result.passed && result.score >= QUALITY_THRESHOLDS.MINIMUM_CONTENT_SCORE,
      },
    });
  } catch (error) {
    console.error('[qa-quality] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500, 'SERVER_ERROR');
  }
});

/**
 * Log quality check to database
 */
async function logQualityCheck(
  supabase: any,
  cityId: string,
  date: string,
  result: { score: number; passed: boolean }
): Promise<void> {
  try {
    await supabase.from('AIAgentLog').insert({
      agentType: 'qa-quality',
      cityId: cityId || 'unknown',
      date: date || new Date().toISOString().split('T')[0],
      plansGenerated: 1,
      plansApproved: result.passed ? 1 : 0,
      plansRejected: result.passed ? 0 : 1,
    });
  } catch (error) {
    console.error('[qa-quality] Failed to log quality check:', error);
  }
}
