/**
 * Cities Edge Function
 * Handles city listing, details, and search
 *
 * Endpoints:
 * GET /cities - List all cities
 * GET /cities/:id - Get city by ID
 * GET /cities/search?q=query - Search cities
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse, corsHeaders } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const method = req.method;

    const supabase = createServiceClient();

    // Route: GET /cities/search?q=query
    if (pathParts.length >= 2 && pathParts[1] === 'search' && method === 'GET') {
      const query = url.searchParams.get('q') || '';
      return await searchCities(supabase, query);
    }

    // Route: GET /cities/:id
    if (pathParts.length >= 2 && method === 'GET') {
      const cityId = pathParts[1];
      return await getCityById(supabase, cityId);
    }

    // Route: GET /cities
    if (method === 'GET') {
      return await listCities(supabase, url.searchParams);
    }

    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  } catch (error) {
    console.error('[cities] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500, 'SERVER_ERROR');
  }
});

/**
 * Get country flag emoji from country code
 */
function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/**
 * Transform database City row to iOS expected structure
 * Database has flat columns, iOS expects nested displayAssets object
 */
function transformCityForIOS(city: any, actualPlanCount?: number) {
  return {
    id: city.id,
    name: city.name,
    country: city.country,
    displayAssets: {
      heroImageUrl: city.heroImage || '',
      thumbnailUrl: city.cardImage || '',
      countryFlag: getCountryFlag(city.countryCode),
    },
    coordinates: {
      latitude: city.latitude || 0,
      longitude: city.longitude || 0,
    },
    metadata: {
      timezone: city.timezone || '',
      currency: 'USD', // Default to USD
      featured: city.featured || false,
      planCount: actualPlanCount ?? city.totalPlansThisWeek ?? 0,
      actualPlanCount: actualPlanCount ?? 0,
    },
  };
}

/**
 * Get plan counts for multiple cities
 * Counts ALL plans (weekend + weekday) from the Plan table - NOT group plans
 */
async function getPlanCountsByCityIds(supabase: any, cityIds: string[]): Promise<Map<string, number>> {
  if (cityIds.length === 0) {
    return new Map();
  }

  const countMap = new Map<string, number>();

  // Query plan counts for each city using count aggregation
  // This counts all plans (both weekend and weekday) for each city
  for (const cityId of cityIds) {
    const { count, error } = await supabase
      .from('Plan')
      .select('*', { count: 'exact', head: true })
      .eq('cityId', cityId);

    if (error) {
      console.error(`[cities] Plan count error for city ${cityId}:`, error);
      countMap.set(cityId, 0);
    } else {
      countMap.set(cityId, count || 0);
    }
  }

  console.log('[cities] Plan counts by city:', Object.fromEntries(countMap));
  return countMap;
}

/**
 * List all cities with optional pagination
 */
async function listCities(supabase: any, params: URLSearchParams) {
  const limit = parseInt(params.get('limit') || '100');
  const offset = parseInt(params.get('offset') || '0');
  const featured = params.get('featured');

  let query = supabase
    .from('City')
    .select('*', { count: 'exact' })
    .order('rank', { ascending: true })
    .range(offset, offset + limit - 1);

  // Filter by featured if specified
  if (featured === 'true') {
    query = query.eq('featured', true);
  }

  const { data: rawCities, count, error } = await query;

  if (error) {
    console.error('[cities] List error:', error);
    return errorResponse('Failed to fetch cities', 500, 'DATABASE_ERROR');
  }

  // Get actual plan counts for all cities
  const cityIds = (rawCities || []).map((city: any) => city.id);
  const planCountMap = await getPlanCountsByCityIds(supabase, cityIds);

  // Transform to iOS expected structure with actual plan counts
  const cities = (rawCities || []).map((city: any) => {
    const actualPlanCount = planCountMap.get(city.id) || 0;
    return transformCityForIOS(city, actualPlanCount);
  });

  return jsonResponse({
    cities,
    total: count || 0,
    limit,
    offset,
  });
}

/**
 * Get plan count for a single city
 */
async function getPlanCountForCity(supabase: any, cityId: string): Promise<number> {
  const { count, error } = await supabase
    .from('Plan')
    .select('*', { count: 'exact', head: true })
    .eq('cityId', cityId);

  if (error) {
    console.error('[cities] Plan count error for city:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get a single city by ID
 */
async function getCityById(supabase: any, cityId: string) {
  const { data: rawCity, error } = await supabase
    .from('City')
    .select('*')
    .eq('id', cityId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('City not found', 404, 'NOT_FOUND');
    }
    console.error('[cities] Get error:', error);
    return errorResponse('Failed to fetch city', 500, 'DATABASE_ERROR');
  }

  // Get actual plan count for this city
  const actualPlanCount = await getPlanCountForCity(supabase, cityId);

  // Transform to iOS expected structure with actual plan count
  const city = transformCityForIOS(rawCity, actualPlanCount);
  return jsonResponse({ city });
}

/**
 * Search cities by name or country
 */
async function searchCities(supabase: any, query: string) {
  if (!query || query.length < 2) {
    return jsonResponse({ cities: [], total: 0 });
  }

  const { data: rawCities, error } = await supabase
    .from('City')
    .select('*')
    .or(`name.ilike.%${query}%,country.ilike.%${query}%`)
    .order('rank', { ascending: true })
    .limit(20);

  if (error) {
    console.error('[cities] Search error:', error);
    return errorResponse('Search failed', 500, 'DATABASE_ERROR');
  }

  // Get actual plan counts for search results
  const cityIds = (rawCities || []).map((city: any) => city.id);
  const planCountMap = await getPlanCountsByCityIds(supabase, cityIds);

  // Transform to iOS expected structure with actual plan counts
  const cities = (rawCities || []).map((city: any) => {
    const actualPlanCount = planCountMap.get(city.id) || 0;
    return transformCityForIOS(city, actualPlanCount);
  });

  return jsonResponse({
    cities,
    total: cities.length,
  });
}
