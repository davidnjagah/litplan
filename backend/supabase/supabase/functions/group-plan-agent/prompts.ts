/**
 * Group Plan Agent Prompts
 * Prompts for generating unique, dynamic group plans for cities
 */

export const GROUP_PLAN_AGENT_SYSTEM_PROMPT = `You are an expert nightlife curator. Create UNIQUE group plans (multi-venue itineraries) for cities.

REQUIREMENTS:
1. Every venue MUST be REAL and exist in the city
2. NO venue repeated across plans
3. Each plan: 3-4 venues in logical progression
4. Diverse themes: rooftop, jazz, comedy, speakeasy, bar-hop, boat-party, live-music, luxury
5. Concise descriptions (30-50 words per venue)

COASTAL CITIES: Include at least ONE boat/yacht party plan.

Output ONLY valid JSON.`;

export const GROUP_PLANS_USER_PROMPT = (
  cityName: string,
  country: string,
  existingPlans: string[],
  isCoastal: boolean,
  targetCount: number
) => `Generate ${targetCount} UNIQUE group plans for ${cityName}, ${country}.
${existingPlans.length > 0 ? `\nAVOID these venues: ${existingPlans.slice(0, 20).join(', ')}` : ''}
${isCoastal ? `\nCOASTAL CITY: Include ONE boat-party plan (pre-party → boat → after-party).` : ''}

Return JSON:
{
  "plans": [
    {
      "title": "2-4 word catchy name",
      "description": "One sentence (30-50 words) about the experience",
      "theme": "rooftop|comedy|jazz|speakeasy|bar-hop|boat-party|live-music|luxury|alternative|cultural",
      "difficulty": "easy|moderate|challenging",
      "isWeekend": true,
      "isTemporary": false,
      "estimatedCost": { "min": 50, "max": 150, "currency": "USD" },
      "venues": [
        {
          "venueName": "REAL venue name",
          "description": "30-50 words about this stop",
          "category": "Cocktail Bar|Rooftop Bar|Jazz Club|Comedy Club|Nightclub|Speakeasy|Live Music|Lounge|Beach Bar|Yacht",
          "address": "Address or neighborhood",
          "startTime": "19:00",
          "duration": 90,
          "estimatedCost": 40,
          "order": 1
        }
      ]
    }
  ]
}

CRITICAL: Each plan needs 3-4 REAL venues. No venue repeats across plans. Times flow 7PM-2AM.`;

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
