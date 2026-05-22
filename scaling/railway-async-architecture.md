# Bolt Pipeline — Railway Async Architecture & 50-Concurrent-User Analysis

**Date:** 2026-05-21
**Context:** Moving the user-facing bolt-pipeline from synchronous Supabase Edge execution to async execution on Railway, with Supabase as the gateway and polling endpoint.

---

## The architecture

```
iOS app
   │ 1. POST /functions/v1/bolt-pipeline-v2
   ▼
Supabase Edge (trigger only — <500ms response)
   │   - Cache check on (city, theme) — if hit, return instantly
   │   - Insert PipelineJob row (status: pending OR queued)
   │   - Fire-and-forget POST to Railway (15s AbortController timeout)
   │   - Return { jobId, status }
   │
   │ 2. POST /api/pipeline/bolt-async  (no Supabase timeout in play)
   ▼
Railway (runs entire pipeline — Agents 1–4 + Google Places + dedup + scoring)
   │   - Semaphore caps concurrent jobs at 28 (safe under gpt-5.1's 1M TPM)
   │   - Overflow → row stays `queued` until slot opens
   │   - Updates PipelineJob row directly via service key
   │   - status: 'processing' → 'completed' (result JSON) OR 'failed'
   │   - On completion, also writes to vibez_cache
   │
iOS app polls every 2s
   │ 3. GET /functions/v1/bolt-pipeline-status?jobId=X
   ▼
Supabase Edge (reads PipelineJob row, returns status + result)
```

---

## What the existing scaling docs identified at 50 concurrent users

From `bolt-pipeline-bottleneck-analysis.md` + `queue-implementation-plan.md`:

| Bottleneck | Severity | Issue |
|---|---|---|
| OpenAI TPM rate limits | 🟡 Medium (was 🔴) | 50 × ~25K tokens = 1.25M TPM peak; under new 2M gpt-5.1 / 4M gpt-4.1-mini tier 3 limits, no longer the binding constraint |
| Supabase Edge concurrency | 🟠 High | 50 long-lived 30s+ workers exceeds project limits, requests queue or drop |
| Google Places quota | 🟡 Medium | 500–800 calls/min, within 6,000 QPM limit but no headroom |
| iOS URLSession timeout | 🟢 Low | 60s default kills slow-but-successful runs |

---

## What the Railway-async structure fixes for free

| Old bottleneck | Why it's gone |
|---|---|
| Supabase Edge concurrency | Trigger exits in <500ms — no long-lived workers |
| iOS URLSession timeout | Replaced by polling, no single 90s+ wait |
| Supabase 150s wall clock | Out of the request path entirely |
| Per-job timeout exposure | Pipeline runs on Railway (no per-request limit) |

---

## What's still at risk at 50 concurrent users

### 🟡 OpenAI rate limits — relaxed by tier 3 ceiling bump

Pipeline uses `gpt-5.1` for Agents 1+4. OpenAI raised the tier 3 limit to **2,000,000 TPM** (was 1M) and `gpt-4.1-mini` to **4,000,000 TPM**. At ~25,000 tokens per pipeline (Agents 1+4 combined), throughput now sits at **~80 pipelines/min** — comfortably above 50 concurrent users.

At 50 simultaneous users → ~1.25M TPM used / 2M limit = **62% utilisation, comfortable headroom**. Railway doesn't change this, but the new ceiling means rate limiting is no longer the binding constraint.

### 🔴 Railway single-instance concurrency

Default Railway service is one instance. Node.js handles thousands of HTTP connections, but **50 simultaneous gpt-5.1 calls + 250 Google Places calls + 50 DB connection pools on one Node process** = memory pressure + connection pool exhaustion.

### 🟡 No caching = repeated work

If 10 users all generate "London Rooftop" in the same minute = 10 full pipeline runs producing near-identical output. Pure waste.

---

## What we need to add on top of Railway-async

### 1. Concurrency limiter inside Railway (now a spike protector, not a load manager)

In-memory semaphore — Express service runs as a single instance.

```typescript
const MAX_CONCURRENT = 60; // safe headroom under gpt-5.1's 2M TPM ceiling
let activeJobs = 0;

async function tryAcquireSlot(): Promise<boolean> {
  if (activeJobs >= MAX_CONCURRENT) return false;
  activeJobs++;
  return true;
}
function releaseSlot() { activeJobs--; }
```

If `activeJobs >= 60`, mark PipelineJob row as `'queued'` instead of `'processing'`. A short polling loop on Railway re-checks queued jobs every 5s as slots free up.

**Why 60:** With 2M TPM and ~25K tokens/pipeline, the OpenAI ceiling is ~80 pipelines/min. Holding back to 60 gives 25% headroom for token spikes (long Agent 4 narratives) and the gpt-4.1-mini retry tail. At 50 concurrent users — the original stress scenario — the semaphore never fires.

### 2. Result cache table (`vibez_cache`)

Same shape as `queue-implementation-plan.md` Step 1:

```sql
CREATE TABLE public.vibez_cache (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key  TEXT NOT NULL UNIQUE,
  city       TEXT NOT NULL,
  theme      TEXT NOT NULL,
  result     JSONB NOT NULL,
  hit_count  INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);
```

Cache key = `{city.toLowerCase()}:{theme.toLowerCase()}`, TTL 7 days. Pre-check on Supabase trigger BEFORE inserting PipelineJob. If hit → return cached result via the polling endpoint immediately.

### 3. 429 retry with `Retry-After` header

