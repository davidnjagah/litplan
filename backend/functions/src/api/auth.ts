/**
 * Authentication API Routes
 *
 * Endpoints:
 * - POST /auth/login - Authenticate with Sign in with Apple
 * - GET /user/me - Get current user profile
 * - PATCH /user/me - Update user preferences
 */

import { Router, Request, Response } from 'express';
import { admin, getCurrentTimestamp } from '../config/firestore';
import { getUserDoc, getUserData } from '../config/collections';
import { authenticateUser } from '../utils/middleware';
import { successResponse, errorResponse } from '../utils/helpers';
import type { User } from '../models/User';

const router = Router();

/**
 * POST /auth/login
 * Authenticate user with Sign in with Apple
 *
 * For Day 2: Basic mock implementation
 * Sprint 3: Will implement full Apple Sign In verification
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { identityToken, user } = req.body;

    // Validate required fields
    if (!identityToken) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Missing identityToken')
      );
    }

    // TODO: Verify identity token with Apple's servers
    // For now, mock implementation for development
    const mockAppleId = `apple_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const email = user?.email || `${mockAppleId}@privaterelay.appleid.com`;
    const displayName = user?.name
      ? `${user.name.firstName} ${user.name.lastName}`
      : 'User';

    // Check if user exists
    let existingUser = await getUserData(mockAppleId);

    if (!existingUser) {
      // Create new user in Firestore
      const newUser: any = {
        userId: mockAppleId,
        email,
        displayName,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
        subscription: {
          status: 'free',
          tier: 'free',
          startDate: null,
          expiryDate: null,
          autoRenew: false,
          transactionId: null,
          productId: null,
        },
        entitlements: {
          maxCitiesPerWeek: 1,
          maxPlansPerCity: 10,
          weekendAccess: false,
          groupPlansAccess: false,
          savedCitiesAccess: false,
        },
        preferences: {
          notificationsEnabled: true,
          weeklyDigest: false,
        },
      };

      await getUserDoc(mockAppleId).set(newUser);
      existingUser = newUser;
    } else {
      // Update last login
      await getUserDoc(mockAppleId).update({
        updatedAt: getCurrentTimestamp(),
      });
    }

    // Create custom Firebase token for subsequent requests
    const customToken = await admin.auth().createCustomToken(mockAppleId);

    // Get the final user data (existingUser is now guaranteed to exist)
    const finalUser = existingUser!;

    // Return user data and token
    return res.status(200).json(
      successResponse({
        user: {
          userId: finalUser.userId,
          email: finalUser.email,
          displayName: finalUser.displayName,
          subscription: finalUser.subscription,
          entitlements: finalUser.entitlements,
        },
        token: customToken,
      })
    );
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json(
      errorResponse('AUTH_FAILED', 'Authentication failed')
    );
  }
});

/**
 * GET /user/me
 * Get current user profile and subscription status
 * Requires authentication
 */
router.get('/me', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;

    // Get user data from Firestore
    const userData = await getUserData(userId);

    if (!userData) {
      return res.status(404).json(
        errorResponse('USER_NOT_FOUND', 'User not found')
      );
    }

    // Return user profile
    return res.status(200).json(
      successResponse({
        user: {
          userId: userData.userId,
          email: userData.email,
          displayName: userData.displayName,
          subscription: userData.subscription,
          entitlements: userData.entitlements,
          preferences: userData.preferences,
        },
      })
    );
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json(
      errorResponse('SERVER_ERROR', 'Failed to fetch user data')
    );
  }
});

/**
 * PATCH /user/me
 * Update user preferences
 * Requires authentication
 */
router.patch('/me', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const { preferences } = req.body;

    if (!preferences) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Missing preferences in request body')
      );
    }

    // Validate preferences structure
    const validPreferences: Partial<User['preferences']> = {};

    if (typeof preferences.notificationsEnabled === 'boolean') {
      validPreferences.notificationsEnabled = preferences.notificationsEnabled;
    }

    if (typeof preferences.weeklyDigest === 'boolean') {
      validPreferences.weeklyDigest = preferences.weeklyDigest;
    }

    if (Object.keys(validPreferences).length === 0) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'No valid preferences provided')
      );
    }

    // Update user preferences
    await getUserDoc(userId).update({
      preferences: validPreferences,
      updatedAt: getCurrentTimestamp(),
    });

    // Get updated user data
    const updatedUser = await getUserData(userId);

    if (!updatedUser) {
      return res.status(404).json(
        errorResponse('USER_NOT_FOUND', 'User not found')
      );
    }

    return res.status(200).json(
      successResponse({
        user: {
          userId: updatedUser.userId,
          email: updatedUser.email,
          displayName: updatedUser.displayName,
          subscription: updatedUser.subscription,
          entitlements: updatedUser.entitlements,
          preferences: updatedUser.preferences,
        },
      })
    );
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json(
      errorResponse('SERVER_ERROR', 'Failed to update user preferences')
    );
  }
});

export default router;
