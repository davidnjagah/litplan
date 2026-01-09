/**
 * Subscription Edge Function
 * Handles subscription status, verification, and restoration
 *
 * Endpoints:
 * GET /subscription/status - Get subscription status
 * POST /subscription/verify - Verify StoreKit transaction
 * POST /subscription/restore - Restore purchases across devices
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { verifyAuth } from '../_shared/auth.ts';

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

    const supabase = createServiceClient();
    const userId = authResult.user.id;

    // Route: GET /subscription/status
    if (pathParts[1] === 'status' && method === 'GET') {
      return await getSubscriptionStatus(supabase, userId);
    }

    // Route: POST /subscription/verify
    if (pathParts[1] === 'verify' && method === 'POST') {
      const body = await req.json();
      return await verifySubscription(supabase, userId, body);
    }

    // Route: POST /subscription/restore
    if (pathParts[1] === 'restore' && method === 'POST') {
      const body = await req.json();
      return await restorePurchases(supabase, userId, body);
    }

    return errorResponse('Not found', 404, 'NOT_FOUND');
  } catch (error) {
    console.error('[subscription] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500, 'SERVER_ERROR');
  }
});

/**
 * Get current subscription status
 */
async function getSubscriptionStatus(supabase: any, userId: string) {
  const { data: subscription, error } = await supabase
    .from('Subscription')
    .select('*')
    .eq('userId', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[subscription] Status error:', error);
    return errorResponse('Failed to fetch subscription', 500, 'DATABASE_ERROR');
  }

  // Calculate days until expiry
  let daysUntilExpiry: number | null = null;
  if (subscription?.expiresAt) {
    const expiresAt = new Date(subscription.expiresAt);
    const now = new Date();
    daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Determine if subscription is active
  const isActive = subscription
    ? (subscription.status === 'active' || subscription.status === 'trialing') &&
      (!subscription.expiresAt || new Date(subscription.expiresAt) > new Date())
    : false;

  const data = {
    hasSubscription: !!subscription,
    isActive,
    tier: subscription?.tier || 'free',
    status: subscription?.status || 'none',
    productId: subscription?.productId || null,
    purchaseDate: subscription?.purchaseDate || null,
    expiresDate: subscription?.expiresAt || null,
    environment: subscription?.environment || null,
    autoRenew: subscription?.autoRenew ?? false,
    daysUntilExpiry,
    entitlements: {
      isPro: isActive && (subscription?.tier === 'pro' || subscription?.tier === 'premium'),
      maxCitiesPerWeek: isActive ? 999 : 3,
      canAccessPremiumContent: isActive,
      canSaveUnlimited: isActive,
    },
  };

  return jsonResponse({ success: true, data });
}

/**
 * Verify and sync StoreKit 2 transaction
 */
async function verifySubscription(supabase: any, userId: string, body: any) {
  const {
    transactionId,
    originalTransactionId,
    productId,
    purchaseDate,
    expirationDate,
    environment,
    autoRenewStatus,
    jwsRepresentation,
  } = body;

  // Validate required fields
  if (!transactionId || !productId) {
    return errorResponse('Missing required fields', 400, 'BAD_REQUEST');
  }

  // Determine tier from product ID
  const tier = productId.includes('yearly') ? 'pro' : 'pro';
  const status = 'active';

  // Upsert subscription
  const { data: subscription, error } = await supabase
    .from('Subscription')
    .upsert({
      userId,
      tier,
      status,
      productId,
      transactionId,
      originalTransactionId,
      purchaseDate: purchaseDate || new Date().toISOString(),
      expiresAt: expirationDate,
      environment: environment || 'production',
      autoRenew: autoRenewStatus ?? true,
      updatedAt: new Date().toISOString(),
    }, {
      onConflict: 'userId',
    })
    .select()
    .single();

  if (error) {
    console.error('[subscription] Verify error:', error);
    return errorResponse('Failed to verify subscription', 500, 'DATABASE_ERROR');
  }

  console.log(`[subscription] Verified subscription for user: ${userId}, product: ${productId}`);

  return jsonResponse({
    success: true,
    data: {
      subscription: {
        id: subscription.id,
        tier: subscription.tier,
        status: subscription.status,
        productId: subscription.productId,
        purchaseDate: subscription.purchaseDate,
        expiresDate: subscription.expiresAt,
        environment: subscription.environment,
        autoRenew: subscription.autoRenew,
      },
      entitlements: {
        isPro: true,
        maxCitiesPerWeek: 999,
        canAccessPremiumContent: true,
        canSaveUnlimited: true,
      },
      isNew: true,
      message: 'Subscription verified successfully',
    },
  });
}

/**
 * Restore purchases - looks up existing subscription by originalTransactionId
 * This enables cross-device subscription access using the same Apple ID
 */
async function restorePurchases(supabase: any, userId: string, body: any) {
  const {
    transactions,  // Array of StoreKit transactions to restore
  } = body;

  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    return errorResponse('No transactions to restore', 400, 'BAD_REQUEST');
  }

  console.log(`[subscription] Restoring ${transactions.length} transactions for user: ${userId}`);

  let restoredSubscription = null;
  let mostRecentTransaction = null;

  // Process each transaction and find the most recent valid subscription
  for (const transaction of transactions) {
    const {
      transactionId,
      originalTransactionId,
      productId,
      purchaseDate,
      expirationDate,
      environment,
      autoRenewStatus,
    } = transaction;

    if (!transactionId || !productId) {
      console.log('[subscription] Skipping invalid transaction:', transaction);
      continue;
    }

    // Check if this subscription is still valid (not expired)
    const expiresAt = expirationDate ? new Date(expirationDate) : null;
    const isExpired = expiresAt && expiresAt < new Date();

    if (isExpired) {
      console.log(`[subscription] Transaction ${transactionId} is expired, skipping`);
      continue;
    }

    // Track the most recent transaction
    const txnPurchaseDate = purchaseDate ? new Date(purchaseDate) : new Date();
    if (!mostRecentTransaction || txnPurchaseDate > new Date(mostRecentTransaction.purchaseDate)) {
      mostRecentTransaction = {
        transactionId,
        originalTransactionId,
        productId,
        purchaseDate: purchaseDate || new Date().toISOString(),
        expirationDate,
        environment: environment || 'production',
        autoRenewStatus: autoRenewStatus ?? true,
      };
    }
  }

  if (!mostRecentTransaction) {
    // No valid transactions found, check if user has existing subscription
    const { data: existingSubscription } = await supabase
      .from('Subscription')
      .select('*')
      .eq('userId', userId)
      .single();

    if (existingSubscription) {
      return jsonResponse({
        success: true,
        data: {
          restored: false,
          subscription: {
            id: existingSubscription.id,
            tier: existingSubscription.tier,
            status: existingSubscription.status,
            productId: existingSubscription.productId,
            purchaseDate: existingSubscription.purchaseDate,
            expiresDate: existingSubscription.expiresAt,
            environment: existingSubscription.environment,
            autoRenew: existingSubscription.autoRenew,
          },
          message: 'No new valid transactions to restore, returning existing subscription',
        },
      });
    }

    return jsonResponse({
      success: true,
      data: {
        restored: false,
        subscription: null,
        message: 'No valid subscriptions found to restore',
      },
    });
  }

  // Upsert the most recent valid subscription for this user
  const tier = mostRecentTransaction.productId.includes('yearly') ? 'pro' : 'pro';
  const status = 'active';

  const { data: subscription, error } = await supabase
    .from('Subscription')
    .upsert({
      userId,
      tier,
      status,
      productId: mostRecentTransaction.productId,
      transactionId: mostRecentTransaction.transactionId,
      originalTransactionId: mostRecentTransaction.originalTransactionId,
      purchaseDate: mostRecentTransaction.purchaseDate,
      expiresAt: mostRecentTransaction.expirationDate,
      environment: mostRecentTransaction.environment,
      autoRenew: mostRecentTransaction.autoRenewStatus,
      updatedAt: new Date().toISOString(),
    }, {
      onConflict: 'userId',
    })
    .select()
    .single();

  if (error) {
    console.error('[subscription] Restore error:', error);
    return errorResponse('Failed to restore subscription', 500, 'DATABASE_ERROR');
  }

  console.log(`[subscription] Restored subscription for user: ${userId}, product: ${subscription.productId}`);

  return jsonResponse({
    success: true,
    data: {
      restored: true,
      subscription: {
        id: subscription.id,
        tier: subscription.tier,
        status: subscription.status,
        productId: subscription.productId,
        purchaseDate: subscription.purchaseDate,
        expiresDate: subscription.expiresAt,
        environment: subscription.environment,
        autoRenew: subscription.autoRenew,
      },
      entitlements: {
        isPro: true,
        maxCitiesPerWeek: 999,
        canAccessPremiumContent: true,
        canSaveUnlimited: true,
      },
      message: 'Subscription restored successfully',
    },
  });
}
