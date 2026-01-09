/**
 * Search Agent - AI Agent for finding venues and events
 * Searches for top recommended spots and weekly events in cities
 * Now with DATABASE STORAGE support
 *
 * Endpoints:
 * POST /ai-agents/search-agent - Search venues and events for a city
 *
 * Parameters:
 * - cityId: string (required for storage)
 * - cityName: string (required)
 * - country: string (required)
 * - weekStartDate: string (required)
 * - weekEndDate: string (required)
 * - yearWeek: string (optional)
 * - storeResults: boolean (optional, default: false)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { claudeRequest, parseClaudeJSON } from '../_shared/claude-client.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { RATE_LIMITS } from '../_shared/quality-criteria.ts';
import {
  SEARCH_AGENT_SYSTEM_PROMPT,
  VENUES_USER_PROMPT,
  EVENTS_USER_PROMPT,
} from './prompts.ts';

// Types for search results
interface VenueResult {
  type: 'permanent';
  venueName: string;
  title: string;
  description: string;
  category: string;
  location: {
    address: string;
    neighborhood: string;
    latitude: number;
    longitude: number;
  };
  schedule: {
    typicalHours: string;
    bestNights: string[];
  };
  pricing: {
    entryFee: number;
    priceRange: string;
    currency: string;
  };
  aiTags: string[];
}

interface EventResult {
  type: 'event';
  eventName: string;
  venueName: string;
  title: string;
  description: string;
  category: string;
  eventDate: string;
  location: {
    address: string;
    neighborhood: string;
    latitude: number;
    longitude: number;
  };
  schedule: {
    date: string;
    startTime: string;
    endTime: string;
    dayOfWeek: string;
  };
  pricing: {
    ticketPrice: number;
    priceRange: string;
    currency: string;
  };
  aiTags: string[];
}

interface SearchResults {
  venues: VenueResult[];
  events: EventResult[];
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    const body = await req.json();
    const { cityId, cityName, country, weekStartDate, weekEndDate, yearWeek, storeResults = false } = body;

    if (!cityName || !country || !weekStartDate || !weekEndDate) {
      return errorResponse(
        'cityName, country, weekStartDate, and weekEndDate required',
        400,
        'BAD_REQUEST'
      );
    }

    if (storeResults && !cityId) {
      return errorResponse(
        'cityId is required when storeResults is true',
        400,
        'BAD_REQUEST'
      );
    }

    console.log(`[search-agent] Searching for ${cityName}, ${country} (${yearWeek || 'current week'})`);

    // Search for venues and events in parallel
    const [venuesResult, eventsResult] = await Promise.all([
      searchVenues(cityName, country, weekStartDate, weekEndDate),
      searchEvents(cityName, country, weekStartDate, weekEndDate),
    ]);

    const results: SearchResults = {
      venues: venuesResult,
      events: eventsResult,
    };

    console.log(`[search-agent] Found ${results.venues.length} venues, ${results.events.length} events`);

    // Store results if requested
    let storedCount = 0;
    if (storeResults && cityId) {
      console.log(`[search-agent] Storing results to database...`);
      storedCount = await storePlansToDatabase(
        cityId,
        cityName,
        results.venues,
        results.events,
        weekStartDate,
        weekEndDate
      );
      console.log(`[search-agent] Stored ${storedCount} plans to database`);

      // Update city's totalPlansThisWeek
      await updateCityPlanCount(cityId, storedCount);
    }

    return jsonResponse({
      success: true,
      data: {
        cityId,
        cityName,
        country,
        yearWeek,
        weekStartDate,
        weekEndDate,
        venues: results.venues,
        events: results.events,
        totalVenues: results.venues.length,
        totalEvents: results.events.length,
        stored: storeResults ? storedCount : 0,
      },
    });
  } catch (error) {
    console.error('[search-agent] Error:', error);
    return errorResponse((error as Error).message || 'Internal server error', 500, 'SERVER_ERROR');
  }
});

/**
 * Search for permanent venues in a city
 */
