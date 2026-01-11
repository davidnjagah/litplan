/**
 * ⚠️ DEPRECATED - PIPELINE MOVED TO RAILWAY ⚠️
 *
 * This Supabase Edge Function has been DEPRECATED.
 * The AI pipeline has been moved to Railway to prevent request timeouts.
 *
 * NEW LOCATION: backend/railway/src/index.ts
 * RAILWAY ENDPOINT: POST /api/pipeline/full
 * RAILWAY URL: See RAILWAY_URL in backend/supabase/.env
 *              (Currently: https://litplan-production.up.railway.app)
 *
 * Migration Date: January 2026
 * Reason: Supabase Edge Functions have a 60-second timeout limit.
 *
 * ─────────────────────────────────────────────────────────────────
 * ORIGINAL: Weekly Pipeline V2 - Optimized 2-Phase Orchestrator
 * Phase 1: Generate 50+ individual plans with inline validation
 * Phase 2: Compose group plans from individual plans + polish
 * POST /weekly-pipeline-v2 - Run pipeline for specified cities
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { QUALITY_THRESHOLDS_V2 } from '../_shared/quality-criteria.ts';

// Service role key for function-to-function calls
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ||
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

interface CityInput {
  id: string;
  name: string;
  country?: string;
}

interface PipelineResult {
  cityId: string;
  cityName: string;
  phase1: {
    success: boolean;
    plansGenerated: number;
    venueCount: number;
    eventCount: number;
    timeMs: number;
    error?: string;
  };
  phase2: {
    success: boolean;
    groupFlowsCreated: number;
    groupFlowsPolished: number;
    timeMs: number;
    error?: string;
  };
  totalTimeMs: number;
}

interface PipelineSummary {
  yearWeek: string;
  startedAt: string;
  completedAt: string;
  totalTimeMs: number;
  citiesProcessed: number;
  citiesSuccessful: number;
  citiesFailed: number;
  totalPlansGenerated: number;
  totalGroupFlowsCreated: number;
  results: PipelineResult[];
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  const startTime = Date.now();
  const startedAt = new Date().toISOString();

  try {
    const body = await req.json();
    const {
      cities, // Array of { id, name, country } or single city
      cityId, // For single city mode
      cityName,
      country,
      yearWeek,
      skipPhase2 = false, // Option to skip group plan generation
      maxCities = 100, // Limit number of cities to process
    } = body;

    // Calculate week info
    const now = new Date();
    const currentYearWeek = yearWeek || getYearWeek(now);
    const weekStart = getWeekStart(now);
    const weekEnd = getWeekEnd(now);

    console.log(`[weekly-pipeline-v2] Starting pipeline for week ${currentYearWeek}`);

    // Build list of cities to process
    let citiesToProcess: CityInput[] = [];

    if (cities && Array.isArray(cities)) {
      citiesToProcess = cities.slice(0, maxCities);
    } else if (cityId || cityName) {
      citiesToProcess = [{ id: cityId || '', name: cityName || '', country }];
    } else {
      // Fetch all cities from database
      citiesToProcess = await fetchAllCities(maxCities);
    }

    if (citiesToProcess.length === 0) {
      return errorResponse('No cities to process', 400, 'NO_CITIES');
    }

    console.log(`[weekly-pipeline-v2] Processing ${citiesToProcess.length} cities`);

    // Process each city
    const results: PipelineResult[] = [];

    for (const city of citiesToProcess) {
      console.log(`[weekly-pipeline-v2] Processing ${city.name} (${city.id})`);

      const cityResult = await processSingleCity(
        city,
        currentYearWeek,
        weekStart,
        weekEnd,
        skipPhase2
      );

      results.push(cityResult);

      // Log progress
      const successCount = results.filter((r) => r.phase1.success).length;
      console.log(
        `[weekly-pipeline-v2] Progress: ${results.length}/${citiesToProcess.length} cities (${successCount} successful)`
      );

      // Small delay between cities to avoid overwhelming APIs
      if (results.length < citiesToProcess.length) {
        await sleep(1000);
      }
    }

    const completedAt = new Date().toISOString();
    const totalTimeMs = Date.now() - startTime;

    // Calculate summary stats
    const citiesSuccessful = results.filter((r) => r.phase1.success && r.phase2.success).length;
    const citiesFailed = results.filter((r) => !r.phase1.success || !r.phase2.success).length;
    const totalPlansGenerated = results.reduce((sum, r) => sum + r.phase1.plansGenerated, 0);
    const totalGroupFlowsCreated = results.reduce((sum, r) => sum + r.phase2.groupFlowsCreated, 0);

    const summary: PipelineSummary = {
      yearWeek: currentYearWeek,
      startedAt,
      completedAt,
      totalTimeMs,
      citiesProcessed: results.length,
      citiesSuccessful,
      citiesFailed,
      totalPlansGenerated,
      totalGroupFlowsCreated,
      results,
    };

    // Log to WeeklyRefreshLog table
    await logPipelineRun(summary);

    console.log(
      `[weekly-pipeline-v2] Pipeline complete: ${citiesSuccessful}/${results.length} cities successful, ${totalPlansGenerated} plans, ${totalGroupFlowsCreated} group flows in ${totalTimeMs}ms`
    );

    return jsonResponse({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('[weekly-pipeline-v2] Error:', error);
    return errorResponse((error as Error).message, 500, 'SERVER_ERROR');
  }
});

/**
 * Process a single city through the pipeline
 */
