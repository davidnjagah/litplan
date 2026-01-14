/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Bolt Pipeline - Tag-Based Group Plan Generation
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * This pipeline generates custom group plans based on a specific theme tag.
 * Unlike the default 7-agent pipeline, this one:
 * - Only generates plans for the specified tag/theme
 * - Works for ANY city worldwide (not just predefined cities)
 * - Stores results linked to the requesting user
 * - Uses in-depth tag definitions for better AI context
 *
 * POST /bolt-pipeline
 * Body: {
 *   "city": "Tokyo",
 *   "country": "Japan",
 *   "theme": "Nightlife",
 *   "themeDefinition": "High-energy clubs, lounges...",
 *   "userId": "user-uuid"
 * }
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { gptRequest, parseGPTJSON } from '../_shared/gpt-client.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { searchVenue, VerifiedVenue } from '../_shared/google-places-client.ts';

// In-depth theme definitions for AI context
const THEME_DEFINITIONS: Record<string, string> = {
  "Nightlife": "High-energy clubs, lounges, and late-night venues. Focus on dancing, bottle service, VIP experiences, and venues that stay open past midnight. Include world-famous clubs and hidden gems alike.",
  "Date Night": "Romantic venues perfect for couples - intimate restaurants with candlelit ambiance, cozy wine bars with soft lighting, scenic viewpoints for sunset watching, and places with mood lighting and sophisticated atmosphere.",
  "Bar Hopping": "Multiple bar stops in walkable distance. Include a mix of craft cocktail bars with artisan drinks, friendly dive bars with character, trendy rooftop bars with views, and beloved local favorites. Plan for easy transitions between venues.",
  "Live Music": "Venues featuring live performances - renowned jazz clubs, intimate rock venues, indie stages discovering new talent, acoustic sets in atmospheric spaces. Focus on the music experience and artist discovery.",
  "Foodie": "Culinary adventures through the city's best restaurants, vibrant food markets, authentic street food stalls, and unique dining experiences. Focus on flavor diversity, local specialties, and Instagram-worthy presentations.",
  "Brunch": "Late morning to early afternoon experiences with bottomless mimosas, eggs benedict, avocado toast, and social dining. Weekend vibes, Instagram-worthy spots with great natural light, and places with good atmosphere.",
  "Rooftop": "Elevated venues with city views - rooftop bars with panoramic skylines, sky lounges above the clouds, terrace restaurants with sunset timing. Perfect for photography opportunities and special occasions.",
  "Jazz": "Classic jazz clubs celebrating the genre's tradition, speakeasies with live jazz performances, and venues hosting world-class musicians. Sophisticated atmosphere, quality acoustics, and an appreciation for musical craft.",
  "Adventure": "Unique and unconventional experiences - escape rooms, karaoke bars, arcade bars with retro games, immersive theater experiences, and activities beyond standard nightlife. Fun and memorable.",
  "Chill": "Low-key hangouts for relaxed conversation - cozy cafes with comfortable seating, quiet bars with soft music, lounges with plush furniture. No pressure environment, easy vibes, good for catching up with friends.",
  "Culture": "Cultural immersion through local traditions, ethnic neighborhoods with authentic experiences, historic venues with stories to tell, and experiences that showcase the city's unique character and heritage.",
  "Comedy": "Stand-up comedy clubs featuring local and touring comedians, improv theaters with audience participation, and venues dedicated to comedic performances. Laughter-focused entertainment and good vibes.",
  "Cocktails": "Craft cocktail bars showcasing mixology expertise and artisan drinks, speakeasies with creative menus, and venues where bartenders are artists. Focus on quality ingredients and presentation.",
  "Dancing": "Dance-focused venues - clubs with world-class DJs, salsa nights with live bands, dance halls for all skill levels, and places where movement is the main attraction. Great sound systems and dance floors.",
  "Sunset": "Venues and locations optimized for sunset viewing. West-facing patios with unobstructed views, waterfront spots with reflections, and timed experiences around golden hour. Perfect for photographers.",
  "Art": "Galleries hosting evening events, art walks through creative districts, museums with late hours, and venues with artistic ambiance. Where culture meets nightlife in creative spaces.",
  "Wine": "Wine bars offering curated selections, wine tastings with sommelier guidance, and venues specializing in grape varieties. Sophisticated, educational, and perfect for wine enthusiasts.",
  "Beach": "Coastal venues - beach bars with sand between your toes, seaside restaurants with ocean views, and waterfront experiences. Sand, surf, sea breeze, and laid-back atmosphere.",
  "Party": "High-energy celebration mode - birthday-worthy venues, champagne popping, confetti, and maximum fun. Go big or go home. VIP experiences and memorable nights.",
  "Speakeasy": "Hidden bars with secret entrances, password-required venues, and prohibition-era themed experiences. Mystery, exclusivity, and the thrill of discovery.",
  "Low Budget": "Budget-friendly experiences under $50 per person total - happy hours with deals, free entry venues, affordable local eats, public spaces with atmosphere, free events and festivals, and wallet-friendly fun without sacrificing quality or experience."
};

