/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Top Cities Cron Job
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Monthly cron job that pre-seeds the top 50 cities with plans.
 * This ensures popular cities always have fresh content.
 *
 * Runs on the 1st of every month at 10pm UTC via pg_cron.
 *
 * POST /top-cities-cron
 * Body: { "limit": 50, "dryRun": false }
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';

// Top 50 cities by nightlife popularity/demand
const TOP_50_CITIES = [
  // Tier 1: Global nightlife capitals (always refresh first)
  { cityName: 'New York', country: 'United States', priority: 1 },
  { cityName: 'London', country: 'United Kingdom', priority: 1 },
  { cityName: 'Ibiza', country: 'Spain', priority: 1 },
  { cityName: 'Miami', country: 'United States', priority: 1 },
  { cityName: 'Las Vegas', country: 'United States', priority: 1 },
  { cityName: 'Berlin', country: 'Germany', priority: 1 },
  { cityName: 'Amsterdam', country: 'Netherlands', priority: 1 },
  { cityName: 'Barcelona', country: 'Spain', priority: 1 },
  { cityName: 'Tokyo', country: 'Japan', priority: 1 },
  { cityName: 'Dubai', country: 'United Arab Emirates', priority: 1 },

  // Tier 2: Major party destinations
  { cityName: 'Paris', country: 'France', priority: 2 },
  { cityName: 'Los Angeles', country: 'United States', priority: 2 },
  { cityName: 'Sydney', country: 'Australia', priority: 2 },
  { cityName: 'Rio de Janeiro', country: 'Brazil', priority: 2 },
  { cityName: 'Bangkok', country: 'Thailand', priority: 2 },
  { cityName: 'Singapore', country: 'Singapore', priority: 2 },
  { cityName: 'Hong Kong', country: 'China', priority: 2 },
  { cityName: 'Madrid', country: 'Spain', priority: 2 },
  { cityName: 'Cancun', country: 'Mexico', priority: 2 },
  { cityName: 'Mykonos', country: 'Greece', priority: 2 },

  // Tier 3: Regional nightlife hubs
  { cityName: 'Chicago', country: 'United States', priority: 3 },
  { cityName: 'Melbourne', country: 'Australia', priority: 3 },
  { cityName: 'Toronto', country: 'Canada', priority: 3 },
  { cityName: 'Montreal', country: 'Canada', priority: 3 },
  { cityName: 'Seoul', country: 'South Korea', priority: 3 },
  { cityName: 'Prague', country: 'Czech Republic', priority: 3 },
  { cityName: 'Vienna', country: 'Austria', priority: 3 },
  { cityName: 'Lisbon', country: 'Portugal', priority: 3 },
  { cityName: 'Athens', country: 'Greece', priority: 3 },
  { cityName: 'Tel Aviv', country: 'Israel', priority: 3 },

  // Tier 4: Emerging and regional destinations
  { cityName: 'Nairobi', country: 'Kenya', priority: 4 },
  { cityName: 'Cape Town', country: 'South Africa', priority: 4 },
  { cityName: 'Lagos', country: 'Nigeria', priority: 4 },
  { cityName: 'Dar es Salaam', country: 'Tanzania', priority: 4 },
  { cityName: 'Mumbai', country: 'India', priority: 4 },
  { cityName: 'Delhi', country: 'India', priority: 4 },
  { cityName: 'Mexico City', country: 'Mexico', priority: 4 },
  { cityName: 'Buenos Aires', country: 'Argentina', priority: 4 },
  { cityName: 'Medellin', country: 'Colombia', priority: 4 },
  { cityName: 'Bogota', country: 'Colombia', priority: 4 },

  // Tier 5: Additional popular destinations
  { cityName: 'San Francisco', country: 'United States', priority: 5 },
  { cityName: 'Austin', country: 'United States', priority: 5 },
  { cityName: 'New Orleans', country: 'United States', priority: 5 },
  { cityName: 'Nashville', country: 'United States', priority: 5 },
  { cityName: 'Denver', country: 'United States', priority: 5 },
  { cityName: 'Bali', country: 'Indonesia', priority: 5 },
  { cityName: 'Phuket', country: 'Thailand', priority: 5 },
  { cityName: 'Tulum', country: 'Mexico', priority: 5 },
  { cityName: 'Milan', country: 'Italy', priority: 5 },
  { cityName: 'Rome', country: 'Italy', priority: 5 },
];

interface CronRequest {
  limit?: number;
  dryRun?: boolean;
  priorityFilter?: number;
}

