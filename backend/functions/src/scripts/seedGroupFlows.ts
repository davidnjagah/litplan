/**
 * Seed Script for Group Flows
 * Generates 10 group flows per city (100 total across 10 cities)
 * Each group flow has 2-3 connected activities forming a complete nightlife experience
 */

import {db, admin} from '../config/firestore';
import {citiesCollection} from '../config/collections';

// Flow themes by city
const FLOW_THEMES: Record<string, string[]> = {
  'nyc-001': [
    'Saturday Night Out in Williamsburg',
    'Manhattan Upscale Experience',
    'Brooklyn Nightlife Crawl',
    'Jazz & Cocktails in Greenwich',
    'Lower East Side Party Night',
    'Rooftop to Underground',
    'Comedy & Clubs Night',
    'Brooklyn Brewery to Dance Club',
    'SoHo to East Village',
    'Ultimate NYC Night Out',
  ],
  'la-001': [
    'Hollywood Nights Experience',
    'West Hollywood Party Circuit',
    'Downtown LA Night Tour',
    'Beach to Club Experience',
    'Sunset Boulevard Night',
    'Venice to Santa Monica',
    'LA Rooftop Tour',
    'Music Venue Crawl',
    'Celebrity Hotspots Night',
    'Ultimate LA Experience',
  ],
  'mia-001': [
    'South Beach Club Circuit',
    'Wynwood Art & Nightlife',
    'Miami Beach Ultimate Night',
    'Downtown to Brickell',
    'Beach to Bass Experience',
    'VIP Miami Experience',
    'Cocktails to Dance Floor',
    'Ocean Drive to Club Space',
    'Rooftop to Beach Club',
    'Ultimate Miami Night',
  ],
  'lon-001': [
    'Shoreditch Night Out',
    'Soho to Camden Experience',
    'West End to Mayfair',
    'Electronic Music Tour',
    'Jazz to Dance Clubs',
    'Rooftop to Underground',
    'Kings Cross Circuit',
    'East London Crawl',
    'Central London VIP Night',
    'Ultimate London Experience',
  ],
  'par-001': [
    'Le Marais to Pigalle',
    'Latin Quarter Night',
    'Oberkampf Party Circuit',
    'Electronic Paris Experience',
    'Champs-Élysées to Bastille',
    'Montmartre Jazz & Clubs',
    'Seine Riverside Night',
    'Underground Paris Tour',
    'Belleville to Bastille',
    'Ultimate Paris Night',
  ],
  'tyo-001': [
    'Shibuya to Roppongi',
    'Shinjuku Night Experience',
    'Harajuku to Ginza',
    'Tokyo Electronic Tour',
    'Karaoke to Dance Clubs',
    'Tokyo Bay Night',
    'Akihabara to Shibuya',
    'Roppongi Hills Circuit',
    'Jazz & Techno Tokyo',
    'Ultimate Tokyo Night',
  ],
  'ber-001': [
    'Kreuzberg Circuit',
    'Friedrichshain Experience',
    'Neukölln Night Tour',
    'Techno Temple Tour',
    'East Side Gallery to Berghain',
    'Warschauer to RAW',
    'Mitte to Kreuzberg',
    'Underground Berlin',
    'Waterfront Night',
    'Ultimate Berlin Experience',
  ],
  'bcn-001': [
    'Gothic Quarter to Barceloneta',
    'Eixample Party Night',
    'Beach to Club Experience',
    'Gràcia to El Raval',
    'Barcelona Electronic Tour',
    'Rambla to Port Olímpic',
    'Poblenou Night Circuit',
    'Rooftop to Beach Club',
    'Barcelona VIP Experience',
    'Ultimate Barcelona Night',
  ],
  'ams-001': [
    'De Pijp to Jordaan',
    'Noord Underground Tour',
    'Canal Ring Experience',
    'Amsterdam Electronic Circuit',
    'Centrum to Oost',
    'Waterfront Night',
    'Red Light to West',
    'Amsterdam Festival Night',
    'Warehouse to Club Tour',
    'Ultimate Amsterdam Night',
  ],
  'dxb-001': [
    'Dubai Marina Circuit',
    'Downtown to DIFC',
    'Palm Jumeirah Experience',
    'JBR to Business Bay',
    'Dubai Luxury Night',
    'Beach to Sky Experience',
    'Marina to Downtown',
    'Burj Khalifa to Club',
    'Rooftop Dubai Tour',
    'Ultimate Dubai Night',
  ],
};

// Activity titles by type
const ACTIVITY_TYPES = {
  preGame: [
    'Pre-Game Drinks',
    'Cocktail Hour',
    'Rooftop Aperitifs',
    'Wine Bar Start',
    'Sunset Drinks',
  ],
  main: [
    'Main Event',
    'Dance Floor',
    'Live Music',
    'DJ Set',
    'Club Night',
    'Concert',
    'Electronic Show',
  ],
  afterParty: [
    'After Party',
    'Late Night Dancing',
    'Sunrise Session',
    'Final Stop',
    'Wind Down',
  ],
};

/**
 * Get random item from array
 */
function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get random number in range
 */
function getRandomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a group flow with 2-3 connected activities
 */
