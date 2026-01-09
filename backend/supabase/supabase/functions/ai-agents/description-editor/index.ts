/**
 * Agent 4: Description Editor
 *
 * Reconfirms and polishes all descriptions in group plans.
 * Ensures descriptions are evocative, accurate, and match HomeView quality.
 *
 * POST /ai-agents/description-editor
 * Body: { cityId, flowIds? }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../../_shared/cors.ts';
import { gptRequest, parseGPTJSON } from '../../_shared/gpt-client.ts';
import { createServiceClient } from '../../_shared/supabase-client.ts';

interface DescriptionEdit {
  stepId: string;
  venueName: string;
  originalDescription: string;
  editedDescription: string;
  wasEdited: boolean;
  editReason: string;
}

interface FlowEditResult {
  flowId: string;
  title: string;
  originalFlowDescription: string;
  editedFlowDescription: string;
  activityEdits: DescriptionEdit[];
  totalEdits: number;
}

interface AgentResult {
  cityId: string;
  totalFlowsProcessed: number;
  descriptionsEdited: number;
  results: FlowEditResult[];
}

const DESCRIPTION_EDITOR_SYSTEM_PROMPT = `You are an expert copywriter specializing in nightlife and entertainment venues.

Your task is to ensure all descriptions are:

1. EVOCATIVE - Use sensory language that makes readers want to visit
2. ACCURATE - Describe what the venue actually offers
3. SPECIFIC - Mention unique features of this specific venue
4. CONCISE - 15-25 words for activities, 50-80 words for flow descriptions
5. ACTIONABLE - Tell people what they'll DO at the venue

QUALITY STANDARD EXAMPLES:

ACTIVITY DESCRIPTIONS (15-25 words):
✓ "Start your night with craft beers at Brooklyn Brewery. Enjoy the buzzing atmosphere and local brews."
✓ "Experience world-class flamenco at Madrid's most prestigious tablao. Passionate dance, soul-stirring music, and Spanish wine."
✓ "End the night dancing at Le Bain, a rooftop nightclub with incredible city views and hot tub."
✓ "Sunset cocktails on the iconic rooftop terrace with 360° views of Madrid's skyline. Watch the city light up as night falls."

✗ "A nice bar to get drinks" (too generic)
✗ "Famous jazz club" (too short, not evocative)
✗ "Visit this venue for entertainment" (generic, not specific)

FLOW DESCRIPTIONS (50-80 words):
✓ "Brooklyn Brewery → Blue Note Jazz Club → Le Bain at The Standard. A moderate 5-hour experience through NYC's best nightlife."
✓ "La Latina Tapas → Corral de la Morería Flamenco → Kapital Nightclub. A challenging 6-hour experience through Madrid's best nightlife."

Format: "Venue 1 → Venue 2 → Venue 3. A [difficulty] [X]-hour experience through [city]'s best nightlife."

EDITING RULES:
1. Keep venue-specific details (if "Blue Note" is mentioned, keep jazz references)
2. Add sensory language (sounds, sights, tastes, atmosphere)
3. Include what makes the venue special or famous
4. Use action verbs (experience, dance, savor, discover, explore)
5. Mention signature offerings (famous cocktails, live music, views)

RESPOND IN JSON FORMAT ONLY.`;

const EDIT_DESCRIPTIONS_PROMPT = (flow: any, steps: any[], cityName: string) => `
Edit these descriptions to match HomeView quality for ${cityName}:

FLOW TITLE: "${flow.title}"
CURRENT FLOW DESCRIPTION: "${flow.description}"
DIFFICULTY: ${flow.difficulty}
TOTAL DURATION: ${flow.totalHours || Math.ceil((steps.reduce((s: number, a: any) => s + a.duration, 0)) / 60)} hours

ACTIVITIES:
${steps.map((s: any, i: number) => `
${i + 1}. ${s.venueName}
   Current Description: "${s.description}"
   Duration: ${s.duration} minutes
   Address: ${s.address}
`).join('')}

FOR EACH ACTIVITY:
1. Is the description evocative and specific? (15-25 words)
2. Does it mention what makes this venue special?
3. Does it use sensory language?
4. Does it tell people what they'll experience?

FOR THE FLOW DESCRIPTION:
1. Does it follow the format: "Venue 1 → Venue 2 → Venue 3. A [difficulty] [X]-hour experience through ${cityName}'s best nightlife."?
2. Does it give a sense of the journey?

Return JSON:
{
  "flowDescription": {
    "edited": "New flow description if changed",
    "wasEdited": true/false,
    "reason": "Why it was changed or why it's good"
  },
  "activities": [
    {
      "stepNumber": 1,
      "venueName": "Venue Name",
      "originalDescription": "Original text",
      "editedDescription": "Improved text (or same if no change)",
      "wasEdited": true/false,
      "editReason": "What was improved or why it's already good"
    }
  ]
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

    console.log(`[description-editor] Starting description editing for ${cityName || cityId}`);

    const supabase = createServiceClient();
    const result: AgentResult = {
      cityId,
      totalFlowsProcessed: 0,
      descriptionsEdited: 0,
      results: [],
    };

    // Get flows at step 3 (addresses validated)
    let query = supabase
      .from('GroupFlow')
      .select('*')
      .eq('cityId', cityId)
      .eq('pipelineStep', 3)
      .eq('pipelineStatus', 'addresses_validated');

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
        message: 'No flows to edit descriptions',
        data: result,
      });
    }

    console.log(`[description-editor] Found ${flows.length} flows to edit`);

    // Get city info
    const { data: city } = await supabase
      .from('City')
      .select('name')
      .eq('id', cityId)
      .single();

    const actualCityName = cityName || city?.name || 'Unknown';

    // Process flows in batches
    for (let i = 0; i < flows.length; i += batchSize) {
      const batch = flows.slice(i, i + batchSize);

      for (const flow of batch) {
        try {
          const editResult = await editFlowDescriptions(supabase, flow, actualCityName);
          result.results.push(editResult);
          result.totalFlowsProcessed++;
          result.descriptionsEdited += editResult.totalEdits;

        } catch (error) {
          console.error(`[description-editor] Error editing ${flow.title}:`, error);
        }
      }

      // Delay between batches
      if (i + batchSize < flows.length) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    console.log(`[description-editor] Complete: ${result.totalFlowsProcessed} flows processed, ${result.descriptionsEdited} descriptions edited`);

    return jsonResponse({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('[description-editor] Error:', error);
    return errorResponse((error as Error).message, 500, 'SERVER_ERROR');
  }
});

/**
 * Edit descriptions for a single flow
 */
