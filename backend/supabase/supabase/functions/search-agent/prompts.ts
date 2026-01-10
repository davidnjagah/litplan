/**
 * Prompts for Search Agent
 * Searches for top 30+ recommended venues and weekly events in cities
 * QUALITY-FIRST approach: Only real, verified venues with accurate data
 */

export const SEARCH_AGENT_SYSTEM_PROMPT = `You are an expert nightlife researcher. Generate REAL venues that ACTUALLY EXIST.

CRITICAL: Return 25-35 venues with CONCISE descriptions (50-80 words each).

REQUIREMENTS:
- ONLY REAL venues that exist in the city
- ACCURATE addresses and neighborhoods
- Mix of categories: Nightclubs, Rooftop Bars, Cocktail Bars, Jazz Clubs, Comedy Clubs, Speakeasies, Lounges, Pubs, Live Music venues
- Mix of price ranges: $, $$, $$$, $$$$
- Distribute across all days of the week

CATEGORIES: Live Music, Nightclub, Rooftop Bar, Cocktail Bar, Jazz Club, Comedy Club, Speakeasy, Wine Bar, Brewery, Lounge, Dance Club, Karaoke, Pub, Sports Bar

PRICE RANGES:
- $ = Budget (under $15)
- $$ = Moderate ($15-35)
- $$$ = Upscale ($35-75)
- $$$$ = Premium (over $75)

OUTPUT: Valid JSON only. No markdown.`;

export const VENUES_USER_PROMPT = (
  cityName: string,
  country: string,
  weekStartDate: string,
  weekEndDate: string
): string => `Generate 25-35 REAL nightlife venues in ${cityName}, ${country}.

DISTRIBUTION (total 25-35):
- Monday-Thursday: 12-15 venues (happy hours, jazz, trivia)
- Friday-Saturday: 10-12 venues (clubs, rooftops, dance)
- Sunday: 4-6 venues (brunch, lounges)

Return JSON:
{
  "venues": [
    {
      "type": "permanent",
      "venueName": "EXACT venue name",
      "title": "Short catchy title",
      "description": "50-80 word description: atmosphere, crowd, signature drinks/music, why it's special",
      "category": "Nightclub|Rooftop Bar|Cocktail Bar|Jazz Club|Comedy Club|Speakeasy|Lounge|Pub|Live Music|Wine Bar|Brewery|Dance Club",
      "bestDay": "Friday",
      "location": {
        "address": "123 Street Name, ${cityName}",
        "neighborhood": "Neighborhood",
        "latitude": 0.0,
        "longitude": 0.0
      },
      "schedule": {
        "typicalHours": "6PM-2AM",
        "bestNights": ["Friday", "Saturday"]
      },
      "pricing": {
        "entryFee": 0,
        "priceRange": "$$",
        "currency": "USD"
      },
      "aiTags": ["cocktails", "live-dj", "rooftop", "speakeasy"]
    }
  ]
}

IMPORTANT: Return 25-35 REAL venues. Keep descriptions CONCISE (50-80 words). Mix categories and price ranges.`;

export const EVENTS_USER_PROMPT = (
  cityName: string,
  country: string,
  weekStartDate: string,
  weekEndDate: string
): string => `Generate 10-15 weekly EVENTS in ${cityName}, ${country} for ${weekStartDate} to ${weekEndDate}.

Types: DJ nights, live concerts, comedy shows, themed parties, trivia nights, brunch events

Return JSON:
{
  "events": [
    {
      "type": "event",
      "eventName": "Event name",
      "venueName": "Venue hosting it",
      "title": "Catchy title",
      "description": "40-60 word description of the event",
      "category": "DJ Night|Live Music|Comedy|Themed Party|Trivia|Brunch",
      "eventDate": "YYYY-MM-DD",
      "location": {
        "address": "Venue address",
        "neighborhood": "Area",
        "latitude": 0.0,
        "longitude": 0.0
      },
      "schedule": {
        "date": "YYYY-MM-DD",
        "startTime": "21:00",
        "endTime": "02:00",
        "dayOfWeek": "Friday"
      },
      "pricing": {
        "ticketPrice": 25,
        "priceRange": "$$",
        "currency": "USD"
      },
      "aiTags": ["dance", "live-music", "comedy"]
    }
  ]
}

CRITICAL REQUIREMENTS:
1. Dates must be between ${weekStartDate} and ${weekEndDate}
2. dayOfWeek MUST match eventDate exactly (e.g., if eventDate is a Saturday, dayOfWeek must be "Saturday")
3. If the title mentions a day (e.g., "Friday Night Live"), the eventDate MUST be on that day
   - WRONG: Title "Friday Night Live" with eventDate on Saturday
   - CORRECT: Title "Friday Night Live" with eventDate on an actual Friday
4. Do NOT create titles with day names unless the eventDate falls on that exact day`;
