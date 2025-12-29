/**
 * Clerk Configuration
 *
 * Provides Clerk client initialization and webhook verification utilities.
 *
 * @module config/clerk
 * @since Sprint 5 Phase 3 - Clerk Authentication Integration
 */

import { createClerkClient } from '@clerk/backend';
import { Webhook } from 'svix';
import type { ClerkWebhookHeaders } from '../types/clerk';

// Initialize Clerk client for server-side operations
export const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * Verify Clerk webhook signature using Svix
 *
 * @param payload - Raw webhook payload string
 * @param headers - Webhook headers containing Svix signature
 * @returns Parsed and verified webhook event data
 * @throws Error if verification fails
 */
export async function verifyClerkWebhook<T = unknown>(
  payload: string,
  headers: ClerkWebhookHeaders
): Promise<T> {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('CLERK_WEBHOOK_SECRET is not configured');
  }

  const wh = new Webhook(webhookSecret);

  try {
    // Verify the webhook signature
    const event = wh.verify(payload, {
      'svix-id': headers['svix-id'],
      'svix-timestamp': headers['svix-timestamp'],
      'svix-signature': headers['svix-signature'],
    }) as T;

    return event;
  } catch (error) {
    console.error('Webhook verification failed:', error);
    throw new Error('Invalid webhook signature');
  }
}

/**
 * Get Clerk secret key (for debugging/logging purposes)
 *
 * @returns Whether Clerk is configured
 */
export function isClerkConfigured(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY);
}

/**
 * Get Clerk configuration status for health checks
 *
 * @returns Configuration status object
 */
export function getClerkConfigStatus(): {
  secretKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  publishableKeyConfigured: boolean;
} {
  return {
    secretKeyConfigured: Boolean(process.env.CLERK_SECRET_KEY),
    webhookSecretConfigured: Boolean(process.env.CLERK_WEBHOOK_SECRET),
    publishableKeyConfigured: Boolean(process.env.CLERK_PUBLISHABLE_KEY),
  };
}

export default clerkClient;
