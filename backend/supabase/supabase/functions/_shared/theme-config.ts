/**
 * Theme Configuration for Group Plans
 * Defines themes, composition strategies, difficulty levels, and valid tags
 */

/**
 * Group Plan Theme Definition
 */
export interface GroupPlanTheme {
  name: string;
  description: string;
  requiredCategories: string[];
  optionalCategories: string[];
  minVenues: number;
  maxVenues: number;
  iconicFor: string[];
  suggestedDifficulty: 'easy' | 'moderate' | 'challenging';
  typicalDuration: { min: number; max: number }; // in minutes
}

/**
 * Available group plan themes
 */
export const GROUP_PLAN_THEMES: Record<string, GroupPlanTheme> = {
  rooftop: {
    name: 'Rooftop Hop',
    description: 'Chase stunning views across the city\'s best rooftops',
    requiredCategories: ['rooftop_bar', 'rooftop_lounge', 'rooftop_restaurant'],
    optionalCategories: ['sky_bar', 'terrace_bar', 'observation_deck'],
    minVenues: 2,
    maxVenues: 4,
    iconicFor: ['views', 'sunset', 'instagram', 'romantic'],
    suggestedDifficulty: 'moderate',
    typicalDuration: { min: 180, max: 300 }, // 3-5 hours
  },
  jazz: {
    name: 'Jazz Trail',
    description: 'Discover the city\'s soulful jazz scene',
    requiredCategories: ['jazz_club', 'jazz_bar', 'live_jazz'],
    optionalCategories: ['live_music', 'cocktail_bar', 'supper_club'],
    minVenues: 2,
    maxVenues: 3,
    iconicFor: ['music', 'sophisticated', 'cultural', 'intimate'],
    suggestedDifficulty: 'moderate',
    typicalDuration: { min: 180, max: 270 }, // 3-4.5 hours
  },
  'bar-hop': {
    name: 'Bar Hop',
    description: 'Sample the best bars in the neighborhood',
    requiredCategories: ['bar', 'pub', 'cocktail_bar', 'wine_bar'],
    optionalCategories: ['dive_bar', 'taproom', 'beer_garden', 'sports_bar'],
    minVenues: 3,
    maxVenues: 4,
    iconicFor: ['social', 'variety', 'exploration', 'casual'],
    suggestedDifficulty: 'moderate',
    typicalDuration: { min: 180, max: 300 }, // 3-5 hours
  },
  speakeasy: {
    name: 'Speakeasy Crawl',
    description: 'Find hidden gems behind secret doors',
    requiredCategories: ['speakeasy', 'hidden_bar', 'secret_bar'],
    optionalCategories: ['cocktail_bar', 'lounge', 'underground_bar'],
    minVenues: 2,
    maxVenues: 3,
    iconicFor: ['exclusive', 'mysterious', 'craft_cocktails', 'intimate'],
    suggestedDifficulty: 'challenging',
    typicalDuration: { min: 180, max: 270 }, // 3-4.5 hours
  },
  'club-night': {
    name: 'Club Night',
    description: 'Dance the night away at the hottest clubs',
    requiredCategories: ['nightclub', 'club', 'dance_club'],
    optionalCategories: ['lounge', 'mega_club', 'after_hours'],
    minVenues: 2,
    maxVenues: 3,
    iconicFor: ['dancing', 'party', 'late_night', 'energetic'],
    suggestedDifficulty: 'challenging',
    typicalDuration: { min: 240, max: 420 }, // 4-7 hours
  },
  'live-music': {
    name: 'Live Music Tour',
    description: 'Experience the city\'s vibrant live music scene',
    requiredCategories: ['live_music', 'concert_venue', 'music_venue'],
    optionalCategories: ['bar', 'jazz_club', 'rock_venue', 'indie_venue'],
    minVenues: 2,
    maxVenues: 3,
    iconicFor: ['music', 'entertainment', 'atmosphere', 'authentic'],
    suggestedDifficulty: 'moderate',
    typicalDuration: { min: 180, max: 300 }, // 3-5 hours
  },
  cultural: {
    name: 'Cultural Night',
    description: 'Immerse yourself in arts and culture',
    requiredCategories: ['cultural', 'theater', 'gallery', 'art_bar'],
    optionalCategories: ['museum_bar', 'performance_venue', 'cabaret'],
    minVenues: 2,
    maxVenues: 3,
    iconicFor: ['arts', 'sophisticated', 'unique', 'intellectual'],
    suggestedDifficulty: 'easy',
    typicalDuration: { min: 150, max: 240 }, // 2.5-4 hours
  },
  'boat-party': {
    name: 'Boat Party',
    description: 'Party on the water with unforgettable views',
    requiredCategories: ['boat_party', 'yacht', 'cruise', 'floating_bar'],
    optionalCategories: ['waterfront_bar', 'marina_club'],
    minVenues: 1,
    maxVenues: 2,
    iconicFor: ['unique', 'views', 'party', 'exclusive'],
    suggestedDifficulty: 'easy',
    typicalDuration: { min: 180, max: 300 }, // 3-5 hours
  },
  'dinner-drinks': {
    name: 'Dinner & Drinks',
    description: 'Perfect evening progression from food to fun',
    requiredCategories: ['restaurant', 'bar', 'cocktail_bar'],
    optionalCategories: ['lounge', 'wine_bar', 'rooftop_bar'],
    minVenues: 2,
    maxVenues: 3,
    iconicFor: ['date_night', 'celebration', 'sophisticated'],
    suggestedDifficulty: 'easy',
    typicalDuration: { min: 180, max: 270 }, // 3-4.5 hours
  },
  'foodie-crawl': {
    name: 'Foodie Crawl',
    description: 'Taste your way through the neighborhood',
    requiredCategories: ['restaurant', 'food_hall', 'tapas_bar'],
    optionalCategories: ['wine_bar', 'street_food', 'market'],
    minVenues: 3,
    maxVenues: 4,
    iconicFor: ['foodie', 'culinary', 'exploration', 'social'],
    suggestedDifficulty: 'moderate',
    typicalDuration: { min: 180, max: 270 }, // 3-4.5 hours
  },
};

