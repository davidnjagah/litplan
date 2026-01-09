/**
 * Group Plan Agent - AI Agent for generating unique group plans
 *
 * This agent:
 * 1. Searches for unique, dynamic group plans for cities
 * 2. Does NOT remove previous permanent group plans
 * 3. Only removes temporary/event-based group plans that have expired
 * 4. Updates existing plans with better recommendations, prices, hours
 *
 * Endpoints:
 * POST /ai-agents/group-plan-agent - Generate/update group plans for a city
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { openaiRequest, parseOpenAIJSON } from '../_shared/openai-client.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import {
  GROUP_PLAN_AGENT_SYSTEM_PROMPT,
  GROUP_PLANS_USER_PROMPT,
  UPDATE_GROUP_PLAN_PROMPT,
} from './prompts.ts';

// Coastal cities that should have boat party plans
const COASTAL_CITIES = new Set([
  'Miami', 'Los Angeles', 'San Francisco', 'San Diego', 'Barcelona', 'Lisbon', 'Dubai',
  'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Auckland',
  'Rio de Janeiro', 'Cape Town', 'Tel Aviv', 'Hong Kong',
  'Singapore', 'Bali', 'Bangkok', 'Tokyo', 'Osaka', 'Mumbai',
  'Istanbul', 'Amsterdam', 'Copenhagen', 'Stockholm', 'London', 'New York',
  'Vancouver', 'Seattle', 'Havana', 'Cancún', 'Ibiza', 'Mykonos',
  'Athens', 'Naples', 'Nice', 'Monaco', 'Marseille', 'Valencia',
]);

// Theme categories for group plans
const THEMES = [
  'rooftop',
  'comedy',
  'jazz',
  'speakeasy',
  'bar-hop',
  'boat-party',
  'cultural',
  'live-music',
  'alternative',
  'luxury',
];

interface GroupPlanVenue {
  venueName: string;
  description: string;
  category: string;
  address: string;
  startTime: string;
  duration: number;
  estimatedCost: number;
  order: number;
}

interface GroupPlan {
  title: string;
  description: string;
  theme: string;
  difficulty: string;
  isWeekend: boolean;
  isTemporary: boolean;
  eventDate?: string;
  estimatedCost: {
    min: number;
    max: number;
    currency: string;
  };
  venues: GroupPlanVenue[];
}

interface GenerateResult {
  plansGenerated: number;
  plansUpdated: number;
  plansRemoved: number;
  errors: string[];
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
    const {
      cityId,
      cityName,
      country,
      mode = 'generate', // 'generate' | 'update' | 'cleanup'
      targetCount = 5,
      forceRefresh = false,
    } = body;

    if (!cityId || !cityName || !country) {
      return errorResponse('cityId, cityName, and country required', 400, 'BAD_REQUEST');
    }

    console.log(`[group-plan-agent] Processing ${cityName}, ${country} (mode: ${mode})`);

    const supabase = createServiceClient();
    const result: GenerateResult = {
      plansGenerated: 0,
      plansUpdated: 0,
      plansRemoved: 0,
      errors: [],
    };

    // Step 1: Clean up expired temporary group flows
    const cleanupResult = await cleanupExpiredFlows(supabase, cityId);
    result.plansRemoved = cleanupResult;

    if (mode === 'cleanup') {
      return jsonResponse({
        success: true,
        data: {
          cityId,
          cityName,
          ...result,
        },
      });
    }

    // Step 2: Get existing permanent group flows for this city
    const { data: existingFlows } = await supabase
      .from('GroupFlow')
      .select('id, flowId, title, theme, description, isTemporary, lastRefreshed')
      .eq('cityId', cityId)
      .eq('isTemporary', false);

    const existingVenueNames = await getExistingVenueNames(supabase, existingFlows || []);
    console.log(`[group-plan-agent] Found ${existingFlows?.length || 0} existing permanent flows`);
    console.log(`[group-plan-agent] Existing venue names: ${existingVenueNames.length}`);

    // Step 3: Determine how many new plans to generate
    const existingCount = existingFlows?.length || 0;
    const neededCount = Math.max(0, targetCount - existingCount);
    const isCoastal = COASTAL_CITIES.has(cityName);

    // Check if we need boat party plan for coastal cities
    const hasBoatParty = existingFlows?.some(f => f.theme === 'boat-party');
    const needsBoatParty = isCoastal && !hasBoatParty;

    if (mode === 'generate' && neededCount > 0) {
      // Generate new plans
      const adjustedCount = needsBoatParty ? Math.max(neededCount, 1) : neededCount;
      console.log(`[group-plan-agent] Generating ${adjustedCount} new plans for ${cityName}`);

      const newPlans = await generateGroupPlans(
        cityName,
        country,
        existingVenueNames,
        isCoastal && needsBoatParty,
        adjustedCount
      );

      if (newPlans.length > 0) {
        const insertResult = await insertGroupPlans(supabase, cityId, newPlans, existingCount);
        result.plansGenerated = insertResult.success;
        if (insertResult.errors.length > 0) {
          result.errors.push(...insertResult.errors);
        }
      }
    }

    // Step 4: Update existing plans if requested or stale
    if (mode === 'update' || forceRefresh) {
      const stalePlans = (existingFlows || []).filter(flow => {
        if (!flow.lastRefreshed) return true;
        const lastRefresh = new Date(flow.lastRefreshed);
        const daysSinceRefresh = (Date.now() - lastRefresh.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceRefresh > 30; // Refresh if older than 30 days
      });

      console.log(`[group-plan-agent] Found ${stalePlans.length} stale plans to update`);

      for (const flow of stalePlans) {
        try {
          const updated = await updateGroupPlan(supabase, cityName, country, flow);
          if (updated) result.plansUpdated++;
        } catch (error) {
          result.errors.push(`Failed to update ${flow.title}: ${(error as Error).message}`);
        }
      }
    }

    console.log(`[group-plan-agent] Complete: ${result.plansGenerated} generated, ${result.plansUpdated} updated, ${result.plansRemoved} removed`);

    return jsonResponse({
      success: true,
      data: {
        cityId,
        cityName,
        isCoastal,
        existingFlows: existingCount,
        ...result,
      },
    });
  } catch (error) {
    console.error('[group-plan-agent] Error:', error);
    return errorResponse((error as Error).message || 'Internal server error', 500, 'SERVER_ERROR');
  }
});

/**
 * Clean up expired temporary group flows
 */
