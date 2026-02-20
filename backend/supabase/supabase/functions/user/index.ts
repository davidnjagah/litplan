/**
 * User Edge Function
 * Handles user profile, sync, viewed cities, and device tokens
 *
 * Endpoints:
 * POST /user/sync - Sync user with database
 * GET /user/profile - Get user profile
 * PUT /user/profile - Update user profile
 * GET /user/viewed-cities - Get viewed cities
 * POST /user/viewed-cities/:cityId - Record city view
 * POST /user/device-token - Register device token for push notifications
 * DELETE /user/device-token - Remove device token
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient, createAuthenticatedClient } from '../_shared/supabase-client.ts';
import { verifyAuth } from '../_shared/auth.ts';

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
 */
function transformCityForIOS(city: any, planCount?: number) {
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
      currency: 'USD',
      featured: city.featured || false,
      planCount: planCount ?? city.totalPlansThisWeek ?? 0,
    },
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const method = req.method;

    // Verify authentication
    const authResult = await verifyAuth(req, true);
    if (authResult.error) {
      return authResult.error;
    }

    if (!authResult.user) {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createAuthenticatedClient(authHeader);
    const serviceClient = createServiceClient();
    const userId = authResult.user.id;

    // Route: POST /user/sync
    if (pathParts[1] === 'sync' && method === 'POST') {
      const body = await req.json();
      return await syncUser(serviceClient, userId, body);
    }

    // Route: GET /user/profile
    if (pathParts[1] === 'profile' && method === 'GET') {
      return await getProfile(serviceClient, userId);
    }

    // Route: PUT /user/profile
    if (pathParts[1] === 'profile' && method === 'PUT') {
      const body = await req.json();
      return await updateProfile(serviceClient, userId, body);
    }

    // Route: GET /user/viewed-cities
    if (pathParts[1] === 'viewed-cities' && method === 'GET') {
      return await getViewedCities(serviceClient, userId, url.searchParams);
    }

    // Route: POST /user/viewed-cities/:cityId
    if (pathParts[1] === 'viewed-cities' && pathParts[2] && method === 'POST') {
      const cityId = pathParts[2];
      return await recordCityView(serviceClient, userId, cityId);
    }

    // Route: POST /user/device-token - Register device token
    if (pathParts[1] === 'device-token' && method === 'POST') {
      const body = await req.json();
      return await registerDeviceToken(serviceClient, userId, body);
    }

    // Route: DELETE /user/device-token - Remove device token
    if (pathParts[1] === 'device-token' && method === 'DELETE') {
      const token = url.searchParams.get('token');
      if (!token) {
        return errorResponse('Token parameter required', 400, 'MISSING_PARAM');
      }
      return await removeDeviceToken(serviceClient, userId, token);
    }

    // Route: DELETE /user/account - Delete user account and all data
    if (pathParts[1] === 'account' && method === 'DELETE') {
      return await deleteAccount(serviceClient, userId);
    }

    return errorResponse('Not found', 404, 'NOT_FOUND');
  } catch (error) {
    console.error('[user] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500, 'SERVER_ERROR');
  }
});

/**
 * Sync user data from auth provider
 */
async function syncUser(supabase: any, userId: string, data: any) {
  const { email, fullName, provider } = data;

  // Upsert user record
  const { data: user, error } = await supabase
    .from('User')
    .upsert({
      id: userId,
      email,
      fullName,
      provider,
      updatedAt: new Date().toISOString(),
    }, {
      onConflict: 'id',
    })
    .select()
    .single();

  if (error) {
    console.error('[user] Sync error:', error);
    return errorResponse('Failed to sync user', 500, 'DATABASE_ERROR');
  }

  console.log(`[user] Synced user: ${userId}`);
  return jsonResponse({ success: true, user });
}

/**
 * Get user profile with subscription info
 */
async function getProfile(supabase: any, userId: string) {
  // Get user with subscription
  const { data: user, error: userError } = await supabase
    .from('User')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError) {
    if (userError.code === 'PGRST116') {
      return errorResponse('User not found', 404, 'NOT_FOUND');
    }
    console.error('[user] Profile error:', userError);
    return errorResponse('Failed to fetch profile', 500, 'DATABASE_ERROR');
  }

  // Get subscription info
  const { data: subscription } = await supabase
    .from('Subscription')
    .select('*')
    .eq('userId', userId)
    .single();

  const profile = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    subscriptionTier: subscription?.tier || 'free',
    subscriptionExpiresAt: subscription?.expiresAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return jsonResponse({ profile });
}

/**
 * Update user profile
 */
