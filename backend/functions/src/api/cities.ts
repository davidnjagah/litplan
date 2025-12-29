/**
 * Cities API Routes
 * Handles all city-related endpoints
 */

import express, {Request, Response} from 'express';
import * as admin from 'firebase-admin';
import {citiesCollection} from '../config/collections';
import {authenticateUser, AuthenticatedRequest} from '../utils/middleware';
import {checkUserEntitlements, errorResponse} from '../utils/helpers';
import {rateLimiters} from '../utils/rateLimiter';

const router = express.Router();

/**
 * GET /cities
 * Returns all cities with displayAssets
 * Rate limit: 200 requests per minute
 * Query params:
 *   - search: Filter cities by name (optional)
 *   - featured: Return only featured cities (optional, boolean)
 */
router.get('/', rateLimiters.browsing, authenticateUser, async (req: Request, res: Response) => {
  try {
    const {search, featured} = req.query;

    let query = citiesCollection.orderBy('rank', 'asc');

    // Filter by featured if requested
    if (featured === 'true') {
      query = query.where('metadata.featured', '==', true) as any;
    }

    const snapshot = await query.get();

    let cities = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        cityId: data.cityId,
        name: data.name,
        country: data.country,
        countryCode: data.countryCode,
        rank: data.rank,
        displayAssets: data.displayAssets,
        metadata: {
          totalPlansThisWeek: data.metadata?.totalPlansThisWeek || 0,
          featured: data.metadata?.featured || false,
        },
        coordinates: data.coordinates,
      };
    });

    // Apply search filter if provided (case-insensitive)
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      cities = cities.filter((city) =>
        city.name.toLowerCase().includes(searchLower) ||
        city.country.toLowerCase().includes(searchLower)
      );
    }

    return res.status(200).json({
      success: true,
      cities,
      total: cities.length,
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch cities',
      },
    });
  }
});

/**
 * Helper: Update Weekly City Tracking
 * Adds city to user's viewedCities array with timestamp
 * Automatically removes cities viewed more than 7 days ago
 */
