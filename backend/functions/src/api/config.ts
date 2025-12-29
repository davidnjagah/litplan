/**
 * Config API Routes
 * Handles app configuration endpoints
 */

import express, {Request, Response} from 'express';
import {db} from '../config/firestore';
import {authenticateUser} from '../utils/middleware';

const router = express.Router();

/**
 * GET /config
 * Returns current app configuration (current week, tier limits, products)
 *
 * Response:
 * {
 *   success: true,
 *   config: {
 *     currentWeek: "2025-W01",
 *     weekStartDate: Timestamp,
 *     weekEndDate: Timestamp,
 *     tiers: {
 *       free: { maxCities: 1, maxPlans: 10, weekendAccess: false },
 *       pro: { maxCities: 100, maxPlans: 50, weekendAccess: true }
 *     },
 *     products: [...]
 *   }
 * }
 */
router.get('/', authenticateUser, async (req: Request, res: Response) => {
  try {
    // Get app config from Firestore
    const configDoc = await db.collection('config').doc('app').get();

    if (!configDoc.exists) {
      // Return default config if not found in Firestore
      const defaultConfig = {
        currentWeek: getCurrentWeek(),
        weekStartDate: getWeekStartDate(),
        weekEndDate: getWeekEndDate(),
        tiers: {
          free: {
            maxCities: 1,
            maxPlans: 10,
            weekendAccess: false,
            groupPlansAccess: false,
            savedCitiesAccess: false,
          },
          pro: {
            maxCities: 100,
            maxPlans: 50,
            weekendAccess: true,
            groupPlansAccess: true,
            savedCitiesAccess: true,
          },
        },
        products: [
          {
            productId: 'litplan_pro_monthly',
            name: 'Litplan Pro Monthly',
            price: 999,
            currency: 'USD',
            description: 'Monthly subscription to Litplan Pro',
          },
          {
            productId: 'litplan_pro_yearly',
            name: 'Litplan Pro Yearly',
            price: 9999,
            currency: 'USD',
            description: 'Yearly subscription to Litplan Pro (save 17%)',
          },
        ],
      };

      return res.status(200).json({
        success: true,
        config: defaultConfig,
      });
    }

    const configData = configDoc.data();

    return res.status(200).json({
      success: true,
      config: configData,
    });
  } catch (error) {
    console.error('Error fetching app config:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch app configuration',
      },
    });
  }
});

/**
 * Helper function to get current week string (e.g., "2025-W01")
 */
function getCurrentWeek(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

/**
 * Helper function to get start of current week (Monday 00:00:00)
 */
function getWeekStartDate(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek; // Monday is start of week
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Helper function to get end of current week (Sunday 23:59:59)
 */
function getWeekEndDate(): Date {
  const monday = getWeekStartDate();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

export default router;
