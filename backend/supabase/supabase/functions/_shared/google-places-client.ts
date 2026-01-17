/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Google Places API Client
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Helper for validating and enriching venue data using Google Places API.
 * Uses Text Search to find venues by name + city, then returns verified
 * address, coordinates, and Google Maps URL for easy navigation.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */

// Opening hours period structure
export interface OpeningPeriod {
  open: { day: number; time: string }; // day: 0=Sunday, time: "0900"
  close?: { day: number; time: string };
}

// Verified venue data from Google Places
export interface VerifiedVenue {
  venueName: string;
  originalName: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  googlePlaceId: string;
  googleMapsUrl: string;
  openingHours?: string[]; // Human-readable: ["Monday: 9:00 AM – 5:00 PM", ...]
  openingHoursPeriods?: OpeningPeriod[]; // Structured for programmatic use
  businessStatus?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
  rating?: number;
  priceLevel?: number;
  isVerified: boolean;
  confidence: 'high' | 'medium' | 'low' | 'not_found';
}

// Google Places API response types
interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  opening_hours?: {
    weekday_text?: string[];
    periods?: OpeningPeriod[];
  };
  business_status?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
  rating?: number;
  price_level?: number;
  types?: string[];
}

interface TextSearchResponse {
  results: PlaceResult[];
  status: string;
}

interface PlaceDetailsResponse {
  result: PlaceResult & {
    opening_hours?: {
      weekday_text?: string[];
      periods?: OpeningPeriod[];
    };
    business_status?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
    url?: string;
    website?: string;
    formatted_phone_number?: string;
  };
  status: string;
}

/**
 * Search for a venue using Google Places Text Search API
 */
