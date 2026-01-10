/**
 * City Discovery Edge Function
 * Creates new cities on-demand using AI validation
 *
 * Endpoint:
 * POST /cities-discover - Discover and create a new city
 *
 * Request Body:
 * { "query": "Nairobi" }
 *
 * Response:
 * { "success": true, "city": {...}, "isNew": true/false }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { openaiRequest, parseOpenAIJSON } from '../_shared/openai-client.ts';
import { CITY_DISCOVERY_SYSTEM_PROMPT, CITY_DISCOVERY_USER_PROMPT } from './prompts.ts';

interface CityDiscoveryRequest {
  query: string;
}

interface CityDiscoveryResult {
  isValidCity: boolean;
  cityName: string;
  country: string;
  countryCode: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  timezone: string;
  unsplashSearchQuery: string;
  rejectionReason?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    const body: CityDiscoveryRequest = await req.json();
    const { query } = body;

    if (!query || query.trim().length < 2) {
      return errorResponse('Search query must be at least 2 characters', 400, 'INVALID_QUERY');
    }

    const normalizedQuery = query.trim();
    const supabase = createServiceClient();

    console.log(`[cities-discover] Searching for: "${normalizedQuery}"`);

    // Step 1: Check if city already exists in database (case-insensitive)
    const { data: existingCities, error: searchError } = await supabase
      .from('City')
      .select('*')
      .ilike('name', normalizedQuery)
      .limit(1);

    if (searchError) {
      console.error('[cities-discover] Database search error:', searchError);
      return errorResponse('Database error', 500, 'DATABASE_ERROR');
    }

    if (existingCities && existingCities.length > 0) {
      const existingCity = existingCities[0];
      console.log(`[cities-discover] City already exists: ${existingCity.name}`);

      // Get plan count for this city
      const planCount = await getPlanCountForCity(supabase, existingCity.id);

      return jsonResponse({
        success: true,
        city: transformCityForIOS(existingCity, planCount),
        isNew: false,
      });
    }

    // Step 2: Use AI to validate and generate city metadata
    console.log(`[cities-discover] City not found, validating with AI...`);
    const aiResult = await discoverCity(normalizedQuery);

    if (!aiResult.isValidCity) {
      console.log(`[cities-discover] AI rejected: ${aiResult.rejectionReason}`);
      return errorResponse(
        aiResult.rejectionReason || `"${normalizedQuery}" is not a recognized city`,
        404,
        'CITY_NOT_FOUND'
      );
    }

    console.log(`[cities-discover] AI validated: ${aiResult.cityName}, ${aiResult.country}`);

    // Step 3: Check again with the normalized city name (AI might normalize it)
    const { data: normalizedCities } = await supabase
      .from('City')
      .select('*')
      .ilike('name', aiResult.cityName)
      .limit(1);

    if (normalizedCities && normalizedCities.length > 0) {
      const existingCity = normalizedCities[0];
      console.log(`[cities-discover] Found existing city with normalized name: ${existingCity.name}`);
      const planCount = await getPlanCountForCity(supabase, existingCity.id);

      return jsonResponse({
        success: true,
        city: transformCityForIOS(existingCity, planCount),
        isNew: false,
      });
    }

    // Step 4: Generate Unsplash image URLs
    const heroImageUrl = generateUnsplashUrl(aiResult.unsplashSearchQuery, 1200, 800);
    const cardImageUrl = generateUnsplashUrl(aiResult.unsplashSearchQuery, 400, 500);

    // Step 5: Get next rank (999 for discovered cities to put them at the end)
    const DISCOVERED_CITY_RANK = 999;

    // Step 6: Create city in database
    const cityId = generateCityId(aiResult.cityName);
    const now = new Date().toISOString();

    const newCity = {
      id: cityId,
      cityId: cityId,
      name: aiResult.cityName,
      country: aiResult.country,
      countryCode: aiResult.countryCode.toUpperCase(),
      rank: DISCOVERED_CITY_RANK,
      timezone: aiResult.timezone,
      heroImage: heroImageUrl,
      cardImage: cardImageUrl,
      accentColor: '#00D9FF',
      totalPlansThisWeek: 0,
      featured: false,
      searchCount: 1,
      latitude: aiResult.coordinates.latitude,
      longitude: aiResult.coordinates.longitude,
      lastUpdated: now,
      createdAt: now,
      updatedAt: now,
    };

    const { data: createdCity, error: insertError } = await supabase
      .from('City')
      .insert(newCity)
      .select()
      .single();

    if (insertError) {
      console.error('[cities-discover] Insert error:', insertError);

      // Handle duplicate key error
      if (insertError.code === '23505') {
        // City was created by another request, try to fetch it
        const { data: raceCity } = await supabase
          .from('City')
          .select('*')
          .ilike('name', aiResult.cityName)
          .limit(1)
          .single();

        if (raceCity) {
          const planCount = await getPlanCountForCity(supabase, raceCity.id);
          return jsonResponse({
            success: true,
            city: transformCityForIOS(raceCity, planCount),
            isNew: false,
          });
        }
      }

      return errorResponse('Failed to create city', 500, 'DATABASE_ERROR');
    }

    console.log(`[cities-discover] Created new city: ${aiResult.cityName}, ${aiResult.country} (id: ${cityId})`);

    // Step 7: Return the new city
    return jsonResponse({
      success: true,
      city: transformCityForIOS(createdCity, 0),
      isNew: true,
    });

  } catch (error) {
    console.error('[cities-discover] Error:', error);

    // Handle AI service errors specifically
    if ((error as Error).message?.includes('OpenAI')) {
      return errorResponse(
        'City discovery service temporarily unavailable',
        503,
        'AI_SERVICE_ERROR'
      );
    }

    return errorResponse(
      (error as Error).message || 'Internal server error',
      500,
      'SERVER_ERROR'
    );
  }
});

/**
 * Call OpenAI to validate and generate city metadata
 */
