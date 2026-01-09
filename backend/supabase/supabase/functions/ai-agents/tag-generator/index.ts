/**
 * Tag Generator Agent - 7th AI Agent for Group Plan Pipeline
 *
 * Analyzes group plans and generates appropriate bestFor tags
 * based on the plan context, venues, and overall experience.
 *
 * Endpoints:
 * POST /ai-agents/tag-generator - Generate tags for a group plan
 *
 * Modes:
 * - Single: Pass { plan: {...} } to generate tags for a single plan
 * - Batch: Pass { cityId, cityName, mode: 'batch' } to process all flows for a city
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../../_shared/cors.ts';
import { gptRequest, parseGPTJSON } from '../../_shared/gpt-client.ts';
import { createServiceClient } from '../../_shared/supabase-client.ts';
import { TAG_GENERATOR_SYSTEM_PROMPT, TAG_GENERATOR_USER_PROMPT } from './prompts.ts';

// Available tags for group plans
export const VALID_TAGS = [
  // Relationship-based tags
  'couples',
  'romantic',
  'date_night',
  'anniversary',

  // Friend group tags
  'friends',
  'squad',
  'reunion',
  'birthday',

  // Gendered group tags
  'girls_nightout',
  'girls_trip',
  'bachelorette',
  'boys_night',
  'bachelor',
  'stag',

  // Experience-based tags
  'adventure',
  'thrill_seekers',
  'cultural',
  'artsy',
  'sophisticated',
  'foodie',
  'culinary',

  // Vibe-based tags
  'party',
  'wild',
  'clubbing',
  'chill',
  'relaxed',
  'low_key',
  'energetic',

  // Occasion tags
  'vip',
  'luxury',
  'exclusive',
  'celebration',

  // Practical tags
  'budget_friendly',
  'affordable',
  'instagram_worthy',
  'photogenic',
  'late_night',
  'early_evening',
];

interface Activity {
  venueName: string;
  address?: string;
  description?: string;
  category?: string;
  startTime?: string;
  duration?: number;
}

interface GroupPlanInput {
  title: string;
  description: string;
  planType?: string;
  activities?: Activity[];
  venues?: { name: string; category: string; description?: string }[];
  theme?: string;
  difficulty?: string;
  estimatedCost?: { min: number; max: number; currency: string };
  totalDuration?: number;
}

interface TagGeneratorResult {
  tags: string[];
  primaryTag: string;
  reasoning: string;
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
    const { plan, maxTags = 5, mode, cityId, cityName, flowIds } = body;

    // Batch mode: process all GroupFlows for a city
    if (mode === 'batch' && cityId) {
      return await processBatchMode(cityId, cityName, flowIds, maxTags);
    }

    // Single mode: process a single plan
    if (!plan || !plan.title) {
      return errorResponse('plan with title required (or use mode: batch with cityId)', 400, 'BAD_REQUEST');
    }

    console.log(`[tag-generator] Processing: "${plan.title}"`);

    // Normalize venues from different input formats
    const normalizedVenues = normalizeVenues(plan);

    const userPrompt = TAG_GENERATOR_USER_PROMPT(
      {
        ...plan,
        venues: normalizedVenues,
      },
      VALID_TAGS,
      maxTags
    );

    const response = await gptRequest(
      [{ role: 'user', content: userPrompt }],
      {
        systemPrompt: TAG_GENERATOR_SYSTEM_PROMPT,
        temperature: 0.5,
        maxTokens: 1024,
        jsonMode: true,
      }
    );

    const result = parseGPTJSON<TagGeneratorResult>(response);

    // Validate tags against allowed list
    const validatedTags = result.tags
      .filter((tag) => VALID_TAGS.includes(tag))
      .slice(0, maxTags);

    // Ensure primaryTag is valid
    const primaryTag = VALID_TAGS.includes(result.primaryTag)
      ? result.primaryTag
      : validatedTags[0] || 'friends';

    console.log(
      `[tag-generator] Generated tags for "${plan.title}": ${validatedTags.join(', ')} (primary: ${primaryTag})`
    );

    return jsonResponse({
      success: true,
      data: {
        tags: validatedTags,
        primaryTag,
        bestFor: validatedTags,
        reasoning: result.reasoning,
      },
    });
  } catch (error) {
    console.error('[tag-generator] Error:', error);
    return errorResponse((error as Error).message, 500, 'SERVER_ERROR');
  }
});

/**
 * Process batch mode - fetch and tag all GroupFlows for a city
 */
