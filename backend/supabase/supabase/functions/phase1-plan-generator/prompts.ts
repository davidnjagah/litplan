/**
 * Prompts for Phase 1 Plan Generator
 * System prompt and user prompt builders for batch plan generation
 */

/**
 * System prompt for plan generation with inline validation
 */
export const PLAN_GENERATOR_SYSTEM_PROMPT = `You are an expert nightlife and entertainment curator with deep knowledge of venues, events, and local scenes in cities worldwide.

Your job is to generate ACCURATE, DETAILED, and VALIDATED plans for venues and events in a specific city.

CRITICAL REQUIREMENTS FOR EVERY PLAN:

1. ACCURACY
   - Only include REAL venues that actually exist
   - Use EXACT addresses with street number, street name, and neighborhood
   - Coordinates MUST be accurate and within the city bounds
   - Never invent fake venue names or addresses

2. DESCRIPTION QUALITY
   - Minimum 80 words for venues, 50 words for events
   - Include: atmosphere, unique features, crowd type, what makes it special
   - Be specific and evocative, not generic
   - No filler phrases like "popular spot" or "great place"

3. VALIDATION (Self-check each plan)
   - Is this a real venue I'm confident exists?
   - Is the address format correct and specific?
   - Are the coordinates accurate for this location?
   - Is the pricing realistic for this venue type?
   - Is the schedule accurate for this city's culture?

4. DIVERSITY
   - Mix of price ranges ($ to $$$$)
   - Mix of crowd types (young professionals, tourists, locals, etc.)
   - Mix of vibes (energetic, chill, sophisticated, wild, etc.)
   - Coverage of different neighborhoods

5. LOCAL KNOWLEDGE
   - Capture what makes each venue unique to this city
   - Include insider tips that locals would know
   - Reflect the city's nightlife culture and timing

QUALITY SCORE: Rate each plan 0-100 based on accuracy, completeness, and appeal.
Only include plans with qualityScore >= 75.

RESPOND WITH VALID JSON ONLY. No markdown, no explanation, just the JSON object.`;

/**
 * Build user prompt for venues batch generation
 */
export function buildVenuesBatchPrompt(
  cityName: string,
  country: string,
  count: number,
  categories: string[],
  focus: string,
  neighborhoods: string[],
  currency: string
): string {
  const neighborhoodList = neighborhoods.length > 0
    ? `Key neighborhoods to cover: ${neighborhoods.slice(0, 10).join(', ')}`
    : 'Cover diverse neighborhoods across the city';

  return `Generate ${count} UNIQUE nightlife venues in ${cityName}, ${country}.

FOCUS: ${focus}
CATEGORIES TO INCLUDE: ${categories.join(', ')}
${neighborhoodList}
CURRENCY: ${currency}

For EACH venue, provide a complete JSON object with:

{
  "venueName": "Exact venue name",
  "title": "Engaging title for the plan (e.g., 'Rooftop Cocktails at Le Bain')",
  "address": "Full street address with number, street, neighborhood",
  "neighborhood": "Neighborhood name",
  "coordinates": {
    "lat": latitude as decimal number,
    "lng": longitude as decimal number
  },
  "description": "Detailed 80+ word description covering atmosphere, unique features, crowd, experience",
  "category": "venue category from the list",
  "weekday": "Best day to visit (Monday through Sunday)",
  "startTime": "Typical opening time in HH:MM format",
  "endTime": "Typical closing time in HH:MM format",
  "bestNights": ["Friday", "Saturday"],
  "priceRange": "$ or $$ or $$$ or $$$$",
  "entryFee": number or null if no cover,
  "currency": "${currency}",
  "themes": ["theme1", "theme2", "theme3"],
  "vibes": ["vibe1", "vibe2"],
  "crowdType": "typical crowd description",
  "durationMinutes": typical visit duration in minutes,
  "qualityScore": self-assessed score 0-100
}

REQUIREMENTS:
- All ${count} venues must be UNIQUE (no duplicates)
- All venues must ACTUALLY EXIST in ${cityName}
- Descriptions must be 80+ words each
- Include accurate coordinates within ${cityName} city limits
- Mix of price ranges and neighborhoods
- Each venue must have qualityScore >= 75

Return JSON:
{
  "plans": [array of ${count} venue objects]
}`;
}

