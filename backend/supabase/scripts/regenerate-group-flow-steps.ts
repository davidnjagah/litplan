/**
 * Regenerate GroupFlowSteps for current GroupFlows
 * Links each group flow to 3-4 plans from the same city
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://clktdigankjszupvrsqt.supabase.co';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function regenerateSteps() {
  console.log('Starting GroupFlowStep regeneration...\n');

  // 1. Delete all existing steps (they're orphaned anyway)
  const { error: deleteError } = await supabase
    .from('GroupFlowStep')
    .delete()
    .neq('id', '');  // Delete all

  if (deleteError) {
    console.error('Error deleting old steps:', deleteError);
    return;
  }
  console.log('✓ Deleted old orphaned steps\n');

  // 2. Get all current GroupFlows
  const { data: groupFlows, error: flowsError } = await supabase
    .from('GroupFlow')
    .select('id, cityId, title, flowId')
    .order('cityId');

  if (flowsError || !groupFlows) {
    console.error('Error fetching group flows:', flowsError);
    return;
  }
  console.log(`Found ${groupFlows.length} group flows\n`);

  // 3. Get plans grouped by city
  const { data: plans, error: plansError } = await supabase
    .from('Plan')
    .select('id, cityId, venueName, category, address')
    .order('rank', { ascending: true });

  if (plansError || !plans) {
    console.error('Error fetching plans:', plansError);
    return;
  }

  // Group plans by cityId
  const plansByCity = new Map<string, any[]>();
  plans.forEach(plan => {
    const existing = plansByCity.get(plan.cityId) || [];
    existing.push(plan);
    plansByCity.set(plan.cityId, existing);
  });

  console.log(`Found plans for ${plansByCity.size} cities\n`);

  // 4. Create steps for each group flow
  const stepsToInsert: any[] = [];
  const stepTitles = [
    'Pre-Game Drinks',
    'Main Event',
    'Late Night Vibes',
    'After Hours'
  ];

  for (const flow of groupFlows) {
    const cityPlans = plansByCity.get(flow.cityId) || [];

    if (cityPlans.length === 0) {
      console.log(`⚠ No plans for city ${flow.cityId}, skipping flow: ${flow.title}`);
      continue;
    }

    // Select 3-4 plans for this flow
    const numSteps = Math.min(cityPlans.length, Math.random() > 0.5 ? 4 : 3);
    const selectedPlans = cityPlans.slice(0, numSteps);

    selectedPlans.forEach((plan, index) => {
      stepsToInsert.push({
        id: `step-${flow.id}-${index + 1}-${Date.now()}`,
        flowId: flow.id,  // Use the GroupFlow's actual ID
        planId: plan.id,
        stepNumber: index + 1,
        title: stepTitles[index] || `Stop ${index + 1}`,
        venueName: plan.venueName,
        duration: index === 1 ? 90 : 60, // Main event is longer
        thumbnail: `https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&q=80`
      });
    });
  }

  console.log(`Creating ${stepsToInsert.length} steps...\n`);

  // 5. Insert steps in batches
  const batchSize = 50;
  for (let i = 0; i < stepsToInsert.length; i += batchSize) {
    const batch = stepsToInsert.slice(i, i + batchSize);
    const { error: insertError } = await supabase
      .from('GroupFlowStep')
      .insert(batch);

    if (insertError) {
      console.error(`Error inserting batch ${i / batchSize}:`, insertError);
    } else {
      console.log(`✓ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(stepsToInsert.length / batchSize)}`);
    }
  }

  console.log('\n✓ GroupFlowStep regeneration complete!');

  // 6. Verify
  const { count } = await supabase
    .from('GroupFlowStep')
    .select('*', { count: 'exact', head: true });

  console.log(`\nTotal steps in database: ${count}`);
}

regenerateSteps();
