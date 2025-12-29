/**
 * Supabase Configuration
 *
 * Sprint 6: Supabase Migration
 * Configures Supabase clients for both public (RLS-protected) and admin operations.
 *
 * @module config/supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client for public operations (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper to verify Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey);
};

// Get configuration status
export const getSupabaseConfigStatus = () => ({
  configured: isSupabaseConfigured(),
  url: supabaseUrl ? 'Set' : 'Missing',
  anonKey: supabaseAnonKey ? 'Set' : 'Missing',
  serviceKey: supabaseServiceKey ? 'Set' : 'Missing',
});

export { supabaseUrl };