async function processSingleCity(
  city: CityInput,
  yearWeek: string,
  weekStart: string,
  weekEnd: string,
  skipPhase2: boolean
): Promise<PipelineResult> {
  const cityStartTime = Date.now();

  const result: PipelineResult = {
    cityId: city.id,
    cityName: city.name,
    phase1: {
      success: false,
      plansGenerated: 0,
      venueCount: 0,
      eventCount: 0,
      timeMs: 0,
    },
    phase2: {
      success: skipPhase2,
      groupFlowsCreated: 0,
      groupFlowsPolished: 0,
      timeMs: 0,
    },
    totalTimeMs: 0,
  };

  try {
    // Phase 1: Generate individual plans
    const phase1Start = Date.now();

    const phase1Result = await callFunction('phase1-plan-generator', {
      cityId: city.id,
      cityName: city.name,
      country: city.country || '',
      yearWeek,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      storeResults: true,
    });

    result.phase1.timeMs = Date.now() - phase1Start;

    if (phase1Result.success && phase1Result.data) {
      result.phase1.success = true;
      result.phase1.plansGenerated = phase1Result.data.totalValid || 0;
      result.phase1.venueCount = phase1Result.data.venueCount || 0;
      result.phase1.eventCount = phase1Result.data.eventCount || 0;
    } else {
      result.phase1.error = phase1Result.error || 'Unknown error in Phase 1';
      console.error(`[weekly-pipeline-v2] Phase 1 failed for ${city.name}:`, result.phase1.error);
    }

    // Skip Phase 2 if Phase 1 failed or if requested
    if (!result.phase1.success || skipPhase2) {
      result.totalTimeMs = Date.now() - cityStartTime;
      return result;
    }

    // Wait a bit before Phase 2
    await sleep(500);

    // Phase 2a: Compose group plans
    const phase2Start = Date.now();

    const composerResult = await callFunction('phase2-group-composer', {
      cityId: city.id,
      cityName: city.name,
      country: city.country || '',
      yearWeek,
      targetFlows: QUALITY_THRESHOLDS_V2.MIN_GROUP_FLOWS_PER_CITY,
      storeResults: true,
    });

    if (composerResult.success && composerResult.data) {
      result.phase2.groupFlowsCreated = composerResult.data.totalFlows || 0;
    } else {
      result.phase2.error = composerResult.error || 'Unknown error in group composer';
      console.error(`[weekly-pipeline-v2] Group composer failed for ${city.name}:`, result.phase2.error);
    }

    // Wait a bit before comms specialist
    await sleep(500);

    // Phase 2b: Polish with comms specialist
    if (result.phase2.groupFlowsCreated > 0) {
      const commsResult = await callFunction('phase2-comms-specialist', {
        cityId: city.id,
        cityName: city.name,
        country: city.country || '',
        yearWeek,
        storeResults: true,
      });

      if (commsResult.success && commsResult.data) {
        result.phase2.groupFlowsPolished = commsResult.data.totalPolished || 0;
        result.phase2.success = true;
      } else {
        result.phase2.error = commsResult.error || 'Unknown error in comms specialist';
        console.error(`[weekly-pipeline-v2] Comms specialist failed for ${city.name}:`, result.phase2.error);
      }
    }

    result.phase2.timeMs = Date.now() - phase2Start;
  } catch (error) {
    console.error(`[weekly-pipeline-v2] Error processing ${city.name}:`, error);
    result.phase1.error = result.phase1.error || (error as Error).message;
  }

  result.totalTimeMs = Date.now() - cityStartTime;
  return result;
}

/**
 * Call another edge function
 */
async function callFunction(
  functionPath: string,
  body: Record<string, unknown>
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SERVICE_ROLE_KEY must be set');
  }

  const url = `${SUPABASE_URL}/functions/v1/${functionPath}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    return { success: data.success !== false, data: data.data, error: data.error };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Fetch all cities from database
 */
async function fetchAllCities(maxCities: number): Promise<CityInput[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('City')
    .select('id, name, country')
    .order('searchCount', { ascending: false })
    .limit(maxCities);

  if (error) {
    console.error('[weekly-pipeline-v2] Error fetching cities:', error);
    throw new Error(`Failed to fetch cities: ${error.message}`);
  }

  return data || [];
}

/**
 * Log pipeline run to WeeklyRefreshLog table
 */
async function logPipelineRun(summary: PipelineSummary): Promise<void> {
  const supabase = createServiceClient();

  const logEntry = {
    id: `wrl${Date.now()}${Math.random().toString(36).substring(2, 5)}`,
    yearWeek: summary.yearWeek,
    startedAt: summary.startedAt,
    completedAt: summary.completedAt,
    status: summary.citiesFailed === 0 ? 'completed' : 'completed_with_errors',
    citiesProcessed: summary.citiesProcessed,
    plansCreated: summary.totalPlansGenerated,
    plansUpdated: 0,
    groupFlowsGenerated: summary.totalGroupFlowsCreated,
    errors: summary.results
      .filter((r) => r.phase1.error || r.phase2.error)
      .map((r) => ({
        city: r.cityName,
        phase1Error: r.phase1.error,
        phase2Error: r.phase2.error,
      })),
    createdAt: new Date().toISOString(),
  };

  const { error } = await supabase.from('WeeklyRefreshLog').insert(logEntry);

  if (error) {
    console.error('[weekly-pipeline-v2] Error logging pipeline run:', error);
  }
}

/**
 * Get the start of the week (Monday)
 */
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

/**
 * Get the end of the week (Sunday)
 */
function getWeekEnd(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() + (day === 0 ? 0 : 7 - day);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

/**
 * Get year-week string (e.g., "2026-W02")
 */
function getYearWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
