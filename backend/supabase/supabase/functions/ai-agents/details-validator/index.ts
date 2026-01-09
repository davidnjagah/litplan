/**
 * Agent 2: Details Validator
 *
 * Reconfirms all details of generated group plans.
 * If details are incorrect, it searches to correct them.
 * If correction fails, it removes the group plan entirely.
 *
 * POST /ai-agents/details-validator
 * Body: { cityId, flowIds? }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../../_shared/cors.ts';
import { gptRequest, parseGPTJSON } from '../../_shared/gpt-client.ts';
import { createServiceClient } from '../../_shared/supabase-client.ts';

interface ValidationResult {
  flowId: string;
  title: string;
  isValid: boolean;
  issues: string[];
  corrections: Record<string, any>;
  removed: boolean;
}

interface AgentResult {
  cityId: string;
  totalProcessed: number;
  validated: number;
  corrected: number;
  removed: number;
  results: ValidationResult[];
}

const DETAILS_VALIDATOR_SYSTEM_PROMPT = `You are a meticulous quality assurance specialist for nightlife venue data.

Your task is to verify that venue details are ACCURATE and REAL:

1. VENUE EXISTENCE:
   - Is this a real venue that currently exists?
   - Is the venue name spelled correctly?
   - Is this venue known for nightlife/entertainment?

2. CATEGORY ACCURACY:
   - Is the venue correctly categorized (bar, club, jazz venue, etc.)?
   - Does the description match what the venue actually offers?

3. OPERATING HOURS:
   - Are the suggested times realistic for this venue type?
   - Do nightclubs actually open that late?
   - Do restaurants serve at those hours?

4. PRICING:
   - Is the estimated cost reasonable for this venue?
   - Does it account for typical spending (drinks, cover, food)?

5. GEOGRAPHIC CONSISTENCY:
   - Are the venues in the correct neighborhood?
   - Does the flow make geographic sense (not jumping across the city)?

For each plan, provide:
- isValid: true if ALL details are correct
- issues: list of specific problems found
- corrections: suggested fixes for each issue
- shouldRemove: true if the plan is fundamentally flawed and cannot be fixed

RESPOND IN JSON FORMAT.`;

const VALIDATE_PLAN_PROMPT = (plan: any, cityName: string) => `
Validate this group plan for ${cityName}:

PLAN: "${plan.title}"
DESCRIPTION: ${plan.description}

VENUES:
${plan.activities.map((a: any, i: number) => `
${i + 1}. ${a.venueName}
   Address: ${a.address}
   Time: ${a.startTime} (${a.duration} minutes)
   Description: ${a.description}
`).join('\n')}

ESTIMATED COST: ${plan.estimatedCost.min}-${plan.estimatedCost.max} ${plan.estimatedCost.currency}
DIFFICULTY: ${plan.difficulty}

VALIDATE:
1. Are all venues REAL and currently operating in ${cityName}?
2. Are the venue names spelled correctly?
3. Do the descriptions accurately describe what each venue offers?
4. Are the timings realistic for these venue types?
5. Is the cost estimate reasonable?
6. Does the geographic flow make sense?

Return JSON:
{
  "isValid": true/false,
  "issues": ["issue 1", "issue 2"],
  "corrections": {
    "venueName_1": "Corrected Name",
    "description_1": "Corrected description"
  },
  "shouldRemove": true/false,
  "reasoning": "Brief explanation"
}`;

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    const body = await req.json();
    const { cityId, cityName, flowIds, batchSize = 5 } = body;

    if (!cityId) {
      return errorResponse('cityId required', 400, 'BAD_REQUEST');
    }

    console.log(`[details-validator] Starting validation for ${cityName || cityId}`);

    const supabase = createServiceClient();
    const result: AgentResult = {
      cityId,
      totalProcessed: 0,
      validated: 0,
      corrected: 0,
      removed: 0,
      results: [],
    };

    // Get flows to validate
    let query = supabase
      .from('GroupFlow')
      .select('*')
      .eq('cityId', cityId)
      .eq('pipelineStep', 1) // Only validate step 1 (just generated)
      .eq('pipelineStatus', 'generated');

    if (flowIds && flowIds.length > 0) {
      query = query.in('id', flowIds);
    }

    const { data: flows, error: flowsError } = await query.limit(50);

    if (flowsError) {
      return errorResponse('Failed to fetch flows', 500, 'DATABASE_ERROR');
    }

    if (!flows || flows.length === 0) {
      return jsonResponse({
        success: true,
        message: 'No flows to validate',
        data: result,
      });
    }

    console.log(`[details-validator] Found ${flows.length} flows to validate`);

    // Process in batches
    for (let i = 0; i < flows.length; i += batchSize) {
      const batch = flows.slice(i, i + batchSize);

      for (const flow of batch) {
        try {
          const validationResult = await validateFlow(supabase, flow, cityName || 'Unknown');
          result.results.push(validationResult);
          result.totalProcessed++;

          if (validationResult.removed) {
            result.removed++;
          } else if (Object.keys(validationResult.corrections).length > 0) {
            result.corrected++;
          } else if (validationResult.isValid) {
            result.validated++;
          }

        } catch (error) {
          console.error(`[details-validator] Error validating ${flow.title}:`, error);
          result.results.push({
            flowId: flow.id,
            title: flow.title,
            isValid: false,
            issues: [(error as Error).message],
            corrections: {},
            removed: false,
          });
        }
      }

      // Small delay between batches
      if (i + batchSize < flows.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[details-validator] Complete: ${result.validated} valid, ${result.corrected} corrected, ${result.removed} removed`);

    return jsonResponse({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('[details-validator] Error:', error);
    return errorResponse((error as Error).message, 500, 'SERVER_ERROR');
  }
});

/**
 * Validate a single flow and apply corrections or remove
 */