async function searchVenues(
  cityName: string,
  country: string,
  weekStartDate: string,
  weekEndDate: string
): Promise<VenueResult[]> {
  try {
    const userPrompt = VENUES_USER_PROMPT(cityName, country, weekStartDate, weekEndDate);

    const response = await claudeRequest(
      [{ role: 'user', content: userPrompt }],
      {
        systemPrompt: SEARCH_AGENT_SYSTEM_PROMPT,
        temperature: 0.7,
        maxTokens: 16384,
        jsonMode: true,
      }
    );

    const parsed = parseClaudeJSON<{ venues: VenueResult[] }>(response);

    // Validate and filter venues
    const validVenues = (parsed.venues || []).filter((venue) => {
      const hasRequiredFields =
        venue.venueName &&
        venue.title &&
        venue.description &&
        venue.category &&
        venue.location?.address;

      if (!hasRequiredFields) {
        console.log(`[search-agent] Skipping invalid venue:`, venue.venueName);
        return false;
      }

      // Check description length (reduced minimum for more venues)
      const wordCount = venue.description.split(/\s+/).length;
      if (wordCount < 20) {
        console.log(`[search-agent] Description too short for ${venue.venueName}: ${wordCount} words`);
        return false;
      }

      return true;
    });

    console.log(`[search-agent] Found ${validVenues.length} valid venues out of ${parsed.venues?.length || 0}`);
    return validVenues;
  } catch (error) {
    console.error('[search-agent] Error searching venues:', error);
    return [];
  }
}

/**
 * Search for weekly events in a city
 */
