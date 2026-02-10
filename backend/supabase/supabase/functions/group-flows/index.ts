/**
 * Group Flows Edge Function
 * Handles group flow (multi-venue plans) operations
 *
 * Endpoints:
 * GET /group-flows?cityId=xxx - List group flows for a city
 * GET /group-flows/:id - Get group flow by ID
 *
 * Returns data in iOS-compatible format with activities array
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient, createAuthenticatedClient } from '../_shared/supabase-client.ts';
import { verifyAuth, isPremiumUser } from '../_shared/auth.ts';

// iOS-compatible activity structure
interface Activity {
  activityId: string;
  venueName: string;
  location: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  startTime: string;
  duration: number;
  description: string;
  order: number;
}

// iOS-compatible GroupFlow structure
interface iOSGroupFlow {
  groupFlowId: string;
  cityId: string;
  title: string;
  description: string;
  activities: Activity[];
  totalDuration: number;
  estimatedCost: {
    min: number;
    max: number;
    currency: string;
    includes: string; // Dynamic description of what's included in cost
  };
  difficulty: string;
  bestFor: string[];
  aiTags: string[];
  isLocked: boolean;
  planType?: string;
  isWeekend?: boolean;
  weekday?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const method = req.method;

    // Verify authentication (optional for listing - allow guest access)
    const authResult = await verifyAuth(req, false);

    const serviceClient = createServiceClient();
    const userId = authResult.user?.id;

    // Check premium status for full access
    const hasPremium = userId ? await isPremiumUser(userId, serviceClient) : false;

    // Route: GET /group-flows/:id
    if (pathParts.length >= 2 && method === 'GET') {
      const groupFlowId = pathParts[1];
      return await getGroupFlowById(serviceClient, groupFlowId, hasPremium);
    }

    // Route: GET /group-flows?cityId=xxx or GET /group-flows?debug=true
    if (method === 'GET') {
      const cityId = url.searchParams.get('cityId');
      const debug = url.searchParams.get('debug');

      // Debug mode - return all group flows
      if (debug === 'true') {
        const { data: allFlows, count } = await serviceClient
          .from('GroupFlow')
          .select('id, flowId, cityId, title', { count: 'exact' })
          .limit(10);

        const { data: allSteps, count: stepsCount } = await serviceClient
          .from('GroupFlowStep')
          .select('*', { count: 'exact' })
          .limit(10);

        const { data: cities } = await serviceClient
          .from('City')
          .select('id, cityId, name')
          .limit(5);

        return jsonResponse({
          debug: true,
          groupFlows: allFlows || [],
          total: count || 0,
          steps: allSteps || [],
          stepsTotal: stepsCount || 0,
          cities: cities || [],
        });
      }

      if (!cityId) {
        return errorResponse('cityId parameter required', 400, 'BAD_REQUEST');
      }
      return await listGroupFlows(serviceClient, cityId, url.searchParams, hasPremium);
    }

    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  } catch (error) {
    console.error('[group-flows] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500, 'SERVER_ERROR');
  }
});

/**
 * Transform backend data to iOS-compatible format
 */
