/**
 * Supabase Auth Routes
 *
 * API endpoints for Supabase authentication operations.
 *
 * @module api/routes/v2/supabaseAuth
 * @since Sprint 6 Phase 2 - Supabase Auth Integration
 */

import { Router, Response } from 'express';
import {
  AuthenticatedRequest,
  requireAuth,
  loadUser,
} from '../../../middleware/supabaseAuth';
import { UserService, SubscriptionService } from '../../../services/prisma';

const router = Router();

/**
 * POST /api/v2/auth/supabase/sync
 * Sync Supabase user to database (called after login)
 *
 * Works for all auth methods: Email, Google, Apple
 * Creates user if not exists, updates with latest provider info if exists
 *
 * Request body (optional):
 * - displayName: string - Display name from auth provider
 * - imageUrl: string - Profile image URL from auth provider (Google/Apple)
 *
 * @since Sprint 9 - Enhanced for all auth methods
 */
router.post(
  '/sync',
  requireAuth,
  loadUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // If client sends additional provider data (displayName, imageUrl), update the user
      const { displayName, imageUrl } = req.body || {};

      if (displayName || imageUrl) {
        // Update user with additional provider data
        const updateData: { displayName?: string; imageUrl?: string } = {};
        if (displayName) updateData.displayName = displayName;
        if (imageUrl) updateData.imageUrl = imageUrl;

        await UserService.updateUser(req.user!.id, updateData);

        // Reload user with updated data
        const updatedUser = await UserService.getUserWithSubscription(req.user!.id);
        if (updatedUser) {
          req.user = {
            id: updatedUser.id,
            supabaseUserId: updatedUser.supabaseUserId,
            email: updatedUser.email || undefined,
            displayName: updatedUser.displayName || undefined,
            subscription: updatedUser.subscription
              ? {
                  tier: updatedUser.subscription.tier,
                  status: updatedUser.subscription.status,
                  expiryDate: updatedUser.subscription.expiryDate || undefined,
                }
              : null,
          };
        }
      }

      res.json({
        success: true,
        data: {
          user: {
            id: req.user!.id,
            supabaseUserId: req.user!.supabaseUserId,
            email: req.user!.email,
            displayName: req.user!.displayName,
          },
          subscription: req.user!.subscription,
          message: 'User synced successfully',
        },
      });
    } catch (error) {
      console.error('Sync error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SYNC_ERROR', message: 'Failed to sync user' },
      });
    }
  }
);

/**
 * GET /api/v2/auth/supabase/me
 * Get current user with subscription
 */
router.get(
  '/me',
  requireAuth,
  loadUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userWithRelations = await UserService.getUserWithSubscriptionBySupabaseId(
        req.auth!.userId
      );

      if (!userWithRelations) {
        res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        });
        return;
      }

      // Get entitlements
      const entitlements = await SubscriptionService.checkEntitlements(userWithRelations.id);

      res.json({
        success: true,
        data: {
          user: {
            id: userWithRelations.id,
            supabaseUserId: userWithRelations.supabaseUserId,
            email: userWithRelations.email,
            displayName: userWithRelations.displayName,
            imageUrl: userWithRelations.imageUrl,
            createdAt: userWithRelations.createdAt,
            updatedAt: userWithRelations.updatedAt,
          },
          subscription: userWithRelations.subscription
            ? {
                tier: userWithRelations.subscription.tier,
                status: userWithRelations.subscription.status,
                startDate: userWithRelations.subscription.startDate,
                expiryDate: userWithRelations.subscription.expiryDate,
                autoRenew: userWithRelations.subscription.autoRenew,
              }
            : null,
          entitlements,
        },
      });
    } catch (error) {
      console.error('Get me error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch user' },
      });
    }
  }
);

/**
 * PATCH /api/v2/auth/supabase/me
 * Update user profile
 */
router.patch(
  '/me',
  requireAuth,
  loadUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { displayName, imageUrl } = req.body;

      // Validate input
      if (!displayName && !imageUrl) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least one field (displayName or imageUrl) is required',
          },
        });
        return;
      }

      // Build update data
      const updateData: { displayName?: string; imageUrl?: string } = {};
      if (displayName !== undefined) {
        if (typeof displayName !== 'string' || displayName.trim().length < 1) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Display name must be a non-empty string',
            },
          });
          return;
        }
        updateData.displayName = displayName.trim();
      }
      if (imageUrl !== undefined) {
        updateData.imageUrl = imageUrl;
      }

      const updatedUser = await UserService.updateUser(req.user!.id, updateData);

      res.json({
        success: true,
        data: {
          user: {
            id: updatedUser.id,
            supabaseUserId: updatedUser.supabaseUserId,
            email: updatedUser.email,
            displayName: updatedUser.displayName,
            imageUrl: updatedUser.imageUrl,
            updatedAt: updatedUser.updatedAt,
          },
        },
      });
    } catch (error) {
      console.error('Update error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'UPDATE_ERROR', message: 'Failed to update user' },
      });
    }
  }
);

/**
 * DELETE /api/v2/auth/supabase/account
 * Delete user account
 */
router.delete(
  '/account',
  requireAuth,
  loadUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await UserService.deleteUser(req.user!.id);

      res.json({
        success: true,
        data: { message: 'Account deleted successfully' },
      });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'DELETE_ERROR', message: 'Failed to delete account' },
      });
    }
  }
);

/**
 * GET /api/v2/auth/supabase/status
 * Quick auth status check
 */
router.get(
  '/status',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.json({
      success: true,
      data: {
        authenticated: true,
        supabaseUserId: req.auth!.userId,
        email: req.auth!.email,
      },
    });
  }
);

export default router;
