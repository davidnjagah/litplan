/**
 * Quality Criteria for AI-Generated Plans
 * Defines thresholds and scoring criteria
 */

/**
 * Quality thresholds (Legacy - kept for backward compatibility)
 */
export const QUALITY_THRESHOLDS = {
  /** Minimum overall quality score to pass (0-100) */
  MINIMUM_QUALITY_SCORE: 85,

  /** Minimum accuracy score from QA Agent 1 (0-100) */
  MINIMUM_ACCURACY_SCORE: 85,

  /** Minimum content quality score from QA Agent 2 (0-100) */
  MINIMUM_CONTENT_SCORE: 85,

  /** Minimum description word count */
  MINIMUM_DESCRIPTION_WORDS: 50,

  /** Recommended description word count */
  RECOMMENDED_DESCRIPTION_WORDS: 100,

  /** Maximum plans to generate per city per week (top 50 recommended) */
  MAX_PLANS_PER_CITY_PER_WEEK: 50,

  /** Minimum plans per city per week (ensure good coverage) */
  MIN_PLANS_PER_CITY_PER_WEEK: 30,

  /** Days ahead to generate plans (1 week) */
  PLAN_DAYS_AHEAD: 7,

  /** Number of top cities to generate plans for */
  TOP_CITIES_COUNT: 50,

  /** Minimum group flows per city */
  MIN_GROUP_FLOWS_PER_CITY: 5,

  /** Maximum group flows per city */
  MAX_GROUP_FLOWS_PER_CITY: 10,
};

/**
 * V2 Pipeline Quality Thresholds
 * Optimized for 2-phase pipeline with inline validation
 */
export const QUALITY_THRESHOLDS_V2 = {
  // Phase 1: Individual Plans
  /** Target plans per city (50+ venues + events) */
  MIN_PLANS_PER_CITY: 50,
  MAX_PLANS_PER_CITY: 60,

  /** Event plans per city */
  MIN_EVENTS_PER_CITY: 10,
  MAX_EVENTS_PER_CITY: 20,

  /** Venue plans per city */
  MIN_VENUES_PER_CITY: 35,
  MAX_VENUES_PER_CITY: 45,

  /** Description quality */
  MIN_DESCRIPTION_WORDS_VENUE: 80,
  MIN_DESCRIPTION_WORDS_EVENT: 50,
  RECOMMENDED_DESCRIPTION_WORDS: 100,

  /** Inline quality score threshold */
  MIN_QUALITY_SCORE: 75,

  // Phase 2: Group Plans
  /** Group flows per city */
  MIN_GROUP_FLOWS_PER_CITY: 5,
  MAX_GROUP_FLOWS_PER_CITY: 8,

  /** Venues per group flow */
  MIN_VENUES_PER_FLOW: 2,
  MAX_VENUES_PER_FLOW: 4,

  /** Group plan description limits */
  MAX_GROUP_DESCRIPTION_WORDS: 25,
  MIN_GROUP_DESCRIPTION_WORDS: 15,

  /** Venue step description limits */
  MAX_STEP_DESCRIPTION_WORDS: 15,
  MIN_STEP_DESCRIPTION_WORDS: 8,

  /** Tags per group flow */
  MIN_TAGS_PER_FLOW: 3,
  MAX_TAGS_PER_FLOW: 5,

  // Timing targets
  /** Max time for Phase 1 (plan generation) in ms */
  MAX_PHASE1_TIME_MS: 15000,

  /** Max time for Phase 2 (group composition) in ms */
  MAX_PHASE2_TIME_MS: 12000,

  /** Target total time per city in ms */
  TARGET_CITY_TIME_MS: 27000,

  /** Max API calls per city */
  MAX_API_CALLS_PER_CITY: 5,

  // General
  /** Days ahead to generate plans */
  PLAN_DAYS_AHEAD: 7,

  /** Number of cities to process */
  TOP_CITIES_COUNT: 100,
};

/**
 * Quality scoring weights
 */
export const QUALITY_WEIGHTS = {
  /** Weight for description quality (0-1) */
  DESCRIPTION: 0.25,

  /** Weight for venue accuracy (0-1) */
  VENUE_ACCURACY: 0.25,

  /** Weight for location accuracy (0-1) */
  LOCATION: 0.15,

  /** Weight for pricing reasonableness (0-1) */
  PRICING: 0.10,

  /** Weight for tags appropriateness (0-1) */
  TAGS: 0.10,

  /** Weight for schedule validity (0-1) */
  SCHEDULE: 0.10,

  /** Weight for uniqueness/originality (0-1) */
  UNIQUENESS: 0.05,
};

/**
 * Calculate weighted quality score
 */
export function calculateQualityScore(scores: {
  description: number;
  venueAccuracy: number;
  location: number;
  pricing: number;
  tags: number;
  schedule: number;
  uniqueness: number;
}): number {
  const weightedScore =
    scores.description * QUALITY_WEIGHTS.DESCRIPTION +
    scores.venueAccuracy * QUALITY_WEIGHTS.VENUE_ACCURACY +
    scores.location * QUALITY_WEIGHTS.LOCATION +
    scores.pricing * QUALITY_WEIGHTS.PRICING +
    scores.tags * QUALITY_WEIGHTS.TAGS +
    scores.schedule * QUALITY_WEIGHTS.SCHEDULE +
    scores.uniqueness * QUALITY_WEIGHTS.UNIQUENESS;

  return Math.round(weightedScore);
}

/**
 * Check if plan passes quality gate
 */
export function passesQualityGate(
  accuracyScore: number,
  contentScore: number
): { passed: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (accuracyScore < QUALITY_THRESHOLDS.MINIMUM_ACCURACY_SCORE) {
    reasons.push(`Accuracy score ${accuracyScore} below threshold ${QUALITY_THRESHOLDS.MINIMUM_ACCURACY_SCORE}`);
  }

  if (contentScore < QUALITY_THRESHOLDS.MINIMUM_CONTENT_SCORE) {
    reasons.push(`Content score ${contentScore} below threshold ${QUALITY_THRESHOLDS.MINIMUM_CONTENT_SCORE}`);
  }

  const overallScore = Math.round((accuracyScore + contentScore) / 2);
  if (overallScore < QUALITY_THRESHOLDS.MINIMUM_QUALITY_SCORE) {
    reasons.push(`Overall score ${overallScore} below threshold ${QUALITY_THRESHOLDS.MINIMUM_QUALITY_SCORE}`);
  }

  return {
    passed: reasons.length === 0,
    reasons,
  };
}

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  /** Maximum Claude API calls per minute */
  MAX_CLAUDE_CALLS_PER_MINUTE: 50,

  /** Delay between Claude API calls (ms) */
  CLAUDE_CALL_DELAY_MS: 1200,

  /** Maximum concurrent plan generations */
  MAX_CONCURRENT_GENERATIONS: 5,

  /** Timeout for plan generation (ms) */
  GENERATION_TIMEOUT_MS: 60000,
};

/**
 * Logging configuration
 */
export const LOGGING = {
  /** Log detailed Claude responses */
  LOG_CLAUDE_RESPONSES: true,

  /** Log quality scores */
  LOG_QUALITY_SCORES: true,

  /** Log rejected plans */
  LOG_REJECTED_PLANS: true,
};
