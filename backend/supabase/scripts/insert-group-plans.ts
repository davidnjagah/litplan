/**
 * Insert Unique Group Plans into Supabase
 *
 * This script:
 * 1. Clears all existing GroupFlows and GroupFlowSteps
 * 2. Loads the high-quality curated group plans data
 * 3. Inserts them into the database with proper relationships
 *
 * Run with: deno run --allow-net --allow-read scripts/insert-group-plans.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GROUP_PLANS_DATA, GroupPlan } from './group-plans-data.ts';

const SUPABASE_URL = 'https://clktdigankjszupvrsqt.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsa3RkaWdhbmtqc3p1cHZyc3F0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzAxNjQzNywiZXhwIjoyMDgyNTkyNDM3fQ.MpZ0c4A1M58ih0Tdij7zcnzyoziI1plDwFwzN-FVCKs';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Generate unique ID
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `gf${timestamp}${randomPart}`;
}

async function main() {
  console.log('🚀 Starting Group Plans Insertion\n');
  console.log('='.repeat(60));

  // 1. Get all cities from database
  console.log('\n📍 Fetching cities from database...');
  const { data: cities, error: citiesError } = await supabase
    .from('City')
    .select('id, name, country')
    .order('rank', { ascending: true });

  if (citiesError || !cities) {
    console.error('❌ Error fetching cities:', citiesError);
    return;
  }
  console.log(`   Found ${cities.length} cities\n`);

  // Create a map of city name to city ID
  const cityMap = new Map<string, { id: string; country: string }>();
  cities.forEach(city => {
    cityMap.set(city.name, { id: city.id, country: city.country });
  });

  // 2. Delete all existing group flow steps
  console.log('🗑️ Clearing existing GroupFlowSteps...');
  const { error: stepsDeleteError, count: stepsDeleted } = await supabase
    .from('GroupFlowStep')
    .delete()
    .neq('id', '')
    .select('*', { count: 'exact', head: true });

  if (stepsDeleteError) {
    console.error('   Error deleting steps:', stepsDeleteError.message);
  } else {
    console.log(`   ✓ Cleared GroupFlowSteps`);
  }

  // 3. Delete all existing group flows
  console.log('🗑️ Clearing existing GroupFlows...');
  const { error: flowsDeleteError } = await supabase
    .from('GroupFlow')
    .delete()
    .neq('id', '');

  if (flowsDeleteError) {
    console.error('   Error deleting flows:', flowsDeleteError.message);
  } else {
    console.log(`   ✓ Cleared GroupFlows\n`);
  }

  // 4. Insert new group plans
  let totalFlows = 0;
  let totalSteps = 0;
  let citiesProcessed = 0;

  const cityNames = Object.keys(GROUP_PLANS_DATA);
  console.log(`📋 Processing ${cityNames.length} cities with curated plans...\n`);

  for (const cityName of cityNames) {
    const cityInfo = cityMap.get(cityName);
    if (!cityInfo) {
      console.log(`   ⚠️ City not found in database: ${cityName}`);
      continue;
    }

    const plans = GROUP_PLANS_DATA[cityName];
    console.log(`🌆 ${cityName}, ${cityInfo.country}: ${plans.length} plans`);

    for (let planIndex = 0; planIndex < plans.length; planIndex++) {
      const plan = plans[planIndex];
      const flowId = generateId();

      // Determine difficulty enum value
      const difficultyMap: Record<string, string> = {
        'easy': 'easy',
        'moderate': 'moderate',
        'challenging': 'intense'
      };

      // Insert GroupFlow
      const { data: insertedFlow, error: flowError } = await supabase
        .from('GroupFlow')
        .insert({
          id: flowId,
          flowId: flowId,
          cityId: cityInfo.id,
          title: plan.title,
          description: plan.description,
          difficulty: difficultyMap[plan.difficulty] || 'moderate',
          isWeekend: plan.isWeekend,
          proOnly: planIndex >= 2, // First 2 are free
          rank: planIndex + 1,
          currency: 'USD'
        })
        .select()
        .single();

      if (flowError) {
        console.error(`   ❌ Error inserting flow "${plan.title}":`, flowError.message);
        continue;
      }

      totalFlows++;

      // Insert GroupFlowSteps
      for (let venueIndex = 0; venueIndex < plan.venues.length; venueIndex++) {
        const venue = plan.venues[venueIndex];
        const stepId = `${flowId}-step-${venueIndex + 1}`;

        const { error: stepError } = await supabase
          .from('GroupFlowStep')
          .insert({
            id: stepId,
            flowId: insertedFlow.id,
            stepNumber: venueIndex + 1,
            title: venue.venueName,
            venueName: venue.venueName,
            description: venue.description,
            duration: venue.duration,
            startTime: venue.startTime,
            thumbnail: getVenueThumbnail(plan.title, venue.venueName)
          });

        if (stepError) {
          console.error(`   ❌ Error inserting step:`, stepError.message);
        } else {
          totalSteps++;
        }
      }

      console.log(`   ✓ ${plan.title} (${plan.venues.length} stops)`);
    }

    citiesProcessed++;
  }

  // 5. Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Insertion Complete!\n');
  console.log(`   📊 Summary:`);
  console.log(`   - Cities Processed: ${citiesProcessed}`);
  console.log(`   - Group Flows Created: ${totalFlows}`);
  console.log(`   - Flow Steps Created: ${totalSteps}`);
  console.log(`   - Avg Steps per Flow: ${(totalSteps / totalFlows).toFixed(1)}`);

  // 6. Verify data
  console.log('\n📋 Verification:');
  const { count: flowCount } = await supabase
    .from('GroupFlow')
    .select('*', { count: 'exact', head: true });

  const { count: stepCount } = await supabase
    .from('GroupFlowStep')
    .select('*', { count: 'exact', head: true });

  console.log(`   - GroupFlows in DB: ${flowCount}`);
  console.log(`   - GroupFlowSteps in DB: ${stepCount}`);

  // 7. Sample output
  console.log('\n📝 Sample Group Flows:');
  const { data: sampleFlows } = await supabase
    .from('GroupFlow')
    .select('title, cityId')
    .limit(5);

  sampleFlows?.forEach(flow => {
    console.log(`   - ${flow.title}`);
  });
}

// Helper function to get appropriate thumbnail based on venue type
function getVenueThumbnail(planTitle: string, venueName: string): string {
  const lowerTitle = planTitle.toLowerCase();
  const lowerVenue = venueName.toLowerCase();

  // Boat/cruise related
  if (lowerTitle.includes('boat') || lowerTitle.includes('yacht') || lowerTitle.includes('cruise') || lowerTitle.includes('harbor') || lowerTitle.includes('bay')) {
    return 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80';
  }

  // Jazz
  if (lowerVenue.includes('jazz') || lowerTitle.includes('jazz')) {
    return 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&q=80';
  }

  // Comedy
  if (lowerVenue.includes('comedy') || lowerTitle.includes('comedy')) {
    return 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=400&q=80';
  }

  // Rooftop
  if (lowerVenue.includes('rooftop') || lowerTitle.includes('rooftop') || lowerVenue.includes('terrace')) {
    return 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&q=80';
  }

  // Beach
  if (lowerVenue.includes('beach') || lowerTitle.includes('beach')) {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80';
  }

  // Speakeasy
  if (lowerVenue.includes('speakeasy') || lowerTitle.includes('speakeasy')) {
    return 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400&q=80';
  }

  // Club/nightclub
  if (lowerVenue.includes('club') || lowerTitle.includes('club')) {
    return 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400&q=80';
  }

  // Default bar/cocktail image
  return 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&q=80';
}

main().catch(console.error);
