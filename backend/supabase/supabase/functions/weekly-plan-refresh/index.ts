/**
 * Monthly Plan Refresh Edge Function
 * Runs on the 1st of every month at 11pm CET (10pm UTC) to:
 * 1. Search for top venues and events
 * 2. Run QA checks on results
 * 3. Update/create plans in database
 * 4. Generate GroupFlows
 *
 * Cost Optimization: Changed from weekly to monthly to reduce AI API costs by 75%
 * - Weekly: ~$520/month (12,000 API calls)
 * - Monthly: ~$130/month (3,000 API calls)
 *
 * Triggered by pg_cron or manual invocation
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { QUALITY_THRESHOLDS, RATE_LIMITS } from '../_shared/quality-criteria.ts';
import { generatePlanId, isWeekend } from '../_shared/plan-schema.ts';

// Types
interface CityInfo {
  id: string;
  cityId: string;
  name: string;
  country: string;
  currency?: string;
}

interface WeekInfo {
  yearWeek: string;
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
}

interface RefreshResults {
  citiesProcessed: number;
  plansCreated: number;
  plansUpdated: number;
  plansUnchanged: number;
  eventsCreated: number;
  groupFlowsGenerated: number;
  errors: string[];
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  const supabase = createServiceClient();
  const startTime = Date.now();

  try {
    // Parse optional parameters
    const body = await req.json().catch(() => ({}));
    const {
      cityLimit = 100,
      dryRun = false,
      skipQA = false,
      singleCity, // Optional: process only one city for testing
    } = body;

    // Calculate current week info
    const weekInfo = getWeekInfo();
    console.log(`[monthly-refresh] Starting refresh for ${weekInfo.yearWeek} (${weekInfo.weekStartDate} to ${weekInfo.weekEndDate})`);

    // Create job log entry
    const { data: jobLog, error: logError } = await supabase
      .from('WeeklyRefreshLog')
      .insert({
        yearWeek: weekInfo.yearWeek,
        startedAt: new Date().toISOString(),
        status: 'RUNNING',
      })
      .select()
      .single();

    if (logError) {
      console.error('[monthly-refresh] Failed to create job log:', logError);
    }

    const results: RefreshResults = {
      citiesProcessed: 0,
      plansCreated: 0,
      plansUpdated: 0,
      plansUnchanged: 0,
      eventsCreated: 0,
      groupFlowsGenerated: 0,
      errors: [],
    };

    // Debug info for troubleshooting (included in response)
    const debugInfo: string[] = [];

    // Fetch cities from database
    let citiesQuery = supabase
      .from('City')
      .select('id, cityId, name, country')
      .order('rank', { ascending: true })
      .limit(cityLimit);

    if (singleCity) {
      // Support both id and name for filtering
      citiesQuery = citiesQuery.or(`id.eq.${singleCity},name.ilike.${singleCity}`);
    }

    const { data: citiesData, error: citiesError } = await citiesQuery;

    if (citiesError) {
      console.error('[monthly-refresh] Failed to fetch cities:', citiesError);
      return errorResponse('Failed to fetch cities', 500, 'DATABASE_ERROR');
    }

    const cities: CityInfo[] = (citiesData || []).map((c: any) => ({
      id: c.id,
      cityId: c.cityId,
      name: c.name,
      country: c.country,
      currency: 'USD',
    }));

    console.log(`[monthly-refresh] Processing ${cities.length} cities`);
    console.log(`[monthly-refresh] Cities data: ${JSON.stringify(cities)}`);
    debugInfo.push(`Cities found: ${cities.length}`);

    // Process each city - one city at a time, but individual and group plans run in parallel
    for (const city of cities) {
      try {
        console.log(`[monthly-refresh] Starting city: ${city.name}`);
        debugInfo.push(`Processing city: ${city.name}`);

        // Run individual plans and group plans in PARALLEL for this city
        const [individualResult, groupFlowResult] = await Promise.all([
          // Individual plans pipeline (search agent + QA + store)
          processIndividualPlansForCity(supabase, city, weekInfo, dryRun, skipQA, debugInfo),
          // Group plans pipeline (group-plan-agent)
          processGroupFlowsForCity(supabase, city, weekInfo, dryRun),
        ]);

        results.citiesProcessed++;
        results.plansCreated += individualResult.plansCreated;
        results.plansUpdated += individualResult.plansUpdated;
        results.plansUnchanged += individualResult.plansUnchanged;
        results.eventsCreated += individualResult.eventsCreated;
        results.groupFlowsGenerated += groupFlowResult;

        // Delay between cities to avoid rate limits
        await sleep(2000);
      } catch (error) {
        const errorMsg = `Error processing ${city.name}: ${(error as Error).message}`;
        console.error(`[monthly-refresh] ${errorMsg}`);
        results.errors.push(errorMsg);
      }
    }

    // Update job log with completion
    const completedAt = new Date().toISOString();
    const executionTimeMs = Date.now() - startTime;

    if (jobLog?.id) {
      await supabase
        .from('WeeklyRefreshLog')
        .update({
          completedAt,
          status: results.errors.length > 0 ? 'PARTIAL' : 'COMPLETED',
          citiesProcessed: results.citiesProcessed,
          plansCreated: results.plansCreated,
          plansUpdated: results.plansUpdated,
          plansUnchanged: results.plansUnchanged,
          groupFlowsGenerated: results.groupFlowsGenerated,
          errors: results.errors.length > 0 ? results.errors : null,
        })
        .eq('id', jobLog.id);
    }

    // Update AppConfig with current week
    await supabase
      .from('AppConfig')
      .upsert({
        id: 'app',
        currentWeek: weekInfo.yearWeek,
        weekStartDate: weekInfo.weekStartDate,
        weekEndDate: weekInfo.weekEndDate,
        updatedAt: new Date().toISOString(),
      });

    console.log(`[monthly-refresh] Completed in ${executionTimeMs}ms`);
    console.log(`[monthly-refresh] Results: ${JSON.stringify(results)}`);

    return jsonResponse({
      success: true,
      data: {
        ...results,
        executionTimeMs,
        weekInfo,
        debug: debugInfo,
      },
    });
  } catch (error) {
    console.error('[monthly-refresh] Fatal error:', error);
    return errorResponse((error as Error).message || 'Internal server error', 500, 'SERVER_ERROR');
  }
});

/**
 * Process INDIVIDUAL PLANS for a city (runs in parallel with group plans)
 * Handles: Search Agent -> QA -> Store plans
 */