// Interfaces
interface Activity {
  venueName: string;
  address: string;
  coordinates: { latitude: number; longitude: number };
  openingHours?: string;  // e.g., "18:00 - 02:00"
  startTime: string;
  duration: number;
  description: string;
  order: number;
  // Google Places verified fields
  googlePlaceId?: string;
  googleMapsUrl?: string;
  isAddressVerified?: boolean;
  addressConfidence?: 'high' | 'medium' | 'low' | 'not_found';
}

interface GroupPlan {
  title: string;
  description: string;
  planType: string;
  activities: Activity[];
  totalDuration: number;
  estimatedCost: { min: number; max: number; currency: string };
  difficulty: string;
  bestFor: string[];
  aiTags: string[];
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    const body = await req.json();
    const {
      city,
      country,
      theme,
      themeDefinition,
      userId = 'anonymous'
    } = body;

    // Validate required fields
    if (!city || !theme) {
      return errorResponse('City and theme are required', 400, 'MISSING_FIELDS');
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`BOLT PIPELINE - ${theme.toUpperCase()} in ${city}, ${country || 'Unknown'}`);
    console.log(`User: ${userId}`);
    console.log(`${'='.repeat(70)}\n`);

    const startTime = Date.now();

    // Get theme definition (use provided or fallback to our definitions)
    const finalThemeDefinition = themeDefinition || THEME_DEFINITIONS[theme] || theme;

    // Determine currency based on country
    const currency = getCurrencyForCountry(country);

    // ===== STEP 1: GENERATE PLAN =====
    console.log(`[BOLT] Generating ${theme} plan for ${city}...`);
    const plan = await generatePlanForTheme(city, country, theme, finalThemeDefinition, currency);

    if (!plan) {
      return jsonResponse({
        success: false,
        error: 'Failed to generate plan. Please try again.',
        retry: true
      });
    }

    // ===== STEP 2: VALIDATE ADDRESSES WITH GOOGLE PLACES =====
    console.log(`[BOLT] Validating venue addresses with Google Places...`);
    const validatedPlan = await validateVenueAddresses(plan, city, country);

    // ===== STEP 3: ENHANCE DESCRIPTIONS =====
    console.log(`[BOLT] Enhancing descriptions...`);
    const enhancedPlan = await enhanceDescriptions(validatedPlan, city, theme);

    // ===== STEP 4: STORE IN DATABASE =====
    console.log(`[BOLT] Storing plan in database...`);
    const supabase = createServiceClient();

    // Generate unique ID
    const timestamp = Date.now();
    const flowId = `bolt-${city.toLowerCase().replace(/\s+/g, '-')}-${theme.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`;

    // Store the GroupFlow
    const flowData = {
      id: flowId,
      flowId: flowId,
      cityId: city.toLowerCase().replace(/\s+/g, '-'),
      rank: 1,
      title: enhancedPlan.title,
      description: enhancedPlan.description,
      totalHours: Math.ceil(enhancedPlan.totalDuration / 60),
      startTime: enhancedPlan.activities[0]?.startTime,
      endTime: enhancedPlan.activities[enhancedPlan.activities.length - 1]?.startTime,
      totalEstimate: Math.round((enhancedPlan.estimatedCost.min + enhancedPlan.estimatedCost.max) / 2),
      currency: enhancedPlan.estimatedCost.currency,
      isWeekend: true,
      proOnly: false,
      aiGenerated: true,
      isTemporary: false,
      theme: theme.toLowerCase(),
      difficulty: enhancedPlan.difficulty,
      planType: theme.toLowerCase().replace(/\s+/g, '_'),
      costMin: enhancedPlan.estimatedCost.min,
      costMax: enhancedPlan.estimatedCost.max,
      tags: enhancedPlan.aiTags,
      generatedBy: userId,
      generatedCity: city,
      generatedCountry: country || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data: storedFlow, error: flowError } = await supabase
      .from('GroupFlow')
      .insert(flowData)
      .select()
      .single();

