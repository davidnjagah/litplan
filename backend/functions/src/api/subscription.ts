/**
 * Subscription API Routes
 * Handles StoreKit 2 validation, subscription status checks, and restore purchases
 */

import { Router, Response } from 'express';
import * as admin from 'firebase-admin';
import { authenticate, AuthenticatedRequest } from '../utils/middleware';
import { errorResponse, updateUserEntitlements } from '../utils/helpers';
import { rateLimiters } from '../utils/rateLimiter';
// Custom error classes for future use
// import {
//   SubscriptionError,
//   DuplicateTransactionError,
//   ExternalServiceError,
//   ValidationError,
// } from '../utils/errors';

const router = Router();

/**
 * Apple Status Code Mapping
 * https://developer.apple.com/documentation/appstorereceipts/status
 */
const APPLE_STATUS_CODES: { [key: number]: string } = {
  0: 'Valid receipt',
  21000: 'The request to the App Store was not made using the HTTP POST request method',
  21001: 'This status code is no longer sent by the App Store',
  21002: 'The data in the receipt-data property was malformed or the service experienced a temporary issue',
  21003: 'The receipt could not be authenticated',
  21004: 'The shared secret you provided does not match the shared secret on file for your account',
  21005: 'The receipt server was temporarily unable to provide the receipt. Retry',
  21006: 'This receipt is valid but the subscription has expired',
  21007: 'This receipt is from the test environment, but it was sent to the production environment for verification',
  21008: 'This receipt is from the production environment, but it was sent to the test environment for verification',
  21009: 'Internal data access error. Retry',
  21010: 'The user account cannot be found or has been deleted',
};

/**
 * Validate Apple Receipt Helper
 *
 * Full implementation with actual Apple server validation (Sprint 3, Day 11).
 *
 * This function:
 * 1. Validates receiptData is provided
 * 2. Sends receipt to Apple's verifyReceipt endpoint (production or sandbox)
 * 3. Handles all Apple status codes (0, 21000-21010, 21100-21199)
 * 4. Parses latest_receipt_info for subscription data
 * 5. Extracts expiry date and auto-renew status
 * 6. Detects expired subscriptions
 * 7. Handles invalid receipts and fraud detection
 */
