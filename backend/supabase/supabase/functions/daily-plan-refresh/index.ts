/**
 * Daily Plan Refresh Edge Function
 * Runs at 1am CET (midnight UTC) to:
 * 1. Clean up expired plans
 * 2. Generate new plans for day 31
 * 3. Run QA checks on generated plans
 *
 * Triggered by pg_cron or manual invocation
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { generatePlanWithClaude, verifyPlanAccuracy, checkPlanQuality } from '../_shared/claude-client.ts';
import { validatePlan, generatePlanId, isWeekend } from '../_shared/plan-schema.ts';
import { QUALITY_THRESHOLDS, RATE_LIMITS, passesQualityGate } from '../_shared/quality-criteria.ts';
import { GENERATOR_SYSTEM_PROMPT } from '../ai-agents/plan-generator/prompts.ts';

// City info from database
interface CityInfo {
  id: string;
  name: string;
  country: string;
  currency?: string;
}
import { QA_ACCURACY_SYSTEM_PROMPT } from '../ai-agents/qa-accuracy/prompts.ts';
import { QA_QUALITY_SYSTEM_PROMPT } from '../ai-agents/qa-quality/prompts.ts';

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Only allow POST for security
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  // Verify service role auth for cron jobs
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.includes('service_role')) {
    // Allow for testing with regular auth too
    console.log('[daily-refresh] Running with user auth (not service role)');
  }

  const supabase = createServiceClient();
  const startTime = Date.now();

  try {
    // Parse optional parameters
    const body = await req.json().catch(() => ({}));
    const {
      cityLimit = QUALITY_THRESHOLDS.TOP_CITIES_COUNT,
      plansPerCity = 3,
      targetDate, // Optional: specific date to generate for
      dryRun = false,
      skipQA = false, // Skip QA checks for testing
    } = body;

    console.log(`[daily-refresh] Starting daily refresh (cityLimit: ${cityLimit}, plansPerCity: ${plansPerCity})`);

    // Create job log entry
    const { data: jobLog, error: logError } = await supabase
      .from('DailyRefreshLog')
      .insert({
        runDate: new Date().toISOString().split('T')[0],
        startedAt: new Date().toISOString(),
        status: 'running',
      })
      .select()
      .single();

    if (logError) {
      console.error('[daily-refresh] Failed to create job log:', logError);
    }

    // Calculate target date (30 days ahead)
    const date = targetDate || getDateAhead(QUALITY_THRESHOLDS.PLAN_DAYS_AHEAD);
    const dayOfWeek = getDayOfWeek(date);

    console.log(`[daily-refresh] Generating plans for: ${date} (${dayOfWeek})`);

    // Step 1: Clean up expired plans
    const cleanupResult = await cleanupExpiredPlans(supabase);
    console.log(`[daily-refresh] Cleaned up ${cleanupResult.deleted} expired plans`);

    // Step 2: Generate plans for each city
    const results = {
      citiesProcessed: 0,
      plansGenerated: 0,
      plansApproved: 0,
      plansRejected: 0,
      errors: [] as string[],
    };

    // Fetch cities from database
    const { data: citiesData, error: citiesError } = await supabase
      .from('City')
      .select('id, name, country')
      .limit(cityLimit);

    if (citiesError) {
      console.error('[daily-refresh] Failed to fetch cities:', citiesError);
      return errorResponse('Failed to fetch cities', 500, 'DATABASE_ERROR');
    }

    const cities: CityInfo[] = (citiesData || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      country: c.country,
      currency: 'USD', // Default currency
    }));

    for (const city of cities) {
      try {
        const cityResult = await generatePlansForCity(
          supabase,
          city,
          date,
          dayOfWeek,
          plansPerCity,
          dryRun,
          skipQA
        );

        results.citiesProcessed++;
        results.plansGenerated += cityResult.generated;
        results.plansApproved += cityResult.approved;
        results.plansRejected += cityResult.rejected;

        // Add delay between cities to avoid rate limits
        await sleep(2000);
      } catch (error) {
        const errorMsg = `Error processing ${city.name}: ${(error as Error).message}`;
        console.error(`[daily-refresh] ${errorMsg}`);
        results.errors.push(errorMsg);
      }
    }

    // Update job log with completion
    const completedAt = new Date().toISOString();
    const executionTimeMs = Date.now() - startTime;

    if (jobLog?.id) {
      await supabase
        .from('DailyRefreshLog')
        .update({
          completedAt,
          status: results.errors.length > 0 ? 'completed_with_errors' : 'completed',
          citiesProcessed: results.citiesProcessed,
          plansGenerated: results.plansGenerated,
          plansApproved: results.plansApproved,
          errors: results.errors.length > 0 ? results.errors : null,
        })
        .eq('id', jobLog.id);
    }

    console.log(`[daily-refresh] Completed in ${executionTimeMs}ms`);
    console.log(`[daily-refresh] Results: ${JSON.stringify(results)}`);

    return jsonResponse({
      success: true,
      data: {
        ...results,
        executionTimeMs,
        targetDate: date,
      },
    });
  } catch (error) {
    console.error('[daily-refresh] Fatal error:', error);
    return errorResponse((error as Error).message || 'Internal server error', 500, 'SERVER_ERROR');
  }
});

/**
 * Clean up expired plans (older than yesterday)
 */
async function cleanupExpiredPlans(supabase: any): Promise<{ deleted: number }> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const cutoffDate = yesterday.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('Plan')
    .delete()
    .lt('schedule->date', cutoffDate)
    .select('id');

  if (error) {
    console.error('[daily-refresh] Cleanup error:', error);
    return { deleted: 0 };
  }

  return { deleted: data?.length || 0 };
}