function transformToiOSFormat(
  flow: any,
  steps: any[],
  plans: Map<string, any>,
  hasPremium: boolean,
  index: number
): iOSGroupFlow {
  // Parse the flow's actual start time from database, fallback to 19:00 (7 PM)
  let currentHour = 19;
  let currentMinute = 0;

  if (flow.startTime) {
    // Parse "HH:MM" format from database
    const [hours, minutes] = flow.startTime.split(':').map(Number);
    if (!isNaN(hours)) currentHour = hours;
    if (!isNaN(minutes)) currentMinute = minutes;
  }

  const activities: Activity[] = steps
    .sort((a, b) => a.stepNumber - b.stepNumber)
    .map((step, idx) => {
      const plan = plans.get(step.planId) || {};

      // Use step's startTime if available, otherwise calculate from flow start
      let startTime: string;
      if (step.startTime) {
        // Use actual startTime from database (GroupFlowStep.startTime)
        startTime = step.startTime;
        // Update currentHour/currentMinute for next activity calculation
        const [h, m] = step.startTime.split(':').map(Number);
        if (!isNaN(h)) currentHour = h;
        if (!isNaN(m)) currentMinute = m;
        // Advance time for next activity
        const totalMinutes = currentHour * 60 + currentMinute + (step.duration || 60);
        currentHour = Math.floor(totalMinutes / 60) % 24;
        currentMinute = totalMinutes % 60;
      } else {
        // Calculate time based on previous activity (fallback)
        startTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        // Advance time for next activity
        const totalMinutes = currentHour * 60 + currentMinute + (step.duration || 60);
        currentHour = Math.floor(totalMinutes / 60) % 24;
        currentMinute = totalMinutes % 60;
      }

      return {
        activityId: `${flow.id}-activity-${idx + 1}`,
        venueName: step.venueName || plan.venueName || 'Venue',
        location: {
          address: plan.address || step.venueName || 'Address TBD',
          coordinates: {
            latitude: plan.latitude || 0,
            longitude: plan.longitude || 0,
          },
        },
        startTime,
        duration: step.duration || 60,
        description: plan.description || step.title || 'Experience this amazing venue',
        order: idx + 1,
      };
    });

  // Calculate total duration in minutes
  const totalDuration = activities.reduce((sum, a) => sum + a.duration, 0);

  // Use AI-generated costs from database, fallback to smart estimate if not available
  let minCost = flow.costMin;
  let maxCost = flow.costMax;

  // Smart fallback for legacy data without cost fields - based on plan type and title
  if (minCost === null || minCost === undefined || maxCost === null || maxCost === undefined) {
    const costEstimate = getSmartCostEstimate(flow.planType, flow.title, activities.length);
    minCost = costEstimate.min;
    maxCost = costEstimate.max;
  }

  // Use difficulty from database, fallback to calculated if not available
  let difficulty = flow.difficulty || 'easy';
  if (!flow.difficulty) {
    if (activities.length >= 4 || totalDuration > 300) {
      difficulty = 'intense';
    } else if (activities.length >= 3 || totalDuration > 180) {
      difficulty = 'moderate';
    }
  }

  // Use database tags if available, otherwise generate from activities
  let aiTags: string[];
  if (flow.tags && Array.isArray(flow.tags) && flow.tags.length > 0) {
    // Use tags from database (stored by pipeline)
    aiTags = flow.tags.slice(0, 5);
  } else {
    // Fallback: Generate aiTags from plan type and activities
    const generatedTags = new Set<string>();

    // Add plan type based tags
    const pt = (flow.planType || '').toLowerCase();
    if (pt.includes('free')) generatedTags.add('Free');
    if (pt.includes('couples') || pt.includes('romantic')) generatedTags.add('Romantic');
    if (pt.includes('family')) generatedTags.add('Family-Friendly');
    if (pt.includes('luxury')) generatedTags.add('Luxury');
    if (pt.includes('girls')) generatedTags.add('Girls Night');
    if (pt.includes('boys')) generatedTags.add('Boys Night');
    if (pt.includes('friend')) generatedTags.add('Social');
    if (pt.includes('cultural')) generatedTags.add('Cultural');

    // Add venue-based tags
    activities.forEach((a) => {
      const venue = a.venueName.toLowerCase();
      if (venue.includes('bar')) generatedTags.add('Bar');
      if (venue.includes('club')) generatedTags.add('Nightclub');
      if (venue.includes('rooftop')) generatedTags.add('Rooftop');
      if (venue.includes('jazz')) generatedTags.add('Jazz');
      if (venue.includes('beach')) generatedTags.add('Beach');
      if (venue.includes('park')) generatedTags.add('Outdoor');
      if (venue.includes('museum')) generatedTags.add('Cultural');
    });

    if (flow.title.toLowerCase().includes('music')) generatedTags.add('Live Music');
    if (flow.isWeekend) generatedTags.add('Weekend');

    // Only add Nightlife if it's actually a night plan
    if (activities[0]?.startTime) {
      const hour = parseInt(activities[0].startTime.split(':')[0]);
      if (hour >= 18 || hour < 6) generatedTags.add('Nightlife');
    }

    aiTags = Array.from(generatedTags).slice(0, 5);
  }

  // First 2 flows are free
  const isLocked = !hasPremium && (flow.proOnly || index >= 2);

  // Determine cost includes based on plan type and activities
  const costIncludes = getCostIncludesText(flow.planType, flow.title, activities);

  return {
    groupFlowId: flow.id,
    cityId: flow.cityId,
    title: flow.title,
    description: flow.description,
    activities,
    totalDuration,
    estimatedCost: {
      min: minCost,
      max: maxCost,
      currency: flow.currency || 'USD',
      includes: costIncludes,
    },
    difficulty,
    bestFor: flow.isWeekend ? ['groups', 'couples'] : ['groups', 'solo'],
    aiTags: Array.from(aiTags).slice(0, 5),
    isLocked,
    planType: flow.planType,
    isWeekend: flow.isWeekend,
    weekday: flow.weekday,
  };
}

