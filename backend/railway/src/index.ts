/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LitplanAI Pipeline Orchestrator Service - PRIMARY PIPELINE LOCATION
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * This Railway-hosted service is the OFFICIAL and PRIMARY location for all
 * AI pipeline orchestration. It replaced the Supabase Edge Functions to avoid
 * the 60-second timeout limitation.
 *
 * IMPORTANT: All AI pipeline operations should go through this service.
 * The Supabase Edge Functions (test-group-pipeline, test-weekly-pipeline, etc.)
 * are DEPRECATED and kept for reference only.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * PIPELINES
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Individual Plans:
 *   - Uses Claude via search-agent (Supabase Edge Function)
 *   - Generates venues and events for a city
 *
 * Group Plans:
 *   - Uses GPT 7-agent pipeline (group-7agent-pipeline Supabase Edge Function)
 *   - Generates 9 default plan types: couples, friend_groups, girls_trips,
 *     girls_night_out, boys_night_out, luxury, family, free_experiences, romantic
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ENDPOINTS
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * POST /api/pipeline/individual - Generate individual plans (Claude)
 *   Body: { cityId, cityName, country, weekStartDate?, weekEndDate?, yearWeek? }
 *
 * POST /api/pipeline/group - Generate group plans (GPT 7-agent)
 *   Body: { cityId?, cityName, country, storeResults? }
 *
 * POST /api/pipeline/full - Run complete pipeline (individual + group)
 *   Body: { cityId, cityName, country, storeResults? }
 *
 * POST /api/pipeline/batch - Run for multiple cities
 *   Body: { cities: [{ cityId, cityName, country }] }
 *
 * POST /api/pipeline/test-relaxed - Test relaxed validation (won't overwrite production)
 *   Body: { cityName, storeResults? }
 *
 * GET /health - Health check
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * SUPPORTED CITIES (with full configuration)
 * ──────────────────────────────────────────────────────────────────────────────
 * Ibiza, Paris, Nairobi, Dar es Salaam, Cape Town, Lagos, New York, Los Angeles,
 * Miami, London, Madrid, Barcelona, Berlin, Tokyo, Amsterdam
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://clktdigankjszupvrsqt.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

app.use(cors());
app.use(express.json());

// Types
interface CityInput {
  cityId: string;
  cityName: string;
  country: string;
}

interface PipelineResult {
  success: boolean;
  cityId: string;
  cityName: string;
  phase: string;
  data?: any;
  error?: string;
  durationMs: number;
}

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'litplan-pipeline-service',
    version: '2.1.0-async',
    pipelines: {
      individual: 'Claude (search-agent)',
      group: 'GPT 7-agent (group-7agent-pipeline)',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * Generate individual plans for a city using Claude (search-agent)
 */
app.post('/api/pipeline/individual', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { cityId, cityName, country, weekStartDate, weekEndDate, yearWeek, storeResults = true } = req.body;

    if (!cityId || !cityName || !country) {
      return res.status(400).json({
        success: false,
        error: 'cityId, cityName, and country are required',
      });
    }

    console.log(`[individual] Starting individual plans for ${cityName}, ${country} (Claude)`);

    // Calculate week dates if not provided
    const now = new Date();
    const weekStart = weekStartDate || getWeekStart(now);
    const weekEnd = weekEndDate || getWeekEnd(now);
    const currentYearWeek = yearWeek || getYearWeek(now);

    // Call Claude-powered search-agent (now handles storage internally)
    const searchResult = await callSupabaseFunction('search-agent', {
      cityId,
      cityName,
      country,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      yearWeek: currentYearWeek,
      storeResults, // Let search-agent handle storage
    });

    if (!searchResult.success) {
      throw new Error(`Search failed: ${searchResult.error}`);
    }

    const venuesFound = searchResult.data?.totalVenues || 0;
    const eventsFound = searchResult.data?.totalEvents || 0;
    const storedCount = searchResult.data?.stored || 0;

    console.log(`[individual] Found ${venuesFound} venues, ${eventsFound} events, stored ${storedCount}`);

    const durationMs = Date.now() - startTime;

    const result: PipelineResult = {
      success: true,
      cityId,
      cityName,
      phase: 'individual',
      data: {
        aiModel: 'Claude',
        venuesFound,
        eventsFound,
        venuesStored: storedCount > 0 ? venuesFound : 0,
        eventsStored: storedCount > 0 ? eventsFound : 0,
        totalStored: storedCount,
        yearWeek: currentYearWeek,
      },
      durationMs,
    };

    console.log(`[individual] Complete for ${cityName} in ${durationMs}ms`);
    res.json(result);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error('[individual] Error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
      durationMs,
    });
  }
});

