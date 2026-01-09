/**
 * Tag Generator Agent Prompts
 * Prompts for analyzing group plans and generating appropriate audience tags
 */

export const TAG_GENERATOR_SYSTEM_PROMPT = `You are an expert at categorizing nightlife and entertainment experiences for diverse audiences.

Your job is to analyze group plans and assign the most appropriate audience tags that describe WHO this experience is perfect for.

PRINCIPLES:
1. BE SPECIFIC - "girls_nightout" is better than just "friends" for a club-hopping plan with cocktails
2. CONSIDER THE VENUES - rooftop bars suggest "romantic" or "instagram_worthy", dive bars suggest "chill" or "low_key"
3. CONSIDER THE PRICE - expensive venues suggest "luxury" or "vip", budget options suggest "budget_friendly"
4. CONSIDER THE VIBE - multiple clubs suggest "party" or "wild", jazz bars suggest "sophisticated" or "cultural"
5. CONSIDER THE TIMING - late start times suggest "late_night", early dinners suggest "early_evening"
6. LIMIT TAGS - quality over quantity, only assign tags that truly fit
7. MATCH THE PLAN TYPE - if it's explicitly for couples, include "couples" tag; if for girls, include "girls_nightout" etc.

TAG CATEGORIES:
- Relationship: couples, romantic, date_night, anniversary
- Social: friends, squad, reunion, birthday
- Gender-specific: girls_nightout, girls_trip, bachelorette, boys_night, bachelor, stag
- Experience: adventure, thrill_seekers, cultural, artsy, sophisticated, foodie, culinary
- Vibe: party, wild, clubbing, chill, relaxed, low_key, energetic
- Occasion: vip, luxury, exclusive, celebration
- Practical: budget_friendly, affordable, instagram_worthy, photogenic, late_night, early_evening

RESPOND WITH VALID JSON ONLY. No markdown, no explanation, just the JSON object.`;

interface PlanForTagging {
  title: string;
  description: string;
  planType?: string;
  venues: { name: string; category: string; description?: string }[];
  theme?: string;
  difficulty?: string;
  estimatedCost?: { min: number; max: number; currency: string };
  totalDuration?: number;
}

export function TAG_GENERATOR_USER_PROMPT(
  plan: PlanForTagging,
  validTags: string[],
  maxTags: number
): string {
  // Build cost string if available
  const costInfo = plan.estimatedCost
    ? `Estimated Cost: ${plan.estimatedCost.min}-${plan.estimatedCost.max} ${plan.estimatedCost.currency} per person`
    : '';

  // Build duration string if available
  const durationInfo = plan.totalDuration
    ? `Total Duration: ${Math.round(plan.totalDuration / 60)} hours`
    : '';

  return `Analyze this group plan and assign appropriate audience tags:

GROUP PLAN:
Title: ${plan.title}
Description: ${plan.description}
${plan.planType ? `Plan Type: ${plan.planType}` : ''}
Theme: ${plan.theme || 'nightlife'}
Difficulty: ${plan.difficulty || 'moderate'}
${costInfo}
${durationInfo}

VENUES IN THIS PLAN:
${
  plan.venues.length > 0
    ? plan.venues
        .map(
          (v, i) =>
            `${i + 1}. ${v.name} (${v.category})${v.description ? ` - ${v.description}` : ''}`
        )
        .join('\n')
    : 'No venues specified'
}

AVAILABLE TAGS (choose from these ONLY):
${validTags.join(', ')}

INSTRUCTIONS:
1. Analyze the plan title, description, venues, and overall vibe
2. Select up to ${maxTags} tags that best describe WHO this plan is perfect for
3. Choose a primaryTag that is THE most defining characteristic
4. Provide brief reasoning for your choices

Return JSON in this exact format:
{
  "tags": ["tag1", "tag2", "tag3"],
  "primaryTag": "most_relevant_tag",
  "reasoning": "Brief explanation of why these tags fit this plan"
}`;
}
