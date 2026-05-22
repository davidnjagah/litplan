# Vibez Rate Limit Implementation Plan
## Revised for OpenAI Tier 3 (800,000 TPM — ~32 pipelines/min)

---

## How Tier 3 Changes Everything

At Tier 1 (30K TPM) you could run 1 pipeline per minute — every request had to be serialised.
At Tier 3 (800K TPM) you can run ~32 pipelines per minute simultaneously.

50 concurrent users at 25,000 tokens each = 1.25M tokens/minute peak.
Tier 3 covers 800K of that — meaning you can absorb ~32 simultaneous requests with no issues.
The remaining ~18 wait less than 60 seconds before the token bucket refills.

**The queue is no longer the right solution.** The right solution is:
1. Concurrency limiter — cap simultaneous pipelines at 28 (safe headroom under 800K TPM)
2. Smart retry with exponential backoff for the rare 429
3. Result caching for popular city + theme combinations
4. iOS timeout increase to handle the rare slow run

---

## Architecture

```
iOS App (90s timeout)
  │
  ▼  POST /bolt-pipeline (existing)
Supabase Edge Function
  │
  ├─ Check cache → hit? Return stored result instantly
  │
  ├─ Concurrency check → at limit? Return 503 + retry-after header
  │
  ▼  Run pipeline (up to 28 simultaneous)
GPT-4o (800K TPM — ~32 pipelines/min)
  │
  ▼
Google Places API
  │
  ▼
Supabase DB → store result + update cache
  │
  ▼
iOS App receives result
```

---

## Step 1 — Supabase: Result Cache Table

Run in SQL Editor:

```sql
CREATE TABLE public.vibez_cache (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key   TEXT        NOT NULL UNIQUE, -- "{city}:{theme}" lowercased
  city        TEXT        NOT NULL,
  theme       TEXT        NOT NULL,
  result      JSONB       NOT NULL,
  hit_count   INTEGER     NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX idx_vibez_cache_key     ON public.vibez_cache(cache_key);
CREATE INDEX idx_vibez_cache_expires ON public.vibez_cache(expires_at);

-- Auto-delete expired cache entries
CREATE OR REPLACE FUNCTION delete_expired_vibez_cache()
RETURNS void LANGUAGE sql AS $$
  DELETE FROM public.vibez_cache WHERE expires_at < NOW();
$$;
```

---

## Step 2 — Concurrency Tracker Table

```sql
CREATE TABLE public.pipeline_concurrency (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- View for active pipeline count (running less than 60s ago)
CREATE OR REPLACE VIEW active_pipeline_count AS
  SELECT COUNT(*) as count
  FROM public.pipeline_concurrency
  WHERE started_at > NOW() - INTERVAL '60 seconds';
```

---

## Step 3 — Update `bolt-pipeline` Edge Function

Add these three blocks to the top of the existing `serve()` handler in `bolt-pipeline/index.ts`:

```typescript
const MAX_CONCURRENT_PIPELINES = 28; // Safe under 800K TPM
const CACHE_ENABLED = true;
const CACHE_TTL_DAYS = 7;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleCors(req);

  try {
    const { city, country, theme, userId } = await req.json();
    const supabase = createServiceClient();

    // ─── BLOCK 1: CACHE CHECK ────────────────────────────────────────────
    if (CACHE_ENABLED) {
      const cacheKey = `${city.toLowerCase()}:${theme.toLowerCase()}`;
      const { data: cached } = await supabase
        .from('vibez_cache')
        .select('result, expires_at')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cached) {
        console.log(`[Cache] HIT for ${cacheKey} — serving stored result`);
        // Increment hit count
        await supabase
          .from('vibez_cache')
          .update({ hit_count: supabase.rpc('increment', { row_id: cacheKey }) })
          .eq('cache_key', cacheKey);

        return jsonResponse({ success: true, data: cached.result, fromCache: true });
      }
      console.log(`[Cache] MISS for ${cacheKey} — running pipeline`);
    }

    // ─── BLOCK 2: CONCURRENCY CHECK ──────────────────────────────────────
    const { data: concurrencyData } = await supabase
      .from('pipeline_concurrency')
      .select('id', { count: 'exact', head: true })
      .gt('started_at', new Date(Date.now() - 60000).toISOString());

    const activeCount = concurrencyData ?? 0;

    if (activeCount >= MAX_CONCURRENT_PIPELINES) {
      console.log(`[Concurrency] At limit (${activeCount}/${MAX_CONCURRENT_PIPELINES}) — rejecting`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server is busy — please try again in 30 seconds',
          errorCode: 'CONCURRENCY_LIMIT',
          retryAfter: 30,
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '30',
          },
        }
      );
    }

    // ─── BLOCK 3: REGISTER PIPELINE SLOT ─────────────────────────────────
    const { data: slot } = await supabase
      .from('pipeline_concurrency')
      .insert({ started_at: new Date().toISOString() })
      .select()
      .single();

    try {
      // ... existing agent 1 → 2 → 3 → 3.5 → 4 pipeline logic unchanged ...

      // ─── BLOCK 4: CACHE THE RESULT ───────────────────────────────────
      if (CACHE_ENABLED && finalPlan) {
        const cacheKey = `${city.toLowerCase()}:${theme.toLowerCase()}`;
        await supabase
          .from('vibez_cache')
          .upsert({
            cache_key: cacheKey,
            city,
            theme,
            result: responseData, // the final data object you return
            expires_at: new Date(Date.now() + CACHE_TTL_DAYS * 86400000).toISOString(),
          }, { onConflict: 'cache_key' });
        console.log(`[Cache] Stored result for ${cacheKey}`);
      }

    } finally {
      // Always release the concurrency slot
      if (slot?.id) {
        await supabase.from('pipeline_concurrency').delete().eq('id', slot.id);
      }
    }

  } catch (error) {
    // ... existing error handling ...
  }
});
```

