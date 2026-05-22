# Bolt Pipeline — Bottleneck Analysis After Railway Async Deploy

**Date:** 2026-05-22
**Context:** Backend migration to the async Railway architecture is shipped and verified end-to-end. iOS app still points at the legacy `bolt-pipeline-v2` until the iOS APIService + animation lands. This document captures where time goes in the new path and what's worth optimising next.

See: [`railway-async-architecture.md`](./railway-async-architecture.md) for the full architecture.

---

## Live request path

```
iOS app
   │  1. POST /functions/v1/bolt-pipeline-v3                       (returns <500ms)
   ▼
Supabase Edge bolt-pipeline-v3 (trigger)
   │  • Cache lookup on (city, theme) in vibez_cache
   │  • If hit → return cached result instantly
   │  • If miss → insert PipelineJob row (status: pending)
   │  • fetch() Railway with 15s AbortController + EdgeRuntime.waitUntil
   │  • Return {jobId, status: 'pending'} to iOS
   │
   │  2. (background) POST /api/pipeline/bolt-async
   ▼
Railway /api/pipeline/bolt-async    (no Supabase timeout in play)
   │  • Acquire semaphore slot (cap 60)
   │  • Run Agents 1→4 + Google Places + dedup + scoring + DB writes
   │  • Update PipelineJob → status: 'completed' + flowId + result JSON
   │  • Upsert vibez_cache (7d TTL)
   │
iOS app (in parallel)
   │  3. GET /functions/v1/bolt-pipeline-status?jobId=X            (every 2s)
   ▼
Supabase Edge bolt-pipeline-status
   │  • SELECT PipelineJob row
   │  • Lazy watchdog: stale processing rows >240s → 'failed'
   │  • Return {status, result, error, flowId}
```

---

## End-to-end timing budget

| Step | Where it runs | Typical | Worst case | Hard ceiling |
|---|---|---|---|---|
| 1. v3 trigger | Supabase Edge | 200–500ms | 2–3s (cold start) | 150s wall (never hit) |
| 2. Pipeline worker | Railway | 35–60s | 90s | 240s watchdog → fail |
| 3. Status poll (per call) | Supabase Edge | 50–200ms | 1–2s (cold start) | 150s wall (never hit) |
| 4. Polling resolution lag | iOS client | 0–2s | 2s | 2s (poll interval) |
| **TOTAL (cache miss)** | — | **~40–65s** | ~95s | 240s |
| **TOTAL (cache hit)** | — | **<1s** | 2s | n/a |

---

## What's actually slow inside Step 2 (the worker)

| Sub-step | Typical | Worst | Why slow |
|---|---|---|---|
| Semaphore + status update | <100ms | 500ms | Single PG write |
| **Agent 1 (gpt-5.1) — discovery** | **10–20s** | 60s | LLM reasoning, p99 tail on OpenAI |
| Prefilter (apartments, hotels) | <1ms | <1ms | Pure regex, in-memory |
| **Agent 2 (gpt-4.1-mini) — relevance** | **3–5s** | 10s | Fast model, classification |
| **Google Places verification** | **5–10s** | 15s | 5 venues × 2 calls, sequential with 150ms gap — biggest easy win available |
| Dedup, rank, cap, schedule | <10ms | <10ms | Pure functions |
| **Agent 4 (gpt-5.1) — narrative** | **15–25s** | 60s | Creative writing, longest output |
| DB writes (GroupFlow + 3 Plan + 3 GroupFlowStep) | 500–800ms | 2s | 7 sequential REST calls — could batch |
| vibez_cache upsert | 100ms | 500ms | Single REST call |
| Semaphore release | <1ms | <1ms | In-memory |

---

## Bottleneck ranking (post-deploy)

| Rank | Bottleneck | Impact | Cost to fix |
|---|---|---|---|
| 🔴 1 | Agent 4 narrative (15–25s) | Single biggest contributor | High (quality-bound, hard to compress) |
| 🔴 2 | Agent 1 discovery (10–20s) | Second biggest | High (quality-bound) |
| 🟠 3 | Google Places sequential loop (5–10s) | 100% reducible to ~1.5s | **Low — switch `for…of` to `Promise.all`. ~1 hour work.** |
| 🟡 4 | Agent 2 relevance (3–5s) | Minor | High (already fast model) |
| 🟢 5 | DB write batching (700ms) | Tiny | Low (batch into one PG transaction) |
| 🟢 6 | iOS poll 2s lag | UX-only | Low (drop interval to 1s, costs 2× DB reads) |

---

## What's NOT a bottleneck anymore

- **Supabase 150s wall** — no longer in the request path. The worker runs on Railway with no platform timeout.
- **iOS URLSession timeout** — gone. iOS polls in short bursts (<2s each), never holds a long connection.
- **OpenAI 429s** — handled by exponential backoff with `Retry-After` parsing. Adds 1–4s in the rare tail case, doesn't fail.
- **Concurrency at 50 users** — semaphore caps at 60, gpt-5.1's 2M TPM tier 3 ceiling covers ~80 pipelines/min. Everyone processes immediately.

---

## Remaining failure modes

| Failure mode | Detection | User sees |
|---|---|---|
| OpenAI down >2 mins | Each agent call times out at 90s, 4 retries with backoff | Cloudy blue toast with failure message |
| Railway crashes mid-pipeline | Watchdog flips row to `failed` after 240s | Cloudy blue toast (timeout) |
| Supabase trigger can't reach Railway (DNS, 503) | 15s AbortController fires, trigger marks job failed | Cloudy blue toast immediately |
| iOS loses network during polling | URLSession error after ~30s | Generic retry toast |
| User backgrounds app for >180s | iOS gives up polling, marks abandoned | Generic retry toast on next open (push notification deferred to later task) |

---

## Recommended next quick win

**Parallelize Google Places**, the only remaining easy win.

Current code in `backend/railway/src/pipelines/bolt-async/pipeline.ts` runs Google Places verification in a `for…of` loop with a 150ms delay between venues:

```typescript
for (const activity of relevantActivities) {
  const googleResult = await searchVenue(activity.venueName, city, country);
  // …validation logic…
  await new Promise(resolve => setTimeout(resolve, 150));
}
```

Switching to `Promise.all`:

```typescript
const results = await Promise.all(
  relevantActivities.map(activity =>
    searchVenue(activity.venueName, city, country)
  )
);
// …then process results in order…
```

**Impact:** 5–10s → ~1.5s. ~1 hour of work. No regression risk if the validation logic is moved into a single mapping pass.

---

## Verified test results (2026-05-22)

End-to-end test of new async path with Kampala/Rooftop:

| Step | Time |
|---|---|
| iOS → v3 trigger response | 2s (returns jobId) |
| First status poll | 3s (status: processing) |
| Pipeline completion | 21s total wall clock |
| Final status: `completed` | flowId returned, real plan stored |

Compares to the legacy sync path which took ~42s holding the iOS connection open the whole time, with a hard 30s URLSession timeout.

---

## Cross-references

- [`railway-async-architecture.md`](./railway-async-architecture.md) — full architecture
- [`bolt-pipeline-bottleneck-analysis.md`](./bolt-pipeline-bottleneck-analysis.md) — original pre-migration analysis
- [`queue-implementation-plan.md`](./queue-implementation-plan.md) — concurrency/cache plan (now partially realised)
- [`pipeline-model-analysis.md`](./pipeline-model-analysis.md) — gpt-5.1 / gpt-4.1-mini split rationale
