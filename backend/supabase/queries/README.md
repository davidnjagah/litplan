# Supabase Queries

Bookmarkable SQL for monitoring and ad-hoc analysis. Paste into Supabase Dashboard → SQL Editor.

## Files

| File | What's in it |
|---|---|
| [`pipeline-analytics.sql`](./pipeline-analytics.sql) | Pipeline health, failures, queue events, cache stats, slowest runs, per-user activity, duration histogram, cache hit rate |

## How to use

1. Open https://supabase.com/dashboard/project/clktdigankjszupvrsqt/sql/new
2. Open the relevant `.sql` file from this folder
3. Copy any single query (each is delimited by `-- ─── N. TITLE ───` headers)
4. Paste, run
5. **Pin it as a favourite** in the SQL Editor's left rail if you'll use it often

## The "is everything OK?" daily check

Run section #1 of `pipeline-analytics.sql`:

```sql
SELECT * FROM pipeline_health_snapshot;
```

You should see:
- `jobs_last_24h` — total pipeline runs
- `completed_last_24h` — successes
- `failed_last_24h` — failures (low = healthy)
- `currently_in_flight` — non-zero only if a job is processing right this second
- `currently_queued` — non-zero only if concurrency limiter is at cap (rare)
- `avg_duration_seconds_last_24h` — should be 20–60s; >90s suggests OpenAI tail
- `total_cache_hits_active` — counter of cache hits since each cache row was created

## When something looks off

1. Run section #2 (`pipeline_failures_recent`) to see the latest failures
2. Run section #3 (`pipeline_failure_breakdown_7d`) to see if there's a dominant cause
3. Run section #5 (`pipeline_active_jobs`) to check for stuck jobs (any with `age_seconds > 90`)
4. Run section #4 (`pipeline_queue_events`) to confirm whether the system was overloaded

## Architecture references

- [`scaling/railway-async-architecture.md`](../../../scaling/railway-async-architecture.md) — full pipeline architecture
- [`scaling/post-deploy-bottleneck-analysis.md`](../../../scaling/post-deploy-bottleneck-analysis.md) — timing budget + bottleneck ranking
- [`scaling/queue-implementation-plan.md`](../../../scaling/queue-implementation-plan.md) — original concurrency/cache plan

## View definitions

The 7 views queried by `pipeline-analytics.sql` are defined in:

[`backend/supabase/supabase/migrations/20260522_pipeline_analytics_views.sql`](../supabase/migrations/20260522_pipeline_analytics_views.sql)

Re-running that migration is idempotent (`CREATE OR REPLACE VIEW`) so it's safe to apply if you ever lose them.
