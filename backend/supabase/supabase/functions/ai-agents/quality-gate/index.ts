/**
 * Agent 5: Final Quality Gate
 *
 * Final check ensuring all plans meet the HomeView quality standard.
 * Compares each plan against the reference examples.
 * Approves, sends back for revision, or removes plans that don't meet the standard.
 *
 * POST /ai-agents/quality-gate
 * Body: { cityId, flowIds? }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../../_shared/cors.ts';
import { gptRequest, parseGPTJSON } from '../../_shared/gpt-client.ts';
import { createServiceClient } from '../../_shared/supabase-client.ts';

interface QualityScore {
  overall: number; // 0-100
  venueQuality: number;
  addressAccuracy: number;
  descriptionQuality: number;
  flowCoherence: number;
  timingRealism: number;
  costAccuracy: number;
}

interface QualityResult {
  flowId: string;
  title: string;
  score: QualityScore;
  status: 'approved' | 'needs_revision' | 'removed';
  issues: string[];
  suggestions: string[];
}

interface AgentResult {
  cityId: string;
  totalProcessed: number;
  approved: number;
  needsRevision: number;
  removed: number;
  averageScore: number;
  results: QualityResult[];
}

// HomeView quality examples for comparison
const QUALITY_REFERENCE = `
REFERENCE EXAMPLES - These are the GOLD STANDARD that all plans must match:

EXAMPLE 1: "Ultimate NYC Night Out"
- Title: Catchy, descriptive, evokes the experience
- Description: "Brooklyn Brewery → Blue Note Jazz Club → Le Bain at The Standard. A moderate 5-hour experience through NYC's best nightlife."
- Activities: 3 venues, each with:
  - Real venue name (Brooklyn Brewery, Blue Note Jazz Club, Le Bain)
  - Complete address (79 N 11th St, Brooklyn, NY 11249)
  - Accurate coordinates (40.7219, -73.9575)
  - Realistic timing (20:00, 22:00, 01:00)
  - Duration (90, 120, 90 minutes)
  - Evocative description (15-25 words with sensory language)
- Cost: $80-120 USD (realistic for 3 venues)
- Difficulty: "moderate" (matches 5-hour experience)
- Tags: ["Live Music", "Jazz", "Craft Beer", "Nightclub", "Dancing"]

EXAMPLE 2: "Authentic Madrid Night"
- Title: Captures the cultural essence
- Description: "La Latina Tapas → Corral de la Morería Flamenco → Kapital Nightclub. A challenging 6-hour experience through Madrid's best nightlife."
- Activities: 3 venues with:
  - Iconic venues (La Latina, Corral de la Morería, Teatro Kapital)
  - Complete Spanish addresses (Cava Baja, 28005 Madrid)
  - Proper Spanish formatting
  - Late-night timing (21:00, 23:30, 02:00)
  - Cultural descriptions mentioning specific experiences
- Cost: €100-150 EUR
- Difficulty: "challenging" (6+ hours, late night)

SCORING CRITERIA (0-100 each):

1. VENUE QUALITY (25%):
   - Are venues real and famous/well-regarded? (+25)
   - Are they currently operational? (+15)
   - Do they fit the nightlife theme? (+10)
   - Is variety maintained across venues? (+10)

2. ADDRESS ACCURACY (20%):
   - Complete street address with number? (+10)
   - Correct city and postal code? (+10)
   - Accurate GPS coordinates? (+10)
   - Proper format for the country? (+10)

3. DESCRIPTION QUALITY (20%):
   - 15-25 words per activity? (+10)
   - Uses sensory/evocative language? (+15)
   - Mentions specific venue features? (+10)
   - Tells what you'll experience? (+10)

4. FLOW COHERENCE (15%):
   - Geographic sense (venues near each other)? (+10)
   - Timing makes sense (not jumping hours)? (+10)
   - Theme consistency across venues? (+10)
   - Natural progression of the night? (+10)

5. TIMING REALISM (10%):
   - Venues open at suggested times? (+15)
   - Duration reasonable for activity type? (+15)
   - Travel time accounted for? (+10)

6. COST ACCURACY (10%):
   - Reflects actual venue prices? (+15)
   - Includes typical spending (drinks, cover)? (+15)
   - Min/max range is reasonable? (+10)

APPROVAL THRESHOLDS:
- 85-100: APPROVED (ready for production)
- 70-84: NEEDS REVISION (minor issues to fix)
- Below 70: REMOVED (too many issues)
`;

const QUALITY_GATE_SYSTEM_PROMPT = `You are the final quality assurance gate for nightlife group plans.

${QUALITY_REFERENCE}

Your job is to:
1. Compare each plan against the reference examples
2. Score each quality dimension (0-100)
3. Calculate overall score
4. Determine status (approved/needs_revision/removed)
5. List specific issues and suggestions

BE STRICT - Only approve plans that truly match the quality of the reference examples.
The user is paying for premium content. It must be excellent.

RESPOND IN JSON FORMAT ONLY.`;

const EVALUATE_PLAN_PROMPT = (flow: any, steps: any[]) => `
EVALUATE this group plan against the HomeView quality standard:

PLAN: "${flow.title}"
DESCRIPTION: ${flow.description}
DIFFICULTY: ${flow.difficulty}

ACTIVITIES:
${steps.map((s: any, i: number) => `
${i + 1}. ${s.venueName}
   Address: ${s.address}
   Coordinates: ${s.latitude}, ${s.longitude}
   Time: ${s.startTime} (${s.duration} minutes)
   Description: "${s.description}"
`).join('')}

COST: ${flow.totalEstimate / 100} ${flow.currency}
THEME: ${flow.theme}
TAGS: Will be derived from content

SCORING DIMENSIONS (0-100 each):
1. Venue Quality - Are these real, famous, operational venues?
2. Address Accuracy - Complete, accurate, properly formatted?
3. Description Quality - Evocative, specific, 15-25 words each?
4. Flow Coherence - Geographic sense, theme consistency?
5. Timing Realism - Venues open at these times, duration realistic?
6. Cost Accuracy - Reflects actual spending?

Return JSON:
{
  "score": {
    "overall": 85,
    "venueQuality": 90,
    "addressAccuracy": 80,
    "descriptionQuality": 85,
    "flowCoherence": 90,
    "timingRealism": 85,
    "costAccuracy": 80
  },
  "status": "approved|needs_revision|removed",
  "issues": ["Issue 1", "Issue 2"],
  "suggestions": ["Suggestion 1", "Suggestion 2"]
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

    console.log(`[quality-gate] Starting final quality check for ${cityName || cityId}`);

    const supabase = createServiceClient();
    const result: AgentResult = {
      cityId,
      totalProcessed: 0,
      approved: 0,
      needsRevision: 0,
      removed: 0,
      averageScore: 0,
      results: [],
    };

    // Get flows at step 4 (descriptions edited)
    let query = supabase
      .from('GroupFlow')
      .select('*')
      .eq('cityId', cityId)
      .eq('pipelineStep', 4)
      .eq('pipelineStatus', 'descriptions_edited');

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
        message: 'No flows to evaluate',
        data: result,
      });
    }

    console.log(`[quality-gate] Found ${flows.length} flows to evaluate`);

    let totalScore = 0;

    // Process flows
    for (let i = 0; i < flows.length; i += batchSize) {
      const batch = flows.slice(i, i + batchSize);

      for (const flow of batch) {
        try {
          const evalResult = await evaluateFlow(supabase, flow);
          result.results.push(evalResult);
          result.totalProcessed++;
          totalScore += evalResult.score.overall;

          switch (evalResult.status) {
            case 'approved':
              result.approved++;
              break;
            case 'needs_revision':
              result.needsRevision++;
              break;
            case 'removed':
              result.removed++;
              break;
          }

        } catch (error) {
          console.error(`[quality-gate] Error evaluating ${flow.title}:`, error);
        }
      }

      // Delay between batches
      if (i + batchSize < flows.length) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    result.averageScore = result.totalProcessed > 0
      ? Math.round(totalScore / result.totalProcessed)
      : 0;

    console.log(`[quality-gate] Complete: ${result.approved} approved, ${result.needsRevision} need revision, ${result.removed} removed. Average score: ${result.averageScore}`);

    return jsonResponse({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('[quality-gate] Error:', error);
    return errorResponse((error as Error).message, 500, 'SERVER_ERROR');
  }
});

/**
 * Evaluate a single flow
 */
