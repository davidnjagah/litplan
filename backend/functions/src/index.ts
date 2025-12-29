/**
 * Litplan Backend - Cloud Functions Entry Point
 *
 * This file serves as the main entry point for all Firebase Cloud Functions.
 * It exports HTTP endpoints and scheduled functions for the Litplan app.
 */

import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';

// Import Firestore configuration (this also initializes Firebase Admin)
import { db, admin } from './config/firestore';

// Import request logger middleware (Sprint 3, Day 14)
import { requestLogger, performanceLogger } from './utils/requestLogger';

// Import security headers middleware (Sprint 3, Day 15)
import { securityHeaders } from './utils/securityHeaders';

// Import API routes
import authRoutes from './api/auth';
import citiesRoutes from './api/cities';
import configRoutes from './api/config';
import userRoutes from './api/user';
import subscriptionRoutes from './api/subscription';
import plansRoutes from './api/plans';
import savedCitiesRoutes from './api/savedCities';
import healthRoutes from './api/health';

// Import Clerk authentication routes and webhooks (Sprint 5 Phase 3) - DEPRECATED
import clerkAuthRoutes from './api/routes/auth';
import clerkWebhookRoutes from './api/webhooks/clerk';

// Import Supabase authentication routes and webhooks (Sprint 6 Phase 2) - NEW
import supabaseAuthRoutes from './api/routes/v2/supabaseAuth';
import supabaseWebhookRoutes from './api/webhooks/supabase';

// Import V2 API routes (Sprint 5 Phase 4 - Prisma + Clerk, now updated for Supabase)
import v2Router from './api/routes/v2';

// Create Express app
const app = express();

// Middleware
app.use(cors({origin: true}));
app.use(express.json());

// Security headers (Sprint 3, Day 15)
app.use(securityHeaders);

// Request logging (Sprint 3, Day 14)
app.use(requestLogger);
app.use(performanceLogger(1000)); // Log requests slower than 1000ms

// Health check endpoints (Sprint 4, Day 19)
app.use('/health', healthRoutes);

// Clerk Webhooks (Sprint 5 Phase 3) - must be before body parsing for raw body access
// Note: Clerk webhook verification requires raw body, so this route should be mounted early
app.use('/webhooks/clerk', clerkWebhookRoutes);

// API Routes - Legacy (Firebase Auth based)
app.use('/auth', authRoutes);
app.use('/user', authRoutes); // /user/me routes are in auth.ts
app.use('/user', userRoutes); // /user/viewedCities, /user/savedCities routes
app.use('/cities', citiesRoutes);
app.use('/cities', savedCitiesRoutes); // Sprint 3, Day 13: Saved cities (Pro only)
app.use('/plans', plansRoutes); // Sprint 3, Day 13: Plan limits and weekend enforcement
app.use('/config', configRoutes);
app.use('/subscription', subscriptionRoutes); // Sprint 2, Day 8: Subscription endpoints

// Clerk Authentication Routes (Sprint 5 Phase 3) - DEPRECATED
// Legacy auth endpoints using Clerk: /api/v2/auth/*
app.use('/api/v2/auth', clerkAuthRoutes);

// Supabase Authentication Routes (Sprint 6 Phase 2) - NEW
// New auth endpoints using Supabase: /api/v2/auth/supabase/*
app.use('/api/v2/auth/supabase', supabaseAuthRoutes);

// Supabase Webhooks (Sprint 6 Phase 2)
app.use('/webhooks/supabase', supabaseWebhookRoutes);

// V2 API Routes (Sprint 5 Phase 4 - Prisma + Clerk, now updated for Supabase)
// All new endpoints using Prisma services and Supabase authentication
app.use('/api/v2', v2Router);