async function discoverCity(query: string): Promise<CityDiscoveryResult> {
  const userPrompt = CITY_DISCOVERY_USER_PROMPT(query);

  const response = await openaiRequest(
    [{ role: 'user', content: userPrompt }],
    {
      systemPrompt: CITY_DISCOVERY_SYSTEM_PROMPT,
      temperature: 0.3, // Low temperature for accuracy
      maxTokens: 1024,
      jsonMode: true,
      model: 'gpt-4o', // Use GPT-4o for best accuracy
    }
  );

  return parseOpenAIJSON<CityDiscoveryResult>(response);
}

/**
 * Generate Unsplash source URL for city images
 * Uses source.unsplash.com for dynamic, random images
 */
function generateUnsplashUrl(searchQuery: string, width: number, height: number): string {
  const encodedQuery = encodeURIComponent(searchQuery);
  return `https://source.unsplash.com/featured/${width}x${height}/?${encodedQuery}`;
}

/**
 * Generate a unique city ID from the city name
 */
function generateCityId(cityName: string): string {
  const slug = cityName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `city-${slug}-${timestamp}${random}`;
}

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
 * Get plan count for a city
 */
async function getPlanCountForCity(supabase: ReturnType<typeof createServiceClient>, cityId: string): Promise<number> {
  const { count, error } = await supabase
    .from('Plan')
    .select('*', { count: 'exact', head: true })
    .eq('cityId', cityId);

  if (error) {
    console.error('[cities-discover] Plan count error:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Transform database City row to iOS expected structure
 */
function transformCityForIOS(city: Record<string, unknown>, actualPlanCount: number) {
  return {
    id: city.id,
    name: city.name,
    country: city.country,
    displayAssets: {
      heroImageUrl: (city.heroImage as string) || '',
      thumbnailUrl: (city.cardImage as string) || '',
      countryFlag: getCountryFlag(city.countryCode as string),
    },
    coordinates: {
      latitude: (city.latitude as number) || 0,
      longitude: (city.longitude as number) || 0,
    },
    metadata: {
      timezone: (city.timezone as string) || '',
      currency: 'USD',
      featured: (city.featured as boolean) || false,
      planCount: actualPlanCount,
      actualPlanCount: actualPlanCount,
    },
  };
}
