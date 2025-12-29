/**
 * User API Routes
 * Handles user activity tracking, viewed cities, and saved cities
 */

import express, { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { authenticateUser } from '../utils/middleware';
import { errorResponse, generateId, getWeekBoundaries, paywallError } from '../utils/helpers';

const router = express.Router();

/**
 * POST /user/viewedCities
 * Track that user viewed a city
 *
 * Request Body:
 * {
 *   cityId: string,
 *   source?: string (e.g., 'explore_tab', 'search')
 * }
 *
 * Response:
 * {
 *   success: true,
 *   message: "City view recorded"
 * }
 */
router.post('/viewedCities', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const { cityId, source = 'unknown' } = req.body;

    if (!cityId) {
      return res.status(400).json(
        errorResponse('INVALID_REQUEST', 'cityId is required')
      );
    }

    const db = admin.firestore();

    // Verify city exists
    const cityDoc = await db.collection('cities').doc(cityId).get();
    if (!cityDoc.exists) {
      return res.status(404).json(
        errorResponse('CITY_NOT_FOUND', `City ${cityId} not found`)
      );
    }

    // Check if user has already viewed this city this week
    const { start: weekStart, end: weekEnd } = getWeekBoundaries();

    // Get user's viewedCities activity for this week
    const activitySnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('activity')
      .where('type', '==', 'viewed_city')
      .where('cityId', '==', cityId)
      .where('timestamp', '>=', weekStart)
      .where('timestamp', '<=', weekEnd)
      .limit(1)
      .get();

    const now = admin.firestore.Timestamp.now();

    if (activitySnapshot.empty) {
      // First view of this city this week - create new activity record
      const activityId = generateId('activity');

      await db
        .collection('users')
        .doc(userId)
        .collection('activity')
        .doc(activityId)
        .set({
          activityId,
          userId,
          type: 'viewed_city',
          cityId,
          timestamp: now,
          viewCount: 1,
          metadata: {
            source,
            sessionId: generateId('session'),
          },
        });
    } else {
      // Update existing activity record - increment view count
      const activityDoc = activitySnapshot.docs[0];
      const currentViewCount = activityDoc.data().viewCount || 1;

      await activityDoc.ref.update({
        timestamp: now, // Update to latest view time
        viewCount: currentViewCount + 1,
        'metadata.lastSource': source,
      });
    }

    // Check weekly city limit for free users
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const tier = userData?.subscription?.tier || 'free';

    if (tier === 'free') {
      // Count unique cities viewed this week
      const weeklyActivitySnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('activity')
        .where('type', '==', 'viewed_city')
        .where('timestamp', '>=', weekStart)
        .where('timestamp', '<=', weekEnd)
        .get();

      const uniqueCitiesThisWeek = new Set(
        weeklyActivitySnapshot.docs.map(doc => doc.data().cityId)
      );

      // If this is a new city and user has already viewed 1 city this week, they hit the limit
      // Note: We allow the view to be recorded but return paywall info
      if (uniqueCitiesThisWeek.size > 1) {
        return res.status(403).json(
          paywallError('city_limit')
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: 'City view recorded',
    });
  } catch (error) {
    console.error('Error tracking city view:', error);
    return res.status(500).json(
      errorResponse('SERVER_ERROR', 'Failed to record city view', error)
    );
  }
});

/**
 * GET /user/viewedCities
 * Get user's recently viewed cities
 *
 * Query Parameters:
 * - limit (optional): Number of cities to return (default 20)
 *
 * Response:
 * {
 *   success: true,
 *   viewedCities: [
 *     {
 *       cityId: string,
 *       name: string,
 *       viewedAt: timestamp,
 *       viewCount: number,
 *       displayAssets: { ... }
 *     }
 *   ]
 * }
 */
router.get('/viewedCities', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const limit = parseInt(req.query.limit as string) || 20;

    const db = admin.firestore();

    // Get user's viewed city activities (sorted by most recent)
    const activitySnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('activity')
      .where('type', '==', 'viewed_city')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    if (activitySnapshot.empty) {
      return res.status(200).json({
        success: true,
        viewedCities: [],
      });
    }

    // Get city details for each viewed city
    const cityIds = activitySnapshot.docs.map(doc => doc.data().cityId);
    const uniqueCityIds = [...new Set(cityIds)];

    const cityPromises = uniqueCityIds.map(async (cityId) => {
      const cityDoc = await db.collection('cities').doc(cityId).get();
      if (!cityDoc.exists) {
        return null;
      }

      const cityData = cityDoc.data();

      // Find the activity record for this city
      const activityDoc = activitySnapshot.docs.find(doc => doc.data().cityId === cityId);
      const activityData = activityDoc?.data();

      return {
        cityId: cityData?.cityId,
        name: cityData?.name,
        country: cityData?.country,
        viewedAt: activityData?.timestamp,
        viewCount: activityData?.viewCount || 1,
        displayAssets: cityData?.displayAssets,
      };
    });

    const cities = await Promise.all(cityPromises);
    const viewedCities = cities.filter(city => city !== null);

    return res.status(200).json({
      success: true,
      viewedCities,
    });
  } catch (error) {
    console.error('Error fetching viewed cities:', error);
    return res.status(500).json(
      errorResponse('SERVER_ERROR', 'Failed to fetch viewed cities', error)
    );
  }
});

