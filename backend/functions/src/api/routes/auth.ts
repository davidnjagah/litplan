/**
 * Clerk Authentication Routes
 *
 * Endpoints for Clerk authentication integration.
 * - POST /api/auth/sync - Sync Clerk user to database (called after login)
 * - GET /api/auth/me - Get current user with subscription
 * - DELETE /api/auth/account - Delete user account
 *
 * @module api/routes/auth
 * @since Sprint 5 Phase 3 - Clerk Authentication Integration
 */

import { Router, Response } from 'express';
import {
  requireAuth,
  requireAuthWithUser,
  AuthenticatedRequest,
} from '../../middleware/clerkAuth';
import { clerkClient } from '../../config/clerk';
import {
  UserService,
  SubscriptionService,
  UserActivityService,
} from '../../services/prisma';

const router = Router();

/**
 * POST /auth/sync
 *
 * Syncs the Clerk user to the database after login.
 * Creates the user if they don't exist (first login).
 * Returns the full user profile with subscription.
 *
 * This endpoint should be called by the client after successful Clerk authentication.
 */
router.post('/sync', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const clerkUserId = req.auth.userId;

    // Try to get existing user
    let user = await UserService.getUserWithSubscriptionByClerkId(clerkUserId);

    if (!user) {
      console.log(`Syncing new user for Clerk ID: ${clerkUserId}`);

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
      }

      // Create user in database
      // Note: Using supabaseUserId field but storing Clerk ID for backward compatibility
      const newUser = await UserService.createUser({
        supabaseUserId: clerkUserId,  // Store Clerk ID in supabaseUserId field
        email,
        displayName,
        imageUrl,
      });

      // Create default free subscription
      await SubscriptionService.createSubscription(newUser.id, {});

      // Reload user with subscription
      user = await UserService.getUserWithSubscriptionByClerkId(clerkUserId);
    } else {
      // Update existing user with latest Clerk data
      try {
        const clerkUser = await clerkClient.users.getUser(clerkUserId);

        // Extract primary email
        let email: string | undefined;
        if (clerkUser.emailAddresses && clerkUser.emailAddresses.length > 0) {
          const primaryEmailId = clerkUser.primaryEmailAddressId;
          const primaryEmail = primaryEmailId
            ? clerkUser.emailAddresses.find((e) => e.id === primaryEmailId)
            : clerkUser.emailAddresses[0];
          email = primaryEmail?.emailAddress;
        }

        const displayName = [clerkUser.firstName, clerkUser.lastName]
          .filter(Boolean)
          .join(' ') || clerkUser.username || undefined;

        const imageUrl = clerkUser.imageUrl;

        // Update if there are changes
        if (email || displayName || imageUrl) {
          await UserService.updateUserByClerkId(clerkUserId, {
            email,
            displayName,
            imageUrl,
          });

          // Reload user with updated data
          user = await UserService.getUserWithSubscriptionByClerkId(clerkUserId);
        }
      } catch (clerkError) {
        console.warn('Failed to update from Clerk:', clerkError);
        // Continue with existing user data
      }
    }

    if (!user) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SYNC_FAILED',
          message: 'Failed to sync user',
        },
      });
      return;
    }

    // Get entitlements
    const entitlements = await SubscriptionService.checkEntitlements(user.id);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          clerkUserId: user.supabaseUserId,  // Map supabaseUserId to clerkUserId for backward compatibility
          email: user.email,
          displayName: user.displayName,
          imageUrl: user.imageUrl,
          createdAt: user.createdAt,
        },
        subscription: user.subscription
          ? {
              id: user.subscription.id,
              status: user.subscription.status,
              tier: user.subscription.tier,
              startDate: user.subscription.startDate,
              expiryDate: user.subscription.expiryDate,
              autoRenew: user.subscription.autoRenew,
            }
          : null,
        entitlements,
      },
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to sync user',
      },
    });
  }
});

/**
 * GET /auth/me
 *
 * Gets the current authenticated user's profile and subscription.
 * Returns full user data including entitlements.
 */
