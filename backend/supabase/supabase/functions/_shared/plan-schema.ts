/**
 * Plan Schema and Validation
 * Defines the structure for AI-generated plans
 */

/**
 * Generated Plan structure
 */
export interface GeneratedPlan {
  title: string;
  venueName: string;
  description: string;
  category: string;
  cityId: string;
  cityName: string;
  images: string[];
  location: {
    address: string;
    neighborhood: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  schedule: {
    date: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    isWeekend: boolean;
  };
  pricing: {
    entryFee: number;
    priceRange: string;
    currency: string;
  };
  aiTags: string[];
  flags: {
    isWeekendPlan: boolean;
    requiresReservation: boolean;
    ageRestriction: number | null;
    rank?: number;
  };
  aiGenerated: boolean;
  qualityScore: number;
  generatedAt: string;
}

/**
 * Plan validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a generated plan
 * Enforces quality standards for top 50 recommended plans
 */
export function validatePlan(plan: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required string fields
  const requiredStrings = ['title', 'venueName', 'description', 'category'];
  for (const field of requiredStrings) {
    if (!plan[field] || typeof plan[field] !== 'string' || plan[field].trim().length === 0) {
      errors.push(`Missing or invalid field: ${field}`);
    }
  }

  // Title length - should be engaging
  if (plan.title && plan.title.length < 5) {
    errors.push('Title too short (minimum 5 characters)');
  }
  if (plan.title && plan.title.length > 100) {
    warnings.push('Title is very long, consider shortening');
  }

  // Venue name validation - must look like a real venue name
  if (plan.venueName) {
    if (plan.venueName.length < 3) {
      errors.push('Venue name too short');
    }
    // Check for placeholder-like names
    const placeholderPatterns = ['example', 'test', 'sample', 'placeholder', 'venue name', 'tbd'];
    if (placeholderPatterns.some(p => plan.venueName.toLowerCase().includes(p))) {
      errors.push('Venue name appears to be a placeholder');
    }
  }

  // Description length (minimum 50 words, recommended 100+)
  if (plan.description) {
    const wordCount = plan.description.split(/\s+/).length;
    if (wordCount < 50) {
      errors.push(`Description too short: ${wordCount} words (minimum 50)`);
    } else if (wordCount < 100) {
      warnings.push(`Description could be longer: ${wordCount} words (recommended 100+)`);
    }
    // Check for placeholder-like descriptions
    if (plan.description.toLowerCase().includes('lorem ipsum')) {
      errors.push('Description contains placeholder text');
    }
  }

  // Category validation
  if (plan.category && !VALID_CATEGORIES.includes(plan.category)) {
    warnings.push(`Unknown category: ${plan.category}. Valid categories: ${VALID_CATEGORIES.join(', ')}`);
  }

  // Location validation - require real address
  if (!plan.location) {
    errors.push('Missing location object');
  } else {
    if (!plan.location.address) {
      errors.push('Missing location address');
    } else {
      // Address should look realistic (has numbers and letters)
      if (!/\d/.test(plan.location.address) || plan.location.address.length < 10) {
        warnings.push('Address may not be complete (should include street number)');
      }
    }
    if (!plan.location.neighborhood) {
      warnings.push('Missing neighborhood - helps users locate the venue');
    }
    if (!plan.location.coordinates) {
      errors.push('Missing coordinates');
    } else {
      const lat = plan.location.coordinates?.latitude ?? plan.location.latitude;
      const lng = plan.location.coordinates?.longitude ?? plan.location.longitude;
      if (typeof lat !== 'number' || lat < -90 || lat > 90) {
        errors.push('Invalid latitude');
      }
      if (typeof lng !== 'number' || lng < -180 || lng > 180) {
        errors.push('Invalid longitude');
      }
      // Check for default/zero coordinates
      if (lat === 0 && lng === 0) {
        warnings.push('Coordinates appear to be default values (0,0)');
      }
    }
  }

  // Schedule validation
  if (!plan.schedule) {
    errors.push('Missing schedule object');
  } else {
    // Flexible: check for date or bestDay
    if (!plan.schedule.date && !plan.bestDay && !plan.schedule.bestNights) {
      warnings.push('Missing date information (date, bestDay, or bestNights)');
    }
    // Validate time format if present
    if (plan.schedule.startTime && !/^\d{1,2}:\d{2}$/.test(plan.schedule.startTime)) {
      if (!/^\d{1,2}(:\d{2})?\s*(AM|PM)?$/i.test(plan.schedule.startTime)) {
        warnings.push('Start time should be in HH:MM format');
      }
    }
    if (plan.schedule.dayOfWeek && !DAYS_OF_WEEK.includes(plan.schedule.dayOfWeek)) {
      errors.push(`Invalid day of week: ${plan.schedule.dayOfWeek}`);
    }
  }

  // Pricing validation
  if (!plan.pricing) {
    errors.push('Missing pricing object');
  } else {
    const fee = plan.pricing.entryFee ?? plan.pricing.ticketPrice ?? 0;
    if (typeof fee !== 'number' || fee < 0) {
      errors.push('Invalid entry fee');
    }
    if (!plan.pricing.priceRange) {
      errors.push('Missing price range');
    } else if (!VALID_PRICE_RANGES.includes(plan.pricing.priceRange)) {
      warnings.push(`Price range should be one of: ${VALID_PRICE_RANGES.join(', ')}`);
    }
  }

  // Tags validation - need at least 3 for good categorization
  if (!Array.isArray(plan.aiTags) || plan.aiTags.length === 0) {
    errors.push('Missing or empty aiTags array');
  } else if (plan.aiTags.length < 3) {
    warnings.push('Consider adding more tags (at least 3-4 recommended)');
  }

  // Flags validation (optional for new format)
  if (plan.flags && typeof plan.flags !== 'object') {
    warnings.push('Flags should be an object');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valid plan categories
 */
export const VALID_CATEGORIES = [
  'Live Music',
  'Nightclub',
  'Rooftop Bar',
  'Cocktail Bar',
  'Jazz Club',
  'Comedy Club',
  'Speakeasy',
  'Wine Bar',
  'Brewery',
  'Lounge',
  'Dance Club',
  'Karaoke',
  'Pub',
  'Sports Bar',
  'Pool Hall',
  'Arcade Bar',
  'Dinner Show',
  'Theater',
  'Concert Venue',
  'Festival',
];

/**
 * Valid price ranges
 */
export const VALID_PRICE_RANGES = ['$', '$$', '$$$', '$$$$'];

/**
 * Days of the week
 */
export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/**
 * Check if a day is a weekend (includes Friday for nightlife purposes)
 */
export function isWeekend(dayOfWeek: string): boolean {
  return ['Friday', 'Saturday', 'Sunday'].includes(dayOfWeek);
}

/**
 * Get day of week from a date string using UTC
 * Prevents timezone-related off-by-one-day errors
 */
export function getDayOfWeekUTC(dateStr: string): string {
  // Use noon UTC to avoid timezone edge cases
  const date = new Date(dateStr + 'T12:00:00Z');
  return DAYS_OF_WEEK[date.getUTCDay() === 0 ? 6 : date.getUTCDay() - 1]; // Adjust: getUTCDay() returns 0=Sunday, we want Monday=0
}

/**
 * Get day of week from a date string - returns standard format
 * Sunday=0, Monday=1, ..., Saturday=6 mapping to day names
 */
export function getDayOfWeekFromDate(dateStr: string): string {
  // Use noon UTC to avoid timezone edge cases
  const date = new Date(dateStr + 'T12:00:00Z');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getUTCDay()];
}

/**
 * Generate a unique plan ID
 */
export function generatePlanId(cityId: string, date: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${cityId.substring(0, 3)}-${date.replace(/-/g, '')}-${timestamp}${random}`;
}
