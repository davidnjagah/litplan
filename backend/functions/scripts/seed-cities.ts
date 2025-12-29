/**
 * Seed Cities Script
 * Seeds initial cities with sample nightlife plans and group flows
 * Run: npm run build && node lib/scripts/seed-cities.js
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Top 5 US nightlife cities data
 */
const CITIES = [
  {
    id: "new-york",
    name: "New York",
    country: "USA",
    timezone: "America/New_York",
    coordinates: {
      latitude: 40.7128,
      longitude: -74.0060,
    },
    metadata: {
      isActive: true,
      featured: true,
      plansCount: 10,
      groupFlowsCount: 3,
    },
    rank: 1,
    description: "The city that never sleeps - world-class nightlife, rooftop bars, and legendary clubs.",
  },
  {
    id: "los-angeles",
    name: "Los Angeles",
    country: "USA",
    timezone: "America/Los_Angeles",
    coordinates: {
      latitude: 34.0522,
      longitude: -118.2437,
    },
    metadata: {
      isActive: true,
      featured: true,
      plansCount: 10,
      groupFlowsCount: 3,
    },
    rank: 2,
    description: "Hollywood glamour meets beach vibes - sunset cocktails and celebrity hotspots.",
  },
  {
    id: "miami",
    name: "Miami",
    country: "USA",
    timezone: "America/New_York",
    coordinates: {
      latitude: 25.7617,
      longitude: -80.1918,
    },
    metadata: {
      isActive: true,
      featured: true,
      plansCount: 10,
      groupFlowsCount: 3,
    },
    rank: 3,
    description: "Tropical paradise with Latin beats - beachfront clubs and art deco nightlife.",
  },
  {
    id: "chicago",
    name: "Chicago",
    country: "USA",
    timezone: "America/Chicago",
    coordinates: {
      latitude: 41.8781,
      longitude: -87.6298,
    },
    metadata: {
      isActive: true,
      featured: true,
      plansCount: 10,
      groupFlowsCount: 3,
    },
    rank: 4,
    description: "Deep-dish pizza and deeper beats - jazz clubs and rooftop lounges.",
  },
  {
    id: "las-vegas",
    name: "Las Vegas",
    country: "USA",
    timezone: "America/Los_Angeles",
    coordinates: {
      latitude: 36.1699,
      longitude: -115.1398,
    },
    metadata: {
      isActive: true,
      featured: true,
      plansCount: 10,
      groupFlowsCount: 3,
    },
    rank: 5,
    description: "Sin City - mega-clubs, casino bars, and 24/7 entertainment.",
  },
];

/**
 * Sample nightlife plans for each city
 */
const PLAN_TEMPLATES = [
  {
    title: "Rooftop Bar Hopping",
    description: "Experience the city from above with stunning skyline views and craft cocktails.",
    vibe: "upscale",
    difficulty: "easy",
    estimatedCost: "$$$",
    duration: "3-4 hours",
    flags: {
      isWeekendPlan: false,
    },
  },
  {
    title: "Underground Jazz Night",
    description: "Discover hidden jazz clubs and intimate live music venues.",
    vibe: "chill",
    difficulty: "medium",
    estimatedCost: "$$",
    duration: "4-5 hours",
    flags: {
      isWeekendPlan: false,
    },
  },
  {
    title: "Club Circuit",
    description: "Dance the night away at the hottest nightclubs in the city.",
    vibe: "high-energy",
    difficulty: "easy",
    estimatedCost: "$$$",
    duration: "5-6 hours",
    flags: {
      isWeekendPlan: true,
    },
  },
  {
    title: "Speakeasy Adventure",
    description: "Uncover secret bars and prohibition-era cocktail lounges.",
    vibe: "mysterious",
    difficulty: "hard",
    estimatedCost: "$$$$",
    duration: "3-4 hours",
    flags: {
      isWeekendPlan: false,
    },
  },
  {
    title: "Waterfront Sunset",
    description: "Catch golden hour at beachfront bars and waterfront venues.",
    vibe: "relaxed",
    difficulty: "easy",
    estimatedCost: "$$",
    duration: "3-4 hours",
    flags: {
      isWeekendPlan: false,
    },
  },
  {
    title: "VIP Bottle Service",
    description: "Experience luxury nightlife with reserved tables and premium service.",
    vibe: "luxurious",
    difficulty: "medium",
    estimatedCost: "$$$$",
    duration: "4-5 hours",
    flags: {
      isWeekendPlan: true,
    },
  },
  {
    title: "Dive Bar Crawl",
    description: "Keep it real at authentic local dives with character and cheap drinks.",
    vibe: "casual",
    difficulty: "easy",
    estimatedCost: "$",
    duration: "4-5 hours",
    flags: {
      isWeekendPlan: false,
    },
  },
  {
    title: "Live Music Marathon",
    description: "Catch multiple live performances across the city's music venues.",
    vibe: "energetic",
    difficulty: "medium",
    estimatedCost: "$$",
    duration: "5-6 hours",
    flags: {
      isWeekendPlan: true,
    },
  },
  {
    title: "Cocktail Masterclass",
    description: "Learn from master mixologists at the city's best cocktail bars.",
    vibe: "educational",
    difficulty: "medium",
    estimatedCost: "$$$",
    duration: "3-4 hours",
    flags: {
      isWeekendPlan: false,
    },
  },
  {
    title: "After Hours Underground",
    description: "Party until sunrise at after-hours clubs and warehouse raves.",
    vibe: "wild",
    difficulty: "hard",
    estimatedCost: "$$$",
    duration: "6+ hours",
    flags: {
      isWeekendPlan: true,
    },
  },
];

