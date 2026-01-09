/**
 * Phase 2 Comms Specialist - Polish Group Plans with Compelling Copy
 *
 * Takes composed GroupFlows from the Group Composer and:
 * - Polishes titles to align with venue flow
 * - Generates bestFor tags
 * - Writes captivating descriptions
 * - Writes venue step descriptions
 *
 * Endpoints:
 * POST /ai-agents/phase2-comms-specialist - Polish group plans for a city
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { gptRequest, parseGPTJSON } from '../_shared/gpt-client.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import {
  VALID_BEST_FOR_TAGS,
  filterValidTags,
  DESCRIPTION_RULES,
  TITLE_RULES,
} from '../_shared/theme-config.ts';
import { QUALITY_THRESHOLDS_V2 } from '../_shared/quality-criteria.ts';
import { COMMS_SPECIALIST_SYSTEM_PROMPT, buildPolishPrompt } from './prompts.ts';

// Input GroupFlow from composer
interface GroupFlowInput {
  id: string;
  cityId: string;
  title: string;
  description?: string;
  theme: string;
  difficulty: string;
  totalDuration?: number;
  totalEstimate?: number;
  currency?: string;
  steps: {
    id: string;
    venueName: string;
    description?: string;
    duration?: number;
    stepNumber: number;
    transitionNote?: string;
    planId?: string;
  }[];
}

// Output polished content
interface PolishedContent {
  flowId: string;
  title: string;
  description: string;
  bestFor: string[];
  primaryTag: string;
  steps: {
    stepId: string;
    description: string;
  }[];
}

interface PolishResult {
  cityId: string;
  cityName: string;
  polishedFlows: PolishedContent[];
  totalPolished: number;
  processingTimeMs: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const {
      cityId,
      cityName,
      country,
      flows, // Optional: provide flows directly
      flowIds, // Optional: specific flow IDs to process
      yearWeek,
      storeResults = true,
    } = body;

    if (!cityId && !flows) {
      return errorResponse('cityId or flows array required', 400, 'BAD_REQUEST');
    }

    console.log(`[phase2-comms-specialist] Starting polish for ${cityName || cityId}`);

    // Get flows from database or use provided flows
    let groupFlows: GroupFlowInput[] = flows || [];

    if (!flows && cityId) {
      groupFlows = await fetchGroupFlows(cityId, yearWeek, flowIds);
    }

    if (groupFlows.length === 0) {
      return jsonResponse({
        success: true,
        message: 'No flows to polish',
        data: { polishedFlows: [], totalPolished: 0 },
      });
    }

    console.log(`[phase2-comms-specialist] Polishing ${groupFlows.length} group flows`);

    // Polish all flows
    const polishedFlows = await polishGroupFlows(
      groupFlows,
      cityName || 'the city',
      country || ''
    );

    console.log(`[phase2-comms-specialist] Polished ${polishedFlows.length} flows`);

    // Store results if requested
    let storedCount = 0;
    if (storeResults) {
      storedCount = await storePolishedContent(polishedFlows);
      console.log(`[phase2-comms-specialist] Updated ${storedCount} flows in database`);
    }

    const processingTimeMs = Date.now() - startTime;

    const result: PolishResult = {
      cityId: cityId || '',
      cityName: cityName || '',
      polishedFlows,
      totalPolished: polishedFlows.length,
      processingTimeMs,
    };

    return jsonResponse({
      success: true,
      data: result,
      stored: storeResults ? storedCount : 0,
    });
  } catch (error) {
    console.error('[phase2-comms-specialist] Error:', error);
    return errorResponse((error as Error).message, 500, 'SERVER_ERROR');
  }
});

/**
 * Fetch group flows from database
 */
async function fetchGroupFlows(
  cityId: string,
  yearWeek?: string,
  flowIds?: string[]
): Promise<GroupFlowInput[]> {
  const supabase = createServiceClient();

  // Fetch flows that need polishing
  // Note: Removed pipelineStatus filter as column doesn't exist in current schema
  let query = supabase
    .from('GroupFlow')
    .select('*')
    .eq('cityId', cityId)
    .eq('aiGenerated', true);

  // Note: yearWeek column doesn't exist in current schema, skip filter
  // if (yearWeek) {
  //   query = query.eq('yearWeek', yearWeek);
  // }

  if (flowIds && flowIds.length > 0) {
    query = query.in('id', flowIds);
  }

  const { data: flows, error: flowsError } = await query.limit(20);

  if (flowsError) {
    throw new Error(`Failed to fetch flows: ${flowsError.message}`);
  }

  if (!flows || flows.length === 0) {
    return [];
  }

  // Fetch steps for each flow
  const flowsWithSteps: GroupFlowInput[] = [];

  for (const flow of flows) {
    const { data: steps, error: stepsError } = await supabase
      .from('GroupFlowStep')
      .select('*')
      .eq('flowId', flow.id)
      .order('stepNumber', { ascending: true });

    if (stepsError) {
      console.error(`[phase2-comms-specialist] Error fetching steps for ${flow.id}:`, stepsError);
      continue;
    }

    flowsWithSteps.push({
      ...flow,
      steps: steps || [],
    });
  }

  return flowsWithSteps;
}