/**
 * Get smart cost estimate based on plan type (fallback when database columns don't exist)
 */
function getSmartCostEstimate(planType: string | null, title: string, numActivities: number): { min: number; max: number } {
  const pt = (planType || '').toLowerCase();
  const titleLower = (title || '').toLowerCase();

  // Free experiences - $0 (3 types: free_daytime, free_sunset, free_cultural)
  // Comprehensive keyword matching for free plans
  // Note: "sunset serenity" is free but "sunset love" is romantic - check serenity first
  if (pt.includes('free') ||
      titleLower.includes('free') ||
      titleLower.includes('budget') ||
      titleLower.includes('on a dime') ||
      titleLower.includes('exploring') ||
      titleLower.includes('exploration') ||
      titleLower.includes('wonders') ||
      titleLower.includes('discovery') ||
      titleLower.includes('discover') ||
      titleLower.includes('stroll') ||
      titleLower.includes('promenade') ||
      titleLower.includes('waterfront') ||
      titleLower.includes('heritage') ||
      titleLower.includes('cultural') ||
      titleLower.includes('walking') ||
      titleLower.includes('park') ||
      titleLower.includes('coastal') ||
      titleLower.includes('art ') ||         // Space to avoid "party"
      titleLower.includes('street art') ||
      titleLower.includes('serenity') ||     // "Sunset Serenity" = free sunset plan
      (titleLower.includes('sunset') && !titleLower.includes('love'))) { // Sunset without "love" = free sunset
    return { min: 0, max: 20 };
  }

  // Luxury/VIP - high costs (check before other categories)
  if (pt.includes('luxury') || titleLower.includes('luxury') || titleLower.includes('opulent') ||
      titleLower.includes('vip') || titleLower.includes('elite') || titleLower.includes('five star') ||
      titleLower.includes('lavish') ||       // Added
      titleLower.includes('premium') ||      // Added
      titleLower.includes('exclusive')) {    // Added
    return { min: 400, max: 800 };
  }

  // Family plans - moderate costs
  if (pt.includes('family') || titleLower.includes('family') || titleLower.includes('kids') || titleLower.includes('fun day')) {
    return { min: 50, max: 150 };
  }

  // Night out plans - moderate-high
  if (pt.includes('night_out') || pt.includes('nightout') || titleLower.includes('night out') ||
      titleLower.includes('ladies night') || titleLower.includes("gentlemen's night") || titleLower.includes("men's night") ||
      titleLower.includes('chic night') ||   // Added
      titleLower.includes('glamour')) {      // Added
    return { min: 100, max: 300 };
  }

  // Couples/romantic - moderate-high
  if (pt.includes('couple') || pt.includes('romantic') || titleLower.includes('romance') ||
      titleLower.includes('romantic') || titleLower.includes('lovers') || titleLower.includes('intimate') ||
      titleLower.includes('sunset love') ||  // Added
      titleLower.includes('serenade')) {
    return { min: 120, max: 250 };
  }

  // Girls/boys trips
  if (pt.includes('girls_trip') || pt.includes('boys_trip') || titleLower.includes('girls') ||
      titleLower.includes('glam') || titleLower.includes('getaway') || titleLower.includes('escape')) {
    return { min: 80, max: 200 };
  }

  // Friend groups - moderate
  if (pt.includes('friend') || titleLower.includes('friend') || titleLower.includes('fiesta') ||
      titleLower.includes('adventure') || titleLower.includes('vibes')) {
    return { min: 60, max: 150 };
  }

  // Default based on number of activities
  const perActivity = 40;
  return {
    min: numActivities * (perActivity - 10),
    max: numActivities * (perActivity + 20)
  };
}