async function evaluateFlow(supabase: any, flow: any): Promise<QualityResult> {
  // Get steps
  const { data: steps } = await supabase
    .from('GroupFlowStep')
    .select('*')
    .eq('flowId', flow.id)
    .order('stepNumber', { ascending: true });

  if (!steps || steps.length === 0) {
    await removeFlow(supabase, flow.id);
    return {
      flowId: flow.id,
      title: flow.title,
      score: { overall: 0, venueQuality: 0, addressAccuracy: 0, descriptionQuality: 0, flowCoherence: 0, timingRealism: 0, costAccuracy: 0 },
      status: 'removed',
      issues: ['No activities found'],
      suggestions: [],
    };
  }

  // Call GPT to evaluate
  const response = await gptRequest(
    [{ role: 'user', content: EVALUATE_PLAN_PROMPT(flow, steps) }],
    {
      systemPrompt: QUALITY_GATE_SYSTEM_PROMPT,
      temperature: 0.2, // Low for consistent scoring
      maxTokens: 2048,
      jsonMode: true,
    }
  );

  const evaluation = parseGPTJSON<{
    score: QualityScore;
    status: 'approved' | 'needs_revision' | 'removed';
    issues: string[];
    suggestions: string[];
  }>(response);

  // Apply the decision
  if (evaluation.status === 'removed') {
    await removeFlow(supabase, flow.id);
  } else {
    // Update pipeline status
    await supabase
      .from('GroupFlow')
      .update({
        pipelineStep: 5,
        pipelineStatus: evaluation.status === 'approved' ? 'approved' : 'needs_revision',
        qualityScore: evaluation.score.overall,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', flow.id);
  }

  console.log(`[quality-gate] ${flow.title}: ${evaluation.score.overall}/100 - ${evaluation.status}`);

  return {
    flowId: flow.id,
    title: flow.title,
    score: evaluation.score,
    status: evaluation.status,
    issues: evaluation.issues,
    suggestions: evaluation.suggestions,
  };
}

/**
 * Remove a flow and its steps
 */
async function removeFlow(supabase: any, flowId: string): Promise<void> {
  await supabase.from('GroupFlowStep').delete().eq('flowId', flowId);
  await supabase.from('GroupFlow').delete().eq('id', flowId);
  console.log(`[quality-gate] Removed flow: ${flowId}`);
}
