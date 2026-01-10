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
 * Curated city images from Unsplash with direct URLs
 * These are high-quality, fast-loading images for popular cities
 */
const CURATED_CITY_IMAGES: Record<string, { hero: string; card: string }> = {
  // African cities
  'mombasa': {
    hero: 'https://images.unsplash.com/photo-1596005554384-d293674c91d7?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1596005554384-d293674c91d7?w=400&h=500&fit=crop&q=80',
  },
  'dar es salaam': {
    hero: 'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=400&h=500&fit=crop&q=80',
  },
  'nairobi': {
    hero: 'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=400&h=500&fit=crop&q=80',
  },
  'lagos': {
    hero: 'https://images.unsplash.com/photo-1618828665011-0abd973f7bb8?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1618828665011-0abd973f7bb8?w=400&h=500&fit=crop&q=80',
  },
  'cape town': {
    hero: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=400&h=500&fit=crop&q=80',
  },
  'johannesburg': {
    hero: 'https://images.unsplash.com/photo-1577948000111-9c970dfe3743?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1577948000111-9c970dfe3743?w=400&h=500&fit=crop&q=80',
  },
  'cairo': {
    hero: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=400&h=500&fit=crop&q=80',
  },
  'marrakech': {
    hero: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=400&h=500&fit=crop&q=80',
  },
  // European cities
  'gothenburg': {
    hero: 'https://images.unsplash.com/photo-1578075904982-5c212abe93ba?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1578075904982-5c212abe93ba?w=400&h=500&fit=crop&q=80',
  },
  'stockholm': {
    hero: 'https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=400&h=500&fit=crop&q=80',
  },
  'copenhagen': {
    hero: 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=400&h=500&fit=crop&q=80',
  },
  'oslo': {
    hero: 'https://images.unsplash.com/photo-1533929736562-8a0b5fa9becd?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1533929736562-8a0b5fa9becd?w=400&h=500&fit=crop&q=80',
  },
  'helsinki': {
    hero: 'https://images.unsplash.com/photo-1538332576228-eb5b4c4de6f5?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1538332576228-eb5b4c4de6f5?w=400&h=500&fit=crop&q=80',
  },
  'prague': {
    hero: 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=400&h=500&fit=crop&q=80',
  },
  'vienna': {
    hero: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=400&h=500&fit=crop&q=80',
  },
  'budapest': {
    hero: 'https://images.unsplash.com/photo-1551867633-194f125bddfa?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1551867633-194f125bddfa?w=400&h=500&fit=crop&q=80',
  },
  'athens': {
    hero: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=400&h=500&fit=crop&q=80',
  },
  'lisbon': {
    hero: 'https://images.unsplash.com/photo-1588729959852-508f62be8db7?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1588729959852-508f62be8db7?w=400&h=500&fit=crop&q=80',
  },
  'dublin': {
    hero: 'https://images.unsplash.com/photo-1549918864-48ac978761a4?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1549918864-48ac978761a4?w=400&h=500&fit=crop&q=80',
  },
  'edinburgh': {
    hero: 'https://images.unsplash.com/photo-1506377585622-bedcbb5f7c09?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1506377585622-bedcbb5f7c09?w=400&h=500&fit=crop&q=80',
  },
  // Asian cities
  'singapore': {
    hero: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&h=500&fit=crop&q=80',
  },
  'bangkok': {
    hero: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=400&h=500&fit=crop&q=80',
  },
  'kuala lumpur': {
    hero: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=400&h=500&fit=crop&q=80',
  },
  'hong kong': {
    hero: 'https://images.unsplash.com/photo-1536599018102-9f803c979b86?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1536599018102-9f803c979b86?w=400&h=500&fit=crop&q=80',
  },
  'seoul': {
    hero: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?w=400&h=500&fit=crop&q=80',
  },
  'taipei': {
    hero: 'https://images.unsplash.com/photo-1470004914212-05527e49370b?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1470004914212-05527e49370b?w=400&h=500&fit=crop&q=80',
  },
  'manila': {
    hero: 'https://images.unsplash.com/photo-1573455494060-c5595004fb6c?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1573455494060-c5595004fb6c?w=400&h=500&fit=crop&q=80',
  },
  'mumbai': {
    hero: 'https://images.unsplash.com/photo-1566552881560-0be862a7c445?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1566552881560-0be862a7c445?w=400&h=500&fit=crop&q=80',
  },
  'delhi': {
    hero: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=500&fit=crop&q=80',
  },
  // Americas
  'vancouver': {
    hero: 'https://images.unsplash.com/photo-1559511260-66a68e7a4d9f?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1559511260-66a68e7a4d9f?w=400&h=500&fit=crop&q=80',
  },
  'toronto': {
    hero: 'https://images.unsplash.com/photo-1517090504586-fde19ea6066f?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1517090504586-fde19ea6066f?w=400&h=500&fit=crop&q=80',
  },
  'montreal': {
    hero: 'https://images.unsplash.com/photo-1519178614-68673b201f36?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1519178614-68673b201f36?w=400&h=500&fit=crop&q=80',
  },
  'mexico city': {
    hero: 'https://images.unsplash.com/photo-1518659526054-190340b32735?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1518659526054-190340b32735?w=400&h=500&fit=crop&q=80',
  },
  'buenos aires': {
    hero: 'https://images.unsplash.com/photo-1612294037637-ec328d0e075e?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1612294037637-ec328d0e075e?w=400&h=500&fit=crop&q=80',
  },
  'rio de janeiro': {
    hero: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&h=500&fit=crop&q=80',
  },
  'sao paulo': {
    hero: 'https://images.unsplash.com/photo-1554168848-228452c09d60?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1554168848-228452c09d60?w=400&h=500&fit=crop&q=80',
  },
  // Oceania
  'sydney': {
    hero: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=400&h=500&fit=crop&q=80',
  },
  'melbourne': {
    hero: 'https://images.unsplash.com/photo-1514395462725-fb4566210144?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1514395462725-fb4566210144?w=400&h=500&fit=crop&q=80',
  },
  'auckland': {
    hero: 'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=1200&h=800&fit=crop&q=80',
    card: 'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=400&h=500&fit=crop&q=80',
  },
};

/**
 * Default fallback images for cities not in the curated list
 * Uses beautiful generic cityscape images
 */
const DEFAULT_CITY_IMAGES = {
  hero: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&h=800&fit=crop&q=80',
  card: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&h=500&fit=crop&q=80',
};

/**
 * Generate optimized Unsplash image URL for city images
 * Uses curated direct image URLs for faster loading and better quality
 */
function generateUnsplashUrl(searchQuery: string, width: number, height: number): string {
  // Normalize the city name for lookup
  const normalizedCity = searchQuery
    .toLowerCase()
    .replace(/\s+skyline$/i, '')
    .replace(/\s+city$/i, '')
    .trim();

  // Check if we have a curated image for this city
  const curatedImages = CURATED_CITY_IMAGES[normalizedCity];

  if (curatedImages) {
    // Return hero or card based on dimensions
    return width >= 800 ? curatedImages.hero : curatedImages.card;
  }

  // Fallback to default cityscape image
  return width >= 800 ? DEFAULT_CITY_IMAGES.hero : DEFAULT_CITY_IMAGES.card;
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