/**
 * Get dynamic cost includes text based on plan type
 */
function getCostIncludesText(planType: string | null, title: string, activities: Activity[]): string {
  const pt = (planType || '').toLowerCase();
  const titleLower = title.toLowerCase();
  const venueNames = activities.map(a => a.venueName.toLowerCase()).join(' ');

  // Free experiences - NO cost, self-guided
  if (pt.includes('free') ||
      titleLower.includes('free') ||
      titleLower.includes('exploration') ||
      titleLower.includes('promenade') ||
      titleLower.includes('waterfront') ||
      titleLower.includes('heritage') ||
      titleLower.includes('cultural') ||
      titleLower.includes('coastal') ||
      titleLower.includes('park') ||
      titleLower.includes('wonders') ||
      titleLower.includes('serenity') ||
      (titleLower.includes('sunset') && !titleLower.includes('love'))) {
    return 'Free admission • Self-guided';
  }

  // Family experiences
  if (pt.includes('family')) {
    return 'Entry fees + snacks';
  }

  // Adventure/exploration plans
  if (titleLower.includes('adventure') || titleLower.includes('explor') ||
      titleLower.includes('conquering') || titleLower.includes('tour')) {
    return 'Activities + transportation';
  }

  // Girls/boys trips
  if (pt.includes('girls_trip') || pt.includes('boys_trip')) {
    if (venueNames.includes('beach') || venueNames.includes('pool')) {
      return 'Entry + drinks + loungers';
    }
    return 'Entry + 2-3 drinks per venue';
  }

  // Couples/romantic plans
  if (pt.includes('couple') || pt.includes('romantic')) {
    return 'Entry + drinks for two';
  }

  // Luxury experiences
  if (pt.includes('luxury') || titleLower.includes('luxury') || titleLower.includes('vip')) {
    return 'VIP entry + bottle service';
  }

  // Night out plans
  if (pt.includes('night_out') || pt.includes('nightlife')) {
    return 'Entry + 2-3 drinks';
  }

  // Check venue types for context
  if (venueNames.includes('restaurant') || venueNames.includes('dinner')) {
    return 'Food + drinks';
  }

  if (venueNames.includes('club') || venueNames.includes('bar')) {
    return 'Entry + 2-3 drinks';
  }

  if (venueNames.includes('museum') || venueNames.includes('gallery')) {
    return 'Entry fees';
  }

  // Default
  return 'Entry + activities';
}

/**
 * List group flows for a city
 */
