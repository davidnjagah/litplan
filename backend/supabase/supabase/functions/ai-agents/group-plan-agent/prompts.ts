/**
 * Group Plan Agent Prompts
 * Prompts for generating unique, dynamic group plans for cities
 */

export const GROUP_PLAN_AGENT_SYSTEM_PROMPT = `You are an expert nightlife curator and local guide. Your job is to create UNIQUE, high-quality group plans (multi-venue itineraries) for cities around the world.

CRITICAL REQUIREMENTS:
1. Every venue in your plans MUST be a REAL, SPECIFIC establishment that exists
2. NO venue can appear in more than ONE group plan for the same city
3. Use actual addresses or neighborhoods
4. Each plan should have 2-4 venues in logical progression
5. Plans should be diverse: rooftop bars, jazz clubs, comedy venues, speakeasies, boat parties, etc.
6. Include realistic pricing estimates and typical hours

QUALITY STANDARDS:
- Descriptions must be engaging and specific (50+ words per venue)
- Include local insider knowledge
- Consider walkability and logical progression
- Account for typical opening hours and crowds

COASTAL CITY BONUS:
For cities on coastlines (Miami, Barcelona, Sydney, etc.), include at least ONE boat/yacht party plan with:
- Pre-party venue (beach bar, waterfront restaurant)
- Boat/yacht party or harbor cruise
- After-party venue (club, late-night bar)

Output ONLY valid JSON. No markdown, no explanation.`;

export const GROUP_PLANS_USER_PROMPT = (
  cityName: string,
  country: string,
  existingPlans: string[],
  isCoastal: boolean,
  targetCount: number
) => `Generate ${targetCount} UNIQUE group plans for ${cityName}, ${country}.

${existingPlans.length > 0 ? `
EXISTING PLANS TO AVOID (do not use these venue names):
${existingPlans.join('\n')}
` : ''}

${isCoastal ? `
${cityName} is a COASTAL CITY. Include at least ONE "boat party" or "yacht party" themed plan with:
- Pre-party at a waterfront venue
- Day boat party, yacht cruise, or harbor party
- After-party at a nightclub or late-night bar
` : ''}

For each group plan, provide this JSON structure:
{
  "plans": [
    {
      "title": "Catchy 2-4 word name (e.g., 'Ultimate Night Out', 'Jazz & Cocktails')",
      "description": "One compelling sentence about the experience (50+ words)",
      "theme": "one of: rooftop, comedy, jazz, speakeasy, bar-hop, boat-party, cultural, live-music, alternative, luxury",
      "difficulty": "easy | moderate | challenging",
      "isWeekend": true/false,
      "isTemporary": false,
      "estimatedCost": {
        "min": number (USD),
        "max": number (USD),
        "currency": "USD"
      },
      "venues": [
        {
          "venueName": "REAL establishment name",
          "description": "What makes this place special (50+ words)",
          "category": "Cocktail Bar | Rooftop Bar | Jazz Club | Comedy Club | Nightclub | Speakeasy | Live Music | Lounge | Beach Bar | Yacht",
          "address": "Street address or neighborhood",
          "startTime": "HH:MM (24hr format)",
          "duration": number (minutes, 60-120),
          "estimatedCost": number (USD per person),
          "order": 1, 2, 3, etc.
        }
      ]
    }
  ]
}

IMPORTANT:
- Each plan MUST have unique venues not used in any other plan
- Times should flow naturally (start 7-9PM, end 1-3AM)
- Use REAL venues that exist in ${cityName}
- Include insider tips in descriptions`;

export const UPDATE_GROUP_PLAN_PROMPT = (
  cityName: string,
  country: string,
  existingPlan: {
    title: string;
    description: string;
    venues: Array<{ venueName: string; category: string }>;
  }
) => `Review and update this existing group plan for ${cityName}, ${country}.

EXISTING PLAN:
Title: ${existingPlan.title}
Description: ${existingPlan.description}
Venues: ${existingPlan.venues.map(v => `${v.venueName} (${v.category})`).join(', ')}

Please provide updated information for this plan:
1. Are these venues still operating? If not, suggest replacements.
2. Update any pricing information (entry fees, typical spending)
3. Update hours if they've changed
4. Improve descriptions with current insider knowledge

Output JSON with the structure:
{
  "needsUpdate": boolean,
  "updatedPlan": {
    "title": "...",
    "description": "...",
    "venues": [...]
  },
  "changes": ["list of what changed"]
}`;
