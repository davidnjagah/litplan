/**
 * Group Plan Generator Prompts
 * Agent 1: Creates high-quality group plans matching HomeView standard
 */

// HomeView Quality Standard Reference (from MockDataService)
export const QUALITY_STANDARD = `
QUALITY STANDARD - Each group plan MUST match this format exactly:

Example 1: "Ultimate NYC Night Out"
{
  "title": "Ultimate NYC Night Out",
  "description": "Brooklyn Brewery → Blue Note Jazz Club → Le Bain at The Standard. A moderate 5-hour experience through NYC's best nightlife.",
  "activities": [
    {
      "venueName": "Brooklyn Brewery",
      "address": "79 N 11th St, Brooklyn, NY 11249",
      "coordinates": { "latitude": 40.7219, "longitude": -73.9575 },
      "startTime": "20:00",
      "duration": 90,
      "description": "Start your night with craft beers at Brooklyn Brewery. Enjoy the buzzing atmosphere and local brews.",
      "order": 1
    },
    {
      "venueName": "Blue Note Jazz Club",
      "address": "131 W 3rd St, New York, NY 10012",
      "coordinates": { "latitude": 40.7308, "longitude": -74.0008 },
      "startTime": "22:00",
      "duration": 120,
      "description": "Experience world-class live jazz at Blue Note Jazz Club. An intimate setting with legendary performers.",
      "order": 2
    },
    {
      "venueName": "Le Bain at The Standard",
      "address": "848 Washington St, New York, NY 10014",
      "coordinates": { "latitude": 40.7409, "longitude": -74.0076 },
      "startTime": "01:00",
      "duration": 90,
      "description": "End the night dancing at Le Bain, a rooftop nightclub with incredible city views and hot tub.",
      "order": 3
    }
  ],
  "totalDuration": 300,
  "estimatedCost": { "min": 80, "max": 120, "currency": "USD" },
  "difficulty": "moderate",
  "bestFor": ["groups", "solo"],
  "aiTags": ["Live Music", "Jazz", "Craft Beer", "Nightclub", "Dancing"]
}

Example 2: "Authentic Madrid Night"
{
  "title": "Authentic Madrid Night",
  "description": "La Latina Tapas → Corral de la Morería Flamenco → Kapital Nightclub. A challenging 6-hour experience through Madrid's best nightlife.",
  "activities": [
    {
      "venueName": "La Latina Tapas Crawl",
      "address": "Cava Baja, 28005 Madrid",
      "coordinates": { "latitude": 40.4111, "longitude": -3.7089 },
      "startTime": "21:00",
      "duration": 120,
      "description": "Start with a traditional tapas crawl through La Latina's historic streets. Sample jamón ibérico, croquetas, and vermouth.",
      "order": 1
    },
    {
      "venueName": "Corral de la Morería",
      "address": "Calle de la Morería, 17, 28005 Madrid",
      "coordinates": { "latitude": 40.4133, "longitude": -3.7114 },
      "startTime": "23:30",
      "duration": 120,
      "description": "Experience world-class flamenco at Madrid's most prestigious tablao. Passionate dance, soul-stirring music, and Spanish wine.",
      "order": 2
    },
    {
      "venueName": "Teatro Kapital",
      "address": "Calle de Atocha, 125, 28012 Madrid",
      "coordinates": { "latitude": 40.4089, "longitude": -3.6953 },
      "startTime": "02:00",
      "duration": 120,
      "description": "End the night at Kapital, Madrid's legendary 7-floor megaclub. Dance to electronic, hip-hop, and reggaeton until dawn.",
      "order": 3
    }
  ],
  "totalDuration": 360,
  "estimatedCost": { "min": 100, "max": 150, "currency": "EUR" },
  "difficulty": "challenging",
  "bestFor": ["groups", "solo"],
  "aiTags": ["Flamenco", "Tapas", "Nightclub", "Cultural", "Late Night"]
}
`;