/**
 * Sample group flows
 */
const GROUP_FLOW_TEMPLATES = [
  {
    title: "Bachelor/Bachelorette Special",
    description: "Epic night out for the whole crew - bottle service, party bus, VIP access.",
    groupSize: "8-15 people",
    difficulty: "easy",
    estimatedCost: "$$$$",
    duration: "6+ hours",
  },
  {
    title: "Birthday Bash",
    description: "Celebrate in style with reserved tables, group discounts, and special treatment.",
    groupSize: "6-12 people",
    difficulty: "easy",
    estimatedCost: "$$$",
    duration: "4-5 hours",
  },
  {
    title: "Pub Crawl Adventure",
    description: "Guided tour of the best bars with drink specials and group activities.",
    groupSize: "10-20 people",
    difficulty: "medium",
    estimatedCost: "$$",
    duration: "4-5 hours",
  },
];

/**
 * Generate sample venues for a plan
 */
function generateVenues(cityName: string, planTitle: string): any[] {
  const venueCount = 3;
  const venues = [];

  for (let i = 1; i <= venueCount; i++) {
    venues.push({
      name: `${cityName} Venue ${i}`,
      address: `${100 + i} Main Street, ${cityName}`,
      type: i === 1 ? "bar" : i === 2 ? "lounge" : "club",
      description: `Amazing ${planTitle.toLowerCase()} spot in ${cityName}`,
      order: i,
    });
  }

  return venues;
}

/**
 * Seed a single city with plans and group flows
 */
async function seedCity(cityData: any): Promise<void> {
  console.log(`\nSeeding city: ${cityData.name}...`);

  const cityRef = db.collection("cities").doc(cityData.id);

  // Create city document
  await cityRef.set({
    ...cityData,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`✓ Created city: ${cityData.name}`);

  // Seed nightlife plans
  const plansCollection = cityRef.collection("nightlifePlans");
  let planCount = 0;

  for (const [index, template] of PLAN_TEMPLATES.entries()) {
    const planId = `plan-${index + 1}`;
    const planData = {
      ...template,
      cityId: cityData.id,
      cityName: cityData.name,
      rank: index + 1,
      venues: generateVenues(cityData.name, template.title),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      generatedBy: "ai",
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await plansCollection.doc(planId).set(planData);
    planCount++;
  }

  console.log(`✓ Created ${planCount} nightlife plans`);

  // Seed group flows
  const groupFlowsCollection = cityRef.collection("groupFlows");
  let flowCount = 0;

  for (const [index, template] of GROUP_FLOW_TEMPLATES.entries()) {
    const flowId = `flow-${index + 1}`;
    const flowData = {
      ...template,
      cityId: cityData.id,
      cityName: cityData.name,
      rank: index + 1,
      venues: generateVenues(cityData.name, template.title),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      generatedBy: "ai",
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await groupFlowsCollection.doc(flowId).set(flowData);
    flowCount++;
  }

  console.log(`✓ Created ${flowCount} group flows`);
}

/**
 * Main seed function
 */
async function seedAllCities(): Promise<void> {
  console.log("========================================");
  console.log("🌆 Litplan Cities Seeding Script");
  console.log("========================================");
  console.log(`Seeding ${CITIES.length} cities with sample data...\n`);

  try {
    for (const city of CITIES) {
      await seedCity(city);
    }

    console.log("\n========================================");
    console.log("✨ Seeding completed successfully!");
    console.log("========================================");
    console.log(`\nSeeded cities:`);
    CITIES.forEach((city) => {
      console.log(`  - ${city.name} (${city.metadata.plansCount} plans, ${city.metadata.groupFlowsCount} flows)`);
    });
    console.log("\nNext steps:");
    console.log("1. Verify data in Firebase Console");
    console.log("2. Test API endpoints");
    console.log("3. Deploy to staging\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error seeding cities:", error);
    process.exit(1);
  }
}

// Run the seeding script
seedAllCities();
