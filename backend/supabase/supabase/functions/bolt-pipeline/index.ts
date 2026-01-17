/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Bolt Pipeline - Premium 4-Agent Venue Discovery System
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * This pipeline uses 4 AI agents to ensure only the BEST, REAL venues are recommended:
 *
 * AGENT 1 - VENUE DISCOVERY:
 *   Finds the highest-rated, most popular venues for the theme.
 *   For rooftop: highest views. For nightlife: most popular clubs.
 *   Focuses on places with real reviews and recommendations.
 *
 * AGENT 2 - RELEVANCE VALIDATOR (NEW):
 *   Checks if each venue is actually relevant to the theme.
 *   Filters out inappropriate venues (children's homes, hospitals, etc.)
 *   Ensures venues are actual entertainment spots (bars, restaurants, clubs).
 *   Can REJECT irrelevant venues before Google Places validation.
 *
 * AGENT 3 - ADDRESS VALIDATOR (Google Places):
 *   Uses Google Places API as the SOURCE OF TRUTH for addresses.
 *   If venue found on Google → use Google's verified address.
 *   If venue NOT found → REJECT it.
 *
 * AGENT 4 - NARRATIVE CREATOR:
 *   Only runs for validated venues.
 *   Creates immersive descriptions for the final plan.
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
  "Low Budget": "Find the BEST VALUE spots that locals love. Look for happy hours, free entry venues, and affordable gems with great atmosphere.",
  "Afro House": "Find the BEST afro house and amapiano music venues. Look for clubs hosting afro house nights THIS WEEK, bars known for African electronic music, African restaurants with good vibes, and DJ events featuring afro house artists.",
  "Afro Beats": "Find the BEST afrobeats music venues. Look for clubs hosting afrobeats nights, venues playing Nigerian and West African pop music, parties featuring Burna Boy/Wizkid/Davido style music, and African nightlife with high-energy vibes.",
  "Equestrian": "Find the BEST horse riding experiences. Look for riding schools with lessons, equestrian centers with trail rides, ranch experiences, and horseback adventures for hands-on participation.",
  "Excitement": "Find the MOST THRILLING and fun experiences in the city. Look for amusement parks, fun fairs, circuses, gondola rides, ferris wheels, carnivals, theme parks, water parks, and unique attractions that create unforgettable memories. Prioritize places with the best reviews for excitement and fun.",
  "Activities": "Find 4-5 BEST group activity venues to ensure variety after validation. Look for bowling alleys, paintball arenas, laser tag centers, escape rooms, go-karting tracks, mini golf, trampoline parks, VR arcades, and climbing gyms. ALSO find 2 options for the final spot - scenic venues with views for sundowner drinks OR nice restaurants where the group can eat and celebrate. The final plan will use 2 activities + 1 winding down spot."
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
  "Low Budget": "Budget-friendly experiences under $50 per person total - happy hours with deals, free entry venues, affordable local eats, public spaces with atmosphere, free events and festivals, and wallet-friendly fun without sacrificing quality or experience.",
  "Afro House": "Afro house and amapiano music experiences - nightclubs hosting afro house DJ nights, bars playing African electronic music, African restaurants with vibrant atmosphere, dance parties featuring amapiano and afrobeats, and venues known for the African music scene. Look for events happening THIS WEEK with specific DJ lineups or themed nights.",
  "Afro Beats": "Afrobeats music experiences - clubs and venues playing Nigerian, Ghanaian, and West African pop music. Afrobeats dance nights, parties featuring music in the style of Burna Boy, Wizkid, Davido, Tems, and Rema. High-energy African pop culture vibes, African nightlife spots, and venues known for West African music scenes.",
  "Equestrian": "Hands-on horse riding experiences - riding schools offering lessons for beginners to advanced riders, equestrian centers with scenic trail rides, ranch experiences with horseback adventures, and immersive horse riding activities. For those who want to actually ride horses.",
  "Excitement": "Thrilling daytime and evening experiences that create unforgettable memories. Amusement parks with roller coasters, fun fairs with carnival games and rides, circuses with live performances, gondola rides with scenic views, ferris wheels for panoramic city vistas, theme parks with immersive attractions, water parks for splashing fun, zip lines for adrenaline, and unique city attractions. Perfect for groups wanting excitement, adventure, and Instagram-worthy moments.",
  "Activities": "Interactive group activity experiences - Find 4-5 fun competitive activities like bowling alleys, paintball arenas, laser tag centers, escape rooms, go-karting tracks, mini golf courses, trampoline parks, axe throwing, VR arcades, or climbing walls (to ensure 2 survive validation). PLUS 2 options for final winding down venues - rooftop bars/scenic viewpoints with beautiful views for sundowner drinks, OR nice restaurants where the group can eat, celebrate, and share stories from the activities. The final curated plan will feature 2 activities + 1 winding down spot. The perfect group day out."
};

