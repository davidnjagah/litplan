/**
 * Agent 1: Group Plan Generator
 *
 * Creates high-quality group plans matching the HomeView standard.
 * Generates 30 plans per city with complete venue details, addresses, and coordinates.
 *
 * POST /ai-agents/group-plan-generator
 * Body: { cityId, cityName, country, targetCount?, batchSize? }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../../_shared/cors.ts';
import { gptRequest, parseGPTJSON } from '../../_shared/gpt-client.ts';
import { createServiceClient } from '../../_shared/supabase-client.ts';
import {
  GROUP_PLAN_GENERATOR_SYSTEM_PROMPT,
  GROUP_PLANS_USER_PROMPT,
  CITY_CONFIGS,
} from './prompts.ts';

// Types
interface Activity {
  venueName: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  startTime: string;
  duration: number;
  description: string;
  order: number;
}

interface GroupPlan {
  title: string;
  description: string;
  activities: Activity[];
  totalDuration: number;
  estimatedCost: {
    min: number;
    max: number;
    currency: string;
  };
  difficulty: string;
  bestFor: string[];
  aiTags: string[];
}

interface GenerationResult {
  cityId: string;
  cityName: string;
  plansGenerated: number;
  plansStored: number;
  errors: string[];
  plans: GroupPlan[];
}

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    const body = await req.json();
    const {
      cityId,
      cityName,
      country,
      targetCount = 30,
      batchSize = 10,
      storeResults = true,
    } = body;

    if (!cityId || !cityName) {
      return errorResponse('cityId and cityName required', 400, 'BAD_REQUEST');
    }

    console.log(`[group-plan-generator] Starting generation for ${cityName} (target: ${targetCount})`);

    // Get city configuration
    const cityConfig = CITY_CONFIGS[cityName] || {
      currency: 'USD',
      country: country || 'Unknown',
      neighborhoods: [],
      themes: ['rooftop', 'club', 'live-music', 'cocktails']
    };

    const supabase = createServiceClient();
    const result: GenerationResult = {
      cityId,
      cityName,
      plansGenerated: 0,
      plansStored: 0,
      errors: [],
      plans: [],
    };

    // Get existing venues to avoid duplicates
    const { data: existingFlows } = await supabase
      .from('GroupFlow')
      .select('id')
      .eq('cityId', cityId);

    const existingVenues: string[] = [];
    if (existingFlows && existingFlows.length > 0) {
      const flowIds = existingFlows.map(f => f.id);
      const { data: steps } = await supabase
        .from('GroupFlowStep')
        .select('venueName')
        .in('flowId', flowIds);

      if (steps) {
        existingVenues.push(...steps.map(s => s.venueName));
      }
    }

    console.log(`[group-plan-generator] Found ${existingVenues.length} existing venues to avoid`);

    // Generate in batches to avoid token limits
    const batches = Math.ceil(targetCount / batchSize);
    let allGeneratedVenues: string[] = [...existingVenues];

    for (let batch = 0; batch < batches; batch++) {
      const remaining = targetCount - result.plansGenerated;
      const currentBatchSize = Math.min(batchSize, remaining);

      console.log(`[group-plan-generator] Batch ${batch + 1}/${batches}: Generating ${currentBatchSize} plans`);

      try {
        const plans = await generateBatch(
          cityName,
          cityConfig.country,
          currentBatchSize,
          cityConfig.currency,
          allGeneratedVenues
        );

        // Validate and filter plans
        const validPlans = plans.filter(plan => validatePlan(plan));

        result.plans.push(...validPlans);
        result.plansGenerated += validPlans.length;

        // Track new venues to avoid duplicates in next batch
        validPlans.forEach(plan => {
          plan.activities.forEach(act => {
            allGeneratedVenues.push(act.venueName);
          });
        });

        console.log(`[group-plan-generator] Batch ${batch + 1}: Generated ${validPlans.length} valid plans`);

        // Add small delay between batches to avoid rate limiting
        if (batch < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        const errMsg = `Batch ${batch + 1} failed: ${(error as Error).message}`;
        console.error(`[group-plan-generator] ${errMsg}`);
        result.errors.push(errMsg);
      }
    }

    // Store results in database if requested
    if (storeResults && result.plans.length > 0) {
      const storedCount = await storePlans(supabase, cityId, result.plans);
      result.plansStored = storedCount;
    }

    console.log(`[group-plan-generator] Complete: ${result.plansGenerated} generated, ${result.plansStored} stored`);

    return jsonResponse({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('[group-plan-generator] Error:', error);
    return errorResponse((error as Error).message, 500, 'SERVER_ERROR');
  }
});

/**
 * Generate a batch of group plans
 */