async function cleanupExpiredFlows(supabase: any, cityId: string): Promise<number> {
  const now = new Date().toISOString();

  // Find expired temporary flows
  const { data: expiredFlows, error } = await supabase
    .from('GroupFlow')
    .select('id')
    .eq('cityId', cityId)
    .eq('isTemporary', true)
    .lt('expiresAt', now);

  if (error || !expiredFlows || expiredFlows.length === 0) {
    return 0;
  }

  // Delete steps first (due to foreign key)
  const flowIds = expiredFlows.map((f: any) => f.id);
  await supabase
    .from('GroupFlowStep')
    .delete()
    .in('flowId', flowIds);

  // Delete the flows
  await supabase
    .from('GroupFlow')
    .delete()
    .in('id', flowIds);

  console.log(`[group-plan-agent] Cleaned up ${flowIds.length} expired temporary flows`);
  return flowIds.length;
}

/**
 * Get all venue names from existing group flows
 */
async function getExistingVenueNames(supabase: any, flows: any[]): Promise<string[]> {
  if (flows.length === 0) return [];

  const flowIds = flows.map(f => f.id);
  const { data: steps } = await supabase
    .from('GroupFlowStep')
    .select('venueName')
    .in('flowId', flowIds);

  return (steps || []).map((s: any) => s.venueName);
}

/**
 * Generate new group plans using Claude
 */
async function generateGroupPlans(
  cityName: string,
  country: string,
  existingVenues: string[],
  isCoastal: boolean,
  targetCount: number
): Promise<GroupPlan[]> {
  try {
    const userPrompt = GROUP_PLANS_USER_PROMPT(
      cityName,
      country,
      existingVenues,
      isCoastal,
      targetCount
    );

    const response = await openaiRequest(
      [{ role: 'user', content: userPrompt }],
      {
        systemPrompt: GROUP_PLAN_AGENT_SYSTEM_PROMPT,
        temperature: 0.8,
        maxTokens: 16384, // Increased for more group plans
        jsonMode: true,
        model: 'gpt-4o', // Using GPT-4o for better group plan generation
      }
    );

    const parsed = parseOpenAIJSON<{ plans: GroupPlan[] }>(response);
    const plans = parsed.plans || [];

    // Validate plans
    const validPlans = plans.filter(plan => {
      if (!plan.title || !plan.venues || plan.venues.length < 2) {
        console.log(`[group-plan-agent] Skipping invalid plan: ${plan.title}`);
        return false;
      }

      // Check for duplicate venues within the plan
      const venueNames = plan.venues.map(v => v.venueName.toLowerCase());
      const uniqueVenues = new Set(venueNames);
      if (uniqueVenues.size !== venueNames.length) {
        console.log(`[group-plan-agent] Skipping plan with duplicate venues: ${plan.title}`);
        return false;
      }

      // Check for venues that already exist
      const hasExisting = plan.venues.some(v =>
        existingVenues.some(e => e.toLowerCase() === v.venueName.toLowerCase())
      );
      if (hasExisting) {
        console.log(`[group-plan-agent] Skipping plan with existing venue: ${plan.title}`);
        return false;
      }

      return true;
    });

    console.log(`[group-plan-agent] Generated ${validPlans.length} valid plans out of ${plans.length}`);
    return validPlans;
  } catch (error) {
    console.error('[group-plan-agent] Error generating plans:', error);
    return [];
  }
}

/**
 * Insert new group plans into the database
 */
