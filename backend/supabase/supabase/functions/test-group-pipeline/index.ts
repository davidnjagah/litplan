/**
 * ⚠️ DEPRECATED - PIPELINE MOVED TO RAILWAY ⚠️
 *
 * This Supabase Edge Function has been DEPRECATED.
 * The AI pipeline has been moved to Railway to prevent request timeouts.
 *
 * NEW LOCATION: backend/railway/src/index.ts
 * RAILWAY ENDPOINTS:
 *   - POST /api/pipeline/group - Group plans only
 *   - POST /api/pipeline/full - Full pipeline (individual + group)
 *   - POST /api/pipeline/batch - Batch processing for multiple cities
 * RAILWAY URL: See RAILWAY_URL in backend/supabase/.env
 *              (Currently: https://litplan-production.up.railway.app)
 *
 * This file is kept for reference only. DO NOT deploy or use directly.
 * All pipeline orchestration should go through the Railway service.
 *
 * Migration Date: January 2026
 * Reason: Supabase Edge Functions have a 60-second timeout limit,
 *         which is insufficient for AI pipeline operations.
 *
 * ─────────────────────────────────────────────────────────────────
 * ORIGINAL DOCUMENTATION (for reference):
 * ─────────────────────────────────────────────────────────────────
 *
 * Group Plan Pipeline Orchestrator
 *
 * Runs all 5 AI agents in sequence to generate high-quality group plans:
 * 1. Group Plan Generator - Creates initial plans
 * 2. Details Validator - Verifies and corrects details
 * 3. Address Validator - Triple-checks addresses
 * 4. Description Editor - Polishes all descriptions
 * 5. Quality Gate - Final approval/rejection
 *
 * POST /group-plan-pipeline
 * Body: { cities: [{ cityId, cityName, country }], targetPerCity?: number }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';

// City configuration
interface CityConfig {
  cityId: string;
  cityName: string;
  country: string;
  currency?: string;
}

// Pipeline stage results
interface StageResult {
  stage: string;
  success: boolean;
  processed: number;
  errors: string[];
  duration: number;
}

// City pipeline result
interface CityResult {
  cityId: string;
  cityName: string;
  stages: StageResult[];
  finalStats: {
    generated: number;
    approved: number;
    rejected: number;
    averageScore: number;
  };
  totalDuration: number;
}

// Overall pipeline result
interface PipelineResult {
  success: boolean;
  startTime: string;
  endTime: string;
  totalDuration: number;
  citiesProcessed: number;
  totalPlansGenerated: number;
  totalPlansApproved: number;
  cityResults: CityResult[];
}

// Default test cities (5 cities for testing)
const TEST_CITIES: CityConfig[] = [
  { cityId: 'cmjrcg43r0000wbxrw025frc8', cityName: 'New York', country: 'United States', currency: 'USD' },
  { cityId: 'cmjrcg43r0001wbxr12345678', cityName: 'Los Angeles', country: 'United States', currency: 'USD' },
  { cityId: 'cmjrcg43r0002wbxr87654321', cityName: 'Miami', country: 'United States', currency: 'USD' },
  { cityId: 'cmjrcg43r0003wbxr11111111', cityName: 'London', country: 'United Kingdom', currency: 'GBP' },
  { cityId: 'cmjrcg43r0004wbxr22222222', cityName: 'Madrid', country: 'Spain', currency: 'EUR' },
];

// Supabase function base URL
const FUNCTIONS_BASE = Deno.env.get('SUPABASE_URL') + '/functions/v1';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    const body = await req.json();
    const {
      cities = TEST_CITIES,
      targetPerCity = 30,
      runInBackground = false,
    } = body;

    const startTime = new Date();
    console.log(`[pipeline] Starting group plan pipeline for ${cities.length} cities`);

    // If running in background, start async and return immediately
    if (runInBackground) {
      // Start the pipeline without waiting
      runPipelineAsync(cities, targetPerCity).catch(err => {
        console.error('[pipeline] Background pipeline error:', err);
      });

      return jsonResponse({
        success: true,
        message: `Pipeline started in background for ${cities.length} cities`,
        startTime: startTime.toISOString(),
      });
    }

    // Run pipeline synchronously
    const result = await runPipeline(cities, targetPerCity);

    return jsonResponse({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('[pipeline] Error:', error);
    return errorResponse((error as Error).message, 500, 'SERVER_ERROR');
  }
});

/**
 * Run the full pipeline for all cities
 */
