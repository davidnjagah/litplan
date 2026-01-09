/**
 * V2 Subscription Routes
 *
 * API endpoints for subscription operations using Prisma and Supabase authentication.
 * Includes StoreKit 2 transaction verification and App Store Server Notifications webhook.
 *
 * @module api/routes/v2/subscription
 * @since Sprint 5 Phase 4 - API Migration to Prisma + Clerk
 * @updated Sprint 6 Phase 2 - Supabase Auth Integration
 * @updated Sprint 16 - Added verify, webhook, and detailed status endpoints
 */

import { Router, Request, Response } from 'express';
import {
  AuthenticatedRequest,
  requireAuthWithUser,
} from '../../../middleware';
import {
  SubscriptionService,
  UserActivityService,
  PRODUCT_IDS,
  type StoreKit2TransactionData,
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

/**
 * POST /api/v2/subscription/verify
 * Verify StoreKit 2 transaction and log to database (auth required)
 *
 * This endpoint accepts StoreKit 2 transaction data from the iOS client,
 * validates the transaction, and upserts the subscription record in the database.
 *
 * Expected body:
 * {
 *   transactionId: string,        // Current transaction ID from Apple
 *   originalTransactionId: string, // Original transaction ID (for renewals)
 *   productId: string,            // litplan_pro_monthly or litplan_pro_yearly
 *   purchaseDate: string,         // ISO date string
 *   expiresDate?: string,         // ISO date string (optional for lifetime purchases)
 *   environment: 'sandbox' | 'production'
 * }
 */
router.post(
  '/verify',
  requireAuthWithUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const {
        transactionId,
        originalTransactionId,
        productId,
        purchaseDate,
        expiresDate,
        environment,
      } = req.body;

      // Validate required fields
      if (!transactionId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'transactionId is required',
          },
        });
        return;
      }

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

      if (!productId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'productId is required',
          },
        });
        return;
      }

      // Validate product ID
      const validProductIds = Object.values(PRODUCT_IDS);
      if (!validProductIds.includes(productId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid productId. Expected one of: ${validProductIds.join(', ')}`,
          },
        });
        return;
      }

      if (!purchaseDate) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'purchaseDate is required',
          },
        });
        return;
      }

      if (!environment || !['sandbox', 'production'].includes(environment)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'environment must be either "sandbox" or "production"',
          },
        });
        return;
      }

      // Build transaction data
      const transactionData: StoreKit2TransactionData = {
        transactionId,
        originalTransactionId,
        productId,
        purchaseDate,
        expiresDate,
        environment,
      };

      // Verify and upsert the transaction
      const result = await SubscriptionService.verifyAndUpsertTransaction(
        req.user!.id,
        transactionData
      );

      // Get updated entitlements
      const entitlements = await SubscriptionService.checkEntitlements(req.user!.id);

      console.log(
        `Subscription verified for user ${req.user!.id}: ${result.isNew ? 'created' : 'updated'}, ` +
        `product: ${productId}, env: ${environment}, status: ${result.subscription.status}`
      );

      res.json({
        success: true,
        data: {
          subscription: {
            id: result.subscription.id,
            tier: result.subscription.tier,
            status: result.subscription.status,
            productId: result.subscription.productId,
            purchaseDate: result.subscription.purchaseDate,
            expiresDate: result.subscription.expiresDate,
            environment: result.subscription.environment,
            autoRenew: result.subscription.autoRenew,
          },
          entitlements,
          isNew: result.isNew,
          message: result.message,
        },
      });
    } catch (error) {
      console.error('Error verifying subscription:', error);

      // Check if it's a validation error from the service
      if (error instanceof Error && error.message.includes('Invalid product ID')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to verify subscription',
        },
      });
    }
  }
);

/**
 * GET /api/v2/subscription/status
 * Get detailed subscription status (auth required)
 *
 * Returns comprehensive subscription information including:
 * - Whether user has an active subscription
 * - Product details (monthly vs yearly)
 * - Expiration info with days remaining
 * - Environment (sandbox vs production)
 */
router.get(
  '/status',
  requireAuthWithUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const status = await SubscriptionService.getDetailedSubscriptionStatus(req.user!.id);
      const entitlements = await SubscriptionService.checkEntitlements(req.user!.id);

      res.json({
        success: true,
        data: {
          ...status,
          entitlements,
        },
      });
    } catch (error) {
      console.error('Error fetching subscription status:', error);
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
 * POST /api/v2/subscription/webhook
 * Handle App Store Server Notifications V2 (no auth - verified by Apple signature)
 *
 * This endpoint receives notifications from Apple about subscription events:
 * - SUBSCRIBED: New subscription
 * - DID_RENEW: Subscription renewed
 * - DID_FAIL_TO_RENEW: Renewal failed (entering grace period)
 * - EXPIRED: Subscription expired
 * - REFUND: User was refunded
 * - REVOKE: Family sharing revoked
 *
 * Note: In production, this should verify the JWS signature from Apple.
 * See: https://developer.apple.com/documentation/appstoreservernotifications
 */
router.post(
  '/webhook',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { signedPayload } = req.body;

      if (!signedPayload) {
        console.warn('Webhook received without signedPayload');
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'signedPayload is required',
          },
        });
        return;
      }

      // TODO: In production, verify the JWS signature using Apple's public key
      // For now, we'll decode the payload without verification (NOT SAFE FOR PRODUCTION)
      // See: https://developer.apple.com/documentation/appstoreservernotifications/responsebodyv2decodedpayload

      // The signedPayload is a JWS (JSON Web Signature) with three parts separated by dots
      // For development, we'll just acknowledge receipt
      console.log('App Store Server Notification received');

      // Parse the JWS to extract the payload (middle part)
      const parts = signedPayload.split('.');
      if (parts.length !== 3) {
        console.warn('Invalid JWS format in webhook payload');
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid JWS format',
          },
        });
        return;
      }

      // Decode the payload (base64url)
      let payload;
      try {
        const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
      } catch (decodeError) {
        console.error('Failed to decode webhook payload:', decodeError);
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Failed to decode payload',
          },
        });
        return;
      }

      const { notificationType, subtype } = payload;

      console.log(`Webhook notification: ${notificationType}${subtype ? ` (${subtype})` : ''}`);

      // Handle different notification types
      // Note: In a full implementation, you would decode the nested signedTransactionInfo
      // and signedRenewalInfo JWS payloads to get transaction details

      switch (notificationType) {
        case 'SUBSCRIBED':
          console.log('New subscription received via webhook');
          // The iOS app will call /verify after purchase, so this is mainly for logging
          break;

        case 'DID_RENEW':
          console.log('Subscription renewed via webhook');
          // Update subscription with new expiry date
          // Would need to decode signedTransactionInfo to get originalTransactionId
          break;

        case 'DID_FAIL_TO_RENEW':
          console.log('Subscription failed to renew - entering grace period');
          // Update subscription status to GRACE_PERIOD
          break;

        case 'EXPIRED':
          console.log('Subscription expired via webhook');
          // Update subscription status to EXPIRED
          break;

        case 'REFUND':
          console.log('Subscription refunded via webhook');
          // Update subscription status to CANCELLED and revoke access
          break;

        case 'REVOKE':
          console.log('Subscription revoked (family sharing) via webhook');
          // Update subscription status to CANCELLED
          break;

        case 'GRACE_PERIOD_EXPIRED':
          console.log('Grace period expired via webhook');
          // Update subscription status to EXPIRED
          break;

        default:
          console.log(`Unhandled notification type: ${notificationType}`);
      }

      // Always respond with 200 to acknowledge receipt
      // Apple will retry if we don't respond with 2xx
      res.status(200).json({
        success: true,
        message: 'Webhook received and processed',
      });
    } catch (error) {
      console.error('Error processing webhook:', error);

      // Still return 200 to prevent Apple from retrying
      // Log the error for investigation
      res.status(200).json({
        success: true,
        message: 'Webhook received (with processing error logged)',
      });
    }
  }
);

export default router;
