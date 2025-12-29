/**
 * V2 Cities Routes
 *
 * API endpoints for city-related operations using Prisma and Supabase authentication.
 *
 * @module api/routes/v2/cities
 * @since Sprint 5 Phase 4 - API Migration to Prisma + Clerk
 * @updated Sprint 6 Phase 2 - Supabase Auth Integration
 */

import { Router, Response } from 'express';
import {
  AuthenticatedRequest,
  requireAuthWithUser,
  requireProWithUser,
} from '../../../middleware';
import {
  CityService,
  PlanService,
  GroupFlowService,
  SubscriptionService,
  UserActivityService,
} from '../../../services/prisma';

const router = Router();

/**
 * GET /api/v2/cities
 * List all cities (public)
 */
router.get('/', async (req, res: Response): Promise<void> => {
  try {
    const cities = await CityService.getAllCities();
    res.json({
      success: true,
      data: {
        cities,
        count: cities.length,
      },
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch cities',
      },
    });
  }
});

/**
 * GET /api/v2/cities/featured
 * Get featured cities (public)
 */
router.get('/featured', async (req, res: Response): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const cities = await CityService.getFeaturedCities(limit);
    res.json({
      success: true,
      data: {
        cities,
        count: cities.length,
      },
    });
  } catch (error) {
    console.error('Error fetching featured cities:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch featured cities',
      },
    });
  }
});

/**
 * GET /api/v2/cities/search
 * Search cities by name or country (public)
 */
router.get('/search', async (req, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;

    if (!query || query.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query is required',
        },
      });
      return;
    }

    const cities = await CityService.searchCities(query);
    res.json({
      success: true,
      data: {
        cities,
        count: cities.length,
        query,
      },
    });
  } catch (error) {
    console.error('Error searching cities:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to search cities',
      },
    });
  }
});

/**
 * GET /api/v2/cities/:cityId
 * Get city details (public)
 */
router.get('/:cityId', async (req, res: Response): Promise<void> => {
  try {
    const { cityId } = req.params;

    // Try to find by legacy cityId first (e.g., 'nyc-001')
    let city = await CityService.getCityByLegacyId(cityId);

    // If not found, try by primary ID (cuid)
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

    res.json({
      success: true,
      data: { city },
    });
  } catch (error) {
    console.error('Error fetching city:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch city',
      },
    });
  }
});

/**
 * GET /api/v2/cities/:cityId/plans
 * Get plans for a city (auth required, tier-limited)
 */
router.get(
  '/:cityId/plans',
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

      // Get user's entitlements
      const entitlements = await SubscriptionService.checkEntitlements(req.user!.id);

      // Check weekly city limit for free users
      if (entitlements.tier === 'FREE') {
        const citiesViewedThisWeek = await UserActivityService.getCitiesViewedThisWeek(
          req.user!.id
        );

        if (citiesViewedThisWeek >= entitlements.maxCitiesPerWeek) {
          // Check if this city was already viewed this week
          const viewedCities = await UserActivityService.getViewedCities(req.user!.id, 10);
          const alreadyViewed = viewedCities.some((vc) => vc.cityId === city!.id);

          if (!alreadyViewed) {
            res.status(403).json({
              success: false,
              error: {
                code: 'PAYWALL_LIMIT_REACHED',
                message: 'You have reached your weekly city limit. Upgrade to Pro to access more cities.',
                details: {
                  currentLimit: entitlements.maxCitiesPerWeek,
                  used: citiesViewedThisWeek,
                  tier: 'FREE',
                  upgradeUrl: '/subscribe',
                },
              },
            });
            return;
          }
        }
      }

      // Fetch plans with tier-based limits
      const plans = await PlanService.getPlansByCityId(city.id, {
        limit: entitlements.maxPlansPerCity,
        // Hide weekend plans if user doesn't have weekend access
        isWeekend: entitlements.weekendAccess ? undefined : false,
      });

      // Get total plan count for this city
      const totalPlans = await PlanService.getPlanCountByCityId(city.id);

      // Record activity
      await UserActivityService.recordCityView(req.user!.id, city.id);

      res.json({
        success: true,
        data: {
          plans,
          meta: {
            returned: plans.length,
            total: totalPlans,
            limit: entitlements.maxPlansPerCity,
            tier: entitlements.tier,
            weekendAccess: entitlements.weekendAccess,
            cityId: city.id,
            cityLegacyId: city.cityId,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching plans:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch plans',
        },
      });
    }
  }
);

/**
 * GET /api/v2/cities/:cityId/group-flows
 * Get group flows for a city (auth required, pro only)
 */
router.get(
  '/:cityId/group-flows',
  requireProWithUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { cityId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

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

      // Get group flows with steps
      const groupFlows = await GroupFlowService.getGroupFlowsWithStepsByCityId(city.id, limit);

      // Record city view
      await UserActivityService.recordCityView(req.user!.id, city.id);

      res.json({
        success: true,
        data: {
          groupFlows,
          count: groupFlows.length,
          cityId: city.id,
          cityLegacyId: city.cityId,
        },
      });
    } catch (error) {
      console.error('Error fetching group flows:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch group flows',
        },
      });
    }
  }
);

export default router;