async function validateFlow(
  supabase: any,
  flow: any,
  cityName: string
): Promise<ValidationResult> {
  // Get steps for this flow
  const { data: steps } = await supabase
    .from('GroupFlowStep')
    .select('*')
    .eq('flowId', flow.id)
    .order('stepNumber', { ascending: true });

  if (!steps || steps.length === 0) {
    // No steps = invalid flow, remove it
    await removeFlow(supabase, flow.id);
    return {
      flowId: flow.id,
      title: flow.title,
      isValid: false,
      issues: ['No activities found'],
      corrections: {},
      removed: true,
    };
  }

  // Build plan object for validation
  const planForValidation = {
    title: flow.title,
    description: flow.description,
    activities: steps.map((s: any) => ({
      venueName: s.venueName,
      address: s.address,
      startTime: s.startTime,
      duration: s.duration,
      description: s.description,
    })),
    estimatedCost: {
      min: Math.floor(flow.totalEstimate / 100),
      max: Math.ceil(flow.totalEstimate / 100 * 1.5),
      currency: flow.currency,
    },
    difficulty: flow.difficulty,
  };

  // Call GPT to validate
  const response = await gptRequest(
    [{ role: 'user', content: VALIDATE_PLAN_PROMPT(planForValidation, cityName) }],
    {
      systemPrompt: DETAILS_VALIDATOR_SYSTEM_PROMPT,
      temperature: 0.3, // Lower for more consistent validation
      maxTokens: 2048,
      jsonMode: true,
    }
  );

  const validation = parseGPTJSON<{
    isValid: boolean;
    issues: string[];
    corrections: Record<string, string>;
    shouldRemove: boolean;
    reasoning: string;
  }>(response);

  // Handle removal
  if (validation.shouldRemove) {
    await removeFlow(supabase, flow.id);
    return {
      flowId: flow.id,
      title: flow.title,
      isValid: false,
      issues: validation.issues,
      corrections: {},
      removed: true,
    };
  }

  // Apply corrections if any
  if (Object.keys(validation.corrections).length > 0) {
    await applyCorrections(supabase, flow.id, steps, validation.corrections);
  }

  // Update pipeline status
  await supabase
    .from('GroupFlow')
    .update({
      pipelineStep: 2,
      pipelineStatus: validation.isValid ? 'details_validated' : 'details_corrected',
      updatedAt: new Date().toISOString(),
    })
    .eq('id', flow.id);

  return {
    flowId: flow.id,
    title: flow.title,
    isValid: validation.isValid,
    issues: validation.issues,
    corrections: validation.corrections,
    removed: false,
  };
}

/**
 * Remove a flow and its steps
 */
async function removeFlow(supabase: any, flowId: string): Promise<void> {
  // Delete steps first
  await supabase
    .from('GroupFlowStep')
    .delete()
    .eq('flowId', flowId);

  // Delete flow
  await supabase
    .from('GroupFlow')
    .delete()
    .eq('id', flowId);

  console.log(`[details-validator] Removed flow: ${flowId}`);
}

/**
 * Apply corrections to flow steps
 */
async function applyCorrections(
  supabase: any,
  flowId: string,
  steps: any[],
  corrections: Record<string, string>
): Promise<void> {
  for (const [key, value] of Object.entries(corrections)) {
    // Parse key like "venueName_1" or "description_2"
    const match = key.match(/^(\w+)_(\d+)$/);
    if (!match) continue;

    const [, field, indexStr] = match;
    const index = parseInt(indexStr) - 1;

    if (index >= 0 && index < steps.length) {
      const step = steps[index];

      // Update the step
      await supabase
        .from('GroupFlowStep')
        .update({ [field]: value, updatedAt: new Date().toISOString() })
        .eq('id', step.id);

      console.log(`[details-validator] Corrected ${field} for step ${index + 1} in flow ${flowId}`);
    }
  }
}
