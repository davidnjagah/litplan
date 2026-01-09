/**
 * Add More Cities to Supabase Database
 *
 * This script adds additional cities to reach 100 total.
 * Run with: deno run --allow-net scripts/add-more-cities.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://clktdigankjszupvrsqt.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsa3RkaWdhbmtqc3p1cHZyc3F0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzAxNjQzNywiZXhwIjoyMDgyNTkyNDM3fQ.MpZ0c4A1M58ih0Tdij7zcnzyoziI1plDwFwzN-FVCKs';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Additional cities to add (to reach 100 total)
const ADDITIONAL_CITIES = [
  // North America
  { name: 'Seattle', country: 'USA', countryCode: 'US', timezone: 'America/Los_Angeles', latitude: 47.6062, longitude: -122.3321 },
  { name: 'Atlanta', country: 'USA', countryCode: 'US', timezone: 'America/New_York', latitude: 33.749, longitude: -84.388 },
  { name: 'Denver', country: 'USA', countryCode: 'US', timezone: 'America/Denver', latitude: 39.7392, longitude: -104.9903 },
  { name: 'Philadelphia', country: 'USA', countryCode: 'US', timezone: 'America/New_York', latitude: 39.9526, longitude: -75.1652 },
  { name: 'San Diego', country: 'USA', countryCode: 'US', timezone: 'America/Los_Angeles', latitude: 32.7157, longitude: -117.1611 },
  { name: 'Portland', country: 'USA', countryCode: 'US', timezone: 'America/Los_Angeles', latitude: 45.5155, longitude: -122.6789 },
  { name: 'Phoenix', country: 'USA', countryCode: 'US', timezone: 'America/Phoenix', latitude: 33.4484, longitude: -112.074 },
  { name: 'Dallas', country: 'USA', countryCode: 'US', timezone: 'America/Chicago', latitude: 32.7767, longitude: -96.797 },
  { name: 'Houston', country: 'USA', countryCode: 'US', timezone: 'America/Chicago', latitude: 29.7604, longitude: -95.3698 },
  { name: 'Washington DC', country: 'USA', countryCode: 'US', timezone: 'America/New_York', latitude: 38.9072, longitude: -77.0369 },
  { name: 'Minneapolis', country: 'USA', countryCode: 'US', timezone: 'America/Chicago', latitude: 44.9778, longitude: -93.265 },
  { name: 'Detroit', country: 'USA', countryCode: 'US', timezone: 'America/Detroit', latitude: 42.3314, longitude: -83.0458 },

  // Europe
  { name: 'Munich', country: 'Germany', countryCode: 'DE', timezone: 'Europe/Berlin', latitude: 48.1351, longitude: 11.582 },
  { name: 'Hamburg', country: 'Germany', countryCode: 'DE', timezone: 'Europe/Berlin', latitude: 53.5511, longitude: 9.9937 },
  { name: 'Edinburgh', country: 'UK', countryCode: 'GB', timezone: 'Europe/London', latitude: 55.9533, longitude: -3.1883 },
  { name: 'Manchester', country: 'UK', countryCode: 'GB', timezone: 'Europe/London', latitude: 53.4808, longitude: -2.2426 },
  { name: 'Athens', country: 'Greece', countryCode: 'GR', timezone: 'Europe/Athens', latitude: 37.9838, longitude: 23.7275 },
  { name: 'Budapest', country: 'Hungary', countryCode: 'HU', timezone: 'Europe/Budapest', latitude: 47.4979, longitude: 19.0402 },
  { name: 'Warsaw', country: 'Poland', countryCode: 'PL', timezone: 'Europe/Warsaw', latitude: 52.2297, longitude: 21.0122 },
  { name: 'Krakow', country: 'Poland', countryCode: 'PL', timezone: 'Europe/Warsaw', latitude: 50.0647, longitude: 19.945 },
  { name: 'Oslo', country: 'Norway', countryCode: 'NO', timezone: 'Europe/Oslo', latitude: 59.9139, longitude: 10.7522 },
  { name: 'Helsinki', country: 'Finland', countryCode: 'FI', timezone: 'Europe/Helsinki', latitude: 60.1699, longitude: 24.9384 },
  { name: 'Zurich', country: 'Switzerland', countryCode: 'CH', timezone: 'Europe/Zurich', latitude: 47.3769, longitude: 8.5417 },
  { name: 'Florence', country: 'Italy', countryCode: 'IT', timezone: 'Europe/Rome', latitude: 43.7696, longitude: 11.2558 },
  { name: 'Venice', country: 'Italy', countryCode: 'IT', timezone: 'Europe/Rome', latitude: 45.4408, longitude: 12.3155 },
  { name: 'Nice', country: 'France', countryCode: 'FR', timezone: 'Europe/Paris', latitude: 43.7102, longitude: 7.262 },
  { name: 'Lyon', country: 'France', countryCode: 'FR', timezone: 'Europe/Paris', latitude: 45.764, longitude: 4.8357 },
  { name: 'Seville', country: 'Spain', countryCode: 'ES', timezone: 'Europe/Madrid', latitude: 37.3891, longitude: -5.9845 },
  { name: 'Valencia', country: 'Spain', countryCode: 'ES', timezone: 'Europe/Madrid', latitude: 39.4699, longitude: -0.3763 },
  { name: 'Porto', country: 'Portugal', countryCode: 'PT', timezone: 'Europe/Lisbon', latitude: 41.1579, longitude: -8.6291 },
  { name: 'Ibiza', country: 'Spain', countryCode: 'ES', timezone: 'Europe/Madrid', latitude: 38.9067, longitude: 1.4206 },
  { name: 'Mykonos', country: 'Greece', countryCode: 'GR', timezone: 'Europe/Athens', latitude: 37.4467, longitude: 25.3289 },

  // Asia Pacific
  { name: 'Osaka', country: 'Japan', countryCode: 'JP', timezone: 'Asia/Tokyo', latitude: 34.6937, longitude: 135.5023 },
  { name: 'Kyoto', country: 'Japan', countryCode: 'JP', timezone: 'Asia/Tokyo', latitude: 35.0116, longitude: 135.7681 },
  { name: 'Beijing', country: 'China', countryCode: 'CN', timezone: 'Asia/Shanghai', latitude: 39.9042, longitude: 116.4074 },
  { name: 'Kuala Lumpur', country: 'Malaysia', countryCode: 'MY', timezone: 'Asia/Kuala_Lumpur', latitude: 3.139, longitude: 101.6869 },
  { name: 'Ho Chi Minh City', country: 'Vietnam', countryCode: 'VN', timezone: 'Asia/Ho_Chi_Minh', latitude: 10.8231, longitude: 106.6297 },
  { name: 'Jakarta', country: 'Indonesia', countryCode: 'ID', timezone: 'Asia/Jakarta', latitude: -6.2088, longitude: 106.8456 },
  { name: 'Manila', country: 'Philippines', countryCode: 'PH', timezone: 'Asia/Manila', latitude: 14.5995, longitude: 120.9842 },
  { name: 'Delhi', country: 'India', countryCode: 'IN', timezone: 'Asia/Kolkata', latitude: 28.7041, longitude: 77.1025 },
  { name: 'Bangalore', country: 'India', countryCode: 'IN', timezone: 'Asia/Kolkata', latitude: 12.9716, longitude: 77.5946 },
  { name: 'Phuket', country: 'Thailand', countryCode: 'TH', timezone: 'Asia/Bangkok', latitude: 7.8804, longitude: 98.3923 },

  // Oceania
  { name: 'Brisbane', country: 'Australia', countryCode: 'AU', timezone: 'Australia/Brisbane', latitude: -27.4698, longitude: 153.0251 },
  { name: 'Perth', country: 'Australia', countryCode: 'AU', timezone: 'Australia/Perth', latitude: -31.9505, longitude: 115.8605 },

  // Middle East
  { name: 'Abu Dhabi', country: 'UAE', countryCode: 'AE', timezone: 'Asia/Dubai', latitude: 24.4539, longitude: 54.3773 },
  { name: 'Doha', country: 'Qatar', countryCode: 'QA', timezone: 'Asia/Qatar', latitude: 25.2854, longitude: 51.531 },

  // South America
  { name: 'Medellin', country: 'Colombia', countryCode: 'CO', timezone: 'America/Bogota', latitude: 6.2442, longitude: -75.5812 },
  { name: 'Lima', country: 'Peru', countryCode: 'PE', timezone: 'America/Lima', latitude: -12.0464, longitude: -77.0428 },
  { name: 'Santiago', country: 'Chile', countryCode: 'CL', timezone: 'America/Santiago', latitude: -33.4489, longitude: -70.6693 },

  // Africa
  { name: 'Johannesburg', country: 'South Africa', countryCode: 'ZA', timezone: 'Africa/Johannesburg', latitude: -26.2041, longitude: 28.0473 },
  { name: 'Nairobi', country: 'Kenya', countryCode: 'KE', timezone: 'Africa/Nairobi', latitude: -1.2921, longitude: 36.8219 },
  { name: 'Cairo', country: 'Egypt', countryCode: 'EG', timezone: 'Africa/Cairo', latitude: 30.0444, longitude: 31.2357 },
  { name: 'Lagos', country: 'Nigeria', countryCode: 'NG', timezone: 'Africa/Lagos', latitude: 6.5244, longitude: 3.3792 },
  { name: 'Accra', country: 'Ghana', countryCode: 'GH', timezone: 'Africa/Accra', latitude: 5.6037, longitude: -0.187 },
  { name: 'Casablanca', country: 'Morocco', countryCode: 'MA', timezone: 'Africa/Casablanca', latitude: 33.5731, longitude: -7.5898 },

  // Caribbean
  { name: 'Cancun', country: 'Mexico', countryCode: 'MX', timezone: 'America/Cancun', latitude: 21.1619, longitude: -86.8515 },
  { name: 'San Juan', country: 'Puerto Rico', countryCode: 'PR', timezone: 'America/Puerto_Rico', latitude: 18.4655, longitude: -66.1057 },
  { name: 'Havana', country: 'Cuba', countryCode: 'CU', timezone: 'America/Havana', latitude: 23.1136, longitude: -82.3666 },
];

// Generate unique ID
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `city${timestamp}${randomPart}`;
}

// Generate cityId from name
function generateCityId(name: string): string {
  return name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .substring(0, 20);
}

// Get default hero image for a city
function getHeroImage(cityName: string): string {
  const cityImages: Record<string, string> = {
    'Seattle': 'https://images.unsplash.com/photo-1502175353174-a7a70e73b362?w=800&q=80',
    'Atlanta': 'https://images.unsplash.com/photo-1575917649705-5b59aaa12e6b?w=800&q=80',
    'Munich': 'https://images.unsplash.com/photo-1595867818082-083862f3d630?w=800&q=80',
    'Edinburgh': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80',
    'Athens': 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=800&q=80',
    'Budapest': 'https://images.unsplash.com/photo-1551867633-194f125bddfa?w=800&q=80',
    'Osaka': 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=800&q=80',
    'Ibiza': 'https://images.unsplash.com/photo-1586500036706-41963de24d8b?w=800&q=80',
    'Cairo': 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&q=80',
    'Cancun': 'https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=800&q=80',
  };

  return cityImages[cityName] || 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80';
}

async function main() {
  console.log('🚀 Adding Additional Cities to Database\n');
  console.log('='.repeat(60));

  // Get existing cities
  const { data: existingCities, error: fetchError } = await supabase
    .from('City')
    .select('name');

  if (fetchError) {
    console.error('❌ Error fetching existing cities:', fetchError);
    return;
  }

  const existingNames = new Set((existingCities || []).map((c: any) => c.name));
  console.log(`\n📊 Existing cities: ${existingNames.size}`);

  // Filter out cities that already exist
  const citiesToAdd = ADDITIONAL_CITIES.filter(city => !existingNames.has(city.name));
  console.log(`📝 Cities to add: ${citiesToAdd.length}\n`);

  if (citiesToAdd.length === 0) {
    console.log('✅ All cities already exist in database!');
    return;
  }

  let added = 0;
  let startRank = existingNames.size + 1;

  for (let i = 0; i < citiesToAdd.length; i++) {
    const city = citiesToAdd[i];
    const id = generateId();
    const cityId = generateCityId(city.name);
    const timestamp = new Date().toISOString();

    const cityData = {
      id,
      cityId,
      name: city.name,
      country: city.country,
      countryCode: city.countryCode,
      rank: startRank + i,
      timezone: city.timezone,
      heroImage: getHeroImage(city.name),
      cardImage: getHeroImage(city.name),
      accentColor: '#00D9FF',
      totalPlansThisWeek: 0,
      featured: false,
      searchCount: 0,
      latitude: city.latitude,
      longitude: city.longitude,
      lastUpdated: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const { error: insertError } = await supabase
      .from('City')
      .insert(cityData);

    if (insertError) {
      console.error(`❌ Error adding ${city.name}:`, insertError.message);
    } else {
      added++;
      console.log(`✓ Added: ${city.name}, ${city.country} (rank: ${startRank + i})`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Complete!\n');
  console.log(`   - Cities added: ${added}`);
  console.log(`   - Total cities: ${existingNames.size + added}`);

  // Verify
  const { count } = await supabase
    .from('City')
    .select('*', { count: 'exact', head: true });

  console.log(`   - Verified total: ${count}`);
}

main().catch(console.error);
