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

// API Routes
app.use('/auth', authRoutes);
app.use('/user', authRoutes); // /user/me routes are in auth.ts
app.use('/user', userRoutes); // /user/viewedCities, /user/savedCities routes
app.use('/cities', citiesRoutes);
app.use('/cities', savedCitiesRoutes); // Sprint 3, Day 13: Saved cities (Pro only)
app.use('/plans', plansRoutes); // Sprint 3, Day 13: Plan limits and weekend enforcement
app.use('/config', configRoutes);
app.use('/subscription', subscriptionRoutes); // Sprint 2, Day 8: Subscription endpoints

// Root route - API documentation
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Litplan Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
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
        getCity: 'GET /cities/:cityId (tracks weekly city limit)',
        getPlans: 'GET /cities/:cityId/plans?type=[individual|group]',
        savedCities: 'GET /cities/saved (Pro only)',
        saveCity: 'POST /cities/save (Pro only)',
        unsaveCity: 'DELETE /cities/save/:cityId (Pro only)',
      },
      plans: {
        getPlan: 'GET /plans/:planId (tracks plan view limit, blocks weekend plans for free users)',
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
