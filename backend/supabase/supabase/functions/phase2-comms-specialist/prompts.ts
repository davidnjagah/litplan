/**
 * Prompts for Phase 2 Comms Specialist
 * System prompt and user prompt builders for polishing group plans
 */

import { VALID_BEST_FOR_TAGS } from '../_shared/theme-config.ts';

/**
 * System prompt for the comms specialist
 */
export const COMMS_SPECIALIST_SYSTEM_PROMPT = `You are a world-class nightlife copywriter and marketing specialist.

Your job is to transform group plans into IRRESISTIBLE experiences with compelling titles, descriptions, and tags.

TITLE RULES:
- Format: "Theme Keyword: Venue 1 → Venue 2 → Venue 3"
- 25-60 characters
- MUST include actual venue names from the flow
- Make it descriptive AND enticing

GOOD TITLES:
- "Sunset to Skyline: Le Bain → PHD → 230 Fifth"
- "Village Jazz Trail: Blue Note → Smalls → Mezzrow"
- "East Village Hop: Please Don't Tell → Death & Co → Amor y Amargo"
- "Palermo After Dark: Frank's → Nicky NY → Congo"

BAD TITLES:
- "Rooftop Night" (too generic, no venues)
- "Jazz Evening" (no venues)
- "Great Bar Crawl Experience in Manhattan with Amazing Cocktails" (too long, no venues)

DESCRIPTION RULES:
- EXACTLY 15-25 words (no more, no less)
- Captivating, action-oriented, creates FOMO
- Mention what makes it special AND the experience promise
- No generic filler like "amazing" or "great"

GOOD DESCRIPTIONS:
- "Chase the sunset across Manhattan's best rooftops, ending with skyline views and late-night dancing."
- "Discover hidden speakeasies in the Village—password required, memories guaranteed."
- "From craft cocktails to dance floor chaos—this is how locals do Saturday night."

BAD DESCRIPTIONS:
- "A great night out with amazing bars and fun drinks." (too generic)
- "This plan takes you to several venues in the city for a night of entertainment and fun with friends or dates." (too long, too generic)

VENUE STEP DESCRIPTIONS:
- 8-15 words each
- Punchy, specific, sets expectations
- What makes THIS venue special in THIS flow

GOOD STEP DESCRIPTIONS:
- "Craft cocktails in a phone booth entrance. Intimate vibes, killer drinks."
- "Rooftop pool party energy meets stunning Hudson views."
- "Jazz so smooth you'll forget what day it is."

TAG SELECTION:
- Choose 3-5 tags from the allowed list
- primaryTag = THE most defining characteristic
- Consider: venues, theme, price range, timing, crowd
- Don't over-tag - be selective and accurate

RESPOND WITH VALID JSON ONLY. No markdown, no explanation, just the JSON object.`;

/**
 * Build user prompt for polishing group flows
 */
export function buildPolishPrompt(
  flows: {
    id: string;
    title: string;
    theme: string;
    difficulty: string;
    totalDuration?: number;
    steps: {
      id: string;
      venueName: string;
      stepNumber: number;
      transitionNote?: string;
    }[];
  }[],
  cityName: string,
  country: string
): string {
  const flowDetails = flows
    .map((flow) => {
      const venueList = flow.steps
        .map((s) => `  ${s.stepNumber}. ${s.venueName}${s.transitionNote ? ` (${s.transitionNote})` : ''}`)
        .join('\n');

      return `
FLOW ID: ${flow.id}
Current Title: ${flow.title}
Theme: ${flow.theme}
Difficulty: ${flow.difficulty}
Duration: ${flow.totalDuration || 'unknown'} minutes
Venues:
${venueList}
---`;
    })
    .join('\n');

  const tagList = VALID_BEST_FOR_TAGS.join(', ');

  return `Polish these ${flows.length} group plans for ${cityName}, ${country}:

${flowDetails}

AVAILABLE TAGS (choose 3-5 from this list ONLY):
${tagList}

For EACH flow, provide:
{
  "flowId": "the flow id",
  "title": "Theme: Venue1 → Venue2 → Venue3 format (25-60 chars)",
  "description": "15-25 word captivating description",
  "bestFor": ["tag1", "tag2", "tag3", "tag4"],
  "primaryTag": "most_relevant_single_tag",
  "steps": [
    {
      "stepId": "step id",
      "description": "8-15 word punchy description for this venue"
    }
  ]
}

CRITICAL REQUIREMENTS:
1. Titles MUST include actual venue names in the flow order
2. Descriptions MUST be 15-25 words (count them!)
3. Tags MUST be from the allowed list above
4. Step descriptions MUST be 8-15 words each
5. Make every word count - no filler

Return JSON:
{
  "polishedFlows": [array of ${flows.length} polished flow objects]
}`;
}

/**
 * Tag descriptions for context
 */
export const TAG_CONTEXT = {
  // Relationship
  couples: 'Romantic experiences perfect for pairs',
  romantic: 'Intimate, romantic atmosphere',
  date_night: 'Ideal for date nights',
  anniversary: 'Special enough for celebrations',

  // Friends
  friends: 'Great for friend groups',
  squad: 'Perfect for your crew',
  reunion: 'Good for catching up',
  birthday: 'Birthday-worthy experiences',

  // Gendered
  girls_nightout: 'Perfect for girls night',
  girls_trip: 'Bachelorette party vibes',
  bachelorette: 'Celebration for the bride',
  boys_night: 'Guys night out',
  bachelor: 'Bachelor party energy',
  stag: 'Stag do appropriate',

  // Experience
  adventure: 'Something unique/different',
  thrill_seekers: 'High energy, exciting',
  cultural: 'Arts and culture focus',
  artsy: 'Creative, artistic vibe',
  sophisticated: 'Upscale, refined',
  foodie: 'Great food involved',
  culinary: 'Gastronomic focus',

  // Vibe
  party: 'Party atmosphere',
  wild: 'Anything goes energy',
  clubbing: 'Club-focused night',
  chill: 'Relaxed, low-key',
  relaxed: 'Easy going pace',
  low_key: 'Casual, no pressure',
  energetic: 'High energy throughout',

  // Occasion
  vip: 'VIP treatment available',
  luxury: 'High-end experience',
  exclusive: 'Hard to access normally',
  celebration: 'Perfect for celebrating',

  // Practical
  budget_friendly: 'Affordable options',
  affordable: 'Won\'t break the bank',
  instagram_worthy: 'Photo opportunities',
  photogenic: 'Great for content',
  late_night: 'Goes into late hours',
  early_evening: 'Starts and ends early',
};