async function processBatchMode(
  cityId: string,
  cityName: string,
  flowIds: string[] | undefined,
  maxTags: number
): Promise<Response> {
  console.log(`[tag-generator] Batch mode for ${cityName || cityId}`);

  const supabase = createServiceClient();

  // Get flows at step 6 (comms_enhanced) or approved
  let query = supabase
    .from('GroupFlow')
    .select('*')
    .eq('cityId', cityId)
    .in('pipelineStep', [5, 6])
    .in('pipelineStatus', ['approved', 'comms_enhanced', 'needs_revision']);

  if (flowIds && flowIds.length > 0) {
    query = query.in('id', flowIds);
  }

  const { data: flows, error: flowsError } = await query.limit(30);

  if (flowsError) {
    return errorResponse('Failed to fetch flows', 500, 'DATABASE_ERROR');
  }

  if (!flows || flows.length === 0) {
    return jsonResponse({
      success: true,
      message: 'No flows to tag',
      data: { plansTagged: 0, results: [] },
    });
  }

  console.log(`[tag-generator] Found ${flows.length} flows to tag`);

  const results: { flowId: string; title: string; tags: string[]; primaryTag: string }[] = [];
  let plansTagged = 0;

  for (const flow of flows) {
    try {
      // Get steps for this flow
      const { data: steps } = await supabase
        .from('GroupFlowStep')
        .select('venueName, description')
        .eq('flowId', flow.id)
        .order('stepNumber', { ascending: true });

      // Build plan object for tag generation
      const planForTagging: GroupPlanInput = {
        title: flow.title,
        description: flow.description,
        theme: flow.theme,
        difficulty: flow.difficulty,
        estimatedCost: {
          min: Math.floor((flow.totalEstimate || 0) / 100),
          max: Math.ceil((flow.totalEstimate || 0) / 100 * 1.5),
          currency: flow.currency || 'USD',
        },
        venues: (steps || []).map((s: any) => ({
          name: s.venueName,
          category: 'venue',
          description: s.description,
        })),
      };

      // Generate tags
      const userPrompt = TAG_GENERATOR_USER_PROMPT(planForTagging, VALID_TAGS, maxTags);

      const response = await gptRequest(
        [{ role: 'user', content: userPrompt }],
        {
          systemPrompt: TAG_GENERATOR_SYSTEM_PROMPT,
          temperature: 0.5,
          maxTokens: 1024,
          jsonMode: true,
        }
      );

      const result = parseGPTJSON<TagGeneratorResult>(response);

      // Validate tags
      const validatedTags = result.tags
        .filter((tag) => VALID_TAGS.includes(tag))
        .slice(0, maxTags);

      const primaryTag = VALID_TAGS.includes(result.primaryTag)
        ? result.primaryTag
        : validatedTags[0] || 'friends';

      // Update the flow with tags
      await supabase
        .from('GroupFlow')
        .update({
          bestFor: validatedTags,
          pipelineStep: 7,
          pipelineStatus: 'tags_generated',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', flow.id);

      results.push({
        flowId: flow.id,
        title: flow.title,
        tags: validatedTags,
        primaryTag,
      });

      plansTagged++;
      console.log(`[tag-generator] Tagged "${flow.title}": ${validatedTags.join(', ')}`);

      // Small delay between API calls
      await new Promise((resolve) => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`[tag-generator] Error tagging ${flow.title}:`, error);
    }
  }

  console.log(`[tag-generator] Batch complete: ${plansTagged}/${flows.length} flows tagged`);

  return jsonResponse({
    success: true,
    data: {
      plansTagged,
      totalFlows: flows.length,
      results,
    },
  });
}

/**
 * Normalize venues from different input formats (activities or venues array)
 */
function normalizeVenues(
  plan: GroupPlanInput
): { name: string; category: string; description?: string }[] {
  // If venues array exists, use it directly
  if (plan.venues && plan.venues.length > 0) {
    return plan.venues;
  }

  // If activities array exists, convert to venues format
  if (plan.activities && plan.activities.length > 0) {
    return plan.activities.map((activity) => ({
      name: activity.venueName,
      category: activity.category || 'venue',
      description: activity.description,
    }));
  }

  return [];
}