async function runPipeline(cities: CityConfig[], targetPerCity: number): Promise<PipelineResult> {
  const startTime = new Date();
  const result: PipelineResult = {
    success: true,
    startTime: startTime.toISOString(),
    endTime: '',
    totalDuration: 0,
    citiesProcessed: 0,
    totalPlansGenerated: 0,
    totalPlansApproved: 0,
    cityResults: [],
  };

  const supabase = createServiceClient();

  // Log pipeline start
  const { data: pipelineLog } = await supabase
    .from('PipelineLog')
    .insert({
      id: `pipeline-${Date.now()}`,
      startedAt: startTime.toISOString(),
      status: 'running',
      citiesCount: cities.length,
      targetPerCity,
    })
    .select()
    .single();

  // Process each city
  for (const city of cities) {
    console.log(`[pipeline] Processing ${city.cityName}...`);

    try {
      const cityResult = await processCityPipeline(city, targetPerCity);
      result.cityResults.push(cityResult);
      result.citiesProcessed++;
      result.totalPlansGenerated += cityResult.finalStats.generated;
      result.totalPlansApproved += cityResult.finalStats.approved;

    } catch (error) {
      console.error(`[pipeline] Failed to process ${city.cityName}:`, error);
      result.cityResults.push({
        cityId: city.cityId,
        cityName: city.cityName,
        stages: [],
        finalStats: { generated: 0, approved: 0, rejected: 0, averageScore: 0 },
        totalDuration: 0,
      });
    }

    // Delay between cities to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  const endTime = new Date();
  result.endTime = endTime.toISOString();
  result.totalDuration = endTime.getTime() - startTime.getTime();

  // Update pipeline log
  if (pipelineLog) {
    await supabase
      .from('PipelineLog')
      .update({
        completedAt: endTime.toISOString(),
        status: 'completed',
        plansGenerated: result.totalPlansGenerated,
        plansApproved: result.totalPlansApproved,
      })
      .eq('id', pipelineLog.id);
  }

  console.log(`[pipeline] Complete: ${result.citiesProcessed} cities, ${result.totalPlansApproved}/${result.totalPlansGenerated} plans approved`);

  return result;
}

/**
 * Run pipeline async (for background processing)
 */
async function runPipelineAsync(cities: CityConfig[], targetPerCity: number): Promise<void> {
  await runPipeline(cities, targetPerCity);
}

/**
 * Process a single city through all 5 pipeline stages
 */
async function processCityPipeline(city: CityConfig, targetCount: number): Promise<CityResult> {
  const cityStart = Date.now();
  const stages: StageResult[] = [];

  let generated = 0;
  let approved = 0;
  let rejected = 0;
  let averageScore = 0;

  // Stage 1: Generate Plans
  console.log(`[pipeline] ${city.cityName} - Stage 1: Generating plans`);
  const stage1 = await runStage('group-plan-generator', {
    cityId: city.cityId,
    cityName: city.cityName,
    country: city.country,
    targetCount,
    batchSize: 10,
    storeResults: true,
  });
  stages.push({ stage: 'generate', ...stage1 });
  generated = stage1.data?.plansGenerated || 0;

  if (generated === 0) {
    return {
      cityId: city.cityId,
      cityName: city.cityName,
      stages,
      finalStats: { generated: 0, approved: 0, rejected: 0, averageScore: 0 },
      totalDuration: Date.now() - cityStart,
    };
  }

  // Wait for database to sync
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Stage 2: Validate Details
  console.log(`[pipeline] ${city.cityName} - Stage 2: Validating details`);
  const stage2 = await runStage('details-validator', {
    cityId: city.cityId,
    cityName: city.cityName,
  });
  stages.push({ stage: 'validate_details', ...stage2 });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Stage 3: Validate Addresses
  console.log(`[pipeline] ${city.cityName} - Stage 3: Validating addresses`);
  const stage3 = await runStage('address-validator', {
    cityId: city.cityId,
    cityName: city.cityName,
    country: city.country,
  });
  stages.push({ stage: 'validate_addresses', ...stage3 });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Stage 4: Edit Descriptions
  console.log(`[pipeline] ${city.cityName} - Stage 4: Editing descriptions`);
  const stage4 = await runStage('description-editor', {
    cityId: city.cityId,
    cityName: city.cityName,
  });
  stages.push({ stage: 'edit_descriptions', ...stage4 });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Stage 5: Quality Gate
  console.log(`[pipeline] ${city.cityName} - Stage 5: Quality gate`);
  const stage5 = await runStage('quality-gate', {
    cityId: city.cityId,
    cityName: city.cityName,
  });
  stages.push({ stage: 'quality_gate', ...stage5 });

  approved = stage5.data?.approved || 0;
  rejected = stage5.data?.removed || 0;
  averageScore = stage5.data?.averageScore || 0;

  const totalDuration = Date.now() - cityStart;
  console.log(`[pipeline] ${city.cityName} complete: ${approved}/${generated} approved (${averageScore}/100 avg) in ${Math.round(totalDuration / 1000)}s`);

  return {
    cityId: city.cityId,
    cityName: city.cityName,
    stages,
    finalStats: { generated, approved, rejected, averageScore },
    totalDuration,
  };
}

/**
 * Run a single pipeline stage by calling its edge function
 */
async function runStage(
  agentName: string,
  body: Record<string, any>
): Promise<{ success: boolean; processed: number; errors: string[]; duration: number; data?: any }> {
  const start = Date.now();

  try {
    // Note: AI agents are deployed directly, not in ai-agents subfolder
    const response = await fetch(`${FUNCTIONS_BASE}/${agentName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY || '',
      },
      body: JSON.stringify(body),
    });

    const duration = Date.now() - start;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[pipeline] Stage ${agentName} failed:`, errorText);
      return {
        success: false,
        processed: 0,
        errors: [errorText],
        duration,
      };
    }

    const result = await response.json();

    return {
      success: true,
      processed: result.data?.totalProcessed || result.data?.plansGenerated || 0,
      errors: result.data?.errors || [],
      duration,
      data: result.data,
    };

  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[pipeline] Stage ${agentName} error:`, error);
    return {
      success: false,
      processed: 0,
      errors: [(error as Error).message],
      duration,
    };
  }
}
