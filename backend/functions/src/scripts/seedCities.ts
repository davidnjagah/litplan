/**
 * Seed Cities Script
 *
 * This script populates the Firestore database with 10 initial cities.
 * Each city includes complete metadata, display assets, and coordinates.
 *
 * Usage: npm run seed:cities
 */

import { db, getCurrentTimestamp } from '../config/firestore';
import { citiesCollection } from '../config/collections';
import type { City } from '../models/City';

// City seed data with real coordinates and Unsplash image URLs
const cities: Omit<City, 'metadata'>[] = [
  {
    cityId: 'nyc-001',
    name: 'New York',
    country: 'United States',
    countryCode: 'US',
    rank: 1,
    timezone: 'America/New_York',
    displayAssets: {
      heroImage: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&h=800&fit=crop',
      cardImage: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=500&fit=crop',
      accentColor: '#00D9FF',
    },
    coordinates: {
      latitude: 40.7128,
      longitude: -74.0060,
    },
  },
  {
    cityId: 'la-001',
    name: 'Los Angeles',
    country: 'United States',
    countryCode: 'US',
    rank: 2,
    timezone: 'America/Los_Angeles',
    displayAssets: {
      heroImage: 'https://images.unsplash.com/photo-1534190239940-9ba8944ea261?w=1200&h=800&fit=crop',
      cardImage: 'https://images.unsplash.com/photo-1534190239940-9ba8944ea261?w=400&h=500&fit=crop',
      accentColor: '#FFB800',
    },
    coordinates: {
      latitude: 34.0522,
      longitude: -118.2437,
    },
  },
  {
    cityId: 'miami-001',
    name: 'Miami',
    country: 'United States',
    countryCode: 'US',
    rank: 3,
    timezone: 'America/New_York',
    displayAssets: {
      heroImage: 'https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=1200&h=800&fit=crop',
      cardImage: 'https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=400&h=500&fit=crop',
      accentColor: '#FF6B9D',
    },
    coordinates: {
      latitude: 25.7617,
      longitude: -80.1918,
    },
  },
  {
    cityId: 'london-001',
    name: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    rank: 4,
    timezone: 'Europe/London',
    displayAssets: {
      heroImage: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&h=800&fit=crop',
      cardImage: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=500&fit=crop',
      accentColor: '#9B59B6',
    },
    coordinates: {
      latitude: 51.5074,
      longitude: -0.1278,
    },
  },
  {
    cityId: 'paris-001',
    name: 'Paris',
    country: 'France',
    countryCode: 'FR',
    rank: 5,
    timezone: 'Europe/Paris',
    displayAssets: {
      heroImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&h=800&fit=crop',
      cardImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=500&fit=crop',
      accentColor: '#E74C3C',
    },
    coordinates: {
      latitude: 48.8566,
      longitude: 2.3522,
    },
  },
  {
    cityId: 'tokyo-001',
    name: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    rank: 6,
    timezone: 'Asia/Tokyo',
    displayAssets: {
      heroImage: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&h=800&fit=crop',
      cardImage: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=500&fit=crop',
      accentColor: '#FF1744',
    },
    coordinates: {
      latitude: 35.6762,
      longitude: 139.6503,
    },
  },
  {
    cityId: 'berlin-001',
    name: 'Berlin',
    country: 'Germany',
    countryCode: 'DE',
    rank: 7,
    timezone: 'Europe/Berlin',
    displayAssets: {
      heroImage: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=1200&h=800&fit=crop',
      cardImage: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400&h=500&fit=crop',
      accentColor: '#3498DB',
    },
    coordinates: {
      latitude: 52.5200,
      longitude: 13.4050,
    },
  },
  {
    cityId: 'barcelona-001',
    name: 'Barcelona',
    country: 'Spain',
    countryCode: 'ES',
    rank: 8,
    timezone: 'Europe/Madrid',
    displayAssets: {
      heroImage: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200&h=800&fit=crop',
      cardImage: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=500&fit=crop',
      accentColor: '#F39C12',
    },
    coordinates: {
      latitude: 41.3851,
      longitude: 2.1734,
    },
  },
  {
    cityId: 'amsterdam-001',
    name: 'Amsterdam',
    country: 'Netherlands',
    countryCode: 'NL',
    rank: 9,
    timezone: 'Europe/Amsterdam',
    displayAssets: {
      heroImage: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1200&h=800&fit=crop',
      cardImage: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400&h=500&fit=crop',
      accentColor: '#1ABC9C',
    },
    coordinates: {
      latitude: 52.3676,
      longitude: 4.9041,
    },
  },
  {
    cityId: 'dubai-001',
    name: 'Dubai',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    rank: 10,
    timezone: 'Asia/Dubai',
    displayAssets: {
      heroImage: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&h=800&fit=crop',
      cardImage: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=500&fit=crop',
      accentColor: '#FFA500',
    },
    coordinates: {
      latitude: 25.2048,
      longitude: 55.2708,
    },
  },
];

/**
 * Seed cities to Firestore
 */
async function seedCities() {
  console.log('Starting city seeding...');
  console.log(`Total cities to seed: ${cities.length}`);

  const batch = db.batch();
  let count = 0;

  for (const cityData of cities) {
    const cityRef = citiesCollection.doc(cityData.cityId);

    // Add metadata with timestamps
    const cityWithMetadata: any = {
      ...cityData,
      metadata: {
        totalPlansThisWeek: 0,
        lastUpdated: getCurrentTimestamp(),
        featured: cityData.rank <= 5, // Top 5 cities are featured
      },
    };

    batch.set(cityRef, cityWithMetadata);
    count++;
    console.log(`[${count}/${cities.length}] Prepared: ${cityData.name}, ${cityData.country}`);
  }

  // Commit the batch
  try {
    await batch.commit();
    console.log('\nSuccessfully seeded all cities!');
    console.log(`Total cities created: ${count}`);
  } catch (error) {
    console.error('Error seeding cities:', error);
    throw error;
  }
}

/**
 * Create initial app configuration
 */
async function createAppConfig() {
  console.log('\nCreating app configuration...');

  const configRef = db.collection('config').doc('app');

  // Calculate current week
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);

  const appConfig = {
    currentWeek: `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`,
    weekStartDate: getCurrentTimestamp(),
    weekEndDate: getCurrentTimestamp(),
    freeTier: {
      maxCities: 1,
      maxPlans: 10,
      weekendAccess: false,
    },
    proTier: {
      maxCities: 100,
      maxPlans: 50,
      weekendAccess: true,
    },
    products: {
      pro_monthly: {
        productId: 'litplan_pro_monthly',
        price: 999,
        currency: 'USD',
      },
      pro_yearly: {
        productId: 'litplan_pro_yearly',
        price: 9999,
        currency: 'USD',
      },
    },
  };

  try {
    await configRef.set(appConfig);
    console.log('App configuration created successfully!');
  } catch (error) {
    console.error('Error creating app config:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('='.repeat(60));
    console.log('LITPLAN - CITY SEEDING SCRIPT');
    console.log('='.repeat(60));
    console.log('');

    await seedCities();
    await createAppConfig();

    console.log('');
    console.log('='.repeat(60));
    console.log('SEEDING COMPLETE!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Next steps:');
    console.log('1. Run seed script for plans: npm run seed:plans');
    console.log('2. Start the emulator: npm run serve');
    console.log('3. Test API endpoints with Postman');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('\nFATAL ERROR:', error);
    process.exit(1);
  }
}

// Run the script
main();