/**
 * Generate group plans for a city using GPT 7-agent pipeline
 */
app.post('/api/pipeline/group', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { cityId, cityName, country, storeResults = true } = req.body;

    if (!cityName || !country) {
      return res.status(400).json({
        success: false,
        error: 'cityName and country are required',
      });
    }

    console.log(`[group] Starting 7-agent GPT pipeline for ${cityName}, ${country}`);

    // Call the GPT 7-agent pipeline (group-7agent-pipeline)
    const groupResult = await callSupabaseFunction('group-7agent-pipeline', {
      city: cityName,
      storeResults,
    });

    if (!groupResult.success) {
      throw new Error(`Group plan generation failed: ${groupResult.error}`);
    }

    const durationMs = Date.now() - startTime;

    // Check if this is an async response (background processing)
    // Note: callSupabaseFunction wraps response as { success, data, error }
    const asyncData = groupResult.data;
    if (asyncData?.async) {
      console.log(`[group] Async pipeline started for ${cityName}, job: ${asyncData.jobId}`);
      res.json({
        success: true,
        async: true,
        cityId: cityId || '',
        cityName,
        phase: 'group',
        message: asyncData.message,
        jobId: asyncData.jobId,
        checkStatus: asyncData.checkStatus,
        estimatedTime: asyncData.estimatedTime,
        durationMs,
      });
      return;
    }

    // Synchronous response (legacy format)
    const result: PipelineResult = {
      success: true,
      cityId: cityId || '',
      cityName,
      phase: 'group',
      data: {
        aiModel: 'GPT-4o',
        pipeline: '7-agent',
        totalGenerated: groupResult.data?.summary?.totalGenerated || 0,
        totalApproved: groupResult.data?.summary?.totalApproved || 0,
        totalStored: groupResult.data?.summary?.totalStored || 0,
        averageScore: groupResult.data?.summary?.averageScore || 0,
        agentResults: groupResult.data?.agentResults || [],
        plans: groupResult.data?.finalPlans?.map((p: any) => ({
          title: p.title,
          planType: p.planType,
          description: p.description,
          venues: p.activities?.map((a: any) => a.venueName) || [],
          bestFor: p.bestFor,
          qualityScore: p.qualityScore,
        })) || [],
      },
      durationMs,
    };

    console.log(`[group] Complete for ${cityName}: ${result.data.totalApproved} plans approved in ${durationMs}ms`);
    res.json(result);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error('[group] Error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
      durationMs,
    });
  }
});

/**
 * Run full pipeline (individual + group) for a city
 */
