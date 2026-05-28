/**
 * Health Check Edge Function
 *
 * Endpoints:
 * GET /health — Health check + app version config (consumed by AppUpdateManager on iOS launch).
 *
 * Response shape:
 * {
 *   status, timestamp, version, runtime,
 *   config: {
 *     latestAppVersion, minimumAppVersion, criticalUpdate, releaseNotes, maintenanceMode
 *   }
 * }
 *
 * Config is read from the AppVersionConfig table (single row id='app'). If the
 * lookup fails for any reason we still return a valid (best-effort) response so
 * the health endpoint stays available — the app treats a missing config as
 * "no update prompt".
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  let config: Record<string, unknown> = {
    latestAppVersion: null,
    minimumAppVersion: null,
    criticalUpdate: false,
    releaseNotes: null,
    maintenanceMode: false,
  };

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('AppVersionConfig')
      .select('*')
      .eq('id', 'app')
      .single();

    if (!error && data) {
      config = {
        latestAppVersion: data.latestAppVersion,
        minimumAppVersion: data.minimumAppVersion,
        criticalUpdate: data.criticalUpdate ?? false,
        releaseNotes: data.releaseNotes ?? null,
        maintenanceMode: false,
      };
    } else if (error) {
      console.error('[health] AppVersionConfig fetch error:', error);
    }
  } catch (e) {
    console.error('[health] config fetch threw:', e);
  }

  return jsonResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    runtime: 'supabase-edge-functions',
    config,
  });
});