async function processIndividualPlansForCity(
  supabase: any,
  city: CityInfo,
  weekInfo: WeekInfo,
  dryRun: boolean,
  skipQA: boolean,
  debugInfo: string[]
): Promise<{
  plansCreated: number;
  plansUpdated: number;
  plansUnchanged: number;
  eventsCreated: number;
}> {
  const results = {
    plansCreated: 0,
    plansUpdated: 0,
    plansUnchanged: 0,
    eventsCreated: 0,
  };

  console.log(`[monthly-refresh] [INDIVIDUAL] Processing ${city.name}, ${city.country}`);

  // Delete ALL existing plans for this city (clean slate for fresh data)
  if (!dryRun) {
    const { error: deleteError } = await supabase
      .from('Plan')
      .delete()
      .eq('cityId', city.id);

    if (deleteError) {
      console.error(`[monthly-refresh] [INDIVIDUAL] Error deleting old plans for ${city.name}:`, deleteError);
    } else {
      console.log(`[monthly-refresh] [INDIVIDUAL] Deleted existing plans for ${city.name}`);
      debugInfo.push(`Deleted existing plans for ${city.name}`);
    }
  }

  // Call Search Agent
  console.log(`[monthly-refresh] [INDIVIDUAL] Calling search-agent for ${city.name}`);
  debugInfo.push(`Calling search-agent for ${city.name}`);
  const searchResults = await callSearchAgent(city, weekInfo, debugInfo);

  if (!searchResults) {
    console.error(`[monthly-refresh] [INDIVIDUAL] Search agent returned null for ${city.name}`);
    debugInfo.push(`Search agent returned null for ${city.name}`);
    return results;
  }

  debugInfo.push(`Search results: ${searchResults.venues.length} venues, ${searchResults.events.length} events`);
  console.log(`[monthly-refresh] [INDIVIDUAL] Search results: ${searchResults.venues.length} venues, ${searchResults.events.length} events`);

  // Process venues (permanent spots)
  for (const venue of searchResults.venues || []) {
    try {
      // QA check if not skipped
      if (!skipQA) {
        const qaResult = await callQAAgent(venue);
        if (!qaResult?.passed) {
          console.log(`[monthly-refresh] [INDIVIDUAL] QA failed for ${venue.venueName}`);
          continue;
        }
      }

      // Create or update plan
      const planResult = await upsertPlan(supabase, city, venue, weekInfo, false, dryRun);
      if (planResult === 'created') results.plansCreated++;
      else if (planResult === 'updated') results.plansUpdated++;
      else results.plansUnchanged++;
    } catch (error) {
      console.error(`[monthly-refresh] [INDIVIDUAL] Error processing venue ${venue.venueName}:`, error);
    }
  }

  // Process events
  console.log(`[monthly-refresh] [INDIVIDUAL] Processing ${(searchResults.events || []).length} events for ${city.name}`);
  for (const event of searchResults.events || []) {
    try {
      console.log(`[monthly-refresh] [INDIVIDUAL] Processing event: ${event.eventName || event.venueName}`);
      if (!skipQA) {
        const qaResult = await callQAAgent(event);
        if (!qaResult?.passed) {
          console.log(`[monthly-refresh] [INDIVIDUAL] QA failed for ${event.eventName}`);
          continue;
        }
      }

      // Create event plan
      const planResult = await upsertPlan(supabase, city, event, weekInfo, true, dryRun);
      console.log(`[monthly-refresh] [INDIVIDUAL] Event upsert result: ${planResult}`);
      if (planResult === 'created') results.eventsCreated++;
    } catch (error) {
      console.error(`[monthly-refresh] [INDIVIDUAL] Error processing event ${event.eventName}:`, error);
    }
  }

  // Check if city has no plans - mark as "coming soon"
  const totalNewPlans = results.plansCreated + results.eventsCreated;
  if (totalNewPlans === 0 && !dryRun) {
    const { count } = await supabase
      .from('Plan')
      .select('*', { count: 'exact', head: true })
      .eq('cityId', city.id);

    if (count === 0) {
      console.log(`[monthly-refresh] [INDIVIDUAL] No plans found for ${city.name} - marking as coming soon`);
      await createComingSoonPlaceholder(supabase, city, weekInfo);
    }
  }

  console.log(`[monthly-refresh] [INDIVIDUAL] ${city.name}: ${results.plansCreated} venues, ${results.eventsCreated} events`);

  return results;
}

