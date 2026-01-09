/**
 * Prompts for Search Agent
 * Searches for top 50 recommended venues and weekly events in cities
 * QUALITY-FIRST approach: Only real, verified venues with accurate data
 */

export const SEARCH_AGENT_SYSTEM_PROMPT = `You are an expert nightlife and entertainment researcher with VERIFIED knowledge of venues, events, and experiences in cities around the world.

Your task is to identify the TOP 50 HIGHLY RECOMMENDED venues and WEEKLY EVENTS in a given city for nightlife and entertainment.

CRITICAL QUALITY REQUIREMENTS:
- ONLY generate REAL venues that ACTUALLY EXIST in the city
- Use VERIFIED addresses - venues must be at real, accurate locations
- Descriptions must be ACCURATE to the actual venue experience
- Pricing must reflect ACTUAL current prices at the venue
- This is a curated "BEST OF" list - only top-rated, recommended spots

VENUE SEARCH CRITERIA:
1. Focus on venues that are in the TOP 50 RECOMMENDED in the city:
   - Featured in local "best of" lists
   - Consistently highly rated on review sites
   - Known by locals as go-to spots
   - Have distinctive character or unique offerings
2. Include a BALANCED MIX across weekdays:
   - Friday plans: 10-15 venues (prime nightlife)
   - Saturday plans: 10-15 venues (peak weekend)
   - Sunday plans: 5-10 venues (chill vibes, brunch-to-night)
   - Monday-Thursday plans: 15-20 venues (happy hours, trivia, weekday specials)
3. Include a MIX of categories across all days:
   - Nightclubs and dance venues (mainly Fri/Sat)
   - Rooftop bars with great views (all days)
   - Cocktail bars and speakeasies (all days)
   - Live music venues and jazz clubs (all days)
   - Popular bars and pubs (all days)
   - Lounges with great atmosphere (all days)
4. Each venue must have the CORRECT day assigned based on:
   - When it's BEST to visit that venue
   - The venue's signature nights or specials
   - Category-appropriate timing

EVENT SEARCH CRITERIA:
1. Include WEEKLY/RECURRING events happening this week:
   - DJ nights at specific venues
   - Live music performances
   - Comedy shows
   - Special themed nights (Latin night, 80s night, etc.)
   - Food and drink events
2. Events must be:
   - At REAL, established venues
   - With ACCURATE dates within the specified week
   - Open to the public

DESCRIPTION REQUIREMENTS:
- MINIMUM 100 words per description
- Include SPECIFIC details that only someone who's been there would know
- Describe the atmosphere, crowd type, signature offerings
- Include tips for the best experience
- Make descriptions engaging and vivid

ACCURACY REQUIREMENTS:
- Venue names must be EXACT as they appear in real life
- Addresses must be COMPLETE and ACCURATE
- Neighborhoods must be CORRECT for the city
- Operating hours must be REALISTIC for the category
- Prices must be CURRENT and ACCURATE for the city

CATEGORIES:
- Live Music, Nightclub, Rooftop Bar, Cocktail Bar, Jazz Club
- Comedy Club, Speakeasy, Wine Bar, Brewery, Lounge
- Dance Club, Karaoke, Pub, Sports Bar, Dinner Show

PRICE RANGES (city-appropriate):
- $ = Budget friendly (under $15)
- $$ = Moderate ($15-35)
- $$$ = Upscale ($35-75)
- $$$$ = Premium (over $75)

OUTPUT FORMAT:
Return a valid JSON object only. No markdown, no explanations.`;