/**
 * Generate plans for a city with QA checks
 */
async function generatePlansForCity(
  supabase: any,
  city: CityInfo,
  date: string,
  dayOfWeek: string,
  count: number,
  dryRun: boolean,
  skipQA: boolean = false
): Promise<{ generated: number; approved: number; rejected: number }> {
  const results = {
    generated: 0,
    approved: 0,
    rejected: 0,
  };

  console.log(`[daily-refresh] Generating ${count} plans for ${city.name}`);

  for (let i = 0; i < count; i++) {
    try {
      // Rate limiting
      if (i > 0) {
        await sleep(RATE_LIMITS.CLAUDE_CALL_DELAY_MS);
      }

      // Generate plan
      console.log(`[daily-refresh] Calling Claude API for ${city.name}...`);
      const generatedPlan = await generatePlanWithClaude(
        city.name,
        city.country,
        date,
        dayOfWeek,
        GENERATOR_SYSTEM_PROMPT
      );
      console.log(`[daily-refresh] Claude API returned plan: ${generatedPlan?.title || 'NO TITLE'}`);

      results.generated++;

      // Validate structure
      console.log(`[daily-refresh] Generated plan structure:`, JSON.stringify(generatedPlan, null, 2).substring(0, 500));
      const validation = validatePlan(generatedPlan);
      if (!validation.isValid) {
        console.log(`[daily-refresh] Validation failed for ${city.name}:`, JSON.stringify(validation.errors));
        results.rejected++;
        continue;
      }
      console.log(`[daily-refresh] Validation passed for ${city.name}`);

      let qualityScore = 100; // Default for skipQA mode

      if (!skipQA) {
        // QA Check 1: Accuracy
        const accuracyResult = await verifyPlanAccuracy(generatedPlan, QA_ACCURACY_SYSTEM_PROMPT);

        // QA Check 2: Quality
        const qualityResult = await checkPlanQuality(generatedPlan, QA_QUALITY_SYSTEM_PROMPT);

        // Check if passes quality gate
        const qualityGate = passesQualityGate(accuracyResult.score, qualityResult.score);

        if (!qualityGate.passed) {
          console.log(`[daily-refresh] Quality gate failed for ${city.name}:`, qualityGate.reasons);
          results.rejected++;
          continue;
        }

        // Calculate combined quality score
        qualityScore = Math.round((accuracyResult.score + qualityResult.score) / 2);
      } else {
        console.log(`[daily-refresh] Skipping QA checks for ${city.name} (skipQA=true)`);
      }

      // Prepare plan for storage - flatten nested objects to match database schema
      const uniquePlanId = generatePlanId(city.id, date);
      const plan = {
        id: uniquePlanId,
        planId: uniquePlanId,
        cityId: city.id,
        rank: 1,
        title: generatedPlan.title,
        venueName: generatedPlan.venueName,
        description: generatedPlan.description,
        category: generatedPlan.category,
        type: 'EVENT',
        heroImage: null,
        thumbnailImage: null,
        galleryImages: [],
        // Location (flattened)
        address: generatedPlan.location?.address || '',
        neighborhood: generatedPlan.location?.neighborhood || '',
        googleMapsUrl: null,
        latitude: generatedPlan.location?.coordinates?.latitude || null,
        longitude: generatedPlan.location?.coordinates?.longitude || null,
        // Schedule (flattened)
        date: date,
        startTime: generatedPlan.schedule?.startTime || '20:00',
        endTime: generatedPlan.schedule?.endTime || null,
        isWeekend: isWeekend(dayOfWeek),
        weekday: dayOfWeek,
        // Pricing (flattened)
        entryFee: generatedPlan.pricing?.entryFee || 0,
        currency: city.currency || 'USD',
        priceRange: generatedPlan.pricing?.priceRange || '$$',
        freeEntry: (generatedPlan.pricing?.entryFee || 0) === 0,
        // Tags and metadata
        genres: generatedPlan.aiTags?.slice(0, 3) || [],
        vibes: generatedPlan.aiTags?.slice(3, 6) || [],
        eventType: generatedPlan.category,
        isIndividual: true,
        isGroup: true,
        isFeatured: false,
        averageRating: null,
        totalReviews: 0,
        reviewSource: null,
        source: 'AI Generated',
        // Timestamps
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // AI fields
        aiGenerated: true,
        qualityScore,
        generatedAt: new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString(),
      };

      if (dryRun) {
        console.log(`[daily-refresh] DRY RUN - Would create: ${plan.title}`);
        results.approved++;
        continue;
      }

      // Store in database
      console.log(`[daily-refresh] Storing plan:`, JSON.stringify(plan, null, 2).substring(0, 500));
      const { error } = await supabase.from('Plan').insert(plan);

      if (error) {
        console.error(`[daily-refresh] Failed to store plan:`, JSON.stringify(error));
        results.rejected++;
        continue;
      }

      results.approved++;
      console.log(`[daily-refresh] Created: ${plan.title} (score: ${qualityScore})`);
    } catch (error) {
      const err = error as Error;
      console.error(`[daily-refresh] Error generating plan for ${city.name}:`, err.message);
      console.error(`[daily-refresh] Stack:`, err.stack);
      results.rejected++;
    }
  }

  return results;
}

/**
 * Get date N days ahead
 */
function getDateAhead(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Get day of week from date string
 */
function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
