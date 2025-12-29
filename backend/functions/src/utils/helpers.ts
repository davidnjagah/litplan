/**
 * Helper Functions
 * Utility functions for common operations
 * Sprint 3, Day 14: Added in-memory caching for user entitlements
 */

import * as admin from 'firebase-admin';

/**
 * In-memory cache for user entitlements
 * Cache structure: { userId: { entitlements: {...}, timestamp: number } }
 */
interface EntitlementsCache {
  [userId: string]: {
    entitlements: any;
    tier: string;
    timestamp: number;
  };
}

const entitlementsCache: EntitlementsCache = {};

// Cache TTL: 5 minutes
const ENTITLEMENTS_CACHE_TTL_MS = 5 * 60 * 1000;

// Cleanup interval: Remove stale cache entries every 10 minutes
const CACHE_CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  Object.keys(entitlementsCache).forEach((userId) => {
    const cached = entitlementsCache[userId];
    if (now - cached.timestamp > ENTITLEMENTS_CACHE_TTL_MS) {
      delete entitlementsCache[userId];
    }
  });
  console.log(`Entitlements cache cleanup completed. Active entries: ${Object.keys(entitlementsCache).length}`);
}, CACHE_CLEANUP_INTERVAL_MS);

/**
 * Invalidate entitlements cache for a user
 * Call this after updating user subscription/entitlements
 */
export const invalidateEntitlementsCache = (userId: string): void => {
  delete entitlementsCache[userId];
  console.log(`Entitlements cache invalidated for user ${userId}`);
};

/**
 * Success Response Helper
 * Returns standardized success response
 */
export const successResponse = (data: any) => {
  return {
    success: true,
    data,
  };
};

/**
 * Error Response Helper
 * Returns standardized error response
 */
export const errorResponse = (
  code: string,
  message: string,
  details?: any
) => {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
};

/**
 * Get Current Week String
 * Returns ISO week string (e.g., '2025-W03')
 */
export const getCurrentWeek = (): string => {
  const now = new Date();
  const year = now.getFullYear();

  // Get week number (ISO 8601)
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);

  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
};

/**
 * Get Week Start and End Dates
 * Returns start and end timestamps for current week
 */
export const getWeekBoundaries = (): {
  start: admin.firestore.Timestamp;
  end: admin.firestore.Timestamp;
} => {
  const now = new Date();

  // Get Monday of current week
  const dayOfWeek = now.getDay();
  const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek; // Adjust to Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  // Get Sunday end of week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    start: admin.firestore.Timestamp.fromDate(monday),
    end: admin.firestore.Timestamp.fromDate(sunday),
  };
};

/**
 * Check if date is weekend
 */
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

/**
 * Format timestamp to ISO date string
 */
export const formatDate = (timestamp: admin.firestore.Timestamp): string => {
  return timestamp.toDate().toISOString().split('T')[0];
};

/**
 * Check if user has Pro subscription
 */
export const isProUser = async (userId: string): Promise<boolean> => {
  const db = admin.firestore();
  const userDoc = await db.collection('users').doc(userId).get();

  if (!userDoc.exists) {
    return false;
  }

  const userData = userDoc.data();
  return userData?.subscription?.tier === 'pro';
};

/**
 * Get user entitlements
 */
export const getUserEntitlements = async (userId: string) => {
  const db = admin.firestore();
  const userDoc = await db.collection('users').doc(userId).get();

  if (!userDoc.exists) {
    throw new Error('User not found');
  }

  const userData = userDoc.data();
  return userData?.entitlements || null;
};

/**
 * Check if user can access resource based on tier
 */
export const canAccessResource = async (
  userId: string,
  resourceType: 'weekend' | 'groupFlows' | 'savedCities'
): Promise<boolean> => {
  const entitlements = await getUserEntitlements(userId);

  if (!entitlements) {
    return false;
  }

  switch (resourceType) {
    case 'weekend':
      return entitlements.weekendAccess;
    case 'groupFlows':
      return entitlements.groupPlansAccess;
    case 'savedCities':
      return entitlements.savedCitiesAccess;
    default:
      return false;
  }
};

/**
 * Generate unique ID
 */
export const generateId = (prefix: string): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Sleep helper for delays
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Check User Entitlements
 * Retrieves user and checks their tier-based limits
 * Returns canAccess boolean and optional reason string
 * Sprint 3, Day 14: Added in-memory caching with 5-minute TTL
 */
