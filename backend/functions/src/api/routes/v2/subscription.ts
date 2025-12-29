/**
 * V2 Subscription Routes
 *
 * API endpoints for subscription operations using Prisma and Clerk authentication.
 *
 * @module api/routes/v2/subscription
 * @since Sprint 5 Phase 4 - API Migration to Prisma + Clerk
 */

import { Router, Response } from 'express';
import {
  AuthenticatedRequest,
  requireAuthWithUser,
} from '../../../middleware';
import {
  SubscriptionService,
  UserActivityService,
} from '../../../services/prisma';

const router = Router();

/**
 * GET /api/v2/subscription
 * Get subscription status (auth required)
 */
router.get(
  '/',
  requireAuthWithUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const subscription = await SubscriptionService.getSubscriptionByUserId(req.user!.id);

      if (!subscription) {
        res.json({
          success: true,
          data: {
            subscription: null,
            tier: 'FREE',
            status: 'FREE',
            message: 'No subscription found - free tier active',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          subscription: {
            id: subscription.id,
            tier: subscription.tier,
            status: subscription.status,
            startDate: subscription.startDate,
            expiryDate: subscription.expiryDate,
            autoRenew: subscription.autoRenew,
            productId: subscription.productId,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch subscription status',
        },
      });
    }
  }
);

/**
 * GET /api/v2/subscription/entitlements
 * Get current entitlements (auth required)
 */
router.get(
  '/entitlements',
  requireAuthWithUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const entitlements = await SubscriptionService.checkEntitlements(req.user!.id);

      // Get additional usage stats
      const citiesViewedThisWeek = await UserActivityService.getCitiesViewedThisWeek(
        req.user!.id
      );
      const savedCitiesCount = await UserActivityService.getSavedCityCount(req.user!.id);

      res.json({
        success: true,
        data: {
          entitlements,
          usage: {
            citiesViewedThisWeek,
            savedCitiesCount,
            citiesRemaining: Math.max(0, entitlements.maxCitiesPerWeek - citiesViewedThisWeek),
          },
        },
      });
    } catch (error) {
      console.error('Error fetching entitlements:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch entitlements',
        },
      });
    }
  }
);

/**
 * POST /api/v2/subscription/validate
 * Validate StoreKit receipt (auth required)
 */
router.post(
  '/validate',
  requireAuthWithUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { transactionId, productId, originalTransactionId } = req.body;

      // Validate required fields
      if (!transactionId || !productId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'transactionId and productId are required',
          },
        });
        return;
      }

      // In a production environment, you would validate the receipt with Apple here
      // For now, we'll trust the client and upgrade the subscription
      // TODO: Implement Apple receipt validation using App Store Server API

      // Upgrade to Pro tier
      const subscription = await SubscriptionService.upgradeToProTier(req.user!.id, {
        transactionId,
        productId,
        originalTransactionId,
      });

      // Get updated entitlements
      const entitlements = await SubscriptionService.checkEntitlements(req.user!.id);

      res.json({
        success: true,
        data: {
          subscription: {
            id: subscription.id,
            tier: subscription.tier,
            status: subscription.status,
            startDate: subscription.startDate,
            expiryDate: subscription.expiryDate,
            autoRenew: subscription.autoRenew,
          },
          entitlements,
          message: 'Subscription validated and upgraded successfully',
        },
      });
    } catch (error) {
      console.error('Error validating subscription:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to validate subscription',
        },
      });
    }
  }
);

/**
 * POST /api/v2/subscription/restore
 * Restore purchases (auth required)
 */
router.post(
  '/restore',
  requireAuthWithUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { originalTransactionId, productId } = req.body;

      // Validate required fields
      if (!originalTransactionId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'originalTransactionId is required',
          },
        });
        return;
      }

      // In a production environment, you would validate the purchase history with Apple
      // For now, we'll trust the client and restore the subscription
      // TODO: Implement Apple purchase history validation using App Store Server API

      // Check for existing subscription with this transaction
      const existingSubscription = await SubscriptionService.getSubscriptionByUserId(
        req.user!.id
      );

      if (
        existingSubscription &&
        existingSubscription.originalTransactionId === originalTransactionId
      ) {
        // Same subscription - just ensure it's active
        const entitlements = await SubscriptionService.checkEntitlements(req.user!.id);

        res.json({
          success: true,
          data: {
            subscription: {
              id: existingSubscription.id,
              tier: existingSubscription.tier,
              status: existingSubscription.status,
              startDate: existingSubscription.startDate,
              expiryDate: existingSubscription.expiryDate,
              autoRenew: existingSubscription.autoRenew,
            },
            entitlements,
            restored: false,
            message: 'Subscription already active',
          },
        });
        return;
      }

      // Restore subscription
      const subscription = await SubscriptionService.upgradeToProTier(req.user!.id, {
        transactionId: originalTransactionId,
        productId: productId || 'restored',
        originalTransactionId,
      });

      const entitlements = await SubscriptionService.checkEntitlements(req.user!.id);

      res.json({
        success: true,
        data: {
          subscription: {
            id: subscription.id,
            tier: subscription.tier,
            status: subscription.status,
            startDate: subscription.startDate,
            expiryDate: subscription.expiryDate,
            autoRenew: subscription.autoRenew,
          },
          entitlements,
          restored: true,
          message: 'Subscription restored successfully',
        },
      });
    } catch (error) {
      console.error('Error restoring subscription:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to restore subscription',
        },
      });
    }
  }
);

export default router;
