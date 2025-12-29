/**
 * Seed Script for Plans
 * Generates 50 plans per city (500 total across 10 cities)
 * Uses realistic venue data and schedule information
 */

import {db, admin} from '../config/firestore';
import {citiesCollection} from '../config/collections';

// Venue data by city (inspired by UI Designer's MockDataService)
const CITY_VENUES: Record<string, string[]> = {
  'nyc-001': [
    'Blue Note Jazz Club', 'Le Bain', 'The Roof at PUBLIC', 'Brooklyn Brewery',
    'Comedy Cellar', 'House of Yes', 'Elsewhere', 'Bemelmans Bar',
    'Nowadays', 'The Box', 'Cielo', 'Output', 'The DL', 'Beauty Bar',
    'The Garret East', 'The Dead Rabbit', 'Attaboy', 'PDT',
    'Mood Ring', 'Bossa Nova Civic Club', 'Schimanski', 'Good Room',
    'The West Village', 'The Bronx Brewery', 'Pete\'s Candy Store',
  ],
  'la-001': [
    'The Troubadour', 'Skybar', 'Sound Nightclub', 'Exchange LA',
    'The Viper Room', 'Perch', 'Academy LA', 'The Roxy Theatre',
    'Bootsy Bellows', 'Warwick', 'The Whisky a Go Go', 'The Echo',
    'Catch LA', 'E.P. & L.P.', 'The Rooftop at The Standard',
    'Harvard & Stone', 'The Satellite', 'The Short Stop',
    'La Cita Bar', 'The Edison', 'The Regent Theater', 'The Novo',
    'EP/LP', 'Mama Shelter Rooftop', 'The Tower Bar',
  ],
  'mia-001': [
    'LIV', 'Story', 'E11EVEN', 'Nikki Beach', 'Basement',
    'Space', 'Hyde Beach', 'Club Space', 'WALL Lounge',
    'Do Not Sit on the Furniture', 'Treehouse', 'Rockwell',
    'Swan', 'Sugar', 'The Broken Shaker', 'Ball & Chain',
    'Mango\'s Tropical Cafe', 'Cafe La Trova', 'Sweet Liberty',
    'Bodega Taqueria y Tequila', 'Gramps', 'Basement Miami',
    'Floyd', 'The Regent Cocktail Club', 'Lost Boy',
  ],
  'lon-001': [
    'Fabric', 'Ministry of Sound', 'XOYO', 'Ronnie Scott\'s',
    'Printworks', 'The Box Soho', 'Cirque le Soir', 'Mahiki',
    'Heaven', 'Studio 338', 'EGG London', 'Cable', 'Corsica Studios',
    'Shoreditch House', 'Aqua Shard', 'The Roof Gardens',
    'Madison', 'Radio Rooftop', 'Proud Camden', 'Jazz Cafe',
    'KOKO', 'Electric Brixton', 'Phonox', 'Bussey Building',
    'The Nest', 'Fire & Lightbox',
  ],
  'par-001': [
    'Rex Club', 'Le Baron', 'Concrete', 'Silencio', 'Wanderlust',
    'New Morning', 'La Bellevilloise', 'Badaboum', 'Chez Moune',
    'Le Comptoir Général', 'La Machine du Moulin Rouge', 'Supersonic',
    'Glazart', 'Le Batofar', 'Showcase', 'Yoyo', 'Social Club',
    'Le Carmen', 'Le Montana', 'Rosa Bonheur', 'Le Panic Room',
    'Le Perchoir', 'Le Faust', 'Le Djoon', 'Point Éphémère',
  ],
  'tyo-001': [
    'Womb', 'Contact', 'Ageha', 'Vision', 'Blue Note Tokyo',
    'Unit', 'Air Tokyo', 'Oath', 'Sound Museum Vision', 'Atom',
    'Circus Tokyo', 'Maharaja', 'New Lex', 'Camelot',
    'Shibuya Chelsea Hotel', 'Club Quattro', 'Vuenos',
    'Trump Room', 'Aoyama Hachi', 'Daikanyama Unit', 'WWW',
    'Harlem', 'V2 Tokyo', 'Sankeys Penthouse', 'Bar Bonobo',
  ],
  'ber-001': [
    'Berghain', 'Watergate', 'Tresor', 'About Blank', 'Sisyphos',
    'Kater Blau', 'Wilde Renate', 'Griessmuehle', 'Salon zur Wilden Renate',
    'RSO.Berlin', 'Club der Visionaere', 'Ritter Butzke', 'Chalet',
    'Prince Charles', 'Magdalena', 'Klunkerkranich', '://about blank',
    'Birgit & Bier', 'Anomalie Art Club', 'Alte Münze', 'OHM',
    'Renate', 'Crack Bellmer', 'Mensch Meier', 'Mein Haus am See',
  ],
  'bcn-001': [
    'Razzmatazz', 'Opium', 'Pacha', 'Sala Apolo', 'City Hall',
    'Input', 'Moog', 'Macarena Club', 'Sutton', 'Otto Zutz',
    'La Terrrazza', 'Shôko', 'Eclipse Bar', 'CDLC', 'Bling Bling',
    'Marula Café', 'Sidecar Factory Club', 'Jamboree', 'Magic',
    'Harlem Jazz Club', 'Freedonia', 'Roxy Blue', 'Bikini',
    'Sala Salamandra', 'Club Catwalk',
  ],
  'ams-001': [
    'De School', 'Shelter', 'Radion', 'Claire', 'Paradiso',
    'Melkweg', 'AIR Amsterdam', 'Chicago Social Club', 'Sugar Factory',
    'Bitterzoet', 'Studio 80', 'Club Up', 'Disco Dolly',
    'Canvas', 'Café de Ceuvel', 'Skatecafé', 'Pllek', 'A\'DAM Tower',
    'Hannekes Boom', 'Tolhuistuin', 'Noorderlicht', 'De Marktkantine',
    'Trouw Amsterdam', 'Hotel Arena', 'Roest',
  ],
  'dxb-001': [
    'WHITE Dubai', 'Base Dubai', 'Soho Garden', 'At.mosphere', 'CÉ LA VI',
    'Bluewaters Island', 'SKY2.0', 'Toy Room', 'Cavalli Club', 'Billionaire Mansion',
    'Provocateur', 'Zero Gravity', 'Barasti Beach Bar', 'Industrial Avenue',
    '1 OAK Dubai', 'Vault', 'Cirque le Soir', 'Armani/Privé',
    'VIP Room Dubai', 'Music Room', 'Trilogy', 'TAO Beach Club',
    'Soho Garden DXB', 'Eden Beach Club', 'Club Boudoir',
  ],
};

