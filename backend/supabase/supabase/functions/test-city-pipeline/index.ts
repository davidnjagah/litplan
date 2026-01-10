/**
 * Test City Pipeline
 *
 * Generates high-quality group plans for any city using the 5-agent AI pipeline.
 * Validates and stores results in the database.
 *
 * POST /test-city-pipeline
 * Body: { cityName, targetCount?, storeResults? }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { claudeRequest, parseClaudeJSON } from '../_shared/claude-client.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { getWeekdayFromDate, isWeekendDate } from '../_shared/date-utils.ts';

// City configurations
const CITY_CONFIGS: Record<string, {
  country: string;
  currency: string;
  neighborhoods: string[];
  themes: string[];
  startTime: string;
  specialInstructions: string;
}> = {
  'Dubai': {
    country: 'United Arab Emirates',
    currency: 'AED',
    neighborhoods: ['Downtown Dubai', 'Dubai Marina', 'JBR', 'DIFC', 'Palm Jumeirah', 'Business Bay'],
    themes: ['rooftop', 'beach-club', 'luxury', 'club', 'lounge', 'boat-party'],
    startTime: '21:00',
    specialInstructions: 'Use famous venues like Zuma, White Dubai, Barasti, Buddha Bar, Nobu, Coya, Iris Dubai.'
  },
  'Ibiza': {
    country: 'Spain',
    currency: 'EUR',
    neighborhoods: ['Ibiza Town', 'Playa d\'en Bossa', 'San Antonio', 'Santa Eulalia', 'Es Canar', 'Cala Comte'],
    themes: ['superclub', 'beach-club', 'sunset-bar', 'boat-party', 'techno', 'house'],
    startTime: '22:00',
    specialInstructions: 'Use LEGENDARY Ibiza venues: Pacha, Amnesia, Ushuaïa, Hï Ibiza, DC-10, Café del Mar, Café Mambo, Blue Marlin, O Beach, Es Paradis.'
  },
  'New York': {
    country: 'United States',
    currency: 'USD',
    neighborhoods: ['Manhattan', 'Brooklyn', 'Williamsburg', 'Lower East Side', 'West Village', 'Meatpacking'],
    themes: ['jazz', 'comedy', 'rooftop', 'speakeasy', 'club', 'live-music'],
    startTime: '20:00',
    specialInstructions: 'Use famous NYC venues like Blue Note, Comedy Cellar, Le Bain, Brooklyn Brewery, The Dead Rabbit.'
  },
  'London': {
    country: 'United Kingdom',
    currency: 'GBP',
    neighborhoods: ['Soho', 'Shoreditch', 'Camden', 'Brixton', 'Mayfair', 'East London'],
    themes: ['pub-crawl', 'jazz', 'comedy', 'club', 'speakeasy', 'live-music'],
    startTime: '19:00',
    specialInstructions: 'Use famous London venues like Fabric, Ministry of Sound, Ronnie Scott\'s, Jazz Cafe, The Shard bars.'
  },
  'Miami': {
    country: 'United States',
    currency: 'USD',
    neighborhoods: ['South Beach', 'Wynwood', 'Brickell', 'Downtown', 'Design District', 'Little Havana'],
    themes: ['beach-club', 'rooftop', 'latin', 'club', 'art-district', 'boat-party'],
    startTime: '21:00',
    specialInstructions: 'Use famous Miami venues like LIV, Story, E11EVEN, Nikki Beach, The Broken Shaker, Ball & Chain.'
  }
};

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
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    const body = await req.json();
    const { cityName, targetCount = 3, storeResults = true } = body;

    if (!cityName) {
      return errorResponse('cityName required', 400, 'BAD_REQUEST');
    }

    const cityConfig = CITY_CONFIGS[cityName];
    if (!cityConfig) {
      return errorResponse(`City "${cityName}" not configured. Available: ${Object.keys(CITY_CONFIGS).join(', ')}`, 400, 'BAD_REQUEST');
    }

    console.log(`[city-pipeline] Starting pipeline for ${cityName} (${targetCount} plans)`);

    const supabase = createServiceClient();
    const startTime = Date.now();

    // Get city ID from database
    const { data: city } = await supabase
      .from('City')
      .select('id, name, country')
      .eq('name', cityName)
      .single();

    if (!city) {
      return errorResponse(`City "${cityName}" not found in database`, 404, 'NOT_FOUND');
    }

    const results: any = {
      city: cityName,
      cityId: city.id,
      targetCount,
      stages: [],
      finalPlans: [],
      summary: {},
    };

    // ===== STAGE 1: GENERATE PLANS =====
    console.log(`[city-pipeline] Stage 1: Generating ${targetCount} plans for ${cityName}...`);
    const stage1Start = Date.now();

    const generatedPlans = await generatePlansForCity(cityName, cityConfig, targetCount);

    results.stages.push({
      name: 'Generation',
      duration: Date.now() - stage1Start,
      plansCreated: generatedPlans.length,
    });

    console.log(`[city-pipeline] Generated ${generatedPlans.length} plans`);

    if (generatedPlans.length === 0) {
      return jsonResponse({
        success: false,
        error: 'No plans generated',
        results,
      });
    }

    // ===== STAGE 2-5: VALIDATE =====
    console.log(`[city-pipeline] Stages 2-5: Validating plans...`);
    const stage2Start = Date.now();

    const validatedPlans: { plan: GroupPlan; validation: ValidationResult }[] = [];

    for (const plan of generatedPlans) {
      const validation = await validatePlan(plan, cityName, cityConfig);
      validatedPlans.push({ plan, validation });
      console.log(`[city-pipeline] ${plan.title}: ${validation.score}/100 - ${validation.passed ? 'PASSED' : 'FAILED'}`);
    }

    results.stages.push({
      name: 'Validation',
      duration: Date.now() - stage2Start,
      plansValidated: validatedPlans.length,
      plansPassed: validatedPlans.filter(p => p.validation.passed).length,
    });

    // Filter to passed plans
    const approvedPlans = validatedPlans.filter(p => p.validation.passed);

    // ===== STORE RESULTS =====
    if (storeResults && approvedPlans.length > 0) {
      console.log(`[city-pipeline] Storing ${approvedPlans.length} approved plans...`);

      for (let i = 0; i < approvedPlans.length; i++) {
        const { plan, validation } = approvedPlans[i];
        const flowId = `gf-${cityName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${i}`;

        // Store GroupFlow
        const { data: flow, error: flowError } = await supabase
          .from('GroupFlow')
          .insert({
            id: flowId,
            flowId: flowId,
            cityId: city.id,
            rank: i + 1,
            title: plan.title,
            description: plan.description,
            totalHours: Math.ceil(plan.totalDuration / 60),
            startTime: plan.activities[0]?.startTime,
            endTime: plan.activities[plan.activities.length - 1]?.startTime,
            totalEstimate: Math.round((plan.estimatedCost.min + plan.estimatedCost.max) / 2),
            currency: plan.estimatedCost.currency,
            isWeekend: isWeekendDate(new Date().toISOString().split('T')[0]),
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
          console.error(`[city-pipeline] Failed to store flow: ${flowError.message}`);
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
              thumbnail: getThumbnail(plan.aiTags, cityName),
            });
        }

        console.log(`[city-pipeline] Stored: ${plan.title}`);
      }

      results.stored = approvedPlans.length;
    }

    // Build final results
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

    console.log(`\n========================================`);
    console.log(`${cityName.toUpperCase()} PIPELINE RESULTS`);
    console.log(`========================================`);
    console.log(`Generated: ${results.summary.totalGenerated}`);
    console.log(`Approved: ${results.summary.totalApproved}`);
    console.log(`Average Score: ${results.summary.averageScore}/100`);
    console.log(`Duration: ${Math.round(results.summary.totalDuration / 1000)}s`);
    console.log(`========================================\n`);

    return jsonResponse({
      success: true,
      data: results,
    });

  } catch (error) {
    console.error('[city-pipeline] Error:', error);
    return errorResponse((error as Error).message, 500, 'SERVER_ERROR');
  }
});

async function generatePlansForCity(
  cityName: string,
  config: typeof CITY_CONFIGS[string],
  count: number
): Promise<GroupPlan[]> {
  const systemPrompt = `You are an elite nightlife curator for ${cityName}, ${config.country}.

Generate group plans matching this EXACT quality standard:

EXAMPLE:
{
  "title": "Ultimate Night Out",
  "description": "Venue 1 → Venue 2 → Venue 3. A moderate 5-hour experience through ${cityName}'s best nightlife.",
  "activities": [
    {
      "venueName": "Famous Venue Name",
      "address": "Full Address, ${cityName}, ${config.country}",
      "coordinates": { "latitude": XX.XXXX, "longitude": XX.XXXX },
      "startTime": "${config.startTime}",
      "duration": 90,
      "description": "15-25 word evocative description of this legendary venue and what you'll experience.",
      "order": 1
    }
  ],
  "totalDuration": 300,
  "estimatedCost": { "min": 100, "max": 200, "currency": "${config.currency}" },
  "difficulty": "moderate",
  "bestFor": ["groups", "couples"],
  "aiTags": ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5"]
}

REQUIREMENTS:
- Use REAL, FAMOUS venues in ${cityName}
- ${config.specialInstructions}
- Complete addresses with street and area
- Accurate GPS coordinates for ${cityName}
- Evocative 15-25 word descriptions
- Prices in ${config.currency}

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Generate ${count} HIGH-QUALITY group plans for ${cityName}, ${config.country}.

REQUIREMENTS:
1. Each plan must have 2-4 activities at REAL ${cityName} venues
2. ${config.specialInstructions}
3. Use neighborhoods: ${config.neighborhoods.join(', ')}
4. Include themes: ${config.themes.join(', ')}
5. Complete addresses and accurate GPS coordinates
6. Evocative 15-25 word descriptions
7. Cost in ${config.currency}

Return JSON:
{
  "plans": [...]
}`;

  const response = await claudeRequest(
    [{ role: 'user', content: userPrompt }],
    {
      systemPrompt,
      temperature: 0.85,
      maxTokens: 8192,
      jsonMode: true,
    }
  );

  const parsed = parseClaudeJSON<{ plans: GroupPlan[] }>(response);
  return parsed.plans || [];
}

async function validatePlan(
  plan: GroupPlan,
  cityName: string,
  config: typeof CITY_CONFIGS[string]
): Promise<ValidationResult> {
  const prompt = `Validate this ${cityName} group plan:

TITLE: "${plan.title}"
DESCRIPTION: ${plan.description}

ACTIVITIES:
${plan.activities.map((a, i) => `
${i + 1}. ${a.venueName}
   Address: ${a.address}
   Description: "${a.description}"
`).join('')}

COST: ${plan.estimatedCost.min}-${plan.estimatedCost.max} ${plan.estimatedCost.currency}

VALIDATE:
1. Are all venues REAL and famous in ${cityName}?
2. Are descriptions evocative (15-25 words)?
3. Is cost realistic?

Return JSON:
{
  "score": 85,
  "passed": true,
  "issues": []
}`;

  const response = await claudeRequest(
    [{ role: 'user', content: prompt }],
    {
      systemPrompt: `You validate ${cityName} nightlife venues. Score 0-100. Plans scoring 70+ pass.`,
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
  };
}

function extractTheme(tags: string[]): string {
  const themeMap: Record<string, string> = {
    'superclub': 'club',
    'techno': 'underground',
    'house': 'club',
    'sunset': 'rooftop',
    'beach': 'beach-club',
    'boat': 'boat-party',
    'rooftop': 'rooftop',
    'jazz': 'jazz',
    'cocktail': 'speakeasy',
  };

  for (const tag of tags) {
    const lower = tag.toLowerCase();
    for (const [key, theme] of Object.entries(themeMap)) {
      if (lower.includes(key)) return theme;
    }
  }
  return 'club';
}

function getThumbnail(tags: string[], cityName: string): string {
  if (cityName === 'Ibiza') {
    if (tags.some(t => t.toLowerCase().includes('sunset'))) {
      return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80';
    }
    return 'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=400&q=80';
  }
  if (tags.some(t => t.toLowerCase().includes('beach'))) {
    return 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80';
  }
  if (tags.some(t => t.toLowerCase().includes('rooftop'))) {
    return 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&q=80';
  }
  return 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400&q=80';
}