async function generateBatch(
  cityName: string,
  country: string,
  count: number,
  currency: string,
  existingVenues: string[]
): Promise<GroupPlan[]> {
  const userPrompt = GROUP_PLANS_USER_PROMPT(
    cityName,
    country,
    count,
    currency,
    existingVenues.slice(-50) // Only send last 50 to avoid prompt bloat
  );

  const response = await gptRequest(
    [{ role: 'user', content: userPrompt }],
    {
      systemPrompt: GROUP_PLAN_GENERATOR_SYSTEM_PROMPT,
      temperature: 0.85, // Higher creativity for variety
      maxTokens: 16384,
      jsonMode: true,
    }
  );

  const parsed = parseGPTJSON<{ plans: GroupPlan[] }>(response);
  return parsed.plans || [];
}

/**
 * Validate a single plan meets quality standards
 */
function validatePlan(plan: GroupPlan): boolean {
  // Must have title
  if (!plan.title || plan.title.length < 5) {
    console.log(`[validation] Invalid title: ${plan.title}`);
    return false;
  }

  // Must have description in correct format
  if (!plan.description || plan.description.length < 30) {
    console.log(`[validation] Invalid description for ${plan.title}`);
    return false;
  }

  // Must have 2-4 activities
  if (!plan.activities || plan.activities.length < 2 || plan.activities.length > 4) {
    console.log(`[validation] Invalid activity count for ${plan.title}: ${plan.activities?.length}`);
    return false;
  }

  // Validate each activity
  for (const activity of plan.activities) {
    // Must have venue name
    if (!activity.venueName || activity.venueName.length < 3) {
      console.log(`[validation] Invalid venue name in ${plan.title}`);
      return false;
    }

    // Must have address with minimum structure
    if (!activity.address || activity.address.length < 10) {
      console.log(`[validation] Invalid address for ${activity.venueName}`);
      return false;
    }

    // Must have valid coordinates (not 0,0 or city center placeholders)
    if (!activity.coordinates ||
        activity.coordinates.latitude === 0 ||
        activity.coordinates.longitude === 0 ||
        Math.abs(activity.coordinates.latitude) > 90 ||
        Math.abs(activity.coordinates.longitude) > 180) {
      console.log(`[validation] Invalid coordinates for ${activity.venueName}`);
      return false;
    }

    // Must have valid time format
    if (!activity.startTime || !/^\d{2}:\d{2}$/.test(activity.startTime)) {
      console.log(`[validation] Invalid startTime for ${activity.venueName}`);
      return false;
    }

    // Must have duration (30-240 minutes)
    if (!activity.duration || activity.duration < 30 || activity.duration > 240) {
      console.log(`[validation] Invalid duration for ${activity.venueName}`);
      return false;
    }

    // Must have description (15-150 chars)
    if (!activity.description || activity.description.length < 15) {
      console.log(`[validation] Invalid activity description for ${activity.venueName}`);
      return false;
    }

    // Must have order
    if (typeof activity.order !== 'number' || activity.order < 1) {
      console.log(`[validation] Invalid order for ${activity.venueName}`);
      return false;
    }
  }

  // Must have valid cost
  if (!plan.estimatedCost ||
      typeof plan.estimatedCost.min !== 'number' ||
      typeof plan.estimatedCost.max !== 'number' ||
      plan.estimatedCost.min > plan.estimatedCost.max) {
    console.log(`[validation] Invalid cost for ${plan.title}`);
    return false;
  }

  // Must have valid difficulty
  if (!['easy', 'moderate', 'challenging', 'intense'].includes(plan.difficulty)) {
    console.log(`[validation] Invalid difficulty for ${plan.title}: ${plan.difficulty}`);
    return false;
  }

  // Must have bestFor array
  if (!plan.bestFor || !Array.isArray(plan.bestFor) || plan.bestFor.length === 0) {
    console.log(`[validation] Invalid bestFor for ${plan.title}`);
    return false;
  }

  // Must have aiTags array
  if (!plan.aiTags || !Array.isArray(plan.aiTags) || plan.aiTags.length < 3) {
    console.log(`[validation] Invalid aiTags for ${plan.title}`);
    return false;
  }

  return true;
}

/**
 * Store validated plans in the database
 */