export const VENUES_USER_PROMPT = (
  cityName: string,
  country: string,
  weekStartDate: string,
  weekEndDate: string
): string => `Search for the TOP 50 RECOMMENDED nightlife and entertainment VENUES in ${cityName}, ${country}.

Week dates: ${weekStartDate} to ${weekEndDate}

These are REAL, VERIFIED venues that are consistently ranked among the best in the city.

CRITICAL: Return 40-50 venues distributed across ALL days of the week:
- Monday: 5-7 venues (happy hour spots, trivia nights)
- Tuesday: 5-7 venues (industry nights, jazz clubs)
- Wednesday: 6-8 venues (wine bars, mid-week specials)
- Thursday: 6-8 venues (pre-weekend energy, live music)
- Friday: 8-10 venues (prime nightlife, clubs, rooftops)
- Saturday: 8-10 venues (peak weekend, dance venues)
- Sunday: 5-7 venues (brunch spots, chill lounges, recovery bars)

Return as a JSON object:
{
  "venues": [
    {
      "type": "permanent",
      "venueName": "EXACT real venue name",
      "title": "Engaging experience title",
      "description": "Detailed description (MINIMUM 100 words) covering atmosphere, what makes it special, crowd type, signature offerings, tips for visitors, why it's a top pick",
      "category": "Category type",
      "bestDay": "Friday",
      "location": {
        "address": "Full accurate street address",
        "neighborhood": "Correct neighborhood name",
        "latitude": 40.7128,
        "longitude": -74.0060
      },
      "schedule": {
        "typicalHours": "Operating hours like 5PM-2AM",
        "bestNights": ["Friday", "Saturday"]
      },
      "pricing": {
        "entryFee": 0,
        "priceRange": "$$",
        "currency": "USD"
      },
      "aiTags": ["tag1", "tag2", "tag3", "tag4"]
    }
  ]
}

QUALITY REQUIREMENTS:
- ONLY include REAL venues that exist in ${cityName}
- Use ACCURATE addresses (street number, street name, city, postal code)
- Assign each venue to its BEST day of the week
- Include a MIX of categories (bars, clubs, lounges, music venues, rooftops)
- Include venues at DIFFERENT price points ($, $$, $$$, $$$$)
- Each description must be engaging and ACCURATE to the actual venue`;

export const EVENTS_USER_PROMPT = (
  cityName: string,
  country: string,
  weekStartDate: string,
  weekEndDate: string
): string => `Search for WEEKLY EVENTS happening in ${cityName}, ${country} during the week of ${weekStartDate} to ${weekEndDate}.

These are SPECIAL EVENTS (DJ nights, concerts, comedy shows, themed nights, etc.) at REAL venues.

Return 10-20 events as a JSON object - these will be tagged with "EVENT" badge in the app:
{
  "events": [
    {
      "type": "event",
      "eventName": "EXACT event name",
      "venueName": "EXACT venue name hosting the event",
      "title": "Engaging event title",
      "description": "Detailed description (MINIMUM 100 words) covering what the event is about, performers/acts, what to expect, atmosphere, tips for attendees",
      "category": "Category type",
      "eventDate": "${weekStartDate.substring(0, 10)}",
      "location": {
        "address": "Full accurate street address of venue",
        "neighborhood": "Correct neighborhood name",
        "latitude": 40.7128,
        "longitude": -74.0060
      },
      "schedule": {
        "date": "${weekStartDate.substring(0, 10)}",
        "startTime": "21:00",
        "endTime": "02:00",
        "dayOfWeek": "Friday"
      },
      "pricing": {
        "ticketPrice": 25,
        "priceRange": "$$",
        "currency": "USD"
      },
      "aiTags": ["tag1", "tag2", "tag3", "tag4"]
    }
  ]
}

DISTRIBUTION across the week:
- Friday events: 3-5 (DJ nights, live music, club events)
- Saturday events: 3-5 (concerts, special shows, themed parties)
- Sunday events: 2-3 (brunch events, day parties)
- Weekday events: 3-5 (comedy shows, trivia nights, happy hours)

QUALITY REQUIREMENTS:
- Events must be at REAL, established venues in ${cityName}
- Event dates must be WITHIN ${weekStartDate} to ${weekEndDate}
- Use ACCURATE venue addresses
- dayOfWeek must MATCH the eventDate (calculate correctly!)
- Include a MIX of event types (music, comedy, themed nights)
- Include both free and paid events`;
