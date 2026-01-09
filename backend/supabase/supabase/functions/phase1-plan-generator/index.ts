/**
 * Phase 1 Plan Generator - Unified Plan Generation with Inline Validation
 *
 * Generates 50+ individual plans (venues + events) per city with inline quality validation.
 * Uses 3 parallel GPT calls for efficiency.
 *
 * Endpoints:
 * POST /ai-agents/phase1-plan-generator - Generate plans for a city
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { gptRequest, parseGPTJSON } from '../_shared/gpt-client.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { getCityBounds, isWithinCityBounds, getCityNeighborhoods } from '../_shared/city-bounds.ts';
import { QUALITY_THRESHOLDS_V2 } from '../_shared/quality-criteria.ts';
import {
  PLAN_GENERATOR_SYSTEM_PROMPT,
  buildVenuesBatchPrompt,
  buildEventsBatchPrompt,
} from './prompts.ts';

// Types for generated plans
interface GeneratedPlan {
  // Identity
  venueName: string;
  title: string;

  // Location
  address: string;
  neighborhood: string;
  coordinates: {
    lat: number;
    lng: number;
  };

  // Content
  description: string;
  category: string;

  // Schedule
  weekday: string;
  startTime: string;
  endTime: string;
  bestNights: string[];

  // Pricing
  priceRange: string;
  entryFee: number | null;
  currency: string;

  // Event-specific
  isEvent: boolean;
  eventDate: string | null;

  // For group plan composition
  themes: string[];
  vibes: string[];
  crowdType: string;
  durationMinutes: number;

  // Quality score (calculated inline)
  qualityScore: number;
}

interface BatchResult {
  plans: GeneratedPlan[];
  batchType: string;
  validCount: number;
  rejectedCount: number;
  rejectionReasons: string[];
}

interface GenerationResult {
  cityId: string;
  cityName: string;
  country: string;
  yearWeek: string;
  plans: GeneratedPlan[];
  totalGenerated: number;
  totalValid: number;
  venueCount: number;
  eventCount: number;
  processingTimeMs: number;
  batchResults: {
    batch1: { valid: number; rejected: number };
    batch2: { valid: number; rejected: number };
    batch3: { valid: number; rejected: number };
  };
}

// Batch configuration - reduced for Supabase edge function timeout (60s)
// Total: 21 plans per run (8+8+5), can be called multiple times for more coverage
const BATCH_CONFIG = [
  {
    type: 'venues-batch-1',
    count: 8,
    categories: ['bar', 'cocktail_bar', 'nightclub', 'rooftop_bar', 'lounge', 'dance_club'],
    focus: 'nightlife and drinking spots',
  },
  {
    type: 'venues-batch-2',
    count: 8,
    categories: ['restaurant', 'speakeasy', 'live_music', 'jazz_club', 'wine_bar', 'beer_garden', 'cultural'],
    focus: 'dining, entertainment, and unique experiences',
  },
  {
    type: 'events-batch',
    count: 5,
    categories: ['weekly_event', 'pop_up', 'special_night', 'festival', 'party', 'concert'],
    focus: 'weekly events and special happenings',
  },
];

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const {
      cityId,
      cityName,
      country,
      yearWeek,
      weekStartDate,
      weekEndDate,
      storeResults = true,
    } = body;

    if (!cityName || !country) {
      return errorResponse('cityName and country required', 400, 'BAD_REQUEST');
    }

    console.log(`[phase1-plan-generator] Starting generation for ${cityName}, ${country}`);

    // Get city bounds for validation
    const cityBounds = getCityBounds(cityName);
    const neighborhoods = getCityNeighborhoods(cityName);

    if (!cityBounds) {
      console.warn(`[phase1-plan-generator] No bounds defined for ${cityName}, validation will be limited`);
    }

    // Calculate week dates if not provided
    const now = new Date();
    const weekStart = weekStartDate || getWeekStart(now);
    const weekEnd = weekEndDate || getWeekEnd(now);
    const currentYearWeek = yearWeek || getYearWeek(now);

    console.log(`[phase1-plan-generator] Week: ${currentYearWeek} (${weekStart} to ${weekEnd})`);

    // Run 3 batches in parallel
    const batchPromises = BATCH_CONFIG.map((config, index) =>
      generateBatch(
        config,
        cityName,
        country,
        cityBounds,
        neighborhoods,
        weekStart,
        weekEnd,
        index
      )
    );

    const batchResults = await Promise.all(batchPromises);

    // Combine all valid plans
    const allPlans: GeneratedPlan[] = [];
    const batchStats = {
      batch1: { valid: 0, rejected: 0 },
      batch2: { valid: 0, rejected: 0 },
      batch3: { valid: 0, rejected: 0 },
    };

    batchResults.forEach((result, index) => {
      allPlans.push(...result.plans);
      const key = `batch${index + 1}` as keyof typeof batchStats;
      batchStats[key] = {
        valid: result.validCount,
        rejected: result.rejectedCount,
      };
    });

    // Count venues vs events
    const venueCount = allPlans.filter((p) => !p.isEvent).length;
    const eventCount = allPlans.filter((p) => p.isEvent).length;

    const processingTimeMs = Date.now() - startTime;

    console.log(
      `[phase1-plan-generator] Generated ${allPlans.length} valid plans (${venueCount} venues, ${eventCount} events) in ${processingTimeMs}ms`
    );

    // Store results if requested
    let storedCount = 0;
    if (storeResults && cityId) {
      storedCount = await storePlans(cityId, cityName, allPlans, currentYearWeek, weekStart);
      console.log(`[phase1-plan-generator] Stored ${storedCount} plans to database`);
    }

    const result: GenerationResult = {
      cityId: cityId || '',
      cityName,
      country,
      yearWeek: currentYearWeek,
      plans: allPlans,
      totalGenerated: batchResults.reduce((sum, r) => sum + r.validCount + r.rejectedCount, 0),
      totalValid: allPlans.length,
      venueCount,
      eventCount,
      processingTimeMs,
      batchResults: batchStats,
    };

    return jsonResponse({
      success: true,
      data: result,
      stored: storeResults ? storedCount : 0,
    });
  } catch (error) {
    console.error('[phase1-plan-generator] Error:', error);
    return errorResponse((error as Error).message, 500, 'SERVER_ERROR');
  }
});

/**
 * Generate a batch of plans
 */
