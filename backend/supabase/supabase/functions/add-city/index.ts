/**
 * Add City Helper - Temporary function to add new cities
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    const body = await req.json();
    const { name, cityId, country, countryCode, timezone, latitude, longitude } = body;

    if (!name) {
      return errorResponse('City name required', 400, 'MISSING_NAME');
    }

    const supabase = createServiceClient();

    // Check if city already exists
    const { data: existing } = await supabase
      .from('City')
      .select('id, name')
      .eq('name', name)
      .single();

    if (existing) {
      return jsonResponse({ success: true, message: 'City already exists', city: existing });
    }

    // Create new city
    const newCityId = cityId || `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36)}`;

    const { data: city, error } = await supabase
      .from('City')
      .insert({
        cityId: newCityId,
        name: name,
        country: country || 'Unknown',
        countryCode: countryCode || 'XX',
        rank: 999,
        timezone: timezone || 'Europe/Madrid',
        heroImage: `https://source.unsplash.com/featured/1200x800/?${encodeURIComponent(name + ' city')}`,
        cardImage: `https://source.unsplash.com/featured/800x600/?${encodeURIComponent(name + ' skyline')}`,
        accentColor: '#00D9FF',
        totalPlansThisWeek: 0,
        featured: false,
        searchCount: 1,
        latitude: latitude || 0,
        longitude: longitude || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('[add-city] Error:', error);
      return errorResponse(error.message, 500, 'DATABASE_ERROR');
    }

    return jsonResponse({ success: true, message: 'City created', city });
  } catch (error) {
    console.error('[add-city] Error:', error);
    return errorResponse(error.message, 500, 'SERVER_ERROR');
  }
});