/**
 * Process GROUP FLOWS for a city using full 7-agent pipeline
 * Runs in parallel with individual plans
 *
 * Pipeline:
 * Agent 1: group-plan-generator - Generate initial plans
 * Agent 2: details-validator - Validate venue details
 * Agent 3: address-validator - Triple-check addresses
 * Agent 4: description-editor - Polish descriptions
 * Agent 5: quality-gate - Final quality check
 * Agent 6: comms-specialist - Captivating copy
 * Agent 7: tag-generator - Generate bestFor tags
 */
async function processGroupFlowsForCity(
  supabase: any,
  city: CityInfo,
  weekInfo: WeekInfo,
  dryRun: boolean
): Promise<number> {
  if (dryRun) {
    console.log(`[monthly-refresh] [GROUP] DRY RUN - skipping group flows for ${city.name}`);
    return 0;
  }

  console.log(`[monthly-refresh] [GROUP] Starting 7-agent pipeline for ${city.name}`);

  const baseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  const agentConfig = {
    cityId: city.id,
    cityName: city.name,
    country: city.country,
  };

  try {
    // ===== AGENT 1: GROUP PLAN GENERATOR =====
    console.log(`[monthly-refresh] [GROUP] Agent 1: Generating group plans for ${city.name}`);
    const agent1Response = await fetch(`${baseUrl}/functions/v1/group-plan-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        ...agentConfig,
        targetCount: 5,
        batchSize: 5,
        storeResults: true,
      }),
    });

    if (!agent1Response.ok) {
      const errorText = await agent1Response.text();
      console.error(`[monthly-refresh] [GROUP] Agent 1 failed: ${errorText.substring(0, 200)}`);
      return await generateGroupFlowsLegacy(supabase, city, weekInfo);
    }

    const agent1Result = await agent1Response.json();
    const plansGenerated = agent1Result.data?.plansGenerated || 0;
    console.log(`[monthly-refresh] [GROUP] Agent 1: Generated ${plansGenerated} plans`);

    if (plansGenerated === 0) {
      console.log(`[monthly-refresh] [GROUP] No plans generated, skipping remaining agents`);
      return 0;
    }

    // Small delay between agents
    await sleep(1000);

    // ===== AGENT 2: DETAILS VALIDATOR =====
    console.log(`[monthly-refresh] [GROUP] Agent 2: Validating details for ${city.name}`);
    const agent2Response = await fetch(`${baseUrl}/functions/v1/details-validator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(agentConfig),
    });

    if (agent2Response.ok) {
      const agent2Result = await agent2Response.json();
      console.log(`[monthly-refresh] [GROUP] Agent 2: ${agent2Result.data?.validated || 0} validated, ${agent2Result.data?.removed || 0} removed`);
    } else {
      console.error(`[monthly-refresh] [GROUP] Agent 2 failed, continuing...`);
    }

    await sleep(1000);

    // ===== AGENT 3: ADDRESS VALIDATOR =====
    console.log(`[monthly-refresh] [GROUP] Agent 3: Validating addresses for ${city.name}`);
    const agent3Response = await fetch(`${baseUrl}/functions/v1/address-validator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(agentConfig),
    });

    if (agent3Response.ok) {
      const agent3Result = await agent3Response.json();
      console.log(`[monthly-refresh] [GROUP] Agent 3: ${agent3Result.data?.addressesValidated || 0} validated, ${agent3Result.data?.addressesCorrected || 0} corrected`);
    } else {
      console.error(`[monthly-refresh] [GROUP] Agent 3 failed, continuing...`);
    }

    await sleep(1000);

    // ===== AGENT 4: DESCRIPTION EDITOR =====
    console.log(`[monthly-refresh] [GROUP] Agent 4: Editing descriptions for ${city.name}`);
    const agent4Response = await fetch(`${baseUrl}/functions/v1/description-editor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(agentConfig),
    });

    if (agent4Response.ok) {
      const agent4Result = await agent4Response.json();
      console.log(`[monthly-refresh] [GROUP] Agent 4: ${agent4Result.data?.descriptionsEdited || 0} descriptions edited`);
    } else {
      console.error(`[monthly-refresh] [GROUP] Agent 4 failed, continuing...`);
    }

    await sleep(1000);

    // ===== AGENT 5: QUALITY GATE =====
    console.log(`[monthly-refresh] [GROUP] Agent 5: Quality gate for ${city.name}`);
    const agent5Response = await fetch(`${baseUrl}/functions/v1/quality-gate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(agentConfig),
    });

    let approvedCount = 0;
    if (agent5Response.ok) {
      const agent5Result = await agent5Response.json();
      approvedCount = agent5Result.data?.approved || 0;
      console.log(`[monthly-refresh] [GROUP] Agent 5: ${approvedCount} approved, ${agent5Result.data?.removed || 0} removed`);
    } else {
      console.error(`[monthly-refresh] [GROUP] Agent 5 failed, continuing...`);
    }

    await sleep(1000);

    // ===== AGENT 6: COMMS SPECIALIST =====
    console.log(`[monthly-refresh] [GROUP] Agent 6: Comms specialist for ${city.name}`);
    const agent6Response = await fetch(`${baseUrl}/functions/v1/comms-specialist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(agentConfig),
    });

    if (agent6Response.ok) {
      const agent6Result = await agent6Response.json();
      console.log(`[monthly-refresh] [GROUP] Agent 6: ${agent6Result.data?.descriptionsEnhanced || 0} descriptions enhanced`);
    } else {
      console.error(`[monthly-refresh] [GROUP] Agent 6 failed, continuing...`);
    }

    await sleep(1000);

    // ===== AGENT 7: TAG GENERATOR =====
    console.log(`[monthly-refresh] [GROUP] Agent 7: Generating tags for ${city.name}`);
    const agent7Response = await fetch(`${baseUrl}/functions/v1/tag-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        ...agentConfig,
        mode: 'batch',
      }),
    });

    if (agent7Response.ok) {
      const agent7Result = await agent7Response.json();
      console.log(`[monthly-refresh] [GROUP] Agent 7: Tags generated for ${agent7Result.data?.plansTagged || 0} plans`);
    } else {
      console.error(`[monthly-refresh] [GROUP] Agent 7 failed, continuing...`);
    }

    // Mark remaining flows as complete
    await supabase
      .from('GroupFlow')
      .update({
        pipelineStep: 7,
        pipelineStatus: 'complete',
        updatedAt: new Date().toISOString(),
      })
      .eq('cityId', city.id)
      .gte('pipelineStep', 5);

    console.log(`[monthly-refresh] [GROUP] 7-agent pipeline complete for ${city.name}: ${approvedCount} group flows approved`);
    return approvedCount;

  } catch (error) {
    console.error(`[monthly-refresh] [GROUP] Error in 7-agent pipeline for ${city.name}:`, error);
    // Fallback to legacy generation
    return await generateGroupFlowsLegacy(supabase, city, weekInfo);
  }
}

/**
 * @deprecated Use processIndividualPlansForCity and processGroupFlowsForCity instead
 * Kept for backward compatibility
 */
async function processCityForWeek(
  supabase: any,
  city: CityInfo,
  weekInfo: WeekInfo,
  dryRun: boolean,
  skipQA: boolean,
  debugInfo: string[]
): Promise<{
  plansCreated: number;
  plansUpdated: number;
  plansUnchanged: number;
  eventsCreated: number;
  groupFlowsGenerated: number;
}> {
  // Run both pipelines in parallel
  const [individualResult, groupFlowCount] = await Promise.all([
    processIndividualPlansForCity(supabase, city, weekInfo, dryRun, skipQA, debugInfo),
    processGroupFlowsForCity(supabase, city, weekInfo, dryRun),
  ]);

  return {
    ...individualResult,
    groupFlowsGenerated: groupFlowCount,
  };
}

/**
 * Call the Search Agent to find venues and events
 */
async function callSearchAgent(
  city: CityInfo,
  weekInfo: WeekInfo,
  debugInfo: string[]
): Promise<{ venues: any[]; events: any[] } | null> {
  try {
    const baseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const searchUrl = `${baseUrl}/functions/v1/search-agent`;
    console.log(`[monthly-refresh] Calling search-agent at: ${searchUrl}`);
    debugInfo.push(`Search URL: ${searchUrl}`);
    debugInfo.push(`Service key present: ${serviceKey ? 'yes' : 'no'}`);

    const response = await fetch(`${baseUrl}/functions/v1/search-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        cityId: city.id,
        cityName: city.name,
        country: city.country,
        weekStartDate: weekInfo.weekStartDate,
        weekEndDate: weekInfo.weekEndDate,
        yearWeek: weekInfo.yearWeek,
      }),
    });

    debugInfo.push(`Search agent response status: ${response.status}`);
    const responseText = await response.text();
    debugInfo.push(`Response body (first 200 chars): ${responseText.substring(0, 200)}`);

    if (!response.ok) {
      const errorMsg = `Search agent returned ${response.status}: ${responseText.substring(0, 300)}`;
      debugInfo.push(`ERROR: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const data = JSON.parse(responseText);
    debugInfo.push(`Search agent found: venues=${data.data?.venues?.length || 0}, events=${data.data?.events?.length || 0}`);
    return {
      venues: data.data?.venues || [],
      events: data.data?.events || [],
    };
  } catch (error) {
    const errorMsg = `Search agent error: ${(error as Error).message}`;
    debugInfo.push(`ERROR: ${errorMsg}`);
    console.error('[monthly-refresh] Search agent error:', error);
    return null;
  }
}

/**
 * Call the QA Agent to validate a plan
 */
async function callQAAgent(plan: any): Promise<{ passed: boolean; score: number } | null> {
  try {
    const baseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const response = await fetch(`${baseUrl}/functions/v1/qa-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        plan,
        mode: 'single',
      }),
    });

    if (!response.ok) {
      throw new Error(`QA agent returned ${response.status}`);
    }

    const data = await response.json();
    return {
      passed: data.data?.passed || false,
      score: data.data?.overallScore || 0,
    };
  } catch (error) {
    console.error('[monthly-refresh] QA agent error:', error);
    return null;
  }
}