async function insertGroupPlans(
  supabase: any,
  cityId: string,
  plans: GroupPlan[],
  startRank: number
): Promise<{ success: number; errors: string[] }> {
  const results = { success: 0, errors: [] as string[] };
  const timestamp = new Date().toISOString();

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const flowId = `gf-${cityId.slice(-8)}-${Date.now()}-${i}`;

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
          totalHours: Math.ceil(plan.venues.reduce((sum, v) => sum + v.duration, 0) / 60),
          startTime: plan.venues[0]?.startTime || '19:00',
          endTime: plan.venues[plan.venues.length - 1]?.startTime || '02:00',
          totalEstimate: Math.round(((plan.estimatedCost?.min || 0) + (plan.estimatedCost?.max || 0)) / 2 * 100),
          currency: plan.estimatedCost?.currency || 'USD',
          isWeekend: plan.isWeekend,
          proOnly: (startRank + i) >= 2, // First 2 are free
          aiGenerated: true,
          isTemporary: plan.isTemporary || false,
          eventDate: plan.eventDate || null,
          expiresAt: plan.isTemporary ? getExpirationDate(plan.eventDate) : null,
          theme: plan.theme || 'bar-hop',
          difficulty: plan.difficulty || 'moderate',
          lastRefreshed: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .select()
        .single();

      if (flowError) {
        console.error(`[group-plan-agent] Error inserting flow ${plan.title}:`, flowError);
        results.errors.push(`Failed to insert ${plan.title}: ${flowError.message}`);
        continue;
      }

      // Insert GroupFlowSteps
      for (const venue of plan.venues) {
        const stepId = `${flowId}-step-${venue.order}`;
        const { error: stepError } = await supabase
          .from('GroupFlowStep')
          .insert({
            id: stepId,
            flowId: flow.id,
            planId: null, // No direct plan link for AI-generated steps
            stepNumber: venue.order,
            title: venue.category || 'Stop',
            venueName: venue.venueName,
            duration: venue.duration,
            thumbnail: getThumbnailForCategory(venue.category),
          });

        if (stepError) {
          console.error(`[group-plan-agent] Error inserting step:`, stepError);
        }
      }

      results.success++;
      console.log(`[group-plan-agent] Inserted: ${plan.title} (${plan.venues.length} stops)`);
    } catch (error) {
      results.errors.push(`Failed to insert ${plan.title}: ${(error as Error).message}`);
    }
  }

  return results;
}

/**
 * Update an existing group plan
 */
async function updateGroupPlan(
  supabase: any,
  cityName: string,
  country: string,
  existingFlow: any
): Promise<boolean> {
  try {
    // Get existing steps
    const { data: steps } = await supabase
      .from('GroupFlowStep')
      .select('venueName, title')
      .eq('flowId', existingFlow.id);

    const venues = (steps || []).map((s: any) => ({
      venueName: s.venueName,
      category: s.title,
    }));

    // Ask OpenAI to review and update
    const userPrompt = UPDATE_GROUP_PLAN_PROMPT(cityName, country, {
      title: existingFlow.title,
      description: existingFlow.description || '',
      venues,
    });

    const response = await openaiRequest(
      [{ role: 'user', content: userPrompt }],
      {
        systemPrompt: GROUP_PLAN_AGENT_SYSTEM_PROMPT,
        temperature: 0.5,
        maxTokens: 2048,
        jsonMode: true,
        model: 'gpt-4o',
      }
    );

    const result = parseOpenAIJSON<{
      needsUpdate: boolean;
      updatedPlan?: any;
      changes?: string[];
    }>(response);

    if (!result.needsUpdate) {
      // Just update lastRefreshed
      await supabase
        .from('GroupFlow')
        .update({ lastRefreshed: new Date().toISOString() })
        .eq('id', existingFlow.id);
      return false;
    }

    // Update the flow
    if (result.updatedPlan) {
      await supabase
        .from('GroupFlow')
        .update({
          description: result.updatedPlan.description || existingFlow.description,
          lastRefreshed: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', existingFlow.id);

      console.log(`[group-plan-agent] Updated ${existingFlow.title}: ${result.changes?.join(', ')}`);
    }

    return true;
  } catch (error) {
    console.error(`[group-plan-agent] Error updating ${existingFlow.title}:`, error);
    return false;
  }
}

/**
 * Get expiration date for temporary flows (1 day after event)
 */
function getExpirationDate(eventDate?: string): string {
  const date = eventDate ? new Date(eventDate) : new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString();
}

/**
 * Get thumbnail URL based on venue category
 */
function getThumbnailForCategory(category: string): string {
  const categoryLower = (category || '').toLowerCase();

  if (categoryLower.includes('jazz')) {
    return 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&q=80';
  }
  if (categoryLower.includes('comedy')) {
    return 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=400&q=80';
  }
  if (categoryLower.includes('rooftop')) {
    return 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&q=80';
  }
  if (categoryLower.includes('beach') || categoryLower.includes('yacht') || categoryLower.includes('boat')) {
    return 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80';
  }
  if (categoryLower.includes('speakeasy')) {
    return 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400&q=80';
  }
  if (categoryLower.includes('club') || categoryLower.includes('nightclub')) {
    return 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400&q=80';
  }
  if (categoryLower.includes('live music')) {
    return 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80';
  }

  // Default bar/cocktail image
  return 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&q=80';
}
