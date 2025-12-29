/**
 * Types Exports
 *
 * Central export point for all TypeScript types.
 *
 * @module types
 * @since Sprint 5 Phase 3 - Clerk Authentication Integration
 */

// Clerk types
export {
  type ClerkUser,
  type ClerkSession,
  type ClerkJWTPayload,
  type ClerkWebhookEventType,
  type ClerkWebhookEvent,
  type ClerkUserEventData,
  type ClerkUserDeletedEventData,
  type ClerkSessionEventData,
  type ClerkWebhookHeaders,
  type ClerkAuthContext,
  type ClerkUserContext,
  extractPrimaryEmail,
  buildDisplayName,
  getImageUrl,
} from './clerk';
