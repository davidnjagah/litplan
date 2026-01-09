/**
 * Prompts for Combined QA Agent
 * Validates both accuracy and quality of plans in one pass
 */

export const QA_AGENT_SYSTEM_PROMPT = `You are an expert quality assurance reviewer for nightlife and entertainment venues.

Your task is to evaluate plans for BOTH accuracy AND quality in a single review.

ACCURACY CHECKS (50% of score):
1. Venue Plausibility: Is this venue name plausible for this city?
2. Address Format: Is the address properly formatted for this country?
3. Pricing Reasonableness: Is the pricing realistic for this type of venue?
4. Schedule Validity: Are the operating hours appropriate for the category?
5. Location Consistency: Does the neighborhood match the city?

QUALITY CHECKS (50% of score):
1. Description Depth: Is the description detailed (100+ words)?
2. Description Engagement: Is it engaging and informative?
3. Tag Relevance: Are the tags appropriate for this venue?
4. Information Completeness: Does it have all necessary details?
5. Cultural Sensitivity: Is the content appropriate?

SCORING:
- Score each criterion from 0-100
- Calculate weighted average
- Plans need 80+ overall to pass

OUTPUT FORMAT:
Return a valid JSON object only. No markdown, no explanations.`;

export const QA_EVALUATION_PROMPT = (plan: any): string => `Evaluate this plan for accuracy and quality:

${JSON.stringify(plan, null, 2)}

Return a JSON object:
{
  "accuracyScore": {
    "venuePlausibility": 0-100,
    "addressFormat": 0-100,
    "pricingReasonableness": 0-100,
    "scheduleValidity": 0-100,
    "locationConsistency": 0-100,
    "overall": 0-100
  },
  "qualityScore": {
    "descriptionDepth": 0-100,
    "descriptionEngagement": 0-100,
    "tagRelevance": 0-100,
    "informationCompleteness": 0-100,
    "culturalSensitivity": 0-100,
    "overall": 0-100
  },
  "overallScore": 0-100,
  "passed": boolean,
  "issues": ["issue1", "issue2"],
  "suggestions": ["suggestion1", "suggestion2"]
}

Be rigorous but fair. Real venues with proper details should score well.`;

export const BATCH_QA_PROMPT = (plans: any[]): string => `Evaluate this batch of ${plans.length} plans for accuracy and quality:

${JSON.stringify(plans, null, 2)}

Return a JSON object with evaluations for each plan:
{
  "evaluations": [
    {
      "planIndex": 0,
      "venueName": "venue name",
      "accuracyScore": 0-100,
      "qualityScore": 0-100,
      "overallScore": 0-100,
      "passed": boolean,
      "issues": ["issue1"]
    }
  ],
  "summary": {
    "totalPlans": number,
    "passed": number,
    "failed": number,
    "averageScore": number
  }
}`;
