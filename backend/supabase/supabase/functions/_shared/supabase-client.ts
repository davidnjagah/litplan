/**
 * Supabase Client for Edge Functions
 * Creates authenticated Supabase clients for database access
 */

import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Environment variables (set via Supabase secrets)
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

/**
 * Create a service role client (bypasses RLS)
 * Use for admin operations like cron jobs
 */
export function createServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create an anonymous client
 * Use for public endpoints
 */
export function createAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create an authenticated client from request Authorization header
 * Use for user-scoped operations (respects RLS)
 */
export function createAuthenticatedClient(authHeader: string): SupabaseClient {
  const token = authHeader.replace('Bearer ', '');

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

/**
 * Get user from request Authorization header
 * Returns null if no valid auth token
 */
export async function getUserFromRequest(req: Request): Promise<User | null> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: { user }, error } = await client.auth.getUser();

  if (error || !user) {
    console.error('[supabase-client] Failed to get user:', error?.message);
    return null;
  }

  return user;
}

export { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY };
