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
import { exchangeAppleAuthCode, revokeAppleToken } from '../_shared/apple-auth.ts';

/**
 * Generate a CUID-like ID compatible with Prisma's @default(cuid())
 * Format: starts with 'c', followed by timestamp + random chars
 */
function generateCuid(): string {
  const timestamp = Date.now().toString(36);
  const random = () => Math.random().toString(36).substring(2, 8);
  return `c${timestamp}${random()}${random()}`;
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

/**
 * Resolve Supabase Auth UUID to the database CUID from the User table.
 * Returns null if no User record exists for this auth user.
 */
async function resolveDbUserId(supabase: any, authUserId: string): Promise<string | null> {
  const { data: user, error } = await supabase
    .from('User')
    .select('id')
    .eq('supabaseUserId', authUserId)
    .single();

  if (error || !user) return null;
  return user.id;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const method = req.method;

    console.log(`[user] ${method} ${url.pathname} | pathParts: [${pathParts.join(', ')}]`);

    // Verify authentication
    const authResult = await verifyAuth(req, true);
    if (authResult.error) {
      console.log(`[user] Auth failed for ${method} ${url.pathname}`);
      return authResult.error;
    }

    if (!authResult.user) {
      console.log(`[user] No user found for ${method} ${url.pathname}`);
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createAuthenticatedClient(authHeader);
    const serviceClient = createServiceClient();
    const authUserId = authResult.user.id; // Supabase Auth UUID

    console.log(`[user] Authenticated auth user: ${authUserId} | route: ${pathParts[1] || 'none'}`);

    // Route: POST /user/sync — uses authUserId directly (creates/updates User record)
    if (pathParts[1] === 'sync' && method === 'POST') {
      const body = await req.json();
      return await syncUser(serviceClient, authUserId, body);
    }

    // Route: POST /user/apple-auth-code — exchange Apple auth code for refresh token
    if (pathParts[1] === 'apple-auth-code' && method === 'POST') {
      const body = await req.json();
      return await storeAppleAuthCode(serviceClient, authUserId, body);
    }

    // Route: DELETE /user/account — uses authUserId directly (does its own lookup)
    if (pathParts[1] === 'account' && method === 'DELETE') {
      return await deleteAccount(serviceClient, authUserId);
    }

    // All other routes need the DB CUID
    const dbUserId = await resolveDbUserId(serviceClient, authUserId);
    if (!dbUserId) {
      console.log(`[user] No DB user found for auth user: ${authUserId}`);
      return errorResponse('User not found. Please sync your account first.', 404, 'USER_NOT_SYNCED');
    }
    console.log(`[user] Resolved auth ${authUserId} -> db ${dbUserId}`);

    // Route: GET /user/profile
    if (pathParts[1] === 'profile' && method === 'GET') {
      return await getProfile(serviceClient, dbUserId);
    }

    // Route: PUT /user/profile
    if (pathParts[1] === 'profile' && method === 'PUT') {
      const body = await req.json();
      return await updateProfile(serviceClient, dbUserId, body);
    }

    // Route: GET /user/viewed-cities
    if (pathParts[1] === 'viewed-cities' && method === 'GET') {
      return await getViewedCities(serviceClient, dbUserId, url.searchParams);
    }

    // Route: POST /user/viewed-cities/:cityId
    if (pathParts[1] === 'viewed-cities' && pathParts[2] && method === 'POST') {
      const cityId = pathParts[2];
      return await recordCityView(serviceClient, dbUserId, cityId);
    }

    // Route: POST /user/device-token - Register device token
    if (pathParts[1] === 'device-token' && method === 'POST') {
      const body = await req.json();
      return await registerDeviceToken(serviceClient, dbUserId, body);
    }

    // Route: DELETE /user/device-token - Remove device token
    if (pathParts[1] === 'device-token' && method === 'DELETE') {
      const token = url.searchParams.get('token');
      if (!token) {
        return errorResponse('Token parameter required', 400, 'MISSING_PARAM');
      }
      return await removeDeviceToken(serviceClient, dbUserId, token);
    }

    return errorResponse('Not found', 404, 'NOT_FOUND');
  } catch (error) {
    console.error('[user] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500, 'SERVER_ERROR');
  }
});

/**
 * Sync user data from auth provider
 *
 * The User table uses a CUID for `id` and stores the Supabase Auth UUID
 * in `supabaseUserId`. Column names: displayName (not fullName), no provider column.
 */
async function syncUser(supabase: any, authUserId: string, data: any) {
  const { email, fullName } = data;

  console.log(`[user] Syncing auth user: ${authUserId}, email: ${email}`);

  // Check if user already exists by supabaseUserId
  const { data: existingUser } = await supabase
    .from('User')
    .select('id')
    .eq('supabaseUserId', authUserId)
    .single();

  if (existingUser) {
    // Update existing user
    const { data: user, error } = await supabase
      .from('User')
      .update({
        email,
        displayName: fullName || undefined,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', existingUser.id)
      .select()
      .single();

    if (error) {
      console.error('[user] Sync update error:', error);
      return errorResponse('Failed to sync user', 500, 'DATABASE_ERROR');
    }

    console.log(`[user] Updated existing user: ${existingUser.id}`);
    return jsonResponse({ success: true, user });
  } else {
    // Create new user with a generated CUID (Prisma generates these app-side, DB has no default)
    const newId = generateCuid();
    console.log(`[user] Generating new CUID: ${newId} for auth user: ${authUserId}`);
    const { data: user, error } = await supabase
      .from('User')
      .insert({
        id: newId,
        supabaseUserId: authUserId,
        email,
        displayName: fullName || null,
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[user] Sync insert error:', error);
      return errorResponse('Failed to sync user', 500, 'DATABASE_ERROR');
    }

    console.log(`[user] Created new user: ${user.id} for auth: ${authUserId}`);
    return jsonResponse({ success: true, user });
  }
}

/**
 * Get user profile with subscription info
 * @param dbUserId - The CUID from the User table
 */
async function getProfile(supabase: any, dbUserId: string) {
  // Get user by DB id (CUID)
  const { data: user, error: userError } = await supabase
    .from('User')
    .select('*')
    .eq('id', dbUserId)
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
    .eq('userId', dbUserId)
    .single();

  const profile = {
    id: user.id,
    email: user.email,
    fullName: user.displayName,
    avatarUrl: user.imageUrl,
    subscriptionTier: subscription?.tier || 'free',
    subscriptionExpiresAt: subscription?.expiresAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return jsonResponse({ profile });
}

/**
 * Update user profile
 * @param dbUserId - The CUID from the User table
 */
async function updateProfile(supabase: any, dbUserId: string, data: any) {
  const { fullName, avatarUrl } = data;

  const updates: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (fullName !== undefined) updates.displayName = fullName;
  if (avatarUrl !== undefined) updates.imageUrl = avatarUrl;

  const { data: user, error } = await supabase
    .from('User')
    .update(updates)
    .eq('id', dbUserId)
    .select()
    .single();

  if (error) {
    console.error('[user] Update error:', error);
    return errorResponse('Failed to update profile', 500, 'DATABASE_ERROR');
  }

  // Get subscription info
  const { data: subscription } = await supabase
    .from('Subscription')
    .select('*')
    .eq('userId', dbUserId)
    .single();

  const profile = {
    id: user.id,
    email: user.email,
    fullName: user.displayName,
    avatarUrl: user.imageUrl,
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
 * Exchange Apple authorization code for refresh token and store it
 * Called from iOS after successful Sign in with Apple
 */
async function storeAppleAuthCode(supabase: any, authUserId: string, data: any) {
  const { authorizationCode } = data;

  if (!authorizationCode) {
    return errorResponse('authorizationCode is required', 400, 'MISSING_PARAM');
  }

  console.log(`[user] Exchanging Apple auth code for auth user: ${authUserId}`);

  try {
    const refreshToken = await exchangeAppleAuthCode(authorizationCode);

    // Store the refresh token on the User record
    const { error } = await supabase
      .from('User')
      .update({ appleRefreshToken: refreshToken })
      .eq('supabaseUserId', authUserId);

    if (error) {
      console.error('[user] Failed to store Apple refresh token:', error);
      return jsonResponse({ success: true, warning: 'Token exchanged but failed to store' });
    }

    console.log(`[user] Apple refresh token stored for auth user: ${authUserId}`);
    return jsonResponse({ success: true });
  } catch (error) {
    console.error('[user] Apple auth code exchange failed:', error);
    // Non-blocking: return success with warning so sign-in isn't affected
    return jsonResponse({ success: false, warning: `Apple token exchange failed: ${error.message}` });
  }
}

/**
 * Delete user account and all associated data
 *
 * The User table uses a CUID as its `id` column, with the Supabase Auth UUID
 * stored in `supabaseUserId`. Related tables reference User.id (the CUID).
 * So we must first look up the CUID, then delete by that.
 *
 * Deletes in order to respect foreign key constraints:
 * 1. Revoke Apple token (if present)
 * 2. Device tokens
 * 3. Viewed cities
 * 4. Saved cities
 * 5. Search history
 * 6. Subscription
 * 7. User record
 */
async function deleteAccount(supabase: any, authUserId: string) {
  console.log(`[user] === ACCOUNT DELETION START for auth user: ${authUserId} ===`);

  // Look up the User record by supabaseUserId to get the CUID and Apple refresh token
  const { data: user, error: lookupError } = await supabase
    .from('User')
    .select('id, appleRefreshToken')
    .eq('supabaseUserId', authUserId)
    .single();

  if (lookupError || !user) {
    console.error(`[user] User lookup failed for supabaseUserId=${authUserId}:`, JSON.stringify(lookupError));
    return errorResponse('User not found', 404, 'NOT_FOUND');
  }

  const dbUserId = user.id; // This is the CUID
  console.log(`[user] Resolved auth user ${authUserId} -> DB user ${dbUserId}`);

  // Revoke Apple token if present (non-blocking: deletion proceeds even if this fails)
  if (user.appleRefreshToken) {
    try {
      console.log(`[user] Revoking Apple token for auth user: ${authUserId}...`);
      await revokeAppleToken(user.appleRefreshToken);
      console.log(`[user] Apple token revoked successfully for auth user: ${authUserId}`);
    } catch (error) {
      console.error(`[user] Apple token revocation failed (proceeding with deletion):`, error);
    }
  } else {
    console.log(`[user] No Apple refresh token found, skipping revocation`);
  }

  // Delete all related records using the CUID (order matters for foreign keys)
  const tables = ['DeviceToken', 'ViewedCity', 'SavedCity', 'SearchHistory', 'Subscription'];

  for (const table of tables) {
    console.log(`[user] Deleting from ${table} for userId: ${dbUserId}...`);
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('userId', dbUserId);

    if (error) {
      console.error(`[user] Error deleting from ${table}:`, JSON.stringify(error));
      // Continue deleting other tables even if one fails
    } else {
      console.log(`[user] Deleted from ${table} OK`);
    }
  }

  // Delete the user record by its CUID
  console.log(`[user] Deleting User record id: ${dbUserId}...`);
  const { error: userError } = await supabase
    .from('User')
    .delete()
    .eq('id', dbUserId);

  if (userError) {
    console.error(`[user] Error deleting user record:`, JSON.stringify(userError));
    return errorResponse(`Failed to delete account: ${userError.message}`, 500, 'DELETE_ERROR');
  }

  console.log(`[user] === ACCOUNT DELETION COMPLETE for auth user: ${authUserId} (db: ${dbUserId}) ===`);
  return jsonResponse({ success: true, data: { message: 'Account deleted successfully' } });
}
