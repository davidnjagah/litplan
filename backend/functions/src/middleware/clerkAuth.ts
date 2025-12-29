/**
 * Clerk Authentication Middleware
 *
 * Express middleware for verifying Clerk JWTs and loading user data.
 *
 * @module middleware/clerkAuth
 * @since Sprint 5 Phase 3 - Clerk Authentication Integration
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/backend';
import { clerkClient } from '../config/clerk';
import { UserService, SubscriptionService } from '../services/prisma';
import type { ClerkAuthContext, ClerkUserContext } from '../types/clerk';

/**
 * Extended Express Request with Clerk authentication data
 */
export interface AuthenticatedRequest extends Request {
  auth?: ClerkAuthContext;
  user?: ClerkUserContext;
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

  return authHeader.split('Bearer ')[1];
}

/**
 * Middleware: Require Authentication
 *
 * Verifies the Clerk JWT from the Authorization header.
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

    // Verify the JWT with Clerk
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    if (!payload || !payload.sub) {
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
      userId: payload.sub,
      sessionId: payload.sid as string | undefined,
      claims: payload,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    // Handle specific Clerk errors
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';

    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_FAILED',
        message: errorMessage,
      },
    });
  }
}

/**
 * Middleware: Optional Authentication
 *
 * Attempts to verify the Clerk JWT if present, but doesn't fail the request
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

    // Try to verify the JWT with Clerk
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    if (payload && payload.sub) {
      req.auth = {
        userId: payload.sub,
        sessionId: payload.sid as string | undefined,
        claims: payload,
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
 * Loads the full user profile from the database using the Clerk user ID.
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
      // No auth context - loadUser should be used after requireAuth
      next();
      return;
    }

    const clerkUserId = req.auth.userId;

    // Try to get existing user from database
    let user = await UserService.getUserWithSubscriptionByClerkId(clerkUserId);

    if (!user) {
      // User doesn't exist - create on first login
      console.log(`Creating new user for Clerk ID: ${clerkUserId}`);

      // Fetch user details from Clerk
      let email: string | undefined;
      let displayName: string | undefined;
      let imageUrl: string | undefined;

      try {
        const clerkUser = await clerkClient.users.getUser(clerkUserId);

        // Extract primary email
        if (clerkUser.emailAddresses && clerkUser.emailAddresses.length > 0) {
          const primaryEmailId = clerkUser.primaryEmailAddressId;
          const primaryEmail = primaryEmailId
            ? clerkUser.emailAddresses.find((e) => e.id === primaryEmailId)
            : clerkUser.emailAddresses[0];
          email = primaryEmail?.emailAddress;
        }

        // Build display name
        displayName = [clerkUser.firstName, clerkUser.lastName]
          .filter(Boolean)
          .join(' ') || clerkUser.username || 'User';

        imageUrl = clerkUser.imageUrl;
      } catch (clerkError) {
        console.warn('Failed to fetch Clerk user details:', clerkError);
        // Continue with minimal data - user will be created with just the Clerk ID
      }

      // Create user in database
      const newUser = await UserService.createUser({
        clerkUserId,
        email,
        displayName,
        imageUrl,
      });

      // Create default free subscription for new user
      await SubscriptionService.createSubscription(newUser.id, {});

      // Reload user with subscription
      user = await UserService.getUserWithSubscriptionByClerkId(clerkUserId);
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
      clerkUserId: user.clerkUserId,
      email: user.email || undefined,
      displayName: user.displayName || undefined,
      subscription: user.subscription
        ? {
            tier: user.subscription.tier,
            status: user.subscription.status,
            expiryDate: user.subscription.expiryDate || undefined,
          }
        : undefined,
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
 * Middleware: Require Pro Tier (Clerk version)
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

// Export types for use in route handlers
export type { ClerkAuthContext, ClerkUserContext };
