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
  };
  difficulty: string;
  bestFor: string[];
  aiTags: string[];
  isLocked: boolean;
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
  // Calculate start times based on duration
  let currentHour = 19; // Start at 7 PM
  let currentMinute = 0;

  const activities: Activity[] = steps
    .sort((a, b) => a.stepNumber - b.stepNumber)
    .map((step, idx) => {
      const plan = plans.get(step.planId) || {};
      const startTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

      // Advance time for next activity
      const totalMinutes = currentHour * 60 + currentMinute + (step.duration || 60);
      currentHour = Math.floor(totalMinutes / 60) % 24;
      currentMinute = totalMinutes % 60;

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

  // Estimate cost based on number of stops
  const estimatePerStop = 40; // ~$40 per stop
  const minCost = activities.length * (estimatePerStop - 10);
  const maxCost = activities.length * (estimatePerStop + 20);

  // Determine difficulty based on number of stops and duration
  let difficulty = 'easy';
  if (activities.length >= 4 || totalDuration > 300) {
    difficulty = 'intense';
  } else if (activities.length >= 3 || totalDuration > 180) {
    difficulty = 'moderate';
  }

  // Generate aiTags from activities
  const aiTags = new Set<string>();
  activities.forEach((a) => {
    if (a.venueName.toLowerCase().includes('bar')) aiTags.add('Bar');
    if (a.venueName.toLowerCase().includes('club')) aiTags.add('Nightclub');
    if (a.venueName.toLowerCase().includes('rooftop')) aiTags.add('Rooftop');
    if (a.venueName.toLowerCase().includes('jazz')) aiTags.add('Jazz');
    if (a.venueName.toLowerCase().includes('comedy')) aiTags.add('Comedy');
  });
  if (flow.title.toLowerCase().includes('music')) aiTags.add('Live Music');
  if (flow.isWeekend) aiTags.add('Weekend');
  aiTags.add('Nightlife');

  // First 2 flows are free
  const isLocked = !hasPremium && (flow.proOnly || index >= 2);

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
    },
    difficulty,
    bestFor: flow.isWeekend ? ['groups', 'couples'] : ['groups', 'solo'],
    aiTags: Array.from(aiTags).slice(0, 5),
    isLocked,
  };
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