// Opening hours period structure (from Google Places)
interface OpeningPeriod {
  open: { day: number; time: string }; // day: 0=Sunday, time: "0900"
  close?: { day: number; time: string };
}

// Interfaces
interface Activity {
  venueName: string;
  address: string;
  coordinates: { latitude: number; longitude: number };
  openingHours?: string; // AI suggested hours
  openingHoursText?: string[]; // Google Places human-readable ["Monday: 9:00 AM – 5:00 PM", ...]
  openingHoursPeriods?: OpeningPeriod[]; // Google Places structured data
  businessStatus?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
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

// ValidationResult interface removed - validation now uses Google Places API directly

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
    console.log(`BOLT PIPELINE - 4-AGENT SYSTEM`);
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
    // AGENT 2: RELEVANCE VALIDATOR
    // Checks if venues are actually relevant to the theme
    // Filters out inappropriate venues (children's homes, hospitals, etc.)
    // Ensures venues are actual entertainment spots for the requested theme
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`\n[AGENT 2] 🎯 RELEVANCE VALIDATOR - Checking venue appropriateness...`);

    const relevanceResult = await agent2_validateRelevance(
      discoveredPlan.activities,
      theme,
      finalThemeDefinition,
      city
    );

    if (relevanceResult.approved.length === 0) {
      console.log(`[AGENT 2] ❌ All venues rejected as irrelevant`);
      return jsonResponse({
        success: false,
        error: `None of the discovered venues were appropriate for a ${theme} experience. Please try again.`,
        errorCode: 'NO_RELEVANT_VENUES',
        rejectedVenues: relevanceResult.rejected.map(v => v.name),
        rejectionReasons: relevanceResult.rejected,
        retry: true
      });
    }

    console.log(`[AGENT 2] ✅ ${relevanceResult.approved.length}/${discoveredPlan.activities.length} venues passed relevance check`);
    relevanceResult.approved.forEach((a, i) => {
      console.log(`   ✓ ${a.venueName}`);
    });
    if (relevanceResult.rejected.length > 0) {
      console.log(`   Rejected as irrelevant:`);
      relevanceResult.rejected.forEach(r => {
        console.log(`   ✗ ${r.name}: ${r.reason}`);
      });
    }

    // Use only the approved venues for the next step
    const relevantActivities = relevanceResult.approved;

    // ═══════════════════════════════════════════════════════════════════════
    // AGENT 3: ADDRESS VALIDATOR (Google Places Powered)
    // Uses Google Places API as the SOURCE OF TRUTH for addresses
    // If venue found on Google → use Google's address
    // If venue NOT found → REJECT it
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`\n[AGENT 3] 🔎 ADDRESS VALIDATOR - Verifying venues with Google Places API...`);

    // Get local language name for the city (for address matching)
    console.log(`\n   Getting local language name for ${city}...`);
    const cityNames = await getCityLocalName(city, country);

    const validatedActivities: Activity[] = [];
    const rejectedVenues: { name: string; reason: string }[] = [];

    for (const activity of relevantActivities) {
      console.log(`\n   Checking: ${activity.venueName}`);
      console.log(`   AI provided address: ${activity.address}`);

      try {
        // Search for venue on Google Places - this is the source of truth
        const googleResult = await searchVenue(activity.venueName, city, country);

        if (googleResult && googleResult.isVerified && googleResult.confidence !== 'not_found') {
          // Venue found on Google Places - use Google's verified data

          // CHECK 1: Business status - reject closed venues
          if (googleResult.businessStatus === 'CLOSED_PERMANENTLY') {
            rejectedVenues.push({
              name: activity.venueName,
              reason: 'Permanently closed according to Google Places'
            });
            console.log(`   ❌ REJECTED: ${activity.venueName}`);
            console.log(`   Reason: Venue is PERMANENTLY CLOSED`);
            continue;
          }
          if (googleResult.businessStatus === 'CLOSED_TEMPORARILY') {
            rejectedVenues.push({
              name: activity.venueName,
              reason: 'Temporarily closed according to Google Places'
            });
            console.log(`   ❌ REJECTED: ${activity.venueName}`);
            console.log(`   Reason: Venue is TEMPORARILY CLOSED`);
            continue;
          }

          // CHECK 2: Verify venue is not too far from where AI said it should be
          // This catches cases where Google finds a venue with similar name in a different city
          const aiCoords = activity.coordinates;
          const googleCoords = googleResult.coordinates;
          const distanceKm = calculateDistanceKm(
            aiCoords.latitude, aiCoords.longitude,
            googleCoords.latitude, googleCoords.longitude
          );

          // If Google's location is more than 50km from AI's expected location, reject it
          // This means Google found a different venue with a similar name in another city
          const MAX_DISTANCE_KM = 50;
          if (distanceKm > MAX_DISTANCE_KM) {
            rejectedVenues.push({
              name: activity.venueName,
              reason: `Google found venue ${Math.round(distanceKm)}km away from ${city} - likely a different venue with similar name`
            });
            console.log(`   ❌ REJECTED: ${activity.venueName}`);
            console.log(`   Reason: Google Places found venue ${Math.round(distanceKm)}km away from expected location`);
            console.log(`   AI expected: ${aiCoords.latitude}, ${aiCoords.longitude}`);
            console.log(`   Google found: ${googleCoords.latitude}, ${googleCoords.longitude} (${googleResult.address})`);
            continue;
          }

          // CHECK: Verify city name appears in the Google address (English OR local language)
          const cityCheck = addressContainsCity(googleResult.address, cityNames.english, cityNames.local);
          if (!cityCheck.matches) {
            rejectedVenues.push({
              name: activity.venueName,
              reason: `Address doesn't contain "${cityNames.english}" or "${cityNames.local}" - venue may be in wrong city`
            });
            console.log(`   ❌ REJECTED: ${activity.venueName}`);
            console.log(`   Reason: Google address doesn't contain city name`);
            console.log(`   Looking for: "${cityNames.english}" (English) or "${cityNames.local}" (Local)`);
            console.log(`   Google address: ${googleResult.address}`);
            continue;
          }
          console.log(`   ✓ City name match: "${cityCheck.matchedName}" found in address`);

          const addressMatches = activity.address.toLowerCase().includes(
            googleResult.address.split(',')[0].toLowerCase()
          );

          if (!addressMatches) {
            console.log(`   ⚠️ Street address mismatch (using Google's verified address)`);
          }

          validatedActivities.push({
            ...activity,
            venueName: googleResult.venueName, // Use Google's official name
            address: googleResult.address,      // Use Google's verified address
            coordinates: {
              latitude: googleResult.coordinates.latitude,
              longitude: googleResult.coordinates.longitude
            },
            googlePlaceId: googleResult.googlePlaceId,
            googleMapsUrl: googleResult.googleMapsUrl,
            openingHoursText: googleResult.openingHours, // Human-readable hours
            openingHoursPeriods: googleResult.openingHoursPeriods, // Structured hours
            businessStatus: googleResult.businessStatus,
            isAddressVerified: true,
            addressConfidence: googleResult.confidence,
            isValidated: true,
            validationNotes: `Verified on Google Places (${googleResult.confidence} confidence)${googleResult.rating ? `, Rating: ${googleResult.rating}` : ''}`
          });

          console.log(`   ✅ VERIFIED: ${googleResult.venueName}`);
          console.log(`   📍 Address: ${googleResult.address}`);
          console.log(`   📏 Distance from expected: ${Math.round(distanceKm * 10) / 10}km (max ${MAX_DISTANCE_KM}km)`);
          console.log(`   ⭐ Confidence: ${googleResult.confidence}`);
          console.log(`   🏪 Business status: ${googleResult.businessStatus || 'Unknown'}`);
          if (googleResult.openingHours && googleResult.openingHours.length > 0) {
            console.log(`   🕐 Opening hours: ${googleResult.openingHours[0]} (+ ${googleResult.openingHours.length - 1} more days)`);
          } else {
            console.log(`   🕐 Opening hours: Not available`);
          }

        } else {
          // Venue NOT found on Google Places - REJECT it
          rejectedVenues.push({
            name: activity.venueName,
            reason: 'Not found on Google Places - venue may not exist or name is incorrect'
          });
          console.log(`   ❌ REJECTED: ${activity.venueName}`);
          console.log(`   Reason: Not found on Google Places`);
        }

        // Small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 150));

      } catch (error) {
        console.error(`   ❌ Error validating ${activity.venueName}:`, error);
        rejectedVenues.push({
          name: activity.venueName,
          reason: 'Google Places API error'
        });
      }
    }

    // Check if we have at least 1 valid venue
    if (validatedActivities.length < 1) {
      console.log(`\n[AGENT 3] ❌ No venues verified`);
      return jsonResponse({
        success: false,
        error: `We couldn't verify any ${theme} venues in ${city}. None of the ${relevantActivities.length} relevant venues were found on Google Maps. Please try again.`,
        errorCode: 'INSUFFICIENT_VENUES',
        rejectedVenues: rejectedVenues.map(v => v.name),
        rejectionReasons: rejectedVenues,
        validatedCount: validatedActivities.length,
        minimumRequired: 1,
        retry: true
      });
    }

    console.log(`\n[AGENT 3] ✅ ${validatedActivities.length}/${relevantActivities.length} venues verified on Google Places`);

    // ═══════════════════════════════════════════════════════════════════════
    // AGENT 3.5: TIMING ADJUSTER
    // Adjusts start times to fit actual opening hours
    // Reorders venues chronologically based on adjusted times
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`\n[AGENT 3.5] 🕐 TIMING ADJUSTER - Adjusting times to fit opening hours...`);
    const scheduledActivities = await agent35_optimizeSchedule(
      validatedActivities,
      theme,
      city
    );

    // ═══════════════════════════════════════════════════════════════════════
    // AGENT 4: NARRATIVE CREATOR - Create immersive descriptions
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`\n[AGENT 4] ✍️ NARRATIVE CREATOR - Crafting descriptions...`);
    const finalPlan = await agent4_createNarrative(
      { ...discoveredPlan, activities: scheduledActivities },
      city,
      theme,
      scheduledActivities.length < 3
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
      rejectedVenueNames: rejectedVenues.map(v => v.name).join(', ') || null,
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
        rejectedVenues: rejectedVenues.length > 0 ? rejectedVenues.map(v => v.name) : undefined
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
  const isActivities = theme === 'Activities';
  const isExcitement = theme === 'Excitement';
  const venueCount = (isActivities || isExcitement) ? 7 : 3; // Request more venues for Activities/Excitement to survive validation

  const systemPrompt = `You are an expert local guide for ${city}${country ? `, ${country}` : ''} with deep knowledge of the BEST venues.

YOUR MISSION: Find the TOP ${venueCount} most CREDIBLE, REAL, and HIGHLY-RATED venues for a "${theme}" experience.${isActivities ? `

SPECIAL FOR ACTIVITIES THEME:
- Find 4-5 fun competitive ACTIVITY venues (bowling, laser tag, escape rooms, go-karting, VR arcades, etc.)
- PLUS 1-2 winding down spots (rooftop bars, scenic restaurants, or nice places to eat)
- This ensures enough venues survive validation for a final plan of 2 activities + 1 dining/drinks spot` : ''}${isExcitement ? `

SPECIAL FOR EXCITEMENT THEME:
- Find 4-5 THRILLING excitement venues (amusement parks, fun fairs, ferris wheels, gondola rides, theme parks, water parks, carnivals, circuses, zip lines, etc.)
- PLUS 2 winding down spots (rooftop bars, scenic restaurants, or nice places to relax with views and drinks)
- This ensures enough venues survive validation for a final plan of 2-3 excitement spots + 1 dining/drinks spot` : ''}

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

CRITICAL - CITY LOCATION REQUIREMENTS:
⚠️ ALL venues MUST be physically located WITHIN ${city} city limits.
- Do NOT suggest venues in neighboring cities, suburbs, or other towns
- Do NOT suggest venues that are "near" ${city} but technically in a different city
- The venue's address MUST include "${city}" (in English OR local language) or be within the ${city} metropolitan area
- If you're unsure whether a venue is in ${city}, DO NOT include it
- Example: If searching for "${city}", don't suggest venues in surrounding towns

LOCAL LANGUAGE AWARENESS:
- Be aware that city names may appear differently in local languages
- Example: "Moscow" may appear as "Москва" in addresses
- Example: "Tokyo" may appear as "東京" in addresses
- Ensure the venue is genuinely in ${city}, not a similarly-named place elsewhere
- Provide accurate coordinates for the venue's ACTUAL location in ${city}

FOR EACH VENUE, EXPLAIN:
- WHY you're recommending it (ratings, popularity, unique features)
- What makes it the BEST for this theme
- Popularity signals (famous for, featured in, known for)

PROXIMITY REQUIREMENTS:
- All ${venueCount} venues MUST be within 15 MINUTES WALKING DISTANCE of each other
- Choose venues in the SAME neighborhood or entertainment district within ${city}
- If walking distance isn't possible, max 30 minutes by car WITHIN ${city}
- Prioritize walkable areas with multiple venue options

OPENING HOURS:
- Verify venues are OPEN at the suggested times
- Nightclubs: typically 22:00-04:00
- Restaurants: typically 11:00-23:00
- Bars: typically 17:00-02:00
- Brunch: typically 09:00-15:00

${isLowBudget ? 'BUDGET: Total must be under $50/person. Focus on happy hours, free entry, affordable gems.' : ''}

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Find the TOP ${venueCount} ${theme} venues in ${city}${country ? `, ${country}` : ''}.

REMEMBER: Only recommend REAL places with REAL reviews and ratings. I will verify these exist.${isActivities ? `

FOR ACTIVITIES THEME - YOU MUST INCLUDE:
1. First 4-5 venues: Fun competitive ACTIVITIES (bowling, escape rooms, laser tag, go-karting, VR arcades, paintball, mini golf, trampoline parks, etc.)
2. Last 1-2 venues: WINDING DOWN spots - either a nice RESTAURANT for dinner OR a BAR/ROOFTOP with views for sundowner drinks

⚠️ The last venue(s) MUST be a restaurant or bar - NOT another activity!` : ''}${isExcitement ? `

FOR EXCITEMENT THEME - YOU MUST INCLUDE:
1. First 4-5 venues: THRILLING experiences (amusement parks, fun fairs, ferris wheels, gondola rides, theme parks, water parks, carnivals, circuses, zip lines, unique attractions, etc.)
2. Last 2 venues: WINDING DOWN spots - either a nice RESTAURANT for dinner OR a BAR/ROOFTOP with scenic views for sundowner drinks

⚠️ The last 2 venues MUST be restaurants or bars with views - NOT more excitement venues!` : ''}

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
// AGENT 2: RELEVANCE VALIDATOR
// Checks if venues are actually appropriate for the theme
// Filters out irrelevant places (children's homes, hospitals, offices, etc.)
// ═══════════════════════════════════════════════════════════════════════════════
interface RelevanceResult {
  approved: Activity[];
  rejected: { name: string; reason: string }[];
}

async function agent2_validateRelevance(
  activities: Activity[],
  theme: string,
  themeDefinition: string,
  city: string
): Promise<RelevanceResult> {
  const venueList = activities.map((a, i) => ({
    index: i,
    name: a.venueName,
    description: a.description,
    whyRecommended: a.whyRecommended
  }));

  const systemPrompt = `You are a strict venue relevance validator. Your job is to check if venues are ACTUALLY appropriate for a "${theme}" experience.

THEME DEFINITION:
${themeDefinition}

WHAT COUNTS AS RELEVANT for "${theme}":
- Bars, restaurants, clubs, lounges, rooftop venues
- Entertainment venues (comedy clubs, music venues, theaters)
- Cafes, breweries, wine bars, cocktail bars
- Hotels with public bars/restaurants/rooftops
- Event spaces, galleries, cultural centers (for art/culture themes)
- Beach clubs, waterfront venues (for beach themes)

WHAT IS NOT RELEVANT (REJECT THESE):
- Children's homes, orphanages, daycare centers
- Hospitals, clinics, medical facilities
- Schools, universities (unless they have a public venue)
- Office buildings, corporate headquarters
- Residential buildings, apartments
- Government buildings
- Religious institutions (unless specifically a cultural venue)
- Gyms, fitness centers (unless for adventure theme)
- Retail stores (unless they have a bar/restaurant)
- Places that are clearly NOT entertainment venues

PERMANENTLY CLOSED OR NAME CHANGED VENUES:
- If you know a venue is PERMANENTLY CLOSED, REJECT it with reason "Permanently closed"
- If a venue has CHANGED ITS NAME, APPROVE it but provide the CORRECT CURRENT NAME in "correctedName"
- If a venue has been replaced by a different business at the same location, REJECT it
- Use your knowledge of venues in ${city} to identify closures and name changes

ALSO REJECT if the venue doesn't match the THEME:
- For "Rooftop" theme: reject venues that are NOT elevated/rooftop locations
- For "Nightlife" theme: reject venues that are NOT open late or for dancing/drinking
- For "Jazz" theme: reject venues that don't feature jazz music
- etc.

DUPLICATE VENUE DETECTION:
- If two or more venues have SIMILAR NAMES (same venue, slight spelling variations, or same establishment), REJECT the SECOND one
- Examples of duplicates: "Sky Lounge" and "The Sky Lounge", "Bar XYZ" and "XYZ Bar", "Café Roma" and "Cafe Roma"
- Keep the FIRST occurrence, reject subsequent duplicates with reason "Duplicate venue - similar to [first venue name]"
- This ensures variety in the plan

CITY NAME AS VENUE:
- If a venue name is EXACTLY the same as the city name "${city}", REJECT it
- The city itself is not a valid venue
- Examples: Searching in "Paris" and venue is "Paris" → REJECT
- Examples: Searching in "Nairobi" and venue is "Nairobi" → REJECT
- Reject with reason "Venue name matches city name - not a valid venue"

Be STRICT. If a venue sounds suspicious or inappropriate, REJECT it.

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Review these venues for a "${theme}" experience in ${city}:

${venueList.map(v => `${v.index + 1}. ${v.name}
   Description: ${v.description || 'No description'}
   Why recommended: ${v.whyRecommended || 'No reason'}`).join('\n\n')}

For EACH venue, decide:
- APPROVE if it's a legitimate entertainment venue appropriate for "${theme}"
- REJECT if it's inappropriate, irrelevant, permanently closed, or doesn't match the theme
- REJECT if it's a DUPLICATE (similar name to a previous venue) - keep the first, reject the second
- REJECT if the venue name exactly matches the city name "${city}"
- If the venue has changed its name, APPROVE but include the correctedName

Return JSON:
{
  "decisions": [
    {
      "index": 0,
      "venueName": "Venue Name",
      "approved": true,
      "reason": "Why approved or rejected",
      "correctedName": "New Name (only if venue renamed, otherwise omit)"
    }
  ]
}`;

  try {
    const response = await gptRequest([{ role: 'user', content: userPrompt }], {
      systemPrompt,
      temperature: 0.3, // Low temperature for consistent decisions
      maxTokens: 2048,
      jsonMode: true,
    });

    const result = parseGPTJSON<{
      decisions: Array<{
        index: number;
        venueName: string;
        approved: boolean;
        reason: string;
        correctedName?: string;
      }>;
    }>(response);

    const approved: Activity[] = [];
    const rejected: { name: string; reason: string }[] = [];

    for (const decision of result.decisions) {
      const activity = activities[decision.index];
      if (!activity) continue;

      if (decision.approved) {
        // Apply corrected name if venue was renamed
        if (decision.correctedName) {
          console.log(`   📝 Name correction: "${activity.venueName}" → "${decision.correctedName}"`);
          approved.push({
            ...activity,
            venueName: decision.correctedName
          });
        } else {
          approved.push(activity);
        }
      } else {
        rejected.push({
          name: decision.venueName || activity.venueName,
          reason: decision.reason || 'Not relevant to theme'
        });
      }
    }

    return { approved, rejected };

  } catch (error) {
    console.error('[AGENT 2] Relevance validation error:', error);
    // On error, pass all venues through (fail open)
    return { approved: activities, rejected: [] };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 3.5: TIMING ADJUSTER
// Adjusts start times to fit actual Google Places opening hours
// Can reorder venues chronologically based on the adjusted times
// ═══════════════════════════════════════════════════════════════════════════════
async function agent35_optimizeSchedule(
  activities: Activity[],
  theme: string,
  city: string
): Promise<Activity[]> {
  // Build venue info with opening hours for the AI
  const venueInfo = activities.map((a, i) => {
    let hoursInfo = 'Opening hours: Not available';
    if (a.openingHoursText && a.openingHoursText.length > 0) {
      hoursInfo = `Opening hours:\n${a.openingHoursText.map(h => `      ${h}`).join('\n')}`;
    }
    return `Venue #${i + 1}: ${a.venueName}
   Current suggested time: ${a.startTime}
   Duration: ${a.duration} minutes
   ${hoursInfo}`;
  }).join('\n\n');

  const systemPrompt = `You are a timing specialist for ${city} entertainment plans.
Your job is to ADJUST the start times of venues to fit their ACTUAL opening hours.

THEME: "${theme}"

YOUR TASKS:
1. Adjust start times so each venue is visited during its ACTUAL opening hours
2. If needed, REORDER venues to create a logical chronological flow based on the adjusted times
3. The final order should follow the timeline (earliest start time first)

RULES:
1. Every venue MUST be visited during its ACTUAL opening hours from Google Places
2. If a venue's opening hours are not available, use reasonable defaults:
   - Nightlife/Clubs: 22:00 - 04:00
   - Restaurants: 11:00 - 23:00
   - Bars: 17:00 - 02:00
   - Brunch spots: 09:00 - 15:00
   - Rooftop bars: 17:00 - 01:00
3. Ensure there's 15-30 minutes travel time between venues
4. The overall timing should make sense for a "${theme}" experience
5. After setting times, ORDER the venues chronologically (earliest to latest)

THEME-SPECIFIC START TIMES:
- "Nightlife" → Evening/night start (19:00-22:00)
- "Brunch" → Morning start (09:00-11:00)
- "Date Night" → Evening start (18:00-20:00)
- "Bar Hopping" → Evening start (18:00-21:00)
- "Rooftop" → Late afternoon/sunset (17:00-19:00)
- "Jazz" → Evening start (19:00-21:00)

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Adjust the timing for these ${activities.length} venues for a "${theme}" experience in ${city}.

${venueInfo}

INSTRUCTIONS:
1. For each venue, check if the current start time falls within the opening hours
2. If NOT, adjust the start time to when the venue IS open
3. After adjusting times, REORDER the venues chronologically (earliest time first)
4. Make sure the overall plan flows logically with travel time between venues

Return JSON:
{
  "adjustedTimes": [
    {
      "venueIndex": 0,
      "venueName": "Venue Name",
      "originalTime": "HH:MM",
      "adjustedTime": "HH:MM",
      "newOrder": 1,
      "reason": "Why this time (e.g., 'Opens at 18:00, adjusted from 16:00' or 'Within opening hours, no change')"
    }
  ],
  "planStartTime": "HH:MM",
  "planEndTime": "HH:MM",
  "timingNotes": "Brief explanation of the timing adjustments and any reordering"
}`;

  try {
    const response = await gptRequest([{ role: 'user', content: userPrompt }], {
      systemPrompt,
      temperature: 0.3,
      maxTokens: 2048,
      jsonMode: true,
    });

    const result = parseGPTJSON<{
      adjustedTimes: Array<{
        venueIndex: number;
        venueName: string;
        originalTime: string;
        adjustedTime: string;
        newOrder: number;
        reason: string;
      }>;
      planStartTime?: string;
      planEndTime?: string;
      timingNotes?: string;
    }>(response);

    if (result.timingNotes) {
      console.log(`   📋 Timing notes: ${result.timingNotes}`);
    }
    if (result.planStartTime && result.planEndTime) {
      console.log(`   ⏰ Plan window: ${result.planStartTime} - ${result.planEndTime}`);
    }

    // Sort by newOrder to get chronological sequence
    const sortedAdjustments = [...result.adjustedTimes].sort((a, b) => (a.newOrder || 0) - (b.newOrder || 0));

    // Apply adjusted times and reorder activities
    const optimizedActivities: Activity[] = sortedAdjustments.map((adjustment, newIndex) => {
      const originalActivity = activities[adjustment.venueIndex];

      if (!originalActivity) {
        console.error(`   ⚠️ Invalid venue index: ${adjustment.venueIndex}`);
        return activities[newIndex] || activities[0];
      }

      const timeChanged = adjustment.originalTime !== adjustment.adjustedTime;
      const orderChanged = adjustment.venueIndex !== newIndex;

      if (timeChanged || orderChanged) {
        const changes = [];
        if (timeChanged) changes.push(`${adjustment.originalTime} → ${adjustment.adjustedTime}`);
        if (orderChanged) changes.push(`moved to #${newIndex + 1}`);
        console.log(`   🔄 ${adjustment.venueName}: ${changes.join(', ')}`);
        console.log(`      ${adjustment.reason}`);
      } else {
        console.log(`   ✓ ${adjustment.venueName}: ${adjustment.adjustedTime} (no change needed)`);
      }

      return {
        ...originalActivity,
        startTime: adjustment.adjustedTime,
        order: newIndex + 1
      };
    });

    console.log(`\n[AGENT 3.5] ✅ Timing adjusted for ${optimizedActivities.length} venues`);
    return optimizedActivities;

  } catch (error) {
    console.error('[AGENT 3.5] Timing adjustment error:', error);
    // On error, return original activities unchanged
    console.log('[AGENT 3.5] ⚠️ Using original timing');
    return activities;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 4: NARRATIVE CREATOR
// Creates immersive descriptions for the validated venues
// ═══════════════════════════════════════════════════════════════════════════════
async function agent4_createNarrative(
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
- Each VENUE description: ONE sentence only (punchy, captivating)
- Capture the essence of each venue in that single sentence

ALSO CREATE:
- An exciting title that captures the essence of this experience
- A compelling 2-3 sentence overview description (this can be longer)

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
      "description": "One captivating sentence about this venue"
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
    console.error('[AGENT 4] Narrative error:', error);
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

/**
 * Get the local language name of a city
 * Returns both English and local names for matching
 */
async function getCityLocalName(city: string, country: string): Promise<{ english: string; local: string }> {
  try {
    const response = await gptRequest([{
      role: 'user',
      content: `What is the local language name for the city "${city}" in ${country || 'its country'}?

Return ONLY a JSON object with no explanation:
{
  "english": "${city}",
  "local": "local language name here",
  "alternates": ["other common spellings or names"]
}

Examples:
- Moscow, Russia → {"english": "Moscow", "local": "Москва", "alternates": ["Moskva"]}
- Tokyo, Japan → {"english": "Tokyo", "local": "東京", "alternates": ["Tōkyō"]}
- Paris, France → {"english": "Paris", "local": "Paris", "alternates": []}
- Munich, Germany → {"english": "Munich", "local": "München", "alternates": ["Muenchen"]}
- Nairobi, Kenya → {"english": "Nairobi", "local": "Nairobi", "alternates": []}
- Cairo, Egypt → {"english": "Cairo", "local": "القاهرة", "alternates": ["Al-Qahira"]}
`
    }], {
      systemPrompt: 'You are a geography expert. Return only valid JSON, no other text.',
      temperature: 0.1,
      maxTokens: 200,
      jsonMode: true,
    });

    const result = parseGPTJSON<{ english: string; local: string; alternates?: string[] }>(response);
    console.log(`   🌍 City names: English="${result.english}", Local="${result.local}"${result.alternates?.length ? `, Alternates=[${result.alternates.join(', ')}]` : ''}`);
    return {
      english: result.english || city,
      local: result.local || city,
    };
  } catch (error) {
    console.error('   ⚠️ Failed to get local city name, using English only:', error);
    return { english: city, local: city };
  }
}

/**
 * Check if an address contains the city name (in English or local language)
 */
function addressContainsCity(
  address: string,
  cityEnglish: string,
  cityLocal: string
): { matches: boolean; matchedName: string | null } {
  const addressLower = address.toLowerCase();
  const englishLower = cityEnglish.toLowerCase();
  const localLower = cityLocal.toLowerCase();

  // Check English name
  if (addressLower.includes(englishLower) || addressLower.includes(englishLower.replace(/\s+/g, ''))) {
    return { matches: true, matchedName: cityEnglish };
  }

  // Check local name (if different from English)
  if (cityLocal !== cityEnglish) {
    if (addressLower.includes(localLower) || address.includes(cityLocal)) {
      return { matches: true, matchedName: cityLocal };
    }
  }

  return { matches: false, matchedName: null };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistanceKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