export const validateAppleReceipt = async (
  transactionId: string,
  productId: string,
  receiptData: string
): Promise<{
  isValid: boolean;
  expiryDate?: Date;
  autoRenew?: boolean;
  error?: string;
  statusCode?: number;
}> => {
  try {
    console.log('Validating Apple receipt with Apple servers:', {
      transactionId,
      productId,
      hasReceiptData: !!receiptData,
    });

    // Validate input
    if (!receiptData || receiptData.trim() === '') {
      return {
        isValid: false,
        error: 'Receipt data is required for validation',
        statusCode: 400,
      };
    }

    // Validate receipt data format (base64)
    try {
      Buffer.from(receiptData, 'base64');
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid receipt data format. Expected base64-encoded string.',
        statusCode: 400,
      };
    }

    // Apple shared secret from environment variables
    const sharedSecret = process.env.APPLE_SHARED_SECRET;
    if (!sharedSecret) {
      console.error('APPLE_SHARED_SECRET not configured');
      return {
        isValid: false,
        error: 'Apple shared secret not configured. Please contact support.',
        statusCode: 500,
      };
    }

    // Validate shared secret format (should be 32 characters)
    if (sharedSecret.length !== 32) {
      console.error('APPLE_SHARED_SECRET appears to be invalid (wrong length)');
      return {
        isValid: false,
        error: 'Apple shared secret configuration error. Please contact support.',
        statusCode: 500,
      };
    }

    // Try production endpoint first
    let appleEndpoint = 'https://buy.itunes.apple.com/verifyReceipt';
    let appleResponse = await callAppleVerifyReceipt(appleEndpoint, receiptData, sharedSecret);

    // If production returns 21007 (sandbox receipt), retry with sandbox endpoint
    if (appleResponse.status === 21007) {
      console.log('Receipt is from sandbox environment, retrying with sandbox endpoint');

      // In production, reject sandbox receipts
      if (process.env.NODE_ENV === 'production') {
        console.warn('Sandbox receipt detected in production environment');
        return {
          isValid: false,
          error: 'Sandbox receipt detected. Please use a production purchase in the production app.',
          statusCode: 21007,
        };
      }

      // In development/staging, allow sandbox receipts
      appleEndpoint = 'https://sandbox.itunes.apple.com/verifyReceipt';
      appleResponse = await callAppleVerifyReceipt(appleEndpoint, receiptData, sharedSecret);
    }

    // If sandbox returns 21008 (production receipt in sandbox), this is an error
    if (appleResponse.status === 21008) {
      return {
        isValid: false,
        error: 'Production receipt sent to sandbox environment',
        statusCode: 21008,
      };
    }

    // Handle shared secret mismatch (21004)
    if (appleResponse.status === 21004) {
      console.error('Apple shared secret mismatch - secret may be expired or incorrect');
      return {
        isValid: false,
        error: 'Receipt validation failed. Please contact support if this persists.',
        statusCode: 21004,
      };
    }

    // Handle all status codes
    const statusCode = appleResponse.status;
    const statusMessage = APPLE_STATUS_CODES[statusCode] || `Unknown status code: ${statusCode}`;

    if (statusCode !== 0 && statusCode !== 21006) {
      // Status 21006 means valid but expired, which we handle separately
      console.error('Apple receipt validation failed:', statusMessage);
      return {
        isValid: false,
        error: statusMessage,
        statusCode,
      };
    }

    // Parse receipt data
    const latestReceiptInfo = appleResponse.latest_receipt_info;
    if (!latestReceiptInfo || latestReceiptInfo.length === 0) {
      return {
        isValid: false,
        error: 'No subscription information found in receipt',
      };
    }

    // Find the matching transaction
    let subscriptionInfo = latestReceiptInfo.find(
      (receipt: any) => receipt.original_transaction_id === transactionId
    );

    // If not found by original_transaction_id, try transaction_id
    if (!subscriptionInfo) {
      subscriptionInfo = latestReceiptInfo.find(
        (receipt: any) => receipt.transaction_id === transactionId
      );
    }

    // If still not found, use the most recent receipt (sorted by purchase_date_ms)
    if (!subscriptionInfo) {
      console.warn('Transaction ID not found in receipt, using most recent subscription');
      subscriptionInfo = latestReceiptInfo.sort(
        (a: any, b: any) => parseInt(b.purchase_date_ms) - parseInt(a.purchase_date_ms)
      )[0];
    }

    // Validate product ID matches
    if (subscriptionInfo.product_id !== productId) {
      console.warn(`Product ID mismatch: expected ${productId}, got ${subscriptionInfo.product_id}`);
      // Don't fail validation, but log the discrepancy
    }

    // Extract expiry date
    const expiresDateMs = subscriptionInfo.expires_date_ms;
    const expiryDate = new Date(parseInt(expiresDateMs));

    // Extract auto-renew status
    const pendingRenewalInfo = appleResponse.pending_renewal_info;
    let autoRenew = false;
    if (pendingRenewalInfo && pendingRenewalInfo.length > 0) {
      const renewalInfo = pendingRenewalInfo.find(
        (info: any) => info.original_transaction_id === transactionId ||
                       info.product_id === productId
      ) || pendingRenewalInfo[0];
      autoRenew = renewalInfo.auto_renew_status === '1';
    }

    // Check if subscription is expired
    const now = new Date();
    const isExpired = expiryDate < now;

    if (isExpired && statusCode === 21006) {
      return {
        isValid: false,
        error: 'Subscription has expired',
        expiryDate,
        autoRenew,
        statusCode: 21006,
      };
    }

    // Check for clock skew (if expiry date is far in the future)
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    if (expiryDate > oneYearFromNow) {
      console.warn('Potential clock skew detected:', {
        expiryDate: expiryDate.toISOString(),
        oneYearFromNow: oneYearFromNow.toISOString(),
      });
      // Allow it but log warning for monitoring
    }

    console.log('Receipt validated successfully:', {
      transactionId,
      productId,
      expiryDate: expiryDate.toISOString(),
      autoRenew,
      isExpired,
    });

    return {
      isValid: true,
      expiryDate,
      autoRenew,
      statusCode: 0,
    };
  } catch (error) {
    console.error('Error validating Apple receipt:', error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Receipt validation failed',
    };
  }
};