export const checkUserEntitlements = async (
  userId: string,
  checkType: 'plan_limit' | 'weekend_access' | 'plan_count' | 'group_flows' | 'saved_cities'
): Promise<{ canAccess: boolean; reason?: string; entitlements?: any }> => {
  // Check cache first
  const now = Date.now();
  const cached = entitlementsCache[userId];

  if (cached && (now - cached.timestamp) < ENTITLEMENTS_CACHE_TTL_MS) {
    // Cache hit
    return {
      canAccess: true,
      entitlements: {
        tier: cached.tier,
        maxPlansPerCity: cached.entitlements.maxPlansPerCity,
        weekendAccess: cached.entitlements.weekendAccess,
        maxCitiesPerWeek: cached.entitlements.maxCitiesPerWeek,
        groupPlansAccess: cached.entitlements.groupPlansAccess,
        savedCitiesAccess: cached.entitlements.savedCitiesAccess,
      },
    };
  }

  // Cache miss - fetch from Firestore
  const db = admin.firestore();
  const userDoc = await db.collection('users').doc(userId).get();

  if (!userDoc.exists) {
    return {
      canAccess: false,
      reason: 'User not found',
    };
  }

  const userData = userDoc.data();
  const entitlements = userData?.entitlements;
  const tier = userData?.subscription?.tier || 'free';

  if (!entitlements) {
    return {
      canAccess: false,
      reason: 'User entitlements not found',
    };
  }

  // Store in cache
  entitlementsCache[userId] = {
    entitlements,
    tier,
    timestamp: now,
  };

  // Return entitlements along with access check
  return {
    canAccess: true,
    entitlements: {
      tier,
      maxPlansPerCity: entitlements.maxPlansPerCity,
      weekendAccess: entitlements.weekendAccess,
      maxCitiesPerWeek: entitlements.maxCitiesPerWeek,
      groupPlansAccess: entitlements.groupPlansAccess,
      savedCitiesAccess: entitlements.savedCitiesAccess,
    },
  };
};

/**
 * Create Paywall Error Response
 * Returns standardized paywall error format as per backend-specs.md
 */
export const paywallError = (
  paywallType: 'plan_limit' | 'weekend_access' | 'city_limit' | 'group_flows' | 'saved_cities'
) => {
  const messages = {
    plan_limit: 'Upgrade to Pro to access more than 10 plans per city',
    weekend_access: 'Upgrade to Pro to access weekend plans',
    city_limit: 'Upgrade to Pro to access more than 1 city per week',
    group_flows: 'Group flows are available for Pro users only',
    saved_cities: 'Saving cities is a Pro feature',
  };

  return {
    success: false,
    error: {
      code: 'PAYWALL_LIMIT_REACHED',
      message: messages[paywallType],
      paywallType,
    },
  };
};

/**
 * Update User Entitlements
 * Updates user's subscription tier and all associated entitlements
 * Sprint 3, Day 11
 *
 * @param userId - User ID to update
 * @param tier - Subscription tier ('free' or 'pro')
 * @param options - Optional subscription details (expiryDate, autoRenew, transactionId, productId)
 * @returns Success/error object with updated subscription data
 */
export const updateUserEntitlements = async (
  userId: string,
  tier: 'free' | 'pro',
  options?: {
    expiryDate?: Date;
    autoRenew?: boolean;
    transactionId?: string;
    productId?: string;
  }
): Promise<{
  success: boolean;
  subscription?: any;
  entitlements?: any;
  error?: string;
}> => {
  try {
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);

    // Verify user exists
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Define entitlements based on tier
    const entitlements =
      tier === 'pro'
        ? {
            maxCitiesPerWeek: 100,
            maxPlansPerCity: 50,
            weekendAccess: true,
            groupPlansAccess: true,
            savedCitiesAccess: true,
          }
        : {
            maxCitiesPerWeek: 1,
            maxPlansPerCity: 10,
            weekendAccess: false,
            groupPlansAccess: false,
            savedCitiesAccess: false,
          };

    // Build update object
    const updateData: any = {
      'subscription.tier': tier,
      'subscription.status': tier,
      'entitlements.maxCitiesPerWeek': entitlements.maxCitiesPerWeek,
      'entitlements.maxPlansPerCity': entitlements.maxPlansPerCity,
      'entitlements.weekendAccess': entitlements.weekendAccess,
      'entitlements.groupPlansAccess': entitlements.groupPlansAccess,
      'entitlements.savedCitiesAccess': entitlements.savedCitiesAccess,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Add optional fields if provided
    if (options?.expiryDate) {
      updateData['subscription.expiryDate'] = admin.firestore.Timestamp.fromDate(
        options.expiryDate
      );
    }

    if (options?.autoRenew !== undefined) {
      updateData['subscription.autoRenew'] = options.autoRenew;
    }

    if (options?.transactionId) {
      updateData['subscription.transactionId'] = options.transactionId;
    }

    if (options?.productId) {
      updateData['subscription.productId'] = options.productId;
    }

    // If upgrading to pro, set start date
    if (tier === 'pro') {
      updateData['subscription.startDate'] = admin.firestore.FieldValue.serverTimestamp();
    }

    // If downgrading to free, clear subscription fields
    if (tier === 'free') {
      updateData['subscription.startDate'] = null;
      updateData['subscription.expiryDate'] = null;
      updateData['subscription.autoRenew'] = false;
      updateData['subscription.transactionId'] = null;
      updateData['subscription.productId'] = null;
    }

    // Update Firestore
    await userRef.update(updateData);

    console.log(`User ${userId} entitlements updated to ${tier} tier`);

    // Invalidate cache after update
    invalidateEntitlementsCache(userId);

    // Fetch updated user data
    const updatedUserDoc = await userRef.get();
    const updatedUserData = updatedUserDoc.data();

    return {
      success: true,
      subscription: updatedUserData?.subscription,
      entitlements: updatedUserData?.entitlements,
    };
  } catch (error) {
    console.error('Error updating user entitlements:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update entitlements',
    };
  }
};