async function generateGroupFlow(
  cityId: string,
  cityName: string,
  rank: number,
  themes: string[],
  plans: any[]
): Promise<any> {
  const flowId = `${cityId}-flow-${rank.toString().padStart(3, '0')}`;
  const title = themes[rank - 1] || getRandomItem(themes);

  // Select 2-3 activities from available plans (use top ranked plans)
  const numActivities = getRandomInRange(2, 3);
  const selectedPlans = plans.slice((rank - 1) * 3, (rank - 1) * 3 + numActivities);

  // Create activities/steps
  const activities = selectedPlans.map((plan, index) => {
    const stepNumber = index + 1;
    const activityType =
      stepNumber === 1 ? 'preGame' :
      stepNumber === numActivities ? 'afterParty' :
      'main';

    return {
      activityId: `${flowId}-activity-${stepNumber}`,
      venueName: plan.venueName,
      location: {
        address: plan.location.address,
        coordinates: {
          latitude: plan.location.coordinates.latitude || 0,
          longitude: plan.location.coordinates.longitude || 0,
        },
      },
      startTime: stepNumber === 1 ? '20:00' :
                 stepNumber === 2 ? '22:00' : '01:00',
      duration: stepNumber === 1 ? 90 : // 1.5 hours pre-game
                stepNumber === 2 ? 120 : // 2 hours main event
                90, // 1.5 hours after party
      description: `${getRandomItem(ACTIVITY_TYPES[activityType as keyof typeof ACTIVITY_TYPES])} at ${plan.venueName}. ${plan.description}`,
      order: stepNumber,
    };
  });

  // Calculate total duration
  const totalDuration = activities.reduce((sum, activity) => sum + activity.duration, 0);

  // Calculate estimated cost
  const totalCost = selectedPlans.reduce((sum, plan) => {
    return sum + (plan.pricing.entryFee || 0) + getRandomInRange(2000, 5000); // Entry + drinks/food
  }, 0);

  // Determine difficulty based on duration and number of venues
  const difficulty =
    totalDuration < 180 ? 'easy' :
    totalDuration < 300 ? 'moderate' :
    'intense';

  // Determine bestFor
  const bestFor = ['groups'];
  if (numActivities === 2 && difficulty === 'easy') {
    bestFor.push('couples');
  }
  if (difficulty === 'moderate') {
    bestFor.push('solo');
  }

  // Build description
  const venueNames = activities.map(a => a.venueName).join(' → ');
  const description = `${venueNames}. A ${difficulty} ${totalDuration / 60}-hour experience through ${cityName}'s best nightlife.`;

  // Collect AI tags from plans
  const allGenres = new Set<string>();
  selectedPlans.forEach(plan => {
    plan.aiTags.genre.forEach((g: string) => allGenres.add(g));
  });

  return {
    groupFlowId: flowId,
    cityId,
    title,
    description,
    activities,
    totalDuration,
    estimatedCost: {
      min: Math.floor(totalCost * 0.8),
      max: Math.floor(totalCost * 1.2),
      currency: selectedPlans[0].pricing.currency,
    },
    difficulty,
    bestFor,
    aiTags: Array.from(allGenres).slice(0, 5),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

/**
 * Main seed function
 */
async function seedGroupFlows() {
  console.log('Starting seed script for group flows...');

  try {
    // Get all cities
    const citiesSnapshot = await citiesCollection.get();

    if (citiesSnapshot.empty) {
      console.log('No cities found. Please run seed:cities first.');
      return;
    }

    console.log(`Found ${citiesSnapshot.size} cities.`);

    let totalFlowsCreated = 0;

    // For each city, generate 10 group flows
    for (const cityDoc of citiesSnapshot.docs) {
      const cityData = cityDoc.data();
      const cityId = cityData.cityId;
      const cityName = cityData.name;

      console.log(`\nSeeding group flows for ${cityName} (${cityId})...`);

      const themes = FLOW_THEMES[cityId] || [];
      if (themes.length === 0) {
        console.log(`  Warning: No themes defined for ${cityId}, skipping...`);
        continue;
      }

      // Get plans for this city to use in group flows
      const plansSnapshot = await cityDoc.ref.collection('plans')
        .orderBy('rank')
        .limit(30) // Get top 30 plans to create flows from
        .get();

      if (plansSnapshot.empty) {
        console.log(`  Warning: No plans found for ${cityId}, skipping...`);
        continue;
      }

      const plans = plansSnapshot.docs.map(doc => doc.data());
      console.log(`  Found ${plans.length} plans to build flows from`);

      // Generate 10 group flows
      const batch = db.batch();
      let flowsCreated = 0;

      for (let rank = 1; rank <= 10; rank++) {
        const groupFlow = await generateGroupFlow(cityId, cityName, rank, themes, plans);

        // Get groupFlows subcollection reference
        const flowRef = cityDoc.ref.collection('groupFlows').doc(groupFlow.groupFlowId);
        batch.set(flowRef, groupFlow);
        flowsCreated++;
      }

      // Commit batch
      await batch.commit();
      console.log(`  ✓ Created ${flowsCreated} group flows for ${cityName}`);
      totalFlowsCreated += flowsCreated;
    }

    console.log(`\n✅ Seed script completed successfully!`);
    console.log(`   Total cities: ${citiesSnapshot.size}`);
    console.log(`   Total group flows created: ${totalFlowsCreated}`);
    console.log(`   Average flows per city: ${(totalFlowsCreated / citiesSnapshot.size).toFixed(0)}`);
  } catch (error) {
    console.error('Error seeding group flows:', error);
    throw error;
  }
}

// Run the seed script
seedGroupFlows()
  .then(() => {
    console.log('\nSeed script finished. Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });
