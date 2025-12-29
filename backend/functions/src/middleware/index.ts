/**
 * Middleware Exports
 *
 * Central export point for all middleware functions.
 *
 * @module middleware
 * @since Sprint 5 Phase 3 - Clerk Authentication Integration
 * @updated Sprint 6 Phase 2 - Supabase Auth Integration
 */

// Supabase authentication middleware (Sprint 6 - NEW, RECOMMENDED)
export {
  requireAuth,
  optionalAuth,
  loadUser,
  requireProTier,
  requireAuthWithUser,
  requireProWithUser,
  type AuthenticatedRequest,
  type SupabaseAuthContext,
  type SupabaseUserContext,
} from './supabaseAuth';

// Clerk authentication middleware (DEPRECATED - keep for backward compatibility)
export {
  requireAuth as requireAuthClerk,
  optionalAuth as optionalAuthClerk,
  loadUser as loadUserClerk,
  requireProTier as requireProTierClerk,
  requireAuthWithUser as requireAuthWithUserClerk,
  requireProWithUser as requireProWithUserClerk,
  type AuthenticatedRequest as ClerkAuthenticatedRequest,
  type ClerkAuthContext,
  type ClerkUserContext,
} from './clerkAuth';