    if (flowError) {
      console.error('[BOLT] Error storing GroupFlow:', flowError);
      // Don't fail - return the plan anyway
    }

    // Store GroupFlowSteps
    for (let i = 0; i < enhancedPlan.activities.length; i++) {
      const activity = enhancedPlan.activities[i];
      const planId = `${flowId}-plan-${i}`;

      // Store Plan record first
      await supabase.from('Plan').insert({
        id: planId,
        planId: planId,
        title: activity.venueName,
        venueName: activity.venueName,
        description: activity.description,
        category: 'nightlife',
        type: 'EVENT',
        cityId: flowData.cityId,
        date: new Date().toISOString().split('T')[0],
        weekday: 'Saturday',
        isWeekend: true,
        startTime: activity.startTime,
        endTime: calculateEndTime(activity.startTime, activity.duration),
        latitude: activity.coordinates.latitude,
        longitude: activity.coordinates.longitude,
        address: activity.address,
        googlePlaceId: activity.googlePlaceId || null,
        googleMapsUrl: activity.googleMapsUrl || null,
        neighborhood: 'City Center',
        priceRange: '$$',
        entryFee: 0,
        freeEntry: theme === 'Low Budget',
        currency: currency,
        rank: i + 1,
        source: 'bolt-pipeline',
        aiGenerated: true,
        isIndividual: false,
        isGroup: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Store GroupFlowStep
      await supabase.from('GroupFlowStep').insert({
        id: `${flowId}-step-${activity.order}`,
        flowId: flowId,
        planId: planId,
        stepNumber: activity.order,
        title: activity.venueName,
        venueName: activity.venueName,
        duration: activity.duration,
      });
    }

    const totalDuration = Date.now() - startTime;

    console.log(`\n${'='.repeat(70)}`);
    console.log(`BOLT PIPELINE COMPLETE`);
    console.log(`Total time: ${Math.round(totalDuration / 1000)}s`);
    console.log(`${'='.repeat(70)}\n`);

    // Return the group flow in the format the iOS app expects
    return jsonResponse({
      success: true,
      data: {
        groupFlowId: flowId,
        cityId: flowData.cityId,
        title: enhancedPlan.title,
        description: enhancedPlan.description,
        activities: enhancedPlan.activities.map(a => ({
          activityId: `${flowId}-activity-${a.order}`,
          venueName: a.venueName,
          location: {
            address: a.address,
            coordinates: {
              latitude: a.coordinates.latitude,
              longitude: a.coordinates.longitude
            },
            googlePlaceId: a.googlePlaceId || null,
            googleMapsUrl: a.googleMapsUrl || null,
            isVerified: a.isAddressVerified || false,
            confidence: a.addressConfidence || 'not_found'
          },
          openingHours: a.openingHours || null,
          startTime: a.startTime,
          duration: a.duration,
          description: a.description,
          order: a.order
        })),
        totalDuration: enhancedPlan.totalDuration,
        estimatedCost: enhancedPlan.estimatedCost,
        difficulty: enhancedPlan.difficulty,
        bestFor: enhancedPlan.bestFor,
        aiTags: enhancedPlan.aiTags,
        isLocked: false,
        isWeekend: true,
        weekday: 'Saturday',
        planType: theme.toLowerCase().replace(/\s+/g, '_')
      }
    });

  } catch (error) {
    console.error('[BOLT] Pipeline error:', error);
    return errorResponse(
      'Failed to generate plan. Please try again.',
      500,
      'PIPELINE_ERROR'
    );
  }
});