async function searchEvents(
  cityName: string,
  country: string,
  weekStartDate: string,
  weekEndDate: string
): Promise<EventResult[]> {
  try {
    // Add delay between API calls to avoid rate limiting
    await sleep(RATE_LIMITS.CLAUDE_CALL_DELAY_MS);

    const userPrompt = EVENTS_USER_PROMPT(cityName, country, weekStartDate, weekEndDate);

    const response = await claudeRequest(
      [{ role: 'user', content: userPrompt }],
      {
        systemPrompt: SEARCH_AGENT_SYSTEM_PROMPT,
        temperature: 0.7,
        maxTokens: 8192,
        jsonMode: true,
      }
    );

    const parsed = parseClaudeJSON<{ events: EventResult[] }>(response);

    // Validate and filter events
    const validEvents = (parsed.events || []).filter((event) => {
      const hasRequiredFields =
        event.eventName &&
        event.venueName &&
        event.title &&
        event.description &&
        event.eventDate &&
        event.schedule?.date;

      if (!hasRequiredFields) {
        console.log(`[search-agent] Skipping invalid event:`, event.eventName);
        return false;
      }

      // Validate event date is within the week
      const eventDate = new Date(event.eventDate);
      const startDate = new Date(weekStartDate);
      const endDate = new Date(weekEndDate);

      if (eventDate < startDate || eventDate > endDate) {
        console.log(`[search-agent] Event ${event.eventName} date ${event.eventDate} is outside week range`);
        return false;
      }

      // Check description length (reduced minimum for more events)
      const wordCount = event.description.split(/\s+/).length;
      if (wordCount < 15) {
        console.log(`[search-agent] Description too short for ${event.eventName}: ${wordCount} words`);
        return false;
      }

      return true;
    });

    console.log(`[search-agent] Found ${validEvents.length} valid events out of ${parsed.events?.length || 0}`);
    return validEvents;
  } catch (error) {
    console.error('[search-agent] Error searching events:', error);
    return [];
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Store venues and events to the Plan table
 */
async function storePlansToDatabase(
  cityId: string,
  cityName: string,
  venues: VenueResult[],
  events: EventResult[],
  weekStartDate: string,
  weekEndDate: string
): Promise<number> {
  const supabase = createServiceClient();
  const timestamp = Date.now();
  const citySlug = cityName.toLowerCase().replace(/\s+/g, '-');
  let storedCount = 0;

  // Delete old AI-generated individual plans for this city (from search-agent)
  const { error: deleteError } = await supabase
    .from('Plan')
    .delete()
    .eq('cityId', cityId)
    .eq('source', 'ai-agent-claude')
    .eq('isIndividual', true);

  if (deleteError) {
    console.error('[search-agent] Error deleting old plans:', deleteError);
  }

  // Store venues
  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i];
    const planId = `plan-${citySlug}-claude-${timestamp}-v${i}`;

    try {
      const { error } = await supabase.from('Plan').insert({
        id: planId,
        planId: planId,
        title: venue.title,
        venueName: venue.venueName,
        description: venue.description,
        category: venue.category.toLowerCase().replace(/\s+/g, '_'),
        type: 'VENUE',
        cityId: cityId,
        date: weekStartDate,
        weekday: venue.schedule?.bestNights?.[0] || 'Saturday',
        isWeekend: ['Friday', 'Saturday', 'Sunday'].some(d =>
          venue.schedule?.bestNights?.includes(d)
        ),
        startTime: venue.schedule?.typicalHours?.split('-')[0]?.trim() || '20:00',
        endTime: venue.schedule?.typicalHours?.split('-')[1]?.trim() || '02:00',
        latitude: venue.location?.latitude || 0,
        longitude: venue.location?.longitude || 0,
        address: venue.location?.address || '',
        neighborhood: venue.location?.neighborhood || '',
        priceRange: venue.pricing?.priceRange || '$$',
        entryFee: venue.pricing?.entryFee || 0,
        freeEntry: (venue.pricing?.entryFee || 0) === 0,
        currency: venue.pricing?.currency || 'USD',
        rank: i + 1,
        source: 'ai-agent-claude',
        aiGenerated: true,
        isIndividual: true,
        isGroup: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      if (error) {
        console.error(`[search-agent] Error storing venue ${venue.venueName}:`, error);
      } else {
        storedCount++;
      }
    } catch (err) {
      console.error(`[search-agent] Exception storing venue ${venue.venueName}:`, err);
    }
  }

  // Store events
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const planId = `plan-${citySlug}-claude-${timestamp}-e${i}`;

    try {
      const { error } = await supabase.from('Plan').insert({
        id: planId,
        planId: planId,
        title: event.title,
        venueName: event.venueName,
        description: event.description,
        category: event.category.toLowerCase().replace(/\s+/g, '_'),
        type: 'EVENT',
        cityId: cityId,
        date: event.eventDate || event.schedule?.date || weekStartDate,
        weekday: event.schedule?.dayOfWeek || 'Saturday',
        isWeekend: ['Friday', 'Saturday', 'Sunday'].includes(event.schedule?.dayOfWeek || ''),
        startTime: event.schedule?.startTime || '21:00',
        endTime: event.schedule?.endTime || '03:00',
        latitude: event.location?.latitude || 0,
        longitude: event.location?.longitude || 0,
        address: event.location?.address || '',
        neighborhood: event.location?.neighborhood || '',
        priceRange: event.pricing?.priceRange || '$$',
        entryFee: event.pricing?.ticketPrice || 0,
        freeEntry: (event.pricing?.ticketPrice || 0) === 0,
        currency: event.pricing?.currency || 'USD',
        rank: venues.length + i + 1,
        source: 'ai-agent-claude',
        aiGenerated: true,
        isIndividual: true,
        isGroup: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      if (error) {
        console.error(`[search-agent] Error storing event ${event.eventName}:`, error);
      } else {
        storedCount++;
      }
    } catch (err) {
      console.error(`[search-agent] Exception storing event ${event.eventName}:`, err);
    }
  }

  return storedCount;
}

/**
 * Update the city's totalPlansThisWeek count
 */
async function updateCityPlanCount(cityId: string, planCount: number): Promise<void> {
  const supabase = createServiceClient();

  try {
    const { error } = await supabase
      .from('City')
      .update({
        totalPlansThisWeek: planCount,
        lastUpdated: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', cityId);

    if (error) {
      console.error('[search-agent] Error updating city plan count:', error);
    }
  } catch (err) {
    console.error('[search-agent] Exception updating city plan count:', err);
  }
}
