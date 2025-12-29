/**
 * Middleware Functions
 * Express middleware for authentication, validation, and error handling
 */

import {Request, Response, NextFunction} from 'express';
import * as admin from 'firebase-admin';

/**
 * Extended Request interface with user information
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

/**
 * Authentication Middleware
 * Verifies Firebase token and attaches user to request
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_FAILED',
          message: 'Missing or invalid authorization header',
        },
      });
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify token with Firebase
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token',
      },
    });
  }
};

// Alias for authenticate (for consistency with API code)
export const authenticateUser = authenticate;

/**
 * Rate Limiting Middleware
 * Basic rate limiting (TODO: implement proper rate limiting with Redis)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number, windowMs: number) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.uid || req.ip || 'anonymous';
    const now = Date.now();

    const userRecord = requestCounts.get(userId);

    if (!userRecord || now > userRecord.resetTime) {
      // New window
      requestCounts.set(userId, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (userRecord.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
        },
      });
    }

    userRecord.count++;
    next();
  };
};

/**
 * Error Handler Middleware
 * Catches errors and returns consistent error responses
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  // Check if response already sent
  if (res.headersSent) {
    return next(err);
  }

  // Default to 500 server error
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred';

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
  });
};

/**
 * Not Found Handler
 * Returns 404 for unknown routes
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
};

/**
 * Validation Middleware Factory
 * Creates middleware to validate request body against schema
 */
export const validateBody = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): any => {
    const missingFields = requiredFields.filter((field) => {
      return !req.body || req.body[field] === undefined || req.body[field] === null;
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
          details: {
            missingFields,
          },
        },
      });
    }

    next();
  };
};

/**
 * Middleware: Require Pro Tier
 * Blocks requests from free users with 403 Forbidden
 *
 * Usage:
 *   router.post('/weekend-plans', authenticate, requireProTier, handler);
 */
export const requireProTier = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    const userData = userDoc.data();
    const tier = userData?.subscription?.tier || 'free';

    // Check if subscription is expired
    if (tier === 'pro' && userData?.subscription?.expiryDate) {
      const now = new Date();
      const expiry = userData.subscription.expiryDate.toDate();

      if (now > expiry) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'SUBSCRIPTION_EXPIRED',
            message: 'Your Pro subscription has expired. Please renew to access this feature.',
            requiresUpgrade: true,
          },
        });
      }
    }

    if (tier !== 'pro') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PRO_REQUIRED',
          message: 'This feature requires Litplan Pro. Upgrade to continue.',
          requiresUpgrade: true,
        },
      });
    }

    // User is Pro - continue
    next();
  } catch (error) {
    console.error('Error checking subscription tier:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to verify subscription tier',
      },
    });
  }
};
