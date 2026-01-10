/**
 * Phase 2 Group Composer - Compose Group Plans from Individual Plans
 *
 * Takes validated individual plans from Phase 1 and composes them into
 * 5-8 themed GroupFlows per city.
 *
 * Endpoints:
 * POST /ai-agents/phase2-group-composer - Compose group plans for a city
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { gptRequest, parseGPTJSON } from '../_shared/gpt-client.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import {
  GROUP_PLAN_THEMES,
  COMPOSITION_STRATEGIES,
  DIFFICULTY_LEVELS,
  CATEGORY_THEME_MAP,
  getAllThemeNames,
} from '../_shared/theme-config.ts';
import { QUALITY_THRESHOLDS_V2 } from '../_shared/quality-criteria.ts';
import { GROUP_COMPOSER_SYSTEM_PROMPT, buildCompositionPrompt } from './prompts.ts';
import { getWeekdayFromDate, isWeekendDate } from '../_shared/date-utils.ts';

// Input plan from Phase 1
interface IndividualPlan {
  id: string;
  venueName: string;
  title: string;
  address: string;
  neighborhood: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  latitude?: number;
  longitude?: number;
  description: string;
  category: string;
  weekday: string;
  startTime: string;
  endTime: string;
  priceRange: string;
  entryFee?: number | null;
  currency?: string;
  themes?: string[];
  vibes?: string[];
  crowdType?: string;
  durationMinutes?: number;
  isEvent?: boolean;
}

// Composed group flow output
interface ComposedGroupFlow {
  title: string;
  theme: string;
  difficulty: 'easy' | 'moderate' | 'challenging';
  planIds: string[];
  steps: {
    planId: string;
    order: number;
    venueName: string;
    transitionNote: string;
    suggestedDuration: number;
  }[];
  totalDuration: number;
  neighborhoodFocus: string;
  priceRange: string;
  estimatedCost: {
    min: number;
    max: number;
    currency: string;
  };
}

interface CompositionResult {
  cityId: string;
  cityName: string;
  groupFlows: ComposedGroupFlow[];
  totalFlows: number;
  processingTimeMs: number;
  plansUsed: number;
  plansAvailable: number;
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
      plans, // Optional: provide plans directly
      yearWeek,
      targetFlows = 6,
      storeResults = true,
    } = body;

    if (!cityId && !plans) {
      return errorResponse('cityId or plans array required', 400, 'BAD_REQUEST');
    }

    console.log(`[phase2-group-composer] Starting composition for ${cityName || cityId}`);

    // Get plans from database or use provided plans
    let individualPlans: IndividualPlan[] = plans || [];

    if (!plans && cityId) {
      individualPlans = await fetchPlansForCity(cityId, yearWeek);
    }

    if (individualPlans.length < QUALITY_THRESHOLDS_V2.MIN_VENUES_PER_FLOW * 2) {
      return errorResponse(
        `Not enough plans to compose groups. Need at least ${QUALITY_THRESHOLDS_V2.MIN_VENUES_PER_FLOW * 2}, have ${individualPlans.length}`,
        400,
        'INSUFFICIENT_PLANS'
      );
    }

    console.log(`[phase2-group-composer] Working with ${individualPlans.length} individual plans`);

    // Normalize coordinates
    individualPlans = individualPlans.map((p) => ({
      ...p,
      coordinates: p.coordinates || {
        lat: p.latitude || 0,
        lng: p.longitude || 0,
      },
    }));

    // Analyze plans and identify possible groupings
    const planAnalysis = analyzePlans(individualPlans);

    console.log(`[phase2-group-composer] Analysis: ${planAnalysis.themeDistribution.length} themes, ${planAnalysis.neighborhoodDistribution.length} neighborhoods`);

    // Use GPT to compose optimal group flows
    const composedFlows = await composeGroupFlows(
      individualPlans,
      planAnalysis,
      cityName || 'the city',
      country || '',
      targetFlows
    );

    console.log(`[phase2-group-composer] Composed ${composedFlows.length} group flows`);

    // Store results if requested
    let storedCount = 0;
    if (storeResults && cityId) {
      storedCount = await storeGroupFlows(cityId, composedFlows, yearWeek);
      console.log(`[phase2-group-composer] Stored ${storedCount} group flows to database`);
    }

    const processingTimeMs = Date.now() - startTime;

    // Count unique plans used
    const plansUsed = new Set(composedFlows.flatMap((f) => f.planIds)).size;

    const result: CompositionResult = {
      cityId: cityId || '',
      cityName: cityName || '',
      groupFlows: composedFlows,
      totalFlows: composedFlows.length,
      processingTimeMs,
      plansUsed,
      plansAvailable: individualPlans.length,
    };

    return jsonResponse({
      success: true,
      data: result,
      stored: storeResults ? storedCount : 0,
    });
  } catch (error) {
    console.error('[phase2-group-composer] Error:', error);
    return errorResponse((error as Error).message, 500, 'SERVER_ERROR');
  }
});

/**
 * Fetch plans from database for a city
 */
