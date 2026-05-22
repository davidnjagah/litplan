/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Bolt Pipeline Status — Polling Endpoint
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Reads a PipelineJob row by id and returns its current state. iOS polls this
 * every 2s after kicking off bolt-pipeline-v3.
 *
 * Lazy watchdog: any row stuck in 'processing' for >240s is auto-flipped to
 * 'failed' on read. Avoids needing a cron job.
 *
 * Returns:
 *   { status: 'pending'|'queued'|'processing'|'completed'|'failed',
 *     result: any | null,
 *     error?: string,
 *     createdAt, startedAt, completedAt }
 *
 * See: scaling/railway-async-architecture.md
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';

const STALE_PROCESSING_THRESHOLD_MS = 240_000; // 4 minutes

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Accept either GET ?jobId=... or POST {jobId}
  let jobId: string | null = null;

  if (req.method === 'GET') {
    const url = new URL(req.url);
    jobId = url.searchParams.get('jobId');
  } else if (req.method === 'POST') {
    try {
      const body = await req.json();
      jobId = body?.jobId ?? null;
    } catch {
      // fall through
    }
  } else {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  if (!jobId) {
    return errorResponse('jobId is required', 400, 'MISSING_JOB_ID');
  }

  try {
    const supabase = createServiceClient();

    const { data: job, error } = await supabase
      .from('PipelineJob')
      .select('id, status, result, error, createdAt, startedAt, completedAt, flowId')
      .eq('id', jobId)
      .maybeSingle();

    if (error) {
      console.error('[status] read failed:', error);
      return errorResponse('Failed to read job', 500, 'READ_FAILED');
    }

    if (!job) {
      return jsonResponse({ success: false, status: 'not_found', error: 'Job not found' });
    }

    // Lazy watchdog — flip stale processing rows to failed.
    // Writes a STRUCTURED result so analytics views classify these correctly
    // as WATCHDOG_TIMEOUT rather than UNKNOWN.
    if (job.status === 'processing' && job.startedAt) {
      const ageMs = Date.now() - new Date(job.startedAt).getTime();
      if (ageMs > STALE_PROCESSING_THRESHOLD_MS) {
        console.log(`[status] job ${jobId} stale (${Math.round(ageMs / 1000)}s) — marking failed`);
        const errorMessage = `Pipeline exceeded ${STALE_PROCESSING_THRESHOLD_MS / 1000}s — likely Railway crashed mid-run`;
        const failedResult = {
          success: false,
          error: errorMessage,
          errorCode: 'WATCHDOG_TIMEOUT',
        };
        const completedAt = new Date().toISOString();
        await supabase
          .from('PipelineJob')
          .update({
            status: 'failed',
            error: errorMessage,
            result: failedResult,
            completedAt,
          })
          .eq('id', jobId);
        return jsonResponse({
          success: true,
          ...job,
          status: 'failed',
          error: errorMessage,
          result: failedResult,
          completedAt,
        });
      }
    }

    return jsonResponse({ success: true, ...job });
  } catch (err) {
    console.error('[status] error:', err);
    return errorResponse('Status check failed', 500, 'STATUS_ERROR');
  }
});
