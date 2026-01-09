/**
 * Plans Edge Function
 * Handles plan listing and details with authentication
 *
 * Endpoints:
 * GET /plans?cityId=xxx - List plans for a city
 * GET /plans/:id - Get plan by ID
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient, createAuthenticatedClient } from '../_shared/supabase-client.ts';
import { verifyAuth } from '../_shared/auth.ts';

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const method = req.method;

    // Verify authentication - allow guest access for reading plans
    const authResult = await verifyAuth(req, false);
    // Note: authResult.error will only be set if requireAuth=true, so we don't check it here

    const authHeader = req.headers.get('Authorization') || '';
    const supabase = authResult.user
      ? createAuthenticatedClient(authHeader)
      : createServiceClient();

    // Route: GET /plans/:id
    if (pathParts.length >= 2 && method === 'GET') {
      const planId = pathParts[1];
      return await getPlanById(supabase, planId);
    }

    // Route: GET /plans?cityId=xxx
    if (method === 'GET') {
      const cityId = url.searchParams.get('cityId');
      if (!cityId) {
        return errorResponse('cityId parameter required', 400, 'BAD_REQUEST');
      }
      return await listPlans(supabase, cityId, url.searchParams);
    }

    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  } catch (error) {
    console.error('[plans] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500, 'SERVER_ERROR');
  }
});

/**
 * List plans for a city with optional date filtering
 */
async function listPlans(supabase: any, cityId: string, params: URLSearchParams) {
  const limit = parseInt(params.get('limit') || '50');
  const offset = parseInt(params.get('offset') || '0');
  const date = params.get('date'); // Optional: filter by specific date
  const dayOfWeek = params.get('dayOfWeek'); // Optional: filter by day
  const yearWeek = params.get('yearWeek'); // Optional: filter by week (e.g., "2026-W02")
  const isEvent = params.get('isEvent'); // Optional: filter events only

  console.log(`[plans] Fetching plans for cityId: ${cityId}, limit: ${limit}, offset: ${offset}`);

  // First, let's verify the city exists and check plan count
  const { data: cityCheck, error: cityError } = await supabase
    .from('City')
    .select('id, name')
    .eq('id', cityId)
    .single();

  if (cityError || !cityCheck) {
    console.log(`[plans] City not found for id: ${cityId}`);
  } else {
    console.log(`[plans] City found: ${cityCheck.name} (${cityCheck.id})`);
  }

  // Check total plans in database for debugging
  const { count: totalPlanCount } = await supabase
    .from('Plan')
    .select('*', { count: 'exact', head: true });
  console.log(`[plans] Total plans in database: ${totalPlanCount}`);

  // Check plans for this specific city without any filters
  const { count: cityPlanCount } = await supabase
    .from('Plan')
    .select('*', { count: 'exact', head: true })
    .eq('cityId', cityId);
  console.log(`[plans] Plans for this cityId: ${cityPlanCount}`);

  let query = supabase
    .from('Plan')
    .select('*', { count: 'exact' })
    .eq('cityId', cityId)
    .order('date', { ascending: true })
    .order('rank', { ascending: true })
    .range(offset, offset + limit - 1);

  // Filter by date if specified
  if (date) {
    console.log(`[plans] Filtering by date: ${date}`);
    query = query.eq('date', date);
  }

  // Filter by day of week if specified
  if (dayOfWeek) {
    console.log(`[plans] Filtering by dayOfWeek: ${dayOfWeek}`);
    query = query.eq('weekday', dayOfWeek);
  }

  // Filter by yearWeek if specified (e.g., "2026-W02")
  if (yearWeek) {
    console.log(`[plans] Filtering by yearWeek: ${yearWeek}`);
    query = query.eq('yearWeek', yearWeek);
  }

  // Filter events only if specified
  if (isEvent === 'true') {
    console.log(`[plans] Filtering events only`);
    query = query.eq('isEvent', true);
  } else if (isEvent === 'false') {
    console.log(`[plans] Filtering venues only (excluding events)`);
    query = query.eq('isEvent', false);
  }

  const { data: rawPlans, count, error } = await query;

  if (error) {
    console.error('[plans] List error:', error);
    return errorResponse('Failed to fetch plans', 500, 'DATABASE_ERROR');
  }

  console.log(`[plans] Found ${rawPlans?.length || 0} plans (total: ${count})`);
  if (rawPlans && rawPlans.length > 0) {
    console.log(`[plans] First plan: ${rawPlans[0].id} - ${rawPlans[0].title}`);
  }

  // Transform flat database rows to iOS expected nested structure
  const plans = (rawPlans || []).map(transformPlanForIOS);

  return jsonResponse({
    plans,
    total: count || 0,
    limit,
    offset,
  });
}

/**
 * Transform database Plan row to iOS expected structure
 * Database has flat columns, iOS expects nested objects
 */
function transformPlanForIOS(plan: any) {
  return {
    id: plan.id,
    title: plan.title,
    venueName: plan.venueName,
    category: plan.category,
    description: plan.description || `Experience ${plan.venueName} - a top ${plan.category} destination.`,
    cityName: '', // Will be populated by iOS from city context
    images: plan.galleryImages?.length > 0
      ? plan.galleryImages
      : [plan.heroImage, plan.thumbnailImage].filter(Boolean),
    location: {
      address: plan.address || '',
      neighborhood: plan.neighborhood || '',
      coordinates: {
        latitude: plan.latitude || 0,
        longitude: plan.longitude || 0,
      },
    },
    schedule: {
      date: plan.date,
      startTime: plan.startTime || '20:00',
      endTime: plan.endTime || '23:00',
      dayOfWeek: plan.weekday,
      isWeekend: ['Friday', 'Saturday', 'Sunday'].includes(plan.weekday),
      weekNumber: plan.weekNumber,
      yearWeek: plan.yearWeek,
      isEvent: plan.isEvent,
      eventDate: plan.eventDate,
    },
    pricing: {
      entryFee: (plan.entryFee || 0) / 100, // Convert cents to dollars
      currency: plan.currency || 'USD',
      priceRange: plan.priceRange || '$$',
    },
    aiTags: [...(plan.genres || []), ...(plan.vibes || [])],
    flags: {
      isWeekendPlan: ['Friday', 'Saturday', 'Sunday'].includes(plan.weekday),
      requiresReservation: false,
      ageRestriction: 21,
      rank: plan.rank,
    },
  };
}

/**
 * Get a single plan by ID
 */
async function getPlanById(supabase: any, planId: string) {
  const { data: rawPlan, error } = await supabase
    .from('Plan')
    .select('*')
    .eq('id', planId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Plan not found', 404, 'NOT_FOUND');
    }
    console.error('[plans] Get error:', error);
    return errorResponse('Failed to fetch plan', 500, 'DATABASE_ERROR');
  }

  // Transform to iOS expected structure
  const plan = transformPlanForIOS(rawPlan);
  return jsonResponse({ plan });
}