/**
 * Create or update a plan in the database
 * Uses UTC date calculations to prevent timezone-related off-by-one day errors
 */
async function upsertPlan(
  supabase: any,
  city: CityInfo,
  item: any,
  weekInfo: WeekInfo,
  isEvent: boolean,
  dryRun: boolean
): Promise<'created' | 'updated' | 'unchanged'> {
  const venueName = item.venueName || item.eventName;
  const uniqueId = generatePlanId(city.id, venueName);

  // For fresh weekly refresh, we don't check for existing since we deleted all plans
  // This simplifies the logic and ensures we always create fresh data

  // Determine the day of week - use bestDay if available, otherwise use schedule
  let dayOfWeek: string;
  if (isEvent) {
    // For events, use the schedule dayOfWeek or calculate from eventDate
    if (item.schedule?.dayOfWeek) {
      dayOfWeek = item.schedule.dayOfWeek;
    } else if (item.eventDate) {
      dayOfWeek = getDayOfWeekFromDateUTC(item.eventDate);
    } else {
      dayOfWeek = 'Friday'; // Default fallback
    }
  } else {
    // For venues, prefer bestDay field, then bestNights, then default
    if (item.bestDay) {
      dayOfWeek = item.bestDay;
    } else if (item.schedule?.bestNights?.[0]) {
      dayOfWeek = item.schedule.bestNights[0];
    } else {
      dayOfWeek = 'Friday'; // Default fallback
    }
  }

  // Calculate the actual date for this plan based on the day of week
  const planDate = getDateForDayOfWeek(weekInfo.weekStartDate, dayOfWeek);
  const isWeekendPlan = ['Friday', 'Saturday', 'Sunday'].includes(dayOfWeek);

  // Parse start/end times from schedule
  let startTime = '20:00';
  let endTime = '23:00';
  if (item.schedule?.startTime) {
    startTime = item.schedule.startTime;
  } else if (item.schedule?.typicalHours) {
    const parts = item.schedule.typicalHours.split('-');
    startTime = parseTimeString(parts[0]?.trim()) || '20:00';
    endTime = parseTimeString(parts[1]?.trim()) || '23:00';
  }
  if (item.schedule?.endTime) {
    endTime = item.schedule.endTime;
  }

  const plan = {
    id: uniqueId,
    planId: uniqueId,
    cityId: city.id,
    rank: 1,
    title: item.title,
    venueName: item.venueName || item.eventName,
    description: item.description,
    category: item.category,
    type: getCategoryType(item.category),
    heroImage: null,
    thumbnailImage: null,
    galleryImages: [],
    address: item.location?.address || '',
    neighborhood: item.location?.neighborhood || '',
    googleMapsUrl: null,
    latitude: item.location?.latitude || null,
    longitude: item.location?.longitude || null,
    // Use calculated planDate for all plans (both venues and events)
    date: planDate,
    startTime: startTime,
    endTime: endTime,
    isWeekend: isWeekendPlan,
    weekday: dayOfWeek,
    // Weekly tracking fields
    weekNumber: weekInfo.weekNumber,
    yearWeek: weekInfo.yearWeek,
    weekStartDate: weekInfo.weekStartDate,
    isEvent: isEvent,
    eventDate: isEvent ? item.eventDate || planDate : null,
    isRecurring: !isEvent,
    contentHash: null,
    sourceUrl: item.sourceUrl || null,
    aiGenerated: true,
    // Pricing (convert to cents for database storage)
    entryFee: Math.round((item.pricing?.entryFee || item.pricing?.ticketPrice || 0) * 100),
    currency: item.pricing?.currency || city.currency || 'USD',
    priceRange: item.pricing?.priceRange || '$$',
    freeEntry: (item.pricing?.entryFee || item.pricing?.ticketPrice || 0) === 0,
    // Tags
    genres: item.aiTags?.slice(0, 3) || [],
    vibes: item.aiTags?.slice(3, 6) || [],
    eventType: item.category,
    isIndividual: true,
    isGroup: true,
    isFeatured: false,
    source: 'AI Generated',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (dryRun) {
    console.log(`[monthly-refresh] DRY RUN - Would create: ${venueName} for ${dayOfWeek} (${planDate})`);
    return 'created';
  }

  // Insert the new plan
  const { error } = await supabase.from('Plan').insert(plan);

  if (error) {
    console.error(`[monthly-refresh] Insert error for ${venueName}:`, error);
    throw error;
  }

  console.log(`[monthly-refresh] Created: ${venueName} for ${dayOfWeek} (${planDate})`);
  return 'created';
}

/**
 * Generate GroupFlows for a city using the Group Plan Agent
 *
 * This function:
 * 1. Calls the group-plan-agent to generate/update group plans
 * 2. Preserves permanent group plans (only removes expired temporary ones)
 * 3. Builds up the collection of group plans over time
 */
async function generateGroupFlows(
  supabase: any,
  city: CityInfo,
  weekInfo: WeekInfo
): Promise<number> {
  try {
    const baseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Call the Group Plan Agent
    console.log(`[monthly-refresh] Calling group-plan-agent for ${city.name}`);

    const response = await fetch(`${baseUrl}/functions/v1/group-plan-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        cityId: city.id,
        cityName: city.name,
        country: city.country,
        mode: 'generate', // Generate new plans, preserve existing
        targetCount: 5, // Target 5 group plans per city
        forceRefresh: false, // Don't force update existing plans every week
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[monthly-refresh] Group plan agent error: ${response.status} - ${errorText.substring(0, 200)}`);

      // Fallback to legacy group flow generation if agent fails
      return await generateGroupFlowsLegacy(supabase, city, weekInfo);
    }

    const result = await response.json();

    if (!result.success) {
      console.error(`[monthly-refresh] Group plan agent failed for ${city.name}`);
      return await generateGroupFlowsLegacy(supabase, city, weekInfo);
    }

    const { plansGenerated, plansUpdated, plansRemoved, existingFlows } = result.data;

    console.log(`[monthly-refresh] ${city.name} group plans: ${plansGenerated} new, ${plansUpdated} updated, ${plansRemoved} removed, ${existingFlows} existing`);

    return plansGenerated + plansUpdated;
  } catch (error) {
    console.error('[monthly-refresh] Error calling group-plan-agent:', error);
    // Fallback to legacy generation
    return await generateGroupFlowsLegacy(supabase, city, weekInfo);
  }
}