async function fetchPlansForCity(
  cityId: string,
  yearWeek?: string
): Promise<IndividualPlan[]> {
  const supabase = createServiceClient();

  let query = supabase
    .from('Plan')
    .select('*')
    .eq('cityId', cityId)
    .order('rank', { ascending: true });

  if (yearWeek) {
    query = query.eq('yearWeek', yearWeek);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    console.error('[phase2-group-composer] Error fetching plans:', error);
    throw new Error(`Failed to fetch plans: ${error.message}`);
  }

  return data || [];
}

/**
 * Analyze plans to identify grouping opportunities
 */
function analyzePlans(plans: IndividualPlan[]): {
  themeDistribution: { theme: string; count: number }[];
  neighborhoodDistribution: { neighborhood: string; count: number }[];
  priceDistribution: { priceRange: string; count: number }[];
  categoryToPlans: Map<string, IndividualPlan[]>;
  neighborhoodToPlans: Map<string, IndividualPlan[]>;
} {
  const categoryToPlans = new Map<string, IndividualPlan[]>();
  const neighborhoodToPlans = new Map<string, IndividualPlan[]>();
  const themeCounts = new Map<string, number>();
  const neighborhoodCounts = new Map<string, number>();
  const priceCounts = new Map<string, number>();

  for (const plan of plans) {
    // Group by category
    const existing = categoryToPlans.get(plan.category) || [];
    categoryToPlans.set(plan.category, [...existing, plan]);

    // Group by neighborhood
    const nbhExisting = neighborhoodToPlans.get(plan.neighborhood) || [];
    neighborhoodToPlans.set(plan.neighborhood, [...nbhExisting, plan]);

    // Count neighborhoods
    neighborhoodCounts.set(
      plan.neighborhood,
      (neighborhoodCounts.get(plan.neighborhood) || 0) + 1
    );

    // Count prices
    priceCounts.set(
      plan.priceRange,
      (priceCounts.get(plan.priceRange) || 0) + 1
    );

    // Map to themes
    const possibleThemes = CATEGORY_THEME_MAP[plan.category] || [];
    for (const theme of possibleThemes) {
      themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
    }
  }

  return {
    themeDistribution: Array.from(themeCounts.entries())
      .map(([theme, count]) => ({ theme, count }))
      .sort((a, b) => b.count - a.count),
    neighborhoodDistribution: Array.from(neighborhoodCounts.entries())
      .map(([neighborhood, count]) => ({ neighborhood, count }))
      .sort((a, b) => b.count - a.count),
    priceDistribution: Array.from(priceCounts.entries())
      .map(([priceRange, count]) => ({ priceRange, count }))
      .sort((a, b) => b.count - a.count),
    categoryToPlans,
    neighborhoodToPlans,
  };
}

/**
 * Use GPT to compose optimal group flows
 */
