/**
 * Prompts for Phase 2 Group Composer
 * System prompt and user prompt builders for group plan composition
 */

/**
 * System prompt for group plan composition
 */
export const GROUP_COMPOSER_SYSTEM_PROMPT = `You are an expert nightlife curator and group experience designer.

Your job is to compose AMAZING group plans (multi-venue experiences) from individual venue/event plans.

COMPOSITION PRINCIPLES:

1. FLOW & PROGRESSION
   - Create natural evening progressions (early drinks → dinner → late night)
   - Build energy appropriately (start mellow, build up, or maintain consistent vibe)
   - Consider venue operating hours and optimal visit times

2. COMPATIBILITY
   - Group venues by compatible vibes and crowd types
   - Ensure price ranges are similar within a flow (no $$$ to $ jumps)
   - Keep geography in mind - walkable routes or reasonable transit

3. THEMES
   - Each flow should have a clear, appealing theme
   - Popular themes: rooftop hop, jazz trail, speakeasy crawl, bar hop, club night
   - The theme should be evident from the venue selection

4. DIFFICULTY LEVELS
   - Easy: 2-3 hours, 2 venues, simple progression
   - Moderate: 3-5 hours, 2-3 venues, some planning needed
   - Challenging: 5+ hours, 3-4 venues, full night commitment

5. DIVERSITY
   - Create variety across all flows (different themes, neighborhoods, vibes)
   - Don't repeat venues across multiple flows
   - Cover different price points and experiences

6. TRANSITIONS
   - Provide helpful transition notes between venues
   - Consider walking time, taxi/uber availability
   - Make the logistics feel seamless

RESPOND WITH VALID JSON ONLY. No markdown, no explanation, just the JSON object.`;

/**
 * Build user prompt for group composition
 */
export function buildCompositionPrompt(
  cityName: string,
  country: string,
  plans: {
    id: string;
    venueName: string;
    category: string;
    neighborhood: string;
    priceRange: string;
    weekday: string;
    startTime: string;
    endTime: string;
    vibes: string[];
    themes: string[];
    duration: number;
    isEvent: boolean;
  }[],
  topThemes: string[],
  topNeighborhoods: string[],
  targetFlows: number
): string {
  // Organize plans by category for easier reference
  const plansByCategory: Record<string, typeof plans> = {};
  for (const plan of plans) {
    if (!plansByCategory[plan.category]) {
      plansByCategory[plan.category] = [];
    }
    plansByCategory[plan.category].push(plan);
  }

  const categoryOverview = Object.entries(plansByCategory)
    .map(([cat, catPlans]) => `- ${cat}: ${catPlans.length} venues`)
    .join('\n');

  const planList = plans
    .map(
      (p) =>
        `[${p.id}] ${p.venueName} | ${p.category} | ${p.neighborhood} | ${p.priceRange} | ${p.startTime}-${p.endTime} | ${p.duration}min${p.isEvent ? ' | EVENT' : ''}`
    )
    .join('\n');

  return `Create ${targetFlows} GROUP PLANS for ${cityName}, ${country} using these individual venues:

AVAILABLE PLANS BY CATEGORY:
${categoryOverview}

SUGGESTED THEMES (based on available venues): ${topThemes.join(', ')}
KEY NEIGHBORHOODS: ${topNeighborhoods.join(', ')}

ALL AVAILABLE VENUES:
${planList}

REQUIREMENTS:
1. Create exactly ${targetFlows} unique group plans
2. Each plan must have 2-4 venues (use plan IDs exactly as shown)
3. Mix of difficulty levels: at least 1 easy, ${Math.floor(targetFlows / 2)} moderate, rest challenging
4. Each theme should be used at most once
5. Don't repeat venues across different flows
6. Provide realistic transition notes between venues

For EACH group plan, return:
{
  "title": "Theme-based title with venue hint (e.g., 'Jazz Night: Blue Note to Smalls')",
  "theme": "rooftop | jazz | bar-hop | speakeasy | club-night | live-music | cultural | dinner-drinks",
  "difficulty": "easy | moderate | challenging",
  "planIds": ["id1", "id2", "id3"],
  "steps": [
    {
      "planId": "id1",
      "order": 1,
      "venueName": "Venue Name",
      "transitionNote": "Start here for sunset cocktails",
      "suggestedDuration": 90
    },
    {
      "planId": "id2",
      "order": 2,
      "venueName": "Next Venue",
      "transitionNote": "5 minute walk through the Village",
      "suggestedDuration": 60
    }
  ],
  "totalDuration": total minutes,
  "neighborhoodFocus": "Primary neighborhood",
  "priceRange": "Combined price range"
}

Return JSON:
{
  "groupFlows": [array of ${targetFlows} group plan objects]
}`;
}

/**
 * Theme descriptions for prompting
 */
export const THEME_DESCRIPTIONS = {
  rooftop: 'Multiple rooftop venues with views and outdoor vibes',
  jazz: 'Live jazz venues and intimate music spots',
  'bar-hop': 'Multiple bars in a neighborhood, variety of drinks',
  speakeasy: 'Hidden bars, secret entrances, craft cocktails',
  'club-night': 'Nightclubs and dance venues, late night energy',
  'live-music': 'Concert venues, music halls, live performances',
  cultural: 'Art venues, theaters, cultural experiences',
  'dinner-drinks': 'Start with dinner, progress to drinks/nightlife',
  'foodie-crawl': 'Multiple food/drink spots, culinary exploration',
  'boat-party': 'Water-based venues, unique floating experiences',
};

/**
 * Transition note templates
 */
export const TRANSITION_TEMPLATES = {
  walkable: [
    '5 minute walk down [street]',
    'Quick stroll through [neighborhood]',
    'Just around the corner',
    'Easy 3 minute walk',
    '10 minute scenic walk along [landmark]',
  ],
  transit: [
    'Quick 10 minute Uber',
    'Short taxi ride across town',
    '15 minute ride to [area]',
    'Jump in a cab to the next spot',
  ],
  same_venue: [
    'Head upstairs to the rooftop',
    'Move to the back room',
    'The nightclub opens at 11pm in the same building',
  ],
  start: [
    'Start your evening here',
    'Begin with sunset views',
    'Perfect spot to kick things off',
    'Meet up here for the first round',
  ],
  end: [
    'End the night dancing',
    'Perfect finale to the evening',
    'The ultimate last stop',
    'Close out the night in style',
  ],
};