// ===== GENERATE PLAN FOR THEME =====
async function generatePlanForTheme(
  city: string,
  country: string,
  theme: string,
  themeDefinition: string,
  currency: string
): Promise<GroupPlan | null> {
  const isLowBudget = theme === 'Low Budget';

  const systemPrompt = `You are an expert local guide and nightlife curator for ${city}${country ? `, ${country}` : ''}.

Your task is to create a curated group plan specifically for the "${theme}" experience.

THEME DEFINITION:
${themeDefinition}

IMPORTANT RULES:
1. All venues MUST be REAL places that exist in ${city}
2. Provide REAL street addresses (research actual addresses)
3. Coordinates must be accurate for ${city}
4. Consider local culture and customs
5. Times should be appropriate for the activity type
${isLowBudget ? '6. CRITICAL: Total cost must be under $50 per person. Focus on free entry venues, happy hours, and affordable local spots.' : ''}

CRITICAL - OPENING HOURS VALIDATION:
- You MUST verify and consider the ACTUAL opening hours of each venue
- NEVER suggest a venue at a time when it would be CLOSED
- Research the real operating hours before including a venue
- Nightclubs typically open 22:00-04:00, NOT during daytime
- Restaurants typically open 11:00-23:00
- Bars typically open 17:00-02:00
- Brunch spots typically open 09:00-15:00
- Jazz clubs typically open 19:00-01:00
- Rooftop bars may close earlier (around midnight)
- Include the venue's actual opening hours in your response
- If unsure about a venue's hours, choose a conservative time when it's DEFINITELY open

TIMING GUIDELINES:
- Account for travel time between venues (10-20 min)
- Each venue duration should be realistic
- Total duration should be 3-6 hours
- Ensure each activity starts AFTER the venue opens and ends BEFORE it closes

LOCATION PROXIMITY - CRITICAL:
- All venues MUST be within WALKING DISTANCE of each other (max 15 minutes walk between consecutive venues)
- Choose venues in the same neighborhood or district
- Users should be able to walk from one venue to the next easily
- If walking distance venues are not available for the theme, ensure venues are within a 30-minute drive by car maximum
- NEVER select venues that are far apart across the city
- Consider the natural flow of moving between venues on foot
- Prioritize areas with multiple suitable venues close together (e.g., entertainment districts, downtown areas, nightlife zones)

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Create a ${theme} group plan for ${city}${country ? `, ${country}` : ''}.

IMPORTANT REQUIREMENTS:
1. Verify opening hours for each venue and only schedule activities when venues are OPEN.
2. ALL VENUES MUST BE WITHIN 15 MINUTES WALKING DISTANCE of each other. Choose venues in the same neighborhood/district. If no walkable options exist, ensure they are within 30 min drive maximum.

Return JSON:
{
  "plan": {
    "title": "Unique catchy title specific to ${city}",
    "description": "2-3 sentence overview",
    "planType": "${theme.toLowerCase().replace(/\s+/g, '_')}",
    "activities": [
      {
        "venueName": "Real venue name",
        "address": "Full street address, ${city}",
        "coordinates": { "latitude": XX.XXXX, "longitude": XX.XXXX },
        "openingHours": "HH:MM - HH:MM (e.g., 18:00 - 02:00)",
        "startTime": "HH:MM (must be AFTER venue opens)",
        "duration": 90,
        "description": "What you'll do here",
        "order": 1
      }
    ],
    "totalDuration": 300,
    "estimatedCost": {
      "min": ${isLowBudget ? 20 : 80},
      "max": ${isLowBudget ? 50 : 200},
      "currency": "${currency}"
    },
    "difficulty": "moderate",
    "bestFor": ["friends", "groups"],
    "aiTags": ["${theme}", "curated", "local"]
  }
}

Create exactly 3 activities. Verify each venue's opening hours and ensure startTime falls within those hours!`;

  try {
    const response = await gptRequest([{ role: 'user', content: userPrompt }], {
      systemPrompt,
      temperature: 0.8,
      maxTokens: 4096,
      jsonMode: true,
    });

    const result = parseGPTJSON<{ plan: GroupPlan }>(response);
    return result.plan || null;
  } catch (error) {
    console.error('[BOLT] Generation error:', error);
    return null;
  }
}

