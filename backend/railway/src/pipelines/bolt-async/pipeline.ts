/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Bolt Pipeline V2 - Model-Optimised (gpt-5.1 + gpt-4.1-mini split)
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Model split vs v1 (all gpt-4o):
 *   Agent 1 (Discovery)    → gpt-5.1      better venue knowledge, cheaper input
 *   Agent 2 pre-filter     → pure function  city-name + duplicate checks
 *   Agent 2 (Relevance)    → gpt-4.1-mini theme relevance + inappropriate venues only
 *   getCityLocalName       → REMOVED       coordinate distance check is sufficient
 *   Agent 3.5 (Timing)     → pure function Google Places structured hours
 *   Agent 4 (Narrative)    → gpt-5.1      user-facing copy, quality matters
 *
 * Net: 3 GPT calls per run (was 5). ~50% cost reduction vs v1.
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

// ════════════════════════════════════════════════════════════════════════════
// Railway port of bolt-pipeline-v2 (formerly Supabase Edge Function).
// Exported as runBoltPipeline(input) — returns the same response payload that
// the Supabase function used to return directly to iOS. Database writes go
// through db.ts helpers using SUPABASE_SERVICE_KEY.
// ════════════════════════════════════════════════════════════════════════════

import { gptRequest, parseGPTJSON } from './gpt-client';
import { searchVenue, VerifiedVenue } from './google-places';
import { insertRow } from './db';