async function storePlans(supabase: any, cityId: string, plans: GroupPlan[]): Promise<number> {
  let stored = 0;
  const timestamp = new Date().toISOString();

  // Get current max rank for this city
  const { data: existingFlows } = await supabase
    .from('GroupFlow')
    .select('rank')
    .eq('cityId', cityId)
    .order('rank', { ascending: false })
    .limit(1);

  let startRank = existingFlows?.[0]?.rank || 0;

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const flowId = `gf-gen-${cityId.slice(-8)}-${Date.now()}-${i}`;

    try {
      // Insert GroupFlow
      const { data: flow, error: flowError } = await supabase
        .from('GroupFlow')
        .insert({
          id: flowId,
          flowId: flowId,
          cityId: cityId,
          rank: startRank + i + 1,
          title: plan.title,
          description: plan.description,
          totalHours: Math.ceil(plan.totalDuration / 60),
          startTime: plan.activities[0]?.startTime || '20:00',
          endTime: plan.activities[plan.activities.length - 1]?.startTime || '02:00',
          totalEstimate: Math.round((plan.estimatedCost.min + plan.estimatedCost.max) / 2 * 100),
          currency: plan.estimatedCost.currency,
          isWeekend: plan.difficulty === 'challenging' || plan.difficulty === 'intense',
          proOnly: i >= 2, // First 2 are free
          aiGenerated: true,
          isTemporary: false,
          theme: extractTheme(plan.aiTags),
          difficulty: plan.difficulty,
          lastRefreshed: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
          // Store for pipeline processing
          pipelineStatus: 'generated',
          pipelineStep: 1,
        })
        .select()
        .single();

      if (flowError) {
        console.error(`[store] Failed to insert flow ${plan.title}:`, flowError);
        continue;
      }

      // Insert GroupFlowSteps with full details
      for (const activity of plan.activities) {
        const stepId = `${flowId}-step-${activity.order}`;

        await supabase
          .from('GroupFlowStep')
          .insert({
            id: stepId,
            flowId: flow.id,
            planId: null,
            stepNumber: activity.order,
            title: activity.venueName,
            venueName: activity.venueName,
            address: activity.address,
            latitude: activity.coordinates.latitude,
            longitude: activity.coordinates.longitude,
            startTime: activity.startTime,
            duration: activity.duration,
            description: activity.description,
            thumbnail: getThumbnail(plan.aiTags),
          });
      }

      stored++;
      console.log(`[store] Stored: ${plan.title} (${plan.activities.length} stops)`);

    } catch (error) {
      console.error(`[store] Error storing ${plan.title}:`, error);
    }
  }

  return stored;
}

/**
 * Extract primary theme from tags
 */
function extractTheme(tags: string[]): string {
  const themeMap: Record<string, string> = {
    'jazz': 'jazz',
    'comedy': 'comedy',
    'rooftop': 'rooftop',
    'speakeasy': 'speakeasy',
    'nightclub': 'club',
    'club': 'club',
    'dancing': 'club',
    'live music': 'live-music',
    'boat': 'boat-party',
    'yacht': 'boat-party',
    'flamenco': 'cultural',
    'cultural': 'cultural',
    'cabaret': 'cultural',
    'techno': 'underground',
    'underground': 'underground',
    'alternative': 'alternative',
    'luxury': 'luxury',
    'cocktail': 'speakeasy',
    'brewery': 'bar-hop',
    'pub': 'bar-hop',
    'beer': 'bar-hop',
  };

  for (const tag of tags) {
    const lower = tag.toLowerCase();
    for (const [key, theme] of Object.entries(themeMap)) {
      if (lower.includes(key)) {
        return theme;
      }
    }
  }

  return 'bar-hop';
}

/**
 * Get thumbnail based on tags
 */
function getThumbnail(tags: string[]): string {
  const thumbnails: Record<string, string> = {
    'jazz': 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&q=80',
    'comedy': 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=400&q=80',
    'rooftop': 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&q=80',
    'speakeasy': 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400&q=80',
    'nightclub': 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400&q=80',
    'live music': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80',
    'flamenco': 'https://images.unsplash.com/photo-1504609813442-a9e295a50136?w=400&q=80',
    'cultural': 'https://images.unsplash.com/photo-1504609813442-a9e295a50136?w=400&q=80',
  };

  for (const tag of tags) {
    const lower = tag.toLowerCase();
    for (const [key, url] of Object.entries(thumbnails)) {
      if (lower.includes(key)) {
        return url;
      }
    }
  }

  return 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&q=80';
}
