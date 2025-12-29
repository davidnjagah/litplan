/**
 * Authentication Module
 * Handles Sign in with Apple and user authentication
 */

import {Request, Response} from 'express';
import * as admin from 'firebase-admin';
import {successResponse, errorResponse} from '../utils/helpers';

/**
 * POST /auth/login
 * Authenticate user with Sign in with Apple
 *
 * Request body:
 * {
 *   identityToken: string,
 *   authorizationCode: string,
 *   user?: {
 *     email?: string,
 *     name?: { firstName: string, lastName: string }
 *   }
 * }
 */
export const login = async (req: Request, res: Response) => {
  try {
    const {identityToken, user} = req.body;

    // Validate required fields
    if (!identityToken) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Missing identityToken')
      );
    }

    // TODO: Verify identity token with Apple's servers
    // For now, we'll create a mock implementation

    // Extract user info
    const email = user?.email;
    const displayName = user?.name
      ? `${user.name.firstName} ${user.name.lastName}`
      : undefined;

    // Create or update user in Firestore
    // TODO: Implement actual Sign in with Apple verification
    // For development, we'll create a custom token

    const userId = `apple_${Date.now()}`; // Mock user ID

    // Create custom Firebase token
    const customToken = await admin.auth().createCustomToken(userId);

    // Return user data and token
    return res.status(200).json(
      successResponse({
        user: {
          userId,
          email,
          displayName,
          subscription: {
            status: 'free',
            tier: 'free',
          },
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
};

// Export all auth handlers
export default {
  login,
};
