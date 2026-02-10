/**
 * ══════════════════════════════════════════════════════════════════════════════
 * TEST: Relaxed 7-Agent Pipeline (GPT-4o) - TESTING RELAXED VALIDATION
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * This is a TEST pipeline with RELAXED validation to see if we can get more
 * group plans through the pipeline while maintaining quality.
 *
 * CHANGES FROM PRODUCTION:
 * 1. Agent 1 (Generator): Added timing/travel context - ensures proper scheduling
 * 2. Agent 2 (Details Validator): RELAXED - keeps plans with "plausible" venues
 * 3. Agent 3 (Address Validator): RELAXED - corrects instead of removes
 * 4. Storage: Uses "test-relaxed" prefix - WON'T overwrite existing plans
 *
 * TIMING CONTEXT ADDED:
 * - Duration at venue + travel time to next venue = gap before next start time
 * - Example: 90min at venue + 15min travel = next venue starts 105min later
 *
 * POST /test-relaxed-pipeline
 * Body: { "city": "Dar es Salaam", "storeResults": true }
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { gptRequest, parseGPTJSON } from '../_shared/gpt-client.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { getWeekdayFromDate, isWeekendDate } from '../_shared/date-utils.ts';

// City configurations
const CITY_CONFIGS: Record<string, any> = {
  'Ibiza': {
    cityName: 'Ibiza',
    country: 'Spain',
    currency: 'EUR',
    identity: 'The White Isle - world capital of electronic music, legendary sunsets, bohemian spirit, and hedonistic nightlife',
    vibe: 'Euphoric, free-spirited, glamorous yet raw, Mediterranean mystique',
    neighborhoods: ['Ibiza Town', 'Playa d\'en Bossa', 'San Antonio', 'Santa Eulalia', 'San Rafael', 'Cala Jondal'],
    coordRange: { lat: [38.9, 39.1], lon: [1.2, 1.6] },
    legendaryVenues: 'Pacha, Amnesia, Ushuaïa, Hï Ibiza, DC-10, Café del Mar, Café Mambo, Blue Marlin, O Beach, Es Paradis, Privilege',
    venueDetails: `
- Pacha: Av. 8 d'Agost, 07800 Ibiza Town - Famous cherry logo, legendary house music
- Amnesia: Carretera Ibiza-San Antonio, Km 5, 07816 San Rafael - Foam parties, techno temple
- Ushuaïa: Platja d'en Bossa 10, 07817 - Open-air hotel club, epic pool parties
- Hï Ibiza: Platja d'en Bossa, 07817 - State-of-art sound, formerly Space
- DC-10: Carretera Aeroport, 07817 - Underground techno, Circoloco home
- Café del Mar: Carrer de Vara de Rey 27, 07820 San Antonio - Invented chill-out, legendary sunsets
- Café Mambo: Carrer de Vara de Rey 40, 07820 San Antonio - Pre-party sunsets, Radio 1 broadcasts
- Blue Marlin: Cala Jondal, 07830 - Luxury beach club, beautiful people
- O Beach: Carrer des Caló des Moro, 07820 San Antonio - Pool parties, champagne showers
- Es Paradis: Carrer Salvador Espriu 2, 07820 San Antonio - Water parties, pyramid architecture
- Privilege: Urbanización San Rafael, 07816 - World's largest club`
  },
  'Paris': {
    cityName: 'Paris',
    country: 'France',
    currency: 'EUR',
    identity: 'The City of Light - timeless romance, world-class art, legendary cafes, and sophisticated nightlife',
    vibe: 'Elegant, romantic, cultured, effortlessly chic, mysteriously seductive',
    neighborhoods: ['Le Marais', 'Saint-Germain', 'Montmartre', 'Bastille', 'Pigalle', 'Champs-Élysées', 'Oberkampf'],
    coordRange: { lat: [48.82, 48.90], lon: [2.28, 2.42] },
    legendaryVenues: 'Le Baron, Silencio, Chez Castel, Rosa Bonheur, Le Perchoir, Experimental Cocktail Club, Le Syndicat, Candelaria, Duc des Lombards, New Morning, Le Sunset, La Bellevilloise, Rex Club, Concrete',
    venueDetails: `
- Le Baron: 6 Avenue Marceau, 75008 - Exclusive club, celebrity haunt
- Silencio: 142 Rue Montmartre, 75002 - David Lynch's private club, surreal decor
- Chez Castel: 15 Rue Princesse, 75006 - Legendary private club since 1962
- Rosa Bonheur: Parc des Buttes Chaumont, 75019 - Quirky guinguette, park setting
- Le Perchoir: 14 Rue Crespin du Gast, 75011 - Rooftop bar, panoramic views
- Experimental Cocktail Club: 37 Rue Saint-Sauveur, 75002 - Speakeasy, craft cocktails
- Le Syndicat: 51 Rue du Faubourg Saint-Denis, 75010 - French spirits only, industrial chic
- Candelaria: 52 Rue de Saintonge, 75003 - Hidden speakeasy behind taqueria
- Duc des Lombards: 42 Rue des Lombards, 75001 - Premier jazz club
- New Morning: 7-9 Rue des Petites Écuries, 75010 - Legendary jazz venue
- Le Sunset: 60 Rue des Lombards, 75001 - Jazz club, intimate setting
- La Bellevilloise: 19-21 Rue Boyer, 75020 - Cultural venue, concerts, art
- Rex Club: 5 Boulevard Poissonnière, 75002 - Techno institution since 1988
- Concrete: Port de la Rapée, 75012 - Boat club, techno, Seine views`
  },
  'Nairobi': {
    cityName: 'Nairobi',
    country: 'Kenya',
    currency: 'KES',
    identity: 'The Safari Capital - vibrant African metropolis, buzzing nightlife, rich culture, and gateway to the wild',
    vibe: 'Energetic, cosmopolitan, culturally rich, warm hospitality, rhythmic Afrobeats',
    neighborhoods: ['Westlands', 'Kilimani', 'Karen', 'Lavington', 'CBD', 'Gigiri', 'Langata'],
    coordRange: { lat: [-1.35, -1.20], lon: [36.70, 36.90] },
    legendaryVenues: 'Alchemist Bar, B Club, Kiza Lounge, J\'s Fresh Bar, Havana, K1 Klubhouse, Brew Bistro, Mercury Lounge, 1824, Sarabi Rooftop',
    venueDetails: `
- Alchemist Bar: Parklands Road, Westlands - Industrial chic, multiple bars, live acts, art installations
- B Club: Galana Plaza, Kilimani - Upscale nightclub, VIP experience, international DJs
- Kiza Lounge: Galana Plaza, Kilimani - Afrobeats heaven, African luxury, celebrity hotspot
- J's Fresh Bar: Parklands Road, Westlands - Craft cocktails, rooftop vibes, live music
- Havana: Woodvale Grove, Westlands - Latin vibes, salsa nights, Cuban atmosphere
- K1 Klubhouse: Parklands Road, Westlands - High-energy club, hip-hop and Afrobeats
- Brew Bistro: Piedmont Plaza, Ngong Road - Craft brewery, rooftop bar, casual vibes
- Mercury Lounge: ABC Place, Waiyaki Way - Live music venue, jazz and soul nights
- 1824: The Promenade, General Mathenge Road - Speakeasy style, craft cocktails
- Sarabi Rooftop: Pan Africa Insurance House, Kenyatta Ave - Skyline views, sundowners, lounge`
  },
  'Dar es Salaam': {
    cityName: 'Dar es Salaam',
    country: 'Tanzania',
    currency: 'TZS',
    identity: 'The Haven of Peace - Tanzania\'s vibrant coastal capital, Indian Ocean beaches, rich Swahili culture, and gateway to Zanzibar',
    vibe: 'Relaxed yet energetic, coastal charm, warm hospitality, Bongo Flava beats, cultural fusion',
    neighborhoods: ['Masaki', 'Oyster Bay', 'Msasani', 'Kariakoo', 'City Centre', 'Mikocheni', 'Kinondoni'],
    coordRange: { lat: [-6.88, -6.72], lon: [39.20, 39.35] },
    legendaryVenues: 'Karambezi Cafe, High Spirit Lounge, Samaki Samaki, Slipway, The Slow Leopard, Level 8, Havoc Nightspot, Elements, Q-Bar, Coco Beach',
    venueDetails: `
- Karambezi Cafe: Sea Cliff Hotel, Toure Drive, Msasani - Iconic oceanfront dining, sunset cocktails, fresh seafood
- High Spirit Lounge: Ohio Street, CBD - Rooftop bar, panoramic city views, craft cocktails
- Samaki Samaki: Haile Selassie Road, Oyster Bay - Fresh seafood, live music, coastal vibes
- Slipway: Msasani Slipway - Shopping, dining, beach bar, family-friendly, boat views
- The Slow Leopard: Toure Drive, Msasani - Burgers, craft beers, live music, expat hangout
- Level 8: Hyatt Regency, Garden Ave - Luxury rooftop, harbor views, cocktails, jazz
- Havoc Nightspot: Ursino Street, Masaki - High-energy nightclub, DJ sets, young crowd
- Elements: Chole Road, Masaki - Chic cocktail bar, stylish crowd, innovative mixology
- Q-Bar: Haile Selassie Road, Oyster Bay - Live bands, craft beers, casual atmosphere
- Coco Beach: Ocean Road - Public beach, street food, sunset watching, family activities`
  }
};

// Default group plan types
const DEFAULT_PLAN_TYPES = [
  { type: 'couples', description: 'Romantic experiences for two - intimate venues, sunset moments, sophisticated atmosphere', targetAudience: 'couples, romantic partners, anniversaries, honeymoons' },
  { type: 'friend_groups', description: 'Social adventures for groups of friends - energetic venues, shared experiences, bonding moments', targetAudience: 'friend groups, reunions, celebrations, birthdays' },
  { type: 'girls_trips', description: 'Feminine getaways - glamorous spots, Instagrammable locations, chic vibes', targetAudience: 'girlfriends traveling together, bachelorette trips' },
  { type: 'girls_night_out', description: 'Ladies night celebrations - chic venues, dancing, cocktails, empowering atmosphere', targetAudience: 'ladies nights, hen parties' },
  { type: 'boys_night_out', description: 'Masculine adventures - high-energy venues, VIP experiences, memorable nights', targetAudience: 'stag parties, bachelor parties, guys weekends' },
  { type: 'luxury', description: 'Premium experiences - five-star hotels, high-end dining, VIP lounges, exclusive access, refined elegance', targetAudience: 'luxury travelers, affluent couples, business travelers, special occasions' },
  { type: 'family', description: 'Family-friendly excursions - kid-friendly venues, parks, museums, cultural tours, zoos, educational and fun activities for all ages', targetAudience: 'families with children, multi-generational groups, parents with kids' },
  { type: 'free_experiences', description: 'Budget-friendly adventures - public parks, street art, free museums, walking tours, markets, scenic viewpoints, no-cost activities', targetAudience: 'budget travelers, students, backpackers, locals exploring' },
  { type: 'romantic', description: 'Romantic date experiences - candlelit dinners, sunset spots, scenic walks, intimate venues, couples activities', targetAudience: 'couples, date nights, anniversaries, proposals, honeymoons' }
];

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
  planType: string;
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
    const { city = 'Ibiza', storeResults = true } = body;

    const config = CITY_CONFIGS[city];
    if (!config) {
      return errorResponse(`Unknown city: ${city}. Supported: Ibiza, Paris`, 400, 'INVALID_CITY');
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`${city.toUpperCase()} 7-AGENT PIPELINE (GPT-4o) - WITH TAG GENERATOR`);
    console.log(`${'='.repeat(70)}\n`);

    const startTime = Date.now();
    const agentResults: AgentResult[] = [];
    let plans: GroupPlan[] = [];

    // ===== AGENT 1: GENERATOR =====
    console.log(`\n[AGENT 1] GENERATOR - Creating 9 default group plans...`);
    const agent1Start = Date.now();
    plans = await agent1_generateDefaultPlans(config);
    agentResults.push({
      agent: 'Agent 1: Generator (9 Default Types)',
      duration: Date.now() - agent1Start,
      input: 0,
      output: plans.length,
      changes: plans.map(p => `${p.planType}: ${p.title}`),
    });
    console.log(`[AGENT 1] Generated ${plans.length} plans`);

    if (plans.length === 0) {
      return jsonResponse({ success: false, error: 'No plans generated', agentResults });
    }

    // ===== AGENT 2: DETAILS VALIDATOR =====
    console.log(`\n[AGENT 2] DETAILS VALIDATOR...`);
    const agent2Start = Date.now();
    const agent2Result = await agent2_validateDetails(plans, config);
    plans = agent2Result.plans;
    agentResults.push({
      agent: 'Agent 2: Details Validator',
      duration: Date.now() - agent2Start,
      input: agent2Result.inputCount,
      output: plans.length,
      changes: agent2Result.changes,
    });

    if (plans.length === 0) {
      return jsonResponse({ success: false, error: 'All plans failed validation', agentResults });
    }

    // ===== AGENT 3: ADDRESS VALIDATOR =====
    console.log(`\n[AGENT 3] ADDRESS VALIDATOR...`);
    const agent3Start = Date.now();
    const agent3Result = await agent3_validateAddresses(plans, config);
    plans = agent3Result.plans;
    agentResults.push({
      agent: 'Agent 3: Address Validator',
      duration: Date.now() - agent3Start,
      input: agent3Result.inputCount,
      output: plans.length,
      changes: agent3Result.changes,
    });

    if (plans.length === 0) {
      return jsonResponse({ success: false, error: 'All plans failed address validation', agentResults });
    }

    // ===== AGENT 4: DESCRIPTION EDITOR =====
    console.log(`\n[AGENT 4] DESCRIPTION EDITOR...`);
    const agent4Start = Date.now();
    const agent4Result = await agent4_editDescriptions(plans, config);
    plans = agent4Result.plans;
    agentResults.push({
      agent: 'Agent 4: Description Editor',
      duration: Date.now() - agent4Start,
      input: plans.length,
      output: plans.length,
      changes: agent4Result.changes,
    });

    // ===== AGENT 5: QUALITY GATE =====
    console.log(`\n[AGENT 5] QUALITY GATE...`);
    const agent5Start = Date.now();
    const agent5Result = await agent5_qualityGate(plans, config);
    plans = agent5Result.plans;
    agentResults.push({
      agent: 'Agent 5: Quality Gate (City-Unique Titles)',
      duration: Date.now() - agent5Start,
      input: agent5Result.inputCount,
      output: plans.length,
      changes: agent5Result.changes,
    });

    if (plans.length === 0) {
      return jsonResponse({ success: false, error: 'All plans failed quality gate', agentResults });
    }

    // ===== AGENT 6: COMMS SPECIALIST =====
    console.log(`\n[AGENT 6] COMMS SPECIALIST - Crafting descriptions...`);
    const agent6Start = Date.now();
    const agent6Result = await agent6_commsSpecialist(plans, config);
    plans = agent6Result.plans;
    agentResults.push({
      agent: 'Agent 6: Comms Specialist',
      duration: Date.now() - agent6Start,
      input: plans.length,
      output: plans.length,
      changes: agent6Result.changes,
    });
    console.log(`[AGENT 6] Enhanced ${agent6Result.descriptionsEnhanced} descriptions`);

    // ===== AGENT 7: TAG GENERATOR =====
    console.log(`\n[AGENT 7] TAG GENERATOR - Generating bestFor tags...`);
    const agent7Start = Date.now();
    const agent7Result = await agent7_tagGenerator(plans, config);
    plans = agent7Result.plans;
    agentResults.push({
      agent: 'Agent 7: Tag Generator',
      duration: Date.now() - agent7Start,
      input: plans.length,
      output: plans.length,
      changes: agent7Result.changes,
    });
    console.log(`[AGENT 7] Generated tags for ${agent7Result.plansTagged} plans`);

    // ===== STORE RESULTS =====
    let storedCount = 0;
    if (storeResults && plans.length > 0) {
      console.log(`\n[STORAGE] Saving ${plans.length} plans...`);
      const supabase = createServiceClient();
      const { data: cityData } = await supabase
        .from('City')
        .select('id')
        .eq('name', city)
        .single();

      if (cityData) {
        storedCount = await storePlans(supabase, plans, cityData.id, city.toLowerCase(), agent5Result.scores);
      }
    }

    const totalDuration = Date.now() - startTime;

    console.log(`\n${'='.repeat(70)}`);
    console.log(`${city.toUpperCase()} 7-AGENT PIPELINE COMPLETE`);
    console.log(`Total: ${Math.round(totalDuration / 1000)}s | Generated: ${agentResults[0].output} | Approved: ${plans.length} | Stored: ${storedCount}`);
    console.log(`${'='.repeat(70)}\n`);

    return jsonResponse({
      success: true,
      data: {
        city,
        aiModel: 'GPT-4o',
        pipeline: '7-agent',
        agentResults,
        finalPlans: plans.map(plan => ({
          title: plan.title,
          planType: plan.planType,
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
          bestFor: plan.bestFor,
          tags: plan.aiTags,
          qualityScore: agent5Result.scores.find(s => s.title === plan.title)?.score || 0,
        })),
        summary: {
          totalGenerated: agentResults[0].output,
          totalApproved: plans.length,
          totalStored: storedCount,
          averageScore: Math.round(
            agent5Result.scores.filter(s => s.passed).reduce((sum, s) => sum + s.score, 0) / (plans.length || 1)
          ),
          totalDuration,
        },
      },
    });

  } catch (error) {
    console.error('[6agent-pipeline] Error:', error);
    return errorResponse((error as Error).message, 500, 'SERVER_ERROR');
  }
});

// ===== AGENT 1: GENERATOR =====
async function agent1_generateDefaultPlans(config: any): Promise<GroupPlan[]> {
  const systemPrompt = `You are an elite nightlife and experiences curator for ${config.cityName}, ${config.country}.

CITY IDENTITY: ${config.identity}
CITY VIBE: ${config.vibe}

Generate exactly 9 group plans, one for each type:
1. COUPLES - romantic, intimate
2. FRIEND_GROUPS - social, energetic
3. GIRLS_TRIPS - glamorous, Instagrammable
4. GIRLS_NIGHT_OUT - chic, dancing
5. BOYS_NIGHT_OUT - high-energy, VIP
6. LUXURY - premium experiences, five-star venues, VIP access
7. FAMILY - kid-friendly activities, parks, museums, cultural tours
8. FREE_EXPERIENCES - no-cost activities, public parks, markets, walking tours
9. ROMANTIC - candlelit dinners, sunset spots, couples activities

DAY DISTRIBUTION RULES:
- Nightclubs/Clubs → Friday & Saturday ONLY
- Family activities (zoo, museum, parks) → Saturday & Sunday
- Cultural activities/tours → Saturday & Sunday
- Restaurants → Spread across weekdays (Mon-Thu)
- Rooftop/Cocktail bars → Thursday-Saturday
- Luxury experiences → Thursday-Saturday
- Free experiences (parks, markets) → Any day, prefer weekends
- Romantic date nights → Friday & Saturday primarily

═══════════════════════════════════════════════════════════════════════════════
TIMING & TRAVEL CONTEXT - CRITICAL!
═══════════════════════════════════════════════════════════════════════════════

When scheduling activities, you MUST account for:
1. DURATION at each venue (how long you'll spend there)
2. TRAVEL TIME between venues (typically 10-20 minutes depending on distance)
3. The NEXT venue's start time should be: current_start + duration + travel_time

EXAMPLE - CORRECT TIMING:
- Venue 1: Starts 18:00, Duration 90min, ends ~19:30
- Travel to Venue 2: ~15 minutes
- Venue 2: Starts 19:45 (NOT 19:00!), Duration 120min, ends ~21:45
- Travel to Venue 3: ~20 minutes
- Venue 3: Starts 22:05 (NOT 21:00!)

EXAMPLE - WRONG TIMING (DO NOT DO THIS):
- Venue 1: Starts 18:00, Duration 90min
- Venue 2: Starts 19:00 (WRONG! Venue 1 doesn't end until 19:30)

TIMING GUIDELINES BY ACTIVITY TYPE:
- Dinner: 90-120 minutes
- Cocktail bar: 60-90 minutes
- Club/Nightlife: 120-180 minutes
- Beach/Park: 90-120 minutes
- Museum/Cultural: 60-90 minutes
- Travel within same neighborhood: 10 minutes
- Travel between neighborhoods: 15-25 minutes

═══════════════════════════════════════════════════════════════════════════════
PLAN TYPE → START TIME MAPPING (CRITICAL!)
═══════════════════════════════════════════════════════════════════════════════

NOT ALL PLANS ARE NIGHT PLANS! Match start times to the experience:

🌅 MORNING/DAYTIME PLANS (Start 09:00-11:00):
- FAMILY: Start at 09:00-10:00 - Kids are energetic in morning, parks/museums open early
  Example: "Family Fun Day" → 10:00 zoo → 12:30 lunch → 14:30 park
- FREE_EXPERIENCES: Start at 09:00-10:00 - Markets, walking tours, public spaces
  Example: "Exploring the City" → 09:30 market → 11:30 walking tour → 14:00 viewpoint
- GIRLS_TRIPS (day adventure): Start at 10:00-11:00 - Shopping, brunch, spa
  Example: "Glamorous Girls Getaway" → 10:00 brunch → 12:30 shopping → 15:00 spa

☀️ AFTERNOON PLANS (Start 14:00-17:00):
- BOYS_TRIPS (adventure): Start at 14:00-15:00 - Beach, sports, activities
  Example: "Conquering the Island" → 14:00 beach club → 17:00 sunset spot → 19:30 dinner
- FRIEND_GROUPS (day hang): Start at 14:00-16:00 - Casual activities, food crawls
  Example: "Friendship Fiesta" → 14:00 lunch → 16:30 activity → 19:00 drinks

🌆 SUNSET/EVENING PLANS (Start 17:00-19:00):
- COUPLES: Start at 17:30-18:30 - Romantic sunset + dinner
  Example: "Romantic Sunset" → 17:30 rooftop → 19:30 dinner → 22:00 lounge
- ROMANTIC: Start at 18:00-19:00 - Dinner dates, intimate venues
  Example: "Intimate Evening" → 18:30 wine bar → 20:30 dinner → 22:30 walk
- LUXURY: Start at 17:00-18:00 - High-end experiences, sunset cocktails
  Example: "Opulent Experience" → 17:00 spa → 19:30 fine dining → 22:00 lounge

🌙 NIGHT PLANS (Start 20:00-22:00):
- GIRLS_NIGHT_OUT: Start at 20:00-21:00 - Dinner then dancing
  Example: "Chic Ladies Night" → 20:00 dinner → 22:30 cocktails → 00:30 club
- BOYS_NIGHT_OUT: Start at 20:00-21:00 - Pre-drinks then party
  Example: "Gentlemen's Night" → 20:00 steakhouse → 22:30 bar → 01:00 club
- FRIEND_GROUPS (night out): Start at 19:00-20:00 - Social evening
  Example: "Night on the Town" → 19:30 dinner → 22:00 bar → 00:00 club

⚠️ MATCHING TITLE TO TIME:
- Titles with "Day", "Morning", "Brunch", "Exploration", "Tour", "Museum" → DAYTIME
- Titles with "Sunset", "Evening", "Dinner" → SUNSET/EVENING
- Titles with "Night", "After Dark", "Nightlife", "Party" → NIGHT
- Family/Kids activities → ALWAYS DAYTIME (09:00-10:00 start)

═══════════════════════════════════════════════════════════════════════════════

CRITICAL: Titles MUST be UNIQUE to ${config.cityName} - NO generic titles!
VENUES: ${config.legendaryVenues}
AREAS: ${config.neighborhoods.join(', ')}

Each plan needs 3 activities with real venues, addresses, coordinates.
RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Generate 9 group plans for ${config.cityName}:

${DEFAULT_PLAN_TYPES.map((t, i) => `${i + 1}. ${t.type.toUpperCase()}: ${t.description}`).join('\n')}

Return JSON:
{
  "plans": [{
    "title": "Unique city-specific title",
    "planType": "couples|friend_groups|girls_trips|girls_night_out|boys_night_out",
    "description": "Brief description",
    "activities": [{
      "venueName": "Venue",
      "address": "Full Address with postal code",
      "coordinates": { "latitude": X.XXX, "longitude": X.XXX },
      "startTime": "HH:MM",
      "duration": 90,
      "description": "Initial description",
      "order": 1
    }],
    "totalDuration": 300,
    "estimatedCost": { "min": 100, "max": 200, "currency": "${config.currency}" },
    "difficulty": "moderate",
    "bestFor": ["couples"],
    "aiTags": ["romantic"]
  }]
}`;

  const response = await gptRequest([{ role: 'user', content: userPrompt }], {
    systemPrompt,
    temperature: 0.9,
    maxTokens: 10000,
    jsonMode: true,
  });

  return parseGPTJSON<{ plans: GroupPlan[] }>(response).plans || [];
}

// ===== AGENT 2: DETAILS VALIDATOR (RELAXED) =====
async function agent2_validateDetails(plans: GroupPlan[], config: any): Promise<{
  plans: GroupPlan[];
  inputCount: number;
  removed: number;
  changes: string[];
}> {
  const systemPrompt = `You validate ${config.cityName} venues with a RELAXED approach.

KNOWN VENUES (for reference):
${config.venueDetails}

VALIDATION APPROACH - BE LENIENT:
1. KEEP plans if venues are PLAUSIBLE for ${config.cityName} (real restaurants, bars, clubs, hotels, beaches, parks)
2. KEEP plans if the venue TYPE exists in ${config.cityName} (e.g., "rooftop bar in Masaki" is plausible)
3. ONLY REMOVE if the venue is clearly FICTIONAL or IMPOSSIBLE (e.g., "Hogwarts Castle")
4. Coordinates in general ${config.cityName} area are acceptable: lat ${config.coordRange.lat[0]}-${config.coordRange.lat[1]}, lon ${config.coordRange.lon[0]}-${config.coordRange.lon[1]}

GOAL: Keep as many plans as possible while ensuring venues are realistic.

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Validate these ${plans.length} plans with RELAXED criteria (keep plausible venues):
${JSON.stringify(plans.map(p => ({ title: p.title, activities: p.activities.map(a => ({ venue: a.venueName, address: a.address })) })), null, 2)}

Return JSON:
{ "validations": [{ "title": "Plan Title", "status": "keep" | "remove", "reason": "Why" }] }`;

  const response = await gptRequest([{ role: 'user', content: userPrompt }], {
    systemPrompt,
    temperature: 0.2,
    maxTokens: 4096,
    jsonMode: true,
  });

  const result = parseGPTJSON<{ validations: { title: string; status: string; reason: string }[] }>(response);
  const keptPlans: GroupPlan[] = [];
  const changes: string[] = [];

  for (const plan of plans) {
    const v = result.validations.find(v => v.title === plan.title);
    if (v?.status === 'keep') keptPlans.push(plan);
    else changes.push(`REMOVED: ${plan.title}`);
  }

  return { plans: keptPlans, inputCount: plans.length, removed: plans.length - keptPlans.length, changes };
}

// ===== AGENT 3: ADDRESS VALIDATOR (RELAXED - CORRECT ONLY, NO REMOVE) =====
async function agent3_validateAddresses(plans: GroupPlan[], config: any): Promise<{
  plans: GroupPlan[];
  inputCount: number;
  corrected: number;
  removed: number;
  changes: string[];
}> {
  const systemPrompt = `You are an address specialist for ${config.cityName}.

REFERENCE ADDRESSES:
${config.venueDetails}

YOUR JOB: CORRECT addresses, NEVER REMOVE plans.
- If address is wrong, provide the CORRECT address and coordinates
- If address format is incomplete, COMPLETE it with neighborhood and city
- If you're unsure of exact address, use a PLAUSIBLE address in the correct neighborhood
- Coordinates should be in ${config.cityName} area: lat ${config.coordRange.lat[0]}-${config.coordRange.lat[1]}, lon ${config.coordRange.lon[0]}-${config.coordRange.lon[1]}

NEVER use "remove" action - always keep or keep_corrected.
RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Correct/complete these addresses (DO NOT REMOVE any plans):
${plans.map((p, i) => `PLAN ${i + 1}: ${p.title}\n${p.activities.map(a => `- ${a.venueName}: ${a.address}`).join('\n')}`).join('\n\n')}

Return JSON (use "keep" or "keep_corrected" ONLY, never "remove"):
{
  "results": [{
    "title": "Plan Title",
    "action": "keep" | "keep_corrected",
    "correctedActivities": [{ "venueName": "V", "address": "Corrected", "coordinates": { "latitude": X, "longitude": X } }]
  }]
}`;

  const response = await gptRequest([{ role: 'user', content: userPrompt }], {
    systemPrompt,
    temperature: 0.2,
    maxTokens: 4096,
    jsonMode: true,
  });

  const result = parseGPTJSON<{ results: { title: string; action: string; correctedActivities?: any[] }[] }>(response);
  const outputPlans: GroupPlan[] = [];
  const changes: string[] = [];
  let corrected = 0, removed = 0;

  for (const plan of plans) {
    const v = result.results.find(r => r.title === plan.title);
    if (v?.action === 'remove') {
      removed++;
      changes.push(`REMOVED: ${plan.title}`);
    } else if (v?.action === 'keep_corrected' && v.correctedActivities) {
      corrected++;
      const correctedPlan = { ...plan };
      correctedPlan.activities = plan.activities.map(a => {
        const c = v.correctedActivities?.find(c => c.venueName === a.venueName);
        return c ? { ...a, address: c.address, coordinates: c.coordinates } : a;
      });
      outputPlans.push(correctedPlan);
      changes.push(`CORRECTED: ${plan.title}`);
    } else {
      outputPlans.push(plan);
    }
  }

  return { plans: outputPlans, inputCount: plans.length, corrected, removed, changes };
}

// ===== AGENT 4: DESCRIPTION EDITOR =====
async function agent4_editDescriptions(plans: GroupPlan[], config: any): Promise<{
  plans: GroupPlan[];
  edited: number;
  changes: string[];
}> {
  const systemPrompt = `You polish descriptions for ${config.cityName} venues. Keep them 15-25 words. Focus on atmosphere.
RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Polish descriptions:
${plans.map((p, i) => `PLAN ${i + 1}: ${p.title}\n${p.activities.map(a => `- ${a.venueName}: "${a.description}"`).join('\n')}`).join('\n\n')}

Return JSON:
{ "plans": [{ "title": "Plan Title", "activities": [{ "venueName": "V", "description": "Polished" }] }] }`;

  const response = await gptRequest([{ role: 'user', content: userPrompt }], {
    systemPrompt,
    temperature: 0.7,
    maxTokens: 4096,
    jsonMode: true,
  });

  const result = parseGPTJSON<{ plans: { title: string; activities: { venueName: string; description: string }[] }[] }>(response);
  let edited = 0;

  const outputPlans = plans.map(plan => {
    const ep = result.plans.find(p => p.title === plan.title);
    if (!ep) return plan;
    const activities = plan.activities.map(a => {
      const ea = ep.activities.find(e => e.venueName === a.venueName);
      if (ea) { edited++; return { ...a, description: ea.description }; }
      return a;
    });
    return { ...plan, activities };
  });

  return { plans: outputPlans, edited, changes: [] };
}

// ===== AGENT 5: QUALITY GATE =====
async function agent5_qualityGate(plans: GroupPlan[], config: any): Promise<{
  plans: GroupPlan[];
  inputCount: number;
  scores: { title: string; score: number; passed: boolean; titleUnique: boolean }[];
  changes: string[];
}> {
  const systemPrompt = `You are the quality gate for ${config.cityName} group plans.

CRITICAL: Titles must be UNIQUE to ${config.cityName} - NOT generic!
REJECT: "Couples Night Out", "Girls Trip", "Boys Night"
ACCEPT: Titles referencing ${config.cityName}'s identity

Score 90-100: Exceptional | 80-89: Good | 70-79: Acceptable | Below 70: REJECT
RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Score these plans:
${plans.map((p, i) => `${i + 1}. "${p.title}" (${p.planType}) - Venues: ${p.activities.map(a => a.venueName).join(' → ')}`).join('\n')}

Return JSON:
{ "scores": [{ "title": "Title", "score": 85, "passed": true, "titleUnique": true, "suggestedTitle": "Better title if needed" }] }`;

  const response = await gptRequest([{ role: 'user', content: userPrompt }], {
    systemPrompt,
    temperature: 0.3,
    maxTokens: 2048,
    jsonMode: true,
  });

  const result = parseGPTJSON<{ scores: { title: string; score: number; passed: boolean; titleUnique: boolean; suggestedTitle?: string }[] }>(response);
  const changes: string[] = [];
  const scores = result.scores.map(s => ({ title: s.title, score: s.score, passed: s.score >= 70, titleUnique: s.titleUnique }));

  const outputPlans = plans.map(plan => {
    const s = result.scores.find(s => s.title === plan.title);
    if (s?.suggestedTitle && !s.titleUnique) {
      changes.push(`TITLE: "${plan.title}" → "${s.suggestedTitle}"`);
      return { ...plan, title: s.suggestedTitle };
    }
    return plan;
  }).filter(plan => {
    const s = scores.find(sc => sc.title === plan.title);
    return s?.passed;
  });

  return { plans: outputPlans, inputCount: plans.length, scores, changes };
}

// ===== AGENT 6: COMMS SPECIALIST (UPDATED) =====
async function agent6_commsSpecialist(plans: GroupPlan[], config: any): Promise<{
  plans: GroupPlan[];
  descriptionsEnhanced: number;
  changes: string[];
}> {
  const systemPrompt = `You are an ELITE COMMUNICATIONS SPECIALIST for ${config.cityName}.

YOUR TASKS:
1. Write a captivating GROUP PLAN description (max 2 sentences, max 25 words)
2. Write a BRIEF VENUE DESCRIPTION for each location (1 sentence, 10-15 words)

VENUE DESCRIPTION FORMAT (CRITICAL):
- EXACTLY 1 sentence, 10-15 words
- Direct and factual - describes what you'll experience
- Mention what makes the venue iconic/special
- Format: "[Activity] at [adjective] [venue name] with [unique feature]."

EXAMPLES OF PERFECT VENUE DESCRIPTIONS:
- "Sunset cocktails at the iconic Skybar with stunning city views."
- "World-class techno at legendary DC-10 with raw underground energy."
- "Craft cocktails at hidden Candelaria speakeasy behind a taqueria."
- "Jazz sessions at intimate Duc des Lombards with world-class musicians."

CITY CONTEXT:
- City: ${config.cityName}
- Identity: ${config.identity}
- Vibe: ${config.vibe}

VENUE KNOWLEDGE:
${config.venueDetails}

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Craft descriptions for each plan and venue:

${plans.map((p, i) => `
PLAN ${i + 1}: "${p.title}" (${p.planType})
For: ${p.bestFor.join(', ')}

Venues:
${p.activities.map(a => `- ${a.venueName} at ${a.address}`).join('\n')}
`).join('\n---\n')}

For each plan:
1. Write captivating plan description (max 25 words, 2 sentences)
2. For each venue, write BRIEF description (1 sentence, 10-15 words, direct, factual)

Return JSON:
{
  "enhancedPlans": [{
    "title": "Plan Title",
    "planDescription": "Captivating 2-sentence overview",
    "activities": [{
      "venueName": "Venue Name",
      "briefDescription": "1 sentence, 10-15 words, direct and factual"
    }]
  }]
}`;

  const response = await gptRequest([{ role: 'user', content: userPrompt }], {
    systemPrompt,
    temperature: 0.8,
    maxTokens: 6000,
    jsonMode: true,
  });

  const result = parseGPTJSON<{
    enhancedPlans: {
      title: string;
      planDescription: string;
      activities: { venueName: string; briefDescription: string }[];
    }[]
  }>(response);

  const changes: string[] = [];
  let descriptionsEnhanced = 0;

  const outputPlans = plans.map(plan => {
    const enhanced = result.enhancedPlans.find(e => e.title === plan.title);
    if (!enhanced) return plan;

    const updatedPlan = {
      ...plan,
      description: enhanced.planDescription || plan.description,
    };

    updatedPlan.activities = plan.activities.map(activity => {
      const ea = enhanced.activities.find(a => a.venueName === activity.venueName);
      if (ea?.briefDescription) {
        descriptionsEnhanced++;
        changes.push(`${activity.venueName}: "${ea.briefDescription}"`);
        return { ...activity, description: ea.briefDescription };
      }
      return activity;
    });

    return updatedPlan;
  });

  return { plans: outputPlans, descriptionsEnhanced, changes };
}

// ===== AGENT 7: TAG GENERATOR =====
// Available tags for group plans
const VALID_TAGS = [
  // Relationship-based tags
  'couples', 'romantic', 'date_night', 'anniversary', 'honeymoon', 'proposal',
  // Friend group tags
  'friends', 'squad', 'reunion', 'birthday', 'celebration',
  // Gendered group tags
  'girls_nightout', 'girls_trip', 'bachelorette', 'boys_night', 'bachelor', 'stag',
  // Experience-based tags
  'adventure', 'thrill_seekers', 'cultural', 'artsy', 'sophisticated', 'foodie', 'culinary',
  // Vibe-based tags
  'party', 'wild', 'clubbing', 'chill', 'relaxed', 'low_key', 'energetic',
  // Occasion tags
  'vip', 'luxury', 'exclusive', 'premium', 'five_star', 'upscale',
  // Practical tags
  'budget_friendly', 'affordable', 'free', 'no_cost', 'instagram_worthy', 'photogenic', 'late_night', 'early_evening',
  // Family tags
  'family_friendly', 'kids', 'all_ages', 'educational', 'outdoor', 'daytime',
  // Free experience tags
  'walking_tour', 'street_art', 'market', 'scenic', 'viewpoint', 'beach', 'park',
];

async function agent7_tagGenerator(plans: GroupPlan[], config: any): Promise<{
  plans: GroupPlan[];
  plansTagged: number;
  changes: string[];
}> {
  const systemPrompt = `You are an expert at categorizing nightlife and entertainment experiences for diverse audiences.

Your job is to analyze group plans and assign the most appropriate audience tags that describe WHO this experience is perfect for.

PRINCIPLES:
1. BE SPECIFIC - "girls_nightout" is better than just "friends" for a club-hopping plan with cocktails
2. CONSIDER THE VENUES - rooftop bars suggest "romantic" or "instagram_worthy", dive bars suggest "chill"
3. CONSIDER THE PRICE - expensive venues suggest "luxury" or "vip", budget options suggest "budget_friendly"
4. CONSIDER THE VIBE - multiple clubs suggest "party" or "wild", jazz bars suggest "sophisticated"
5. MATCH THE PLAN TYPE - if it's for couples, include "couples" tag; if for girls, include "girls_nightout" etc.
6. LIMIT TAGS - quality over quantity, only assign tags that truly fit

CITY CONTEXT:
- City: ${config.cityName}
- Identity: ${config.identity}
- Vibe: ${config.vibe}

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Analyze these ${plans.length} group plans and assign appropriate audience tags (up to 5 tags per plan):

${plans.map((p, i) => `
PLAN ${i + 1}: "${p.title}" (${p.planType})
Description: ${p.description}
Venues: ${p.activities.map(a => a.venueName).join(' → ')}
Cost: ${p.estimatedCost.min}-${p.estimatedCost.max} ${p.estimatedCost.currency}
`).join('\n---\n')}

AVAILABLE TAGS (choose from these ONLY):
${VALID_TAGS.join(', ')}

Return JSON:
{
  "taggedPlans": [{
    "title": "Plan Title",
    "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
    "primaryTag": "most_relevant_tag",
    "reasoning": "Brief explanation"
  }]
}`;

  const response = await gptRequest([{ role: 'user', content: userPrompt }], {
    systemPrompt,
    temperature: 0.5,
    maxTokens: 4096,
    jsonMode: true,
  });

  const result = parseGPTJSON<{
    taggedPlans: {
      title: string;
      tags: string[];
      primaryTag: string;
      reasoning: string;
    }[]
  }>(response);

  const changes: string[] = [];
  let plansTagged = 0;

  const outputPlans = plans.map(plan => {
    const tagged = result.taggedPlans.find(t => t.title === plan.title);
    if (!tagged) return plan;

    // Validate tags against allowed list
    const validatedTags = tagged.tags.filter(tag => VALID_TAGS.includes(tag)).slice(0, 5);
    const primaryTag = VALID_TAGS.includes(tagged.primaryTag) ? tagged.primaryTag : validatedTags[0] || 'friends';

    if (validatedTags.length > 0) {
      plansTagged++;
      changes.push(`${plan.title}: [${validatedTags.join(', ')}] (primary: ${primaryTag})`);
    }

    return {
      ...plan,
      bestFor: validatedTags,
      aiTags: validatedTags,
    };
  });

  return { plans: outputPlans, plansTagged, changes };
}

// ===== STORAGE (TEST-RELAXED - NO DELETE, DIFFERENT PREFIX) =====
async function storePlans(
  supabase: any,
  plans: GroupPlan[],
  cityId: string,
  citySlug: string,
  scores: { title: string; score: number }[]
): Promise<number> {
  let stored = 0;
  const timestamp = Date.now();

  // NOTE: Using "test-relaxed" prefix - DOES NOT delete existing plans
  // Only deletes previous test-relaxed runs for this city
  await supabase.from('GroupFlowStep').delete().like('flowId', `gf-${citySlug}-test-relaxed%`);
  await supabase.from('GroupFlow').delete().like('id', `gf-${citySlug}-test-relaxed%`);
  await supabase.from('Plan').delete().like('id', `plan-${citySlug}-test-relaxed%`);

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const score = scores.find(s => s.title === plan.title)?.score || 0;
    const flowId = `gf-${citySlug}-test-relaxed-${timestamp}-${i}`;

    // Get appropriate day for this plan type
    const dayInfo = getDateForPlanType(plan.planType);
    console.log(`[storage] ${plan.planType} → ${dayInfo.weekday} (${dayInfo.date})`);

    // Create Plan records
    const activityPlanIds: string[] = [];
    for (let j = 0; j < plan.activities.length; j++) {
      const activity = plan.activities[j];
      const activityPlanId = `plan-${citySlug}-test-relaxed-${timestamp}-${i}-${j}`;

      await supabase.from('Plan').insert({
        id: activityPlanId,
        planId: `${citySlug}-test-relaxed-${timestamp}-${i}-${j}`,
        title: activity.venueName,
        venueName: activity.venueName,
        description: activity.description,
        category: 'nightlife',
        type: 'EVENT',
        cityId: cityId,
        date: dayInfo.date,
        weekday: dayInfo.weekday,
        isWeekend: dayInfo.isWeekend,
        startTime: activity.startTime,
        endTime: calculateEndTime(activity.startTime, activity.duration),
        latitude: activity.coordinates.latitude,
        longitude: activity.coordinates.longitude,
        address: activity.address,
        neighborhood: 'City Center',
        priceRange: '$$',
        entryFee: 0,
        freeEntry: false,
        currency: plan.estimatedCost.currency,
        rank: j + 1,
        source: 'ai-agent-test-relaxed',
        aiGenerated: true,
        isIndividual: true,
        isGroup: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      activityPlanIds.push(activityPlanId);
    }

    // Create GroupFlow
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
        isWeekend: dayInfo.isWeekend,
        proOnly: i >= 2,
        aiGenerated: true,
        isTemporary: false,
        theme: 'nightlife',
        difficulty: plan.difficulty,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (flowError) continue;

    // Create GroupFlowSteps
    for (let j = 0; j < plan.activities.length; j++) {
      const activity = plan.activities[j];
      await supabase.from('GroupFlowStep').insert({
        id: `${flowId}-step-${activity.order}`,
        flowId: flow.id,
        planId: activityPlanIds[j],
        stepNumber: activity.order,
        title: activity.venueName,
        venueName: activity.venueName,
        duration: activity.duration,
      });
    }

    stored++;
    console.log(`[storage] Stored: ${plan.title} - ${score}/100`);
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

/**
 * DAY DISTRIBUTION LOGIC
 * Assigns appropriate days based on plan type to avoid all plans on same day.
 * Returns a date string for the upcoming week.
 */