app.post('/api/pipeline/full', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { cityId, cityName, country, storeResults = true } = req.body;

    if (!cityName || !country) {
      return res.status(400).json({
        success: false,
        error: 'cityName and country are required',
      });
    }

    console.log(`[full] Starting full pipeline for ${cityName}, ${country}`);
    console.log(`[full] Phase 1: Individual plans (Claude)`);
    console.log(`[full] Phase 2: Group plans (GPT 7-agent)`);

    // Phase 1: Generate individual plans with Claude
    const individualStart = Date.now();
    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekEnd = getWeekEnd(now);
    const yearWeek = getYearWeek(now);

    const searchResult = await callSupabaseFunction('search-agent', {
      cityId,
      cityName,
      country,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      yearWeek,
      storeResults, // Pass through to search-agent for database storage
    });

    const individualDuration = Date.now() - individualStart;
    const venuesFound = searchResult.data?.totalVenues || 0;
    const eventsFound = searchResult.data?.totalEvents || 0;
    const individualStored = searchResult.data?.stored || 0;
    console.log(`[full] Phase 1 complete in ${individualDuration}ms: ${venuesFound} venues, ${eventsFound} events, ${individualStored} stored`);

    // Phase 2: Generate group plans with GPT 7-agent
    const groupStart = Date.now();
    const groupResult = await callSupabaseFunction('group-7agent-pipeline', {
      city: cityName,
      storeResults,
    });

    const groupDuration = Date.now() - groupStart;
    console.log(`[full] Phase 2 complete in ${groupDuration}ms: ${groupResult.data?.summary?.totalApproved || 0} group plans`);

    const totalDuration = Date.now() - startTime;

    const result = {
      success: true,
      cityId: cityId || '',
      cityName,
      phase: 'full',
      data: {
        individual: {
          aiModel: 'Claude',
          venuesFound,
          eventsFound,
          totalStored: individualStored,
          durationMs: individualDuration,
        },
        group: {
          aiModel: 'GPT-4o',
          pipeline: '7-agent',
          totalGenerated: groupResult.data?.summary?.totalGenerated || 0,
          totalApproved: groupResult.data?.summary?.totalApproved || 0,
          totalStored: groupResult.data?.summary?.totalStored || 0,
          averageScore: groupResult.data?.summary?.averageScore || 0,
          durationMs: groupDuration,
        },
        yearWeek,
      },
      durationMs: totalDuration,
    };

    console.log(`[full] Complete pipeline for ${cityName} in ${totalDuration}ms`);
    res.json(result);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error('[full] Error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
      durationMs,
    });
  }
});

/**
 * Run pipeline for multiple cities
 */
