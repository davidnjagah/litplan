/**
 * City Data Model
 * Represents a city in the Litplan system
 */

export interface City {
  cityId: string; // e.g., 'nyc-001'
  name: string; // e.g., 'New York'
  country: string; // e.g., 'United States'
  countryCode: string; // e.g., 'US'
  rank: number; // 1-100, for ordering
  timezone: string; // e.g., 'America/New_York'
  displayAssets: CityDisplayAssets;
  metadata: CityMetadata;
  coordinates: CityCoordinates;
}

export interface CityDisplayAssets {
  heroImage: string; // URL to city hero image
  cardImage: string; // URL to card thumbnail
  accentColor: string; // Hex color for city theme, e.g., '#00D9FF'
}

export interface CityMetadata {
  totalPlansThisWeek: number;
  lastUpdated: FirebaseFirestore.Timestamp; // When plans were refreshed
  featured: boolean; // For trending/featured sections
}

export interface CityCoordinates {
  latitude: number;
  longitude: number;
}

// Helper function to create a new city
export const createCity = (
  cityId: string,
  name: string,
  country: string,
  countryCode: string,
  rank: number,
  timezone: string,
  heroImage: string,
  cardImage: string,
  accentColor: string,
  latitude: number,
  longitude: number
): City => {
  return {
    cityId,
    name,
    country,
    countryCode,
    rank,
    timezone,
    displayAssets: {
      heroImage,
      cardImage,
      accentColor,
    },
    metadata: {
      totalPlansThisWeek: 0,
      lastUpdated: FirebaseFirestore.Timestamp.now(),
      featured: false,
    },
    coordinates: {
      latitude,
      longitude,
    },
  };
};

// Helper function to validate city data
export const validateCity = (city: Partial<City>): boolean => {
  if (!city.cityId || !city.name || !city.country) {
    return false;
  }

  if (city.rank && (city.rank < 1 || city.rank > 100)) {
    return false;
  }

  if (city.displayAssets?.accentColor &&
      !/^#[0-9A-F]{6}$/i.test(city.displayAssets.accentColor)) {
    return false;
  }

  return true;
};