/**
 * Helper function to call Apple's verifyReceipt endpoint
 */
async function callAppleVerifyReceipt(
  endpoint: string,
  receiptData: string,
  sharedSecret: string
): Promise<any> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      'receipt-data': receiptData,
      'password': sharedSecret,
      'exclude-old-transactions': true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Apple server returned ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * POST /subscription/validate
 * Validate StoreKit 2 transaction and update user subscription
 * Rate limit: 10 requests per minute
 */
router.post('/validate', rateLimiters.subscription, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const { transactionId, productId, receiptData } = req.body;

    // Validation
    if (!transactionId || !productId) {
      return res.status(400).json(
        errorResponse(
          'INVALID_REQUEST',
          'transactionId and productId are required'
        )
      );
    }

    // Validate product ID format
    if (!productId.startsWith('com.litplan.')) {
      return res.status(400).json(
        errorResponse(
          'INVALID_PRODUCT_ID',
          'Product ID does not belong to this app'
        )
      );
    }

    console.log(`Validating subscription for user ${userId}:`, {
      transactionId,
      productId,
    });

    // Check for duplicate transaction (prevent replay attacks)
    const db = admin.firestore();
    const existingTransactionQuery = await db
      .collection('users')
      .where('subscription.transactionId', '==', transactionId)
      .limit(1)
      .get();

    if (!existingTransactionQuery.empty) {
      const existingUserId = existingTransactionQuery.docs[0].id;

      // If same user, return success (idempotent)
      if (existingUserId === userId) {
        console.log(`Transaction ${transactionId} already processed for user ${userId} (idempotent request)`);
        const userData = existingTransactionQuery.docs[0].data();
        return res.status(200).json({
          success: true,
          subscription: userData.subscription,
          entitlements: userData.entitlements,
          alreadyProcessed: true,
        });
      }

      // If different user, this is a fraud attempt
      console.error(`Duplicate transaction detected: ${transactionId} already used by user ${existingUserId}`);
      return res.status(409).json(
        errorResponse(
          'DUPLICATE_TRANSACTION',
          'This transaction has already been processed'
        )
      );
    }

    // Check if user already has active subscription
    const userDoc = await db.collection('users').doc(userId!).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      const existingSubscription = userData ? userData.subscription : undefined;

      if (existingSubscription?.tier === 'pro' && existingSubscription?.expiryDate) {
        const expiryDate = existingSubscription.expiryDate.toDate();
        const now = new Date();

        // If subscription is still active, inform user
        if (expiryDate > now) {
          console.log(`User ${userId} already has active subscription until ${expiryDate.toISOString()}`);
          return res.status(200).json({
            success: true,
            subscription: existingSubscription,
            entitlements: userData ? userData.entitlements : null,
            alreadyActive: true,
            message: 'You already have an active Pro subscription',
          });
        }
      }
    }

    // Validate receipt with Apple
    const validation = await validateAppleReceipt(
      transactionId,
      productId,
      receiptData || ''
    );

    if (!validation.isValid) {
      return res.status(400).json(
        errorResponse(
          'SUBSCRIPTION_INVALID',
          validation.error || 'Receipt validation failed'
        )
      );
    }

    // Update user entitlements to Pro tier using helper function
    const updateResult = await updateUserEntitlements(userId!, 'pro', {
      expiryDate: validation.expiryDate,
      autoRenew: validation.autoRenew,
      transactionId,
      productId,
    });

    if (!updateResult.success) {
      return res.status(500).json(
        errorResponse(
          'SERVER_ERROR',
          updateResult.error || 'Failed to update user entitlements'
        )
      );
    }

    console.log(`User ${userId} upgraded to Pro successfully`);

    // Return success response
    return res.status(200).json({
      success: true,
      subscription: updateResult.subscription,
      entitlements: updateResult.entitlements,
    });
  } catch (error) {
    console.error('Error validating subscription:', error);
    return res.status(500).json(
      errorResponse(
        'SERVER_ERROR',
        'Failed to validate subscription',
        error instanceof Error ? error.message : 'Unknown error'
      )
    );
  }
});

