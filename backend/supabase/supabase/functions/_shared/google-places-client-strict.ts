/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Google Places API Client - STRICT VERSION
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * This version uses STRICT matching criteria:
 * - Requires minimum score of 30 to accept a venue
 * - Scores based on name similarity, city match, ratings, venue types
 * - Will reject venues that don't meet the threshold
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
 * Search for a venue using Google Places Text Search API (STRICT VERSION)
 */
export async function searchVenueStrict(
  venueName: string,
  city: string,
  country?: string
): Promise<VerifiedVenue | null> {
  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');

  if (!apiKey) {
    console.error('[GooglePlaces-STRICT] API key not configured');
    return null;
  }

  try {
    // Build search query with venue name and location
    const searchQuery = `${venueName} ${city}${country ? ` ${country}` : ''}`;
    const encodedQuery = encodeURIComponent(searchQuery);

    // Text Search API
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodedQuery}&key=${apiKey}`;

    console.log(`[GooglePlaces-STRICT] Searching for: "${searchQuery}"`);

    const response = await fetch(searchUrl);
    const data: TextSearchResponse = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.log(`[GooglePlaces-STRICT] No results for: "${venueName}" in ${city}`);
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

    // Get the best matching result using STRICT criteria
    const place = findBestMatchStrict(data.results, venueName, city);

    if (!place) {
      console.log(`[GooglePlaces-STRICT] No venue met the strict matching threshold`);
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

    console.log(`[GooglePlaces-STRICT] Found: "${place.name}" at ${place.formatted_address} (confidence: ${confidence})`);

    return result;
  } catch (error) {
    console.error(`[GooglePlaces-STRICT] Error searching for "${venueName}":`, error);
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
    console.error(`[GooglePlaces-STRICT] Error getting details for ${placeId}:`, error);
    return null;
  }
}

/**
 * Find the best matching place from search results - STRICT VERSION
 *
 * Uses a scoring system with a MINIMUM THRESHOLD of 30.
 * Venues that don't meet this threshold are REJECTED.
 */
function findBestMatchStrict(
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

    // Exact name match - highest score
    if (normalizedName === normalizedSearch) {
      score += 100;
    }
    // Name contains search term or vice versa
    else if (normalizedName.includes(normalizedSearch) || normalizedSearch.includes(normalizedName)) {
      score += 70;
    }
    // Partial word match
    else {
      const searchWords = normalizedSearch.split(' ').filter(w => w.length > 2);
      const nameWords = normalizedName.split(' ').filter(w => w.length > 2);
      const matchingWords = searchWords.filter(w => nameWords.some(nw => nw.includes(w) || w.includes(nw)));
      score += (matchingWords.length / Math.max(searchWords.length, 1)) * 50;
    }

    // City appears in address - important for location verification
    if (normalizedAddress.includes(normalizedCity)) {
      score += 30;
    }

    // Has rating - indicates real, established venue
    if (place.rating && place.rating > 0) {
      score += 10;
    }

    // High rating bonus
    if (place.rating && place.rating >= 4.0) {
      score += 5;
    }

    // Prefer nightlife-related types
    const nightlifeTypes = ['bar', 'night_club', 'restaurant', 'cafe', 'food', 'establishment'];
    if (place.types?.some(t => nightlifeTypes.includes(t))) {
      score += 10;
    }

    return { place, score };
  });

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  console.log(`[GooglePlaces-STRICT] Scored matches for "${searchName}":`);
  scored.slice(0, 3).forEach((s, i) => {
    console.log(`   ${i + 1}. "${s.place.name}" (score: ${s.score})`);
  });

  // STRICT: Only accept if score >= 30
  const MINIMUM_SCORE = 30;

  if (scored[0] && scored[0].score >= MINIMUM_SCORE) {
    console.log(`[GooglePlaces-STRICT] ✓ Accepted: "${scored[0].place.name}" with score ${scored[0].score}`);
    return scored[0].place;
  }

  console.log(`[GooglePlaces-STRICT] ✗ Rejected: Top score ${scored[0]?.score || 0} below threshold ${MINIMUM_SCORE}`);
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
