/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Bolt Pipeline - Premium 3-Agent Venue Discovery System
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * This pipeline uses 3 AI agents to ensure only the BEST, REAL venues are recommended:
 *
 * AGENT 1 - VENUE DISCOVERY:
 *   Finds the highest-rated, most popular venues for the theme.
 *   For rooftop: highest views. For nightlife: most popular clubs.
 *   Focuses on places with real reviews and recommendations.
 *
 * AGENT 2 - VENUE VALIDATOR:
 *   Critically examines each venue to confirm it's real.
 *   Checks for real reviews, ratings, and accurate addresses.
 *   Can REJECT fictional or unverified venues.
 *
 * AGENT 3 - NARRATIVE CREATOR:
 *   Only runs for validated venues.
 *   Creates immersive descriptions for the final plan.
 *
 * + GOOGLE PLACES API for address verification and Maps URLs.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { gptRequest, parseGPTJSON } from '../_shared/gpt-client.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { searchVenue, VerifiedVenue } from '../_shared/google-places-client.ts';

// Theme-specific optimization hints for Agent 1
const THEME_OPTIMIZATION: Record<string, string> = {
  "Rooftop": "Find venues with the HIGHEST elevation and BEST panoramic views. Prioritize rooftops on tall buildings with unobstructed skyline views. Look for places featured in 'best rooftop bars' lists.",
  "Nightlife": "Find the MOST POPULAR clubs with the best DJ lineups and atmosphere. Look for venues with long queues, celebrity sightings, or featured in nightlife guides.",
  "Date Night": "Find the MOST ROMANTIC venues with the best ambiance. Look for places with candlelit settings, intimate seating, and excellent reviews for couples.",
  "Bar Hopping": "Find the MOST ICONIC bars in the best bar district. Look for craft cocktail bars with award-winning bartenders or historic establishments.",
  "Live Music": "Find venues hosting the BEST live performances. Look for places with great acoustics, notable past performers, and dedicated music crowds.",
  "Foodie": "Find restaurants with the HIGHEST ratings and most authentic cuisine. Look for chef-owned establishments, Michelin mentions, or local institution status.",
  "Brunch": "Find the MOST INSTAGRAM-WORTHY brunch spots with the best food quality. Look for places with lines out the door on weekends.",
  "Jazz": "Find the MOST LEGENDARY jazz venues with the best musicians. Look for historic clubs or places where famous artists have performed.",
  "Sunset": "Find locations with the BEST UNOBSTRUCTED WEST-FACING views. Prioritize waterfront or elevated spots known for sunset watching.",
  "Speakeasy": "Find the MOST AUTHENTIC hidden bars with real secret entrances. Look for places that require reservations or have password entry.",
  "Cocktails": "Find bars with AWARD-WINNING mixologists and most creative menus. Look for World's 50 Best Bars mentions or local awards.",
  "Comedy": "Find comedy clubs with the BEST lineups and most famous alumni. Look for places where top comedians have performed.",
  "Wine": "Find wine bars with the BEST selections and most knowledgeable sommeliers. Look for places with rare vintages or notable wine programs.",
  "Dancing": "Find clubs with the BEST sound systems and dance floors. Look for venues known for specific dance styles or legendary DJ sets.",
  "Beach": "Find the BEST beachfront venues with the most stunning views. Look for places directly on the sand with great food and drinks.",
  "Art": "Find galleries and venues in the MOST VIBRANT art districts. Look for places hosting notable exhibitions or featuring emerging artists.",
  "Culture": "Find the MOST AUTHENTIC cultural experiences with deep local roots. Look for places that locals genuinely frequent.",
  "Adventure": "Find the MOST UNIQUE and memorable experiences. Look for places featured in 'unusual things to do' lists.",
  "Chill": "Find the COZIEST spots with the best relaxed atmosphere. Look for places with comfortable seating and loyal regular crowds.",
  "Party": "Find the BIGGEST party venues with the best energy. Look for places known for celebrations and VIP experiences.",
  "Low Budget": "Find the BEST VALUE spots that locals love. Look for happy hours, free entry venues, and affordable gems with great atmosphere."
};

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
  openingHours?: string;
  startTime: string;
  duration: number;
  description: string;
  order: number;
  // Credibility signals from Agent 1
  whyRecommended?: string;
  estimatedRating?: number;
  popularitySignals?: string[];
  // Validation status from Agent 2
  isValidated?: boolean;
  validationNotes?: string;
  rejectionReason?: string;
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

