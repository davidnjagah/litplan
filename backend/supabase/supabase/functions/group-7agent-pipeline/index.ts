/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Group 7-Agent Pipeline (GPT-4o) - ACTIVE SUPABASE FUNCTION
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * This is the ACTIVE group plan generation function called by Railway.
 * Railway Orchestrator → This Function → GPT-4o → Supabase Database
 *
 * RAILWAY URL: See RAILWAY_URL in backend/supabase/.env
 *              (Currently: https://litplan-production.up.railway.app)
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * 7-AGENT PIPELINE
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Agent 1: Generator - Creates 9 default plan types (couples, friend_groups,
 *          girls_trips, girls_night_out, boys_night_out, luxury, family,
 *          free_experiences, romantic)
 * Agent 2: Details Validator - Validates venue details and removes incorrect plans
 * Agent 3: Address Validator - Triple-checks and corrects addresses
 * Agent 4: Description Editor - Polishes descriptions for quality
 * Agent 5: Quality Gate - Ensures city-unique titles and quality scores
 * Agent 6: Comms Specialist - Crafts captivating descriptions
 * Agent 7: Tag Generator - Generates bestFor audience tags
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * SUPPORTED CITIES
 * ──────────────────────────────────────────────────────────────────────────────
 * Ibiza, Paris, Nairobi, Dar es Salaam, Cape Town, Lagos, New York, Los Angeles,
 * Miami, London, Madrid, Barcelona, Berlin, Tokyo, Amsterdam
 *
 * POST /group-7agent-pipeline
 * Body: { "city": "Ibiza" | "Paris" | "Nairobi" | "Dar es Salaam" | ..., "storeResults": true }
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
  },
  'Los Angeles': {
    cityName: 'Los Angeles',
    country: 'United States',
    currency: 'USD',
    identity: 'The City of Angels - Hollywood glamour, beach culture, diverse neighborhoods, celebrity hotspots, and endless entertainment',
    vibe: 'Glamorous, laid-back, creative, diverse, sun-kissed California dreaming',
    neighborhoods: ['Hollywood', 'West Hollywood', 'Beverly Hills', 'Santa Monica', 'Venice', 'Downtown LA', 'Silver Lake', 'Malibu', 'Los Feliz'],
    coordRange: { lat: [33.90, 34.15], lon: [-118.50, -118.15] },
    legendaryVenues: 'Chateau Marmont, The Abbey, Sunset Tower Hotel, Catch LA, Nobu Malibu, 1 OAK, Bootsy Bellows, The Nice Guy, Delilah, SoHo House West Hollywood, Erewhon, The Getty, Griffith Observatory',
    venueDetails: `
- Chateau Marmont: 8221 Sunset Blvd, West Hollywood - Legendary hotel bar, celebrity sanctuary, old Hollywood glamour
- The Abbey: 692 N Robertson Blvd, West Hollywood - Iconic LGBTQ+ club, dancing, drag shows, WeHo institution
- Sunset Tower Hotel: 8358 Sunset Blvd, West Hollywood - Art Deco landmark, celebrity bar, Tower Bar restaurant
- Catch LA: 8715 Melrose Ave, West Hollywood - Rooftop seafood, celebrity hotspot, stunning views
- Nobu Malibu: 22706 Pacific Coast Hwy, Malibu - Ocean views, celebrity favorite, Japanese cuisine
- 1 OAK: 9039 Sunset Blvd, West Hollywood - High-energy nightclub, celebrity sightings, VIP tables
- Bootsy Bellows: 9229 Sunset Blvd, West Hollywood - Exclusive club, celebrity owned, burlesque vibes
- The Nice Guy: 401 N La Cienega Blvd, West Hollywood - Speakeasy Italian, A-list crowd, paparazzi favorite
- Delilah: 7969 Santa Monica Blvd, West Hollywood - Supper club, live jazz, Old Hollywood elegance
- SoHo House West Hollywood: 9200 Sunset Blvd, West Hollywood - Members club, rooftop pool, creative industry
- Erewhon: Multiple locations - Organic market, celebrity smoothie bar, health-conscious LA lifestyle
- The Getty: 1200 Getty Center Dr, Brentwood - Free museum, stunning architecture, panoramic views
- Griffith Observatory: 2800 E Observatory Rd, Los Feliz - Free admission, iconic views, Hollywood sign`
  },
  'Miami': {
    cityName: 'Miami',
    country: 'United States',
    currency: 'USD',
    identity: 'The Magic City - Art Deco paradise, Latin rhythm, beach culture, world-class nightlife, and year-round tropical vibes',
    vibe: 'Electric, sultry, glamorous, multicultural, endless summer energy',
    neighborhoods: ['South Beach', 'Wynwood', 'Brickell', 'Downtown Miami', 'Little Havana', 'Design District', 'Coconut Grove', 'Key Biscayne', 'Miami Beach', 'Midtown'],
    coordRange: { lat: [25.70, 25.85], lon: [-80.30, -80.10] },
    legendaryVenues: 'LIV, Story, E11EVEN, Basement, Club Space, Do Not Sit On The Furniture, Floyd, The Wharf, Ball & Chain, Cecconi\'s, Juvia, Swan, Coyo Taco, The Surf Club, Faena Hotel, Pérez Art Museum',
    venueDetails: `
- LIV: 4441 Collins Ave, Miami Beach - Iconic nightclub, celebrity magnet, bottle service, high energy
- Story: 136 Collins Ave, Miami Beach - Late-night club, world-class DJs, underground vibes
- E11EVEN: 29 NE 11th St, Downtown - 24/7 ultraclub, performances, Vegas meets Miami
- Basement: 2901 Collins Ave, Miami Beach - Bowling, ice skating, nightclub under Faena
- Club Space: 34 NE 11th St, Downtown - Legendary techno temple, marathon parties, rooftop terrace
- Do Not Sit On The Furniture: 423 16th St, Miami Beach - Intimate house music, late night
- Floyd: 34 NE 11th St, Downtown - Underground techno, serious dancers, warehouse vibes
- The Wharf: 114 SW North River Dr, Downtown - Outdoor bar, food trucks, waterfront sunsets
- Ball & Chain: 1513 SW 8th St, Little Havana - Live salsa, Cuban vibes, historic venue
- Cecconi's: 4385 Collins Ave, Miami Beach - Italian elegance, Soho House, garden setting
- Juvia: 1111 Lincoln Rd, South Beach - Rooftop, French-Japanese-Peruvian fusion, stunning views
- Swan: 90 NE 39th St, Design District - David Grutman's chic restaurant, celeb hotspot
- Coyo Taco: 2300 NW 2nd Ave, Wynwood - Hidden speakeasy behind taqueria, craft cocktails
- The Surf Club: 9011 Collins Ave, Surfside - Historic glamour, Thomas Keller restaurant
- Faena Hotel: 3201 Collins Ave, Miami Beach - Art-filled luxury, gilded theater, stunning pool
- Pérez Art Museum: 1103 Biscayne Blvd, Downtown - Free first Saturdays, waterfront art, stunning architecture`
  },
  'Marbella': {
    cityName: 'Marbella',
    country: 'Spain',
    currency: 'EUR',
    identity: 'The Jewel of the Costa del Sol - glamorous Mediterranean playground, old town charm, beach clubs, and celebrity playground',
    vibe: 'Glamorous, sun-kissed, sophisticated, Mediterranean luxury, international jet-set',
    neighborhoods: ['Puerto Banús', 'Old Town (Casco Antiguo)', 'Golden Mile', 'San Pedro de Alcántara', 'Nueva Andalucía', 'La Zagaleta', 'Marbella Centro', 'Elviria'],
    coordRange: { lat: [36.48, 36.55], lon: [-5.00, -4.80] },
    legendaryVenues: 'Nikki Beach, Ocean Club, La Sala, Pangea, Puente Romano Beach Resort, Marbella Club Hotel, Buddha Beach, Bono Beach, Plaza de los Naranjos, Avenida del Mar, Nobu Marbella, El Patio de Beatas, Trocadero Arena, Funky Buddha, Olivia Valere, Suite del Mar',
    venueDetails: `
- Nikki Beach: Playa Hotel Don Carlos, Elviria - Iconic beach club, white beds, champagne lifestyle, celebrity hotspot
- Ocean Club: Avenida Lola Flores, Puerto Banús - Elegant pool club, sunset parties, Champagne spray
- La Sala: Puerto Banús - Restaurant and bar complex, expat favorite, live music
- Pangea: Centro Comercial Benabolá, Puerto Banús - Late-night club, house music, see-and-be-seen
- Puente Romano Beach Resort: Bulevar Principe Alfonso von Hohenlohe - Luxury beach resort, botanical gardens, multiple restaurants
- Marbella Club Hotel: Bulevar Principe Alfonso von Hohenlohe, Golden Mile - Historic luxury hotel, where Marbella glamour began
- Buddha Beach: Puerto Banús - Asian-inspired beach club, sunset drinks, trendy crowd
- Bono Beach: Playa de la Fontanilla - Casual beach club, local vibe, affordable luxury
- Plaza de los Naranjos: Casco Antiguo - Historic orange tree square, tapas bars, authentic old town
- Avenida del Mar: Marbella Centro - Dalí sculptures, seafront promenade, free outdoor gallery
- Nobu Marbella: Puente Romano - Celebrity chef restaurant, Japanese-Peruvian fusion
- El Patio de Beatas: Calle Beatas, Old Town - Hidden courtyard restaurant, romantic dining
- Trocadero Arena: Playa El Cable, Marbella - Beach restaurant, Mediterranean views
- Funky Buddha: Puerto Banús - Trendy nightclub, VIP tables, upscale party crowd
- Olivia Valere: Ctra. de Istán km 0.8 - Legendary nightclub, opulent decor, celebrity magnet
- Suite del Mar: Puente Romano - Beachfront lounge, sunset cocktails, romantic setting`
  },
  'London': {
    cityName: 'London',
    country: 'United Kingdom',
    currency: 'GBP',
    identity: 'The Capital - historic grandeur, world-class culture, diverse neighborhoods, legendary pubs, and cutting-edge nightlife',
    vibe: 'Sophisticated, diverse, historic yet modern, buzzing creative energy, quintessentially British',
    neighborhoods: ['Soho', 'Shoreditch', 'Camden', 'Notting Hill', 'Covent Garden', 'Mayfair', 'Brixton', 'Dalston', 'Hackney', 'Kensington', 'South Bank', 'Westminster'],
    coordRange: { lat: [51.45, 51.55], lon: [-0.20, -0.05] },
    legendaryVenues: 'Fabric, Ministry of Sound, XOYO, Ronnie Scott\'s, The Shard, Sky Garden, Ye Olde Cheshire Cheese, The Wolseley, Sketch, Chiltern Firehouse, The Connaught Bar, Annabel\'s, Loulou\'s, The Box',
    venueDetails: `
- Fabric: 77a Charterhouse St, EC1M 6HJ - Legendary superclub, techno temple, bodysonic dancefloor
- Ministry of Sound: 103 Gaunt St, SE1 6DP - Iconic dance music institution since 1991
- XOYO: 32-37 Cowper St, EC2A 4AP - Shoreditch club, diverse programming, intimate setting
- Ronnie Scott's: 47 Frith St, W1D 4HT - World-famous jazz club since 1959
- The Shard: 32 London Bridge St, SE1 9SG - Tallest building, panoramic views, cocktail bars
- Sky Garden: 20 Fenchurch St, EC3M 8AF - Free rooftop garden, stunning city views
- Ye Olde Cheshire Cheese: 145 Fleet St, EC4A 2BU - Historic pub since 1667, Dickens haunt
- The Wolseley: 160 Piccadilly, W1J 9EB - Grand European cafe, celebrity breakfast spot
- Sketch: 9 Conduit St, W1S 2XG - Pink room, Michelin star, art gallery
- Chiltern Firehouse: 1 Chiltern St, W1U 7PA - Celeb magnet, converted fire station
- The Connaught Bar: Carlos Pl, W1K 2AL - World's best bar, Art Deco elegance
- Annabel's: 46 Berkeley Sq, W1J 5AT - Exclusive private members club since 1963
- Loulou's: 5 Hertford St, W1J 7RH - Glamorous private club, celebrity haunt
- The Box: 11-12 Walker's Ct, W1F 0SD - Theatrical nightclub, provocative shows`
  }
};