/**
 * Legacy GroupFlow generation (fallback if agent fails)
 * Creates group flows from existing Plans in the database
 */
async function generateGroupFlowsLegacy(
  supabase: any,
  city: CityInfo,
  weekInfo: WeekInfo
): Promise<number> {
  try {
    console.log(`[monthly-refresh] Using legacy group flow generation for ${city.name}`);

    // Check existing permanent group flows
    const { data: existingFlows, count: existingCount } = await supabase
      .from('GroupFlow')
      .select('id', { count: 'exact' })
      .eq('cityId', city.id)
      .eq('isTemporary', false);

    // If we already have enough permanent flows, skip generation
    if (existingCount && existingCount >= 3) {
      console.log(`[monthly-refresh] ${city.name} already has ${existingCount} permanent group flows, skipping legacy generation`);
      return 0;
    }

    // Get ALL plans for this city
    const { data: plans } = await supabase
      .from('Plan')
      .select('*')
      .eq('cityId', city.id);

    if (!plans || plans.length < 3) {
      console.log(`[monthly-refresh] Not enough plans for GroupFlows in ${city.name}`);
      return 0;
    }

    // Determine how many flows to create
    const neededFlows = 3 - (existingCount || 0);
    if (neededFlows <= 0) return 0;

    console.log(`[monthly-refresh] Creating ${neededFlows} legacy group flows for ${city.name}`);

    // Categorize plans
    const barPlans = plans.filter((p: any) => ['BAR', 'Cocktail Bar', 'Rooftop Bar', 'Lounge', 'Wine Bar', 'Speakeasy'].includes(p.category));
    const clubPlans = plans.filter((p: any) => ['CLUB', 'Nightclub', 'Dance Club'].includes(p.category));
    const liveMusicPlans = plans.filter((p: any) => ['Live Music', 'Jazz Club'].includes(p.category));

    // Simple flow templates
    const flowTemplates = [
      {
        suffix: 'night-out',
        title: `${city.name} Night Out`,
        description: `Experience the best of ${city.name}'s nightlife with this curated evening flow.`,
        isWeekend: true,
        theme: 'bar-hop',
        getSteps: () => {
          const steps = [];
          if (barPlans[0]) steps.push({ plan: barPlans[0], duration: 90, title: 'Pre-Game Drinks' });
          if (clubPlans[0]) steps.push({ plan: clubPlans[0], duration: 180, title: 'Dance the Night Away' });
          else if (barPlans[1]) steps.push({ plan: barPlans[1], duration: 90, title: 'Second Stop' });
          if (barPlans[2]) steps.push({ plan: barPlans[2], duration: 60, title: 'Late Night Spot' });
          return steps;
        },
      },
      {
        suffix: 'bar-hop',
        title: `${city.name} Bar Hopping`,
        description: `Discover ${city.name}'s best bars in one epic night.`,
        isWeekend: true,
        theme: 'bar-hop',
        getSteps: () => {
          const steps = [];
          if (barPlans[0]) steps.push({ plan: barPlans[0], duration: 75, title: 'First Round' });
          if (barPlans[1]) steps.push({ plan: barPlans[1], duration: 75, title: 'Second Spot' });
          if (barPlans[2]) steps.push({ plan: barPlans[2], duration: 75, title: 'Third Stop' });
          return steps;
        },
      },
      {
        suffix: 'live-music',
        title: `${city.name} Live Music`,
        description: `Experience live performances at ${city.name}'s best venues.`,
        isWeekend: false,
        theme: 'live-music',
        getSteps: () => {
          const steps = [];
          if (barPlans[0]) steps.push({ plan: barPlans[0], duration: 60, title: 'Pre-Show Drinks' });
          if (liveMusicPlans[0]) steps.push({ plan: liveMusicPlans[0], duration: 150, title: 'Live Performance' });
          else if (barPlans[1]) steps.push({ plan: barPlans[1], duration: 90, title: 'Main Event' });
          if (barPlans[2]) steps.push({ plan: barPlans[2], duration: 60, title: 'Post-Show Vibes' });
          return steps;
        },
      },
    ];

    let flowsCreated = 0;
    const timestamp = new Date().toISOString();

    for (let i = 0; i < Math.min(neededFlows, flowTemplates.length); i++) {
      const template = flowTemplates[i];
      const steps = template.getSteps();

      if (steps.length < 2) continue;

      const flowId = `${city.cityId}-${template.suffix}-legacy-${Date.now()}`;

      const flow = {
        id: flowId,
        flowId: flowId,
        cityId: city.id,
        rank: (existingCount || 0) + i + 1,
        title: template.title,
        description: template.description,
        totalHours: Math.ceil(steps.reduce((sum, s) => sum + s.duration, 0) / 60),
        startTime: '19:00',
        endTime: '02:00',
        totalEstimate: steps.length * 5000,
        currency: city.currency || 'USD',
        isWeekend: template.isWeekend,
        proOnly: (existingCount || 0) + i >= 2,
        aiGenerated: true,
        isTemporary: false,
        theme: template.theme,
        difficulty: 'moderate',
        lastRefreshed: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      const { error: flowError } = await supabase.from('GroupFlow').insert(flow);

      if (flowError) {
        console.error(`[monthly-refresh] Error inserting legacy flow:`, flowError);
        continue;
      }

      for (let stepNum = 0; stepNum < steps.length; stepNum++) {
        const step = steps[stepNum];
        await supabase.from('GroupFlowStep').insert({
          flowId: flowId,
          planId: step.plan.id,
          stepNumber: stepNum + 1,
          title: step.title,
          venueName: step.plan.venueName,
          duration: step.duration,
          thumbnail: step.plan.thumbnailImage,
        });
      }

      flowsCreated++;
      console.log(`[monthly-refresh] Created legacy flow: ${template.title}`);
    }

    return flowsCreated;
  } catch (error) {
    console.error('[monthly-refresh] Error in legacy GroupFlow generation:', error);
    return 0;
  }
}

/**
 * Create a "Coming Soon" placeholder for cities with no plans
 */
async function createComingSoonPlaceholder(
  supabase: any,
  city: CityInfo,
  weekInfo: WeekInfo
): Promise<void> {
  try {
    const placeholderId = `${city.cityId}-coming-soon`;

    const placeholder = {
      id: placeholderId,
      planId: placeholderId,
      cityId: city.id,
      rank: 1,
      title: 'Coming Soon',
      venueName: 'Exciting Plans Coming Soon',
      description: `We're curating the best nightlife and entertainment experiences in ${city.name}. Check back soon for top venue recommendations, weekly events, and group itineraries. ${city.name}'s vibrant scene will be featured here shortly!`,
      category: 'Coming Soon',
      type: 'COMING_SOON',
      heroImage: null,
      thumbnailImage: null,
      galleryImages: [],
      address: city.name,
      neighborhood: city.name,
      googleMapsUrl: null,
      latitude: null,
      longitude: null,
      date: null,
      startTime: null,
      endTime: null,
      isWeekend: false,
      weekday: null,
      weekNumber: weekInfo.weekNumber,
      yearWeek: weekInfo.yearWeek,
      weekStartDate: weekInfo.weekStartDate,
      isEvent: false,
      eventDate: null,
      isRecurring: false,
      contentHash: null,
      sourceUrl: null,
      aiGenerated: true,
      entryFee: 0,
      currency: city.currency || 'USD',
      priceRange: '$',
      freeEntry: true,
      genres: [],
      vibes: ['Coming Soon'],
      eventType: 'Coming Soon',
      isIndividual: true,
      isGroup: false,
      isFeatured: false,
      source: 'System',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Upsert the placeholder
    const { data: existing } = await supabase
      .from('Plan')
      .select('id')
      .eq('planId', placeholderId)
      .single();

    if (existing) {
      await supabase.from('Plan').update(placeholder).eq('id', existing.id);
    } else {
      await supabase.from('Plan').insert(placeholder);
    }

    console.log(`[monthly-refresh] Created "Coming Soon" placeholder for ${city.name}`);
  } catch (error) {
    console.error(`[monthly-refresh] Error creating coming soon placeholder for ${city.name}:`, error);
  }
}

/**
 * Get week info (ISO week number)
 */
function getWeekInfo(): WeekInfo {
  const now = new Date();
  const dayOfWeek = now.getDay();

  // Get Monday of this week
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  // Get Sunday of this week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  // Calculate ISO week number
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);

  return {
    yearWeek: `${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`,
    weekNumber,
    weekStartDate: monday.toISOString().split('T')[0],
    weekEndDate: sunday.toISOString().split('T')[0],
  };
}

/**
 * Map category to PlanType enum
 */
function getCategoryType(category: string): string {
  const categoryMap: Record<string, string> = {
    'Live Music': 'EVENT',
    'Nightclub': 'CLUB',
    'Rooftop Bar': 'BAR',
    'Cocktail Bar': 'BAR',
    'Jazz Club': 'EVENT',
    'Comedy Club': 'EVENT',
    'Speakeasy': 'BAR',
    'Wine Bar': 'BAR',
    'Brewery': 'BAR',
    'Lounge': 'BAR',
    'Dance Club': 'CLUB',
    'Karaoke': 'EVENT',
    'Pub': 'BAR',
    'Sports Bar': 'BAR',
    'Dinner Show': 'RESTAURANT',
  };
  return categoryMap[category] || 'BAR';
}

/**
 * Generate a simple hash of content for change detection
 */
async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 64);
}