async function updateWeeklyCityTracking(userId: string, cityId: string): Promise<void> {
  const db = admin.firestore();
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new Error('User not found');
  }

  const userData = userDoc.data();
  const viewedCities = userData?.viewedCities || [];

  // Filter out cities viewed more than 7 days ago
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentCities = viewedCities.filter((city: any) => {
    const viewedAt = city.viewedAt?.toDate() || new Date(0);
    return viewedAt > sevenDaysAgo;
  });

  // Check if this city was already viewed recently
  const alreadyViewed = recentCities.some((city: any) => city.cityId === cityId);

  if (!alreadyViewed) {
    recentCities.push({
      cityId,
      viewedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await userRef.update({
    viewedCities: recentCities,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Helper: Check Weekly City Limit
 * Returns true if user can view this city (within limits)
 * Free users: 1 unique city per week
 * Pro users: unlimited
 */
async function canViewCity(userId: string, cityId: string): Promise<{
  allowed: boolean;
  error?: string;
  uniqueCitiesThisWeek: number;
}> {
  const db = admin.firestore();
  const userDoc = await db.collection('users').doc(userId).get();

  if (!userDoc.exists) {
    return { allowed: false, error: 'User not found', uniqueCitiesThisWeek: 0 };
  }

  const userData = userDoc.data();
  const tier = userData?.subscription?.tier || 'free';

  // Pro users have unlimited access
  if (tier === 'pro') {
    return { allowed: true, uniqueCitiesThisWeek: 0 };
  }

  // Free users: check weekly limit
  const viewedCities = userData?.viewedCities || [];

  // Filter cities viewed in the last 7 days
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentCities = viewedCities.filter((city: any) => {
    const viewedAt = city.viewedAt?.toDate() || new Date(0);
    return viewedAt > sevenDaysAgo;
  });

  const uniqueCitiesThisWeek = new Set(recentCities.map((c: any) => c.cityId)).size;

  // Check if this city was already viewed
  const alreadyViewed = recentCities.some((city: any) => city.cityId === cityId);

  if (alreadyViewed) {
    // Already viewed, allow access
    return { allowed: true, uniqueCitiesThisWeek };
  }

  // Check if they've hit the limit (1 city for free)
  if (uniqueCitiesThisWeek >= 1) {
    return {
      allowed: false,
      error: 'Free users can explore 1 city per week. Upgrade to Pro for unlimited cities.',
      uniqueCitiesThisWeek,
    };
  }

  return { allowed: true, uniqueCitiesThisWeek };
}

/**
 * GET /cities/:cityId
 * Enhanced with weekly city limit enforcement
 * Rate limit: 200 requests per minute
 * Returns single city details
 * Returns 404 if city not found
 */
router.get('/:cityId', rateLimiters.browsing, authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const {cityId} = req.params;

    if (!userId) {
      return res.status(401).json(
        errorResponse('AUTH_FAILED', 'User not authenticated')
      );
    }

    // Check weekly city limit for free users
    const limitCheck = await canViewCity(userId, cityId);

    if (!limitCheck.allowed) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'CITY_LIMIT_REACHED',
          message: limitCheck.error,
          requiresUpgrade: true,
          uniqueCitiesThisWeek: limitCheck.uniqueCitiesThisWeek,
        },
      });
    }

    // Fetch city from Firestore
    const cityDoc = await citiesCollection
      .where('cityId', '==', cityId)
      .limit(1)
      .get();

    if (cityDoc.empty) {
      return res.status(404).json(
        errorResponse('CITY_NOT_FOUND', `City with ID '${cityId}' not found`)
      );
    }

    const cityData = cityDoc.docs[0].data();

    // Update weekly tracking
    await updateWeeklyCityTracking(userId, cityId);

    return res.status(200).json({
      success: true,
      city: {
        cityId: cityData.cityId,
        name: cityData.name,
        country: cityData.country,
        countryCode: cityData.countryCode,
        rank: cityData.rank,
        timezone: cityData.timezone,
        displayAssets: cityData.displayAssets,
        metadata: cityData.metadata,
        coordinates: cityData.coordinates,
      },
    });
  } catch (error) {
    console.error('Error fetching city:', error);
    return res.status(500).json(
      errorResponse('SERVER_ERROR', 'Failed to fetch city details')
    );
  }
});

/**
 * GET /cities/:cityId/plans
 * Returns plans for specified city with tier-based filtering
 * Rate limit: 200 requests per minute
 * Query params:
 *   - type: "individual" | "group" | "all" (optional, default "all")
 *   - limit: Number of plans to return (optional, overridden by user tier)
 *
 * Tier-based filtering:
 *   - Free users: Max 10 plans, weekday only
 *   - Pro users: Up to 50 plans, include weekends
 */
