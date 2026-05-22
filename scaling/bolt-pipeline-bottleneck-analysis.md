# Bolt Pipeline — Scaling & Bottleneck Analysis

## Per Request Cost

Each single pipeline run makes:
- **4× GPT-4o calls** — Agent 1 (discovery), Agent 2 (relevance check), Agent 3.5 (schedule optimizer), Agent 4 (narrative)
- **2× Google Places calls per venue** — Text Search + Place Details, run sequentially with a 150ms delay between each, across ~5-8 venues = 10-16 Google Places calls per request
- **Multiple sequential DB writes** — `GroupFlow` insert + `Plan` insert × N venues + `GroupFlowStep` insert × N venues

**Estimated total time per request: 15–35 seconds**

---

## At 50 Concurrent Users

### 🔴 Critical — OpenAI Token Rate Limits

This is the most likely cause of bouncing requests. Each pipeline uses roughly **5,000–8,000 tokens per GPT-4o call × 4 calls = ~20,000–32,000 tokens per request**. At 50 concurrent users that's **1M–1.6M tokens/minute hitting OpenAI simultaneously**. OpenAI's lower tiers cap at 30,000–450,000 TPM. When that limit is hit, OpenAI returns a `429 Too Many Requests`.

The `gpt-client` retries 3 times with 1s/2s/3s delays — but under sustained load those retries pile on top of each other, making the pipeline time balloon from 20s to 60s+, at which point either Supabase kills the function or the iOS client times out.

**Action: Check OpenAI account tier. Tier 3+ (800K TPM) is the minimum for comfortable handling of 25-40 concurrent users.**

---

### 🟠 High — Supabase Edge Function Concurrency

The bolt-pipeline is a long-running function — 15–35 seconds per invocation. Supabase runs each call as a Deno worker instance. With 50 concurrent users you have 50 long-lived workers open simultaneously. Supabase's infrastructure has concurrency limits per project, and sustained long-running functions can cause new requests to queue or get dropped entirely.

**Action: A Redis/queue layer would control how many pipelines run simultaneously, preventing Supabase from being overwhelmed.**

---

### 🟡 Medium — Google Places API

The pipeline runs Google Places calls sequentially (one venue at a time with a 150ms delay between each), which provides some natural throttling. However, 50 users × 10-16 calls each is still 500–800 calls/minute. Google Places Text Search has a default quota of 6,000 QPM — within limits currently, but not unlimited headroom. A traffic spike would push this closer to the edge.

**Action: Monitor Google Cloud Console quota usage. Caching verified venue results by `place_id` would significantly reduce repeat calls.**

---

### 🟢 Low — Supabase DB Writes

Sequential inserts at the end of each pipeline are fine at current scale. At 50 users with 3-5 inserts each it's manageable. Under sustained growth, connection pooling via Supabase's PgBouncer should be verified to be enabled.

---

### 🟢 Low — iOS URLSession Timeout

`URLSession` default timeout is 60 seconds. If the pipeline is delayed by OpenAI retries and takes longer than that, the iOS side drops the connection even if the server eventually succeeds — the user sees a failure even when the plan actually generated.

**Action: Bump `URLSession` timeout to 90–120 seconds in `APIService.swift`.**

---

## Root Cause Summary

The bouncing is almost certainly **OpenAI rate limiting cascading into Supabase function timeouts**. The pipeline has no concurrency control — every user triggers the full 4-agent GPT-4o chain simultaneously.

## Fix Priority Order

1. **Check OpenAI tier and upgrade if needed** — Tier 3+ gives 800K TPM, handles ~25-40 concurrent users more comfortably
2. **Add a Redis/queue layer** — instead of 50 simultaneous GPT-4o hammers, queue them and process at a controlled rate; return a job ID to the app immediately and poll for the result
3. **Increase iOS URLSession timeout** — bump to 90–120s in `APIService.swift` to survive slow pipeline runs
4. **Cache popular city+theme combos** — if 10 users all want "London Rooftop", generate it once and serve the stored result from the DB to subsequent requesters

---

## Architecture Path for Queue System

```
iOS App
  │
  ▼
Supabase Edge Function (bolt-pipeline)
  │  ← receives request, pushes job to Redis queue, returns jobId immediately
  ▼
Redis Queue (e.g. Upstash)
  │
  ▼
Worker Process (Railway)
  │  ← pulls job, runs 4-agent GPT-4o pipeline at controlled concurrency
  ▼
Supabase DB  ←  stores result keyed by jobId
  │
  ▼
iOS App polls /job/:jobId until status = complete
```

This decouples request intake from processing, prevents OpenAI from being hammered, and gives the user immediate feedback ("Your Vibez is being prepared...") rather than a frozen loading state.
