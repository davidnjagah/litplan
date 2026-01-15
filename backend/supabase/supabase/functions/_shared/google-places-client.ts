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
  openingHours?: string[];
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
  };
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
      periods?: Array<{
        open: { day: number; time: string };
        close?: { day: number; time: string };
      }>;
    };
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
    console.error('[GooglePlaces] API key not configured');
    return null;
  }

  try {
    // Build search query with venue name and location
    const searchQuery = `${venueName} ${city}${country ? ` ${country}` : ''}`;
    const encodedQuery = encodeURIComponent(searchQuery);

    // Text Search API
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodedQuery}&key=${apiKey}`;

    console.log(`[GooglePlaces] Searching for: "${searchQuery}"`);

    const response = await fetch(searchUrl);
    const data: TextSearchResponse = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.log(`[GooglePlaces] No results for: "${venueName}" in ${city}`);
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
      rating: place.rating,
      priceLevel: place.price_level,
      isVerified: true,
      confidence
    };

    console.log(`[GooglePlaces] Found: "${place.name}" at ${place.formatted_address} (confidence: ${confidence})`);

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
    const fields = 'name,formatted_address,geometry,opening_hours,rating,price_level,url';
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
 * MORE LENIENT: Trust Google's relevance ranking - if it found results for
 * "venue name + city", the first result is usually correct.
 */
function findBestMatch(
  results: PlaceResult[],
  searchName: string,
  city: string
): PlaceResult | null {
  if (!results || results.length === 0) {
    return null;
  }

  const normalizedSearch = normalizeString(searchName);
  const normalizedCity = normalizeString(city);

  // Score each result
  const scored = results.map(place => {
    let score = 0;
    const normalizedName = normalizeString(place.name);
    const normalizedAddress = normalizeString(place.formatted_address);

    // Exact name match
    if (normalizedName === normalizedSearch) {
      score += 100;
    }
    // Name contains search term or vice versa
    else if (normalizedName.includes(normalizedSearch) || normalizedSearch.includes(normalizedName)) {
      score += 80;
    }
    // Partial word match - more lenient
    else {
      const searchWords = normalizedSearch.split(' ').filter(w => w.length > 2);
      const nameWords = normalizedName.split(' ').filter(w => w.length > 2);

      // Check if ANY significant word matches
      const hasAnyMatch = searchWords.some(sw =>
        nameWords.some(nw => nw.includes(sw) || sw.includes(nw))
      );

      if (hasAnyMatch) {
        score += 60;
      }

      // Calculate word overlap for additional scoring
      const matchingWords = searchWords.filter(w =>
        nameWords.some(nw => nw.includes(w) || w.includes(nw))
      );
      score += (matchingWords.length / Math.max(searchWords.length, 1)) * 30;
    }

    // City appears in address - big bonus
    if (normalizedAddress.includes(normalizedCity)) {
      score += 40;
    }

    // Has rating - indicates real, established venue
    if (place.rating && place.rating > 0) {
      score += 15;
    }

    // High rating bonus
    if (place.rating && place.rating >= 4.0) {
      score += 10;
    }

    // Prefer nightlife-related types
    const nightlifeTypes = ['bar', 'night_club', 'restaurant', 'cafe', 'food', 'establishment', 'point_of_interest', 'lodging'];
    if (place.types?.some(t => nightlifeTypes.includes(t))) {
      score += 15;
    }

    return { place, score };
  });

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  console.log(`[GooglePlaces] Top matches for "${searchName}":`);
  scored.slice(0, 3).forEach((s, i) => {
    console.log(`   ${i + 1}. "${s.place.name}" (score: ${s.score})`);
  });

  // LENIENT: Accept if score >= 20 OR if it's the first result and has a rating
  // Google's search already does relevance ranking, so first result is usually right
  if (scored[0]) {
    if (scored[0].score >= 20) {
      return scored[0].place;
    }
    // Trust Google's first result if it has a rating (real business)
    if (scored[0].place.rating && scored[0].place.rating > 0) {
      console.log(`[GooglePlaces] Accepting first result with rating: ${scored[0].place.name}`);
      return scored[0].place;
    }
    // Accept first result if address contains the city
    if (normalizeString(scored[0].place.formatted_address).includes(normalizedCity)) {
      console.log(`[GooglePlaces] Accepting first result in ${city}: ${scored[0].place.name}`);
      return scored[0].place;
    }
  }

  return null;
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