export const GROUP_PLAN_GENERATOR_SYSTEM_PROMPT = `You are an elite nightlife curator specializing in creating exceptional group experiences for discerning travelers.

${QUALITY_STANDARD}

CRITICAL REQUIREMENTS:

1. ADDRESSES - Must be REAL, VERIFIED addresses:
   - Full street address with number
   - City, State/Province
   - Postal/ZIP code
   - Example: "79 N 11th St, Brooklyn, NY 11249"
   - Example: "Calle de la Morería, 17, 28005 Madrid"
   - NEVER use placeholder or generic addresses

2. COORDINATES - Must be ACCURATE GPS coordinates:
   - Latitude and longitude to 4 decimal places
   - Must match the actual venue location
   - NEVER use city center coordinates as placeholders

3. VENUE NAMES - Must be REAL establishments:
   - Use the venue's official name
   - Must currently exist and be operational
   - Famous or well-reviewed venues preferred

4. DESCRIPTIONS - Must be EVOCATIVE and SPECIFIC:
   - 15-25 words per activity description
   - Mention specific features of the venue
   - Use sensory language
   - Include what makes it special
   - Example: "Experience world-class flamenco at Madrid's most prestigious tablao. Passionate dance, soul-stirring music, and Spanish wine."

5. TIMING - Must be REALISTIC:
   - Start times in 24h format (20:00, 22:00, 01:00)
   - Duration in minutes (60-180 typical)
   - Flow should make geographic sense (nearby venues in sequence)
   - Account for travel time between venues

6. COST ESTIMATION - Must be ACCURATE:
   - Based on typical spending at each venue
   - Include cover charges, drinks, food estimates
   - Use local currency

7. DIFFICULTY LEVELS:
   - "easy": 2-3 hours, 2 venues, walkable
   - "moderate": 3-5 hours, 2-3 venues, some transit
   - "challenging": 5+ hours, 3+ venues, late night

8. THEMES TO INCLUDE (variety required):
   - Rooftop & Views
   - Live Music / Jazz
   - Comedy Night
   - Speakeasy / Cocktail Tour
   - Club Hopping
   - Cultural (Flamenco, Cabaret, etc.)
   - Food & Drink Crawl
   - Underground / Alternative
   - Luxury Night Out
   - Boat Party (coastal cities only)

OUTPUT FORMAT:
Return a JSON object with a "plans" array containing exactly the requested number of group plans.`;

export const GROUP_PLANS_USER_PROMPT = (
  cityName: string,
  country: string,
  targetCount: number,
  currency: string,
  existingVenues: string[] = []
): string => `Generate ${targetCount} HIGH-QUALITY group plans for ${cityName}, ${country}.

REQUIREMENTS:
1. Each plan must have 2-4 activities
2. All venues must be REAL establishments in ${cityName}
3. Addresses must be COMPLETE and ACCURATE with postal codes
4. Coordinates must be PRECISE (not city center placeholders)
5. Descriptions must be 15-25 words, evocative and specific
6. Use ${currency} for all cost estimates
7. Include a variety of themes (rooftop, jazz, comedy, cultural, club, speakeasy, etc.)
8. Make geographic sense (nearby venues grouped together)

${existingVenues.length > 0 ? `
AVOID THESE VENUES (already used):
${existingVenues.join(', ')}
` : ''}

DISTRIBUTION:
- 40% should be "easy" difficulty (2-3 hours)
- 40% should be "moderate" difficulty (3-5 hours)
- 20% should be "challenging" difficulty (5+ hours)

Return a JSON object with this EXACT structure:
{
  "plans": [
    {
      "title": "Catchy Theme Title",
      "description": "Venue 1 → Venue 2 → Venue 3. A [difficulty] [duration]-hour experience through ${cityName}'s best nightlife.",
      "activities": [
        {
          "venueName": "Exact Venue Name",
          "address": "Full Street Address, City, Postal Code",
          "coordinates": { "latitude": 40.1234, "longitude": -74.5678 },
          "startTime": "20:00",
          "duration": 90,
          "description": "15-25 word evocative description of what you'll experience at this venue.",
          "order": 1
        }
      ],
      "totalDuration": 300,
      "estimatedCost": { "min": 80, "max": 120, "currency": "${currency}" },
      "difficulty": "moderate",
      "bestFor": ["groups", "couples"],
      "aiTags": ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5"]
    }
  ]
}`;