// Categories for plans
const CATEGORIES = [
  'Rooftop Bar', 'Jazz Club', 'Nightclub', 'Live Music', 'Comedy Club',
  'Sports Bar', 'Lounge', 'Beach Club', 'Speakeasy', 'Wine Bar',
  'Cocktail Bar', 'Dance Club', 'Electronic Music', 'Hip Hop Club',
  'Latin Club', 'Karaoke Bar', 'Brewery', 'Pub', 'Restaurant & Bar',
];

// Genres and vibes
const GENRES = [
  'Electronic', 'House', 'Techno', 'Hip Hop', 'R&B', 'Jazz',
  'Rock', 'Indie', 'Latin', 'Reggaeton', 'EDM', 'Deep House',
];

const VIBES = [
  'Upbeat', 'Chill', 'Exclusive', 'Energetic', 'Intimate', 'Vibrant',
  'Sophisticated', 'Casual', 'Trendy', 'Underground', 'Classy', 'Fun',
];

// Types
const PLAN_TYPES: Array<'bar' | 'club' | 'event' | 'restaurant'> = ['bar', 'club', 'event', 'restaurant'];

// Neighborhoods by city
const NEIGHBORHOODS: Record<string, string[]> = {
  'nyc-001': ['Lower East Side', 'Williamsburg', 'SoHo', 'East Village', 'Midtown', 'Brooklyn', 'Manhattan'],
  'la-001': ['West Hollywood', 'Downtown LA', 'Venice Beach', 'Hollywood', 'Santa Monica', 'Silver Lake'],
  'mia-001': ['South Beach', 'Wynwood', 'Brickell', 'Miami Beach', 'Downtown', 'Coconut Grove'],
  'lon-001': ['Shoreditch', 'Soho', 'Camden', 'Brixton', 'Mayfair', 'Kings Cross', 'Dalston'],
  'par-001': ['Le Marais', 'Pigalle', 'Oberkampf', 'Bastille', 'Belleville', 'Saint-Germain'],
  'tyo-001': ['Shibuya', 'Roppongi', 'Shinjuku', 'Harajuku', 'Ginza', 'Akashabara'],
  'ber-001': ['Kreuzberg', 'Friedrichshain', 'Neukölln', 'Mitte', 'Prenzlauer Berg'],
  'bcn-001': ['Eixample', 'Gothic Quarter', 'El Raval', 'Gràcia', 'Poblenou', 'Barceloneta'],
  'ams-001': ['Centrum', 'De Pijp', 'Jordaan', 'Noord', 'West', 'Oost'],
  'dxb-001': ['Dubai Marina', 'Downtown Dubai', 'JBR', 'Palm Jumeirah', 'DIFC', 'Business Bay'],
};

