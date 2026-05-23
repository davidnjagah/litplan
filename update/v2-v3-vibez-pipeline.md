# V2 → V3 Vibez Pipeline — App Store Release Readiness

**Date:** 2026-05-23
**Status:** ✅ All systems green. Ready to submit to App Store.

This document captures the readiness state of the Vibez pipeline async migration (Supabase v2 → v3 + Railway worker) at the point of App Store submission, plus what's needed (and not needed) after the update propagates to users.

---

## What this release ships

**iOS side (in the new build going to App Store):**
- `Config.useAsyncBoltPipeline = true` → app routes through the new async pipeline
- New `bolt-pipeline-v3` trigger endpoint, polling via `bolt-pipeline-status`
- `SnakePathLoadingView` — serpentine cubic-bezier animation during generation
- Map embed updates: Google Maps multi-stop button + Apple Maps per-pin tap + OSRM road-following polyline
- Saves view sorted newest-first
- Cloudy blue THIN_COVERAGE popup
- iOS URLSession timeout bumped from 30s → 180s (covers the rare slow run, never hit in normal use because polling is short bursts)

**Backend (already live, waiting for iOS traffic):**
- All Supabase Edge Functions deployed (`bolt-pipeline-v2`, `bolt-pipeline-v3`, `bolt-pipeline-status`)
- Railway worker `2.1.2-cache-key-normalize` healthy
- `PipelineJob` table extended + `vibez_cache` table live
- 7 analytics views in place
- Daily cache prune cron active (`0 3 * * *` UTC)

---

## Readiness check results

| Component | Status |
|---|---|
| Railway worker (`/api/pipeline/bolt-async`) | ✅ `2.1.2-cache-key-normalize`, healthy |
| Supabase `bolt-pipeline-v3` (new trigger) | ✅ ACTIVE |
| Supabase `bolt-pipeline-status` (polling) | ✅ ACTIVE |
| Supabase `bolt-pipeline-v2` (legacy rollback) | ✅ ACTIVE (kept untouched) |
| `PipelineJob` table + columns | ✅ Live |
| `vibez_cache` table | ✅ Live, already serving hits |
| All 7 analytics views | ✅ Live (`pipeline_health_snapshot`, etc.) |
| Daily cache prune cron | ✅ Active, `0 3 * * *` UTC |
| End-to-end smoke (Berlin) | ✅ `cached: true` returned instantly |

---

## After the update propagates — anything to push to Supabase?

**No. Nothing required.** The architecture is intentionally designed so the backend is fully ready *before* the iOS update ships:

- **Old app builds (pre-update)** keep calling `bolt-pipeline-v2`, which is still live and unchanged
- **New app builds (post-update)** call `bolt-pipeline-v3` → Railway → polling
- Both paths run side by side with zero coordinated cutover
- No big-bang switch, no race conditions, no downtime

---

## Optional cleanup later (not blocking, do whenever)