/**
 * GET /user/savedCities
 * Get user's saved cities (Pro only)
 *
 * Response:
 * {
 *   success: true,
 *   savedCities: [
 *     {
 *       cityId: string,
 *       name: string,
 *       savedAt: timestamp,
 *       displayAssets: { ... }
 *     }
 *   ]
 * }
 */
router.get('/savedCities', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const db = admin.firestore();

    // Check if user is Pro
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const tier = userData?.subscription?.tier || 'free';

    if (tier !== 'pro') {
      return res.status(403).json(
        paywallError('saved_cities')
      );
    }

    // Get saved cities subcollection
    const savedCitiesSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('savedCities')
      .orderBy('savedAt', 'desc')
      .get();

    if (savedCitiesSnapshot.empty) {
      return res.status(200).json({
        success: true,
        savedCities: [],
      });
    }

    // Get city details for each saved city
    const cityPromises = savedCitiesSnapshot.docs.map(async (doc) => {
      const savedData = doc.data();
      const cityDoc = await db.collection('cities').doc(savedData.cityId).get();

      if (!cityDoc.exists) {
        return null;
      }

      const cityData = cityDoc.data();

      return {
        cityId: cityData?.cityId,
        name: cityData?.name,
        country: cityData?.country,
        savedAt: savedData.savedAt,
        displayAssets: cityData?.displayAssets,
      };
    });

    const cities = await Promise.all(cityPromises);
    const savedCities = cities.filter(city => city !== null);

    return res.status(200).json({
      success: true,
      savedCities,
    });
  } catch (error) {
    console.error('Error fetching saved cities:', error);
    return res.status(500).json(
      errorResponse('SERVER_ERROR', 'Failed to fetch saved cities', error)
    );
  }
});

/**
 * POST /user/savedCities/:cityId
 * Save a city to favorites (Pro only)
 *
 * Response:
 * {
 *   success: true,
 *   message: "City saved successfully"
 * }
 */
router.post('/savedCities/:cityId', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const { cityId } = req.params;

    const db = admin.firestore();

    // Check if user is Pro
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const tier = userData?.subscription?.tier || 'free';

    if (tier !== 'pro') {
      return res.status(403).json(
        paywallError('saved_cities')
      );
    }

    // Verify city exists
    const cityDoc = await db.collection('cities').doc(cityId).get();
    if (!cityDoc.exists) {
      return res.status(404).json(
        errorResponse('CITY_NOT_FOUND', `City ${cityId} not found`)
      );
    }

    // Check if already saved
    const savedCityDoc = await db
      .collection('users')
      .doc(userId)
      .collection('savedCities')
      .doc(cityId)
      .get();

    if (savedCityDoc.exists) {
      return res.status(200).json({
        success: true,
        message: 'City already saved',
      });
    }

    // Save city
    await db
      .collection('users')
      .doc(userId)
      .collection('savedCities')
      .doc(cityId)
      .set({
        cityId,
        savedAt: admin.firestore.Timestamp.now(),
        notes: '', // For future feature
      });

    return res.status(200).json({
      success: true,
      message: 'City saved successfully',
    });
  } catch (error) {
    console.error('Error saving city:', error);
    return res.status(500).json(
      errorResponse('SERVER_ERROR', 'Failed to save city', error)
    );
  }
});

/**
 * DELETE /user/savedCities/:cityId
 * Remove city from saved list
 *
 * Response:
 * {
 *   success: true,
 *   message: "City removed from saved list"
 * }
 */
router.delete('/savedCities/:cityId', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const { cityId } = req.params;

    const db = admin.firestore();

    // Check if saved city exists
    const savedCityDoc = await db
      .collection('users')
      .doc(userId)
      .collection('savedCities')
      .doc(cityId)
      .get();

    if (!savedCityDoc.exists) {
      return res.status(404).json(
        errorResponse('CITY_NOT_SAVED', 'City is not in your saved list')
      );
    }

    // Delete saved city
    await savedCityDoc.ref.delete();

    return res.status(200).json({
      success: true,
      message: 'City removed from saved list',
    });
  } catch (error) {
    console.error('Error removing saved city:', error);
    return res.status(500).json(
      errorResponse('SERVER_ERROR', 'Failed to remove saved city', error)
    );
  }
});

export default router;