// Currency by city
const CURRENCIES: Record<string, string> = {
  'nyc-001': 'USD',
  'la-001': 'USD',
  'mia-001': 'USD',
  'lon-001': 'GBP',
  'par-001': 'EUR',
  'tyo-001': 'JPY',
  'ber-001': 'EUR',
  'bcn-001': 'EUR',
  'ams-001': 'EUR',
  'dxb-001': 'AED',
};

/**
 * Get random item from array
 */
function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get random items from array
 */
function getRandomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Get random number in range
 */
function getRandomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a realistic plan for a city
 */
function generatePlan(
  cityId: string,
  rank: number,
  venues: string[],
  neighborhoods: string[],
  currency: string
): any {
  const venueName = venues[rank - 1] || getRandomItem(venues);
  const category = getRandomItem(CATEGORIES);
  const type = getRandomItem(PLAN_TYPES);
  const neighborhood = getRandomItem(neighborhoods);

  // Determine if this is a weekend plan (30% chance)
  const isWeekend = Math.random() > 0.7;

  // Get a date for next 7 days
  const daysFromNow = getRandomInRange(0, 6);
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const weekday = date.toLocaleDateString('en-US', {weekday: 'long'});

  // Random start time between 18:00 and 23:00
  const startHour = getRandomInRange(18, 23);
  const startTime = `${startHour.toString().padStart(2, '0')}:00`;

  // Entry fee (50% chance of free entry)
  const freeEntry = Math.random() > 0.5;
  const entryFee = freeEntry ? null : getRandomInRange(1000, 5000); // in cents

  // Price range
  const priceRange = entryFee === null ? '$' :
    entryFee < 2000 ? '$$' :
    entryFee < 3500 ? '$$$' : '$$$$';

  // Rating
  const averageRating = parseFloat((3.5 + Math.random() * 1.5).toFixed(1));
  const totalReviews = getRandomInRange(50, 500);

  const planId = `${cityId}-plan-${rank.toString().padStart(3, '0')}`;

  return {
    planId,
    cityId,
    rank,
    title: venueName,
    venueName,
    description: `Experience ${venueName} in ${neighborhood}. ${category} featuring ${getRandomItems(GENRES, 2).join(' and ')} with a ${getRandomItem(VIBES).toLowerCase()} vibe.`,
    category,
    type,
    images: {
      hero: `https://images.unsplash.com/photo-${getRandomInRange(1500000000000, 1600000000000)}-nightlife`,
      thumbnail: `https://images.unsplash.com/photo-${getRandomInRange(1500000000000, 1600000000000)}-nightlife?w=400`,
      gallery: [],
    },
    location: {
      address: `${getRandomInRange(100, 999)} ${neighborhood} St`,
      neighborhood,
      googleMapsUrl: `https://maps.google.com/?q=${venueName.replace(/\s/g, '+')}`,
      coordinates: {
        latitude: 0,
        longitude: 0,
      },
    },
    schedule: {
      date: date.toISOString().split('T')[0],
      startTime,
      endTime: null,
      isWeekend,
      weekday,
    },
    pricing: {
      entryFee,
      currency,
      priceRange,
      freeEntry,
    },
    aiTags: {
      genre: getRandomItems(GENRES, getRandomInRange(1, 3)),
      vibe: getRandomItems(VIBES, getRandomInRange(1, 3)),
      eventType: getRandomItem(['DJ Night', 'Live Band', 'Open Mic', 'Themed Night', 'Happy Hour']),
    },
    flags: {
      isIndividual: true,
      isGroup: rank <= 10, // First 10 plans can be used in group flows
      isWeekend,
      isFeatured: rank <= 5, // Top 5 plans are featured
    },
    reviews: {
      averageRating,
      totalReviews,
      source: getRandomItem(['Google', 'Yelp', 'TripAdvisor']),
    },
    metadata: {
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'Seed Script',
    },
  };
}