// Theme-specific optimization hints for Agent 1
const THEME_OPTIMIZATION: Record<string, string> = {
  "Rooftop": "Find venues that are SPECIFICALLY rooftop bars, sky lounges, rooftop terraces, or elevated outdoor bars — NOT generic hotels or ground-floor restaurants. The venue must be known primarily as a rooftop experience. Look for places with 'rooftop', 'sky', 'terrace', or 'heights' in their name or explicitly described as rooftop bars in reviews. Prioritize venues featured in 'best rooftop bars' lists with high elevations and panoramic city views.",
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
  "Activities": "Find 4-5 BEST group activity venues to ensure variety after validation. Look for bowling alleys, paintball arenas, laser tag centers, escape rooms, go-karting tracks, mini golf, axe throwing, trampoline parks, VR arcades, and climbing gyms. ALSO find 2 options for the final spot - scenic venues with views for sundowner drinks OR nice restaurants where the group can eat and celebrate. The final plan will use 2 activities + 1 winding down spot."
  // "Ultimate Friday": "Find the HOTTEST event happening THIS COMING FRIDAY in the city. Search for: concerts, DJ nights, album launch parties, club events, live performances, themed parties, festival events, comedy shows, or special Friday night events. The MAIN EVENT should be a specific ticketed or promoted event happening THIS FRIDAY with a known lineup, artist, or theme. Then find 1 pregame spot (bar/lounge for drinks before) and 1 after-party spot (late-night venue for after). Include the specific date in recommendations.",
  // "Ultimate Saturday": "Find the BEST event happening THIS COMING SATURDAY in the city. Search for: day parties, pool parties, brunch events, concerts, festivals, sports viewing parties, DJ events, live shows, art exhibitions, food festivals, or special Saturday events. Since it's Saturday, plan for a FULL DAY experience - if the main event is at night, include daytime activities or an earlier pregame starting midday. The MAIN EVENT should be a specific promoted event happening THIS SATURDAY. Find 1-2 pregame spots and 1 after-party/wind-down spot. Include the specific date in recommendations."
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
  // "Ultimate Friday": "The ultimate Friday night experience built around a SPECIFIC EVENT happening THIS COMING FRIDAY. Structure: 1) PREGAME (18:00-20:00) - A trendy bar, rooftop, or lounge for pre-event drinks and catching up with friends. 2) MAIN EVENT (21:00-00:00) - The headline attraction: a concert, DJ set, comedy show, album launch, themed party, or special club night ACTUALLY HAPPENING this Friday. This should be a real, promoted event with specific artists, DJs, or themes. 3) AFTER-PARTY (00:00-03:00) - A late-night venue to keep the energy going: club, speakeasy, or 24-hour spot. The plan title MUST include the date (e.g., '24th Jan Ultimate Friday: [Event Name]'). Focus on what's actually happening in the city this Friday.",
  // "Ultimate Saturday": "The ultimate Saturday experience built around a SPECIFIC EVENT happening THIS COMING SATURDAY. Since Saturdays allow for full-day plans, structure depends on the main event timing: FOR NIGHT EVENTS: 1) DAYTIME ACTIVITY (12:00-15:00) - Brunch, day drinking, pool party, or chill activity to start the day. 2) PREGAME (17:00-20:00) - Rooftop sundowners, happy hour, or dinner to build energy. 3) MAIN EVENT (21:00+) - The headline: concert, club night, festival, DJ event happening THIS Saturday. 4) WIND-DOWN - Late-night food or chill spot. FOR DAY EVENTS: 1) BRUNCH START (11:00-13:00) - Energizing brunch spot. 2) MAIN EVENT - Day party, festival, sports event, art exhibition happening this Saturday. 3) EVENING WIND-DOWN - Dinner or drinks to recap the day. The plan title MUST include the date (e.g., '25th Jan Ultimate Saturday: [Event Name]'). Prioritize real, promoted events over generic venue suggestions."
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
  estimatedCostPerPerson?: { min: number; max: number }; // entry + avg spend in plan currency
  // Category for Activities/Excitement/Ultimate themes
  category?: 'activity' | 'winddown' | 'pregame' | 'main_event' | 'afterparty';
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

export interface BoltPipelineInput {
  city: string;
  country?: string;
  theme: string;
  themeDefinition?: string;
  userId?: string;
}

// Return shape matches the JSON body the old Supabase function returned
export interface BoltPipelineResult {
  success: boolean;
  data?: unknown;
  error?: string;
  errorCode?: string;
  venueCount?: number;
  rejectedVenues?: string[];
  rejectionReasons?: { name: string; reason: string }[];
  retry?: boolean;
}

export async function runBoltPipeline(input: BoltPipelineInput): Promise<BoltPipelineResult> {
  const { city, theme, themeDefinition, userId = 'anonymous' } = input;
  const country = input.country ?? '';

  if (!city || !theme) {
    return { success: false, error: 'City and theme are required', errorCode: 'MISSING_FIELDS' };
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`BOLT PIPELINE - 4-AGENT SYSTEM (Railway)`);
  console.log(`Theme: ${theme.toUpperCase()} | City: ${city}, ${country || 'Unknown'}`);
  console.log(`User: ${userId}`);
  console.log(`${'═'.repeat(70)}\n`);

  try {
    const startTime = Date.now();

    // Get theme definition and optimization hints
    const finalThemeDefinition = themeDefinition || THEME_DEFINITIONS[theme] || theme;
    const optimizationHint = THEME_OPTIMIZATION[theme] || "Find the BEST and most POPULAR venues for this experience.";
    const currency = getCurrencyForCountry(country);

    let discoveredPlan: GroupPlan | null = null;
    const validatedActivities: Activity[] = [];
    const rejectedVenues: { name: string; reason: string }[] = [];
    let deduplicatedActivities: Activity[] = [];

      // ─── AGENT 1: VENUE DISCOVERY ────────────────────────────────────────
      console.log(`\n[AGENT 1] 🔍 VENUE DISCOVERY - Finding the best ${theme} spots...`);
      discoveredPlan = await agent1_discoverVenues(city, country, theme, finalThemeDefinition, optimizationHint, currency);

      if (!discoveredPlan || discoveredPlan.activities.length === 0) {
        console.log(`[AGENT 1] ❌ Failed to discover venues`);
        return {
          success: false,
          error: `We couldn't find suitable ${theme} venues in ${city}. Please try a different vibe or city.`,
          errorCode: 'NO_VENUES_DISCOVERED',
          retry: true,
        };
      }

      console.log(`[AGENT 1] ✅ Discovered ${discoveredPlan.activities.length} potential venues`);
      discoveredPlan.activities.forEach((a, i) => {
        console.log(`   ${i + 1}. ${a.venueName} - ${a.whyRecommended || 'No reason provided'}`);
      });

      // ─── PRE-FILTER ───────────────────────────────────────────────────────
      const prefiltered = prefilterVenues(discoveredPlan.activities, city, theme);
      console.log(`\n[PRE-FILTER] ${prefiltered.kept.length}/${discoveredPlan.activities.length} venues passed pre-filter`);
      if (prefiltered.rejected.length > 0) {
        prefiltered.rejected.forEach(r => console.log(`   ✗ ${r.name}: ${r.reason}`));
      }

      // ─── AGENT 2: RELEVANCE VALIDATOR ────────────────────────────────────
      console.log(`\n[AGENT 2] 🎯 RELEVANCE VALIDATOR - Checking venue appropriateness...`);
      const relevanceResult = await agent2_validateRelevance(
        prefiltered.kept,
        theme,
        finalThemeDefinition,
        city
      );

      if (relevanceResult.approved.length === 0) {
        console.log(`[AGENT 2] ❌ All venues rejected as irrelevant`);
        return {
          success: false,
          error: `None of the discovered venues were appropriate for a ${theme} experience. Please try again.`,
          errorCode: 'NO_RELEVANT_VENUES',
          rejectedVenues: relevanceResult.rejected.map(v => v.name),
          rejectionReasons: relevanceResult.rejected,
          retry: true,
        };
      }

      console.log(`[AGENT 2] ✅ ${relevanceResult.approved.length}/${discoveredPlan.activities.length} venues passed relevance check`);
      relevanceResult.approved.forEach(a => console.log(`   ✓ ${a.venueName}`));
      if (relevanceResult.rejected.length > 0) {
        console.log(`   Rejected as irrelevant:`);
        relevanceResult.rejected.forEach(r => console.log(`   ✗ ${r.name}: ${r.reason}`));
      }

      const relevantActivities = relevanceResult.approved;

      // ─── AGENT 3: GOOGLE PLACES VALIDATOR ────────────────────────────────
      console.log(`\n[AGENT 3] 🔎 ADDRESS VALIDATOR - Verifying venues with Google Places API...`);

      for (const activity of relevantActivities) {
        console.log(`\n   Checking: ${activity.venueName}`);
        console.log(`   AI provided address: ${activity.address}`);

        try {
          const googleResult = await searchVenue(activity.venueName, city, country);

          if (googleResult && googleResult.isVerified && googleResult.confidence !== 'not_found') {
            // CHECK 1: Business status
            if (googleResult.businessStatus === 'CLOSED_PERMANENTLY') {
              rejectedVenues.push({ name: activity.venueName, reason: 'Permanently closed according to Google Places' });
              console.log(`   ❌ REJECTED: ${activity.venueName} — PERMANENTLY CLOSED`);
              continue;
            }
            if (googleResult.businessStatus === 'CLOSED_TEMPORARILY') {
              rejectedVenues.push({ name: activity.venueName, reason: 'Temporarily closed according to Google Places' });
              console.log(`   ❌ REJECTED: ${activity.venueName} — TEMPORARILY CLOSED`);
              continue;
            }

            // CHECK 2: Rating + review count
            const hasRating = googleResult.rating !== undefined && googleResult.rating !== null;
            const hasReviews = googleResult.reviewCount !== undefined && googleResult.reviewCount !== null;
            if (hasReviews && googleResult.reviewCount! < 20) {
              rejectedVenues.push({ name: activity.venueName, reason: `Too few reviews: only ${googleResult.reviewCount} on Google (minimum 20 required)` });
              console.log(`   ❌ REJECTED: ${activity.venueName} — only ${googleResult.reviewCount} reviews`);
              continue;
            }
            if (hasRating && googleResult.rating! < 3.5) {
              rejectedVenues.push({ name: activity.venueName, reason: `Low rating: ${googleResult.rating}★ on Google (minimum 3.5★ required)` });
              console.log(`   ❌ REJECTED: ${activity.venueName} — ${googleResult.rating}★`);
              continue;
            }
            if (hasRating || hasReviews) {
              console.log(`   ⭐ Quality check passed: ${hasRating ? `${googleResult.rating}★` : 'no rating'} · ${hasReviews ? `${googleResult.reviewCount} reviews` : 'no review count'}`);
            } else {
              console.log(`   ⭐ Quality check skipped: no rating/review data on Google`);
            }

            // CHECK 3: Distance — catch wrong-city matches
            const aiCoords = activity.coordinates;
            const googleCoords = googleResult.coordinates;
            const hasValidAiCoords = aiCoords &&
              aiCoords.latitude !== 0 && aiCoords.longitude !== 0 &&
              Math.abs(aiCoords.latitude) <= 90 && Math.abs(aiCoords.longitude) <= 180;

            if (hasValidAiCoords) {
              const distanceKm = calculateDistanceKm(
                aiCoords.latitude, aiCoords.longitude,
                googleCoords.latitude, googleCoords.longitude
              );
              const MAX_DISTANCE_KM = 50;
              if (distanceKm > MAX_DISTANCE_KM) {
                rejectedVenues.push({ name: activity.venueName, reason: `Google found venue ${Math.round(distanceKm)}km away from ${city} - likely a different venue with similar name` });
                console.log(`   ❌ REJECTED: ${activity.venueName} — ${Math.round(distanceKm)}km from expected location`);
                continue;
              }
              console.log(`   📏 Distance from expected: ${Math.round(distanceKm * 10) / 10}km`);
            } else {
              console.log(`   ⚠️ AI coordinates invalid/missing - skipping distance check`);
            }

            const addressMatches = activity.address.toLowerCase().includes(
              googleResult.address.split(',')[0].toLowerCase()
            );
            if (!addressMatches) console.log(`   ⚠️ Street address mismatch (using Google's verified address)`);

            validatedActivities.push({
              ...activity,
              venueName: googleResult.venueName,
              address: googleResult.address,
              coordinates: { latitude: googleResult.coordinates.latitude, longitude: googleResult.coordinates.longitude },
              googlePlaceId: googleResult.googlePlaceId,
              googleMapsUrl: googleResult.googleMapsUrl,
              openingHoursText: googleResult.openingHours,
              openingHoursPeriods: googleResult.openingHoursPeriods,
              businessStatus: googleResult.businessStatus,
              isAddressVerified: true,
              addressConfidence: googleResult.confidence,
              isValidated: true,
              validationNotes: `Verified on Google Places (${googleResult.confidence} confidence)${googleResult.rating ? `, Rating: ${googleResult.rating}★` : ''}${googleResult.reviewCount ? ` · ${googleResult.reviewCount} reviews` : ''}`
            });

            console.log(`   ✅ VERIFIED: ${googleResult.venueName} at ${googleResult.address}`);
            if (googleResult.openingHours?.length) {
              console.log(`   🕐 Opening hours: ${googleResult.openingHours[0]} (+ ${googleResult.openingHours.length - 1} more days)`);
            }

          } else {
            rejectedVenues.push({ name: activity.venueName, reason: 'Not found on Google Places - venue may not exist or name is incorrect' });
            console.log(`   ❌ REJECTED: ${activity.venueName} — not found on Google Places`);
          }

          await new Promise(resolve => setTimeout(resolve, 150));

        } catch (error) {
          console.error(`   ❌ Error validating ${activity.venueName}:`, error);
          rejectedVenues.push({ name: activity.venueName, reason: 'Google Places API error' });
        }
      }

      // ─── DEDUP BY PLACE ID ────────────────────────────────────────────────
      const seenPlaceIds = new Set<string>();
      deduplicatedActivities = validatedActivities.filter(act => {
        if (!act.googlePlaceId) return true;
        if (seenPlaceIds.has(act.googlePlaceId)) {
          console.log(`[DEDUP] ✗ Removed duplicate: "${act.venueName}"`);
          return false;
        }
        seenPlaceIds.add(act.googlePlaceId);
        return true;
      });
      if (deduplicatedActivities.length < validatedActivities.length) {
        console.log(`[DEDUP] ${validatedActivities.length - deduplicatedActivities.length} duplicate(s) removed → ${deduplicatedActivities.length} unique venues`);
      }

      console.log(`\n[AGENT 3] ✅ ${deduplicatedActivities.length} unique venues verified`);

    // ─── THIN COVERAGE CHECK ──────────────────────────────────────────────
    // Only refuse when zero venues survive. A single verified venue is still
    // shown to the user — a one-stop plan is better than a "nothing found" error.
    if (deduplicatedActivities.length < 1) {
      console.log(`\n[PIPELINE] ⚠️ No venues verified — cannot build a plan`);
      return {
        success: false,
        error: `Not enough ${theme} venues in ${city}.`,
        errorCode: 'THIN_COVERAGE',
        venueCount: deduplicatedActivities.length,
        rejectedVenues: rejectedVenues.map(v => v.name),
        rejectionReasons: rejectedVenues,
        retry: false,
      };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3.2: RANK + CAP (pure function — no model call)
    // Scores each verified venue by rating, review count, and confidence,
    // then keeps the top 3. Activities/Excitement themes keep top 5 (more
    // categories needed). All others cap at 3.
    // ═══════════════════════════════════════════════════════════════════════
    const targetVenues = (theme === 'Activities' || theme === 'Excitement') ? 5 : 3;
    const topActivities = rankAndCapVenues(deduplicatedActivities, targetVenues);
    const planCost = calculatePlanCost(topActivities, currency, discoveredPlan.estimatedCost);
    console.log(`\n[RANK] 🏆 Top ${topActivities.length} venues selected from ${validatedActivities.length} verified:`);
    topActivities.forEach((a, i) => {
      console.log(`   ${i + 1}. ${a.venueName} (${a.estimatedRating ?? '?'}★ · ${a.validationNotes})`);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3.5: SCHEDULE VENUES (pure function — no model call)
    // Assigns start times from Google Places structured hours + theme defaults
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`\n[SCHEDULE] 🕐 Assigning times from opening hours...`);
    let scheduledActivities = scheduleVenues(topActivities, theme);

    // ═══════════════════════════════════════════════════════════════════════
    // VENUE SELECTION: For Activities/Excitement themes
    // Pick exactly 2 activities + 1 winddown for the final plan
    // ═══════════════════════════════════════════════════════════════════════
    const isActivitiesTheme = theme === 'Activities' || theme === 'Excitement';
    if (isActivitiesTheme && scheduledActivities.length > 0) {
      console.log(`\n[SELECTOR] 🎯 Selecting 2 activities + 1 winddown for ${theme} theme...`);
      console.log(`   Total venues available: ${scheduledActivities.length}`);
      scheduledActivities.forEach((v, i) => {
        console.log(`      ${i + 1}. ${v.venueName} (category: ${v.category || 'NOT SET'})`);
      });

      let activities = scheduledActivities.filter(a => a.category === 'activity');
      let winddowns = scheduledActivities.filter(a => a.category === 'winddown');

      console.log(`   Categorized: ${activities.length} activities, ${winddowns.length} winddowns`);

      // FALLBACK: If categories weren't set by Agent 1, infer them
      // Assume first N-1 venues are activities, last venue is winddown
      if (activities.length === 0 && winddowns.length === 0 && scheduledActivities.length >= 2) {
        console.log(`   ⚠️ No categories set - inferring from position...`);
        // Take first venues as activities, last as winddown
        const allVenues = [...scheduledActivities];
        winddowns = [allVenues.pop()!]; // Last venue is winddown
        activities = allVenues; // Rest are activities

        // Set categories for logging
        activities.forEach(a => a.category = 'activity');
        winddowns.forEach(a => a.category = 'winddown');

        console.log(`   Inferred: ${activities.length} activities, ${winddowns.length} winddowns`);
      }

      // Select exactly 2 activities and 1 winddown
      const selectedActivities = activities.slice(0, 2);
      const selectedWinddown = winddowns.slice(0, 1);

      if (selectedActivities.length < 2) {
        console.log(`   ⚠️ Only ${selectedActivities.length} activity venues available`);
      }
      if (selectedWinddown.length < 1) {
        console.log(`   ⚠️ No winddown venues available`);
        // If no winddown but we have 3+ activities, use the 3rd as winddown
        if (activities.length > 2) {
          const thirdActivity = activities[2];
          thirdActivity.category = 'winddown';
          selectedWinddown.push(thirdActivity);
          console.log(`   Using "${thirdActivity.venueName}" as winddown`);
        }
      }

      // Combine: exactly 2 activities + 1 winddown = 3 venues max
      const finalSelection = [...selectedActivities, ...selectedWinddown]
        .sort((a, b) => a.order - b.order)
        .map((a, idx) => ({ ...a, order: idx + 1 }));

      // Ensure we have exactly 3 venues (or fewer if not enough available)
      const maxVenues = Math.min(finalSelection.length, 3);
      const trimmedSelection = finalSelection.slice(0, maxVenues);

      console.log(`   ✅ Final selection: ${trimmedSelection.length} venues`);
      trimmedSelection.forEach((v, i) => {
        console.log(`      ${i + 1}. ${v.venueName} (${v.category})`);
      });

      scheduledActivities = trimmedSelection;
    }

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

    // Override cost with the per-venue sum calculated from surviving venues
    finalPlan.estimatedCost = calculatePlanCost(scheduledActivities, currency, planCost);

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

    const timestamp = Date.now();
    const flowId = `bolt-v3-${city.toLowerCase().replace(/\s+/g, '-')}-${theme.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`;

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

    await insertRow('GroupFlow', flowData);

    // Store individual plans and steps
    for (let i = 0; i < finalPlan.activities.length; i++) {
      const activity = finalPlan.activities[i];
      const planId = `${flowId}-plan-${i}`;

      await insertRow('Plan', {
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
        source: 'bolt-pipeline-v3-async',
        aiGenerated: true,
        isIndividual: false,
        isGroup: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await insertRow('GroupFlowStep', {
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
    return {
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
        rejectedVenues: rejectedVenues.length > 0 ? rejectedVenues.map(v => v.name) : undefined,
        rejectionReasons: rejectedVenues.length > 0 ? rejectedVenues : undefined,
      },
    };

  } catch (error) {
    console.error('[BOLT] Pipeline error:', error);
    return {
      success: false,
      error: 'Failed to generate plan. Please try again.',
      errorCode: 'PIPELINE_ERROR',
      retry: true,
    };
  }
}

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
  const isUltimateFriday = theme === 'Ultimate Friday';
  const isUltimateSaturday = theme === 'Ultimate Saturday';
  const isEventBased = isUltimateFriday || isUltimateSaturday;

  // Discover more venues than needed so quality/Google filters still leave enough standing
  let venueCount = 5;
  if (isActivities || isExcitement) venueCount = 10;
  if (isUltimateFriday) venueCount = 6;
  if (isUltimateSaturday) venueCount = 8;

  // Get date context for event-based themes
  const dateContext = getUpcomingDates();

  const systemPrompt = `You are an expert local guide for ${city}${country ? `, ${country}` : ''} with deep knowledge of the BEST venues.

YOUR MISSION: Find the TOP ${venueCount} most CREDIBLE, REAL, and HIGHLY-RATED venues for a "${theme}" experience. The final plan will only use 3 of these — provide ${venueCount} so that weaker venues can be filtered out and the best 3 remain. Prioritise venues with strong online presence, high foot traffic, and well-known reputations that are likely to have many real Google reviews.${isActivities ? `

SPECIAL FOR ACTIVITIES THEME:
- Find 4-5 fun competitive ACTIVITY venues (bowling, laser tag, escape rooms, go-karting, VR arcades, etc.)
- PLUS 1-2 winding down spots (rooftop bars, scenic restaurants, or nice places to eat)
- This ensures enough venues survive validation for a final plan of 2 activities + 1 dining/drinks spot` : ''}${isExcitement ? `

SPECIAL FOR EXCITEMENT THEME:
- Find 4-5 THRILLING excitement venues (amusement parks, fun fairs, ferris wheels, gondola rides, theme parks, water parks, carnivals, circuses, zip lines, etc.)
- PLUS 2 winding down spots (rooftop bars, scenic restaurants, or nice places to relax with views and drinks)
- This ensures enough venues survive validation for a final plan of 2-3 excitement spots + 1 dining/drinks spot` : ''}${isUltimateFriday ? `

SPECIAL FOR ULTIMATE FRIDAY THEME:
📅 TODAY IS: ${dateContext.today}
📅 THIS COMING FRIDAY IS: ${dateContext.nextFriday} (${dateContext.nextFridayFormatted})

YOUR MISSION: Build a Friday night plan around a REAL EVENT happening on ${dateContext.nextFridayFormatted}.

STRUCTURE (3 venues):
1. PREGAME (category: "pregame") - 18:00-20:00
   A trendy bar, rooftop, or lounge for pre-event drinks

2. MAIN EVENT (category: "main_event") - 21:00-00:00
   ⭐ THE HEADLINE: A SPECIFIC event happening THIS FRIDAY ${dateContext.nextFridayFormatted}
   Examples: Concert, DJ night, album launch, comedy show, themed party, club night
   MUST be a real, promoted event with artist names, DJ lineups, or specific themes

3. AFTER-PARTY (category: "afterparty") - 00:00-03:00
   A late-night venue: club, speakeasy, or 24-hour spot

⚠️ The MAIN EVENT must be something ACTUALLY HAPPENING on ${dateContext.nextFridayFormatted}
⚠️ Include the event name/artist in the venue description
⚠️ The plan title MUST include "${dateContext.nextFridayFormatted}" (e.g., "${dateContext.nextFridayFormatted} Ultimate Friday: [Event Name]")` : ''}${isUltimateSaturday ? `

SPECIAL FOR ULTIMATE SATURDAY THEME:
📅 TODAY IS: ${dateContext.today}
📅 THIS COMING SATURDAY IS: ${dateContext.nextSaturday} (${dateContext.nextSaturdayFormatted})

YOUR MISSION: Build a FULL DAY Saturday plan around a REAL EVENT happening on ${dateContext.nextSaturdayFormatted}.

STRUCTURE FOR NIGHT EVENTS (4 venues):
1. DAYTIME (category: "pregame") - 12:00-15:00
   Brunch spot, day drinking venue, or chill daytime activity

2. PREGAME (category: "pregame") - 17:00-20:00
   Rooftop sundowners, happy hour spot, or dinner venue

3. MAIN EVENT (category: "main_event") - 21:00+
   ⭐ THE HEADLINE: A SPECIFIC event happening THIS SATURDAY ${dateContext.nextSaturdayFormatted}
   Examples: Concert, festival, DJ night, day party, sports event, art exhibition

4. WIND-DOWN (category: "winddown") - Late night
   Late-night food spot or chill bar to end the night

STRUCTURE FOR DAY EVENTS (4 venues):
1. BRUNCH (category: "pregame") - 11:00-13:00
   Energizing brunch to start the day

2. MAIN EVENT (category: "main_event") - 14:00-18:00
   ⭐ Day party, festival, sports event, or daytime attraction

3. DINNER (category: "winddown") - 19:00-21:00
   Nice restaurant to recap the day

4. NIGHTCAP (category: "winddown") - 21:00+
   Bar or lounge for evening drinks

⚠️ The MAIN EVENT must be something ACTUALLY HAPPENING on ${dateContext.nextSaturdayFormatted}
⚠️ The plan title MUST include "${dateContext.nextSaturdayFormatted}" (e.g., "${dateContext.nextSaturdayFormatted} Ultimate Saturday: [Event Name]")` : ''}

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

COST ESTIMATION PER VENUE:
- Estimate the realistic per-person spend at each venue in ${currency}
- Include: typical entry/cover charge + 2-3 drinks OR one meal (whichever applies)
- Use ACTUAL local prices for ${city} — not generic global averages
- Example for a Berlin rooftop bar: entry €0 + 3 cocktails ~€12 each = €36–45 per person
- Example for a Kampala rooftop bar: entry UGX 0 + 3 drinks ~UGX 15,000 each = UGX 40,000–60,000
- Be specific and realistic. These will be summed across all stops for the total plan estimate.

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

⚠️ The last venue(s) MUST be a restaurant or bar - NOT another activity!
⚠️ Mark each venue with category: "activity" for competitive spots, "winddown" for restaurants/bars` : ''}${isExcitement ? `

FOR EXCITEMENT THEME - YOU MUST INCLUDE:
1. First 4-5 venues: THRILLING experiences (amusement parks, fun fairs, ferris wheels, gondola rides, theme parks, water parks, carnivals, circuses, zip lines, unique attractions, etc.)
2. Last 2 venues: WINDING DOWN spots - either a nice RESTAURANT for dinner OR a BAR/ROOFTOP with scenic views for sundowner drinks

⚠️ The last 2 venues MUST be restaurants or bars with views - NOT more excitement venues!
⚠️ Mark each venue with category: "activity" for excitement spots, "winddown" for restaurants/bars` : ''}

⚠️ FOR ACTIVITIES/EXCITEMENT THEMES: You MUST include a "category" field for EACH venue:
   - "activity" = fun competitive activities or thrilling excitement venues
   - "winddown" = restaurants, bars, rooftops for winding down${isEventBased ? `

⚠️ FOR ULTIMATE FRIDAY/SATURDAY THEMES: You MUST include a "category" field for EACH venue:
   - "pregame" = bars, lounges, brunch spots, daytime activities before the main event
   - "main_event" = THE headline event (concert, DJ night, festival, etc.) - must be a REAL event happening on the specified date
   - "afterparty" = late-night venues after the main event
   - "winddown" = restaurants or chill spots to end the night

📅 CRITICAL: The MAIN EVENT must be a REAL, PROMOTED event happening on the SPECIFIC DATE.
📅 The plan title MUST start with the date (e.g., "${isUltimateFriday ? dateContext.nextFridayFormatted : dateContext.nextSaturdayFormatted} Ultimate ${isUltimateFriday ? 'Friday' : 'Saturday'}: [Event Name]")` : ''}

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
        "category": "${isEventBased ? 'pregame, main_event, afterparty, or winddown' : 'activity or winddown'} (REQUIRED)",
        "whyRecommended": "Why this is one of the BEST (ratings, reviews, popularity)",
        "estimatedRating": 4.5,
        "popularitySignals": ["Featured in...", "Known for...", "Award-winning..."],
        "estimatedCostPerPerson": { "min": 30, "max": 55 }
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
      model: 'gpt-5.1',
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

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-FILTER (pure function — runs before Agent 2)
// Handles the two checks that are 100% deterministic and need no model judgment:
//   1. Venue name matches city name exactly (e.g. searching Paris, venue = "Paris")
//   2. Duplicate venue names (uses areVenueNamesSimilar)
// Everything else (theme relevance, inappropriate venues) goes to the model.
// ═══════════════════════════════════════════════════════════════════════════════
// Rooftop-specific name keywords that signal a genuine rooftop venue
const ROOFTOP_NAME_KEYWORDS = ['rooftop', 'sky lounge', 'skybar', 'sky bar', 'sky restaurant', 'terrace bar', 'heights bar', 'top floor', 'aerial', 'above'];

// Property-type words that alone do NOT make a rooftop venue
const PROPERTY_TYPE_WORDS = ['hotel', 'resort', 'suites', 'inn', 'lodge', 'motel', 'hostel', 'guesthouse'];

function prefilterVenues(
  activities: Activity[],
  city: string,
  theme: string
): { kept: Activity[]; rejected: { name: string; reason: string }[] } {
  const kept: Activity[] = [];
  const rejected: { name: string; reason: string }[] = [];
  const cityLower = city.toLowerCase().trim();
  const isRooftopTheme = theme === 'Rooftop';

  for (const act of activities) {
    const nameLower = act.venueName.toLowerCase().trim();

    // Check 1: venue name is the city itself
    if (nameLower === cityLower) {
      rejected.push({ name: act.venueName, reason: `Venue name matches city name "${city}" — not a valid venue` });
      continue;
    }

    // Check 2: duplicate of an already-kept venue
    const isDuplicate = kept.some(existing => areVenueNamesSimilar(existing.venueName, act.venueName));
    if (isDuplicate) {
      const original = kept.find(existing => areVenueNamesSimilar(existing.venueName, act.venueName));
      rejected.push({ name: act.venueName, reason: `Duplicate of "${original?.venueName}"` });
      continue;
    }

    // Check 3 (Rooftop theme only): hard name-based rules
    if (isRooftopTheme) {
      // Apartments are NEVER rooftop venues — reject unconditionally regardless of any other keywords
      if (/\bapartments?\b/.test(nameLower)) {
        rejected.push({ name: act.venueName, reason: 'Apartment buildings are not rooftop venues' });
        continue;
      }

      // Hotels, resorts, and similar property types must have a rooftop keyword IN THE NAME itself.
      // Agent 1's description cannot override this — we check the name only.
      const isPropertyType = PROPERTY_TYPE_WORDS.some(w => new RegExp(`\\b${w}\\b`).test(nameLower));
      const hasRooftopKeywordInName = ROOFTOP_NAME_KEYWORDS.some(kw => nameLower.includes(kw));
      if (isPropertyType && !hasRooftopKeywordInName) {
        rejected.push({ name: act.venueName, reason: `Hotel/resort name with no rooftop keyword — not a dedicated rooftop venue` });
        continue;
      }
    }

    kept.push(act);
  }

  return { kept, rejected };
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

STRICT THEME MATCHING — REJECT if the venue doesn't clearly fit:

For "Rooftop" theme:
- Venues reaching you have already passed a name-based filter — apartments and hotels without rooftop keywords in their name have been removed
- Your job: REJECT any venue that, despite having a rooftop-sounding name, is clearly a ground-floor restaurant, indoor-only bar, or retail/residential space with no public rooftop access
- APPROVE venues whose name contains "Rooftop", "Sky", "Heights", "Terrace Bar", "Skybar", or similar — these have already been pre-screened
- REJECT if the description makes clear it is an indoor-only or ground-floor venue despite the name

For "Nightlife" theme: REJECT venues NOT open late or not for dancing/drinking
For "Jazz" theme: REJECT venues that don't feature jazz music
For "Brunch" theme: REJECT venues not serving brunch food/drinks
For "Live Music" theme: REJECT venues that don't host live performances
For other themes: apply the same strict logic — the venue must clearly deliver that specific experience

Be STRICT. If there is any doubt about whether a venue fits the theme, REJECT it.
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
      model: 'gpt-4.1-mini',
      temperature: 0.3,
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
        const venueName = decision.correctedName || activity.venueName;

        // PROGRAMMATIC DUPLICATE CHECK: Check if this venue is similar to already approved ones
        const isDuplicate = approved.some(existing => {
          return areVenueNamesSimilar(existing.venueName, venueName);
        });

        if (isDuplicate) {
          console.log(`   🔄 Duplicate detected: "${venueName}" - rejecting`);
          rejected.push({
            name: venueName,
            reason: 'Duplicate venue - similar to already approved venue'
          });
          continue;
        }

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
// RANK + CAP (pure function)
// Scores each verified venue and returns the top N.
// Score = rating (0-5) weighted 50% + review count (log-scaled, 0-5) weighted 30%
//       + confidence bonus 20% (high=1, medium=0.6, low=0.2)
// All three signals are already on the activity from Google Places.
// ═══════════════════════════════════════════════════════════════════════════════
function rankAndCapVenues(activities: Activity[], cap: number): Activity[] {
  const confidenceScore = (c?: string) => c === 'high' ? 1 : c === 'medium' ? 0.6 : 0.2;

  const scored = activities.map(act => {
    const rating = act.estimatedRating ?? 0;
    // Log-scale review count: 50 reviews → ~1.7, 200 → ~2.3, 1000 → ~3, 5000 → ~3.7 (max ~5)
    const reviewsRaw = parseFloat(act.validationNotes?.match(/(\d+) reviews/)?.[1] ?? '0');
    const reviewScore = reviewsRaw > 0 ? Math.min(Math.log10(reviewsRaw) * 1.67, 5) : 0;
    const confScore = confidenceScore(act.addressConfidence) * 5;

    const score = (rating * 0.5) + (reviewScore * 0.3) + (confScore * 0.2);
    return { act, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, cap)
    .map(({ act }) => act);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COST CALCULATOR (pure function)
// Sums per-venue cost estimates from Agent 1 across only the venues that
// survived filtering. Falls back to the plan-level estimate if per-venue
// data is missing.
// ═══════════════════════════════════════════════════════════════════════════════
function calculatePlanCost(
  activities: Activity[],
  currency: string,
  fallback: { min: number; max: number; currency: string }
): { min: number; max: number; currency: string } {
  const withCost = activities.filter(a => a.estimatedCostPerPerson);
  if (withCost.length === 0) return fallback;

  const min = withCost.reduce((sum, a) => sum + a.estimatedCostPerPerson!.min, 0);
  const max = withCost.reduce((sum, a) => sum + a.estimatedCostPerPerson!.max, 0);
  return { min: Math.round(min), max: Math.round(max), currency };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIMING — PURE FUNCTIONS (no model calls)
// scheduleVenues: assigns start times from Google Places structured hours + theme
// enforceChronologicalSpacing: final guarantee — no duplicates, no N/A, sequential
// ═══════════════════════════════════════════════════════════════════════════════

function toMinutes(time: string): number | null {
  if (!time || time === 'N/A' || time.trim() === '') return null;
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function toHHMM(minutes: number): string {
  const totalMins = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Returns [openMinutes, closeMinutes] for the venue on the best available day.
// Prefers Friday (5) → Saturday (6) → any day. Returns null for unavailable.
// Close minutes may exceed 1440 if the venue closes past midnight.
function getVenueWindow(periods: OpeningPeriod[] | undefined): [number, number] | null {
  if (!periods || periods.length === 0) return null;
  for (const preferredDay of [5, 6, 4, 3, 2, 1, 0]) {
    const period = periods.find(p => p.open.day === preferredDay);
    if (!period) continue;
    const openT = period.open.time; // "HHMM"
    const openMins = parseInt(openT.slice(0, 2), 10) * 60 + parseInt(openT.slice(2), 10);
    if (!period.close) return [openMins, openMins + 1440]; // no close time = treat as 24h open
    const closeT = period.close.time;
    let closeMins = parseInt(closeT.slice(0, 2), 10) * 60 + parseInt(closeT.slice(2), 10);
    if (closeMins < openMins) closeMins += 1440; // overnight (e.g. closes 02:00 next day)
    return [openMins, closeMins];
  }
  return null;
}

// Theme defaults: ideal first-venue start time when no structured hours are available
const THEME_DEFAULT_START: Record<string, number> = {
  'Nightlife':  22 * 60,
  'Brunch':     10 * 60,
  'Date Night': 19 * 60,
  'Bar Hopping':19 * 60,
  'Rooftop':    17 * 60 + 30,
  'Sunset':     17 * 60,
  'Jazz':       20 * 60,
  'Activities': 13 * 60,
  'Excitement': 13 * 60,
  'Cocktails':  19 * 60,
  'Speakeasy':  21 * 60,
  'Dancing':    22 * 60,
  'Wine':       18 * 60,
  'Live Music': 20 * 60,
  'Comedy':     20 * 60,
  'Afro House': 22 * 60,
  'Afro Beats': 22 * 60,
  'Party':      21 * 60,
  'Beach':      14 * 60,
  'Foodie':     18 * 60,
  'Art':        18 * 60,
  'Culture':    15 * 60,
  'Chill':      16 * 60,
  'Low Budget': 18 * 60,
  'Adventure':  14 * 60,
  'Equestrian': 10 * 60,
};

const TRAVEL_GAP = 20; // minutes between venues

function scheduleVenues(activities: Activity[], theme: string): Activity[] {
  const isActivitiesOrExcitement = theme === 'Activities' || theme === 'Excitement';
  const themeStart = THEME_DEFAULT_START[theme] ?? 18 * 60;

  let cursor = themeStart; // minutes since midnight, advances as venues are placed

  const scheduled = activities.map((act, i) => {
    const window = getVenueWindow(act.openingHoursPeriods);

    // Duration: minimum 120 min for all venues — override if Agent 1 suggests shorter
    let duration = Math.max(act.duration || 120, 120);
    if (isActivitiesOrExcitement) {
      if (act.category === 'activity') duration = Math.max(duration, 180);
      else if (act.category === 'winddown') duration = Math.max(Math.min(duration, 90), 60);
    }

    let start = cursor;

    if (window) {
      const [openMins, closeMins] = window;
      // Push forward if venue isn't open yet
      if (start < openMins) start = openMins;
      // If we'd run past closing, pull back so the full duration fits
      if (start + duration > closeMins) {
        const fittedStart = closeMins - duration;
        if (fittedStart >= openMins) start = fittedStart;
        // If it still doesn't fit, leave start as-is (venue has short hours or bad data)
      }
    }

    cursor = start + duration + TRAVEL_GAP;

    console.log(`   ✓ ${act.venueName}: ${toHHMM(start)} (${duration}min)${window ? '' : ' [no hours — theme default]'}`);
    return { ...act, startTime: toHHMM(start), duration, order: i + 1 };
  });

  // Final guarantee: sort, fix any remaining gaps/overlaps
  return enforceChronologicalSpacing(scheduled, TRAVEL_GAP, themeStart);
}

function enforceChronologicalSpacing(
  activities: Activity[],
  travelMinutes = TRAVEL_GAP,
  themeStartMinutes = 12 * 60
): Activity[] {
  // For plans that start in the evening/night, venues can run past midnight.
  // toHHMM wraps those times back to small values (e.g. 01:30 = 90 minutes),
  // which sorts before 22:00 (1320) even though they're actually later.
  // Fix: if the theme starts at/after noon, treat any time before 06:00 as next-day (+1440).
  const NEXT_DAY_THRESHOLD = 6 * 60; // 06:00

  const unwrap = (t: number | null): number | null => {
    if (t === null) return null;
    if (themeStartMinutes >= 12 * 60 && t < NEXT_DAY_THRESHOLD) return t + 1440;
    return t;
  };

  const sorted = [...activities].sort((a, b) => {
    const ta = unwrap(toMinutes(a.startTime));
    const tb = unwrap(toMinutes(b.startTime));
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return ta - tb;
  });

  let prevEndMinutes: number | null = null;

  return sorted.map((act, i) => {
    let startMinutes = unwrap(toMinutes(act.startTime));

    if (startMinutes === null) {
      startMinutes = prevEndMinutes !== null ? prevEndMinutes + travelMinutes : themeStartMinutes;
    } else if (prevEndMinutes !== null && startMinutes < prevEndMinutes + travelMinutes) {
      startMinutes = prevEndMinutes + travelMinutes;
    }

    const duration = act.duration || 120;
    prevEndMinutes = startMinutes + duration;

    return { ...act, startTime: toHHMM(startMinutes), order: i + 1 };
  });
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
      model: 'gpt-5.1',
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
    // ── North America ──────────────────────────────────────────────────────
    'United States': 'USD', 'USA': 'USD', 'US': 'USD',
    'Canada': 'CAD',
    'Mexico': 'MXN',
    'Cuba': 'CUP',
    'Jamaica': 'JMD',
    'Dominican Republic': 'DOP',
    'Puerto Rico': 'USD',
    'Trinidad and Tobago': 'TTD',
    'Bahamas': 'BSD',
    'Barbados': 'BBD',
    'Costa Rica': 'CRC',
    'Panama': 'PAB',
    'Guatemala': 'GTQ',
    'Honduras': 'HNL',
    'El Salvador': 'USD',
    'Nicaragua': 'NIO',
    'Haiti': 'HTG',

    // ── South America ──────────────────────────────────────────────────────
    'Brazil': 'BRL',
    'Argentina': 'ARS',
    'Colombia': 'COP',
    'Chile': 'CLP',
    'Peru': 'PEN',
    'Venezuela': 'VES',
    'Ecuador': 'USD',
    'Bolivia': 'BOB',
    'Paraguay': 'PYG',
    'Uruguay': 'UYU',
    'Guyana': 'GYD',
    'Suriname': 'SRD',

    // ── Europe (non-EUR) ──────────────────────────────────────────────────
    'United Kingdom': 'GBP', 'UK': 'GBP', 'England': 'GBP',
    'Scotland': 'GBP', 'Wales': 'GBP', 'Northern Ireland': 'GBP',
    'Switzerland': 'CHF', 'Liechtenstein': 'CHF',
    'Norway': 'NOK',
    'Sweden': 'SEK',
    'Denmark': 'DKK',
    'Iceland': 'ISK',
    'Poland': 'PLN',
    'Czech Republic': 'CZK', 'Czechia': 'CZK',
    'Hungary': 'HUF',
    'Romania': 'RON',
    'Bulgaria': 'BGN',
    'Serbia': 'RSD',
    'Croatia': 'EUR',
    'Ukraine': 'UAH',
    'Russia': 'RUB',
    'Turkey': 'TRY',
    'Belarus': 'BYN',
    'Georgia': 'GEL',
    'Armenia': 'AMD',
    'Azerbaijan': 'AZN',
    'Albania': 'ALL',
    'North Macedonia': 'MKD',
    'Bosnia and Herzegovina': 'BAM',
    'Moldova': 'MDL',
    'Kosovo': 'EUR',
    'Montenegro': 'EUR',

    // ── Africa ────────────────────────────────────────────────────────────
    'South Africa': 'ZAR',
    'Nigeria': 'NGN',
    'Kenya': 'KES',
    'Ghana': 'GHS',
    'Ethiopia': 'ETB',
    'Tanzania': 'TZS',
    'Uganda': 'UGX',
    'Rwanda': 'RWF',
    'Senegal': 'XOF',
    'Ivory Coast': 'XOF', "Côte d'Ivoire": 'XOF',
    'Mali': 'XOF',
    'Burkina Faso': 'XOF',
    'Guinea': 'GNF',
    'Cameroon': 'XAF',
    'Angola': 'AOA',
    'Mozambique': 'MZN',
    'Zambia': 'ZMW',
    'Zimbabwe': 'ZWL',
    'Botswana': 'BWP',
    'Namibia': 'NAD',
    'Malawi': 'MWK',
    'Sudan': 'SDG',
    'South Sudan': 'SSP',
    'Somalia': 'SOS',
    'Libya': 'LYD',
    'Tunisia': 'TND',
    'Algeria': 'DZD',
    'Morocco': 'MAD',
    'Egypt': 'EGP',
    'Madagascar': 'MGA',
    'DR Congo': 'CDF', 'Congo': 'XAF',
    'Gabon': 'XAF',
    'Chad': 'XAF',
    'Niger': 'XOF',
    'Benin': 'XOF',
    'Togo': 'XOF',
    'Sierra Leone': 'SLL',
    'Liberia': 'LRD',
    'Mauritius': 'MUR',
    'Seychelles': 'SCR',
    'Cabo Verde': 'CVE',

    // ── Middle East ───────────────────────────────────────────────────────
    'UAE': 'AED', 'United Arab Emirates': 'AED',
    'Saudi Arabia': 'SAR',
    'Qatar': 'QAR',
    'Kuwait': 'KWD',
    'Bahrain': 'BHD',
    'Oman': 'OMR',
    'Israel': 'ILS',
    'Jordan': 'JOD',
    'Lebanon': 'LBP',
    'Iraq': 'IQD',
    'Iran': 'IRR',
    'Syria': 'SYP',
    'Yemen': 'YER',

    // ── Asia ──────────────────────────────────────────────────────────────
    'Japan': 'JPY',
    'China': 'CNY',
    'South Korea': 'KRW', 'Korea': 'KRW',
    'India': 'INR',
    'Indonesia': 'IDR',
    'Thailand': 'THB',
    'Vietnam': 'VND',
    'Malaysia': 'MYR',
    'Singapore': 'SGD',
    'Philippines': 'PHP',
    'Pakistan': 'PKR',
    'Bangladesh': 'BDT',
    'Sri Lanka': 'LKR',
    'Nepal': 'NPR',
    'Myanmar': 'MMK',
    'Cambodia': 'KHR',
    'Laos': 'LAK',
    'Mongolia': 'MNT',
    'Kazakhstan': 'KZT',
    'Uzbekistan': 'UZS',
    'Tajikistan': 'TJS',
    'Kyrgyzstan': 'KGS',
    'Turkmenistan': 'TMT',
    'Afghanistan': 'AFN',
    'Maldives': 'MVR',
    'Bhutan': 'BTN',
    'Hong Kong': 'HKD',
    'Taiwan': 'TWD',
    'Macau': 'MOP',

    // ── Oceania ───────────────────────────────────────────────────────────
    'Australia': 'AUD',
    'New Zealand': 'NZD',
    'Papua New Guinea': 'PGK',
    'Fiji': 'FJD',
    'Solomon Islands': 'SBD',
    'Vanuatu': 'VUV',
    'Samoa': 'WST',
    'Tonga': 'TOP',
  };

  if (!country) return 'USD';

  // Exact match first
  if (currencyMap[country]) return currencyMap[country];

  // Eurozone fallback — all remaining European countries use EUR
  const eurozoneCountries = [
    'France', 'Germany', 'Spain', 'Italy', 'Netherlands', 'Belgium',
    'Austria', 'Portugal', 'Greece', 'Ireland', 'Finland', 'Luxembourg',
    'Slovakia', 'Slovenia', 'Estonia', 'Latvia', 'Lithuania', 'Cyprus',
    'Malta',
  ];
  if (eurozoneCountries.includes(country)) return 'EUR';

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
 * Get upcoming Friday and Saturday dates for event-based themes
 */
function getUpcomingDates(): {
  today: string;
  nextFriday: string;
  nextFridayFormatted: string;
  nextSaturday: string;
  nextSaturdayFormatted: string;
} {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday

  // Calculate days until next Friday (5)
  let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  if (daysUntilFriday === 0) daysUntilFriday = 7; // If today is Friday, get next Friday

  // Calculate days until next Saturday (6)
  let daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
  if (daysUntilSaturday === 0) daysUntilSaturday = 7; // If today is Saturday, get next Saturday

  const nextFriday = new Date(now);
  nextFriday.setDate(now.getDate() + daysUntilFriday);

  const nextSaturday = new Date(now);
  nextSaturday.setDate(now.getDate() + daysUntilSaturday);

  // Format dates
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const formatDateHuman = (date: Date): string => {
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const suffix = getDaySuffix(day);
    return `${day}${suffix} ${month}`;
  };

  return {
    today: formatDate(now),
    nextFriday: formatDate(nextFriday),
    nextFridayFormatted: formatDateHuman(nextFriday),
    nextSaturday: formatDate(nextSaturday),
    nextSaturdayFormatted: formatDateHuman(nextSaturday),
  };
}

/**
 * Get ordinal suffix for a day (1st, 2nd, 3rd, etc.)
 */
function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Get the local language name of a city
 * Returns both English and local names for matching
 */

/**
 * Check if two venue names are similar (potential duplicates)
 * Returns true if names are likely the same venue
 */
function areVenueNamesSimilar(name1: string, name2: string): boolean {
  // Normalize names for comparison
  const normalize = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/^the\s+/i, '')        // Remove leading "The"
      .replace(/['"`'']/g, '')        // Remove quotes
      .replace(/[^a-z0-9\s]/g, '')    // Remove special characters
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .trim();
  };

  const n1 = normalize(name1);
  const n2 = normalize(name2);

  // Exact match after normalization
  if (n1 === n2) return true;

  // One contains the other (handles "Sky Lounge" vs "Sky Lounge Nairobi")
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Check word overlap - if 80%+ words match, likely duplicate
  const words1 = new Set(n1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(n2.split(' ').filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return false;

  const intersection = [...words1].filter(w => words2.has(w));
  const overlapRatio = intersection.length / Math.min(words1.size, words2.size);

  // 80% word overlap = likely duplicate
  if (overlapRatio >= 0.8) return true;

  return false;
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