async function generateBatch(
  config: typeof BATCH_CONFIG[0],
  cityName: string,
  country: string,
  cityBounds: ReturnType<typeof getCityBounds>,
  neighborhoods: string[],
  weekStart: string,
  weekEnd: string,
  batchIndex: number
): Promise<BatchResult> {
  const isEventBatch = config.type === 'events-batch';

  console.log(`[phase1-plan-generator] Starting ${config.type} (${config.count} plans)`);

  try {
    // Build the appropriate prompt
    const userPrompt = isEventBatch
      ? buildEventsBatchPrompt(
          cityName,
          country,
          config.count,
          config.categories,
          weekStart,
          weekEnd,
          neighborhoods,
          cityBounds?.currency || 'USD'
        )
      : buildVenuesBatchPrompt(
          cityName,
          country,
          config.count,
          config.categories,
          config.focus,
          neighborhoods,
          cityBounds?.currency || 'USD'
        );

    const response = await gptRequest(
      [{ role: 'user', content: userPrompt }],
      {
        systemPrompt: PLAN_GENERATOR_SYSTEM_PROMPT,
        temperature: 0.8,
        maxTokens: 8192,
        jsonMode: true,
      }
    );

    const parsed = parseGPTJSON<{ plans: GeneratedPlan[] }>(response);
    const rawPlans = parsed.plans || [];

    console.log(`[phase1-plan-generator] ${config.type}: Received ${rawPlans.length} plans from GPT`);

    // Validate each plan
    const validPlans: GeneratedPlan[] = [];
    const rejectionReasons: string[] = [];

    for (const plan of rawPlans) {
      const validation = validatePlan(plan, cityName, cityBounds, isEventBatch);

      if (validation.valid) {
        // Mark as event or venue
        plan.isEvent = isEventBatch;
        validPlans.push(plan);
      } else {
        rejectionReasons.push(`${plan.venueName}: ${validation.reasons.join(', ')}`);
      }
    }

    console.log(
      `[phase1-plan-generator] ${config.type}: ${validPlans.length} valid, ${rawPlans.length - validPlans.length} rejected`
    );

    return {
      plans: validPlans,
      batchType: config.type,
      validCount: validPlans.length,
      rejectedCount: rawPlans.length - validPlans.length,
      rejectionReasons,
    };
  } catch (error) {
    console.error(`[phase1-plan-generator] Error in ${config.type}:`, error);
    return {
      plans: [],
      batchType: config.type,
      validCount: 0,
      rejectedCount: 0,
      rejectionReasons: [(error as Error).message],
    };
  }
}