function getDateForPlanType(planType: string): { date: string; weekday: string; isWeekend: boolean } {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Day mapping for each plan type (0 = Sunday, 6 = Saturday)
  const planTypeDayMap: Record<string, number[]> = {
    'couples': [5, 6],           // Friday, Saturday
    'friend_groups': [5, 6],     // Friday, Saturday
    'girls_trips': [6],          // Saturday
    'girls_night_out': [5, 6],   // Friday, Saturday
    'boys_night_out': [5, 6],    // Friday, Saturday
    'luxury': [4, 5, 6],         // Thursday, Friday, Saturday
    'family': [0, 6],            // Sunday, Saturday
    'free_experiences': [0, 6],  // Sunday, Saturday
    'romantic': [5, 6],          // Friday, Saturday
  };

  const allowedDays = planTypeDayMap[planType] || [5, 6]; // Default to weekend

  // Pick a day from the allowed days (distribute by using planType hash)
  const dayIndex = planType.length % allowedDays.length;
  const targetDay = allowedDays[dayIndex];

  // Calculate the date for the next occurrence of this day
  let daysUntilTarget = targetDay - currentDay;
  if (daysUntilTarget <= 0) {
    daysUntilTarget += 7; // Next week
  }

  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + daysUntilTarget);

  const dateString = targetDate.toISOString().split('T')[0];
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekday = weekdayNames[targetDay];
  const isWeekend = targetDay === 0 || targetDay === 6;

  return { date: dateString, weekday, isWeekend };
}
