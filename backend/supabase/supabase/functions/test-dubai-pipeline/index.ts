/**
 * Test Dubai Pipeline
 *
 * Simplified test function that generates high-quality group plans for Dubai
 * and validates them through all 5 agent stages, displaying results at the end.
 *
 * POST /test-dubai-pipeline
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { claudeRequest, parseClaudeJSON } from '../_shared/claude-client.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';

// Dubai configuration
const DUBAI_CONFIG = {
  cityId: 'dubai-test-001',
  cityName: 'Dubai',
  country: 'United Arab Emirates',
  currency: 'AED',
  neighborhoods: ['Downtown Dubai', 'Dubai Marina', 'JBR', 'DIFC', 'Palm Jumeirah', 'Business Bay'],
  themes: ['rooftop', 'beach-club', 'luxury', 'club', 'lounge', 'boat-party']
};

// Agent prompts
const GENERATOR_SYSTEM_PROMPT = `You are an elite nightlife curator for Dubai, UAE.

Generate group plans matching this EXACT quality standard:

EXAMPLE (NYC):
{
  "title": "Ultimate NYC Night Out",
  "description": "Brooklyn Brewery → Blue Note Jazz Club → Le Bain at The Standard. A moderate 5-hour experience through NYC's best nightlife.",
  "activities": [
    {
      "venueName": "Brooklyn Brewery",
      "address": "79 N 11th St, Brooklyn, NY 11249",
      "coordinates": { "latitude": 40.7219, "longitude": -73.9575 },
      "startTime": "20:00",
      "duration": 90,
      "description": "Start your night with craft beers at Brooklyn Brewery. Enjoy the buzzing atmosphere and local brews.",
      "order": 1
    }
  ],
  "totalDuration": 300,
  "estimatedCost": { "min": 80, "max": 120, "currency": "USD" },
  "difficulty": "moderate",
  "bestFor": ["groups", "solo"],
  "aiTags": ["Live Music", "Jazz", "Craft Beer", "Nightclub", "Dancing"]
}

FOR DUBAI:
- Use REAL Dubai venues (Zuma, White Dubai, Barasti, Nobu, etc.)
- COMPLETE addresses (Building Name, Street, Area, Dubai)
- ACCURATE GPS coordinates
- Times in 24h format (Dubai nightlife starts later: 21:00-22:00)
- Prices in AED
- 15-25 word evocative descriptions

RESPOND WITH VALID JSON ONLY.`;

const VALIDATOR_SYSTEM_PROMPT = `You are a quality validator for Dubai nightlife venues.

Verify each venue:
1. Does it exist in Dubai?
2. Is the address correct?
3. Are coordinates accurate?
4. Is the description evocative (15-25 words)?

Score 0-100. Plans scoring below 70 should be marked as failed.

RESPOND WITH VALID JSON ONLY.`;

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

interface ValidationResult {
  score: number;
  passed: boolean;
  issues: string[];
  suggestions: string[];
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    const body = await req.json();
    const { targetCount = 5, storeResults = true } = body;

    console.log(`[dubai-test] Starting pipeline for Dubai with ${targetCount} plans`);

    const startTime = Date.now();
    const results: any = {
      city: 'Dubai',
      targetCount,
      stages: [],
      finalPlans: [],
      summary: {},
    };

    // ===== STAGE 1: GENERATE PLANS =====
    console.log('[dubai-test] Stage 1: Generating plans...');
    const stage1Start = Date.now();

    const generatedPlans = await generateDubaiPlans(targetCount);

    results.stages.push({
      name: 'Generation',
      duration: Date.now() - stage1Start,
      plansCreated: generatedPlans.length,
    });

    console.log(`[dubai-test] Generated ${generatedPlans.length} plans`);

    if (generatedPlans.length === 0) {
      return jsonResponse({
        success: false,
        error: 'No plans generated',
        results,
      });
    }

    // ===== STAGE 2-5: VALIDATE AND REFINE =====
    console.log('[dubai-test] Stages 2-5: Validating and refining...');
    const stage2Start = Date.now();

    const validatedPlans: { plan: GroupPlan; validation: ValidationResult }[] = [];

    for (const plan of generatedPlans) {
      const validation = await validatePlan(plan);
      validatedPlans.push({ plan, validation });

      console.log(`[dubai-test] ${plan.title}: ${validation.score}/100 - ${validation.passed ? 'PASSED' : 'FAILED'}`);
    }

    results.stages.push({
      name: 'Validation',
      duration: Date.now() - stage2Start,
      plansValidated: validatedPlans.length,
      plansPassed: validatedPlans.filter(p => p.validation.passed).length,
    });

    // Filter to only passed plans
    const approvedPlans = validatedPlans.filter(p => p.validation.passed);

    // ===== STORE RESULTS =====
    if (storeResults && approvedPlans.length > 0) {
      console.log('[dubai-test] Storing approved plans...');
      const supabase = createServiceClient();

      // First, get or create Dubai city
      let dubaiCityId = DUBAI_CONFIG.cityId;

      const { data: existingCity } = await supabase
        .from('City')
        .select('id')
        .eq('name', 'Dubai')
        .single();

      if (existingCity) {
        dubaiCityId = existingCity.id;
      }

      for (let i = 0; i < approvedPlans.length; i++) {
        const { plan, validation } = approvedPlans[i];
        const flowId = `gf-dubai-${Date.now()}-${i}`;

        // Store GroupFlow
        const { data: flow, error: flowError } = await supabase
          .from('GroupFlow')
          .insert({
            id: flowId,
            flowId: flowId,
            cityId: dubaiCityId,
            rank: i + 1,
            title: plan.title,
            description: plan.description,
            totalHours: Math.ceil(plan.totalDuration / 60),
            startTime: plan.activities[0]?.startTime,
            endTime: plan.activities[plan.activities.length - 1]?.startTime,
            totalEstimate: Math.round((plan.estimatedCost.min + plan.estimatedCost.max) / 2),
            currency: plan.estimatedCost.currency,
            isWeekend: plan.difficulty === 'challenging',
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
          console.error(`[dubai-test] Failed to store flow: ${flowError.message}`);
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
      }

      results.stored = approvedPlans.length;
    }

    // ===== BUILD FINAL RESULTS =====
    results.finalPlans = approvedPlans.map(({ plan, validation }) => ({
      title: plan.title,
      description: plan.description,
      activities: plan.activities.map(a => ({
        venueName: a.venueName,
        address: a.address,
        time: `${a.startTime} (${a.duration}min)`,
        description: a.description,
      })),
      cost: `${plan.estimatedCost.min}-${plan.estimatedCost.max} ${plan.estimatedCost.currency}`,
      difficulty: plan.difficulty,
      tags: plan.aiTags,
      qualityScore: validation.score,
    }));

    results.summary = {
      totalGenerated: generatedPlans.length,
      totalApproved: approvedPlans.length,
      totalRejected: generatedPlans.length - approvedPlans.length,
      averageScore: Math.round(
        validatedPlans.reduce((sum, p) => sum + p.validation.score, 0) / validatedPlans.length
      ),
      totalDuration: Date.now() - startTime,
    };

    console.log('\n========================================');
    console.log('DUBAI PIPELINE RESULTS');
    console.log('========================================');
    console.log(`Generated: ${results.summary.totalGenerated}`);
    console.log(`Approved: ${results.summary.totalApproved}`);
    console.log(`Rejected: ${results.summary.totalRejected}`);
    console.log(`Average Score: ${results.summary.averageScore}/100`);
    console.log(`Duration: ${Math.round(results.summary.totalDuration / 1000)}s`);
    console.log('========================================\n');

    results.finalPlans.forEach((plan: any, i: number) => {
      console.log(`\n[${i + 1}] ${plan.title} (${plan.qualityScore}/100)`);
      console.log(`    ${plan.description}`);
      plan.activities.forEach((a: any) => {
        console.log(`    • ${a.venueName} @ ${a.time}`);
        console.log(`      ${a.address}`);
        console.log(`      "${a.description}"`);
      });
      console.log(`    Cost: ${plan.cost} | Difficulty: ${plan.difficulty}`);
      console.log(`    Tags: ${plan.tags.join(', ')}`);
    });

    return jsonResponse({
      success: true,
      data: results,
    });

  } catch (error) {
    console.error('[dubai-test] Error:', error);
    return errorResponse((error as Error).message, 500, 'SERVER_ERROR');
  }
});

async function generateDubaiPlans(count: number): Promise<GroupPlan[]> {
  const prompt = `Generate ${count} HIGH-QUALITY group plans for Dubai, UAE.

REQUIREMENTS:
1. Each plan must have 2-4 activities at REAL Dubai venues
2. Use famous venues: Zuma, White Dubai, Barasti, Buddha Bar, Nobu, Coya, Iris Dubai, etc.
3. COMPLETE addresses: "Building Name, Street, Area, Dubai, UAE"
4. ACCURATE GPS coordinates for Dubai (latitude ~25.x, longitude ~55.x)
5. Evocative 15-25 word descriptions
6. Cost in AED
7. Include variety: rooftop, beach club, luxury lounge, nightclub

Return JSON:
{
  "plans": [
    {
      "title": "Title",
      "description": "Venue 1 → Venue 2 → Venue 3. A [difficulty] [X]-hour experience through Dubai's best nightlife.",
      "activities": [
        {
          "venueName": "Real Venue Name",
          "address": "Full Address, Dubai, UAE",
          "coordinates": { "latitude": 25.xxxx, "longitude": 55.xxxx },
          "startTime": "21:00",
          "duration": 90,
          "description": "15-25 word evocative description.",
          "order": 1
        }
      ],
      "totalDuration": 300,
      "estimatedCost": { "min": 500, "max": 800, "currency": "AED" },
      "difficulty": "moderate",
      "bestFor": ["groups", "couples"],
      "aiTags": ["Rooftop", "Cocktails", "Luxury"]
    }
  ]
}`;

  const response = await claudeRequest(
    [{ role: 'user', content: prompt }],
    {
      systemPrompt: GENERATOR_SYSTEM_PROMPT,
      temperature: 0.8,
      maxTokens: 8192,
      jsonMode: true,
    }
  );

  const parsed = parseClaudeJSON<{ plans: GroupPlan[] }>(response);
  return parsed.plans || [];
}

async function validatePlan(plan: GroupPlan): Promise<ValidationResult> {
  const prompt = `Validate this Dubai group plan:

TITLE: "${plan.title}"
DESCRIPTION: ${plan.description}

ACTIVITIES:
${plan.activities.map((a, i) => `
${i + 1}. ${a.venueName}
   Address: ${a.address}
   Coordinates: ${a.coordinates.latitude}, ${a.coordinates.longitude}
   Time: ${a.startTime} (${a.duration}min)
   Description: "${a.description}"
`).join('')}

COST: ${plan.estimatedCost.min}-${plan.estimatedCost.max} ${plan.estimatedCost.currency}

VALIDATE:
1. Are all venues REAL and famous in Dubai?
2. Are addresses complete and accurate?
3. Are coordinates in Dubai (lat ~25, lon ~55)?
4. Are descriptions evocative (15-25 words)?
5. Is cost realistic for Dubai luxury nightlife?

Return JSON:
{
  "score": 85,
  "passed": true,
  "issues": [],
  "suggestions": []
}`;

  const response = await claudeRequest(
    [{ role: 'user', content: prompt }],
    {
      systemPrompt: VALIDATOR_SYSTEM_PROMPT,
      temperature: 0.2,
      maxTokens: 1024,
      jsonMode: true,
    }
  );

  const result = parseClaudeJSON<ValidationResult>(response);
  return {
    score: result.score || 0,
    passed: result.passed ?? (result.score >= 70),
    issues: result.issues || [],
    suggestions: result.suggestions || [],
  };
}

function extractTheme(tags: string[]): string {
  const themeMap: Record<string, string> = {
    'rooftop': 'rooftop',
    'beach': 'beach-club',
    'luxury': 'luxury',
    'club': 'club',
    'lounge': 'lounge',
    'boat': 'boat-party',
  };

  for (const tag of tags) {
    const lower = tag.toLowerCase();
    for (const [key, theme] of Object.entries(themeMap)) {
      if (lower.includes(key)) return theme;
    }
  }
  return 'luxury';
}

function getThumbnail(tags: string[]): string {
  if (tags.some(t => t.toLowerCase().includes('rooftop'))) {
    return 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&q=80';
  }
  if (tags.some(t => t.toLowerCase().includes('beach'))) {
    return 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80';
  }
  return 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&q=80';
}