export async function searchVenue(
  venueName: string,
  city: string,
  country?: string
): Promise<VerifiedVenue | null> {
  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');

  if (!apiKey) {
    console.error('[GooglePlaces] ❌ GOOGLE_PLACES_API_KEY not found in environment!');
    console.error('[GooglePlaces] Set it in Supabase Dashboard > Edge Functions > Secrets');
    return null;
  }

  console.log(`[GooglePlaces] API Key found (${apiKey.substring(0, 10)}...)`)

  try {
    // Build search query with venue name and location
    const searchQuery = `${venueName} ${city}${country ? ` ${country}` : ''}`;
    const encodedQuery = encodeURIComponent(searchQuery);

    // Text Search API
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodedQuery}&key=${apiKey}`;

    console.log(`[GooglePlaces] Searching for: "${searchQuery}"`);

    const response = await fetch(searchUrl);
    const data: TextSearchResponse = await response.json();

    console.log(`[GooglePlaces] API Response Status: ${data.status}`);
    console.log(`[GooglePlaces] Results count: ${data.results?.length || 0}`);

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.log(`[GooglePlaces] No results for: "${venueName}" in ${city}`);
      if (data.status !== 'OK') {
        console.log(`[GooglePlaces] API Error Status: ${data.status}`);
      }
      return {
        venueName,
        originalName: venueName,
        address: '',
        coordinates: { latitude: 0, longitude: 0 },
        googlePlaceId: '',
        googleMapsUrl: buildFallbackMapsUrl(venueName, city, country),
        isVerified: false,
        confidence: 'not_found'
      };
    }

    // Get the best matching result
    const place = findBestMatch(data.results, venueName, city);

    if (!place) {
      return {
        venueName,
        originalName: venueName,
        address: '',
        coordinates: { latitude: 0, longitude: 0 },
        googlePlaceId: '',
        googleMapsUrl: buildFallbackMapsUrl(venueName, city, country),
        isVerified: false,
        confidence: 'not_found'
      };
    }

    // Get additional details if needed
    const details = await getPlaceDetails(place.place_id, apiKey);

    // Calculate confidence based on name similarity
    const confidence = calculateConfidence(venueName, place.name);

    const result: VerifiedVenue = {
      venueName: place.name,
      originalName: venueName,
      address: place.formatted_address,
      coordinates: {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng
      },
      googlePlaceId: place.place_id,
      googleMapsUrl: buildGoogleMapsUrl(place.place_id, place.name),
      openingHours: details?.opening_hours?.weekday_text,
      openingHoursPeriods: details?.opening_hours?.periods,
      businessStatus: details?.business_status,
      rating: place.rating,
      priceLevel: place.price_level,
      isVerified: true,
      confidence
    };

    console.log(`[GooglePlaces] Found: "${place.name}" at ${place.formatted_address} (confidence: ${confidence})`);
    if (details?.business_status) {
      console.log(`[GooglePlaces] Business status: ${details.business_status}`);
    }
    if (details?.opening_hours?.weekday_text) {
      console.log(`[GooglePlaces] Opening hours available: ${details.opening_hours.weekday_text.length} days`);
    }

    return result;
  } catch (error) {
    console.error(`[GooglePlaces] Error searching for "${venueName}":`, error);
    return null;
  }
}

/**
 * Get detailed place information
 */
async function getPlaceDetails(
  placeId: string,
  apiKey: string
): Promise<PlaceDetailsResponse['result'] | null> {
  try {
    const fields = 'name,formatted_address,geometry,opening_hours,business_status,rating,price_level,url';
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;

    const response = await fetch(detailsUrl);
    const data: PlaceDetailsResponse = await response.json();

    if (data.status === 'OK' && data.result) {
      return data.result;
    }
    return null;
  } catch (error) {
    console.error(`[GooglePlaces] Error getting details for ${placeId}:`, error);
    return null;
  }
}

/**
 * Find the best matching place from search results
 *
 * SIMPLE APPROACH: Trust Google's relevance ranking.
 * When we search "venue name + city", Google returns the most relevant results first.
 * We just use the first result - Google has already done the matching work.
 *
 * Only reject if Google returns NO results at all.
 */
function findBestMatch(
  results: PlaceResult[],
  searchName: string,
  city: string
): PlaceResult | null {
  if (!results || results.length === 0) {
    console.log(`[GooglePlaces] No results returned for "${searchName}"`);
    return null;
  }

  // SIMPLE: Trust Google's first result
  // Google's Text Search API is designed exactly for this - finding businesses by name
  // When you search "Blue Note Jazz Club New York", Google knows what you want
  const firstResult = results[0];

  console.log(`[GooglePlaces] Found ${results.length} results for "${searchName}":`);
  results.slice(0, 3).forEach((place, i) => {
    console.log(`   ${i + 1}. "${place.name}" - ${place.formatted_address}${place.rating ? ` (${place.rating}★)` : ''}`);
  });

  console.log(`[GooglePlaces] ✓ Using first result: "${firstResult.name}"`);
  return firstResult;
}

/**
 * Calculate confidence level based on name similarity
 */
function calculateConfidence(original: string, found: string): 'high' | 'medium' | 'low' {
  const normalizedOriginal = normalizeString(original);
  const normalizedFound = normalizeString(found);

  // Exact match
  if (normalizedOriginal === normalizedFound) {
    return 'high';
  }

  // One contains the other
  if (normalizedOriginal.includes(normalizedFound) || normalizedFound.includes(normalizedOriginal)) {
    return 'high';
  }

  // Calculate word overlap
  const originalWords = new Set(normalizedOriginal.split(' '));
  const foundWords = new Set(normalizedFound.split(' '));
  const intersection = [...originalWords].filter(w => foundWords.has(w));
  const overlap = intersection.length / Math.max(originalWords.size, foundWords.size);

  if (overlap >= 0.5) {
    return 'medium';
  }

  return 'low';
}

/**
 * Normalize string for comparison
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim();
}

/**
 * Build Google Maps URL using Place ID (best for navigation)
 */
function buildGoogleMapsUrl(placeId: string, name: string): string {
  // Use place_id for most accurate navigation
  const encodedName = encodeURIComponent(name);
  return `https://www.google.com/maps/search/?api=1&query=${encodedName}&query_place_id=${placeId}`;
}

/**
 * Build fallback Google Maps search URL when no Place ID available
 */
function buildFallbackMapsUrl(venueName: string, city: string, country?: string): string {
  const query = `${venueName} ${city}${country ? ` ${country}` : ''}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Validate multiple venues in parallel
 */
export async function validateVenues(
  venues: Array<{ venueName: string; city: string; country?: string }>,
  maxConcurrent: number = 3
): Promise<Map<string, VerifiedVenue>> {
  const results = new Map<string, VerifiedVenue>();

  // Process in batches to respect rate limits
  for (let i = 0; i < venues.length; i += maxConcurrent) {
    const batch = venues.slice(i, i + maxConcurrent);
    const promises = batch.map(v => searchVenue(v.venueName, v.city, v.country));
    const batchResults = await Promise.all(promises);

    batchResults.forEach((result, index) => {
      if (result) {
        results.set(batch[index].venueName, result);
      }
    });

    // Small delay between batches to avoid rate limiting
    if (i + maxConcurrent < venues.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}
