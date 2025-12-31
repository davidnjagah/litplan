/**
 * V2 User Routes
 *
 * API endpoints for user profile and activity operations using Prisma and Supabase authentication.
 *
 * @module api/routes/v2/user
 * @since Sprint 5 Phase 4 - API Migration to Prisma + Clerk
 * @updated Sprint 6 Phase 2 - Supabase Auth Integration
 * @updated Sprint 9 - Removed UserActivity model, activity tracked via ViewedCity only
 */

import { Router, Response } from 'express';
import {
  AuthenticatedRequest,
  requireAuthWithUser,
  requireProWithUser,
} from '../../../middleware';
import {
  CityService,
  UserService,
  SubscriptionService,
  UserActivityService,
} from '../../../services/prisma';

const router = Router();

/**
 * GET /api/v2/user/profile
 * Get user profile with subscription (auth required)
 *
 * Returns complete user profile for iOS ProfileView:
 * - User info (id, email, displayName, avatarUrl)
 * - Subscription details (tier, status, expiryDate)
 * - Entitlements (feature access flags)
 * - savedCitiesCount for display
 *
 * @since Sprint 8 - Enhanced for iOS ProfileView
 */
router.get(
  '/profile',
  requireAuthWithUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = await UserService.getUserWithSubscription(req.user!.id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        });
        return;
      }

      // Get entitlements and saved cities count in parallel
      const [entitlements, savedCitiesCount] = await Promise.all([
        SubscriptionService.checkEntitlements(user.id),
        UserActivityService.getSavedCityCount(user.id),
      ]);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            supabaseUserId: user.supabaseUserId,
            email: user.email,
            displayName: user.displayName,
            imageUrl: user.imageUrl,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
          subscription: user.subscription
            ? {
                tier: user.subscription.tier,
                status: user.subscription.status,
                startDate: user.subscription.startDate,
                expiryDate: user.subscription.expiryDate,
                autoRenew: user.subscription.autoRenew,
              }
            : null,
          entitlements,
          savedCitiesCount,
        },
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch user profile',
        },
      });
    }
  }
);

/**
 * PATCH /api/v2/user/profile
 * Update user profile (auth required)
 */
router.patch(
  '/profile',
  requireAuthWithUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { displayName, email } = req.body;

      // Validate input
      if (!displayName && !email) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least one field (displayName or email) is required',
          },
        });
        return;
      }

      // Build update data
      const updateData: { displayName?: string; email?: string } = {};
      if (displayName) {
        if (typeof displayName !== 'string' || displayName.trim().length < 1) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Display name must be a non-empty string',
            },
          });
          return;
        }
        updateData.displayName = displayName.trim();
      }
      if (email) {
        if (typeof email !== 'string' || !email.includes('@')) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid email format',
            },
          });
          return;
        }
        updateData.email = email.trim().toLowerCase();
      }

      const updatedUser = await UserService.updateUser(req.user!.id, updateData);

      res.json({
        success: true,
        data: {
          user: {
            id: updatedUser.id,
            supabaseUserId: updatedUser.supabaseUserId,
            email: updatedUser.email,
            displayName: updatedUser.displayName,
            imageUrl: updatedUser.imageUrl,
            updatedAt: updatedUser.updatedAt,
          },
        },
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to update user profile',
        },
      });
    }
  }
);

/**
 * GET /api/v2/user/viewed-cities
 * Get viewed cities (auth required)
 */
router.get(
  '/viewed-cities',
  requireAuthWithUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const viewedCities = await UserActivityService.getViewedCities(req.user!.id, limit);

      res.json({
        success: true,
        data: {
          viewedCities: viewedCities.map((vc) => ({
            cityId: vc.cityId,
            city: vc.city,
            viewedAt: vc.viewedAt,
            viewCount: vc.viewCount,
          })),
          count: viewedCities.length,
        },
      });
    } catch (error) {
      console.error('Error fetching viewed cities:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch viewed cities',
        },
      });
    }
  }
);

/**
 * POST /api/v2/user/viewed-cities/:cityId
 * Record city view (auth required)
 */
router.post(
  '/viewed-cities/:cityId',
  requireAuthWithUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { cityId } = req.params;

      // Find the city
      let city = await CityService.getCityByLegacyId(cityId);
      if (!city) {
        city = await CityService.getCityById(cityId);
      }

      if (!city) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'City not found',
          },
        });
        return;
      }

      const viewedCity = await UserActivityService.recordCityView(req.user!.id, city.id);

      res.json({
        success: true,
        data: {
          viewedCity: {
            cityId: viewedCity.cityId,
            viewedAt: viewedCity.viewedAt,
            viewCount: viewedCity.viewCount,
          },
        },
      });
    } catch (error) {
      console.error('Error recording city view:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to record city view',
        },
      });
    }
  }
);

/**
 * GET /api/v2/user/saved-cities
 * Get saved cities (pro only)
 */
router.get(
  '/saved-cities',
  requireProWithUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const savedCities = await UserActivityService.getSavedCities(req.user!.id);

      res.json({
        success: true,
        data: {
          savedCities: savedCities.map((sc) => ({
            cityId: sc.cityId,
            city: sc.city,
            savedAt: sc.savedAt,
            notes: sc.notes,
          })),
          count: savedCities.length,
        },
      });
    } catch (error) {
      console.error('Error fetching saved cities:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch saved cities',
        },
      });
    }
  }
);

/**
 * POST /api/v2/user/saved-cities/:cityId
 * Save a city (pro only)
 */
router.post(
  '/saved-cities/:cityId',
  requireProWithUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { cityId } = req.params;
      const { notes } = req.body;

      // Find the city
      let city = await CityService.getCityByLegacyId(cityId);
      if (!city) {
        city = await CityService.getCityById(cityId);
      }

      if (!city) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'City not found',
          },
        });
        return;
      }

      const savedCity = await UserActivityService.saveCity(
        req.user!.id,
        city.id,
        notes as string | undefined
      );

      res.status(201).json({
        success: true,
        data: {
          savedCity: {
            cityId: savedCity.cityId,
            savedAt: savedCity.savedAt,
            notes: savedCity.notes,
          },
        },
      });
    } catch (error) {
      console.error('Error saving city:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to save city',
        },
      });
    }
  }
);

/**
 * DELETE /api/v2/user/saved-cities/:cityId
 * Unsave a city (pro only)
 */
router.delete(
  '/saved-cities/:cityId',
  requireProWithUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { cityId } = req.params;

      // Find the city
      let city = await CityService.getCityByLegacyId(cityId);
      if (!city) {
        city = await CityService.getCityById(cityId);
      }

      if (!city) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'City not found',
          },
        });
        return;
      }

      const wasUnsaved = await UserActivityService.unsaveCity(req.user!.id, city.id);

      if (!wasUnsaved) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'City was not saved',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          message: 'City unsaved successfully',
          cityId: city.id,
        },
      });
    } catch (error) {
      console.error('Error unsaving city:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to unsave city',
        },
      });
    }
  }
);

// Sprint 9: Removed /activity endpoint - UserActivity model has been removed
// Activity is now tracked via ViewedCity table only

export default router;