/**
 * Polish all group flows using GPT
 */
async function polishGroupFlows(
  flows: GroupFlowInput[],
  cityName: string,
  country: string
): Promise<PolishedContent[]> {
  // Process in batches to avoid token limits
  const batchSize = 5;
  const results: PolishedContent[] = [];

  for (let i = 0; i < flows.length; i += batchSize) {
    const batch = flows.slice(i, i + batchSize);
    const batchResults = await polishBatch(batch, cityName, country);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Polish a batch of flows
 */
async function polishBatch(
  flows: GroupFlowInput[],
  cityName: string,
  country: string
): Promise<PolishedContent[]> {
  const userPrompt = buildPolishPrompt(flows, cityName, country);

  const response = await gptRequest(
    [{ role: 'user', content: userPrompt }],
    {
      systemPrompt: COMMS_SPECIALIST_SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    }
  );

  const parsed = parseGPTJSON<{ polishedFlows: PolishedContent[] }>(response);
  const polished = parsed.polishedFlows || [];

  // Validate and fix tags
  const validated: PolishedContent[] = [];

  for (const flow of polished) {
    // Filter to valid tags only
    const validTags = filterValidTags(flow.bestFor);

    // Ensure we have at least 3 tags
    if (validTags.length < QUALITY_THRESHOLDS_V2.MIN_TAGS_PER_FLOW) {
      console.log(`[phase2-comms-specialist] Adding default tags for ${flow.flowId}`);
      validTags.push('friends');
      if (validTags.length < 3) validTags.push('party');
      if (validTags.length < 3) validTags.push('energetic');
    }

    // Validate primary tag
    const primaryTag = VALID_BEST_FOR_TAGS.includes(flow.primaryTag as any)
      ? flow.primaryTag
      : validTags[0];

    // Validate description length
    const descWords = flow.description.split(/\s+/).filter(Boolean).length;
    let description = flow.description;

    if (descWords > QUALITY_THRESHOLDS_V2.MAX_GROUP_DESCRIPTION_WORDS + 5) {
      // Truncate to target length
      description = flow.description
        .split(/\s+/)
        .slice(0, QUALITY_THRESHOLDS_V2.MAX_GROUP_DESCRIPTION_WORDS)
        .join(' ');
    }

    // Validate step descriptions
    const validatedSteps = flow.steps.map((step) => {
      const stepWords = step.description.split(/\s+/).filter(Boolean).length;
      let stepDesc = step.description;

      if (stepWords > QUALITY_THRESHOLDS_V2.MAX_STEP_DESCRIPTION_WORDS + 3) {
        stepDesc = step.description
          .split(/\s+/)
          .slice(0, QUALITY_THRESHOLDS_V2.MAX_STEP_DESCRIPTION_WORDS)
          .join(' ');
      }

      return {
        stepId: step.stepId,
        description: stepDesc,
      };
    });

    validated.push({
      flowId: flow.flowId,
      title: flow.title,
      description,
      bestFor: validTags.slice(0, QUALITY_THRESHOLDS_V2.MAX_TAGS_PER_FLOW),
      primaryTag,
      steps: validatedSteps,
    });
  }

  return validated;
}

/**
 * Store polished content back to database
 */
async function storePolishedContent(
  polishedFlows: PolishedContent[]
): Promise<number> {
  const supabase = createServiceClient();
  let storedCount = 0;

  for (const flow of polishedFlows) {
    try {
      // Update GroupFlow with polished content
      // Note: Only updating columns that exist in current schema
      const { error: flowError } = await supabase
        .from('GroupFlow')
        .update({
          title: flow.title,
          description: flow.description,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', flow.flowId);

      if (flowError) {
        console.error(`[phase2-comms-specialist] Error updating flow ${flow.flowId}:`, flowError);
        continue;
      }

      // Update step descriptions
      for (const step of flow.steps) {
        const { error: stepError } = await supabase
          .from('GroupFlowStep')
          .update({
            description: step.description,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', step.stepId);

        if (stepError) {
          console.error(`[phase2-comms-specialist] Error updating step ${step.stepId}:`, stepError);
        }
      }

      storedCount++;
    } catch (error) {
      console.error(`[phase2-comms-specialist] Error storing flow ${flow.flowId}:`, error);
    }
  }

  return storedCount;
}