/**
 * Composition Strategies for Group Plans
 */
export interface CompositionStrategy {
  name: string;
  description: string;
  pattern: string[];
  venueCountRange: { min: number; max: number };
  transitionStyle: 'walkable' | 'transit' | 'mixed';
  maxTransitionMinutes: number;
}

export const COMPOSITION_STRATEGIES: CompositionStrategy[] = [
  {
    name: 'evening-progression',
    description: 'Natural evening flow from early to late',
    pattern: ['happy-hour', 'dinner', 'drinks', 'late-night'],
    venueCountRange: { min: 3, max: 4 },
    transitionStyle: 'mixed',
    maxTransitionMinutes: 20,
  },
  {
    name: 'thematic',
    description: 'Unified theme throughout the experience',
    pattern: ['theme-venue-1', 'theme-venue-2', 'theme-venue-3'],
    venueCountRange: { min: 2, max: 4 },
    transitionStyle: 'mixed',
    maxTransitionMinutes: 25,
  },
  {
    name: 'neighborhood',
    description: 'Walkable route within same area',
    pattern: ['local-spot-1', 'local-spot-2', 'local-spot-3'],
    venueCountRange: { min: 3, max: 4 },
    transitionStyle: 'walkable',
    maxTransitionMinutes: 10,
  },
  {
    name: 'intensity-build',
    description: 'Build energy from chill to wild',
    pattern: ['chill-start', 'moderate-energy', 'high-energy'],
    venueCountRange: { min: 2, max: 3 },
    transitionStyle: 'transit',
    maxTransitionMinutes: 20,
  },
];

/**
 * Difficulty Level Configuration
 */
export interface DifficultyLevel {
  name: string;
  displayName: string;
  description: string;
  durationRange: { min: number; max: number }; // in minutes
  venueCountRange: { min: number; max: number };
  complexity: string;
  recommendedFor: string[];
}

