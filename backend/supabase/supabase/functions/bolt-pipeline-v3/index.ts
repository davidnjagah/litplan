/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Bolt Pipeline V3 — Async Trigger (Railway-backed)
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Thin gateway. Does NOT run the AI pipeline. Responsibilities:
 *   1. Check vibez_cache for (city, theme). If hit → return cached result.
 *   2. Otherwise, generate a jobId, insert a PipelineJob row (status: pending),
 *      fire Railway /api/pipeline/bolt-async (15s AbortController timeout),
 *      and return {jobId, status: 'pending'} in <500ms.
 *
 * iOS then polls bolt-pipeline-status?jobId=X every 2s until terminal.
 *
 * Runs in parallel with the legacy synchronous bolt-pipeline-v2 — kept live for
 * one-flag rollback. iOS picks which path to use via a Config flag.
 *
 * See: scaling/railway-async-architecture.md
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';

const RAILWAY_URL = Deno.env.get('RAILWAY_URL') || 'https://litplan-production.up.railway.app';
const RAILWAY_FETCH_TIMEOUT_MS = 15_000;

/**
 * Normalize a (city, theme) pair into a stable cache key.
 * "Kampala" / "Kampala, Uganda" / "  kampala  " / "KAMPALA" → "kampala:rooftop"
 * MUST match the Railway worker's cacheVibezResult() implementation.
 */
function buildCacheKey(city: string, theme: string): string {
  const cityNormalized = city.split(',')[0].trim().toLowerCase();
  const themeNormalized = theme.trim().toLowerCase();
  return `${cityNormalized}:${themeNormalized}`;
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    const body = await req.json();
    const { city, country, theme, themeDefinition, userId = 'anonymous' } = body;

    if (!city || !theme) {
      return errorResponse('City and theme are required', 400, 'MISSING_FIELDS');
    }

    const supabase = createServiceClient();

    // ─── CACHE CHECK ────────────────────────────────────────────────────────
    // Normalize the cache key so callers sending "Kampala", "Kampala, Uganda",
    // "kampala", "  KAMPALA  " all collapse to the same lookup. Strip any
    // country/state suffix after the first comma, trim, lowercase.
    const cacheKey = buildCacheKey(String(city), String(theme));
    const { data: cached } = await supabase
      .from('vibez_cache')
      .select('result, expires_at')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cached?.result) {
      console.log(`[v3-trigger] cache HIT for ${cacheKey}`);
      // Increment hit count opportunistically (best-effort, fire-and-forget)
      supabase
        .from('vibez_cache')
        .update({ hit_count: (cached as any).hit_count ? (cached as any).hit_count + 1 : 2 })
        .eq('cache_key', cacheKey)
        .then(() => {})
        .catch(() => {});
      return jsonResponse({
        success: true,
        cached: true,
        result: cached.result,
      });
    }

    // ─── INSERT PipelineJob row ─────────────────────────────────────────────
    const jobId = `bolt-job-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const { error: insertError } = await supabase.from('PipelineJob').insert({
      id: jobId,
      city,
      theme,
      userId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    if (insertError) {
      console.error('[v3-trigger] PipelineJob insert failed:', insertError);
      return errorResponse('Failed to create job', 500, 'JOB_CREATE_FAILED');
    }

    // ─── FIRE Railway (background-safe via waitUntil + 15s timeout) ─────────
    // On any trigger-level failure we write a STRUCTURED result blob with
    // errorCode so the analytics views (pipeline_failure_breakdown_7d, etc.)
    // can classify failures rather than bucketing them all as 'UNKNOWN'.
    const failJob = async (errorCode: string, errorMessage: string) => {
      await supabase
        .from('PipelineJob')
        .update({
          status: 'failed',
          error: errorMessage,
          result: { success: false, error: errorMessage, errorCode },
          completedAt: new Date().toISOString(),
        })
        .eq('id', jobId);
    };

    const fireRailway = async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), RAILWAY_FETCH_TIMEOUT_MS);
      try {
        const r = await fetch(`${RAILWAY_URL}/api/pipeline/bolt-async`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, city, country, theme, themeDefinition, userId }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!r.ok) {
          console.error(`[v3-trigger] Railway responded ${r.status}`);
          await failJob('TRIGGER_RAILWAY_HTTP_ERROR', `Railway returned ${r.status}`);
        }
      } catch (err) {
        clearTimeout(timer);
        const isAbort = (err as Error).name === 'AbortError';
        console.error('[v3-trigger] Railway fetch failed:', err);
        await failJob(
          isAbort ? 'TRIGGER_RAILWAY_TIMEOUT' : 'TRIGGER_RAILWAY_UNREACHABLE',
          isAbort
            ? `Railway did not respond within ${RAILWAY_FETCH_TIMEOUT_MS / 1000}s`
            : `Failed to reach Railway: ${(err as Error).message}`
        );
      }
    };

    // Keep the worker alive until the Railway fetch resolves (or aborts)
    // @ts-ignore — EdgeRuntime is Supabase-specific
    if (typeof EdgeRuntime !== 'undefined' && (EdgeRuntime as any).waitUntil) {
      // @ts-ignore
      (EdgeRuntime as any).waitUntil(fireRailway());
    } else {
      // Local dev fallback — fire-and-forget
      fireRailway().catch(() => {});
    }

    return jsonResponse({
      success: true,
      cached: false,
      jobId,
      status: 'pending',
    });
  } catch (error) {
    console.error('[v3-trigger] error:', error);
    return errorResponse(
      `Failed to start pipeline: ${(error as Error).message}`,
      500,
      'TRIGGER_CRASH'
    );
  }
});
