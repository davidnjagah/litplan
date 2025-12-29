/**
 * Clerk Types
 *
 * TypeScript types for Clerk authentication integration.
 *
 * @module types/clerk
 * @since Sprint 5 Phase 3 - Clerk Authentication Integration
 */

/**
 * Clerk User object structure from the API
 */
export interface ClerkUser {
  id: string;
  emailAddresses: Array<{
    id: string;
    emailAddress: string;
    verification?: {
      status: string;
      strategy: string;
    };
  }>;
  primaryEmailAddressId?: string;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string;
  profileImageUrl?: string;
  username?: string | null;
  publicMetadata?: Record<string, unknown>;
  privateMetadata?: Record<string, unknown>;
  unsafeMetadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  lastSignInAt?: number | null;
  banned?: boolean;
  externalId?: string | null;
}

/**
 * Clerk Session object structure
 */
export interface ClerkSession {
  id: string;
  clientId: string;
  userId: string;
  status: 'active' | 'ended' | 'expired' | 'abandoned' | 'revoked';
  lastActiveAt: number;
  expireAt: number;
  abandonAt: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Clerk JWT payload structure after verification
 */
export interface ClerkJWTPayload {
  sub: string; // Clerk user ID
  sid?: string; // Session ID
  iss?: string; // Issuer
  aud?: string; // Audience
  exp?: number; // Expiration time
  iat?: number; // Issued at
  nbf?: number; // Not before
  azp?: string; // Authorized party
  metadata?: {
    publicMetadata?: Record<string, unknown>;
    privateMetadata?: Record<string, unknown>;
  };
}

/**
 * Clerk Webhook Event Types
 */
export type ClerkWebhookEventType =
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'session.created'
  | 'session.ended'
  | 'session.removed'
  | 'session.revoked'
  | 'email.created'
  | 'organization.created'
  | 'organization.updated'
  | 'organization.deleted'
  | 'organizationMembership.created'
  | 'organizationMembership.updated'
  | 'organizationMembership.deleted';

/**
 * Base Clerk Webhook Event structure
 */
export interface ClerkWebhookEvent<T = unknown> {
  type: ClerkWebhookEventType;
  data: T;
  object: 'event';
}

/**
 * User Created/Updated Event Data
 */
export interface ClerkUserEventData {
  id: string;
  email_addresses: Array<{
    id: string;
    email_address: string;
    verification: {
      status: string;
      strategy: string;
    } | null;
  }>;
  primary_email_address_id: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string;
  profile_image_url: string;
  username: string | null;
  public_metadata: Record<string, unknown>;
  private_metadata: Record<string, unknown>;
  unsafe_metadata: Record<string, unknown>;
  created_at: number;
  updated_at: number;
  last_sign_in_at: number | null;
  banned: boolean;
  external_id: string | null;
}

/**
 * User Deleted Event Data
 */
export interface ClerkUserDeletedEventData {
  id: string;
  deleted: boolean;
  object: 'user';
}

/**
 * Session Event Data
 */
export interface ClerkSessionEventData {
  id: string;
  client_id: string;
  user_id: string;
  status: string;
  last_active_at: number;
  expire_at: number;
  abandon_at: number;
  created_at: number;
  updated_at: number;
}

/**
 * Webhook headers required for verification
 */
export interface ClerkWebhookHeaders {
  'svix-id': string;
  'svix-timestamp': string;
  'svix-signature': string;
}

/**
 * Auth context attached to authenticated requests
 */
export interface ClerkAuthContext {
  userId: string;      // Clerk user ID
  sessionId?: string;  // Session ID
  claims?: ClerkJWTPayload;
}

/**
 * User context attached to authenticated requests after database lookup
 */
export interface ClerkUserContext {
  id: string;          // Database user ID (cuid)
  clerkUserId: string; // Clerk user ID
  email?: string;
  displayName?: string;
  subscription?: {
    tier: string;
    status: string;
    expiryDate?: Date;
  };
}

/**
 * Type guard to check if user is ClerkUser (camelCase API response)
 */
function isClerkUser(user: ClerkUser | ClerkUserEventData): user is ClerkUser {
  return 'emailAddresses' in user;
}

/**
 * Helper function to extract primary email from Clerk user
 */
export function extractPrimaryEmail(user: ClerkUser | ClerkUserEventData): string | undefined {
  if (isClerkUser(user)) {
    // ClerkUser format (camelCase)
    const primaryEmailId = user.primaryEmailAddressId;
    if (primaryEmailId) {
      const primaryEmail = user.emailAddresses.find((e) => e.id === primaryEmailId);
      if (primaryEmail) {
        return primaryEmail.emailAddress;
      }
    }
    // Fallback to first email
    if (user.emailAddresses.length > 0) {
      return user.emailAddresses[0].emailAddress;
    }
  } else {
    // ClerkUserEventData format (snake_case webhook payload)
    const primaryEmailId = user.primary_email_address_id;
    if (primaryEmailId) {
      const primaryEmail = user.email_addresses.find((e) => e.id === primaryEmailId);
      if (primaryEmail) {
        return primaryEmail.email_address;
      }
    }
    // Fallback to first email
    if (user.email_addresses.length > 0) {
      return user.email_addresses[0].email_address;
    }
  }

  return undefined;
}

/**
 * Helper function to build display name from Clerk user
 */
export function buildDisplayName(user: ClerkUser | ClerkUserEventData): string {
  let firstName: string | null | undefined;
  let lastName: string | null | undefined;
  let username: string | null | undefined;

  if (isClerkUser(user)) {
    firstName = user.firstName;
    lastName = user.lastName;
    username = user.username;
  } else {
    firstName = user.first_name;
    lastName = user.last_name;
    username = user.username;
  }

  if (firstName || lastName) {
    return [firstName, lastName].filter(Boolean).join(' ');
  }

  if (username) {
    return username;
  }

  return 'User';
}

/**
 * Helper function to get image URL from Clerk user
 */
export function getImageUrl(user: ClerkUser | ClerkUserEventData): string | undefined {
  if (isClerkUser(user)) {
    return user.imageUrl;
  } else {
    return user.image_url;
  }
}