export const DIFFICULTY_LEVELS: Record<string, DifficultyLevel> = {
  easy: {
    name: 'easy',
    displayName: 'Easy',
    description: 'Perfect for a relaxed evening',
    durationRange: { min: 120, max: 180 }, // 2-3 hours
    venueCountRange: { min: 2, max: 2 },
    complexity: 'Simple progression, minimal travel, no reservations needed',
    recommendedFor: ['date_night', 'casual', 'first-timers', 'weeknight'],
  },
  moderate: {
    name: 'moderate',
    displayName: 'Moderate',
    description: 'Great balance of adventure and comfort',
    durationRange: { min: 180, max: 300 }, // 3-5 hours
    venueCountRange: { min: 2, max: 3 },
    complexity: 'Multiple venues, some planning needed, good walking shoes',
    recommendedFor: ['friends', 'weekend', 'explorers', 'birthday'],
  },
  challenging: {
    name: 'challenging',
    displayName: 'Challenging',
    description: 'Full night out, maximum adventure',
    durationRange: { min: 300, max: 420 }, // 5-7 hours
    venueCountRange: { min: 3, max: 4 },
    complexity: 'Full night commitment, multiple neighborhoods, late finish',
    recommendedFor: ['party', 'celebration', 'adventurers', 'special_occasion'],
  },
};

/**
 * Valid bestFor Tags for Group Plans
 * 47 total tags across 7 categories
 */
export const VALID_BEST_FOR_TAGS = [
  // Relationship (4)
  'couples',
  'romantic',
  'date_night',
  'anniversary',

  // Friends (4)
  'friends',
  'squad',
  'reunion',
  'birthday',

  // Gendered Groups (6)
  'girls_nightout',
  'girls_trip',
  'bachelorette',
  'boys_night',
  'bachelor',
  'stag',

  // Experience (7)
  'adventure',
  'thrill_seekers',
  'cultural',
  'artsy',
  'sophisticated',
  'foodie',
  'culinary',

  // Vibe (7)
  'party',
  'wild',
  'clubbing',
  'chill',
  'relaxed',
  'low_key',
  'energetic',

  // Occasion (4)
  'vip',
  'luxury',
  'exclusive',
  'celebration',

  // Practical (6)
  'budget_friendly',
  'affordable',
  'instagram_worthy',
  'photogenic',
  'late_night',
  'early_evening',
] as const;

export type BestForTag = (typeof VALID_BEST_FOR_TAGS)[number];

/**
 * Tag categories for organization
 */
export const TAG_CATEGORIES = {
  relationship: ['couples', 'romantic', 'date_night', 'anniversary'],
  friends: ['friends', 'squad', 'reunion', 'birthday'],
  gendered: ['girls_nightout', 'girls_trip', 'bachelorette', 'boys_night', 'bachelor', 'stag'],
  experience: ['adventure', 'thrill_seekers', 'cultural', 'artsy', 'sophisticated', 'foodie', 'culinary'],
  vibe: ['party', 'wild', 'clubbing', 'chill', 'relaxed', 'low_key', 'energetic'],
  occasion: ['vip', 'luxury', 'exclusive', 'celebration'],
  practical: ['budget_friendly', 'affordable', 'instagram_worthy', 'photogenic', 'late_night', 'early_evening'],
};

/**
 * Venue Category Mapping
 * Maps venue categories to compatible themes
 */
export const CATEGORY_THEME_MAP: Record<string, string[]> = {
  // Rooftop venues
  rooftop_bar: ['rooftop', 'bar-hop', 'dinner-drinks'],
  rooftop_lounge: ['rooftop', 'dinner-drinks'],
  rooftop_restaurant: ['rooftop', 'dinner-drinks', 'foodie-crawl'],
  sky_bar: ['rooftop'],
  terrace_bar: ['rooftop', 'bar-hop'],

  // Jazz venues
  jazz_club: ['jazz', 'live-music', 'cultural'],
  jazz_bar: ['jazz', 'live-music', 'bar-hop'],

  // Bars
  bar: ['bar-hop', 'dinner-drinks'],
  pub: ['bar-hop'],
  cocktail_bar: ['bar-hop', 'speakeasy', 'dinner-drinks'],
  wine_bar: ['bar-hop', 'dinner-drinks', 'foodie-crawl'],
  dive_bar: ['bar-hop'],
  taproom: ['bar-hop'],
  beer_garden: ['bar-hop'],
  sports_bar: ['bar-hop'],

  // Speakeasies
  speakeasy: ['speakeasy', 'bar-hop'],
  hidden_bar: ['speakeasy'],
  secret_bar: ['speakeasy'],

  // Clubs
  nightclub: ['club-night'],
  club: ['club-night'],
  dance_club: ['club-night'],
  lounge: ['club-night', 'bar-hop', 'dinner-drinks'],
  mega_club: ['club-night'],

  // Live Music
  live_music: ['live-music', 'jazz', 'bar-hop'],
  concert_venue: ['live-music'],
  music_venue: ['live-music'],

  // Cultural
  cultural: ['cultural'],
  theater: ['cultural'],
  gallery: ['cultural'],
  art_bar: ['cultural', 'bar-hop'],
  cabaret: ['cultural', 'live-music'],

  // Boat
  boat_party: ['boat-party'],
  yacht: ['boat-party'],
  cruise: ['boat-party'],
  floating_bar: ['boat-party', 'bar-hop'],

  // Dining
  restaurant: ['dinner-drinks', 'foodie-crawl'],
  food_hall: ['foodie-crawl'],
  tapas_bar: ['foodie-crawl', 'bar-hop'],
};