router.get('/:cityId/plans', rateLimiters.browsing, authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {cityId} = req.params;
    const {type} = req.query;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_FAILED',
          message: 'User not authenticated',
        },
      });
    }

    // First verify city exists
    const cityDoc = await citiesCollection
      .where('cityId', '==', cityId)
      .limit(1)
      .get();

    if (cityDoc.empty) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CITY_NOT_FOUND',
          message: `City with ID '${cityId}' not found`,
        },
      });
    }

    // Get user entitlements
    const entitlementsCheck = await checkUserEntitlements(userId, 'plan_count');

    if (!entitlementsCheck.canAccess || !entitlementsCheck.entitlements) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'USER_ENTITLEMENTS_ERROR',
          message: entitlementsCheck.reason || 'Unable to verify user entitlements',
        },
      });
    }

    const {entitlements} = entitlementsCheck;
    const isFreeUser = entitlements.tier === 'free';
    const maxPlans = entitlements.maxPlansPerCity;
    const hasWeekendAccess = entitlements.weekendAccess;

    // Get the city document reference
    const cityDocRef = cityDoc.docs[0].ref;

    // Query plans subcollection
    let plansQuery = cityDocRef.collection('plans').orderBy('rank', 'asc');

    // Filter by type if specified
    if (type === 'individual') {
      plansQuery = plansQuery.where('flags.isIndividual', '==', true) as any;
    } else if (type === 'group') {
      plansQuery = plansQuery.where('flags.isGroup', '==', true) as any;
    }

    const plansSnapshot = await plansQuery.get();

    let plans = plansSnapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      return {
        planId: data.planId,
        cityId: data.cityId,
        rank: data.rank,
        title: data.title,
        venueName: data.venueName,
        description: data.description,
        category: data.category,
        type: data.type,
        images: data.images,
        location: data.location,
        schedule: data.schedule,
        pricing: data.pricing,
        aiTags: data.aiTags,
        flags: data.flags,
        reviews: data.reviews,
      };
    });

    // Apply tier-based filtering
    // Filter out weekend plans for free users
    if (isFreeUser && !hasWeekendAccess) {
      plans = plans.filter((plan) => !plan.flags.isWeekend);
    }

    // Apply plan limit based on tier
    const hasMore = plans.length > maxPlans;
    plans = plans.slice(0, maxPlans);

    return res.status(200).json({
      success: true,
      plans,
      total: plans.length,
      userLimit: maxPlans,
      hasMore,
      tier: entitlements.tier,
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch plans',
      },
    });
  }
});

/**
 * GET /cities/:cityId/groupFlows
 * Returns group flow experiences for a city (Pro only)
 * Rate limit: 200 requests per minute
 * Query params:
 *   - limit: Number of flows to return (optional, default 10)
 *
 * Access Control:
 *   - Free users: Returns 403 PAYWALL error (Pro feature required)
 *   - Pro users: Returns up to 10 group flows
 */
router.get('/:cityId/groupFlows', rateLimiters.browsing, authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {cityId} = req.params;
    const {limit} = req.query;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_FAILED',
          message: 'User not authenticated',
        },
      });
    }

    // Get user entitlements
    const entitlementsCheck = await checkUserEntitlements(userId, 'group_flows');

    if (!entitlementsCheck.canAccess || !entitlementsCheck.entitlements) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'USER_ENTITLEMENTS_ERROR',
          message: entitlementsCheck.reason || 'Unable to verify user entitlements',
        },
      });
    }

    const {entitlements} = entitlementsCheck;
    const isFreeUser = entitlements.tier === 'free';

    // Check if user has access to group flows (Pro only feature)
    if (isFreeUser || !entitlements.groupPlansAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PRO_FEATURE_REQUIRED',
          message: 'Group flows are available for Pro users only',
          paywallType: 'group_flows',
        },
      });
    }

    // First verify city exists
    const cityDoc = await citiesCollection
      .where('cityId', '==', cityId)
      .limit(1)
      .get();

    if (cityDoc.empty) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CITY_NOT_FOUND',
          message: `City with ID '${cityId}' not found`,
        },
      });
    }

    // Get the city document reference
    const cityDocRef = cityDoc.docs[0].ref;

    // Parse limit (default 10, max 10)
    const flowLimit = Math.min(parseInt(limit as string, 10) || 10, 10);

    // Query groupFlows subcollection
    const flowsSnapshot = await cityDocRef
      .collection('groupFlows')
      .orderBy('createdAt', 'desc')
      .limit(flowLimit)
      .get();

    const groupFlows = flowsSnapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      return {
        groupFlowId: data.groupFlowId,
        cityId: data.cityId,
        title: data.title,
        description: data.description,
        activities: data.activities,
        totalDuration: data.totalDuration,
        estimatedCost: data.estimatedCost,
        difficulty: data.difficulty,
        bestFor: data.bestFor,
        aiTags: data.aiTags,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      groupFlows,
      total: groupFlows.length,
    });
  } catch (error) {
    console.error('Error fetching group flows:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch group flows',
      },
    });
  }
});

export default router;
