/**
 * Plan Data Model
 * Represents an individual nightlife plan (subcollection under cities)
 */

export interface Plan {
  planId: string; // e.g., 'nyc-plan-001'
  cityId: string; // Parent city reference
  rank: number; // 1-50, ordering within city
  title: string; // e.g., 'The Roof at PUBLIC'
  venueName: string; // e.g., 'PUBLIC Hotel'
  description: string; // Short description
  category: string; // e.g., 'Rooftop Bar', 'Live Music', 'Nightclub'
  type: PlanType;
  images: PlanImages;
  location: PlanLocation;
  schedule: PlanSchedule;
  pricing: PlanPricing;
  aiTags: PlanAITags;
  flags: PlanFlags;
  reviews: PlanReviews;
  metadata: PlanMetadata;
}

export type PlanType = 'bar' | 'club' | 'event' | 'restaurant';

export interface PlanImages {
  hero: string; // URL to main image
  thumbnail: string; // URL to card thumbnail
  gallery: string[]; // Array of image URLs
}

export interface PlanLocation {
  address: string;
  neighborhood: string; // e.g., 'Lower East Side'
  googleMapsUrl: string; // Deep link
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface PlanSchedule {
  date: string; // ISO date string, e.g., '2025-01-15'
  startTime: string; // e.g., '20:00'
  endTime?: string; // Optional
  isWeekend: boolean;
  weekday: string; // e.g., 'Friday'
}

export interface PlanPricing {
  entryFee: number | null; // In cents, nullable
  currency: string; // e.g., 'USD'
  priceRange: string; // e.g., '$$', '$$$'
  freeEntry: boolean;
}

export interface PlanAITags {
  genre: string[]; // e.g., ['Electronic', 'House']
  vibe: string[]; // e.g., ['Upbeat', 'Chill', 'Exclusive']
  eventType: string; // e.g., 'DJ Night', 'Live Band', 'Open Mic'
}

export interface PlanFlags {
  isIndividual: boolean; // true if suitable for solo/small groups
  isGroup: boolean; // true if part of group flow
  isWeekend: boolean;
  isFeatured: boolean;
}

export interface PlanReviews {
  averageRating: number; // 1-5
  totalReviews: number;
  source: string; // e.g., 'Google', 'Yelp'
}

export interface PlanMetadata {
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  source: string; // e.g., 'AI-generated', 'Manual'
}

// Helper function to create a new plan
export const createPlan = (
  planId: string,
  cityId: string,
  rank: number,
  title: string,
  venueName: string,
  description: string,
  category: string,
  type: PlanType,
  isWeekend: boolean
): Plan => {
  const now = FirebaseFirestore.Timestamp.now();

  return {
    planId,
    cityId,
    rank,
    title,
    venueName,
    description,
    category,
    type,
    images: {
      hero: '',
      thumbnail: '',
      gallery: [],
    },
    location: {
      address: '',
      neighborhood: '',
      googleMapsUrl: '',
      coordinates: {
        latitude: 0,
        longitude: 0,
      },
    },
    schedule: {
      date: new Date().toISOString().split('T')[0],
      startTime: '20:00',
      endTime: '23:00',
      isWeekend,
      weekday: new Date().toLocaleDateString('en-US', {weekday: 'long'}),
    },
    pricing: {
      entryFee: null,
      currency: 'USD',
      priceRange: '$$',
      freeEntry: true,
    },
    aiTags: {
      genre: [],
      vibe: [],
      eventType: '',
    },
    flags: {
      isIndividual: true,
      isGroup: false,
      isWeekend,
      isFeatured: false,
    },
    reviews: {
      averageRating: 4.5,
      totalReviews: 0,
      source: 'Google',
    },
    metadata: {
      createdAt: now,
      updatedAt: now,
      source: 'AI-generated',
    },
  };
};

// Helper function to validate plan data
export const validatePlan = (plan: Partial<Plan>): boolean => {
  if (!plan.planId || !plan.cityId || !plan.title || !plan.venueName) {
    return false;
  }

  if (plan.rank && (plan.rank < 1 || plan.rank > 50)) {
    return false;
  }

  if (plan.reviews?.averageRating &&
      (plan.reviews.averageRating < 1 || plan.reviews.averageRating > 5)) {
    return false;
  }

  return true;
};
