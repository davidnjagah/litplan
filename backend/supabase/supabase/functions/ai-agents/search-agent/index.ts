/**
 * Search Agent - AI Agent for finding venues and events
 * Searches for top recommended spots and weekly events in cities
 *
 * Endpoints:
 * POST /ai-agents/search-agent - Search venues and events for a city
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../../_shared/cors.ts';
import { openaiRequest, parseOpenAIJSON } from '../../_shared/openai-client.ts';
import { RATE_LIMITS } from '../../_shared/quality-criteria.ts';
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
    const { cityId, cityName, country, weekStartDate, weekEndDate, yearWeek } = body;

    if (!cityName || !country || !weekStartDate || !weekEndDate) {
      return errorResponse(
        'cityName, country, weekStartDate, and weekEndDate required',
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
      },
    });
  } catch (error) {
    console.error('[search-agent] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500, 'SERVER_ERROR');
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

    const response = await openaiRequest(
      [{ role: 'user', content: userPrompt }],
      {
        systemPrompt: SEARCH_AGENT_SYSTEM_PROMPT,
        temperature: 0.7,
        maxTokens: 4096,
        jsonMode: true,
        model: 'gpt-4o', // Using GPT-4o for better venue accuracy
      }
    );

    const parsed = parseOpenAIJSON<{ venues: VenueResult[] }>(response);

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

      // Check description length
      const wordCount = venue.description.split(/\s+/).length;
      if (wordCount < 50) {
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

    const response = await openaiRequest(
      [{ role: 'user', content: userPrompt }],
      {
        systemPrompt: SEARCH_AGENT_SYSTEM_PROMPT,
        temperature: 0.7,
        maxTokens: 4096,
        jsonMode: true,
        model: 'gpt-4o', // Using GPT-4o for better event accuracy
      }
    );

    const parsed = parseOpenAIJSON<{ events: EventResult[] }>(response);

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

      // Check description length
      const wordCount = event.description.split(/\s+/).length;
      if (wordCount < 50) {
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
