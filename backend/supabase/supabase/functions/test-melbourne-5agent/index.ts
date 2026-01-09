/**
 * Test Melbourne 5-Agent Pipeline (GPT-4o)
 *
 * Full 5-agent pipeline as specified:
 * Agent 1: Generate highly effective group plans with full details
 * Agent 2: Reconfirm details and remove incorrect plans
 * Agent 3: Triple-check addresses, search for corrections, remove unfixable
 * Agent 4: Reconfirm and re-edit short descriptions
 * Agent 5: Final quality gate ensuring plans match HomeView standard
 *
 * POST /test-melbourne-5agent
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { gptRequest, parseGPTJSON } from '../_shared/gpt-client.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';

// Melbourne configuration
const MELBOURNE_CONFIG = {
  cityName: 'Melbourne',
  country: 'Australia',
  currency: 'AUD',
  neighborhoods: ['CBD', 'Fitzroy', 'St Kilda', 'South Yarra', 'Chapel Street', 'Collingwood', 'Brunswick', 'Richmond'],
  themes: ['rooftop', 'laneway-bar', 'live-music', 'cocktail', 'pub', 'club', 'speakeasy'],
  startTime: '19:00',
  specialInstructions: 'Use FAMOUS Melbourne venues: Chin Chin, Rooftop Bar, Cherry Bar, Revolver Upstairs, The Toff in Town, Heartbreaker, Section 8, Bar Americano, Eau de Vie, Prince Bandroom.'
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
    console.log(`MELBOURNE 5-AGENT PIPELINE (GPT-4o)`);
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

      // Get Melbourne city ID
      const { data: city } = await supabase
        .from('City')
        .select('id')
        .eq('name', 'Melbourne')
        .single();

      if (!city) {
        console.log('[STORAGE] Melbourne not found in database, creating...');
        const { data: newCity } = await supabase
          .from('City')
          .insert({
            id: `city-melbourne-${Date.now()}`,
            name: 'Melbourne',
            country: 'Australia',
            timezone: 'Australia/Melbourne',
            currency: 'AUD',
            imageUrl: 'https://images.unsplash.com/photo-1514395462725-fb4566210144?w=800&q=80',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .select()
          .single();

        if (newCity) {
          storedCount = await storePlans(supabase, approvedPlans, newCity.id, agent5Result.scores);
        }
      } else {
        storedCount = await storePlans(supabase, approvedPlans, city.id, agent5Result.scores);
      }
    }

    // ===== FINAL RESULTS =====
    const totalDuration = Date.now() - startTime;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`MELBOURNE PIPELINE COMPLETE`);
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
        city: 'Melbourne',
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
    console.error('[melbourne-5agent] Error:', error);
    return errorResponse((error as Error).message, 500, 'SERVER_ERROR');
  }
});

// ===== AGENT 1: GENERATOR =====
async function agent1_generatePlans(count: number): Promise<GroupPlan[]> {
  const systemPrompt = `You are an elite nightlife curator for Melbourne, Australia.

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

FOR MELBOURNE:
- Use REAL, FAMOUS Melbourne venues: ${MELBOURNE_CONFIG.specialInstructions}
- COMPLETE addresses: "Street Number Street Name, Suburb VIC PostCode, Australia"
- ACCURATE GPS coordinates for Melbourne (latitude ~-37.8, longitude ~144.9)
- Evocative 15-25 word descriptions that paint a vivid picture
- Times in 24h format (Melbourne nightlife: ${MELBOURNE_CONFIG.startTime} onwards)
- Prices in AUD

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Generate ${count} HIGH-QUALITY group plans for Melbourne, Australia.

REQUIREMENTS:
1. Each plan must have 3-4 activities at REAL Melbourne venues
2. ${MELBOURNE_CONFIG.specialInstructions}
3. Use neighborhoods: ${MELBOURNE_CONFIG.neighborhoods.join(', ')}
4. Include themes: ${MELBOURNE_CONFIG.themes.join(', ')}
5. COMPLETE addresses with street number, suburb, VIC, postcode
6. ACCURATE GPS coordinates (Melbourne: lat ~-37.8, lon ~144.9)
7. Evocative 15-25 word descriptions
8. Cost in AUD

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
  const systemPrompt = `You are a strict details validator for Melbourne nightlife venues.

Your job is to RECONFIRM all details and REMOVE plans with incorrect information.

Check each plan:
1. Does each venue ACTUALLY EXIST in Melbourne?
2. Are the opening times realistic for that venue type?
3. Is the pricing reasonable for Melbourne?
4. Are the coordinates in Melbourne (lat ~-37.8, lon ~144.9)?

If a venue doesn't exist or details are clearly wrong, mark the plan for REMOVAL.

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Validate these ${plans.length} Melbourne group plans.

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
  const systemPrompt = `You are an address specialist for Melbourne venues.

Your job is to TRIPLE-CHECK every address and:
1. CORRECT addresses that are slightly wrong
2. SEARCH for the correct address if you know the venue
3. REMOVE plans where addresses cannot be fixed

Melbourne address format: "Street Number Street Name, Suburb VIC PostCode, Australia"
Melbourne coordinates: latitude ~-37.8, longitude ~144.9

Be strict! If you're not confident an address is correct, remove the plan.

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Triple-check all addresses in these Melbourne plans:

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
          "coordinates": { "latitude": -37.xxx, "longitude": 144.xxx }
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
  const systemPrompt = `You are a creative copywriter specializing in nightlife experiences.

Your job is to RECONFIRM and RE-EDIT descriptions to be:
- Exactly 15-25 words
- Evocative and sensory (sounds, sights, feelings)
- Specific to the venue (mention unique features)
- Action-oriented (what you'll DO there)

BAD: "A nice bar with good drinks and atmosphere."
GOOD: "Sink into velvet booths while master mixologists craft prohibition-era cocktails beneath flickering candlelight and jazz vinyl crackles."

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Polish the descriptions for these Melbourne plans:

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
  const systemPrompt = `You are the final quality gate for Melbourne group plans.

Compare each plan against our HomeView quality standard:
- Evocative 15-25 word descriptions that paint vivid pictures
- Real, famous venues that locals know
- Complete, accurate addresses
- Logical progression (timing, location flow)
- Appropriate cost estimates

SCORING:
- 90-100: Exceptional, matches HomeView reference quality
- 80-89: Good, minor improvements possible
- 70-79: Acceptable, some issues
- Below 70: REJECT - does not meet quality standard

Plans scoring 70+ PASS. Below 70 are REMOVED.

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Score these Melbourne plans against HomeView quality standard:

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

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const score = scores.find(s => s.title === plan.title)?.score || 0;
    const flowId = `gf-melbourne-${Date.now()}-${i}`;

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

    // Store GroupFlowSteps
    for (const activity of plan.activities) {
      await supabase
        .from('GroupFlowStep')
        .insert({
          id: `${flowId}-step-${activity.order}`,
          flowId: flow.id,
          planId: null,
          stepNumber: activity.order,
          title: activity.venueName,
          venueName: activity.venueName,
          duration: activity.duration,
          thumbnail: getThumbnail(plan.aiTags),
        });
    }

    stored++;
    console.log(`[storage] Stored: ${plan.title} (${score}/100)`);
  }

  return stored;
}

function extractTheme(tags: string[]): string {
  const themeMap: Record<string, string> = {
    'rooftop': 'rooftop',
    'laneway': 'speakeasy',
    'live': 'live-music',
    'cocktail': 'cocktail',
    'pub': 'pub',
    'club': 'club',
    'jazz': 'jazz',
  };

  for (const tag of tags) {
    const lower = tag.toLowerCase();
    for (const [key, theme] of Object.entries(themeMap)) {
      if (lower.includes(key)) return theme;
    }
  }
  return 'nightlife';
}

function getThumbnail(tags: string[]): string {
  if (tags.some(t => t.toLowerCase().includes('rooftop'))) {
    return 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&q=80';
  }
  if (tags.some(t => t.toLowerCase().includes('jazz') || t.toLowerCase().includes('live'))) {
    return 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&q=80';
  }
  if (tags.some(t => t.toLowerCase().includes('cocktail'))) {
    return 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80';
  }
  return 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400&q=80';
}