// Default group plan types - FREE experiences listed FIRST to appear at top
const DEFAULT_PLAN_TYPES = [
  // FREE EXPERIENCES (3 types - appear first in listings)
  { type: 'free_daytime', description: 'Free daytime adventures - public parks, street art, free museums, walking tours, markets, scenic viewpoints, beaches, no-cost morning/afternoon activities', targetAudience: 'budget travelers, students, backpackers, locals exploring, families' },
  { type: 'free_sunset', description: 'Free sunset & evening experiences - waterfront promenades, sunset viewpoints, free outdoor concerts, night markets, beachfront walks, stargazing spots, no-cost twilight activities starting around 6-7pm', targetAudience: 'budget travelers, couples on a budget, locals, romantic budget dates' },
  { type: 'free_cultural', description: 'Free cultural explorations - historic districts, free museum days, street performances, cultural festivals, architectural walks, local traditions, heritage sites with no entry fee', targetAudience: 'culture enthusiasts, history buffs, students, budget travelers' },
  // PAID EXPERIENCES
  { type: 'couples', description: 'Romantic experiences for two - intimate venues, sunset moments, sophisticated atmosphere', targetAudience: 'couples, romantic partners, anniversaries, honeymoons' },
  { type: 'friend_groups', description: 'Social adventures for groups of friends - energetic venues, shared experiences, bonding moments', targetAudience: 'friend groups, reunions, celebrations, birthdays' },
  { type: 'girls_trips', description: 'Feminine getaways - glamorous spots, Instagrammable locations, chic vibes', targetAudience: 'girlfriends traveling together, bachelorette trips' },
  { type: 'girls_night_out', description: 'Ladies night celebrations - chic venues, dancing, cocktails, empowering atmosphere', targetAudience: 'ladies nights, hen parties' },
  { type: 'boys_night_out', description: 'Masculine adventures - high-energy venues, VIP experiences, memorable nights', targetAudience: 'stag parties, bachelor parties, guys weekends' },
  { type: 'luxury', description: 'Premium experiences - five-star hotels, high-end dining, VIP lounges, exclusive access, refined elegance', targetAudience: 'luxury travelers, affluent couples, business travelers, special occasions' },
  { type: 'family', description: 'Family-friendly excursions - kid-friendly venues, parks, museums, cultural tours, zoos, educational and fun activities for all ages', targetAudience: 'families with children, multi-generational groups, parents with kids' },
  { type: 'romantic', description: 'Romantic date experiences - candlelit dinners, sunset spots, scenic walks, intimate venues, couples activities', targetAudience: 'couples, date nights, anniversaries, proposals, honeymoons' }
];

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