async function editFlowDescriptions(
  supabase: any,
  flow: any,
  cityName: string
): Promise<FlowEditResult> {
  // Get steps
  const { data: steps } = await supabase
    .from('GroupFlowStep')
    .select('*')
    .eq('flowId', flow.id)
    .order('stepNumber', { ascending: true });

  if (!steps || steps.length === 0) {
    return {
      flowId: flow.id,
      title: flow.title,
      originalFlowDescription: flow.description,
      editedFlowDescription: flow.description,
      activityEdits: [],
      totalEdits: 0,
    };
  }

  // Call GPT to edit descriptions
  const response = await gptRequest(
    [{ role: 'user', content: EDIT_DESCRIPTIONS_PROMPT(flow, steps, cityName) }],
    {
      systemPrompt: DESCRIPTION_EDITOR_SYSTEM_PROMPT,
      temperature: 0.6, // Moderate creativity for writing
      maxTokens: 4096,
      jsonMode: true,
    }
  );

  const edits = parseGPTJSON<{
    flowDescription: {
      edited: string;
      wasEdited: boolean;
      reason: string;
    };
    activities: Array<{
      stepNumber: number;
      venueName: string;
      originalDescription: string;
      editedDescription: string;
      wasEdited: boolean;
      editReason: string;
    }>;
  }>(response);

  let totalEdits = 0;
  const activityEdits: DescriptionEdit[] = [];

  // Apply flow description edit if needed
  if (edits.flowDescription.wasEdited) {
    await supabase
      .from('GroupFlow')
      .update({
        description: edits.flowDescription.edited,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', flow.id);
    totalEdits++;
  }

  // Apply activity description edits
  for (const activityEdit of edits.activities) {
    const step = steps.find((s: any) => s.stepNumber === activityEdit.stepNumber);
    if (!step) continue;

    if (activityEdit.wasEdited) {
      await supabase
        .from('GroupFlowStep')
        .update({
          description: activityEdit.editedDescription,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', step.id);
      totalEdits++;
    }

    activityEdits.push({
      stepId: step.id,
      venueName: activityEdit.venueName,
      originalDescription: activityEdit.originalDescription,
      editedDescription: activityEdit.editedDescription,
      wasEdited: activityEdit.wasEdited,
      editReason: activityEdit.editReason,
    });
  }

  // Update pipeline status
  await supabase
    .from('GroupFlow')
    .update({
      pipelineStep: 4,
      pipelineStatus: 'descriptions_edited',
      updatedAt: new Date().toISOString(),
    })
    .eq('id', flow.id);

  console.log(`[description-editor] Edited ${totalEdits} descriptions for ${flow.title}`);

  return {
    flowId: flow.id,
    title: flow.title,
    originalFlowDescription: flow.description,
    editedFlowDescription: edits.flowDescription.edited || flow.description,
    activityEdits,
    totalEdits,
  };
}
