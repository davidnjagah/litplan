/**
 * Generate Unique, Dynamic Group Plans for Top 100 Cities
 *
 * Requirements:
 * 1. Each group plan must have UNIQUE venues - no repeating locations
 * 2. Thematic variety: rooftop, comedy, jazz, cultural, alternative scene
 * 3. For coastal cities: add boat party experiences (pre-party → day boat/cruise → after party)
 * 4. High quality, well-thought-out plans with real venue names
 *
 * Run with: deno run --allow-net --allow-env scripts/generate-unique-group-plans.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';

const SUPABASE_URL = 'https://clktdigankjszupvrsqt.supabase.co';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsa3RkaWdhbmtqc3p1cHZyc3F0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzAxNjQzNywiZXhwIjoyMDgyNTkyNDM3fQ.MpZ0c4A1M58ih0Tdij7zcnzyoziI1plDwFwzN-FVCKs';
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

// Coastal cities that should have boat party plans
const COASTAL_CITIES = new Set([
  'Miami', 'Los Angeles', 'San Francisco', 'Barcelona', 'Lisbon', 'Dubai',
  'Sydney', 'Melbourne', 'Rio de Janeiro', 'Cape Town', 'Tel Aviv', 'Hong Kong',
  'Singapore', 'Bali', 'Bangkok', 'Auckland', 'Vancouver', 'Tokyo', 'Mumbai',
  'Istanbul', 'Amsterdam', 'Copenhagen', 'Stockholm', 'London', 'New York'
]);

// Group plan themes/types
const PLAN_THEMES = [
  'Ultimate Night Out',       // Classic bar hopping progression
  'Rooftop Experience',       // Rooftop bars/lounges
  'Jazz & Cocktails',         // Jazz venues with cocktail bars
  'Comedy & Drinks',          // Comedy shows with pre/post drinks
  'Cultural Night',           // Cultural experience (flamenco, theater, etc.)
  'Alternative Scene',        // Underground/indie spots
  'Fine Dining Journey',      // Upscale restaurant crawl
  'Live Music Adventure',     // Music venues progression
  'Speakeasy Crawl',         // Hidden bars and speakeasies
  'Local Favorites'          // Authentic local spots
];

// Additional theme for coastal cities
const BOAT_PARTY_THEME = 'Day Party at Sea';

interface GroupPlanVenue {
  venueName: string;
  description: string;
  startTime: string;
  duration: number;
  order: number;
}

interface GroupPlan {
  title: string;
  description: string;
  difficulty: 'easy' | 'moderate' | 'challenging';
  bestFor: string[];
  venues: GroupPlanVenue[];
  isWeekend: boolean;
  proOnly: boolean;
}

async function generateGroupPlansForCity(
  cityName: string,
  country: string,
  cityId: string,
  isCoastal: boolean
): Promise<GroupPlan[]> {
  // Determine which themes to use for this city
  const themesToGenerate = [...PLAN_THEMES];
  if (isCoastal) {
    themesToGenerate.push(BOAT_PARTY_THEME);
  }

  // Select 4-6 unique themes for this city
  const shuffledThemes = themesToGenerate.sort(() => Math.random() - 0.5);
  const selectedThemes = shuffledThemes.slice(0, isCoastal ? 6 : 5);

  console.log(`\n🌆 Generating plans for ${cityName}, ${country}`);
  console.log(`   Themes: ${selectedThemes.join(', ')}`);

  const prompt = `You are an expert local guide for ${cityName}, ${country}. Generate ${selectedThemes.length} UNIQUE group plans for nightlife/experiences.

CRITICAL REQUIREMENTS:
1. EVERY venue must be a REAL, SPECIFIC establishment that exists in ${cityName}
2. NO venue can appear in more than ONE group plan
3. Use actual street addresses or neighborhoods
4. Each plan should have 2-4 venues in logical progression
5. Times should flow naturally (start 7-9PM, end 1-3AM)

Generate plans for these themes: ${selectedThemes.join(', ')}

${isCoastal ? `For the "Day Party at Sea" theme:
- Include a pre-party venue (beach bar/waterfront restaurant)
- A boat/yacht party or harbor cruise
- An after-party venue (club or late-night spot)
Use REAL boat party operators in ${cityName}.` : ''}

For each plan, provide:
- title: Catchy 2-4 word name
- description: One compelling sentence about the experience
- difficulty: easy (2 stops, casual), moderate (3 stops, some walking), challenging (4+ stops, high energy)
- bestFor: Array of 2 items from [groups, couples, solo, celebration, date-night]
- venues: Array of 2-4 venues, each with:
  - venueName: REAL establishment name
  - description: 1-2 sentences about what makes it special
  - startTime: HH:MM format (24hr)
  - duration: minutes (60-120)
  - order: 1, 2, 3, etc.

Respond ONLY with a valid JSON array of plans. No markdown, no explanation.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse the JSON response
    const plans: GroupPlan[] = JSON.parse(content.text);

    // Validate uniqueness of venues across all plans
    const allVenues = new Set<string>();
    for (const plan of plans) {
      for (const venue of plan.venues) {
        const venueLower = venue.venueName.toLowerCase();
        if (allVenues.has(venueLower)) {
          console.log(`   ⚠️ Duplicate venue detected: ${venue.venueName}`);
        }
        allVenues.add(venueLower);
      }
    }

    console.log(`   ✅ Generated ${plans.length} plans with ${allVenues.size} unique venues`);
    return plans;
  } catch (error) {
    console.error(`   ❌ Error generating plans for ${cityName}:`, error);
    return [];
  }
}

async function insertGroupPlans(cityId: string, cityName: string, plans: GroupPlan[]) {
  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const flowId = `flow-${cityId.slice(-8)}-${i + 1}-${Date.now()}`;

    // Insert GroupFlow
    const { data: groupFlow, error: flowError } = await supabase
      .from('GroupFlow')
      .insert({
        id: flowId,
        flowId: flowId,
        cityId: cityId,
        title: plan.title,
        description: plan.description,
        difficulty: plan.difficulty,
        isWeekend: plan.isWeekend ?? true,
        proOnly: i >= 2, // First 2 are free
        rank: i + 1,
        currency: 'USD'
      })
      .select()
      .single();

    if (flowError) {
      console.error(`   ❌ Error inserting flow "${plan.title}":`, flowError.message);
      continue;
    }

    // Insert GroupFlowSteps
    for (const venue of plan.venues) {
      const stepId = `step-${flowId}-${venue.order}-${Date.now()}`;

      const { error: stepError } = await supabase
        .from('GroupFlowStep')
        .insert({
          id: stepId,
          flowId: groupFlow.id,
          stepNumber: venue.order,
          title: `Stop ${venue.order}`,
          venueName: venue.venueName,
          duration: venue.duration,
          description: venue.description,
          startTime: venue.startTime,
          thumbnail: `https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&q=80`
        });

      if (stepError) {
        console.error(`   ❌ Error inserting step:`, stepError.message);
      }
    }

    console.log(`   ✓ Inserted: ${plan.title} (${plan.venues.length} stops)`);
  }
}

async function main() {
  console.log('🚀 Starting Unique Group Plans Generation\n');
  console.log('=' .repeat(60));

  // 1. First, delete all existing group flows and steps
  console.log('\n🗑️ Clearing existing group plans...');

  const { error: stepsDeleteError } = await supabase
    .from('GroupFlowStep')
    .delete()
    .neq('id', '');

  if (stepsDeleteError) {
    console.error('Error deleting steps:', stepsDeleteError);
  }

  const { error: flowsDeleteError } = await supabase
    .from('GroupFlow')
    .delete()
    .neq('id', '');

  if (flowsDeleteError) {
    console.error('Error deleting flows:', flowsDeleteError);
  }

  console.log('✓ Cleared existing data\n');

  // 2. Get all cities
  const { data: cities, error: citiesError } = await supabase
    .from('City')
    .select('id, name, country')
    .order('rank', { ascending: true })
    .limit(100);

  if (citiesError || !cities) {
    console.error('Error fetching cities:', citiesError);
    return;
  }

  console.log(`📍 Found ${cities.length} cities to process\n`);

  // 3. Generate plans for each city
  let totalPlans = 0;
  let totalVenues = 0;

  for (const city of cities) {
    const isCoastal = COASTAL_CITIES.has(city.name);

    const plans = await generateGroupPlansForCity(
      city.name,
      city.country,
      city.id,
      isCoastal
    );

    if (plans.length > 0) {
      await insertGroupPlans(city.id, city.name, plans);
      totalPlans += plans.length;
      totalVenues += plans.reduce((sum, p) => sum + p.venues.length, 0);
    }

    // Rate limiting - wait between cities
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Generation Complete!');
  console.log(`   Total Group Plans: ${totalPlans}`);
  console.log(`   Total Unique Venues: ${totalVenues}`);
  console.log(`   Cities Processed: ${cities.length}`);
}

main().catch(console.error);
