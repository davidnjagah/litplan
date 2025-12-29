/**
 * V2 API Router
 *
 * Central router for all v2 API endpoints using Prisma and Supabase authentication.
 * This module combines all v2 routes into a single Express router.
 *
 * @module api/routes/v2
 * @since Sprint 5 Phase 4 - API Migration to Prisma + Clerk
 * @updated Sprint 6 Phase 2 - Supabase Auth Integration
 * @updated Sprint 6 Phase 4 - Storage Migration
 */

import { Router } from 'express';

// Import v2 route modules
import citiesRouter from './cities';
import plansRouter from './plans';
import groupFlowsRouter from './groupFlows';
import userRouter from './user';
import subscriptionRouter from './subscription';
import configRouter from './config';
import storageRouter from './storage';

const router = Router();

// Mount route modules
router.use('/cities', citiesRouter);
router.use('/plans', plansRouter);
router.use('/group-flows', groupFlowsRouter);
router.use('/user', userRouter);
router.use('/subscription', subscriptionRouter);
router.use('/config', configRouter);
router.use('/storage', storageRouter);

// V2 API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      version: '2.0.0',
      message: 'Litplan API v2 - Prisma + Supabase Auth',
      authentication: 'Supabase JWT Bearer Token',
      endpoints: {
        cities: {
          list: 'GET /api/v2/cities',
          featured: 'GET /api/v2/cities/featured',
          search: 'GET /api/v2/cities/search?q=query',
          details: 'GET /api/v2/cities/:cityId',
          plans: 'GET /api/v2/cities/:cityId/plans (auth required)',
          groupFlows: 'GET /api/v2/cities/:cityId/group-flows (pro only)',
        },
        plans: {
          details: 'GET /api/v2/plans/:planId (auth required)',
          featured: 'GET /api/v2/plans/featured/:cityId',
        },
        groupFlows: {
          details: 'GET /api/v2/group-flows/:flowId (pro only)',
        },
        user: {
          profile: 'GET /api/v2/user/profile (auth required)',
          updateProfile: 'PATCH /api/v2/user/profile (auth required)',
          viewedCities: 'GET /api/v2/user/viewed-cities (auth required)',
          recordView: 'POST /api/v2/user/viewed-cities/:cityId (auth required)',
          savedCities: 'GET /api/v2/user/saved-cities (pro only)',
          saveCity: 'POST /api/v2/user/saved-cities/:cityId (pro only)',
          unsaveCity: 'DELETE /api/v2/user/saved-cities/:cityId (pro only)',
          activity: 'GET /api/v2/user/activity (auth required)',
        },
        subscription: {
          status: 'GET /api/v2/subscription (auth required)',
          entitlements: 'GET /api/v2/subscription/entitlements (auth required)',
          validate: 'POST /api/v2/subscription/validate (auth required)',
          restore: 'POST /api/v2/subscription/restore (auth required)',
        },
        config: {
          appConfig: 'GET /api/v2/config',
          tierLimits: 'GET /api/v2/config/tier-limits',
        },
        storage: {
          info: 'GET /api/v2/storage/info',
          uploadCityImage: 'POST /api/v2/storage/city/:cityId (auth required)',
          uploadPlanImage: 'POST /api/v2/storage/plan/:planId (auth required)',
          uploadAvatar: 'POST /api/v2/storage/avatar (pro only)',
          deleteAvatar: 'DELETE /api/v2/storage/avatar (pro only)',
          listCityImages: 'GET /api/v2/storage/city/:cityId',
          listPlanImages: 'GET /api/v2/storage/plan/:planId',
        },
      },
    },
  });
});

export default router;
