/**
 * Saved Cities API Routes
 * Pro-only feature for saving favorite cities
 */

import {Router, Response} from 'express';
import * as admin from 'firebase-admin';
import {authenticate, AuthenticatedRequest, requireProTier} from '../utils/middleware';
import {errorResponse} from '../utils/helpers';
import {rateLimiters} from '../utils/rateLimiter';

const router = Router();

/**
 * POST /cities/save
 * Save a city to favorites (Pro only)
 * Rate limit: 30 requests per minute
 */
router.post('/save', rateLimiters.mutations, authenticate, requireProTier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const { cityId } = req.body;

    if (!cityId) {
      return res.status(400).json(
        errorResponse('INVALID_REQUEST', 'cityId is required')
      );
    }

    // Verify city exists
    const db = admin.firestore();
    const cityDoc = await db.collection('cities')
      .where('cityId', '==', cityId)
      .limit(1)
      .get();

    if (cityDoc.empty) {
      return res.status(404).json(
        errorResponse('CITY_NOT_FOUND', 'City not found')
      );
    }

    // Add to user's saved cities
    const userRef = db.collection('users').doc(userId!);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json(
        errorResponse('USER_NOT_FOUND', 'User not found')
      );
    }

    const userData = userDoc.data();
    const savedCities = userData?.savedCities || [];

    // Check if already saved
    if (savedCities.includes(cityId)) {
      return res.status(200).json({
        success: true,
        message: 'City already saved',
        savedCities,
      });
    }

    savedCities.push(cityId);

    await userRef.update({
      savedCities,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      success: true,
      message: 'City saved successfully',
      savedCities,
    });
  } catch (error) {
    console.error('Error saving city:', error);
    return res.status(500).json(
      errorResponse('SERVER_ERROR', 'Failed to save city')
    );
  }
});

/**
 * DELETE /cities/save/:cityId
 * Remove a city from favorites (Pro only)
 * Rate limit: 30 requests per minute
 */
router.delete('/save/:cityId', rateLimiters.mutations, authenticate, requireProTier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const { cityId } = req.params;

    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId!);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json(
        errorResponse('USER_NOT_FOUND', 'User not found')
      );
    }

    const userData = userDoc.data();
    const savedCities = userData?.savedCities || [];

    const updatedCities = savedCities.filter((id: string) => id !== cityId);

    await userRef.update({
      savedCities: updatedCities,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      success: true,
      message: 'City removed from favorites',
      savedCities: updatedCities,
    });
  } catch (error) {
    console.error('Error removing saved city:', error);
    return res.status(500).json(
      errorResponse('SERVER_ERROR', 'Failed to remove saved city')
    );
  }
});

/**
 * GET /cities/saved
 * Get all saved cities (Pro only)
 * Rate limit: 200 requests per minute
 */
router.get('/saved', rateLimiters.browsing, authenticate, requireProTier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;

    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(userId!).get();

    if (!userDoc.exists) {
      return res.status(404).json(
        errorResponse('USER_NOT_FOUND', 'User not found')
      );
    }

    const userData = userDoc.data();
    const savedCityIds = userData?.savedCities || [];

    // Fetch city details for each saved city
    const cities = [];
    for (const cityId of savedCityIds) {
      const citySnapshot = await db.collection('cities')
        .where('cityId', '==', cityId)
        .limit(1)
        .get();

      if (!citySnapshot.empty) {
        const cityData = citySnapshot.docs[0].data();
        cities.push({
          cityId: cityData.cityId,
          name: cityData.name,
          country: cityData.country,
          countryCode: cityData.countryCode,
          rank: cityData.rank,
          displayAssets: cityData.displayAssets,
          metadata: cityData.metadata,
          coordinates: cityData.coordinates,
        });
      }
    }

    return res.status(200).json({
      success: true,
      savedCities: cities,
    });
  } catch (error) {
    console.error('Error fetching saved cities:', error);
    return res.status(500).json(
      errorResponse('SERVER_ERROR', 'Failed to fetch saved cities')
    );
  }
});

export default router;