router.get('/me', requireAuthWithUser, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // Get full user data with subscription
    const user = await UserService.getUserWithSubscriptionByClerkId(req.user.clerkUserId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    // Get entitlements
    const entitlements = await SubscriptionService.checkEntitlements(user.id);

    // Get activity stats (saved/viewed cities count)
    let activityStats = {
      savedCitiesCount: 0,
      viewedCitiesCount: 0,
    };

    try {
      const savedCities = await UserActivityService.getSavedCities(user.id);
      const viewedCities = await UserActivityService.getViewedCities(user.id);
      activityStats = {
        savedCitiesCount: savedCities.length,
        viewedCitiesCount: viewedCities.length,
      };
    } catch (statsError) {
      console.warn('Failed to fetch activity stats:', statsError);
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          clerkUserId: user.supabaseUserId,  // Map supabaseUserId to clerkUserId for backward compatibility
          email: user.email,
          displayName: user.displayName,
          imageUrl: user.imageUrl,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        subscription: user.subscription
          ? {
              id: user.subscription.id,
              status: user.subscription.status,
              tier: user.subscription.tier,
              startDate: user.subscription.startDate,
              expiryDate: user.subscription.expiryDate,
              autoRenew: user.subscription.autoRenew,
            }
          : null,
        entitlements,
        stats: activityStats,
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch user profile',
      },
    });
  }
});

/**
 * PATCH /auth/me
 *
 * Updates the current user's profile (display name only for now).
 */
router.patch('/me', requireAuthWithUser, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const { displayName } = req.body;

    // Validate input
    if (!displayName || typeof displayName !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Display name is required and must be a string',
        },
      });
      return;
    }

    if (displayName.length < 1 || displayName.length > 100) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Display name must be between 1 and 100 characters',
        },
      });
      return;
    }

    // Update user
    const updatedUser = await UserService.updateUserByClerkId(req.user.clerkUserId, {
      displayName: displayName.trim(),
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          clerkUserId: updatedUser.supabaseUserId,  // Map supabaseUserId to clerkUserId for backward compatibility
          email: updatedUser.email,
          displayName: updatedUser.displayName,
          imageUrl: updatedUser.imageUrl,
          updatedAt: updatedUser.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update user profile',
      },
    });
  }
});

/**
 * DELETE /auth/account
 *
 * Deletes the current user's account and all associated data.
 * This is a destructive operation that cannot be undone.
 *
 * Note: This does NOT delete the user from Clerk.
 * The client should handle Clerk user deletion separately if desired.
 */
router.delete('/account', requireAuthWithUser, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // Optional: Require confirmation
    const { confirm } = req.body;

    if (confirm !== true && confirm !== 'DELETE_MY_ACCOUNT') {
      res.status(400).json({
        success: false,
        error: {
          code: 'CONFIRMATION_REQUIRED',
          message: 'Please confirm account deletion by setting confirm to true or "DELETE_MY_ACCOUNT"',
        },
      });
      return;
    }

    console.log(`Deleting account for user: ${req.user.id} (Clerk ID: ${req.user.clerkUserId})`);

    // Delete user from database (cascade will handle related records)
    await UserService.deleteUserByClerkId(req.user.clerkUserId);

    console.log(`Account deleted for Clerk ID: ${req.user.clerkUserId}`);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully. Note: Your Clerk account may still exist and should be deleted separately.',
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to delete account',
      },
    });
  }
});

/**
 * GET /auth/status
 *
 * Quick endpoint to check if the user is authenticated.
 * Returns minimal data for auth status checks.
 */
router.get('/status', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({
        success: false,
        authenticated: false,
      });
      return;
    }

    // Check if user exists in database
    const exists = await UserService.userExistsByClerkId(req.auth.userId);

    res.status(200).json({
      success: true,
      authenticated: true,
      clerkUserId: req.auth.userId,
      sessionId: req.auth.sessionId,
      userExists: exists,
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to check auth status',
      },
    });
  }
});

export default router;
