/**
 * V2 Plans Routes
 *
 * API endpoints for plan-related operations using Prisma and Clerk authentication.
 *
 * @module api/routes/v2/plans
 * @since Sprint 5 Phase 4 - API Migration to Prisma + Clerk
 */

import { Router, Response } from 'express';
import {
  AuthenticatedRequest,
  requireAuthWithUser,
} from '../../../middleware';
import {
  CityService,
  PlanService,
  SubscriptionService,
  UserActivityService,
} from '../../../services/prisma';

const router = Router();

/**
 * GET /api/v2/plans/featured/:cityId
 * Get featured plans for a city (public)
 */
router.get('/featured/:cityId', async (req, res: Response): Promise<void> => {
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

    const plans = await PlanService.getFeaturedPlans(city.id, limit);

    res.json({
      success: true,
      data: {
        plans,
        count: plans.length,
        cityId: city.id,
        cityLegacyId: city.cityId,
      },
    });
  } catch (error) {
    console.error('Error fetching featured plans:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch featured plans',
      },
    });
  }
});

/**
 * GET /api/v2/plans/:planId
 * Get plan details (auth required)
 */
router.get(
  '/:planId',
  requireAuthWithUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { planId } = req.params;

      // Try to find by legacy planId first (e.g., 'nyc-plan-001')
      let plan = await PlanService.getPlanByLegacyId(planId);

      // If not found, try by primary ID (cuid)
      if (!plan) {
        plan = await PlanService.getPlanById(planId);
      }

      if (!plan) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Plan not found',
          },
        });
        return;
      }

      // Get user's entitlements
      const entitlements = await SubscriptionService.checkEntitlements(req.user!.id);

      // Check if this is a weekend plan and user doesn't have access
      if (plan.isWeekend && !entitlements.weekendAccess) {
        res.status(403).json({
          success: false,
          error: {
            code: 'PRO_FEATURE_REQUIRED',
            message: 'Weekend plans are available to Pro subscribers only.',
            details: {
              feature: 'weekendAccess',
              tier: entitlements.tier,
              upgradeUrl: '/subscribe',
            },
          },
        });
        return;
      }

      // Record plan view activity
      await UserActivityService.recordPlanView(
        req.user!.id,
        plan.id,
        plan.cityId,
        'plan_detail'
      );

      // Get the plan with city information
      const planWithCity = await PlanService.getPlanWithCity(plan.id);

      res.json({
        success: true,
        data: {
          plan: planWithCity || plan,
        },
      });
    } catch (error) {
      console.error('Error fetching plan:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch plan',
        },
      });
    }
  }
);

export default router;
