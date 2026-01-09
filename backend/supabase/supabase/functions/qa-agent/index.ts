/**
 * QA Agent - Combined accuracy and quality validation
 * Validates plans in a single pass for efficiency
 *
 * Endpoints:
 * POST /ai-agents/qa-agent - Validate a single plan or batch
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { claudeRequest, parseClaudeJSON } from '../_shared/claude-client.ts';
import { QUALITY_THRESHOLDS, RATE_LIMITS } from '../_shared/quality-criteria.ts';
import { QA_AGENT_SYSTEM_PROMPT, QA_EVALUATION_PROMPT, BATCH_QA_PROMPT } from './prompts.ts';

// Types for QA results
interface QAScore {
  venuePlausibility: number;
  addressFormat: number;
  pricingReasonableness: number;
  scheduleValidity: number;
  locationConsistency: number;
  overall: number;
}

interface QualityScore {
  descriptionDepth: number;
  descriptionEngagement: number;
  tagRelevance: number;
  informationCompleteness: number;
  culturalSensitivity: number;
  overall: number;
}

interface QAResult {
  accuracyScore: QAScore;
  qualityScore: QualityScore;
  overallScore: number;
  passed: boolean;
  issues: string[];
  suggestions: string[];
}

interface BatchEvaluation {
  planIndex: number;
  venueName: string;
  accuracyScore: number;
  qualityScore: number;
  overallScore: number;
  passed: boolean;
  issues: string[];
}

interface BatchQAResult {
  evaluations: BatchEvaluation[];
  summary: {
    totalPlans: number;
    passed: number;
    failed: number;
    averageScore: number;
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    const body = await req.json();
    const { plan, plans, mode = 'single' } = body;

    if (mode === 'batch' && plans && Array.isArray(plans)) {
      // Batch evaluation mode
      const result = await evaluateBatch(plans);
      return jsonResponse({
        success: true,
        mode: 'batch',
        data: result,
      });
    } else if (plan) {
      // Single plan evaluation
      const result = await evaluatePlan(plan);
      return jsonResponse({
        success: true,
        mode: 'single',
        data: result,
      });
    } else {
      return errorResponse('plan or plans required', 400, 'BAD_REQUEST');
    }
  } catch (error) {
    console.error('[qa-agent] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500, 'SERVER_ERROR');
  }
});

/**
 * Evaluate a single plan
 */
async function evaluatePlan(plan: any): Promise<QAResult> {
  console.log(`[qa-agent] Evaluating plan: ${plan.venueName || plan.title}`);

  try {
    const userPrompt = QA_EVALUATION_PROMPT(plan);

    const response = await claudeRequest(
      [{ role: 'user', content: userPrompt }],
      {
        systemPrompt: QA_AGENT_SYSTEM_PROMPT,
        temperature: 0.3,
        maxTokens: 2048,
        jsonMode: true,
      }
    );

    const result = parseClaudeJSON<QAResult>(response);

    // Ensure we have a valid result structure
    const qaResult: QAResult = {
      accuracyScore: result.accuracyScore || {
        venuePlausibility: 0,
        addressFormat: 0,
        pricingReasonableness: 0,
        scheduleValidity: 0,
        locationConsistency: 0,
        overall: 0,
      },
      qualityScore: result.qualityScore || {
        descriptionDepth: 0,
        descriptionEngagement: 0,
        tagRelevance: 0,
        informationCompleteness: 0,
        culturalSensitivity: 0,
        overall: 0,
      },
      overallScore: result.overallScore || 0,
      passed: result.overallScore >= QUALITY_THRESHOLDS.MINIMUM_QUALITY_SCORE,
      issues: result.issues || [],
      suggestions: result.suggestions || [],
    };

    console.log(`[qa-agent] ${plan.venueName}: Score ${qaResult.overallScore}, Passed: ${qaResult.passed}`);

    return qaResult;
  } catch (error) {
    console.error('[qa-agent] Error evaluating plan:', error);
    throw error;
  }
}

/**
 * Evaluate a batch of plans
 */
async function evaluateBatch(plans: any[]): Promise<BatchQAResult> {
  console.log(`[qa-agent] Evaluating batch of ${plans.length} plans`);

  // For large batches, chunk and process
  const BATCH_SIZE = 5;
  const evaluations: BatchEvaluation[] = [];

  for (let i = 0; i < plans.length; i += BATCH_SIZE) {
    const chunk = plans.slice(i, i + BATCH_SIZE);

    // Rate limiting delay between batches
    if (i > 0) {
      await sleep(RATE_LIMITS.CLAUDE_CALL_DELAY_MS);
    }

    try {
      const userPrompt = BATCH_QA_PROMPT(chunk);

      const response = await claudeRequest(
        [{ role: 'user', content: userPrompt }],
        {
          systemPrompt: QA_AGENT_SYSTEM_PROMPT,
          temperature: 0.3,
          maxTokens: 4096,
          jsonMode: true,
        }
      );

      const result = parseClaudeJSON<{ evaluations: BatchEvaluation[] }>(response);

      // Add offset to plan indices
      const offsetEvaluations = (result.evaluations || []).map((eval) => ({
        ...eval,
        planIndex: eval.planIndex + i,
        passed: eval.overallScore >= QUALITY_THRESHOLDS.MINIMUM_QUALITY_SCORE,
      }));

      evaluations.push(...offsetEvaluations);
    } catch (error) {
      console.error(`[qa-agent] Error evaluating batch chunk ${i}:`, error);
      // Add failed evaluations for this chunk
      chunk.forEach((plan, idx) => {
        evaluations.push({
          planIndex: i + idx,
          venueName: plan.venueName || 'Unknown',
          accuracyScore: 0,
          qualityScore: 0,
          overallScore: 0,
          passed: false,
          issues: ['Evaluation failed'],
        });
      });
    }
  }

  // Calculate summary
  const passedCount = evaluations.filter((e) => e.passed).length;
  const averageScore =
    evaluations.length > 0
      ? Math.round(evaluations.reduce((sum, e) => sum + e.overallScore, 0) / evaluations.length)
      : 0;

  const result: BatchQAResult = {
    evaluations,
    summary: {
      totalPlans: plans.length,
      passed: passedCount,
      failed: plans.length - passedCount,
      averageScore,
    },
  };

  console.log(
    `[qa-agent] Batch complete: ${passedCount}/${plans.length} passed, avg score: ${averageScore}`
  );

  return result;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