interface ValidationResult {
  venueName: string;
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  correctedName?: string;
  correctedAddress?: string;
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

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`BOLT PIPELINE - 3-AGENT SYSTEM`);
    console.log(`Theme: ${theme.toUpperCase()} | City: ${city}, ${country || 'Unknown'}`);
    console.log(`User: ${userId}`);
    console.log(`${'═'.repeat(70)}\n`);

    const startTime = Date.now();

    // Get theme definition and optimization hints
    const finalThemeDefinition = themeDefinition || THEME_DEFINITIONS[theme] || theme;
    const optimizationHint = THEME_OPTIMIZATION[theme] || "Find the BEST and most POPULAR venues for this experience.";
    const currency = getCurrencyForCountry(country);

    // ═══════════════════════════════════════════════════════════════════════
    // AGENT 1: VENUE DISCOVERY - Find the BEST venues
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`\n[AGENT 1] 🔍 VENUE DISCOVERY - Finding the best ${theme} spots...`);
    const discoveredPlan = await agent1_discoverVenues(city, country, theme, finalThemeDefinition, optimizationHint, currency);

    if (!discoveredPlan || discoveredPlan.activities.length === 0) {
      console.log(`[AGENT 1] ❌ Failed to discover venues`);
      return jsonResponse({
        success: false,
        error: `We couldn't find suitable ${theme} venues in ${city}. Please try a different vibe or city.`,
        errorCode: 'NO_VENUES_DISCOVERED',
        retry: true
      });
    }

    console.log(`[AGENT 1] ✅ Discovered ${discoveredPlan.activities.length} potential venues`);
    discoveredPlan.activities.forEach((a, i) => {
      console.log(`   ${i + 1}. ${a.venueName} - ${a.whyRecommended || 'No reason provided'}`);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // AGENT 2: VENUE VALIDATOR - Confirm venues are real
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`\n[AGENT 2] 🔎 VENUE VALIDATOR - Confirming venues exist...`);
    const validationResults = await agent2_validateVenues(discoveredPlan.activities, city, country);

    // Filter to only validated venues
    const validatedActivities: Activity[] = [];
    const rejectedVenues: string[] = [];

    for (const activity of discoveredPlan.activities) {
      const validation = validationResults.find(v =>
        v.venueName.toLowerCase() === activity.venueName.toLowerCase() ||
        v.correctedName?.toLowerCase() === activity.venueName.toLowerCase()
      );

      if (validation && validation.isValid) {
        validatedActivities.push({
          ...activity,
          venueName: validation.correctedName || activity.venueName,
          address: validation.correctedAddress || activity.address,
          isValidated: true,
          validationNotes: validation.reasoning
        });
        console.log(`   ✅ VALID: ${activity.venueName} (${validation.confidence} confidence)`);
      } else {
        rejectedVenues.push(activity.venueName);
        console.log(`   ❌ REJECTED: ${activity.venueName} - ${validation?.reasoning || 'Could not verify'}`);
      }
    }

    // Check if we have enough valid venues (minimum 2 required)
    if (validatedActivities.length < 2) {
      console.log(`\n[AGENT 2] ❌ Not enough venues validated (${validatedActivities.length}/2 minimum)`);
      return jsonResponse({
        success: false,
        error: `We couldn't verify enough ${theme} venues in ${city}. Only ${validatedActivities.length} venue(s) passed validation. Please try again.`,
        errorCode: 'INSUFFICIENT_VENUES',
        rejectedVenues: rejectedVenues,
        validatedCount: validatedActivities.length,
        minimumRequired: 2,
        retry: true
      });
    }

    console.log(`\n[AGENT 2] ✅ ${validatedActivities.length}/${discoveredPlan.activities.length} venues validated (minimum 2 required)`);

    // ═══════════════════════════════════════════════════════════════════════
    // GOOGLE PLACES API - Verify addresses and get Maps URLs
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`\n[GOOGLE PLACES] 📍 Verifying addresses...`);
    const addressVerifiedActivities = await verifyWithGooglePlaces(validatedActivities, city, country);

    // ═══════════════════════════════════════════════════════════════════════
    // AGENT 3: NARRATIVE CREATOR - Create immersive descriptions
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`\n[AGENT 3] ✍️ NARRATIVE CREATOR - Crafting descriptions...`);
    const finalPlan = await agent3_createNarrative(
      { ...discoveredPlan, activities: addressVerifiedActivities },
      city,
      theme,
      validatedActivities.length < 3
    );

    // Renumber activities if some were rejected
    finalPlan.activities = finalPlan.activities.map((a, index) => ({
      ...a,
      order: index + 1
    }));

    // Update total duration based on remaining activities
    finalPlan.totalDuration = finalPlan.activities.reduce((sum, a) => sum + a.duration, 0) +
      (finalPlan.activities.length - 1) * 15; // 15 min travel between venues

    // ═══════════════════════════════════════════════════════════════════════
    // STORE IN DATABASE
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`\n[DATABASE] 💾 Storing plan...`);
    const supabase = createServiceClient();

    const timestamp = Date.now();
    const flowId = `bolt-${city.toLowerCase().replace(/\s+/g, '-')}-${theme.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`;

    const flowData = {
      id: flowId,
      flowId: flowId,
      cityId: city.toLowerCase().replace(/\s+/g, '-'),
      rank: 1,
      title: finalPlan.title,
      description: finalPlan.description,
      totalHours: Math.ceil(finalPlan.totalDuration / 60),
      startTime: finalPlan.activities[0]?.startTime,
      endTime: finalPlan.activities[finalPlan.activities.length - 1]?.startTime,
      totalEstimate: Math.round((finalPlan.estimatedCost.min + finalPlan.estimatedCost.max) / 2),
      currency: finalPlan.estimatedCost.currency,
      isWeekend: true,
      proOnly: false,
      aiGenerated: true,
      isTemporary: false,
      theme: theme.toLowerCase(),
      difficulty: finalPlan.difficulty,
      planType: theme.toLowerCase().replace(/\s+/g, '_'),
      costMin: finalPlan.estimatedCost.min,
      costMax: finalPlan.estimatedCost.max,
      tags: finalPlan.aiTags,
      generatedBy: userId,
      generatedCity: city,
      generatedCountry: country || '',
      venuesValidated: validatedActivities.length,
      venuesRejected: rejectedVenues.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { error: flowError } = await supabase
      .from('GroupFlow')
      .insert(flowData)
      .select()
      .single();

    if (flowError) {
      console.error('[DATABASE] Error storing GroupFlow:', flowError);
    }

    // Store individual plans and steps
    for (let i = 0; i < finalPlan.activities.length; i++) {
      const activity = finalPlan.activities[i];
      const planId = `${flowId}-plan-${i}`;

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
        source: 'bolt-pipeline-v2',
        aiGenerated: true,
        isIndividual: false,
        isGroup: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

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

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`BOLT PIPELINE COMPLETE`);
    console.log(`Venues: ${finalPlan.activities.length} validated | ${rejectedVenues.length} rejected`);
    console.log(`Total time: ${Math.round(totalDuration / 1000)}s`);
    console.log(`${'═'.repeat(70)}\n`);

    // Return response
    return jsonResponse({
      success: true,
      data: {
        groupFlowId: flowId,
        cityId: flowData.cityId,
        title: finalPlan.title,
        description: finalPlan.description,
        activities: finalPlan.activities.map(a => ({
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
        totalDuration: finalPlan.totalDuration,
        estimatedCost: finalPlan.estimatedCost,
        difficulty: finalPlan.difficulty,
        bestFor: finalPlan.bestFor,
        aiTags: finalPlan.aiTags,
        isLocked: false,
        isWeekend: true,
        weekday: 'Saturday',
        planType: theme.toLowerCase().replace(/\s+/g, '_'),
        venueCount: finalPlan.activities.length,
        rejectedVenues: rejectedVenues.length > 0 ? rejectedVenues : undefined
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

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 1: VENUE DISCOVERY
// Finds the BEST, most credible venues with highest ratings and popularity
// ═══════════════════════════════════════════════════════════════════════════════
async function agent1_discoverVenues(
  city: string,
  country: string,
  theme: string,
  themeDefinition: string,
  optimizationHint: string,
  currency: string
): Promise<GroupPlan | null> {
  const isLowBudget = theme === 'Low Budget';

  const systemPrompt = `You are an expert local guide for ${city}${country ? `, ${country}` : ''} with deep knowledge of the BEST venues.

YOUR MISSION: Find the TOP 3 most CREDIBLE, REAL, and HIGHLY-RATED venues for a "${theme}" experience.

THEME CONTEXT:
${themeDefinition}

OPTIMIZATION GOAL:
${optimizationHint}

CRITICAL REQUIREMENTS - CREDIBILITY:
1. ONLY recommend venues that ACTUALLY EXIST and are CURRENTLY OPERATING
2. Choose places that appear in Google Maps, TripAdvisor, Yelp, or local guides
3. Prioritize venues with HIGH RATINGS (4+ stars) and MANY REVIEWS
4. Include venues that locals genuinely recommend
5. Avoid generic or fictional-sounding names
6. Each venue must have a REAL street address you're confident about

FOR EACH VENUE, EXPLAIN:
- WHY you're recommending it (ratings, popularity, unique features)
- What makes it the BEST for this theme
- Popularity signals (famous for, featured in, known for)

LOCATION REQUIREMENTS:
- All 3 venues MUST be within 15 MINUTES WALKING DISTANCE of each other
- Choose venues in the SAME neighborhood or entertainment district
- If walking distance isn't possible, max 30 minutes by car
- Prioritize walkable areas with multiple venue options

OPENING HOURS:
- Verify venues are OPEN at the suggested times
- Nightclubs: typically 22:00-04:00
- Restaurants: typically 11:00-23:00
- Bars: typically 17:00-02:00
- Brunch: typically 09:00-15:00

${isLowBudget ? 'BUDGET: Total must be under $50/person. Focus on happy hours, free entry, affordable gems.' : ''}

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Find the TOP 3 ${theme} venues in ${city}${country ? `, ${country}` : ''}.

REMEMBER: Only recommend REAL places with REAL reviews and ratings. I will verify these exist.

Return JSON:
{
  "plan": {
    "title": "Catchy title for this ${theme} experience in ${city}",
    "description": "2-3 sentences about this curated experience",
    "planType": "${theme.toLowerCase().replace(/\s+/g, '_')}",
    "activities": [
      {
        "venueName": "Exact real venue name (as it appears on Google Maps)",
        "address": "Full street address",
        "coordinates": { "latitude": XX.XXXX, "longitude": XX.XXXX },
        "openingHours": "HH:MM - HH:MM",
        "startTime": "HH:MM",
        "duration": 90,
        "description": "Brief description of what to expect",
        "order": 1,
        "whyRecommended": "Why this is one of the BEST (ratings, reviews, popularity)",
        "estimatedRating": 4.5,
        "popularitySignals": ["Featured in...", "Known for...", "Award-winning..."]
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
    "aiTags": ["${theme}", "curated", "top-rated"]
  }
}`;

  try {
    const response = await gptRequest([{ role: 'user', content: userPrompt }], {
      systemPrompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const result = parseGPTJSON<{ plan: GroupPlan }>(response);
    return result.plan || null;
  } catch (error) {
    console.error('[AGENT 1] Discovery error:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 2: VENUE VALIDATOR
// Critically examines each venue to confirm it's real and has genuine reviews
// ═══════════════════════════════════════════════════════════════════════════════
async function agent2_validateVenues(
  activities: Activity[],
  city: string,
  country?: string
): Promise<ValidationResult[]> {
  const venueList = activities.map((a, i) =>
    `${i + 1}. "${a.venueName}" at "${a.address}"
    - Claimed rating: ${a.estimatedRating || 'unknown'}
    - Why recommended: ${a.whyRecommended || 'not specified'}
    - Popularity signals: ${a.popularitySignals?.join(', ') || 'none provided'}`
  ).join('\n\n');

  const systemPrompt = `You are a CRITICAL venue validator for ${city}${country ? `, ${country}` : ''}.

YOUR JOB: Determine if each venue is REAL and CREDIBLE.

VALIDATION CRITERIA:
1. Does this venue ACTUALLY EXIST in ${city}? (Based on your knowledge)
2. Is the name accurate (not misspelled or fictional)?
3. Does the address seem correct for this venue?
4. Is this a place that would have real reviews on Google/TripAdvisor/Yelp?
5. Does it match the claimed rating and popularity?

REJECT a venue if:
- The name sounds made up or generic
- You cannot confirm it exists in ${city}
- The address seems wrong or impossible
- It appears to be permanently closed
- The claimed ratings seem fabricated

APPROVE a venue if:
- You recognize it as a real, operating venue
- The name and address seem accurate
- It's a credible recommendation

BE STRICT: It's better to reject a questionable venue than recommend a fake one.

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Validate these ${activities.length} venues in ${city}:

${venueList}

For EACH venue, determine if it's REAL and provide your verdict.

Return JSON:
{
  "validations": [
    {
      "venueName": "Original venue name",
      "isValid": true or false,
      "confidence": "high" | "medium" | "low",
      "reasoning": "Why you approved or rejected this venue",
      "correctedName": "Corrected spelling if needed (optional)",
      "correctedAddress": "Corrected address if you know the real one (optional)"
    }
  ]
}`;

  try {
    const response = await gptRequest([{ role: 'user', content: userPrompt }], {
      systemPrompt,
      temperature: 0.3, // Lower temperature for more consistent validation
      maxTokens: 2048,
      jsonMode: true,
    });

    const result = parseGPTJSON<{ validations: ValidationResult[] }>(response);
    return result.validations || [];
  } catch (error) {
    console.error('[AGENT 2] Validation error:', error);
    // On error, return empty array which will cause all venues to be treated as unvalidated
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE PLACES VERIFICATION
// Verify addresses and get accurate Maps URLs
// ═══════════════════════════════════════════════════════════════════════════════
async function verifyWithGooglePlaces(
  activities: Activity[],
  city: string,
  country?: string
): Promise<Activity[]> {
  const verifiedActivities: Activity[] = [];

  for (const activity of activities) {
    try {
      const verified = await searchVenue(activity.venueName, city, country);

      if (verified && verified.isVerified && verified.confidence !== 'not_found') {
        verifiedActivities.push({
          ...activity,
          venueName: verified.venueName,
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
        console.log(`   ✅ ${activity.venueName} - Address verified (${verified.confidence})`);
      } else {
        // Keep the AI's address but add a search URL
        const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${activity.venueName} ${city}${country ? ` ${country}` : ''}`)}`;
        verifiedActivities.push({
          ...activity,
          googleMapsUrl: searchUrl,
          isAddressVerified: false,
          addressConfidence: 'low'
        });
        console.log(`   ⚠️ ${activity.venueName} - Using search URL (not found in Places API)`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`   ❌ Error verifying ${activity.venueName}:`, error);
      const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${activity.venueName} ${city}${country ? ` ${country}` : ''}`)}`;
      verifiedActivities.push({
        ...activity,
        googleMapsUrl: searchUrl,
        isAddressVerified: false,
        addressConfidence: 'not_found'
      });
    }
  }

  return verifiedActivities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 3: NARRATIVE CREATOR
// Creates immersive descriptions for the validated venues
// ═══════════════════════════════════════════════════════════════════════════════
async function agent3_createNarrative(
  plan: GroupPlan,
  city: string,
  theme: string,
  hasFewerVenues: boolean
): Promise<GroupPlan> {
  const venueCount = plan.activities.length;

  const systemPrompt = `You are an expert travel writer creating immersive, exciting descriptions for a ${theme} experience in ${city}.

${hasFewerVenues ? `NOTE: This plan has ${venueCount} venue(s) instead of 3. Adjust the narrative to make it feel complete and exciting despite having fewer stops.` : ''}

YOUR STYLE:
- Write in second person ("You'll discover...", "As you enter...")
- Be vivid and sensory (sights, sounds, atmosphere)
- Make readers EXCITED to visit
- Each description: 3-4 sentences
- Capture what makes each venue SPECIAL

ALSO CREATE:
- An exciting title that captures the essence of this experience
- A compelling 2-3 sentence overview description

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Create an immersive narrative for this ${theme} experience in ${city}:

Venues:
${plan.activities.map((a, i) => `${i + 1}. ${a.venueName} - ${a.description}`).join('\n')}

Return JSON:
{
  "title": "Exciting, unique title for this ${city} ${theme} experience",
  "description": "Compelling 2-3 sentence overview that makes people want to go",
  "venueDescriptions": [
    {
      "venueName": "Venue name",
      "description": "Immersive 3-4 sentence description"
    }
  ]
}`;

  try {
    const response = await gptRequest([{ role: 'user', content: userPrompt }], {
      systemPrompt,
      temperature: 0.8,
      maxTokens: 2048,
      jsonMode: true,
    });

    const result = parseGPTJSON<{
      title: string;
      description: string;
      venueDescriptions: { venueName: string; description: string }[];
    }>(response);

    // Merge enhanced content
    const enhancedActivities = plan.activities.map(activity => {
      const enhanced = result.venueDescriptions.find(d =>
        d.venueName.toLowerCase() === activity.venueName.toLowerCase()
      );
      return {
        ...activity,
        description: enhanced?.description || activity.description
      };
    });

    return {
      ...plan,
      title: result.title || plan.title,
      description: result.description || plan.description,
      activities: enhancedActivities
    };
  } catch (error) {
    console.error('[AGENT 3] Narrative error:', error);
    return plan;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

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