// ===== VALIDATE VENUE ADDRESSES WITH GOOGLE PLACES =====
async function validateVenueAddresses(
  plan: GroupPlan,
  city: string,
  country?: string
): Promise<GroupPlan> {
  const validatedActivities: Activity[] = [];

  for (const activity of plan.activities) {
    try {
      console.log(`[BOLT] Validating: ${activity.venueName}`);

      // Search for the venue using Google Places API
      const verified = await searchVenue(activity.venueName, city, country);

      if (verified && verified.isVerified) {
        // Update activity with verified data
        validatedActivities.push({
          ...activity,
          venueName: verified.venueName, // Use Google's name (may be more accurate)
          address: verified.address,
          coordinates: {
            latitude: verified.coordinates.latitude,
            longitude: verified.coordinates.longitude
          },
          googlePlaceId: verified.googlePlaceId,
          googleMapsUrl: verified.googleMapsUrl,
          isAddressVerified: true,
          addressConfidence: verified.confidence
        });

        console.log(`[BOLT] ✓ Verified: ${verified.venueName} (${verified.confidence} confidence)`);
      } else {
        // Keep original data but add Google Maps search URL
        const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${activity.venueName} ${city}${country ? ` ${country}` : ''}`)}`;

        validatedActivities.push({
          ...activity,
          googleMapsUrl: fallbackUrl,
          isAddressVerified: false,
          addressConfidence: 'not_found'
        });

        console.log(`[BOLT] ✗ Not verified: ${activity.venueName} (using fallback search URL)`);
      }
    } catch (error) {
      console.error(`[BOLT] Error validating ${activity.venueName}:`, error);

      // Keep original data with fallback URL
      const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${activity.venueName} ${city}${country ? ` ${country}` : ''}`)}`;

      validatedActivities.push({
        ...activity,
        googleMapsUrl: fallbackUrl,
        isAddressVerified: false,
        addressConfidence: 'not_found'
      });
    }

    // Small delay between API calls to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return {
    ...plan,
    activities: validatedActivities
  };
}

// ===== ENHANCE DESCRIPTIONS =====
async function enhanceDescriptions(plan: GroupPlan, city: string, theme: string): Promise<GroupPlan> {
  const systemPrompt = `You are a travel writer creating immersive descriptions for ${city}.
Write engaging, second-person descriptions that make readers excited to visit.
Each description should be 3-4 sentences, capturing atmosphere and what to expect.
RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Enhance these venue descriptions for a ${theme} experience in ${city}:

${plan.activities.map(a => `- ${a.venueName}: "${a.description}"`).join('\n')}

Return JSON:
{
  "descriptions": [
    { "venueName": "Name", "description": "Enhanced 3-4 sentence description" }
  ]
}`;

  try {
    const response = await gptRequest([{ role: 'user', content: userPrompt }], {
      systemPrompt,
      temperature: 0.7,
      maxTokens: 2048,
      jsonMode: true,
    });

    const result = parseGPTJSON<{ descriptions: { venueName: string; description: string }[] }>(response);

    // Merge enhanced descriptions
    const enhancedActivities = plan.activities.map(activity => {
      const enhanced = result.descriptions.find(d => d.venueName === activity.venueName);
      return {
        ...activity,
        description: enhanced?.description || activity.description
      };
    });

    return { ...plan, activities: enhancedActivities };
  } catch (error) {
    console.error('[BOLT] Enhancement error:', error);
    return plan;
  }
}

// ===== HELPERS =====

function getCurrencyForCountry(country: string): string {
  const currencyMap: Record<string, string> = {
    'United States': 'USD', 'USA': 'USD', 'US': 'USD',
    'United Kingdom': 'GBP', 'UK': 'GBP', 'England': 'GBP',
    'Japan': 'JPY',
    'China': 'CNY',
    'Kenya': 'KES',
    'Tanzania': 'TZS',
    'South Africa': 'ZAR',
    'Nigeria': 'NGN',
    'India': 'INR',
    'Australia': 'AUD',
    'Canada': 'CAD',
    'Brazil': 'BRL',
    'Mexico': 'MXN',
    'Thailand': 'THB',
    'UAE': 'AED', 'United Arab Emirates': 'AED',
    'Switzerland': 'CHF',
  };

  // Default to EUR for European countries, USD otherwise
  if (!country) return 'USD';

  const europeanCountries = [
    'France', 'Germany', 'Spain', 'Italy', 'Netherlands', 'Belgium',
    'Austria', 'Portugal', 'Greece', 'Ireland', 'Finland', 'Luxembourg'
  ];

  if (currencyMap[country]) return currencyMap[country];
  if (europeanCountries.includes(country)) return 'EUR';

  return 'USD';
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}