Already half-implemented in `gpt-client.ts`. Needs exponential backoff + `Retry-After` header parsing:

```typescript
if (response.status === 429) {
  const retryAfter = response.headers.get('retry-after');
  const waitMs = retryAfter
    ? parseInt(retryAfter) * 1000
    : Math.min(1000 * Math.pow(2, attempt), 30000);
  await sleep(waitMs);
  continue;
}
```

### 4. `'queued'` status in PipelineJob

Extend status enum: `pending | queued | processing | completed | failed | abandoned`. iOS shows the snake animation regardless, with a subtle "you're in line" indicator when `queued`.

---

## What 50 concurrent users looks like with everything in place (post tier 3 bump)

| User cohort | What they get | When |
|---|---|---|
| 1–60 | Processing immediately | <60s typical |
| 61+ (spike scenario only) | Status: `queued`, animation continues | ~30s queue + ~60s processing |
| Cache hit (popular city+theme) | Result instantly from cache | <500ms |
| 429 from OpenAI tail | Auto-retried with backoff | 1–4s extra inside pipeline |

**At 50 concurrent users:** everyone processes immediately, ~62% TPM utilisation, no queuing.
**Worst case (>60 simultaneous):** queued users wait ~90s total (30s queue + 60s pipeline).
**Current architecture worst case:** user 50 gets a hard failure at Supabase's 150s wall.

---

## Timeout risks in the new structure

### 🟠 Supabase trigger → Railway fetch hangs
Cold start, Railway down, DNS hiccup. If fetch hangs >150s, Supabase worker dies before request reaches Railway → job stuck at `pending` forever.
**Mitigation:** 15s `AbortController` timeout on the fetch. On abort, mark PipelineJob as `failed` immediately.

### 🟠 Railway mid-pipeline crash
Process crashes from OOM, uncaught exception, or OpenAI hangs.
**Mitigation:** lazy watchdog in the status endpoint — auto-flip `processing` rows older than 240s to `failed` on read.

### 🟢 iOS polling timeout (expected)
Poll every 2s, max 180s. Past that, iOS shows cloudy blue "took too long" toast. User can retry.
**Mitigation:** on cancel/timeout, mark row as `abandoned`. Railway checks before final write; skips DB inserts if abandoned.

### 🟢 OpenAI tail latency
GPT-5.1 can rarely take 60s+.
**Mitigation:** explicit 90s timeout on each OpenAI call.

---

## Implementation order

1. **Migration:** add `theme`, `userId`, `flowId` to PipelineJob + create `vibez_cache` table
2. **Railway endpoint `/api/pipeline/bolt-async`** — semaphore-gated, full pipeline logic, writes to PipelineJob + vibez_cache
3. **Supabase trigger rewrite** — cache check → PipelineJob insert → fire Railway → return jobId
4. **Supabase status endpoint** — reads PipelineJob, lazy watchdog for stale rows
5. **Update `gpt-client.ts`** — 429 backoff with `Retry-After` parsing
6. **iOS APIService refactor** — `generateBoltPipeline` returns jobId, `pollBoltPipelineJob` polls until terminal
7. **iOS `SnakePathLoadingView`** — serpentine path + 3 bouncing pins + reverse loop
8. **iOS BoltView integration** — wire animation + polling + cloudy-blue popup on failure

---

## What changes vs. doesn't

✅ **Changes:** bolt-pipeline-v2 becomes async, new status endpoint, new SwiftUI animation, polling logic, parallelized Google Places loop, vibez_cache, Railway semaphore.

🚫 **Doesn't change:** error toast styling (cloudy blue popup stays), THIN_COVERAGE logic, venueCount=5, the agent prompts, GroupFlow shape, DB schema for plans.

---

## Confirmed decisions (2026-05-22)

1. Polling interval: **2s** on the iOS side, max wait 180s ✅
2. Concurrency cap on Railway: **60** (safe under gpt-5.1's new 2M TPM tier 3 ceiling) ✅
3. Cache TTL: **7 days** ✅
4. Add `'queued'` status to PipelineJob with iOS "in line" indicator ✅
5. Push notification when app is backgrounded — deferred to later task

## OpenAI tier 3 rate limits (current, as of 2026-05-22)

| Model | TPM | RPM | Used for |
|---|---|---|---|
| gpt-5.1 | 2,000,000 | 5,000 | Agents 1 + 4 (discovery, narrative) |
| gpt-4.1-mini | 4,000,000 | 5,000 | Agent 2 (relevance validation) |
| gpt-5-mini | 4,000,000 | 5,000 | (reserved) |
| gpt-4.1 | 800,000 | 5,000 | (not used — gpt-5.1 cheaper) |

---

## References

- `scaling/bolt-pipeline-bottleneck-analysis.md` — original 50-user bottleneck analysis
- `scaling/queue-implementation-plan.md` — concurrency limiter + cache plan (originally for Supabase)
- `scaling/pipeline-model-analysis.md` — gpt-5.1 / gpt-4.1-mini split rationale
- `backend/supabase/supabase/functions/bolt-pipeline-v2/index.ts` — current synchronous pipeline (will be replaced by Supabase trigger + Railway worker)
- `backend/supabase/supabase/functions/group-7agent-pipeline/index.ts` — existing async pattern with `EdgeRuntime.waitUntil` + PipelineJob (reference implementation)
- `backend/supabase/supabase/migrations/20260206_add_pipeline_job_table.sql` — existing PipelineJob schema
- `backend/railway/src/index.ts` — Railway service (will add new endpoint here)
