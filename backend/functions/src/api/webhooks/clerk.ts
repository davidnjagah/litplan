/**
 * Clerk Webhook Handler
 *
 * Handles Clerk webhook events for user lifecycle management.
 * Events: user.created, user.updated, user.deleted, session.created, session.ended
 *
 * @module api/webhooks/clerk
 * @since Sprint 5 Phase 3 - Clerk Authentication Integration
 */

import { Router, Request, Response } from 'express';
import { verifyClerkWebhook } from '../../config/clerk';
import { UserService, SubscriptionService } from '../../services/prisma';
import type {
  ClerkWebhookEvent,
  ClerkUserEventData,
  ClerkUserDeletedEventData,
  ClerkSessionEventData,
  ClerkWebhookHeaders,
} from '../../types/clerk';
import {
  extractPrimaryEmail,
  buildDisplayName,
  getImageUrl,
} from '../../types/clerk';

const router = Router();

/**
 * POST /webhooks/clerk
 *
 * Main webhook endpoint for Clerk events.
 * Verifies webhook signature before processing.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // Get raw body for signature verification
    const payload = JSON.stringify(req.body);

    // Extract Svix headers
    const svixId = req.headers['svix-id'] as string;
    const svixTimestamp = req.headers['svix-timestamp'] as string;
    const svixSignature = req.headers['svix-signature'] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error('Missing Svix headers');
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_HEADERS',
          message: 'Missing required webhook headers',
        },
      });
      return;
    }

    const headers: ClerkWebhookHeaders = {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    };

    // Verify webhook signature
    let event: ClerkWebhookEvent;
    try {
      event = await verifyClerkWebhook<ClerkWebhookEvent>(payload, headers);
    } catch (verifyError) {
      console.error('Webhook verification failed:', verifyError);
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Webhook signature verification failed',
        },
      });
      return;
    }

    console.log(`Processing Clerk webhook event: ${event.type}`);

    // Route event to appropriate handler
    switch (event.type) {
      case 'user.created':
        await handleUserCreated(event.data as ClerkUserEventData);
        break;

      case 'user.updated':
        await handleUserUpdated(event.data as ClerkUserEventData);
        break;

      case 'user.deleted':
        await handleUserDeleted(event.data as ClerkUserDeletedEventData);
        break;

      case 'session.created':
        await handleSessionCreated(event.data as ClerkSessionEventData);
        break;

      case 'session.ended':
      case 'session.removed':
      case 'session.revoked':
        await handleSessionEnded(event.data as ClerkSessionEventData);
        break;

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      event: event.type,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WEBHOOK_ERROR',
        message: 'Failed to process webhook',
      },
    });
  }
});

/**
 * Handle user.created event
 *
 * Creates a new user in the database when a user signs up in Clerk.
 */
async function handleUserCreated(data: ClerkUserEventData): Promise<void> {
  console.log(`Creating user for Clerk ID: ${data.id}`);

  try {
    // Check if user already exists (in case of duplicate webhook)
    const existingUser = await UserService.getUserByClerkId(data.id);

    if (existingUser) {
      console.log(`User already exists for Clerk ID: ${data.id}`);
      return;
    }

    // Extract user data
    const email = extractPrimaryEmail(data);
    const displayName = buildDisplayName(data);
    const imageUrl = getImageUrl(data);

    // Create user in database
    const newUser = await UserService.createUser({
      clerkUserId: data.id,
      email,
      displayName,
      imageUrl,
    });

    console.log(`Created user: ${newUser.id} for Clerk ID: ${data.id}`);

    // Create default free subscription
    await SubscriptionService.createSubscription(newUser.id, {});

    console.log(`Created default subscription for user: ${newUser.id}`);
  } catch (error) {
    console.error(`Error creating user for Clerk ID ${data.id}:`, error);
    throw error;
  }
}

/**
 * Handle user.updated event
 *
 * Updates the user's data in the database when their profile changes in Clerk.
 */
async function handleUserUpdated(data: ClerkUserEventData): Promise<void> {
  console.log(`Updating user for Clerk ID: ${data.id}`);

  try {
    // Check if user exists
    const existingUser = await UserService.getUserByClerkId(data.id);

    if (!existingUser) {
      // User doesn't exist - create them (handle race condition with login)
      console.log(`User not found, creating for Clerk ID: ${data.id}`);
      await handleUserCreated(data);
      return;
    }

    // Extract updated user data
    const email = extractPrimaryEmail(data);
    const displayName = buildDisplayName(data);
    const imageUrl = getImageUrl(data);

    // Update user in database
    await UserService.updateUserByClerkId(data.id, {
      email,
      displayName,
      imageUrl,
    });

    console.log(`Updated user for Clerk ID: ${data.id}`);
  } catch (error) {
    console.error(`Error updating user for Clerk ID ${data.id}:`, error);
    throw error;
  }
}

/**
 * Handle user.deleted event
 *
 * Deletes the user and all associated data from the database.
 * Cascade delete will handle subscriptions, saved cities, etc.
 */
async function handleUserDeleted(data: ClerkUserDeletedEventData): Promise<void> {
  console.log(`Deleting user for Clerk ID: ${data.id}`);

  try {
    // Check if user exists
    const existingUser = await UserService.getUserByClerkId(data.id);

    if (!existingUser) {
      console.log(`User not found for Clerk ID: ${data.id} - may have already been deleted`);
      return;
    }

    // Delete user (cascade will delete related records)
    await UserService.deleteUserByClerkId(data.id);

    console.log(`Deleted user for Clerk ID: ${data.id}`);
  } catch (error) {
    console.error(`Error deleting user for Clerk ID ${data.id}:`, error);
    throw error;
  }
}

/**
 * Handle session.created event
 *
 * Optional: Log session creation for analytics/audit purposes.
 */
async function handleSessionCreated(data: ClerkSessionEventData): Promise<void> {
  console.log(`Session created for user: ${data.user_id}, session: ${data.id}`);

  // Optional: Track session in analytics or update last login timestamp
  try {
    const user = await UserService.getUserByClerkId(data.user_id);

    if (user) {
      // Could update lastLoginAt here if you have such a field
      console.log(`Session login recorded for user: ${user.id}`);
    }
  } catch (error) {
    // Non-critical - log and continue
    console.warn('Failed to process session.created event:', error);
  }
}

/**
 * Handle session.ended/session.removed/session.revoked events
 *
 * Optional: Log session end for analytics/audit purposes.
 */
async function handleSessionEnded(data: ClerkSessionEventData): Promise<void> {
  console.log(`Session ended for user: ${data.user_id}, session: ${data.id}, status: ${data.status}`);

  // Optional: Track session logout in analytics
  // This is informational only - no database changes needed
}

export default router;