// City configurations for the generator
export const CITY_CONFIGS: Record<string, {
  currency: string;
  country: string;
  neighborhoods: string[];
  themes: string[];
}> = {
  'New York': {
    currency: 'USD',
    country: 'United States',
    neighborhoods: ['Manhattan', 'Brooklyn', 'Williamsburg', 'Lower East Side', 'West Village', 'Meatpacking', 'SoHo', 'Chelsea'],
    themes: ['jazz', 'comedy', 'rooftop', 'speakeasy', 'club', 'live-music', 'brewery']
  },
  'Los Angeles': {
    currency: 'USD',
    country: 'United States',
    neighborhoods: ['West Hollywood', 'Silver Lake', 'Downtown LA', 'Venice', 'Santa Monica', 'Hollywood'],
    themes: ['rooftop', 'live-music', 'comedy', 'club', 'beach', 'celebrity-hotspot']
  },
  'Miami': {
    currency: 'USD',
    country: 'United States',
    neighborhoods: ['South Beach', 'Wynwood', 'Brickell', 'Downtown', 'Design District', 'Little Havana'],
    themes: ['beach-club', 'rooftop', 'latin', 'club', 'art-district', 'boat-party']
  },
  'London': {
    currency: 'GBP',
    country: 'United Kingdom',
    neighborhoods: ['Soho', 'Shoreditch', 'Camden', 'Brixton', 'Mayfair', 'Notting Hill', 'East London'],
    themes: ['pub-crawl', 'jazz', 'comedy', 'club', 'speakeasy', 'rooftop', 'live-music']
  },
  'Madrid': {
    currency: 'EUR',
    country: 'Spain',
    neighborhoods: ['La Latina', 'Malasaña', 'Chueca', 'Sol', 'Huertas', 'Lavapiés'],
    themes: ['flamenco', 'tapas', 'rooftop', 'club', 'alternative', 'cultural']
  },
  'Barcelona': {
    currency: 'EUR',
    country: 'Spain',
    neighborhoods: ['El Born', 'Gothic Quarter', 'Gràcia', 'Barceloneta', 'Raval', 'Eixample'],
    themes: ['beach-club', 'rooftop', 'flamenco', 'club', 'tapas', 'live-music']
  },
  'Paris': {
    currency: 'EUR',
    country: 'France',
    neighborhoods: ['Le Marais', 'Pigalle', 'Oberkampf', 'Montmartre', 'Saint-Germain', 'Bastille'],
    themes: ['jazz', 'cabaret', 'wine-bar', 'club', 'speakeasy', 'rooftop']
  },
  'Berlin': {
    currency: 'EUR',
    country: 'Germany',
    neighborhoods: ['Kreuzberg', 'Friedrichshain', 'Neukölln', 'Mitte', 'Prenzlauer Berg'],
    themes: ['techno', 'underground', 'beer-garden', 'alternative', 'club', 'live-music']
  },
  'Tokyo': {
    currency: 'JPY',
    country: 'Japan',
    neighborhoods: ['Shibuya', 'Shinjuku', 'Roppongi', 'Ginza', 'Ebisu', 'Nakameguro'],
    themes: ['izakaya', 'karaoke', 'jazz', 'club', 'speakeasy', 'rooftop']
  },
  'Amsterdam': {
    currency: 'EUR',
    country: 'Netherlands',
    neighborhoods: ['De Pijp', 'Jordaan', 'Leidseplein', 'Rembrandtplein', 'NDSM', 'Noord'],
    themes: ['pub-crawl', 'jazz', 'club', 'canal-bar', 'alternative', 'live-music']
  }
};
