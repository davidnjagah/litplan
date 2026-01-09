/**
 * Test Ibiza 5-Agent Pipeline (GPT-4o)
 *
 * Full 5-agent pipeline:
 * Agent 1: Generate highly effective group plans with full details
 * Agent 2: Reconfirm details and remove incorrect plans
 * Agent 3: Triple-check addresses, search for corrections, remove unfixable
 * Agent 4: Reconfirm and re-edit short descriptions
 * Agent 5: Final quality gate ensuring plans match HomeView standard
 *
 * POST /test-ibiza-5agent
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { gptRequest, parseGPTJSON } from '../_shared/gpt-client.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';

// Ibiza configuration
const IBIZA_CONFIG = {
  cityName: 'Ibiza',
  country: 'Spain',
  currency: 'EUR',
  neighborhoods: ['Ibiza Town', 'Playa d\'en Bossa', 'San Antonio', 'Santa Eulalia', 'Es Canar', 'Cala Comte', 'San Rafael'],
  themes: ['superclub', 'beach-club', 'sunset-bar', 'boat-party', 'techno', 'house', 'trance'],
  startTime: '22:00',
  specialInstructions: 'Use LEGENDARY Ibiza venues ONLY: Pacha, Amnesia, Ushuaïa, Hï Ibiza, DC-10, Café del Mar, Café Mambo, Blue Marlin, O Beach, Es Paradis, Privilege, Eden, Pikes Hotel, KM5.'
};

// Interfaces
interface Activity {
  venueName: string;
  address: string;
  coordinates: { latitude: number; longitude: number };
  startTime: string;
  duration: number;
  description: string;
  order: number;
}

interface GroupPlan {
  title: string;
  description: string;
  activities: Activity[];
  totalDuration: number;
  estimatedCost: { min: number; max: number; currency: string };
  difficulty: string;
  bestFor: string[];
  aiTags: string[];
}

interface AgentResult {
  agent: string;
  duration: number;
  input: number;
  output: number;
  changes?: string[];
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    const body = await req.json();
    const { targetCount = 3, storeResults = true } = body;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`IBIZA 5-AGENT PIPELINE (GPT-4o)`);
    console.log(`${'='.repeat(60)}\n`);

    const startTime = Date.now();
    const agentResults: AgentResult[] = [];
    let plans: GroupPlan[] = [];

    // ===== AGENT 1: GENERATOR =====
    console.log(`\n[AGENT 1] GENERATOR - Creating ${targetCount} group plans...`);
    const agent1Start = Date.now();

    plans = await agent1_generatePlans(targetCount);

    agentResults.push({
      agent: 'Agent 1: Generator',
      duration: Date.now() - agent1Start,
      input: 0,
      output: plans.length,
    });

    console.log(`[AGENT 1] Generated ${plans.length} plans`);
    plans.forEach((p, i) => console.log(`  ${i + 1}. ${p.title}`));

    if (plans.length === 0) {
      return jsonResponse({ success: false, error: 'No plans generated', agentResults });
    }

    // ===== AGENT 2: DETAILS VALIDATOR =====
    console.log(`\n[AGENT 2] DETAILS VALIDATOR - Reconfirming details...`);
    const agent2Start = Date.now();

    const agent2Result = await agent2_validateDetails(plans);
    plans = agent2Result.plans;

    agentResults.push({
      agent: 'Agent 2: Details Validator',
      duration: Date.now() - agent2Start,
      input: agent2Result.inputCount,
      output: plans.length,
      changes: agent2Result.changes,
    });

    console.log(`[AGENT 2] ${agent2Result.inputCount} → ${plans.length} plans (${agent2Result.removed} removed)`);

    if (plans.length === 0) {
      return jsonResponse({ success: false, error: 'All plans failed validation', agentResults });
    }

    // ===== AGENT 3: ADDRESS VALIDATOR =====
    console.log(`\n[AGENT 3] ADDRESS VALIDATOR - Triple-checking addresses...`);
    const agent3Start = Date.now();

    const agent3Result = await agent3_validateAddresses(plans);
    plans = agent3Result.plans;

    agentResults.push({
      agent: 'Agent 3: Address Validator',
      duration: Date.now() - agent3Start,
      input: agent3Result.inputCount,
      output: plans.length,
      changes: agent3Result.changes,
    });

    console.log(`[AGENT 3] ${agent3Result.inputCount} → ${plans.length} plans (${agent3Result.corrected} corrected, ${agent3Result.removed} removed)`);

    if (plans.length === 0) {
      return jsonResponse({ success: false, error: 'All plans failed address validation', agentResults });
    }

    // ===== AGENT 4: DESCRIPTION EDITOR =====
    console.log(`\n[AGENT 4] DESCRIPTION EDITOR - Polishing descriptions...`);
    const agent4Start = Date.now();

    const agent4Result = await agent4_editDescriptions(plans);
    plans = agent4Result.plans;

    agentResults.push({
      agent: 'Agent 4: Description Editor',
      duration: Date.now() - agent4Start,
      input: plans.length,
      output: plans.length,
      changes: agent4Result.changes,
    });

    console.log(`[AGENT 4] Polished ${agent4Result.edited} descriptions`);

    // ===== AGENT 5: QUALITY GATE =====
    console.log(`\n[AGENT 5] QUALITY GATE - Final approval...`);
    const agent5Start = Date.now();

    const agent5Result = await agent5_qualityGate(plans);
    const approvedPlans = agent5Result.plans;

    agentResults.push({
      agent: 'Agent 5: Quality Gate',
      duration: Date.now() - agent5Start,
      input: plans.length,
      output: approvedPlans.length,
      changes: agent5Result.scores.map(s => `${s.title}: ${s.score}/100`),
    });

    console.log(`[AGENT 5] ${plans.length} → ${approvedPlans.length} approved`);
    agent5Result.scores.forEach(s => {
      console.log(`  ${s.passed ? '✓' : '✗'} ${s.title}: ${s.score}/100`);
    });

    // ===== STORE RESULTS =====
    let storedCount = 0;
    if (storeResults && approvedPlans.length > 0) {
      console.log(`\n[STORAGE] Saving ${approvedPlans.length} plans to database...`);
      const supabase = createServiceClient();

      // Get Ibiza city ID
      const { data: city } = await supabase
        .from('City')
        .select('id')
        .eq('name', 'Ibiza')
        .single();

      if (city) {
        storedCount = await storePlans(supabase, approvedPlans, city.id, agent5Result.scores);
      } else {
        console.log('[STORAGE] Ibiza not found in database');
      }
    }

    // ===== FINAL RESULTS =====
    const totalDuration = Date.now() - startTime;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`IBIZA PIPELINE COMPLETE`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total Duration: ${Math.round(totalDuration / 1000)}s`);
    console.log(`Plans Generated: ${agentResults[0].output}`);
    console.log(`Plans Approved: ${approvedPlans.length}`);
    console.log(`Plans Stored: ${storedCount}`);
    console.log(`${'='.repeat(60)}\n`);

    // Print final plans
    approvedPlans.forEach((plan, i) => {
      const score = agent5Result.scores.find(s => s.title === plan.title)?.score || 0;
      console.log(`\n[${i + 1}] ${plan.title} (${score}/100)`);
      console.log(`    ${plan.description}`);
      plan.activities.forEach(a => {
        console.log(`    • ${a.venueName} @ ${a.startTime} (${a.duration}min)`);
        console.log(`      ${a.address}`);
        console.log(`      "${a.description}"`);
      });
      console.log(`    Cost: ${plan.estimatedCost.min}-${plan.estimatedCost.max} ${plan.estimatedCost.currency}`);
      console.log(`    Tags: ${plan.aiTags.join(', ')}`);
    });

    return jsonResponse({
      success: true,
      data: {
        city: 'Ibiza',
        aiModel: 'GPT-4o',
        pipeline: '5-agent',
        agentResults,
        finalPlans: approvedPlans.map((plan, i) => ({
          title: plan.title,
          description: plan.description,
          activities: plan.activities.map(a => ({
            venueName: a.venueName,
            address: a.address,
            coordinates: a.coordinates,
            time: `${a.startTime} (${a.duration}min)`,
            description: a.description,
          })),
          cost: `${plan.estimatedCost.min}-${plan.estimatedCost.max} ${plan.estimatedCost.currency}`,
          difficulty: plan.difficulty,
          tags: plan.aiTags,
          qualityScore: agent5Result.scores.find(s => s.title === plan.title)?.score || 0,
        })),
        summary: {
          totalGenerated: agentResults[0].output,
          totalApproved: approvedPlans.length,
          totalStored: storedCount,
          averageScore: Math.round(
            agent5Result.scores.filter(s => s.passed).reduce((sum, s) => sum + s.score, 0) /
            (approvedPlans.length || 1)
          ),
          totalDuration,
        },
      },
    });

  } catch (error) {
    console.error('[ibiza-5agent] Error:', error);
    return errorResponse((error as Error).message, 500, 'SERVER_ERROR');
  }
});

// ===== AGENT 1: GENERATOR =====
async function agent1_generatePlans(count: number): Promise<GroupPlan[]> {
  const systemPrompt = `You are an elite nightlife curator for Ibiza, the world's clubbing capital.

Generate group plans matching this EXACT quality standard from our HomeView reference:

EXAMPLE (NYC):
{
  "title": "Ultimate NYC Night Out",
  "description": "Brooklyn Brewery → Blue Note Jazz Club → Le Bain at The Standard. A moderate 5-hour experience through NYC's best nightlife.",
  "activities": [
    {
      "venueName": "Brooklyn Brewery",
      "address": "79 N 11th St, Brooklyn, NY 11249, USA",
      "coordinates": { "latitude": 40.7219, "longitude": -73.9575 },
      "startTime": "20:00",
      "duration": 90,
      "description": "Start your night with craft beers at Brooklyn Brewery's industrial taproom. Sample seasonal brews amid exposed brick.",
      "order": 1
    }
  ],
  "totalDuration": 300,
  "estimatedCost": { "min": 80, "max": 120, "currency": "USD" },
  "difficulty": "moderate",
  "bestFor": ["groups", "couples"],
  "aiTags": ["Craft Beer", "Live Music", "Rooftop", "Dancing", "Cocktails"]
}

FOR IBIZA:
- Use ONLY REAL, LEGENDARY Ibiza venues: ${IBIZA_CONFIG.specialInstructions}
- COMPLETE addresses: "Venue Name, Street/Road, PostCode Town, Ibiza, Spain"
- ACCURATE GPS coordinates for Ibiza (latitude ~38.9-39.1, longitude ~1.2-1.6)
- Evocative 15-25 word descriptions capturing Ibiza's magic
- Times in 24h format (Ibiza nightlife starts LATE: ${IBIZA_CONFIG.startTime} onwards, clubs peak 2-6am)
- Prices in EUR

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Generate ${count} HIGH-QUALITY group plans for Ibiza, Spain.

REQUIREMENTS:
1. Each plan must have 3-4 activities at REAL LEGENDARY Ibiza venues
2. ${IBIZA_CONFIG.specialInstructions}
3. Use areas: ${IBIZA_CONFIG.neighborhoods.join(', ')}
4. Include themes: ${IBIZA_CONFIG.themes.join(', ')}
5. COMPLETE addresses with postal codes
6. ACCURATE GPS coordinates (Ibiza: lat ~38.9-39.1, lon ~1.2-1.6)
7. Evocative 15-25 word descriptions
8. Cost in EUR
9. Ibiza clubs run LATE - sunset bars 18:00-22:00, clubs 00:00-06:00

Return JSON:
{
  "plans": [...]
}`;

  const response = await gptRequest(
    [{ role: 'user', content: userPrompt }],
    {
      systemPrompt,
      temperature: 0.85,
      maxTokens: 8192,
      jsonMode: true,
    }
  );

  const parsed = parseGPTJSON<{ plans: GroupPlan[] }>(response);
  return parsed.plans || [];
}

// ===== AGENT 2: DETAILS VALIDATOR =====
async function agent2_validateDetails(plans: GroupPlan[]): Promise<{
  plans: GroupPlan[];
  inputCount: number;
  removed: number;
  changes: string[];
}> {
  const systemPrompt = `You are a strict details validator for Ibiza nightlife venues.

Your job is to RECONFIRM all details and REMOVE plans with incorrect information.

IBIZA VENUE KNOWLEDGE:
- Pacha: Ibiza Town, famous cherry logo, house music
- Amnesia: San Rafael (between Ibiza Town & San Antonio), foam parties, techno/trance
- Ushuaïa: Playa d'en Bossa, open-air hotel club, daytime events
- Hï Ibiza: Playa d'en Bossa (formerly Space), world's best club
- DC-10: Near airport, Circoloco parties, underground techno
- Café del Mar: San Antonio sunset strip, invented chill-out
- Café Mambo: San Antonio sunset strip, pre-party sunsets
- Blue Marlin: Cala Jondal beach, luxury beach club
- O Beach: San Antonio bay, pool parties
- Es Paradis: San Antonio, pyramid club, water parties
- Privilege: San Rafael, world's largest club

Check each plan:
1. Does each venue ACTUALLY EXIST in Ibiza?
2. Is the venue in the CORRECT LOCATION?
3. Are the times realistic for that venue type?
4. Are coordinates in Ibiza (lat ~38.9-39.1, lon ~1.2-1.6)?

If a venue location is wrong or details are clearly incorrect, mark the plan for REMOVAL.

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Validate these ${plans.length} Ibiza group plans.

PLANS:
${JSON.stringify(plans, null, 2)}

For each plan, determine if it should be KEPT or REMOVED.

Return JSON:
{
  "validations": [
    {
      "title": "Plan Title",
      "status": "keep" | "remove",
      "reason": "Why kept or removed",
      "issues": ["list of issues found"]
    }
  ]
}`;

  const response = await gptRequest(
    [{ role: 'user', content: userPrompt }],
    {
      systemPrompt,
      temperature: 0.2,
      maxTokens: 4096,
      jsonMode: true,
    }
  );

  const result = parseGPTJSON<{ validations: { title: string; status: string; reason: string; issues: string[] }[] }>(response);

  const keptPlans: GroupPlan[] = [];
  const changes: string[] = [];

  for (const plan of plans) {
    const validation = result.validations.find(v => v.title === plan.title);
    if (validation?.status === 'keep') {
      keptPlans.push(plan);
      if (validation.issues?.length > 0) {
        changes.push(`${plan.title}: ${validation.issues.join(', ')}`);
      }
    } else {
      changes.push(`REMOVED: ${plan.title} - ${validation?.reason || 'Failed validation'}`);
    }
  }

  return {
    plans: keptPlans,
    inputCount: plans.length,
    removed: plans.length - keptPlans.length,
    changes,
  };
}

// ===== AGENT 3: ADDRESS VALIDATOR =====
async function agent3_validateAddresses(plans: GroupPlan[]): Promise<{
  plans: GroupPlan[];
  inputCount: number;
  corrected: number;
  removed: number;
  changes: string[];
}> {
  const systemPrompt = `You are an address specialist for Ibiza venues.

Your job is to TRIPLE-CHECK every address and:
1. CORRECT addresses that are slightly wrong
2. SEARCH for the correct address if you know the venue
3. REMOVE plans where addresses cannot be fixed

KNOWN IBIZA ADDRESSES:
- Pacha: Av. 8 d'Agost, 07800 Ibiza Town
- Amnesia: Carretera Ibiza-San Antonio, Km 5, 07816 San Rafael
- Ushuaïa: Platja d'en Bossa 10, 07817 Sant Jordi de ses Salines
- Hï Ibiza: Platja d'en Bossa, 07817 Sant Jordi de ses Salines
- DC-10: Carretera Aeroport, 07817 Sant Jordi de ses Salines
- Café del Mar: Carrer de Vara de Rey 27, 07820 San Antonio
- Café Mambo: Carrer de Vara de Rey 40, 07820 San Antonio
- Blue Marlin: Cala Jondal, 07830 Sant Josep de sa Talaia
- O Beach: Carrer des Caló des Moro, 07820 San Antonio
- Es Paradis: Carrer Salvador Espriu 2, 07820 San Antonio

Ibiza coordinates: latitude ~38.9-39.1, longitude ~1.2-1.6

Be strict! If you're not confident an address is correct, remove the plan.

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Triple-check all addresses in these Ibiza plans:

${plans.map((p, i) => `
PLAN ${i + 1}: ${p.title}
${p.activities.map(a => `- ${a.venueName}: ${a.address} (${a.coordinates.latitude}, ${a.coordinates.longitude})`).join('\n')}
`).join('\n')}

For each plan, either:
- KEEP with corrected addresses (if corrections needed)
- KEEP as-is (if addresses are correct)
- REMOVE (if addresses cannot be fixed)

Return JSON:
{
  "results": [
    {
      "title": "Plan Title",
      "action": "keep" | "keep_corrected" | "remove",
      "reason": "explanation",
      "correctedActivities": [
        {
          "venueName": "Venue",
          "address": "Corrected Address",
          "coordinates": { "latitude": 38.xxx, "longitude": 1.xxx }
        }
      ]
    }
  ]
}`;

  const response = await gptRequest(
    [{ role: 'user', content: userPrompt }],
    {
      systemPrompt,
      temperature: 0.2,
      maxTokens: 4096,
      jsonMode: true,
    }
  );

  const result = parseGPTJSON<{
    results: {
      title: string;
      action: string;
      reason: string;
      correctedActivities?: { venueName: string; address: string; coordinates: { latitude: number; longitude: number } }[];
    }[]
  }>(response);

  const outputPlans: GroupPlan[] = [];
  const changes: string[] = [];
  let corrected = 0;
  let removed = 0;

  for (const plan of plans) {
    const validation = result.results.find(r => r.title === plan.title);

    if (validation?.action === 'remove') {
      removed++;
      changes.push(`REMOVED: ${plan.title} - ${validation.reason}`);
    } else if (validation?.action === 'keep_corrected' && validation.correctedActivities) {
      corrected++;
      // Apply corrections
      const correctedPlan = { ...plan };
      correctedPlan.activities = plan.activities.map(activity => {
        const correction = validation.correctedActivities?.find(c => c.venueName === activity.venueName);
        if (correction) {
          return {
            ...activity,
            address: correction.address,
            coordinates: correction.coordinates,
          };
        }
        return activity;
      });
      outputPlans.push(correctedPlan);
      changes.push(`CORRECTED: ${plan.title} - ${validation.reason}`);
    } else {
      outputPlans.push(plan);
    }
  }

  return {
    plans: outputPlans,
    inputCount: plans.length,
    corrected,
    removed,
    changes,
  };
}

// ===== AGENT 4: DESCRIPTION EDITOR =====
async function agent4_editDescriptions(plans: GroupPlan[]): Promise<{
  plans: GroupPlan[];
  edited: number;
  changes: string[];
}> {
  const systemPrompt = `You are a creative copywriter specializing in Ibiza nightlife experiences.

Your job is to RECONFIRM and RE-EDIT descriptions to be:
- Exactly 15-25 words
- Evocative and sensory (bass, lights, energy, euphoria)
- Specific to the venue (mention unique features)
- Capture Ibiza's legendary magic

BAD: "A famous club with good music and atmosphere."
GOOD: "Surrender to thundering bass as world-renowned DJs command the dance floor beneath Amnesia's legendary strobe-lit terrace until sunrise."

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Polish the descriptions for these Ibiza plans:

${plans.map((p, i) => `
PLAN ${i + 1}: ${p.title}
${p.activities.map(a => `- ${a.venueName}: "${a.description}"`).join('\n')}
`).join('\n')}

Return JSON with improved descriptions:
{
  "plans": [
    {
      "title": "Plan Title",
      "activities": [
        {
          "venueName": "Venue Name",
          "description": "New evocative 15-25 word description"
        }
      ]
    }
  ]
}`;

  const response = await gptRequest(
    [{ role: 'user', content: userPrompt }],
    {
      systemPrompt,
      temperature: 0.8,
      maxTokens: 4096,
      jsonMode: true,
    }
  );

  const result = parseGPTJSON<{
    plans: { title: string; activities: { venueName: string; description: string }[] }[]
  }>(response);

  const changes: string[] = [];
  let edited = 0;

  const outputPlans = plans.map(plan => {
    const editedPlan = result.plans.find(p => p.title === plan.title);
    if (!editedPlan) return plan;

    const updatedActivities = plan.activities.map(activity => {
      const editedActivity = editedPlan.activities.find(a => a.venueName === activity.venueName);
      if (editedActivity && editedActivity.description !== activity.description) {
        edited++;
        changes.push(`${activity.venueName}: description updated`);
        return { ...activity, description: editedActivity.description };
      }
      return activity;
    });

    return { ...plan, activities: updatedActivities };
  });

  return {
    plans: outputPlans,
    edited,
    changes,
  };
}

// ===== AGENT 5: QUALITY GATE =====
async function agent5_qualityGate(plans: GroupPlan[]): Promise<{
  plans: GroupPlan[];
  scores: { title: string; score: number; passed: boolean; feedback: string }[];
}> {
  const systemPrompt = `You are the final quality gate for Ibiza group plans.

Compare each plan against our HomeView quality standard:
- Evocative 15-25 word descriptions that paint vivid pictures
- Real, legendary venues that clubbers worldwide know
- Complete, accurate addresses
- Logical progression (sunset → pre-party → club)
- Appropriate cost estimates for Ibiza

SCORING:
- 90-100: Exceptional, matches HomeView reference quality
- 80-89: Good, minor improvements possible
- 70-79: Acceptable, some issues
- Below 70: REJECT - does not meet quality standard

Plans scoring 70+ PASS. Below 70 are REMOVED.

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Score these Ibiza plans against HomeView quality standard:

${plans.map((p, i) => `
PLAN ${i + 1}: ${p.title}
Description: ${p.description}
Activities:
${p.activities.map(a => `  - ${a.venueName} @ ${a.startTime}
    Address: ${a.address}
    Description: "${a.description}"`).join('\n')}
Cost: ${p.estimatedCost.min}-${p.estimatedCost.max} ${p.estimatedCost.currency}
Tags: ${p.aiTags.join(', ')}
`).join('\n---\n')}

Return JSON:
{
  "scores": [
    {
      "title": "Plan Title",
      "score": 85,
      "passed": true,
      "feedback": "Specific feedback on quality"
    }
  ]
}`;

  const response = await gptRequest(
    [{ role: 'user', content: userPrompt }],
    {
      systemPrompt,
      temperature: 0.2,
      maxTokens: 2048,
      jsonMode: true,
    }
  );

  const result = parseGPTJSON<{
    scores: { title: string; score: number; passed: boolean; feedback: string }[]
  }>(response);

  const scores = result.scores.map(s => ({
    ...s,
    passed: s.score >= 70,
  }));

  const approvedPlans = plans.filter(plan => {
    const score = scores.find(s => s.title === plan.title);
    return score?.passed;
  });

  return {
    plans: approvedPlans,
    scores,
  };
}

// ===== STORAGE =====
async function storePlans(
  supabase: any,
  plans: GroupPlan[],
  cityId: string,
  scores: { title: string; score: number }[]
): Promise<number> {
  let stored = 0;
  const timestamp = Date.now();

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const score = scores.find(s => s.title === plan.title)?.score || 0;
    const flowId = `gf-ibiza-gpt-${timestamp}-${i}`;

    // First, create Plan records for each activity
    const activityPlanIds: string[] = [];
    for (let j = 0; j < plan.activities.length; j++) {
      const activity = plan.activities[j];
      const activityPlanId = `plan-ibiza-${timestamp}-${i}-${j}`;

      const { error: planError } = await supabase
        .from('Plan')
        .insert({
          id: activityPlanId,
          planId: `ibiza-gpt-${timestamp}-${i}-${j}`,
          title: activity.venueName,
          venueName: activity.venueName,
          description: activity.description,
          category: 'nightlife',
          type: 'EVENT',
          cityId: cityId,
          date: new Date().toISOString().split('T')[0],
          weekday: 'Saturday',
          isWeekend: true,
          startTime: activity.startTime,
          endTime: calculateEndTime(activity.startTime, activity.duration),
          latitude: activity.coordinates.latitude,
          longitude: activity.coordinates.longitude,
          address: activity.address,
          neighborhood: extractNeighborhood(activity.address),
          priceRange: '$$',
          entryFee: 0,
          freeEntry: false,
          currency: plan.estimatedCost.currency,
          rank: j + 1,
          source: 'ai-agent-gpt',
          aiGenerated: true,
          isIndividual: true,
          isGroup: false,
          heroImage: getThumbnail(plan.aiTags),
          thumbnailImage: getThumbnail(plan.aiTags),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

      if (planError) {
        console.error(`[storage] Failed to create plan for ${activity.venueName}: ${planError.message}`);
      } else {
        activityPlanIds.push(activityPlanId);
        console.log(`[storage] Created plan: ${activityPlanId}`);
      }
    }

    // Create the GroupFlow
    const { data: flow, error: flowError } = await supabase
      .from('GroupFlow')
      .insert({
        id: flowId,
        flowId: flowId,
        cityId: cityId,
        rank: i + 1,
        title: plan.title,
        description: plan.description,
        totalHours: Math.ceil(plan.totalDuration / 60),
        startTime: plan.activities[0]?.startTime,
        endTime: plan.activities[plan.activities.length - 1]?.startTime,
        totalEstimate: Math.round((plan.estimatedCost.min + plan.estimatedCost.max) / 2),
        currency: plan.estimatedCost.currency,
        isWeekend: true,
        proOnly: i >= 2,
        aiGenerated: true,
        isTemporary: false,
        theme: extractTheme(plan.aiTags),
        difficulty: plan.difficulty,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (flowError) {
      console.error(`[storage] Failed to store flow: ${flowError.message}`);
      continue;
    }

    // Store GroupFlowSteps with proper planIds
    for (let j = 0; j < plan.activities.length; j++) {
      const activity = plan.activities[j];
      const planId = activityPlanIds[j] || `plan-ibiza-${timestamp}-${i}-${j}`;

      const { error: stepError } = await supabase
        .from('GroupFlowStep')
        .insert({
          id: `${flowId}-step-${activity.order}`,
          flowId: flow.id,
          planId: planId,
          stepNumber: activity.order,
          title: activity.venueName,
          venueName: activity.venueName,
          duration: activity.duration,
          thumbnail: getThumbnail(plan.aiTags),
        });

      if (stepError) {
        console.error(`[storage] Failed to store step ${activity.order}: ${stepError.message}`);
      } else {
        console.log(`[storage] Created step: ${activity.venueName}`);
      }
    }

    stored++;
    console.log(`[storage] Stored: ${plan.title} (${score}/100)`);
  }

  return stored;
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

function extractNeighborhood(address: string): string {
  // Extract neighborhood from Ibiza address
  if (address.includes('San Antonio')) return 'San Antonio';
  if (address.includes('Playa d\'en Bossa') || address.includes('Platja d\'en Bossa')) return 'Playa d\'en Bossa';
  if (address.includes('Ibiza Town') || address.includes('07800')) return 'Ibiza Town';
  if (address.includes('San Rafael')) return 'San Rafael';
  if (address.includes('Santa Eulalia')) return 'Santa Eulalia';
  if (address.includes('Cala Jondal')) return 'Cala Jondal';
  return 'Ibiza';
}

function extractTheme(tags: string[]): string {
  const themeMap: Record<string, string> = {
    'superclub': 'club',
    'techno': 'underground',
    'house': 'club',
    'sunset': 'rooftop',
    'beach': 'beach-club',
    'boat': 'boat-party',
    'trance': 'club',
  };

  for (const tag of tags) {
    const lower = tag.toLowerCase();
    for (const [key, theme] of Object.entries(themeMap)) {
      if (lower.includes(key)) return theme;
    }
  }
  return 'club';
}

function getThumbnail(tags: string[]): string {
  if (tags.some(t => t.toLowerCase().includes('sunset'))) {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80';
  }
  if (tags.some(t => t.toLowerCase().includes('beach'))) {
    return 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80';
  }
  return 'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=400&q=80';
}
