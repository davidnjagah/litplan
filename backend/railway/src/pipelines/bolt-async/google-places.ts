/**
 * Google Places API Client (Railway port from Supabase shared module)
 * Trusts Google's relevance ranking — first result is used.
 */

export interface OpeningPeriod {
  open: { day: number; time: string };
  close?: { day: number; time: string };
}

export interface VerifiedVenue {
  venueName: string;
  originalName: string;
  address: string;
  coordinates: { latitude: number; longitude: number };
  googlePlaceId: string;
  googleMapsUrl: string;
  openingHours?: string[];
  openingHoursPeriods?: OpeningPeriod[];
  businessStatus?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
  isVerified: boolean;
  confidence: 'high' | 'medium' | 'low' | 'not_found';
}

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
  opening_hours?: { weekday_text?: string[]; periods?: OpeningPeriod[] };
  business_status?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
}

interface TextSearchResponse { results: PlaceResult[]; status: string }
interface PlaceDetailsResponse { result: PlaceResult; status: string }

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';

export async function searchVenue(
  venueName: string,
  city: string,
  country?: string
): Promise<VerifiedVenue | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.error('[google-places] GOOGLE_PLACES_API_KEY not set');
    return null;
  }

  try {
    const searchQuery = `${venueName} ${city}${country ? ` ${country}` : ''}`;
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${GOOGLE_PLACES_API_KEY}`;

    const response = await fetch(searchUrl);
    const data = await response.json() as TextSearchResponse;

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return {
        venueName, originalName: venueName, address: '',
        coordinates: { latitude: 0, longitude: 0 },
        googlePlaceId: '',
        googleMapsUrl: fallbackMapsUrl(venueName, city, country),
        isVerified: false, confidence: 'not_found',
      };
    }

    const place = data.results[0];
    const details = await getPlaceDetails(place.place_id);
    const confidence = calculateConfidence(venueName, place.name);

    return {
      venueName: place.name,
      originalName: venueName,
      address: place.formatted_address,
      coordinates: {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      },
      googlePlaceId: place.place_id,
      googleMapsUrl: mapsUrl(place.place_id, place.name),
      openingHours: details?.opening_hours?.weekday_text,
      openingHoursPeriods: details?.opening_hours?.periods,
      businessStatus: details?.business_status,
      rating: place.rating,
      reviewCount: place.user_ratings_total,
      priceLevel: place.price_level,
      isVerified: true,
      confidence,
    };
  } catch (error) {
    console.error(`[google-places] Error searching "${venueName}":`, error);
    return null;
  }
}

async function getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
  try {
    const fields = 'name,formatted_address,geometry,opening_hours,business_status,rating,user_ratings_total,price_level';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_PLACES_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json() as PlaceDetailsResponse;
    return data.status === 'OK' ? data.result : null;
  } catch (error) {
    console.error(`[google-places] Details error for ${placeId}:`, error);
    return null;
  }
}

function calculateConfidence(original: string, found: string): 'high' | 'medium' | 'low' {
  const a = normalize(original);
  const b = normalize(found);
  if (a === b) return 'high';
  if (a.includes(b) || b.includes(a)) return 'high';
  const aw = new Set(a.split(' '));
  const bw = new Set(b.split(' '));
  const overlap = [...aw].filter(w => bw.has(w)).length / Math.max(aw.size, bw.size);
  return overlap >= 0.5 ? 'medium' : 'low';
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function mapsUrl(placeId: string, name: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${placeId}`;
}

function fallbackMapsUrl(venueName: string, city: string, country?: string): string {
  const q = `${venueName} ${city}${country ? ` ${country}` : ''}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