---

## Step 4 — Update `gpt-client.ts`: Smarter Retry

Replace the current retry logic with exponential backoff that respects OpenAI's `Retry-After` header:

```typescript
const MAX_RETRIES = 4;

for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
  try {
    const response = await fetch(OPENAI_API_URL, { ... });

    if (response.status === 429) {
      // Respect Retry-After header if present
      const retryAfter = response.headers.get('retry-after');
      const waitMs = retryAfter
        ? parseInt(retryAfter) * 1000
        : Math.min(1000 * Math.pow(2, attempt), 30000); // exponential: 1s, 2s, 4s, 8s, cap 30s

      console.warn(`[gpt-client] Rate limited (429). Waiting ${waitMs}ms before retry ${attempt + 1}/${MAX_RETRIES}`);
      await sleep(waitMs);
      continue;
    }

    if (!response.ok) {
      throw new Error(`GPT API error ${response.status}: ${await response.text()}`);
    }

    // ... rest of existing success handling ...

  } catch (error) {
    lastError = error as Error;
    if (attempt < MAX_RETRIES - 1) {
      await sleep(1000 * Math.pow(2, attempt));
    }
  }
}
```

---

## Step 5 — iOS: Increase Timeout + Handle 503

In `APIService.swift`, find where the URLSession is configured and increase the timeout:

```swift
// Increase from default 60s to 90s for pipeline requests
private lazy var session: URLSession = {
    let config = URLSessionConfiguration.default
    config.timeoutIntervalForRequest = 90
    config.timeoutIntervalForResource = 120
    return URLSession(configuration: config)
}()
```

Handle the new 503 concurrency response:

```swift
if httpResponse.statusCode == 503 {
    let retryAfter = httpResponse.value(forHTTPHeaderField: "Retry-After")
    let waitSeconds = Double(retryAfter ?? "30") ?? 30
    // Show user: "It's busy right now — retrying in 30s..."
    try await Task.sleep(nanoseconds: UInt64(waitSeconds * 1_000_000_000))
    return try await makePipelineRequest(...) // one auto-retry
}
```

---

## Step 6 — Deploy

```bash
cd /Users/davidnjagah/Documents/GitHub/litplanAI/backend/supabase

# Redeploy bolt-pipeline with cache + concurrency changes
SUPABASE_ACCESS_TOKEN=sbp_c33fe9a04cd0861cf217bca8aa80b1421e45beae \
npx supabase functions deploy bolt-pipeline --project-ref clktdigankjszupvrsqt

# Redeploy gpt-client (shared) — redeploying any function that uses it picks it up
SUPABASE_ACCESS_TOKEN=sbp_c33fe9a04cd0861cf217bca8aa80b1421e45beae \
npx supabase functions deploy bolt-pipeline --project-ref clktdigankjszupvrsqt
```

---

## What This Solves at Tier 3

| Problem | Fix |
|---|---|
| Burst of 50 simultaneous requests | Concurrency limiter caps at 28 — others get clean 503 + retry |
| Rare 429 from OpenAI | Exponential backoff respects Retry-After header |
| Same city+theme requested repeatedly | Cache serves result instantly, zero GPT cost |
| iOS drops connection after 60s | Timeout increased to 90s |
| No feedback on busy server | 503 response tells iOS exactly how long to wait |

---

## Throughput at Tier 3

| Scenario | Result |
|---|---|
| 28 concurrent users | All served simultaneously, no wait |
| 50 concurrent users | 28 served immediately, 22 get 503 → auto-retry in 30s |
| Popular city+theme (e.g. London Rooftop) | First user generates, all subsequent users get cached result in <100ms |
| Sustained 50 req/min | Well within 800K TPM — no rate limiting |

---

## Optional: Switch to `gpt-4.1-mini` for Cost Savings

Your account shows `gpt-4.1-mini` at **2,000,000 TPM** — more than double Tier 3 GPT-4o.
Switching Agents 1, 2, and 3.5 to `gpt-4.1-mini` (keeping Agent 4 on GPT-4o for narrative quality)
would reduce cost per generation by ~60% and effectively give you unlimited headroom.

In `gpt-client.ts`:
```typescript
const DEFAULT_MODEL = 'gpt-4.1-mini'; // was 'gpt-4o'
```

Or selectively per agent:
```typescript
// Agents 1, 2, 3.5 — discovery + validation (speed matters)
await gptRequest(messages, { model: 'gpt-4.1-mini' });

// Agent 4 — narrative writing (quality matters)
await gptRequest(messages, { model: 'gpt-4o' });
```