async function listGroupFlows(
  supabase: any,
  cityId: string,
  params: URLSearchParams,
  hasPremium: boolean
) {
  const limit = parseInt(params.get('limit') || '20');
  const offset = parseInt(params.get('offset') || '0');

  // First, try to resolve the cityId to the actual database city ID
  // The cityId might be either a short code (like "nyc") or the full database ID
  let resolvedCityId = cityId;

  // If it looks like a short code (not a CUID), look up the actual ID
  if (!cityId.startsWith('cm') && cityId.length < 20) {
    const { data: city } = await supabase
      .from('City')
      .select('id')
      .eq('cityId', cityId)
      .single();

    if (city) {
      resolvedCityId = city.id;
      console.log(`[group-flows] Resolved cityId ${cityId} to ${resolvedCityId}`);
    }
  }

  // Get group flows for the city
  const { data: groupFlows, count, error } = await supabase
    .from('GroupFlow')
    .select('*', { count: 'exact' })
    .eq('cityId', resolvedCityId)
    .order('rank', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[group-flows] List error:', error);
    return errorResponse('Failed to fetch group flows', 500, 'DATABASE_ERROR');
  }

  if (!groupFlows || groupFlows.length === 0) {
    return jsonResponse({
      groupFlows: [],
      total: 0,
      limit,
      offset,
    });
  }

  // Get all steps for these flows
  // Steps use the GroupFlow's database ID, not the flowId field
  const flowDbIds = groupFlows.map((f: any) => f.id);
  const { data: allSteps, error: stepsError } = await supabase
    .from('GroupFlowStep')
    .select('*')
    .in('flowId', flowDbIds)
    .order('stepNumber', { ascending: true });

  if (stepsError) {
    console.error('[group-flows] Steps error:', stepsError);
  }

  // Get all related plans for location data
  const planIds = (allSteps || []).map((s: any) => s.planId).filter(Boolean);
  const plansMap = new Map<string, any>();

  if (planIds.length > 0) {
    const { data: plans } = await supabase
      .from('Plan')
      .select('id, venueName, address, latitude, longitude, description')
      .in('id', planIds);

    (plans || []).forEach((p: any) => plansMap.set(p.id, p));
  }

  // Group steps by flowId (which is the GroupFlow's database ID)
  const stepsByFlow = new Map<string, any[]>();
  (allSteps || []).forEach((step: any) => {
    const existing = stepsByFlow.get(step.flowId) || [];
    existing.push(step);
    stepsByFlow.set(step.flowId, existing);
  });

  // Transform to iOS format - use flow.id to look up steps
  const processedFlows = groupFlows.map((flow: any, index: number) => {
    const steps = stepsByFlow.get(flow.id) || [];
    return transformToiOSFormat(flow, steps, plansMap, hasPremium, index);
  });

  return jsonResponse({
    groupFlows: processedFlows,
    total: count || 0,
    limit,
    offset,
  });
}

/**
 * Get a single group flow by ID
 */
async function getGroupFlowById(supabase: any, groupFlowId: string, hasPremium: boolean) {
  // Get the group flow
  const { data: groupFlow, error } = await supabase
    .from('GroupFlow')
    .select('*')
    .or(`id.eq.${groupFlowId},flowId.eq.${groupFlowId}`)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Group flow not found', 404, 'NOT_FOUND');
    }
    console.error('[group-flows] Get error:', error);
    return errorResponse('Failed to fetch group flow', 500, 'DATABASE_ERROR');
  }

  // Check premium access
  if (groupFlow.proOnly && !hasPremium) {
    return errorResponse('Premium subscription required', 403, 'PREMIUM_REQUIRED');
  }

  // Get steps for this flow (steps use the GroupFlow's database ID)
  const { data: steps } = await supabase
    .from('GroupFlowStep')
    .select('*')
    .eq('flowId', groupFlow.id)
    .order('stepNumber', { ascending: true });

  // Get related plans
  const planIds = (steps || []).map((s: any) => s.planId).filter(Boolean);
  const plansMap = new Map<string, any>();

  if (planIds.length > 0) {
    const { data: plans } = await supabase
      .from('Plan')
      .select('id, venueName, address, latitude, longitude, description')
      .in('id', planIds);

    (plans || []).forEach((p: any) => plansMap.set(p.id, p));
  }

  const iOSFlow = transformToiOSFormat(groupFlow, steps || [], plansMap, hasPremium, 0);

  return jsonResponse({
    groupFlow: iOSFlow,
  });
}