async function composeGroupFlows(
  plans: IndividualPlan[],
  analysis: ReturnType<typeof analyzePlans>,
  cityName: string,
  country: string,
  targetFlows: number
): Promise<ComposedGroupFlow[]> {
  // Build a summary of available plans for GPT
  const planSummaries = plans.map((p) => ({
    id: p.id,
    venueName: p.venueName,
    category: p.category,
    neighborhood: p.neighborhood,
    priceRange: p.priceRange,
    weekday: p.weekday,
    startTime: p.startTime,
    endTime: p.endTime,
    vibes: p.vibes || [],
    themes: p.themes || [],
    duration: p.durationMinutes || 90,
    isEvent: p.isEvent || false,
  }));

  // Top themes and neighborhoods to suggest
  const topThemes = analysis.themeDistribution.slice(0, 8).map((t) => t.theme);
  const topNeighborhoods = analysis.neighborhoodDistribution.slice(0, 6).map((n) => n.neighborhood);

  const userPrompt = buildCompositionPrompt(
    cityName,
    country,
    planSummaries,
    topThemes,
    topNeighborhoods,
    targetFlows
  );

  const response = await gptRequest(
    [{ role: 'user', content: userPrompt }],
    {
      systemPrompt: GROUP_COMPOSER_SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    }
  );

  const parsed = parseGPTJSON<{ groupFlows: ComposedGroupFlow[] }>(response);
  const flows = parsed.groupFlows || [];

  // Validate and enrich flows
  const validFlows: ComposedGroupFlow[] = [];

  for (const flow of flows) {
    // Validate plan IDs exist
    const validPlanIds = flow.planIds.filter((id) =>
      plans.some((p) => p.id === id)
    );

    if (validPlanIds.length < QUALITY_THRESHOLDS_V2.MIN_VENUES_PER_FLOW) {
      console.log(`[phase2-group-composer] Skipping flow "${flow.title}": not enough valid plans`);
      continue;
    }

    // Update steps with valid plan IDs
    flow.planIds = validPlanIds;
    flow.steps = flow.steps
      .filter((s) => validPlanIds.includes(s.planId))
      .map((s, idx) => ({ ...s, order: idx + 1 }));

    // Calculate total duration
    flow.totalDuration = flow.steps.reduce((sum, s) => sum + s.suggestedDuration, 0);

    // Determine primary neighborhood
    const neighborhoods = flow.steps
      .map((s) => plans.find((p) => p.id === s.planId)?.neighborhood)
      .filter(Boolean);
    flow.neighborhoodFocus = getMostCommon(neighborhoods as string[]) || 'Mixed';

    // Calculate price range
    const prices = flow.steps
      .map((s) => plans.find((p) => p.id === s.planId)?.priceRange)
      .filter(Boolean) as string[];
    flow.priceRange = calculateCombinedPriceRange(prices);

    // Estimate cost
    const fees = flow.steps
      .map((s) => plans.find((p) => p.id === s.planId)?.entryFee)
      .filter((f) => f !== null && f !== undefined) as number[];
    const avgFee = fees.length > 0 ? fees.reduce((a, b) => a + b, 0) / fees.length : 0;
    flow.estimatedCost = {
      min: Math.floor(avgFee * flow.steps.length * 0.8),
      max: Math.ceil(avgFee * flow.steps.length * 1.5),
      currency: plans[0]?.currency || 'USD',
    };

    validFlows.push(flow);

    if (validFlows.length >= targetFlows) break;
  }

  return validFlows;
}

/**
 * Store group flows to database
 */
async function storeGroupFlows(
  cityId: string,
  flows: ComposedGroupFlow[],
  yearWeek?: string
): Promise<number> {
  const supabase = createServiceClient();
  let storedCount = 0;

  for (const flow of flows) {
    try {
      // Generate unique ID
      const flowId = `gf${Date.now()}${Math.random().toString(36).substring(2, 7)}`;

      // Create GroupFlow record
      // Note: Using existing schema columns, skipping pipelineStep/pipelineStatus
      const groupFlowData = {
        id: flowId,
        flowId: flowId, // Required by schema
        cityId,
        title: flow.title,
        description: '', // Will be filled by comms specialist
        theme: flow.theme,
        difficulty: flow.difficulty,
        totalHours: Math.round(flow.totalDuration / 60), // Convert minutes to hours
        totalEstimate: Math.round(flow.estimatedCost.max), // Store as dollars
        currency: flow.estimatedCost.currency,
        aiGenerated: true,
        isWeekend: isWeekendDate(new Date().toISOString().split('T')[0]),
        proOnly: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { error: flowError } = await supabase
        .from('GroupFlow')
        .insert(groupFlowData);

      if (flowError) {
        console.error(`[phase2-group-composer] Error storing flow ${flow.title}:`, flowError);
        continue;
      }

      // Create GroupFlowStep records
      for (const step of flow.steps) {
        const stepId = `gfs${Date.now()}${Math.random().toString(36).substring(2, 5)}`;

        const stepData = {
          id: stepId,
          flowId,
          planId: step.planId,
          stepNumber: step.order,
          venueName: step.venueName,
          description: '', // Will be filled by comms specialist
          duration: step.suggestedDuration,
          transitionNote: step.transitionNote,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const { error: stepError } = await supabase
          .from('GroupFlowStep')
          .insert(stepData);

        if (stepError) {
          console.error(`[phase2-group-composer] Error storing step for ${flow.title}:`, stepError);
        }
      }

      storedCount++;
    } catch (error) {
      console.error(`[phase2-group-composer] Error storing flow ${flow.title}:`, error);
    }
  }

  return storedCount;
}

/**
 * Get most common element from array
 */
function getMostCommon(arr: string[]): string | undefined {
  const counts = new Map<string, number>();
  for (const item of arr) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  let maxCount = 0;
  let mostCommon: string | undefined;
  for (const [item, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = item;
    }
  }
  return mostCommon;
}

/**
 * Calculate combined price range from multiple venues
 */
function calculateCombinedPriceRange(prices: string[]): string {
  if (prices.length === 0) return '$$';

  const priceMap = { $: 1, $$: 2, $$$: 3, $$$$: 4 };
  const reverseMap = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

  const values = prices.map((p) => priceMap[p as keyof typeof priceMap] || 2);
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  return reverseMap[avg as keyof typeof reverseMap] || '$$';
}
