/**
 * Supabase Types
 *
 * Sprint 6: Supabase Migration
 * Type definitions for Supabase Auth and webhook events.
 *
 * @module types/supabase
 */

export interface SupabaseUser {
  id: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  app_metadata: {
    provider?: string;
    providers?: string[];
  };
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
    email?: string;
    name?: string;
  };
}

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: SupabaseUser;
}

export interface SupabaseAuthError {
  message: string;
  status: number;
}

// Webhook event types
export type SupabaseAuthEvent =
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'PASSWORD_RECOVERY';

// Database webhook types (for Postgres triggers)
export type SupabaseDBWebhookType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface SupabaseWebhookPayload {
  type: SupabaseDBWebhookType;
  table: string;
  record: {
    id: string;
    email?: string;
    raw_user_meta_data?: {
      full_name?: string;
      avatar_url?: string;
      name?: string;
    };
    [key: string]: any;
  };
  schema: string;
  old_record?: {
    id: string;
    [key: string]: any;
  };
}

// Auth webhook payload (different from DB webhook)
export interface SupabaseAuthWebhookPayload {
  type: SupabaseAuthEvent;
  user: SupabaseUser;
  session?: SupabaseSession;
}

// Auth context for middleware
export interface SupabaseAuthContext {
  user: SupabaseUser | null;
  session: SupabaseSession | null;
  authenticated: boolean;
}

// JWT payload structure for Supabase tokens
export interface SupabaseJWTPayload {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  email?: string;
  phone?: string;
  app_metadata: {
    provider?: string;
    providers?: string[];
  };
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
    email?: string;
    name?: string;
  };
  role: string;
  aal?: string;
  amr?: Array<{ method: string; timestamp: number }>;
  session_id?: string;
}

// Helper functions for extracting user data
export const extractEmail = (user: SupabaseUser): string | undefined => {
  return user.email || user.user_metadata?.email;
};

export const extractDisplayName = (user: SupabaseUser): string | undefined => {
  return user.user_metadata?.full_name || user.user_metadata?.name;
};

export const extractAvatarUrl = (user: SupabaseUser): string | undefined => {
  return user.user_metadata?.avatar_url;
};