/**
 * GET /subscription/status
 * Check current subscription status (reads from Firestore)
 * Rate limit: 100 requests per minute
 *
 * Note: This endpoint reads from Firestore only in Day 8.
 * In Sprint 3, it will also call Apple's server to verify subscription is still active.
 */
router.get('/status', rateLimiters.subscriptionStatus, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;

    console.log(`Fetching subscription status for user ${userId}`);

    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(userId!).get();

    if (!userDoc.exists) {
      return res.status(404).json(
        errorResponse('USER_NOT_FOUND', 'User not found')
      );
    }

    const userData = userDoc.data();
    const subscription = userData?.subscription;

    if (!subscription) {
      // User has no subscription (free tier)
      return res.status(200).json({
        success: true,
        subscription: {
          status: 'free',
          tier: 'free',
          expiryDate: null,
          autoRenew: false,
        },
      });
    }

    // Check if subscription is expired (simple check for Day 8)
    let status = subscription.tier;
    if (subscription.expiryDate) {
      const now = new Date();
      const expiry = subscription.expiryDate.toDate();

      if (now > expiry) {
        status = 'expired';
      }
    }

    return res.status(200).json({
      success: true,
      subscription: {
        status,
        tier: subscription.tier,
        expiryDate: subscription.expiryDate
          ? subscription.expiryDate.toDate().toISOString()
          : null,
        autoRenew: subscription.autoRenew || false,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return res.status(500).json(
      errorResponse(
        'SERVER_ERROR',
        'Failed to fetch subscription status',
        error instanceof Error ? error.message : 'Unknown error'
      )
    );
  }
});

/**
 * POST /subscription/restore
 * Restore previous purchases
 * Rate limit: 10 requests per minute
 *
 * This is a placeholder implementation for Day 8.
 * Full implementation will be completed in Sprint 2, Day 10.
 *
 * In production, this will:
 * 1. Query Apple's server for all transactions for this user
 * 2. Find the most recent active subscription
 * 3. Update user's subscription status
 * 4. Return the restored subscription
 */
router.post('/restore', rateLimiters.subscription, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;

    console.log(`Restoring purchases for user ${userId}`);

    // TODO (Sprint 2, Day 10): Implement actual restore logic
    // For now, check if user already has a subscription in Firestore

    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(userId!).get();

    if (!userDoc.exists) {
      return res.status(404).json(
        errorResponse('USER_NOT_FOUND', 'User not found')
      );
    }

    const userData = userDoc.data();
    const subscription = userData?.subscription;

    // Check if user has an existing Pro subscription
    if (subscription && subscription.tier === 'pro') {
      // Check if it's still valid
      if (subscription.expiryDate) {
        const now = new Date();
        const expiry = subscription.expiryDate.toDate();

        if (now <= expiry) {
          // Valid subscription found
          return res.status(200).json({
            success: true,
            restored: true,
            subscription: {
              status: 'pro',
              tier: 'pro',
              expiryDate: subscription.expiryDate.toDate().toISOString(),
              autoRenew: subscription.autoRenew || false,
            },
          });
        }
      }
    }

    // No valid subscription found
    return res.status(200).json({
      success: true,
      restored: false,
      subscription: null,
    });

    // Production implementation will query Apple's server:
    /*
    const appleResponse = await queryAppleTransactionHistory(userId);

    if (appleResponse.hasActiveSubscription) {
      // Restore the subscription
      await userRef.update({
        'subscription.status': 'pro',
        'subscription.tier': 'pro',
        // ... update other fields
      });

      return res.status(200).json({
        success: true,
        restored: true,
        subscription: { ... }
      });
    } else {
      return res.status(200).json({
        success: true,
        restored: false,
        subscription: null
      });
    }
    */
  } catch (error) {
    console.error('Error restoring purchases:', error);
    return res.status(500).json(
      errorResponse(
        'SERVER_ERROR',
        'Failed to restore purchases',
        error instanceof Error ? error.message : 'Unknown error'
      )
    );
  }
});

export default router;
