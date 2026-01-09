/**
 * Prompts for Data Integrity Agent
 * Validates addresses, corrects details, and ensures data accuracy
 * Uses OpenAI API
 */

export const DATA_INTEGRITY_SYSTEM_PROMPT = `You are a meticulous data integrity specialist focused on verifying and correcting venue and event data for a nightlife app.

Your primary responsibilities:
1. VALIDATE addresses - ensure they are real, properly formatted, and in the correct city
2. CORRECT errors - fix typos in venue names, addresses, neighborhoods
3. VERIFY coordinates - ensure latitude/longitude match the address
4. STANDARDIZE data - consistent formatting across all fields
5. FLAG issues - mark any data that cannot be verified

ADDRESS VALIDATION RULES:
- Full street address (number + street name)
- Correct city and postal code
- Neighborhood must be a real neighborhood in that city
- Format: "123 Main Street, Neighborhood, City, Postal Code, Country"

COORDINATE VALIDATION:
- Must be within the city's geographic bounds
- Must be reasonable for the given address
- Flag if coordinates don't match address location

VENUE NAME VALIDATION:
- Must be the official/legal name of the establishment
- Correct common misspellings
- Remove unofficial suffixes or prefixes

PRICING VALIDATION:
- Must be reasonable for the category and city
- Convert to USD if in different currency
- Flag unrealistic prices

OUTPUT FORMAT:
For each item, return:
- validated: boolean (passes all checks)
- corrections: object (any fixes made)
- issues: string[] (any remaining problems)
- confidence: number (0-100, your confidence in the data)`;

export const VALIDATE_PLANS_PROMPT = (cityName: string, country: string) => `Validate and correct the following plan data for ${cityName}, ${country}.

For each plan, check:
1. Is the venue name correct and real?
2. Is the address complete and accurate for ${cityName}?
3. Do the coordinates match the address?
4. Is the neighborhood a real neighborhood in ${cityName}?
5. Are the pricing and hours reasonable?
6. Is the category appropriate?

Return a JSON object with validation results:
{
  "results": [
    {
      "id": "plan-id",
      "validated": true/false,
      "corrections": {
        "venueName": "corrected name if changed",
        "address": "corrected address if changed",
        "neighborhood": "corrected neighborhood if changed",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "priceRange": "$$"
      },
      "issues": ["list of remaining issues"],
      "confidence": 85
    }
  ],
  "summary": {
    "total": 10,
    "validated": 8,
    "corrected": 5,
    "flagged": 2
  }
}

IMPORTANT:
- Only include corrections object if changes were made
- Confidence should reflect how certain you are the data is accurate
- Flag items with confidence < 70 for manual review`;

export const VALIDATE_GROUP_FLOWS_PROMPT = (cityName: string, country: string) => `Validate and correct the following group flow data for ${cityName}, ${country}.

For each group flow and its steps, check:
1. Are all venues real and correctly named?
2. Are all addresses accurate and complete?
3. Is the flow geographically sensible? (not jumping across the city)
4. Are the step times realistic for the progression?
5. Do the venues make sense for the theme?

Return a JSON object with validation results:
{
  "results": [
    {
      "flowId": "flow-id",
      "validated": true/false,
      "flowCorrections": {
        "title": "corrected title if needed"
      },
      "stepCorrections": [
        {
          "stepNumber": 1,
          "venueName": "corrected venue name",
          "address": "corrected address",
          "latitude": 40.7128,
          "longitude": -74.0060
        }
      ],
      "issues": ["geographic issues", "timing problems"],
      "confidence": 90
    }
  ],
  "summary": {
    "total": 5,
    "validated": 4,
    "corrected": 3,
    "flagged": 1
  }
}

GEOGRAPHIC VALIDATION:
- Steps should progress logically (walkable or short transit)
- Flag if steps are too far apart (> 3km without transit consideration)
- Recommend reordering if a better route exists`;

export const CITY_BOUNDS: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  'New York': { minLat: 40.4774, maxLat: 40.9176, minLng: -74.2591, maxLng: -73.7004 },
  'Los Angeles': { minLat: 33.7037, maxLat: 34.3373, minLng: -118.6682, maxLng: -118.1553 },
  'London': { minLat: 51.2867, maxLat: 51.6919, minLng: -0.5104, maxLng: 0.3340 },
  'Paris': { minLat: 48.8156, maxLat: 48.9022, minLng: 2.2242, maxLng: 2.4699 },
  'Tokyo': { minLat: 35.5300, maxLat: 35.8176, minLng: 139.5593, maxLng: 139.9102 },
  // Add more cities as needed
};
