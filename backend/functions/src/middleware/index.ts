/**
 * Middleware Exports
 *
 * Central export point for all middleware functions.
 *
 * @module middleware
 * @since Sprint 5 Phase 3 - Clerk Authentication Integration
 */

// Clerk authentication middleware
export {
  requireAuth,
  optionalAuth,
  loadUser,
  requireProTier,
  requireAuthWithUser,
  requireProWithUser,
  type AuthenticatedRequest,
  type ClerkAuthContext,
  type ClerkUserContext,
} from './clerkAuth';