// Root route - API documentation
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Litplan Backend API',
    version: '2.0.0',
    endpoints: {
      health: '/health',
      // V2 API - Prisma + Clerk (Sprint 5 Phase 4) - RECOMMENDED
      'api/v2': {
        info: 'GET /api/v2 (API info and endpoints)',
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
      },
      // Supabase Authentication (Sprint 6 Phase 2) - NEW, RECOMMENDED
      'api/v2/auth/supabase': {
        sync: 'POST /api/v2/auth/supabase/sync (sync Supabase user to database)',
        me: 'GET /api/v2/auth/supabase/me (get current user with subscription)',
        updateProfile: 'PATCH /api/v2/auth/supabase/me (update display name)',
        deleteAccount: 'DELETE /api/v2/auth/supabase/account (delete user account)',
        status: 'GET /api/v2/auth/supabase/status (check auth status)',
      },
      // Clerk Authentication (Sprint 5 Phase 3) - DEPRECATED
      'api/v2/auth': {
        sync: 'POST /api/v2/auth/sync (sync Clerk user to database) [DEPRECATED]',
        me: 'GET /api/v2/auth/me (get current user with subscription) [DEPRECATED]',
        updateProfile: 'PATCH /api/v2/auth/me (update display name) [DEPRECATED]',
        deleteAccount: 'DELETE /api/v2/auth/account (delete user account) [DEPRECATED]',
        status: 'GET /api/v2/auth/status (check auth status) [DEPRECATED]',
      },
      webhooks: {
        supabase: 'POST /webhooks/supabase (Supabase Auth webhook events)',
        clerk: 'POST /webhooks/clerk (Clerk webhook events) [DEPRECATED]',
      },
      // Legacy endpoints (Firebase Auth based) - DEPRECATED
      legacy: {
        auth: {
          login: 'POST /auth/login',
        },
        user: {
          me: 'GET /user/me',
          updatePreferences: 'PATCH /user/me',
          viewedCities: 'GET /user/viewedCities',
          trackCityView: 'POST /user/viewedCities',
          savedCities: 'GET /user/savedCities (Pro only)',
          saveCity: 'POST /user/savedCities/:cityId (Pro only)',
          unsaveCity: 'DELETE /user/savedCities/:cityId',
        },
        cities: {
          list: 'GET /cities',
          getCity: 'GET /cities/:cityId',
          getPlans: 'GET /cities/:cityId/plans',
        },
        plans: {
          getPlan: 'GET /plans/:planId',
        },
        config: {
          getConfig: 'GET /config',
        },
        subscription: {
          validate: 'POST /subscription/validate',
          status: 'GET /subscription/status',
          restore: 'POST /subscription/restore',
        },
      },
    },
    tierLimits: {
      free: {
        maxCitiesPerWeek: 1,
        maxPlansPerCity: 10,
        weekendAccess: false,
        groupPlansAccess: false,
        savedCitiesAccess: false,
      },
      pro: {
        maxCitiesPerWeek: 100,
        maxPlansPerCity: 50,
        weekendAccess: true,
        groupPlansAccess: true,
        savedCitiesAccess: true,
      },
    },
  });
});

// Export db and admin for use in other modules
export { db, admin };

// Export the Express app as a Firebase Cloud Function
export const api = functions.https.onRequest(app);

// Scheduled Functions

/**
 * Weekly Plan Refresh
 * Runs every Monday at 00:00 UTC to generate new plans for all cities
 * Sprint 4, Day 16 - Full AI implementation
 */
import { weeklyPlanRefresh } from './scheduled/weeklyPlanRefresh';
export { weeklyPlanRefresh };

/**
 * Subscription Status Sync
 * Runs daily at 2 AM UTC to check all active subscriptions and downgrade expired ones
 * Sprint 3, Day 12 - Full implementation
 */
import { syncSubscriptionStatus } from './scheduled/syncSubscriptionStatus';
export { syncSubscriptionStatus };

/**
 * User Activity Cleanup
 * Runs every Sunday at 02:00 UTC to clean up old activity data
 */
export const cleanupUserActivity = functions.pubsub
  .schedule('0 2 * * 0') // Every Sunday at 02:00 UTC
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('Starting user activity cleanup...');

    try {
      // TODO: Implement activity cleanup logic
      // 1. Delete activity records older than 90 days
      // 2. For free users, keep only current week's data

      console.log('User activity cleanup completed successfully');
      return null;
    } catch (error) {
      console.error('Error during activity cleanup:', error);
      throw error;
    }
  });

/**
 * Update User Activity (Firestore Trigger)
 * Automatically triggered when a user views a city or plan
 * Updates user activity metrics and tracks engagement
 */
export const updateUserActivity = functions.firestore
  .document('users/{userId}/activity/{activityId}')
  .onCreate(async (snapshot, context) => {
    const activityData = snapshot.data();
    const userId = context.params.userId;

    console.log(`New activity recorded for user ${userId}:`, activityData.type);

    try {
      // Track different types of activity
      switch (activityData.type) {
        case 'viewed_city':
          // Log city view for analytics
          console.log(`User ${userId} viewed city: ${activityData.cityId}`);
          break;

        case 'viewed_plan':
          // Log plan view for analytics
          console.log(`User ${userId} viewed plan: ${activityData.planId}`);
          break;

        case 'saved_city':
          // Log saved city for analytics
          console.log(`User ${userId} saved city: ${activityData.cityId}`);
          break;

        default:
          console.log(`Unknown activity type: ${activityData.type}`);
      }

      // Future enhancements:
      // - Update user engagement score
      // - Trigger personalized recommendations
      // - Track conversion funnel metrics
      // - Send analytics to external service (Mixpanel, Amplitude, etc.)

      return null;
    } catch (error) {
      console.error('Error updating user activity:', error);
      // Don't throw - we don't want to fail the write operation
      return null;
    }
  });