app.post('/api/pipeline/batch', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { cities, mode = 'full' } = req.body as { cities: CityInput[]; mode: string };

    if (!cities || !Array.isArray(cities) || cities.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'cities array is required',
      });
    }

    console.log(`[batch] Starting batch pipeline for ${cities.length} cities (mode: ${mode})`);

    const results: PipelineResult[] = [];

    for (let i = 0; i < cities.length; i++) {
      const city = cities[i];
      console.log(`[batch] Processing ${city.cityName} (${i + 1}/${cities.length})...`);

      try {
        let result: PipelineResult;

        if (mode === 'individual') {
          result = await runIndividualPipeline(city);
        } else if (mode === 'group') {
          result = await runGroupPipeline(city);
        } else {
          result = await runFullPipeline(city);
        }

        results.push(result);
        console.log(`[batch] ${city.cityName}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      } catch (error) {
        results.push({
          success: false,
          cityId: city.cityId,
          cityName: city.cityName,
          phase: mode,
          error: (error as Error).message,
          durationMs: 0,
        });
      }

      // Delay between cities to avoid rate limiting
      if (i < cities.length - 1) {
        console.log(`[batch] Waiting 5s before next city...`);
        await sleep(5000);
      }
    }

    const totalDuration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;

    console.log(`[batch] Complete: ${successCount}/${cities.length} cities successful in ${Math.round(totalDuration / 1000)}s`);

    res.json({
      success: true,
      totalCities: cities.length,
      successfulCities: successCount,
      failedCities: cities.length - successCount,
      results,
      totalDurationMs: totalDuration,
    });
  } catch (error) {
    console.error('[batch] Error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * Test relaxed validation pipeline for group plans
 * Uses test-relaxed-pipeline which has:
 * - Timing/travel context in generator
 * - Relaxed venue validation (keeps plausible venues)
 * - Relaxed address validation (corrects instead of removes)
 * - Stores with "test-relaxed" prefix (doesn't overwrite production plans)
 */
app.post('/api/pipeline/test-relaxed', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { cityName, country, storeResults = true } = req.body;

    if (!cityName) {
      return res.status(400).json({
        success: false,
        error: 'cityName is required',
      });
    }

    console.log(`[test-relaxed] Starting relaxed 7-agent GPT pipeline for ${cityName}`);

    // Call the test-relaxed-pipeline (relaxed validation)
    const groupResult = await callSupabaseFunction('test-relaxed-pipeline', {
      city: cityName,
      storeResults,
    });

    if (!groupResult.success) {
      throw new Error(`Relaxed pipeline failed: ${groupResult.error}`);
    }

    const durationMs = Date.now() - startTime;

    const result: PipelineResult = {
      success: true,
      cityId: '',
      cityName,
      phase: 'test-relaxed',
      data: {
        aiModel: 'GPT-4o',
        pipeline: '7-agent-relaxed',
        totalGenerated: groupResult.data?.summary?.totalGenerated || 0,
        totalApproved: groupResult.data?.summary?.totalApproved || 0,
        totalStored: groupResult.data?.summary?.totalStored || 0,
        averageScore: groupResult.data?.summary?.averageScore || 0,
        agentResults: groupResult.data?.agentResults || [],
        plans: groupResult.data?.finalPlans?.map((p: any) => ({
          title: p.title,
          planType: p.planType,
          description: p.description,
          venues: p.activities?.map((a: any) => a.venueName) || [],
          bestFor: p.bestFor,
          qualityScore: p.qualityScore,
        })) || [],
      },
      durationMs,
    };

    console.log(`[test-relaxed] Complete for ${cityName}: ${result.data.totalApproved} plans approved in ${durationMs}ms`);
    res.json(result);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error('[test-relaxed] Error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
      durationMs,
    });
  }
});

/**
 * Bolt Pipeline - Custom theme-based group plan generation
 * POST /api/pipeline/bolt
 * Body: {
 *   city: string,
 *   country: string,
 *   theme: string,
 *   themeDefinition?: string,
 *   userId: string
 * }
 *
 * Generates a custom 3-activity group plan for any city/theme combination.
 * Used by the iOS app's Bolt feature for Pro users with token system.
 */
app.post('/api/pipeline/bolt', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { city, country, theme, themeDefinition, userId = 'anonymous' } = req.body;

    if (!city || !theme) {
      return res.status(400).json({
        success: false,
        error: 'city and theme are required',
      });
    }

    console.log(`[bolt] Starting bolt pipeline for ${city}, ${country} - Theme: ${theme}`);
    console.log(`[bolt] User: ${userId}`);

    // Call the bolt-pipeline Supabase Edge Function (non-strict with relaxed Google Places matching)
    const boltResult = await callSupabaseFunction('bolt-pipeline', {
      city,
      country: country || '',
      theme,
      themeDefinition,
      userId,
    });

    if (!boltResult.success) {
      throw new Error(`Bolt pipeline failed: ${boltResult.error}`);
    }

    const durationMs = Date.now() - startTime;

    console.log(`[bolt] Complete for ${city}/${theme} in ${durationMs}ms`);

    // Return the data in the format iOS expects
    res.json({
      success: true,
      data: boltResult.data,
      aiModel: 'GPT-4o',
      duration: durationMs,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error('[bolt] Error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
      durationMs,
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// Async Bolt Pipeline — accepts a jobId from Supabase, responds immediately,
// processes the pipeline in the background, updates the PipelineJob row when
// done. Semaphore caps concurrent runs at 60 (safe under gpt-5.1's 2M TPM).
// See scaling/railway-async-architecture.md.
// ════════════════════════════════════════════════════════════════════════════
import { runBoltPipeline } from './pipelines/bolt-async/pipeline';
import { updatePipelineJob, cacheVibezResult } from './pipelines/bolt-async/db';

const MAX_CONCURRENT_BOLT = 60;
let activeBoltJobs = 0;

app.post('/api/pipeline/bolt-async', async (req: Request, res: Response) => {
  const { jobId, city, country, theme, themeDefinition, userId } = req.body || {};

  if (!jobId || !city || !theme) {
    return res.status(400).json({
      success: false,
      error: 'jobId, city, and theme are required',
    });
  }

  // Acknowledge immediately so the Supabase trigger can return to iOS
  res.json({ accepted: true, jobId });

  // Continue in the background — Express handler is done.
  setImmediate(async () => {
    // Concurrency check
    if (activeBoltJobs >= MAX_CONCURRENT_BOLT) {
      console.log(`[bolt-async] ${jobId} queued (active=${activeBoltJobs}/${MAX_CONCURRENT_BOLT})`);
      await updatePipelineJob(jobId, { status: 'queued' });
      // Retry loop — re-check every 5s until a slot opens
      while (activeBoltJobs >= MAX_CONCURRENT_BOLT) {
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    activeBoltJobs++;
    const startedAt = new Date().toISOString();
    console.log(`[bolt-async] ${jobId} starting (active=${activeBoltJobs}/${MAX_CONCURRENT_BOLT}) — ${city}/${theme}`);
    await updatePipelineJob(jobId, { status: 'processing', startedAt });

    try {
      const result = await runBoltPipeline({ city, country, theme, themeDefinition, userId });
      const completedAt = new Date().toISOString();

      if (result.success) {
        const flowId = (result.data as { groupFlowId?: string })?.groupFlowId ?? null;
        await updatePipelineJob(jobId, {
          status: 'completed',
          result,
          completedAt,
          flowId,
        });
        await cacheVibezResult(city, theme, result);
        console.log(`[bolt-async] ${jobId} completed in ${Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)}s`);
      } else {
        await updatePipelineJob(jobId, {
          status: 'failed',
          result,
          error: result.error,
          completedAt,
        });
        console.log(`[bolt-async] ${jobId} failed: ${result.errorCode} — ${result.error}`);
      }
    } catch (error) {
      const completedAt = new Date().toISOString();
      const message = (error as Error).message;
      console.error(`[bolt-async] ${jobId} crashed:`, message);
      await updatePipelineJob(jobId, {
        status: 'failed',
        error: message,
        completedAt,
      });
    } finally {
      activeBoltJobs--;
    }
  });
});

// Internal pipeline runners
async function runIndividualPipeline(city: CityInput): Promise<PipelineResult> {
  const startTime = Date.now();
  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(now);
  const yearWeek = getYearWeek(now);

  const searchResult = await callSupabaseFunction('search-agent', {
    cityId: city.cityId,
    cityName: city.cityName,
    country: city.country,
    weekStartDate: weekStart,
    weekEndDate: weekEnd,
    yearWeek,
  });

  if (!searchResult.success) {
    return {
      success: false,
      cityId: city.cityId,
      cityName: city.cityName,
      phase: 'individual',
      error: searchResult.error,
      durationMs: Date.now() - startTime,
    };
  }

  const storeResult = await storePlans(
    city.cityId,
    searchResult.data?.venues || [],
    searchResult.data?.events || [],
    yearWeek,
    weekStart
  );

  return {
    success: true,
    cityId: city.cityId,
    cityName: city.cityName,
    phase: 'individual',
    data: {
      venuesStored: storeResult.venuesStored,
      eventsStored: storeResult.eventsStored,
    },
    durationMs: Date.now() - startTime,
  };
}

async function runGroupPipeline(city: CityInput): Promise<PipelineResult> {
  const startTime = Date.now();

  const groupResult = await callSupabaseFunction('group-7agent-pipeline', {
    city: city.cityName,
    storeResults: true,
  });

  if (!groupResult.success) {
    return {
      success: false,
      cityId: city.cityId,
      cityName: city.cityName,
      phase: 'group',
      error: groupResult.error,
      durationMs: Date.now() - startTime,
    };
  }

  return {
    success: true,
    cityId: city.cityId,
    cityName: city.cityName,
    phase: 'group',
    data: {
      totalApproved: groupResult.data?.summary?.totalApproved || 0,
      totalStored: groupResult.data?.summary?.totalStored || 0,
    },
    durationMs: Date.now() - startTime,
  };
}

async function runFullPipeline(city: CityInput): Promise<PipelineResult> {
  const startTime = Date.now();

  // Run both pipelines
  const individualResult = await runIndividualPipeline(city);
  const groupResult = await runGroupPipeline(city);

  return {
    success: individualResult.success && groupResult.success,
    cityId: city.cityId,
    cityName: city.cityName,
    phase: 'full',
    data: {
      individual: individualResult.data,
      group: groupResult.data,
    },
    durationMs: Date.now() - startTime,
  };
}

/**
 * Call a Supabase edge function
 */
async function callSupabaseFunction(
  functionPath: string,
  body: Record<string, unknown>
): Promise<{ success: boolean; data?: any; error?: string }> {
  const url = `${SUPABASE_URL}/functions/v1/${functionPath}`;

  try {
    console.log(`[supabase] Calling ${functionPath}...`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[supabase] ${functionPath} failed: ${response.status}`);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json() as { success?: boolean; data?: unknown; error?: string };
    console.log(`[supabase] ${functionPath} completed`);
    return { success: data.success !== false, data: data.data || data, error: data.error };
  } catch (error) {
    console.error(`[supabase] ${functionPath} error:`, error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Store plans in Supabase
 */
async function storePlans(
  cityId: string,
  venues: any[],
  events: any[],
  yearWeek: string,
  weekStartDate: string
): Promise<{ venuesStored: number; eventsStored: number }> {
  let venuesStored = 0;
  let eventsStored = 0;

  // Store venues
  for (const venue of venues) {
    try {
      const planId = `plan${Date.now()}${Math.random().toString(36).substring(2, 7)}`;

      const response = await fetch(`${SUPABASE_URL}/rest/v1/Plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          id: planId,
          cityId,
          title: venue.title,
          venueName: venue.venueName,
          description: venue.description,
          category: venue.category,
          address: venue.location?.address,
          neighborhood: venue.location?.neighborhood,
          latitude: venue.location?.latitude,
          longitude: venue.location?.longitude,
          weekday: venue.schedule?.bestNights?.[0] || 'Friday',
          startTime: venue.schedule?.typicalHours?.split('-')[0]?.trim() || '19:00',
          endTime: venue.schedule?.typicalHours?.split('-')[1]?.trim() || '02:00',
          priceRange: venue.pricing?.priceRange || '$$',
          entryFee: venue.pricing?.entryFee || null,
          currency: venue.pricing?.currency || 'USD',
          aiTags: venue.aiTags || [],
          isEvent: false,
          yearWeek,
          weekStartDate,
          source: 'search-agent-claude',
          aiGenerated: true,
          rank: venuesStored + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        venuesStored++;
      }
    } catch (error) {
      console.error(`[store] Error storing venue ${venue.venueName}:`, error);
    }
  }

  // Store events
  for (const event of events) {
    try {
      const planId = `plan${Date.now()}${Math.random().toString(36).substring(2, 7)}`;

      const response = await fetch(`${SUPABASE_URL}/rest/v1/Plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          id: planId,
          cityId,
          title: event.title,
          venueName: event.venueName,
          description: event.description,
          category: event.category,
          address: event.location?.address,
          neighborhood: event.location?.neighborhood,
          latitude: event.location?.latitude,
          longitude: event.location?.longitude,
          weekday: event.schedule?.dayOfWeek || 'Friday',
          date: event.eventDate,
          startTime: event.schedule?.startTime || '20:00',
          endTime: event.schedule?.endTime || '02:00',
          priceRange: event.pricing?.priceRange || '$$',
          entryFee: event.pricing?.ticketPrice || null,
          currency: event.pricing?.currency || 'USD',
          aiTags: event.aiTags || [],
          isEvent: true,
          eventDate: event.eventDate,
          yearWeek,
          weekStartDate,
          source: 'search-agent-claude',
          aiGenerated: true,
          rank: eventsStored + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        eventsStored++;
      }
    } catch (error) {
      console.error(`[store] Error storing event ${event.eventName}:`, error);
    }
  }

  return { venuesStored, eventsStored };
}

// Utility functions
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function getWeekEnd(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() + (day === 0 ? 0 : 7 - day);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function getYearWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║          LitplanAI Pipeline Orchestrator v2.0.0               ║
╠═══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                    ║
║  Supabase: ${SUPABASE_URL.substring(0, 40)}...  ║
║  Service Key: ${SUPABASE_SERVICE_KEY ? 'Configured ✓' : 'MISSING ✗'}                              ║
╠═══════════════════════════════════════════════════════════════╣
║  Pipelines:                                                   ║
║  • Individual Plans: Claude (search-agent)                    ║
║  • Group Plans: GPT-4o 7-agent (group-7agent-pipeline)        ║
║  • Bolt Plans: GPT-4o custom theme (bolt-pipeline)            ║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                   ║
║  GET  /health                - Health check                   ║
║  POST /api/pipeline/individual - Individual plans (Claude)    ║
║  POST /api/pipeline/group      - Group plans (GPT 7-agent)    ║
║  POST /api/pipeline/full       - Full pipeline                ║
║  POST /api/pipeline/batch      - Batch processing             ║
║  POST /api/pipeline/test-relaxed - Test relaxed validation    ║
║  POST /api/pipeline/bolt       - Bolt custom theme plans      ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});