| Action | When to do it | What you get |
|---|---|---|
| Delete `bolt-pipeline-v2` and `bolt-pipeline` (older legacy) | After ~30 days when adoption is >95% (App Store Connect analytics) | Slight reduction in deployed function count, cleaner dashboard |
| Add a remote config flag for `useAsyncBoltPipeline` | If you want fast rollback without a new build | One-tap iOS rollback if anything goes wrong post-release |
| Migrate OSRM from public demo to self-hosted/Mapbox | Once you see rate-limit errors in Railway logs (won't happen at current scale) | Higher request ceiling, SLA guarantees |
| Pre-cache top 50 city/theme combos | If user growth means lots of cold-cache requests | Faster perceived speed for new users on popular cities |

---

## Post-release monitoring (using the live analytics views)

After the update propagates, occasionally check from Supabase Dashboard → SQL Editor:

```sql
-- Daily pulse — one row summarising the system
SELECT * FROM pipeline_health_snapshot;

-- Which errors are dominating
SELECT * FROM pipeline_failure_breakdown_7d;

-- Cache effectiveness — top cached combos
SELECT * FROM pipeline_cache_stats ORDER BY hit_count DESC LIMIT 10;
```

The first is your daily pulse. If `failed_last_24h` spikes or `avg_duration_seconds_last_24h` jumps above ~90s, investigate. The second tells you *what* is failing. The third confirms caching is doing real work.

Full reference: [`backend/supabase/queries/pipeline-analytics.sql`](../backend/supabase/queries/pipeline-analytics.sql) and [`backend/supabase/queries/README.md`](../backend/supabase/queries/README.md).

---

## Rollback plan (if something goes wrong post-release)

The fastest rollback is **flip `Config.useAsyncBoltPipeline = false` in iOS and ship another build**. Old `bolt-pipeline-v2` is still live and untouched — flipping the flag points the app back at the proven synchronous path.

Downsides:
- App Store review delay (typically 24–72 hours) means the rollback isn't instant
- Only fixes users who update to the rollback build

For instant rollback, the future migration is moving `useAsyncBoltPipeline` to a Supabase row that the app reads at startup. Then a one-line SQL update rolls everyone back without a new build. Not in scope for this release.

---

## Error taxonomy (what shows up in analytics)

If failures occur, here's what each `errorCode` means and where it comes from:

| errorCode | Source | Meaning |
|---|---|---|
| `THIN_COVERAGE` | Railway pipeline | <1 verified venue after Google Places + dedup |
| `NO_VENUES_DISCOVERED` | Railway (Agent 1) | Agent 1 returned 0 venues |
| `NO_RELEVANT_VENUES` | Railway (Agent 2) | Agent 2 rejected all venues |
| `PIPELINE_ERROR` | Railway (caught exception) | Something crashed inside the worker |
| `MISSING_FIELDS` | Railway / trigger | Bad input shape |
| `TRIGGER_RAILWAY_HTTP_ERROR` | Supabase v3 trigger | Railway responded 4xx/5xx |
| `TRIGGER_RAILWAY_UNREACHABLE` | Supabase v3 trigger | Couldn't reach Railway at all |
| `TRIGGER_RAILWAY_TIMEOUT` | Supabase v3 trigger | Railway didn't respond within 15s |
| `TRIGGER_CRASH` | Supabase v3 trigger | Trigger itself threw an unhandled error |
| `WATCHDOG_TIMEOUT` | Supabase status endpoint | Job sat in `processing` for >240s |
| `JOB_CREATE_FAILED` | Supabase v3 trigger | PipelineJob insert failed |

---

## Cross-references

- [`scaling/railway-async-architecture.md`](../scaling/railway-async-architecture.md) — full architecture
- [`scaling/post-deploy-bottleneck-analysis.md`](../scaling/post-deploy-bottleneck-analysis.md) — timing budget + bottlenecks
- [`scaling/queue-implementation-plan.md`](../scaling/queue-implementation-plan.md) — concurrency/cache plan
- [`scaling/pipeline-model-analysis.md`](../scaling/pipeline-model-analysis.md) — model split rationale
- [`backend/supabase/queries/pipeline-analytics.sql`](../backend/supabase/queries/pipeline-analytics.sql) — monitoring queries
- [`backend/supabase/supabase/migrations/20260522_async_bolt_pipeline.sql`](../backend/supabase/supabase/migrations/20260522_async_bolt_pipeline.sql) — schema migration
- [`backend/supabase/supabase/migrations/20260522_pipeline_analytics_views.sql`](../backend/supabase/supabase/migrations/20260522_pipeline_analytics_views.sql) — analytics views migration

---

## Key git commits in this release

```
1883e37  fix(map): restore automobile-first route fallback order
ec1848d  fix(map): switch deep links from walking to driving directions
6b03497  fix(map): use OSRM for road-following routes globally
7b14255  fix(map): make Google Maps URL + pin taps actually fire
4b20e6c  fix(map): remove MapUserLocationButton from top-right corner
f5cedce  fix(map): make individual pin taps reliable in SwiftUI Map
94e9565  feat(map): Google Maps multi-stop route + Apple Maps single-pin tap
0f788d3  fix(map): remove duplicate directions link + start route at first venue
91e04f5  feat(saves): show saved items newest first
12ccb64  feat(ios): async bolt pipeline flow + snake-path loading + Maps multi-stop
6cc1071  perf(railway): parallelize Google Places verification in bolt pipeline
d2002f5  feat(railway): async bolt pipeline endpoint with 60-concurrent semaphore
b19573e  fix(cache): normalize city in vibez_cache key, strip country suffix
```