/**
 * Description Rules for Comms Specialist
 */
export const DESCRIPTION_RULES = {
  groupPlan: {
    maxWords: 25,
    minWords: 15,
    style: 'Captivating, action-oriented, creates FOMO',
    mustInclude: ['what makes it special', 'the experience promise'],
    avoid: ['generic phrases', 'clichés', 'obvious statements'],
    examples: [
      "Chase the sunset across Manhattan's best rooftops, ending with skyline views and late-night dancing.",
      "Discover hidden speakeasies in the Village—password required, memories guaranteed.",
      "From craft cocktails to dance floor chaos—this is how locals do Saturday night.",
    ],
  },
  venueStep: {
    maxWords: 15,
    minWords: 8,
    style: 'Punchy, specific, sets expectations',
    mustInclude: ['what to expect', 'unique selling point'],
    avoid: ['generic descriptions', 'repeat words from title'],
    examples: [
      "Craft cocktails in a phone booth entrance. Intimate vibes, killer drinks.",
      "Rooftop pool party energy meets stunning Hudson views.",
      "Jazz so smooth you'll forget what day it is.",
    ],
  },
};

/**
 * Title Alignment Rules for Comms Specialist
 */
export const TITLE_RULES = {
  format: 'Theme Keyword: Venue 1 → Venue 2 → Venue 3',
  maxLength: 60,
  minLength: 25,
  mustInclude: ['venue names in order', 'theme context'],
  avoid: ['generic themes only', 'no venue names', 'too long'],
  goodExamples: [
    'Sunset to Skyline: Le Bain → PHD → 230 Fifth',
    'Village Jazz Trail: Blue Note → Smalls → Mezzrow',
    'East Village Hop: Please Don\'t Tell → Death & Co → Amor y Amargo',
    'Palermo After Dark: Frank\'s → Nicky NY → Congo',
  ],
  badExamples: [
    'Rooftop Night', // Too generic
    'Jazz Evening', // No venues
    'Bar Crawl Experience in Manhattan with Amazing Cocktails and Great Vibes', // Too long
  ],
};

/**
 * Get theme by name
 */
export function getTheme(themeName: string): GroupPlanTheme | undefined {
  return GROUP_PLAN_THEMES[themeName];
}

/**
 * Get all theme names
 */
export function getAllThemeNames(): string[] {
  return Object.keys(GROUP_PLAN_THEMES);
}

/**
 * Get themes compatible with a venue category
 */
export function getThemesForCategory(category: string): string[] {
  return CATEGORY_THEME_MAP[category] || [];
}

/**
 * Validate if a tag is valid
 */
export function isValidTag(tag: string): tag is BestForTag {
  return VALID_BEST_FOR_TAGS.includes(tag as BestForTag);
}

/**
 * Filter to only valid tags
 */
export function filterValidTags(tags: string[]): BestForTag[] {
  return tags.filter(isValidTag) as BestForTag[];
}

/**
 * Get difficulty level config
 */
export function getDifficultyLevel(difficulty: string): DifficultyLevel | undefined {
  return DIFFICULTY_LEVELS[difficulty];
}
