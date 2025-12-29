/**
 * Supabase Authentication Middleware
 *
 * Express middleware for verifying Supabase JWTs and loading user data.
 *
 * @module middleware/supabaseAuth
 * @since Sprint 6 Phase 2 - Supabase Auth Integration
 */

import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { UserService, SubscriptionService } from '../services/prisma';

/**
 * Extended Express Request with Supabase authentication data
 */
export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;      // Supabase user ID
    email?: string;
    sessionId?: string;
  };
  user?: {
    id: string;          // Database user ID
    supabaseUserId: string;
    email?: string | null;
    displayName?: string | null;
    subscription?: {
      tier: string;
      status: string;
      expiryDate?: Date | null;
    } | null;
  };
}

/**
 * Supabase auth context type
 */
export interface SupabaseAuthContext {
  userId: string;
  email?: string;
  sessionId?: string;
}

/**
 * Supabase user context type
 */
export interface SupabaseUserContext {
  id: string;
  supabaseUserId: string;
  email?: string | null;
  displayName?: string | null;
  subscription?: {
    tier: string;
    status: string;
    expiryDate?: Date | null;
  } | null;
}

/**
 * Extract Bearer token from Authorization header
 *
 * @param req - Express request object
 * @returns Token string or null
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7);
}

/**
 * Middleware: Require Authentication
 *
 * Verifies the Supabase JWT from the Authorization header.
 * Fails the request with 401 if no valid token is present.
 *
 * Usage:
 *   router.get('/protected', requireAuth, handler);
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required. Please provide a valid Bearer token.',
        },
      });
      return;
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired authentication token.',
        },
      });
      return;
    }

    // Attach auth context to request
    req.auth = {
      userId: user.id,
      email: user.email,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed due to server error.',
      },
    });
  }
}

/**
 * Middleware: Optional Authentication
 *
 * Attempts to verify the Supabase JWT if present, but doesn't fail the request
 * if no token is provided. Useful for endpoints that work differently
 * for authenticated vs anonymous users.
 *
 * Usage:
 *   router.get('/public', optionalAuth, handler);
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      // No token provided - continue without auth
      next();
      return;
    }

    // Try to verify the JWT with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (!error && user) {
      req.auth = {
        userId: user.id,
        email: user.email,
      };
    }

    next();
  } catch (error) {
    // Token verification failed - continue without auth
    console.warn('Optional auth token verification failed:', error);
    next();
  }
}

/**
 * Middleware: Load User from Database
 *
 * Loads the full user profile from the database using the Supabase user ID.
 * Creates the user if they don't exist (first login scenario).
 *
 * MUST be used after requireAuth or optionalAuth middleware.
 *
 * Usage:
 *   router.get('/profile', requireAuth, loadUser, handler);
 */
export async function loadUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required.',
        },
      });
      return;
    }

    const supabaseUserId = req.auth.userId;

    // Try to get existing user from database
    let user = await UserService.getUserWithSubscriptionBySupabaseId(supabaseUserId);

    if (!user) {
      // User doesn't exist - create on first login
      console.log(`Creating new user for Supabase ID: ${supabaseUserId}`);

      // Create user in database
      const newUser = await UserService.createUser({
        supabaseUserId,
        email: req.auth.email,
        displayName: req.auth.email?.split('@')[0],
      });

      // Create default free subscription for new user
      await SubscriptionService.createSubscription(newUser.id, {});

      // Reload user with subscription
      user = await UserService.getUserWithSubscriptionBySupabaseId(supabaseUserId);
    }

    if (!user) {
      res.status(500).json({
        success: false,
        error: {
          code: 'USER_LOAD_FAILED',
          message: 'Failed to load or create user.',
        },
      });
      return;
    }

    // Attach user context to request
    req.user = {
      id: user.id,
      supabaseUserId: user.supabaseUserId,
      email: user.email || undefined,
      displayName: user.displayName || undefined,
      subscription: user.subscription
        ? {
            tier: user.subscription.tier,
            status: user.subscription.status,
            expiryDate: user.subscription.expiryDate || undefined,
          }
        : null,
    };

    next();
  } catch (error) {
    console.error('Error loading user:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'USER_LOAD_ERROR',
        message: 'Failed to load user data.',
      },
    });
  }
}

/**
 * Middleware: Require Pro Tier
 *
 * Verifies that the authenticated user has an active Pro subscription.
 * MUST be used after requireAuth and loadUser middleware.
 *
 * Usage:
 *   router.get('/pro-feature', requireAuth, loadUser, requireProTier, handler);
 */
export async function requireProTier(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
      return;
    }

    const subscription = req.user.subscription;

    // Check if user has Pro tier
    if (!subscription || subscription.tier !== 'PRO') {
      res.status(403).json({
        success: false,
        error: {
          code: 'PRO_REQUIRED',
          message: 'This feature requires Litplan Pro. Upgrade to continue.',
          requiresUpgrade: true,
          details: {
            currentTier: subscription?.tier || 'FREE',
            requiredTier: 'PRO',
          },
        },
      });
      return;
    }

    // Check if subscription is expired
    if (subscription.expiryDate && new Date(subscription.expiryDate) < new Date()) {
      res.status(403).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_EXPIRED',
          message: 'Your Pro subscription has expired. Please renew to access this feature.',
          requiresUpgrade: true,
        },
      });
      return;
    }

    // Check if subscription status is active
    if (subscription.status === 'EXPIRED' || subscription.status === 'CANCELLED') {
      res.status(403).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_INACTIVE',
          message: 'Your subscription is not active. Please renew to access this feature.',
          requiresUpgrade: true,
        },
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Error checking Pro tier:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to verify subscription tier.',
      },
    });
  }
}

/**
 * Combined middleware: requireAuth + loadUser
 *
 * Convenience middleware that combines authentication and user loading.
 *
 * Usage:
 *   router.get('/profile', requireAuthWithUser, handler);
 */
export async function requireAuthWithUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  await requireAuth(req, res, async () => {
    if (res.headersSent) return;
    await loadUser(req, res, next);
  });
}

/**
 * Combined middleware: requireAuth + loadUser + requireProTier
 *
 * Convenience middleware for Pro-only endpoints.
 *
 * Usage:
 *   router.get('/pro-feature', requireProWithUser, handler);
 */
export async function requireProWithUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  await requireAuth(req, res, async () => {
    if (res.headersSent) return;
    await loadUser(req, res, async () => {
      if (res.headersSent) return;
      await requireProTier(req, res, next);
    });
  });
}