async function updateProfile(supabase: any, userId: string, data: any) {
  const { fullName, avatarUrl } = data;

  const updates: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (fullName !== undefined) updates.fullName = fullName;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

  const { data: user, error } = await supabase
    .from('User')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('[user] Update error:', error);
    return errorResponse('Failed to update profile', 500, 'DATABASE_ERROR');
  }

  // Get subscription info for response
  const { data: subscription } = await supabase
    .from('Subscription')
    .select('*')
    .eq('userId', userId)
    .single();

  const profile = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    subscriptionTier: subscription?.tier || 'free',
    subscriptionExpiresAt: subscription?.expiresAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return jsonResponse({ profile });
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
    console.error('[user] Plan count error for city:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get user's viewed cities with pagination
 * Returns real data from ViewedCity table joined with City table
 */
async function getViewedCities(supabase: any, userId: string, params: URLSearchParams) {
  const limit = parseInt(params.get('limit') || '20');
  const offset = parseInt(params.get('offset') || '0');

  console.log(`[user] Fetching viewed cities for user: ${userId}, limit: ${limit}, offset: ${offset}`);

  // Query ViewedCity table joined with City table
  const { data: viewedCities, count, error } = await supabase
    .from('ViewedCity')
    .select(`
      id,
      cityId,
      viewCount,
      lastViewedAt,
      City (
        id,
        name,
        country,
        countryCode,
        heroImage,
        cardImage,
        latitude,
        longitude,
        timezone,
        featured,
        totalPlansThisWeek
      )
    `, { count: 'exact' })
    .eq('userId', userId)
    .order('lastViewedAt', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[user] Viewed cities error:', error);
    return errorResponse('Failed to fetch viewed cities', 500, 'DATABASE_ERROR');
  }

  console.log(`[user] Found ${viewedCities?.length || 0} viewed cities, total: ${count}`);

  // Transform to iOS expected structure with actual plan counts
  const transformedCities = [];
  for (const viewed of (viewedCities || [])) {
    if (viewed.City) {
      // Get actual plan count for this city
      const planCount = await getPlanCountForCity(supabase, viewed.cityId);

      transformedCities.push({
        viewCount: viewed.viewCount,
        lastViewedAt: viewed.lastViewedAt,
        city: transformCityForIOS(viewed.City, planCount),
      });
    }
  }

  return jsonResponse({
    cities: transformedCities,
    total: count || 0,
    limit,
    offset,
    hasMore: (count || 0) > offset + limit,
  });
}

/**
 * Record a city view
 */
async function recordCityView(supabase: any, userId: string, cityId: string) {
  // Upsert viewed city record
  const { error } = await supabase
    .from('ViewedCity')
    .upsert({
      userId,
      cityId,
      viewCount: 1,
      lastViewedAt: new Date().toISOString(),
    }, {
      onConflict: 'userId,cityId',
      count: 'exact',
    });

  if (error) {
    // If upsert fails, try to increment
    const { error: updateError } = await supabase.rpc('increment_city_view', {
      p_user_id: userId,
      p_city_id: cityId,
    });

    if (updateError) {
      console.error('[user] Record view error:', updateError);
      return errorResponse('Failed to record city view', 500, 'DATABASE_ERROR');
    }
  }

  console.log(`[user] Recorded city view: ${userId} -> ${cityId}`);
  return jsonResponse({ success: true });
}

/**
 * Register device token for push notifications
 */
async function registerDeviceToken(supabase: any, userId: string, data: any) {
  const { token, platform, appVersion, deviceModel, osVersion } = data;

  if (!token) {
    return errorResponse('Token is required', 400, 'MISSING_PARAM');
  }

  // Upsert device token (update if same token exists, or create new)
  const { data: deviceToken, error } = await supabase
    .from('DeviceToken')
    .upsert({
      userId,
      token,
      platform: platform || 'ios',
      appVersion,
      deviceModel,
      osVersion,
      isActive: true,
      updatedAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    }, {
      onConflict: 'token',
    })
    .select()
    .single();

  if (error) {
    console.error('[user] Register device token error:', error);
    return errorResponse('Failed to register device token', 500, 'DATABASE_ERROR');
  }

  console.log(`[user] Registered device token for user: ${userId}`);
  return jsonResponse({ success: true, deviceToken });
}

/**
 * Remove device token (on logout or token invalidation)
 */
async function removeDeviceToken(supabase: any, userId: string, token: string) {
  // Mark token as inactive instead of deleting (for audit trail)
  const { error } = await supabase
    .from('DeviceToken')
    .update({
      isActive: false,
      updatedAt: new Date().toISOString(),
    })
    .eq('userId', userId)
    .eq('token', token);

  if (error) {
    console.error('[user] Remove device token error:', error);
    return errorResponse('Failed to remove device token', 500, 'DATABASE_ERROR');
  }

  console.log(`[user] Removed device token for user: ${userId}`);
  return jsonResponse({ success: true });
}

/**
 * Delete user account and all associated data
 * Deletes in order to respect foreign key constraints:
 * 1. Device tokens
 * 2. Viewed cities
 * 3. Saved cities
 * 4. Search history
 * 5. Subscription
 * 6. User record
 */
async function deleteAccount(supabase: any, userId: string) {
  console.log(`[user] Deleting account for user: ${userId}`);

  // Delete all related records (order matters for foreign keys)
  const tables = ['DeviceToken', 'ViewedCity', 'SavedCity', 'SearchHistory', 'Subscription'];

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('userId', userId);

    if (error) {
      console.error(`[user] Error deleting from ${table}:`, error);
      // Continue deleting other tables even if one fails
    }
  }

  // Delete the user record
  const { error: userError } = await supabase
    .from('User')
    .delete()
    .eq('id', userId);

  if (userError) {
    console.error('[user] Error deleting user record:', userError);
    return errorResponse('Failed to delete account', 500, 'DELETE_ERROR');
  }

  console.log(`[user] Account deleted successfully for user: ${userId}`);
  return jsonResponse({ success: true, data: { message: 'Account deleted successfully' } });
}