// Background processing function - runs after response is sent
async function processPlansInBackground(city: string, config: any, jobId: string, storeResults: boolean) {
  const supabase = createServiceClient();

  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`[BACKGROUND] ${city.toUpperCase()} 7-AGENT PIPELINE STARTED`);
    console.log(`Job ID: ${jobId}`);
    console.log(`${'='.repeat(70)}\n`);

    const startTime = Date.now();
    const agentResults: AgentResult[] = [];
    let plans: GroupPlan[] = [];

    // Update job status to processing
    await supabase.from('PipelineJob').update({
      status: 'processing',
      startedAt: new Date().toISOString()
    }).eq('id', jobId);

    // ===== AGENT 1: GENERATOR =====
    console.log(`\n[AGENT 1] GENERATOR - Creating 11 default group plans...`);
    const agent1Start = Date.now();
    plans = await agent1_generateDefaultPlans(config);
    agentResults.push({
      agent: 'Agent 1: Generator (11 Types - 3 Free First)',
      duration: Date.now() - agent1Start,
      input: 0,
      output: plans.length,
      changes: plans.map(p => `${p.planType}: ${p.title}`),
    });
    console.log(`[AGENT 1] ✅ Generated ${plans.length} plans`);

    if (plans.length === 0) {
      await supabase.from('PipelineJob').update({
        status: 'failed',
        error: 'No plans generated',
        completedAt: new Date().toISOString()
      }).eq('id', jobId);
      return;
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
    console.log(`[AGENT 2] ✅ ${plans.length} plans passed validation`);

    if (plans.length === 0) {
      await supabase.from('PipelineJob').update({
        status: 'failed',
        error: 'All plans failed validation',
        completedAt: new Date().toISOString()
      }).eq('id', jobId);
      return;
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
    console.log(`[AGENT 3] ✅ ${plans.length} plans with validated addresses`);

    if (plans.length === 0) {
      await supabase.from('PipelineJob').update({
        status: 'failed',
        error: 'All plans failed address validation',
        completedAt: new Date().toISOString()
      }).eq('id', jobId);
      return;
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
    console.log(`[AGENT 4] ✅ Descriptions polished`);

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
    console.log(`[AGENT 5] ✅ ${plans.length} plans passed quality gate`);

    if (plans.length === 0) {
      await supabase.from('PipelineJob').update({
        status: 'failed',
        error: 'All plans failed quality gate',
        completedAt: new Date().toISOString()
      }).eq('id', jobId);
      return;
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
    console.log(`[AGENT 6] ✅ Enhanced ${agent6Result.descriptionsEnhanced} descriptions`);

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
    console.log(`[AGENT 7] ✅ Generated tags for ${agent7Result.plansTagged} plans`);

    // ===== STORE RESULTS =====
    let storedCount = 0;
    if (storeResults && plans.length > 0) {
      console.log(`\n[STORAGE] Saving ${plans.length} plans...`);
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

    // Update job as completed
    await supabase.from('PipelineJob').update({
      status: 'completed',
      completedAt: new Date().toISOString(),
      result: {
        totalGenerated: agentResults[0]?.output || 0,
        totalApproved: plans.length,
        totalStored: storedCount,
        durationMs: totalDuration,
        agentResults: agentResults.map(a => ({ agent: a.agent, duration: a.duration }))
      }
    }).eq('id', jobId);

    console.log(`\n${'='.repeat(70)}`);
    console.log(`[BACKGROUND] ${city.toUpperCase()} PIPELINE COMPLETE`);
    console.log(`Total: ${Math.round(totalDuration / 1000)}s | Generated: ${agentResults[0]?.output || 0} | Approved: ${plans.length} | Stored: ${storedCount}`);
    console.log(`${'='.repeat(70)}\n`);

  } catch (error) {
    console.error(`[BACKGROUND] Pipeline error for ${city}:`, error);
    await supabase.from('PipelineJob').update({
      status: 'failed',
      error: (error as Error).message,
      completedAt: new Date().toISOString()
    }).eq('id', jobId).catch(() => {});
  }
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
      return errorResponse(`Unknown city: ${city}. Supported: ${Object.keys(CITY_CONFIGS).join(', ')}`, 400, 'INVALID_CITY');
    }

    // Generate a unique job ID
    const jobId = `job-${city.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Create job record in database
    const supabase = createServiceClient();

    // Try to create PipelineJob table entry (create table if needed)
    const { error: insertError } = await supabase.from('PipelineJob').insert({
      id: jobId,
      city: city,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    // If table doesn't exist, that's okay - we'll still process
    if (insertError && !insertError.message.includes('does not exist')) {
      console.warn('[Pipeline] Could not create job record:', insertError.message);
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`${city.toUpperCase()} 7-AGENT PIPELINE - ASYNC MODE`);
    console.log(`Job ID: ${jobId}`);
    console.log(`${'='.repeat(70)}\n`);

    // Start background processing (don't await - fire and forget)
    // Use EdgeRuntime.waitUntil if available, otherwise just don't await
    const processingPromise = processPlansInBackground(city, config, jobId, storeResults);

    // Try to use EdgeRuntime.waitUntil for Supabase Edge Functions
    // This ensures the function keeps running after response is sent
    try {
      // @ts-ignore - EdgeRuntime may not be typed
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(processingPromise);
      }
    } catch (e) {
      // If EdgeRuntime is not available, the promise will still run
      // but may be cut off if the function times out
      console.log('[Pipeline] EdgeRuntime.waitUntil not available, using fire-and-forget');
    }

    // Return immediately with job info
    return jsonResponse({
      success: true,
      async: true,
      message: `Pipeline started for ${city}. Processing ${Object.keys(CITY_CONFIGS).includes(city) ? '11' : '0'} plans in background.`,
      jobId: jobId,
      city: city,
      checkStatus: `Check GroupFlow table for city "${city}" to see results when complete.`,
      estimatedTime: '3-5 minutes',
    });

  } catch (error) {
    console.error('[Pipeline] Error:', error);
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

🆓 FREE EXPERIENCES (3 TYPES - GENERATE THESE FIRST!):
- FREE_DAYTIME: Start at 09:00-10:00 - Parks, beaches, markets, walking tours, street art
  Example: "Free Coastal Discovery" → 09:30 beach walk → 11:30 street art → 14:00 park
- FREE_SUNSET: Start at 18:00-19:00 - Waterfront promenades, sunset viewpoints, night markets
  Example: "Sunset Stroll & Stars" → 18:00 promenade → 20:00 viewpoint → 21:30 night market
- FREE_CULTURAL: Start at 10:00-11:00 - Historic districts, free museums, heritage walks
  Example: "Heritage & History" → 10:00 old town → 12:30 free museum → 15:00 cathedral

🌅 MORNING/DAYTIME PLANS (Start 09:00-11:00):
- FAMILY: Start at 09:00-10:00 - Kids are energetic in morning, parks/museums open early
  Example: "Family Fun Day" → 10:00 zoo → 12:30 lunch → 14:30 park
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
- FREE experiences → Match type (daytime/sunset/cultural)
- Titles with "Day", "Morning", "Brunch", "Exploration", "Tour", "Museum" → DAYTIME
- Titles with "Sunset", "Evening", "Dinner" → SUNSET/EVENING
- Titles with "Night", "After Dark", "Nightlife", "Party" → NIGHT
- Family/Kids activities → ALWAYS DAYTIME (09:00-10:00 start)

═══════════════════════════════════════════════════════════════════════════════
VENUE OPENING HOURS - CRITICAL VALIDATION!
═══════════════════════════════════════════════════════════════════════════════

You MUST verify and consider the ACTUAL opening hours of each venue:
- NEVER suggest a venue at a time when it would be CLOSED
- Research the real operating hours before including a venue
- Include opening hours for each activity

TYPICAL OPENING HOURS BY VENUE TYPE:
- Nightclubs/Clubs: 22:00 - 04:00 (Friday & Saturday only)
- Restaurants: 11:00 - 23:00 (lunch 11:00-15:00, dinner 18:00-23:00)
- Bars/Cocktail lounges: 17:00 - 02:00
- Rooftop bars: 17:00 - 00:00 (may close earlier)
- Brunch spots: 09:00 - 15:00
- Museums: 09:00 - 17:00 (often closed Mondays)
- Parks: 06:00 - 22:00
- Beach clubs: 10:00 - 18:00
- Cafes: 07:00 - 18:00
- Jazz/Live music clubs: 19:00 - 01:00

VALIDATION RULES:
- startTime MUST be AFTER the venue opens
- startTime + duration MUST be BEFORE the venue closes
- If unsure, choose conservative times when venue is DEFINITELY open

═══════════════════════════════════════════════════════════════════════════════

CRITICAL: Titles MUST be UNIQUE to ${config.cityName} - NO generic titles!
VENUES: ${config.legendaryVenues}
AREAS: ${config.neighborhoods.join(', ')}

Each plan needs 3 activities with real venues, addresses, coordinates.
RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Generate 11 group plans for ${config.cityName}:

IMPORTANT: Generate FREE experiences FIRST (they appear at top of listings):
${DEFAULT_PLAN_TYPES.map((t, i) => `${i + 1}. ${t.type.toUpperCase()}: ${t.description}`).join('\n')}

Cost Guidelines:
- FREE plans (free_daytime, free_sunset, free_cultural): cost MUST be { "min": 0, "max": 0 } or { "min": 0, "max": 20 } for minor expenses
- Family plans: { "min": 50, "max": 150 }
- Friend groups: { "min": 60, "max": 150 }
- Couples/Romantic: { "min": 120, "max": 250 }
- Night out plans: { "min": 100, "max": 300 }
- Luxury: { "min": 400, "max": 800 }

Return JSON:
{
  "plans": [{
    "title": "Unique city-specific title",
    "planType": "free_daytime|free_sunset|free_cultural|couples|friend_groups|girls_trips|girls_night_out|boys_night_out|luxury|family|romantic",
    "description": "Brief description",
    "activities": [{
      "venueName": "Venue",
      "address": "Full Address with postal code",
      "coordinates": { "latitude": X.XXX, "longitude": X.XXX },
      "openingHours": "HH:MM - HH:MM (venue's actual operating hours)",
      "startTime": "HH:MM (must be within openingHours)",
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

KNOWN VENUES:
${config.venueDetails}

VALIDATION APPROACH - BE LENIENT:
1. KEEP plans if venues are PLAUSIBLE for ${config.cityName} (real restaurants, bars, clubs, hotels, beaches, parks)
2. KEEP plans if the venue TYPE exists in ${config.cityName} (e.g., "rooftop bar in Masaki" is plausible)
3. ONLY REMOVE if the venue is clearly FICTIONAL or IMPOSSIBLE (e.g., "Hogwarts Castle")

Coordinates should be roughly lat ${config.coordRange.lat[0]}-${config.coordRange.lat[1]}, lon ${config.coordRange.lon[0]}-${config.coordRange.lon[1]}.

GOAL: Keep as many plans as possible while ensuring venues are realistic.

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Validate these ${plans.length} plans:
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

YOUR JOB: CORRECT addresses, NEVER REMOVE plans.
- If address is wrong, provide the CORRECT address and coordinates
- If address format is incomplete, COMPLETE it with neighborhood and city
- If you're unsure of exact address, use a PLAUSIBLE address in the correct neighborhood

REFERENCE VENUES:
${config.venueDetails}

NEVER use "remove" action - always keep or keep_corrected.
RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Triple-check addresses:
${plans.map((p, i) => `PLAN ${i + 1}: ${p.title}\n${p.activities.map(a => `- ${a.venueName}: ${a.address}`).join('\n')}`).join('\n\n')}

Return JSON:
{
  "results": [{
    "title": "Plan Title",
    "action": "keep" | "keep_corrected" | "remove",
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

// ===== AGENT 6: COMMS SPECIALIST (UPDATED - RICH DESCRIPTIONS) =====
async function agent6_commsSpecialist(plans: GroupPlan[], config: any): Promise<{
  plans: GroupPlan[];
  descriptionsEnhanced: number;
  changes: string[];
}> {
  const systemPrompt = `You are an ELITE COMMUNICATIONS SPECIALIST and TRAVEL WRITER for ${config.cityName}.

YOUR MISSION: Paint vivid pictures that help users imagine themselves at each location.

═══════════════════════════════════════════════════════════════════════════════
VENUE DESCRIPTION REQUIREMENTS (CRITICAL - READ CAREFULLY!)
═══════════════════════════════════════════════════════════════════════════════

For EACH venue, write a RICH, IMMERSIVE description that is:
- AT LEAST 4 SENTENCES LONG (80-120 words)
- Written in second person ("you'll", "you can")
- Captures the VIBE and ATMOSPHERE
- Tells them WHAT THEY CAN DO there
- Gives them IDEAS and SUGGESTIONS
- Makes them EXCITED to visit

STRUCTURE FOR EACH VENUE DESCRIPTION:
1. Opening hook - What makes this place special/iconic
2. What you'll experience - The atmosphere, sights, sounds
3. What you can do - Specific activities, recommendations
4. Pro tip or insider knowledge - Something that makes them feel like an insider

═══════════════════════════════════════════════════════════════════════════════
SPECIAL INSTRUCTIONS FOR FREE EXPERIENCES
═══════════════════════════════════════════════════════════════════════════════

For FREE experiences (free_daytime, free_sunset, free_cultural):
- Emphasize that it's FREE and accessible
- Mention "self-guided exploration" or "free walking tour"
- Suggest what to look for and photograph
- Mention if audio guides or free apps are available
- Add: "Download a free walking tour app like GPSmyCity for guided commentary."

═══════════════════════════════════════════════════════════════════════════════
EXAMPLES OF EXCELLENT VENUE DESCRIPTIONS
═══════════════════════════════════════════════════════════════════════════════

EXAMPLE 1 (Beach/Free):
"Playa de la Fontanilla is one of Marbella's most beloved local beaches, stretching along golden sand with crystal-clear Mediterranean waters. You'll find families, couples, and groups of friends soaking up the sun, while chiringuitos (beach bars) dot the shoreline offering fresh seafood and cold drinks. Grab a spot on the sand, take a refreshing dip, or simply stroll along the promenade watching the sunset paint the sky in oranges and pinks. This is the perfect spot for a free, relaxed afternoon—no reservations needed, just bring your towel and sense of adventure."

EXAMPLE 2 (Cultural/Free):
"Plaza de los Naranjos is the beating heart of Marbella's Old Town, a charming square shaded by fragrant orange trees that have stood here since the 16th century. You can wander freely among the whitewashed buildings, admire the Renaissance-era Town Hall, and watch locals and tourists alike enjoy café culture at its finest. Pull up a chair at one of the terrace cafes, order a café con leche, and soak in centuries of history around you. For a self-guided tour, download GPSmyCity app which offers free audio walks through the historic quarter."

EXAMPLE 3 (Nightclub/Paid):
"Pacha Ibiza is where legends are made—the world's most iconic nightclub has been defining electronic music culture since 1973. Step through the doors and you'll feel the bass pulse through your body as world-class DJs spin under the famous cherry logo. The main room is pure energy, but explore the garden terrace for a breath of fresh air and celebrity spotting. Arrive before 1am to beat the crowds, and don't miss the funky room for disco and house classics."

CITY CONTEXT:
- City: ${config.cityName}
- Identity: ${config.identity}
- Vibe: ${config.vibe}

VENUE KNOWLEDGE:
${config.venueDetails}

RESPOND WITH VALID JSON ONLY.`;

  const userPrompt = `Create RICH, IMMERSIVE descriptions for each venue:

${plans.map((p, i) => `
PLAN ${i + 1}: "${p.title}" (${p.planType})
For: ${p.bestFor.join(', ')}
Is Free Plan: ${p.planType.includes('free') ? 'YES - emphasize free activities, self-guided options' : 'No'}

Venues:
${p.activities.map(a => `- ${a.venueName} at ${a.address}`).join('\n')}
`).join('\n---\n')}

For each plan:
1. Write captivating plan description (2-3 sentences, 30-40 words)
2. For EACH venue, write a RICH description (4+ sentences, 80-120 words) that:
   - Paints a vivid picture of the experience
   - Tells them what they can DO there
   - Captures the vibe and atmosphere
   - Gives insider tips or suggestions
   - For FREE plans: mention self-guided tours and free apps

Return JSON:
{
  "enhancedPlans": [{
    "title": "Plan Title",
    "planDescription": "Captivating 2-3 sentence overview of the entire experience",
    "activities": [{
      "venueName": "Venue Name",
      "richDescription": "4+ sentences, 80-120 words, immersive description with what to do, vibe, tips"
    }]
  }]
}`;

  const response = await gptRequest([{ role: 'user', content: userPrompt }], {
    systemPrompt,
    temperature: 0.8,
    maxTokens: 12000, // Increased for longer descriptions
    jsonMode: true,
  });

  const result = parseGPTJSON<{
    enhancedPlans: {
      title: string;
      planDescription: string;
      activities: { venueName: string; richDescription?: string; briefDescription?: string }[];
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
      // Use richDescription (new) or fall back to briefDescription (old)
      const newDescription = ea?.richDescription || ea?.briefDescription;
      if (newDescription) {
        descriptionsEnhanced++;
        // Truncate log output but use full description
        const logPreview = newDescription.substring(0, 80) + (newDescription.length > 80 ? '...' : '');
        changes.push(`${activity.venueName}: "${logPreview}"`);
        return { ...activity, description: newDescription };
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

// ===== STORAGE =====
async function storePlans(
  supabase: any,
  plans: GroupPlan[],
  cityId: string,
  citySlug: string,
  scores: { title: string; score: number }[]
): Promise<number> {
  let stored = 0;
  const timestamp = Date.now();

  // Delete old plans (both 6agent and 7agent patterns)
  await supabase.from('GroupFlowStep').delete().like('flowId', `gf-${citySlug}-6agent%`);
  await supabase.from('GroupFlowStep').delete().like('flowId', `gf-${citySlug}-7agent%`);
  await supabase.from('GroupFlow').delete().like('id', `gf-${citySlug}-6agent%`);
  await supabase.from('GroupFlow').delete().like('id', `gf-${citySlug}-7agent%`);
  await supabase.from('Plan').delete().like('id', `plan-${citySlug}-6agent%`);
  await supabase.from('Plan').delete().like('id', `plan-${citySlug}-7agent%`);

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const score = scores.find(s => s.title === plan.title)?.score || 0;
    const flowId = `gf-${citySlug}-7agent-${timestamp}-${i}`;

    // Get appropriate day for this plan type
    const dayInfo = getDateForPlanType(plan.planType);
    console.log(`[storage] ${plan.planType} → ${dayInfo.weekday} (${dayInfo.date})`);

    // Create Plan records
    const activityPlanIds: string[] = [];
    for (let j = 0; j < plan.activities.length; j++) {
      const activity = plan.activities[j];
      const activityPlanId = `plan-${citySlug}-7agent-${timestamp}-${i}-${j}`;

      const { error: planError } = await supabase.from('Plan').insert({
        id: activityPlanId,
        planId: `${citySlug}-7agent-${timestamp}-${i}-${j}`,
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
        source: 'ai-agent-gpt-7',
        aiGenerated: true,
        isIndividual: true,
        isGroup: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      if (planError) {
        console.error(`[storage] Error storing Plan for ${activity.venueName}:`, planError);
      }

      activityPlanIds.push(activityPlanId);
    }

    // Create GroupFlow - try with new columns, fall back if they don't exist
    let flowData = {
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
      // New columns (may not exist in database yet)
      planType: plan.planType,
      costMin: plan.estimatedCost.min,
      costMax: plan.estimatedCost.max,
      tags: plan.aiTags || plan.bestFor || [], // Store AI-generated tags
    };

    let { data: flow, error: flowError } = await supabase
      .from('GroupFlow')
      .insert(flowData)
      .select()
      .single();

    // If insert fails (possibly due to missing columns), try without new columns
    if (flowError && flowError.message?.includes('column')) {
      console.log(`[storage] Retrying without new columns for ${plan.title}...`);
      const { planType, costMin, costMax, tags, ...basicData } = flowData;
      const retryResult = await supabase
        .from('GroupFlow')
        .insert(basicData)
        .select()
        .single();
      flow = retryResult.data;
      flowError = retryResult.error;
    }

    if (flowError) {
      console.error(`[storage] Error storing GroupFlow ${plan.title}:`, flowError);
      continue;
    }

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
    // FREE experiences - available any day
    'free_daytime': [0, 6],      // Sunday, Saturday (daytime)
    'free_sunset': [5, 6],       // Friday, Saturday (evening)
    'free_cultural': [0, 6],     // Sunday, Saturday
    'free_experiences': [0, 6],  // Sunday, Saturday (legacy)
    // PAID experiences
    'couples': [5, 6],           // Friday, Saturday
    'friend_groups': [5, 6],     // Friday, Saturday
    'girls_trips': [6],          // Saturday
    'girls_night_out': [5, 6],   // Friday, Saturday
    'boys_night_out': [5, 6],    // Friday, Saturday
    'luxury': [4, 5, 6],         // Thursday, Friday, Saturday
    'family': [0, 6],            // Sunday, Saturday
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