/**
 * Validate a single plan with inline quality checks
 */
function validatePlan(
  plan: GeneratedPlan,
  cityName: string,
  cityBounds: ReturnType<typeof getCityBounds>,
  isEvent: boolean
): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Check required fields
  if (!plan.venueName || plan.venueName.length < 2) {
    reasons.push('Missing or invalid venue name');
  }

  if (!plan.title || plan.title.length < 5) {
    reasons.push('Missing or invalid title');
  }

  if (!plan.address || plan.address.length < 10) {
    reasons.push('Missing or invalid address');
  }

  if (!plan.neighborhood) {
    reasons.push('Missing neighborhood');
  }

  if (!plan.category) {
    reasons.push('Missing category');
  }

  // Check description quality
  const minWords = isEvent
    ? QUALITY_THRESHOLDS_V2.MIN_DESCRIPTION_WORDS_EVENT
    : QUALITY_THRESHOLDS_V2.MIN_DESCRIPTION_WORDS_VENUE;

  const wordCount = (plan.description || '').split(/\s+/).filter(Boolean).length;
  if (wordCount < minWords) {
    reasons.push(`Description too short (${wordCount} words, need ${minWords})`);
  }

  // Check coordinates if bounds are available
  if (cityBounds && plan.coordinates) {
    if (!isWithinCityBounds(cityName, plan.coordinates.lat, plan.coordinates.lng)) {
      reasons.push(`Coordinates outside ${cityName} bounds`);
    }
  }

  // Check coordinate validity
  if (plan.coordinates) {
    if (
      isNaN(plan.coordinates.lat) ||
      isNaN(plan.coordinates.lng) ||
      plan.coordinates.lat === 0 ||
      plan.coordinates.lng === 0
    ) {
      reasons.push('Invalid coordinates');
    }
  }

  // Check pricing
  if (!plan.priceRange || !['$', '$$', '$$$', '$$$$'].includes(plan.priceRange)) {
    reasons.push('Invalid price range');
  }

  // Check schedule
  if (!plan.weekday || !plan.startTime || !plan.endTime) {
    reasons.push('Missing schedule information');
  }

  // Check quality score
  if (plan.qualityScore && plan.qualityScore < QUALITY_THRESHOLDS_V2.MIN_QUALITY_SCORE) {
    reasons.push(`Quality score too low (${plan.qualityScore})`);
  }

  // Event-specific validation
  if (isEvent) {
    if (!plan.eventDate) {
      reasons.push('Event missing event date');
    }
  }

  return {
    valid: reasons.length === 0,
    reasons,
  };
}

/**
 * Store validated plans to database
 */
async function storePlans(
  cityId: string,
  cityName: string,
  plans: GeneratedPlan[],
  yearWeek: string,
  weekStartDate: string
): Promise<number> {
  const supabase = createServiceClient();
  let storedCount = 0;

  for (const plan of plans) {
    try {
      // Generate unique ID
      const planId = `plan${Date.now()}${Math.random().toString(36).substring(2, 7)}`;

      // Map to database schema
      const dbPlan = {
        id: planId,
        cityId,
        title: plan.title,
        venueName: plan.venueName,
        description: plan.description,
        category: plan.category,
        address: plan.address,
        neighborhood: plan.neighborhood,
        latitude: plan.coordinates?.lat,
        longitude: plan.coordinates?.lng,
        weekday: plan.weekday,
        startTime: plan.startTime,
        endTime: plan.endTime,
        priceRange: plan.priceRange,
        entryFee: plan.entryFee,
        currency: plan.currency,
        aiTags: plan.themes || [],
        isEvent: plan.isEvent,
        eventDate: plan.eventDate,
        yearWeek,
        weekStartDate,
        source: 'phase1-plan-generator',
        aiGenerated: true,
        rank: storedCount + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { error } = await supabase.from('Plan').insert(dbPlan);

      if (error) {
        console.error(`[phase1-plan-generator] Error storing plan ${plan.venueName}:`, error.message);
      } else {
        storedCount++;
      }
    } catch (error) {
      console.error(`[phase1-plan-generator] Error storing plan ${plan.venueName}:`, error);
    }
  }

  return storedCount;
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