/**
 * Get day of week from a date string using UTC
 * Prevents timezone-related off-by-one-day errors
 */
function getDayOfWeekFromDateUTC(dateStr: string): string {
  // Use noon UTC to avoid timezone edge cases
  const date = new Date(dateStr + 'T12:00:00Z');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getUTCDay()];
}

/**
 * Get the date for a specific day of the week within a given week
 * Returns YYYY-MM-DD format
 */
function getDateForDayOfWeek(weekStartDate: string, dayOfWeek: string): string {
  const dayOffsets: Record<string, number> = {
    'Monday': 0,
    'Tuesday': 1,
    'Wednesday': 2,
    'Thursday': 3,
    'Friday': 4,
    'Saturday': 5,
    'Sunday': 6,
  };

  const offset = dayOffsets[dayOfWeek] ?? 4; // Default to Friday if unknown

  // Parse the week start date and add the offset
  const startDate = new Date(weekStartDate + 'T12:00:00Z');
  startDate.setUTCDate(startDate.getUTCDate() + offset);

  return startDate.toISOString().split('T')[0];
}

/**
 * Parse time strings like "5PM", "10PM", "9:00 PM" to "HH:MM" format
 */
function parseTimeString(timeStr: string): string | null {
  if (!timeStr) return null;

  // Already in HH:MM format
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    return timeStr.padStart(5, '0');
  }

  // Parse formats like "5PM", "10PM", "9:00 PM", "9PM"
  const match = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minutes = match[2] || '00';
  const meridiem = (match[3] || '').toUpperCase();

  // Convert to 24-hour format
  if (meridiem === 'PM' && hour < 12) {
    hour += 12;
  } else if (meridiem === 'AM' && hour === 12) {
    hour = 0;
  }

  return `${hour.toString().padStart(2, '0')}:${minutes}`;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