/**
 * Build user prompt for events batch generation
 */
export function buildEventsBatchPrompt(
  cityName: string,
  country: string,
  count: number,
  categories: string[],
  weekStartDate: string,
  weekEndDate: string,
  neighborhoods: string[],
  currency: string
): string {
  const neighborhoodList = neighborhoods.length > 0
    ? `Key areas: ${neighborhoods.slice(0, 8).join(', ')}`
    : '';

  return `Generate ${count} WEEKLY EVENTS happening in ${cityName}, ${country} during the week of ${weekStartDate} to ${weekEndDate}.

EVENT TYPES TO INCLUDE: ${categories.join(', ')}
${neighborhoodList}
CURRENCY: ${currency}

For EACH event, provide a complete JSON object with:

{
  "venueName": "Venue hosting the event",
  "title": "Event title (e.g., 'Jazz Night at Blue Note')",
  "address": "Full street address of venue",
  "neighborhood": "Neighborhood name",
  "coordinates": {
    "lat": latitude as decimal number,
    "lng": longitude as decimal number
  },
  "description": "Detailed 50+ word description of the event, what to expect, why it's special",
  "category": "event category",
  "weekday": "Day of the event (e.g., 'Friday')",
  "eventDate": "YYYY-MM-DD date within ${weekStartDate} to ${weekEndDate}",
  "startTime": "Event start time HH:MM",
  "endTime": "Event end time HH:MM",
  "bestNights": ["the event day"],
  "priceRange": "$ or $$ or $$$ or $$$$",
  "entryFee": ticket/cover price or null if free,
  "currency": "${currency}",
  "themes": ["theme1", "theme2"],
  "vibes": ["vibe1", "vibe2"],
  "crowdType": "typical attendees",
  "durationMinutes": expected event duration,
  "qualityScore": self-assessed score 0-100
}

REQUIREMENTS:
- All ${count} events must be UNIQUE
- Events must be plausible recurring events OR special events for this week
- eventDate MUST be between ${weekStartDate} and ${weekEndDate}
- Descriptions must be 50+ words each
- Include accurate coordinates
- Mix of event types and price points
- Each event must have qualityScore >= 75

TYPES OF EVENTS TO CONSIDER:
- Weekly recurring nights (DJ nights, live music, trivia, etc.)
- Special themed parties
- Pop-up events
- Club nights with specific DJs/acts
- Food & drink events
- Cultural events (art openings, performances)
- Seasonal celebrations

Return JSON:
{
  "plans": [array of ${count} event objects]
}`;
}

/**
 * Categories mapping for validation
 */
export const VALID_CATEGORIES = [
  // Drinking venues
  'bar',
  'cocktail_bar',
  'wine_bar',
  'beer_garden',
  'pub',
  'dive_bar',
  'sports_bar',
  'rooftop_bar',
  'sky_bar',
  'terrace_bar',

  // Nightlife
  'nightclub',
  'club',
  'dance_club',
  'mega_club',
  'lounge',
  'after_hours',

  // Special
  'speakeasy',
  'hidden_bar',
  'secret_bar',

  // Entertainment
  'live_music',
  'concert_venue',
  'music_venue',
  'jazz_club',
  'jazz_bar',

  // Cultural
  'cultural',
  'theater',
  'gallery',
  'art_bar',
  'cabaret',

  // Dining
  'restaurant',
  'food_hall',
  'tapas_bar',

  // Water
  'boat_party',
  'yacht',
  'cruise',
  'floating_bar',

  // Events
  'weekly_event',
  'pop_up',
  'special_night',
  'festival',
  'party',
  'concert',
];
