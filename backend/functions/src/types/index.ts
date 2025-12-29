/**
 * Types Exports
 *
 * Central export point for all TypeScript types.
 *
 * @module types
 * @since Sprint 5 Phase 3 - Clerk Authentication Integration
 * @updated Sprint 6 - Supabase Migration
 */

// Clerk types (deprecated - kept for backward compatibility during migration)
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

// Supabase types (Sprint 6)
export {
  type SupabaseUser,
  type SupabaseSession,
  type SupabaseAuthError,
  type SupabaseAuthEvent,
  type SupabaseWebhookPayload,
  type SupabaseAuthContext,
  type SupabaseJWTPayload,
  extractEmail,
  extractDisplayName,
  extractAvatarUrl,
} from './supabase';
