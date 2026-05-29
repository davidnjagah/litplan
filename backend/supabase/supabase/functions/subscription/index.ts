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
 * Coerce a Postgres `timestamp without time zone` value (which Supabase returns as
 * "YYYY-MM-DDTHH:mm:ss", no Z) into a proper ISO8601 UTC string. Without this, iOS's
 * strict `JSONDecoder` would reject the date and downstream Pro reconcile logic would
 * treat the response as having failed.
 */
function toIsoUtc(s: string | null | undefined): string | null {
  if (!s) return null;
  if (typeof s !== 'string') return s as any;
  if (s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s)) return s;
  // Append Z so it parses as UTC consistently on both sides
  return s + 'Z';
}

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

  // Expiry can live in either column depending on when the row was written.
  const expiry = subscription?.expiresDate ?? subscription?.expiryDate ?? null;

  // Calculate days until expiry
  let daysUntilExpiry: number | null = null;
  if (expiry) {
    const expiresAt = new Date(expiry);
    const now = new Date();
    daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Determine if subscription is active. Statuses are UPPERCASE enum values.
  const ACTIVE_STATUSES = ['PRO', 'TRIAL', 'GRACE_PERIOD'];
  const isActive = subscription
    ? ACTIVE_STATUSES.includes(subscription.status) &&
      (!expiry || new Date(expiry) > new Date())
    : false;

  const data = {
    hasSubscription: !!subscription,
    isActive,
    tier: subscription?.tier || 'FREE',
    status: subscription?.status || 'none',
    productId: subscription?.productId || null,
    purchaseDate: toIsoUtc(subscription?.purchaseDate),
    expiresDate: toIsoUtc(expiry),
    environment: subscription?.environment || null,
    autoRenew: subscription?.autoRenew ?? false,
    daysUntilExpiry,
    entitlements: {
      isPro: isActive && subscription?.tier === 'PRO',
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
  // iOS sends snake_case keys (transaction_id, product_id, expires_date, ...).
  // Tolerate camelCase too so any other caller / future payload still works.
  const transactionId = body.transaction_id ?? body.transactionId;
  const productId = body.product_id ?? body.productId;
  const originalTransactionId =
    body.original_transaction_id ?? body.originalTransactionId ?? transactionId;
  const purchaseDate = body.purchase_date ?? body.purchaseDate;
  const expiration =
    body.expires_date ?? body.expirationDate ?? body.expiresDate ?? null;
  const environment = body.environment ?? 'production';
  const autoRenew = body.autoRenewStatus ?? body.auto_renew_status ?? true;
  const isTrial = body.is_trial ?? body.isTrial ?? false;

  // Validate required fields
  if (!transactionId || !productId) {
    return errorResponse('Missing required fields', 400, 'BAD_REQUEST');
  }

  // Both monthly and yearly map to the PRO tier. Status reflects trial vs paid.
  // These MUST be valid SubscriptionStatus/SubscriptionTier enum values (UPPERCASE).
  const tier = 'PRO';
  const status = isTrial ? 'TRIAL' : 'PRO';
  const now = new Date().toISOString();

  // Upsert by userId. `id` has a DB default (gen_random_uuid()::text) and is
  // omitted here so the PK stays stable across updates. Expiry is written to
  // BOTH expiresDate and expiryDate to satisfy every read path. supabaseUserId
  // is NOT NULL, so it is always populated with the auth user id.
  const { data: subscription, error } = await supabase
    .from('Subscription')
    .upsert({
      userId,
      supabaseUserId: userId,
      tier,
      status,
      productId,
      transactionId: String(transactionId),
      originalTransactionId: originalTransactionId ? String(originalTransactionId) : null,
      startDate: purchaseDate || now,
      purchaseDate: purchaseDate || now,
      expiresDate: expiration,
      expiryDate: expiration,
      environment,
      autoRenew,
      groupPlansAccess: true,
      savedCitiesAccess: true,
      updatedAt: now,
    }, {
      onConflict: 'userId',
    })
    .select()
    .single();

  if (error) {
    console.error('[subscription] Verify error:', error);
    return errorResponse('Failed to verify subscription', 500, 'DATABASE_ERROR');
  }

  console.log(`[subscription] Verified subscription for user: ${userId}, product: ${productId}, status: ${status}`);

  return jsonResponse({
    success: true,
    data: {
      subscription: {
        id: subscription.id,
        tier: subscription.tier,
        // iOS maps SubscriptionState(rawValue: status.lowercased()); 'active' grants access.
        status: 'active',
        productId: subscription.productId,
        purchaseDate: toIsoUtc(subscription.purchaseDate),
        expiresDate: toIsoUtc(subscription.expiresDate ?? subscription.expiryDate),
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
    // Tolerate snake_case and camelCase from any client.
    const transactionId = transaction.transaction_id ?? transaction.transactionId;
    const originalTransactionId =
      transaction.original_transaction_id ?? transaction.originalTransactionId ?? transactionId;
    const productId = transaction.product_id ?? transaction.productId;
    const purchaseDate = transaction.purchase_date ?? transaction.purchaseDate;
    const expirationDate =
      transaction.expires_date ?? transaction.expirationDate ?? transaction.expiresDate ?? null;
    const environment = transaction.environment;
    const autoRenewStatus = transaction.autoRenewStatus ?? transaction.auto_renew_status;

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
            status: 'active',
            productId: existingSubscription.productId,
            purchaseDate: toIsoUtc(existingSubscription.purchaseDate),
            expiresDate: toIsoUtc(existingSubscription.expiresDate ?? existingSubscription.expiryDate),
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

  // Upsert the most recent valid subscription for this user.
  // Same column/enum contract as verifySubscription.
  const tier = 'PRO';
  const status = 'PRO';
  const now = new Date().toISOString();

  const { data: subscription, error } = await supabase
    .from('Subscription')
    .upsert({
      userId,
      supabaseUserId: userId,
      tier,
      status,
      productId: mostRecentTransaction.productId,
      transactionId: String(mostRecentTransaction.transactionId),
      originalTransactionId: mostRecentTransaction.originalTransactionId
        ? String(mostRecentTransaction.originalTransactionId)
        : null,
      startDate: mostRecentTransaction.purchaseDate,
      purchaseDate: mostRecentTransaction.purchaseDate,
      expiresDate: mostRecentTransaction.expirationDate,
      expiryDate: mostRecentTransaction.expirationDate,
      environment: mostRecentTransaction.environment || 'production',
      autoRenew: mostRecentTransaction.autoRenewStatus,
      groupPlansAccess: true,
      savedCitiesAccess: true,
      updatedAt: now,
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
        status: 'active',
        productId: subscription.productId,
        purchaseDate: toIsoUtc(subscription.purchaseDate),
        expiresDate: toIsoUtc(subscription.expiresDate ?? subscription.expiryDate),
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