interface RefreshResult {
  cityName: string;
  country: string;
  status: 'success' | 'failed' | 'skipped';
  jobId?: string;
  error?: string;
  plansGenerated?: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCors(req);
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const startTime = Date.now();

  try {
    // Parse request
    const body: CronRequest = await req.json().catch(() => ({}));
    const limit = Math.min(body.limit || 50, 50);
    const dryRun = body.dryRun || false;
    const priorityFilter = body.priorityFilter;

    console.log(`[top-cities-cron] Starting monthly refresh. Limit: ${limit}, Dry run: ${dryRun}`);

    const supabase = createServiceClient();
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Filter cities by priority if specified
    let citiesToProcess = TOP_50_CITIES;
    if (priorityFilter) {
      citiesToProcess = TOP_50_CITIES.filter(c => c.priority === priorityFilter);
    }

    // Limit the number of cities
    citiesToProcess = citiesToProcess.slice(0, limit);

    console.log(`[top-cities-cron] Processing ${citiesToProcess.length} cities`);

    const results: RefreshResult[] = [];

    if (dryRun) {
      // Dry run - just list cities that would be processed
      for (const city of citiesToProcess) {
        results.push({
          cityName: city.cityName,
          country: city.country,
          status: 'skipped',
          error: 'Dry run mode',
        });
      }
    } else {
      // Process cities sequentially to avoid overwhelming the API
      for (const city of citiesToProcess) {
        try {
          console.log(`[top-cities-cron] Processing ${city.cityName}, ${city.country}...`);

          // Check if city already has recent plans (within last month)
          const { count, error: countError } = await supabase
            .from('GroupFlow')
            .select('*', { count: 'exact', head: true })
            .ilike('city', city.cityName)
            .gte('createdAt', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

          if (countError) {
            console.error(`[top-cities-cron] Error checking plans for ${city.cityName}:`, countError);
          }

          // Skip if city has recent plans
          if ((count || 0) >= 5) {
            console.log(`[top-cities-cron] ${city.cityName} has ${count} recent plans, skipping`);
            results.push({
              cityName: city.cityName,
              country: city.country,
              status: 'skipped',
              error: `Already has ${count} recent plans`,
            });
            continue;
          }

          // Call the 7-agent pipeline
          const pipelineResponse = await fetch(`${SUPABASE_URL}/functions/v1/group-7agent-pipeline`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              city: city.cityName,
              storeResults: true,
            }),
          });

          const pipelineResult = await pipelineResponse.json();

          if (pipelineResponse.ok && pipelineResult.success) {
            // Pipeline started (async) or completed
            results.push({
              cityName: city.cityName,
              country: city.country,
              status: 'success',
              jobId: pipelineResult.jobId,
              plansGenerated: pipelineResult.data?.totalStored || 0,
            });

            // Update City planStatus
            await supabase
              .from('City')
              .update({ planStatus: 'generating' })
              .ilike('name', city.cityName)
              .ilike('country', city.country);

            console.log(`[top-cities-cron] Successfully started pipeline for ${city.cityName}`);
          } else {
            results.push({
              cityName: city.cityName,
              country: city.country,
              status: 'failed',
              error: pipelineResult.error || 'Pipeline failed',
            });

            console.error(`[top-cities-cron] Failed to process ${city.cityName}:`, pipelineResult.error);
          }

          // Add delay between cities to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 5000));

        } catch (error) {
          results.push({
            cityName: city.cityName,
            country: city.country,
            status: 'failed',
            error: (error as Error).message,
          });

          console.error(`[top-cities-cron] Error processing ${city.cityName}:`, error);
        }
      }
    }

    const durationMs = Date.now() - startTime;
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    console.log(`[top-cities-cron] Completed. Success: ${successCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`);

    // Log the run
    await supabase.from('PipelineLog').insert({
      id: `cron-${Date.now()}`,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      status: failedCount === 0 ? 'completed' : 'completed_with_errors',
      citiesCount: citiesToProcess.length,
      plansGenerated: results.reduce((sum, r) => sum + (r.plansGenerated || 0), 0),
      plansApproved: successCount,
      errors: failedCount > 0 ? { failed: results.filter(r => r.status === 'failed') } : null,
    });

    return jsonResponse({
      success: true,
      dryRun,
      summary: {
        total: citiesToProcess.length,
        success: successCount,
        failed: failedCount,
        skipped: skippedCount,
        durationMs,
      },
      results,
    });

  } catch (error) {
    console.error('[top-cities-cron] Fatal error:', error);
    return errorResponse((error as Error).message || 'Internal server error', 500);
  }
});