/**
 * Main seed function
 */
async function seedPlans() {
  console.log('Starting seed script for plans...');

  try {
    // Get all cities
    const citiesSnapshot = await citiesCollection.get();

    if (citiesSnapshot.empty) {
      console.log('No cities found. Please run seed:cities first.');
      return;
    }

    console.log(`Found ${citiesSnapshot.size} cities.`);

    let totalPlansCreated = 0;

    // For each city, generate 50 plans
    for (const cityDoc of citiesSnapshot.docs) {
      const cityData = cityDoc.data();
      const cityId = cityData.cityId;
      const cityName = cityData.name;

      console.log(`\nSeeding plans for ${cityName} (${cityId})...`);

      const venues = CITY_VENUES[cityId] || [];
      if (venues.length === 0) {
        console.log(`  Warning: No venues defined for ${cityId}, skipping...`);
        continue;
      }

      const neighborhoods = NEIGHBORHOODS[cityId] || ['Downtown'];
      const currency = CURRENCIES[cityId] || 'USD';

      // Generate 50 plans
      const batch = db.batch();
      let plansCreated = 0;

      for (let rank = 1; rank <= 50; rank++) {
        const plan = generatePlan(cityId, rank, venues, neighborhoods, currency);

        // Get plans subcollection reference
        const planRef = cityDoc.ref.collection('plans').doc(plan.planId);
        batch.set(planRef, plan);
        plansCreated++;
      }

      // Commit batch
      await batch.commit();
      console.log(`  ✓ Created ${plansCreated} plans for ${cityName}`);
      totalPlansCreated += plansCreated;

      // Update city metadata
      await cityDoc.ref.update({
        'metadata.totalPlansThisWeek': plansCreated,
        'metadata.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    console.log(`\n✅ Seed script completed successfully!`);
    console.log(`   Total cities: ${citiesSnapshot.size}`);
    console.log(`   Total plans created: ${totalPlansCreated}`);
    console.log(`   Average plans per city: ${(totalPlansCreated / citiesSnapshot.size).toFixed(0)}`);
  } catch (error) {
    console.error('Error seeding plans:', error);
    throw error;
  }
}

// Run the seed script
seedPlans()
  .then(() => {
    console.log('\nSeed script finished. Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });
