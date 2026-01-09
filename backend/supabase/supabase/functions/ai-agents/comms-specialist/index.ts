/**
 * Agent 6: Comms Specialist
 *
 * Crafts captivating descriptions for group plans and brief venue descriptions.
 * Ensures all copy is engaging, evocative, and matches the city's identity.
 *
 * POST /ai-agents/comms-specialist
 * Body: { cityId, cityName, country, flowIds? }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../../_shared/cors.ts';
import { gptRequest, parseGPTJSON } from '../../_shared/gpt-client.ts';
import { createServiceClient } from '../../_shared/supabase-client.ts';

interface DescriptionEnhancement {
  flowId: string;
  title: string;
  originalDescription: string;
  enhancedDescription: string;
  activityDescriptions: {
    stepId: string;
    venueName: string;
    originalDescription: string;
    enhancedDescription: string;
  }[];
}

interface AgentResult {
  cityId: string;
  totalFlowsProcessed: number;
  descriptionsEnhanced: number;
  results: DescriptionEnhancement[];
}

// City configurations for context
const CITY_CONFIGS: Record<string, { identity: string; vibe: string }> = {
  'New York': {
    identity: 'The city that never sleeps - world-class nightlife, iconic venues, diverse scenes',
    vibe: 'Electric, ambitious, diverse, always buzzing',
  },
  'Los Angeles': {
    identity: 'Hollywood glamour meets laid-back beach vibes',
    vibe: 'Glamorous, trendy, celebrity-spotting, rooftop culture',
  },
  'Miami': {
    identity: 'Latin heat meets Art Deco elegance',
    vibe: 'Sexy, vibrant, international, beach club paradise',
  },
  'London': {
    identity: 'Historic pubs meet cutting-edge clubs',
    vibe: 'Sophisticated, eclectic, underground, world-class',
  },
  'Paris': {
    identity: 'The City of Light - timeless romance and sophisticated nightlife',
    vibe: 'Elegant, romantic, cultured, mysteriously seductive',
  },
  'Berlin': {
    identity: 'Techno capital of the world',
    vibe: 'Underground, raw, free-spirited, 24-hour party',
  },
  'Barcelona': {
    identity: 'Mediterranean party paradise',
    vibe: 'Late-night, beachside, artistic, energetic',
  },
  'Ibiza': {
    identity: 'The White Isle - world capital of electronic music',
    vibe: 'Euphoric, free-spirited, glamorous yet raw',
  },
  'Tokyo': {
    identity: 'Neon-lit wonderland of hidden bars and unique experiences',
    vibe: 'Quirky, innovative, respectful, immersive',
  },
  'Dubai': {
    identity: 'Ultra-luxury nightlife in the desert',
    vibe: 'Opulent, extravagant, international, glamorous',
  },
};

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    const body = await req.json();
    const { cityId, cityName, country, flowIds, batchSize = 5 } = body;

    if (!cityId) {
      return errorResponse('cityId required', 400, 'BAD_REQUEST');
    }

    console.log(`[comms-specialist] Starting for ${cityName || cityId}`);

    const supabase = createServiceClient();
    const result: AgentResult = {
      cityId,
      totalFlowsProcessed: 0,
      descriptionsEnhanced: 0,
      results: [],
    };

    // Get flows at step 4 (descriptions edited) or step 5 (quality gate passed)
    let query = supabase
      .from('GroupFlow')
      .select('*')
      .eq('cityId', cityId)
      .in('pipelineStep', [4, 5])
      .in('pipelineStatus', ['descriptions_edited', 'approved', 'needs_revision']);

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
        message: 'No flows to enhance',
        data: result,
      });
    }

    console.log(`[comms-specialist] Found ${flows.length} flows to enhance`);

    // Get city info for context
    const { data: city } = await supabase
      .from('City')
      .select('name, country')
      .eq('id', cityId)
      .single();

    const actualCityName = cityName || city?.name || 'Unknown';
    const cityConfig = CITY_CONFIGS[actualCityName] || {
      identity: `Vibrant nightlife destination`,
      vibe: 'Exciting, diverse, memorable',
    };

    // Process flows in batches
    for (let i = 0; i < flows.length; i += batchSize) {
      const batch = flows.slice(i, i + batchSize);

      for (const flow of batch) {
        try {
          const enhancement = await enhanceFlowDescriptions(
            supabase,
            flow,
            actualCityName,
            cityConfig
          );
          result.results.push(enhancement);
          result.totalFlowsProcessed++;
          result.descriptionsEnhanced += enhancement.activityDescriptions.filter(
            (a) => a.enhancedDescription !== a.originalDescription
          ).length;

          if (enhancement.enhancedDescription !== enhancement.originalDescription) {
            result.descriptionsEnhanced++;
          }
        } catch (error) {
          console.error(`[comms-specialist] Error enhancing ${flow.title}:`, error);
        }
      }

      // Delay between batches
      if (i + batchSize < flows.length) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    console.log(
      `[comms-specialist] Complete: ${result.totalFlowsProcessed} flows, ${result.descriptionsEnhanced} descriptions enhanced`
    );

    return jsonResponse({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[comms-specialist] Error:', error);
    return errorResponse((error as Error).message, 500, 'SERVER_ERROR');
  }
});

/**
 * Enhance descriptions for a single flow
 */
async function enhanceFlowDescriptions(
  supabase: any,
  flow: any,
  cityName: string,
  cityConfig: { identity: string; vibe: string }
): Promise<DescriptionEnhancement> {
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
      originalDescription: flow.description,
      enhancedDescription: flow.description,
      activityDescriptions: [],
    };
  }

  const systemPrompt = `You are an ELITE COMMUNICATIONS SPECIALIST for ${cityName}.

YOUR TASKS:
1. Write a captivating GROUP PLAN description (max 2 sentences, max 25 words)
2. Write a BRIEF VENUE DESCRIPTION for each location (1 sentence, 10-15 words)

VENUE DESCRIPTION FORMAT (CRITICAL):
- EXACTLY 1 sentence, 10-15 words
- Direct and factual - describes what you'll experience
- Mention what makes the venue iconic/special
- Format: "[Activity] at [adjective] [venue name] with [unique feature]."

EXAMPLES OF PERFECT VENUE DESCRIPTIONS:
- "Sunset cocktails at the iconic Skybar with stunning city views."
- "World-class techno at legendary DC-10 with raw underground energy."
- "Craft cocktails at hidden Candelaria speakeasy behind a taqueria."
- "Jazz sessions at intimate Duc des Lombards with world-class musicians."

CITY CONTEXT:
- City: ${cityName}
- Identity: ${cityConfig.identity}
- Vibe: ${cityConfig.vibe}

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Craft captivating descriptions for this group plan:

PLAN: "${flow.title}"
CURRENT DESCRIPTION: "${flow.description}"
DIFFICULTY: ${flow.difficulty || 'moderate'}

VENUES:
${steps.map((s: any, i: number) => `${i + 1}. ${s.venueName} - Current: "${s.description || 'No description'}"`).join('\n')}

For the plan:
- Write captivating plan description (max 25 words, 2 sentences)

For each venue:
- Write BRIEF description (1 sentence, 10-15 words, direct, factual)

Return JSON:
{
  "planDescription": "Captivating 2-sentence overview",
  "activities": [
    {
      "venueName": "Venue Name",
      "briefDescription": "1 sentence, 10-15 words"
    }
  ]
}`;

  const response = await gptRequest([{ role: 'user', content: userPrompt }], {
    systemPrompt,
    temperature: 0.8,
    maxTokens: 4096,
    jsonMode: true,
  });

  const result = parseGPTJSON<{
    planDescription: string;
    activities: { venueName: string; briefDescription: string }[];
  }>(response);

  const activityDescriptions: DescriptionEnhancement['activityDescriptions'] = [];

  // Update flow description
  if (result.planDescription && result.planDescription !== flow.description) {
    await supabase
      .from('GroupFlow')
      .update({
        description: result.planDescription,
        pipelineStep: 6,
        pipelineStatus: 'comms_enhanced',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', flow.id);
  }

  // Update step descriptions
  for (const step of steps) {
    const enhanced = result.activities.find((a) => a.venueName === step.venueName);

    if (enhanced?.briefDescription && enhanced.briefDescription !== step.description) {
      await supabase
        .from('GroupFlowStep')
        .update({
          description: enhanced.briefDescription,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', step.id);
    }

    activityDescriptions.push({
      stepId: step.id,
      venueName: step.venueName,
      originalDescription: step.description || '',
      enhancedDescription: enhanced?.briefDescription || step.description || '',
    });
  }

  console.log(`[comms-specialist] Enhanced: ${flow.title}`);

  return {
    flowId: flow.id,
    title: flow.title,
    originalDescription: flow.description,
    enhancedDescription: result.planDescription || flow.description,
    activityDescriptions,
  };
}
