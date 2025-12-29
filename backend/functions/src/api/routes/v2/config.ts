/**
 * V2 Config Routes
 *
 * API endpoints for application configuration using Prisma.
 *
 * @module api/routes/v2/config
 * @since Sprint 5 Phase 4 - API Migration to Prisma + Clerk
 */

import { Router, Response, Request } from 'express';
import { AppConfigService } from '../../../services/prisma';

const router = Router();

/**
 * GET /api/v2/config
 * Get app config (public)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const config = await AppConfigService.getOrCreateConfig();
    const weekInfo = await AppConfigService.getCurrentWeekInfo();

    res.json({
      success: true,
      data: {
        config: {
          currentWeek: config.currentWeek,
          weekStartDate: weekInfo.weekStartDate,
          weekEndDate: weekInfo.weekEndDate,
          tierLimits: {
            free: {
              maxCities: config.freeMaxCities,
              maxPlans: config.freeMaxPlans,
              weekendAccess: config.freeWeekendAccess,
            },
            pro: {
              maxCities: config.proMaxCities,
              maxPlans: config.proMaxPlans,
              weekendAccess: config.proWeekendAccess,
            },
          },
        },
      },
    });
  } catch (error) {
    console.error('Error fetching app config:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch app configuration',
      },
    });
  }
});

/**
 * GET /api/v2/config/tier-limits
 * Get tier limits (public)
 */
router.get('/tier-limits', async (req: Request, res: Response) => {
  try {
    const freeLimits = await AppConfigService.getTierLimits('FREE');
    const proLimits = await AppConfigService.getTierLimits('PRO');

    res.json({
      success: true,
      data: {
        tierLimits: {
          FREE: {
            maxCitiesPerWeek: freeLimits.maxCities,
            maxPlansPerCity: freeLimits.maxPlans,
            weekendAccess: freeLimits.weekendAccess,
            groupPlansAccess: false,
            savedCitiesAccess: false,
          },
          PRO: {
            maxCitiesPerWeek: proLimits.maxCities,
            maxPlansPerCity: proLimits.maxPlans,
            weekendAccess: proLimits.weekendAccess,
            groupPlansAccess: true,
            savedCitiesAccess: true,
          },
        },
        description: {
          FREE: 'Free tier with limited access to cities and plans',
          PRO: 'Pro tier with full access to all features',
        },
      },
    });
  } catch (error) {
    console.error('Error fetching tier limits:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch tier limits',
      },
    });
  }
});

export default router;
