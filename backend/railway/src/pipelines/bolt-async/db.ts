/**
 * Supabase REST helpers for PipelineJob, vibez_cache, GroupFlow, Plan, GroupFlowStep.
 * Uses service role key — only call from Railway server-side.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://clktdigankjszupvrsqt.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  };
}

export async function updatePipelineJob(
  jobId: string,
  patch: Record<string, unknown>
): Promise<void> {
  const url = `${SUPABASE_URL}/rest/v1/PipelineJob?id=eq.${encodeURIComponent(jobId)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...headers(), 'Prefer': 'return=minimal' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[db] updatePipelineJob ${jobId} failed: ${res.status} ${body}`);
  }
}

export async function readPipelineJob(jobId: string): Promise<Record<string, unknown> | null> {
  const url = `${SUPABASE_URL}/rest/v1/PipelineJob?id=eq.${encodeURIComponent(jobId)}&select=*`;
  const res = await fetch(url, { method: 'GET', headers: headers() });
  if (!res.ok) return null;
  const rows = await res.json() as Record<string, unknown>[];
  return rows[0] ?? null;
}

/**
 * Normalize a (city, theme) pair into a stable cache key.
 * MUST match the Supabase v3 trigger's buildCacheKey() implementation.
 */
export function buildCacheKey(city: string, theme: string): string {
  const cityNormalized = city.split(',')[0].trim().toLowerCase();
  const themeNormalized = theme.trim().toLowerCase();
  return `${cityNormalized}:${themeNormalized}`;
}

export async function cacheVibezResult(
  city: string,
  theme: string,
  result: unknown
): Promise<void> {
  const cacheKey = buildCacheKey(city, theme);
  const url = `${SUPABASE_URL}/rest/v1/vibez_cache?on_conflict=cache_key`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers(), 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      cache_key: cacheKey,
      city,
      theme,
      result,
      // expires_at defaults to NOW() + 7 days in the table definition
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[db] cacheVibezResult ${cacheKey} failed: ${res.status} ${body}`);
  }
}

export async function insertRow(table: string, row: Record<string, unknown>): Promise<void> {
  const url = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(table)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers(), 'Prefer': 'return=minimal' },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[db] insertRow ${table} failed: ${res.status} ${body}`);
  }
}
