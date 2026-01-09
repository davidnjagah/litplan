/**
 * Authentication Middleware for Edge Functions
 * Handles user authentication and authorization
 */

import { User } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getUserFromRequest } from './supabase-client.ts';
import { errorResponse } from './cors.ts';

/**
 * Authentication result
 */
export interface AuthResult {
  user: User | null;
  isGuest: boolean;
  error?: Response;
}

/**
 * Verify authentication from request
 * Returns user if authenticated, or null for guest mode
 */
export async function verifyAuth(req: Request, requireAuth: boolean = true): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  const authMode = req.headers.get('X-Auth-Mode');

  // Check for guest mode
  if (authMode === 'guest') {
    if (requireAuth) {
      return {
        user: null,
        isGuest: true,
        error: errorResponse('Authentication required', 401, 'UNAUTHORIZED'),
      };
    }
    return { user: null, isGuest: true };
  }

  // No auth header
  if (!authHeader) {
    if (requireAuth) {
      return {
        user: null,
        isGuest: false,
        error: errorResponse('Missing Authorization header', 401, 'UNAUTHORIZED'),
      };
    }
    return { user: null, isGuest: false };
  }

  // Check if it's a service role or anon key token
  const token = authHeader.replace('Bearer ', '');
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.role === 'service_role') {
      // Service role bypasses user auth, return null user but no error
      return { user: null, isGuest: false };
    }
    if (payload.role === 'anon') {
      // Anon key - treat as guest, no user lookup needed
      if (requireAuth) {
        return {
          user: null,
          isGuest: true,
          error: errorResponse('Authentication required', 401, 'UNAUTHORIZED'),
        };
      }
      return { user: null, isGuest: true };
    }
  } catch {
    // Not a valid JWT structure, continue with normal auth
  }

  // Verify token and get user
  let user = null;
  try {
    user = await getUserFromRequest(req);
  } catch (error) {
    console.error('[auth] Error getting user from request:', error);
    // Continue with null user - don't fail the request
  }

  if (!user && requireAuth) {
    return {
      user: null,
      isGuest: false,
      error: errorResponse('Invalid or expired token', 401, 'UNAUTHORIZED'),
    };
  }

  return { user, isGuest: false };
}

/**
 * Extract user ID from request
 * Returns null if not authenticated
 */
export async function getUserId(req: Request): Promise<string | null> {
  const user = await getUserFromRequest(req);
  return user?.id ?? null;
}

/**
 * Check if user has premium subscription
 * Queries the subscription table
 */
export async function isPremiumUser(userId: string, supabase: any): Promise<boolean> {
  const { data, error } = await supabase
    .from('Subscription')
    .select('tier, status, expiresAt')
    .eq('userId', userId)
    .single();

  if (error || !data) {
    return false;
  }

  // Check if subscription is active and not expired
  const isActive = data.status === 'active' || data.status === 'trialing';
  const notExpired = !data.expiresAt || new Date(data.expiresAt) > new Date();
  const isPro = data.tier === 'pro' || data.tier === 'premium';

  return isActive && notExpired && isPro;
}

/**
 * Rate limiting helper
 * Simple in-memory rate limiter (for production, use Redis or similar)
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 60,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || entry.resetAt < now) {
    // New window
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetAt < now) {
      rateLimitMap.delete(key);
    }
  }
}
