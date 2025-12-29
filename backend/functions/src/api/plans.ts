/**
 * Plans API Routes
 * Handles individual nightlife plan endpoints with tier enforcement
 */

import {Router, Response} from 'express';
import * as admin from 'firebase-admin';
import {authenticate, AuthenticatedRequest} from '../utils/middleware';
import {errorResponse} from '../utils/helpers';
import {rateLimiters} from '../utils/rateLimiter';

const router = Router();

/**
 * Helper: Check Plan View Limit
 * Free users: 10 plans per city
 * Pro users: 50 plans per city
 */
async function canViewPlan(
  userId: string,
  cityId: string,
  planId: string,
  isWeekendPlan: boolean
): Promise<{allowed: boolean; error?: string; plansViewedInCity: number}> {
  const db = admin.firestore();
  const userDoc = await db.collection('users').doc(userId).get();

  if (!userDoc.exists) {
    return { allowed: false, error: 'User not found', plansViewedInCity: 0 };
  }

  const userData = userDoc.data();
  const tier = userData?.subscription?.tier || 'free';

  // Weekend plans require Pro
  if (isWeekendPlan && tier !== 'pro') {
    return {
      allowed: false,
      error: 'Weekend plans are exclusive to Pro members. Upgrade to access premium weekend experiences.',
      plansViewedInCity: 0,
    };
  }

  // Get plan view tracking for this city
  const viewedPlans = userData?.viewedPlans || {};
  const cityPlans = viewedPlans[cityId] || [];

  // Filter plans viewed in the last 7 days
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentPlans = cityPlans.filter((plan: any) => {
    const viewedAt = plan.viewedAt?.toDate() || new Date(0);
    return viewedAt > sevenDaysAgo;
  });

  const plansViewedInCity = recentPlans.length;

  // Check if this plan was already viewed
  const alreadyViewed = recentPlans.some((plan: any) => plan.planId === planId);

  if (alreadyViewed) {
    return { allowed: true, plansViewedInCity };
  }

  // Check limits (EDGE CASE: handle exact limit)
  const limit = tier === 'pro' ? 50 : 10;

  // At exact limit, deny further views
  if (plansViewedInCity >= limit) {
    const message = tier === 'pro'
      ? `You've reached your limit of ${limit} plans in this city. Come back next week for fresh recommendations!`
      : `You've viewed ${plansViewedInCity} of your 10 free plans in this city. Upgrade to Pro to see up to 50 plans per city.`;

    return {
      allowed: false,
      error: message,
      plansViewedInCity,
    };
  }

  // EDGE CASE: Warn user when approaching limit (90% threshold)
  const warningThreshold = Math.floor(limit * 0.9);
  if (plansViewedInCity >= warningThreshold) {
    console.log(`User ${userId} approaching plan limit in ${cityId}: ${plansViewedInCity}/${limit}`);
  }

  return { allowed: true, plansViewedInCity };
}

/**
 * Helper: Update Plan View Tracking
 * EDGE CASE: Uses Firestore transaction to handle concurrent requests
 */
async function updatePlanViewTracking(
  userId: string,
  cityId: string,
  planId: string
): Promise<void> {
  const db = admin.firestore();
  const userRef = db.collection('users').doc(userId);

  // Use transaction to prevent race conditions from concurrent requests
  await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);

    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const viewedPlans = userData?.viewedPlans || {};
    const cityPlans = viewedPlans[cityId] || [];

    // Filter recent plans (last 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentPlans = cityPlans.filter((plan: any) => {
      const viewedAt = plan.viewedAt?.toDate() || new Date(0);
      return viewedAt > sevenDaysAgo;
    });

    // Check if already viewed (prevent duplicates)
    const alreadyViewed = recentPlans.some((plan: any) => plan.planId === planId);

    if (!alreadyViewed) {
      recentPlans.push({
        planId,
        viewedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      viewedPlans[cityId] = recentPlans;

      transaction.update(userRef, {
        viewedPlans,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    // If already viewed, don't update (idempotent)
  });
}

/**
 * GET /plans/:planId
 * Enhanced with plan limit and weekend plan enforcement
 * Rate limit: 200 requests per minute
 */
router.get('/:planId', rateLimiters.browsing, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const { planId } = req.params;

    if (!planId) {
      return res.status(400).json(
        errorResponse('INVALID_REQUEST', 'planId is required')
      );
    }

    // Fetch plan - need to search across all cities
    const db = admin.firestore();

    // EDGE CASE: Search directly in nightlifePlans collection (optimized)
    // Instead of iterating through cities, search the main collection
    const planSnapshot = await db
      .collection('nightlifePlans')
      .where('planId', '==', planId)
      .limit(1)
      .get();

    if (planSnapshot.empty) {
      return res.status(404).json(
        errorResponse('PLAN_NOT_FOUND', 'Plan not found')
      );
    }

    const planDoc = planSnapshot.docs[0];
    const planData = planDoc.data();

    // EDGE CASE: Validate plan data has required fields
    if (!planData.cityId || !planData.title || !planData.venueName) {
      console.error(`Plan ${planId} has corrupted data:`, {
        hasCityId: !!planData.cityId,
        hasTitle: !!planData.title,
        hasVenueName: !!planData.venueName,
      });
      return res.status(500).json(
        errorResponse(
          'PLAN_DATA_CORRUPTED',
          'Plan data is incomplete. Please try another plan.'
        )
      );
    }

    const cityId = planData.cityId;
    const isWeekendPlan = planData.flags?.isWeekend || false;

    // Check plan view limit
    const limitCheck = await canViewPlan(userId!, cityId, planId, isWeekendPlan);

    if (!limitCheck.allowed) {
      return res.status(403).json({
        success: false,
        error: {
          code: isWeekendPlan ? 'WEEKEND_PLAN_PRO_ONLY' : 'PLAN_LIMIT_REACHED',
          message: limitCheck.error,
          requiresUpgrade: true,
          plansViewedInCity: limitCheck.plansViewedInCity,
        },
      });
    }

    // Update tracking
    await updatePlanViewTracking(userId!, cityId, planId);

    return res.status(200).json({
      success: true,
      plan: {
        planId: planData.planId,
        cityId: planData.cityId,
        rank: planData.rank,
        title: planData.title,
        venueName: planData.venueName,
        description: planData.description,
        category: planData.category,
        type: planData.type,
        images: planData.images,
        location: planData.location,
        schedule: planData.schedule,
        pricing: planData.pricing,
        aiTags: planData.aiTags,
        flags: planData.flags,
        reviews: planData.reviews,
      },
    });
  } catch (error) {
    console.error('Error fetching plan:', error);
    return res.status(500).json(
      errorResponse('SERVER_ERROR', 'Failed to fetch plan')
    );
  }
});

export default router;
