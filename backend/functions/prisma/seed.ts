/**
 * Prisma Seed Script for Litplan
 *
 * Seeds the PostgreSQL database with:
 * - 10 cities
 * - 50 plans per city (500 total)
 * - 10 group flows per city (100 total)
 * - 2 users (1 free, 1 premium)
 * - Subscriptions
 * - Saved cities (premium user)
 * - Viewed cities
 * - User activity
 * - App config
 *
 * Usage: npx prisma db seed
 */

import { PrismaClient, PlanType, SubscriptionStatus, SubscriptionTier, ActivityType } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// CITY DATA
// ============================================================================

const CITIES = [
  {
    cityId: 'nyc-001',
    name: 'New York',
    country: 'United States',
    countryCode: 'US',
    rank: 1,
    timezone: 'America/New_York',
    heroImage: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&h=800&fit=crop',
    cardImage: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=500&fit=crop',
    accentColor: '#00D9FF',
    latitude: 40.7128,
    longitude: -74.0060,
    featured: true,
  },
  {
    cityId: 'la-001',
    name: 'Los Angeles',
    country: 'United States',
    countryCode: 'US',
    rank: 2,
    timezone: 'America/Los_Angeles',
    heroImage: 'https://images.unsplash.com/photo-1534190239940-9ba8944ea261?w=1200&h=800&fit=crop',
    cardImage: 'https://images.unsplash.com/photo-1534190239940-9ba8944ea261?w=400&h=500&fit=crop',
    accentColor: '#FFB800',
    latitude: 34.0522,
    longitude: -118.2437,
    featured: true,
  },
  {
    cityId: 'miami-001',
    name: 'Miami',
    country: 'United States',
    countryCode: 'US',
    rank: 3,
    timezone: 'America/New_York',
    heroImage: 'https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=1200&h=800&fit=crop',
    cardImage: 'https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=400&h=500&fit=crop',
    accentColor: '#FF6B9D',
    latitude: 25.7617,
    longitude: -80.1918,
    featured: true,
  },
  {
    cityId: 'london-001',
    name: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    rank: 4,
    timezone: 'Europe/London',
    heroImage: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&h=800&fit=crop',
    cardImage: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=500&fit=crop',
    accentColor: '#9B59B6',
    latitude: 51.5074,
    longitude: -0.1278,
    featured: true,
  },
  {
    cityId: 'paris-001',
    name: 'Paris',
    country: 'France',
    countryCode: 'FR',
    rank: 5,
    timezone: 'Europe/Paris',
    heroImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&h=800&fit=crop',
    cardImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=500&fit=crop',
    accentColor: '#E74C3C',
    latitude: 48.8566,
    longitude: 2.3522,
    featured: true,
  },
  {
    cityId: 'tokyo-001',
    name: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    rank: 6,
    timezone: 'Asia/Tokyo',
    heroImage: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&h=800&fit=crop',
    cardImage: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=500&fit=crop',
    accentColor: '#FF1744',
    latitude: 35.6762,
    longitude: 139.6503,
    featured: false,
  },
  {
    cityId: 'berlin-001',
    name: 'Berlin',
    country: 'Germany',
    countryCode: 'DE',
    rank: 7,
    timezone: 'Europe/Berlin',
    heroImage: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=1200&h=800&fit=crop',
    cardImage: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400&h=500&fit=crop',
    accentColor: '#3498DB',
    latitude: 52.5200,
    longitude: 13.4050,
    featured: false,
  },
  {
    cityId: 'barcelona-001',
    name: 'Barcelona',
    country: 'Spain',
    countryCode: 'ES',
    rank: 8,
    timezone: 'Europe/Madrid',
    heroImage: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200&h=800&fit=crop',
    cardImage: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=500&fit=crop',
    accentColor: '#F39C12',
    latitude: 41.3851,
    longitude: 2.1734,
    featured: false,
  },
  {
    cityId: 'amsterdam-001',
    name: 'Amsterdam',
    country: 'Netherlands',
    countryCode: 'NL',
    rank: 9,
    timezone: 'Europe/Amsterdam',
    heroImage: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1200&h=800&fit=crop',
    cardImage: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400&h=500&fit=crop',
    accentColor: '#1ABC9C',
    latitude: 52.3676,
    longitude: 4.9041,
    featured: false,
  },
  {
    cityId: 'dubai-001',
    name: 'Dubai',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    rank: 10,
    timezone: 'Asia/Dubai',
    heroImage: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&h=800&fit=crop',
    cardImage: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=500&fit=crop',
    accentColor: '#FFA500',
    latitude: 25.2048,
    longitude: 55.2708,
    featured: false,
  },
];

// ============================================================================
// VENUE DATA BY CITY
// ============================================================================

const CITY_VENUES: Record<string, string[]> = {
  'nyc-001': [
    'Blue Note Jazz Club', 'Le Bain', 'The Roof at PUBLIC', 'Brooklyn Brewery',
    'Comedy Cellar', 'House of Yes', 'Elsewhere', 'Bemelmans Bar',
    'Nowadays', 'The Box', 'Cielo', 'Output', 'The DL', 'Beauty Bar',
    'The Garret East', 'The Dead Rabbit', 'Attaboy', 'PDT',
    'Mood Ring', 'Bossa Nova Civic Club', 'Schimanski', 'Good Room',
    'The West Village', 'The Bronx Brewery', "Pete's Candy Store",
    'Brooklyn Mirage', 'Baby\'s All Right', 'The Bell House', 'Union Pool',
    'Music Hall of Williamsburg', 'Knitting Factory', 'Brooklyn Bowl', 'The Sultan Room',
    'Kinfolk', 'Black Flamingo', 'Jupiter Disco', 'Public Records',
    'Lot Radio', 'Avant Gardner', 'The Brooklyn Monarch', 'Basement',
    'Mr. Purple', 'PHD Rooftop', 'Magic Hour', 'Westlight',
    'Berry Park', 'Rooftop Reds', 'Northern Territory', 'The Crown',
    'Harriet\'s Rooftop', 'The Skylark',
  ],
  'la-001': [
    'The Troubadour', 'Skybar', 'Sound Nightclub', 'Exchange LA',
    'The Viper Room', 'Perch', 'Academy LA', 'The Roxy Theatre',
    'Bootsy Bellows', 'Warwick', 'The Whisky a Go Go', 'The Echo',
    'Catch LA', 'E.P. & L.P.', 'The Rooftop at The Standard',
    'Harvard & Stone', 'The Satellite', 'The Short Stop',
    'La Cita Bar', 'The Edison', 'The Regent Theater', 'The Novo',
    'EP/LP', 'Mama Shelter Rooftop', 'The Tower Bar',
    'No Vacancy', 'Jumbo\'s Clown Room', 'The Moroccan Lounge', 'Lodge Room',
    'The Roxy', 'The Greek Theatre', 'Hollywood Forever', 'The Wiltern',
    'Fonda Theatre', 'El Rey Theatre', 'Teragram Ballroom', 'The Theatre at Ace Hotel',
    'The Mayan', 'Avalon Hollywood', '1720', 'Das Bunker',
    'Catch One', 'The Love Song', 'The Hi Hat', 'Zebulon',
    'Gold Diggers', 'Bar Lubitsch', 'Bossa Nova', 'The Friend',
  ],
  'miami-001': [
    'LIV', 'Story', 'E11EVEN', 'Nikki Beach', 'Basement',
    'Space', 'Hyde Beach', 'Club Space', 'WALL Lounge',
    'Do Not Sit on the Furniture', 'Treehouse', 'Rockwell',
    'Swan', 'Sugar', 'The Broken Shaker', 'Ball & Chain',
    "Mango's Tropical Cafe", 'Cafe La Trova', 'Sweet Liberty',
    'Bodega Taqueria y Tequila', 'Gramps', 'Basement Miami',
    'Floyd', 'The Regent Cocktail Club', 'Lost Boy',
    'The Anderson', 'Blackbird Ordinary', 'Better Days', 'The Corner',
    'Wynwood Factory', 'Heart Nightclub', 'Trade', 'The Electric Pickle',
    'La Otra', 'Coyo Taco', 'Shots', 'Wood Tavern',
    'Grails', 'The Wharf', 'Kiki on the River', 'Barter',
    'Mama Tried', 'Boxelder', 'J. Wakefield Brewing', 'Veza Sur',
    'The Sylvester', 'Domicile', 'Off Site', 'Las Rosas',
    'Churchill\'s Pub', 'Kill Your Idol',
  ],
  'london-001': [
    'Fabric', 'Ministry of Sound', 'XOYO', "Ronnie Scott's",
    'Printworks', 'The Box Soho', 'Cirque le Soir', 'Mahiki',
    'Heaven', 'Studio 338', 'EGG London', 'Cable', 'Corsica Studios',
    'Shoreditch House', 'Aqua Shard', 'The Roof Gardens',
    'Madison', 'Radio Rooftop', 'Proud Camden', 'Jazz Cafe',
    'KOKO', 'Electric Brixton', 'Phonox', 'Bussey Building',
    'The Nest', 'Fire & Lightbox',
    'Oval Space', 'Village Underground', 'The Cause', 'Fold',
    'E1 London', 'Drumsheds', 'HERE at Outernet', 'Outernet London',
    'The Jazz Cafe', 'The Scala', 'O2 Academy Brixton', 'The Forum',
    'The Roundhouse', 'Shepherd\'s Bush Empire', 'The Garage', 'Oslo',
    'The Underworld', 'The 100 Club', 'The Windmill', 'Cafe OTO',
    'Night Tales', 'Skylight', 'Pergola Paddington', 'The Prince',
  ],
  'paris-001': [
    'Rex Club', 'Le Baron', 'Concrete', 'Silencio', 'Wanderlust',
    'New Morning', 'La Bellevilloise', 'Badaboum', 'Chez Moune',
    'Le Comptoir General', 'La Machine du Moulin Rouge', 'Supersonic',
    'Glazart', 'Le Batofar', 'Showcase', 'Yoyo', 'Social Club',
    'Le Carmen', 'Le Montana', 'Rosa Bonheur', 'Le Panic Room',
    'Le Perchoir', 'Le Faust', 'Le Djoon', 'Point Ephemere',
    'Trabendo', 'La Gaite Lyrique', 'La Cigale', 'L\'Olympia',
    'Le Trianon', 'La Boule Noire', 'Le Pop-Up du Label', 'Petit Bain',
    'Nuba', 'Kilometre25', 'Dehors Brut', 'Weather',
    'La Station Gare des Mines', 'Hasard Ludique', 'La Folie', 'Pigalle Country Club',
    'Le Bus Palladium', 'Castel', 'L\'Arc Paris', 'Raspoutine',
    'Lido', 'Crazy Horse', 'Moulin Rouge', 'Le Queen',
    'Le Nouveau Casino', 'Cafe de la Danse',
  ],
  'tokyo-001': [
    'Womb', 'Contact', 'Ageha', 'Vision', 'Blue Note Tokyo',
    'Unit', 'Air Tokyo', 'Oath', 'Sound Museum Vision', 'Atom',
    'Circus Tokyo', 'Maharaja', 'New Lex', 'Camelot',
    'Shibuya Chelsea Hotel', 'Club Quattro', 'Vuenos',
    'Trump Room', 'Aoyama Hachi', 'Daikanyama Unit', 'WWW',
    'Harlem', 'V2 Tokyo', 'Sankeys Penthouse', 'Bar Bonobo',
    'Liquidroom', 'O-East', 'O-West', 'O-Nest',
    'Billboard Live', 'Cotton Club', 'New York Bar', 'Peter: The Bar',
    'Bauhaus', 'Oath', 'Vent', 'Module',
    'Grassroots', 'Muse', 'Jumanji', 'TK Shibuya',
    'Alife', 'Club Asia', 'Oto', 'Bonobo',
    'Bar Martha', 'Beat Cafe', 'Mother', 'Ruby Room',
    'Shimokitazawa Three', 'Basement Bar',
  ],
  'berlin-001': [
    'Berghain', 'Watergate', 'Tresor', 'About Blank', 'Sisyphos',
    'Kater Blau', 'Wilde Renate', 'Griessmuehle', 'Salon zur Wilden Renate',
    'RSO.Berlin', 'Club der Visionaere', 'Ritter Butzke', 'Chalet',
    'Prince Charles', 'Magdalena', 'Klunkerkranich', '://about blank',
    'Birgit & Bier', 'Anomalie Art Club', 'Alte Münze', 'OHM',
    'Renate', 'Crack Bellmer', 'Mensch Meier', 'Mein Haus am See',
    'Lido', 'Festsaal Kreuzberg', 'SO36', 'Cassiopeia',
    'Yaam', 'Holzmarkt', 'Else', 'Hoppetosse',
    'Gretchen', 'Bi Nuu', 'Astra Kulturhaus', 'Festsaal Kreuzberg',
    'Kantine am Berghain', 'Panorama Bar', 'Lab.oratory', 'Suicide Circus',
    'Haubentaucher', 'Arena Club', 'Sage Beach', 'Club OST',
    'Polygon', 'Revier Südost', 'Ipse', 'Sysiphos',
    'SchwuZ', 'KitKatClub',
  ],
  'barcelona-001': [
    'Razzmatazz', 'Opium', 'Pacha', 'Sala Apolo', 'City Hall',
    'Input', 'Moog', 'Macarena Club', 'Sutton', 'Otto Zutz',
    'La Terrrazza', 'Shoko', 'Eclipse Bar', 'CDLC', 'Bling Bling',
    'Marula Cafe', 'Sidecar Factory Club', 'Jamboree', 'Magic',
    'Harlem Jazz Club', 'Freedonia', 'Roxy Blue', 'Bikini',
    'Sala Salamandra', 'Club Catwalk',
    'Nitsa', 'Wolf Barcelona', 'Laut', 'Upload',
    'Red58', 'R33', 'Macarena', 'Boulevard Culture Club',
    'Soho House Barcelona', 'Hotel Brummell', 'Casa Bonay', 'Dry Martini',
    'Bobby Gin', 'Paradiso', 'Two Schmucks', 'Night Barcelona',
    'Espit Chupitos', 'Absenta', 'BierCab', 'Old Fashioned',
    'Mirablau', 'La Caseta del Migdia', 'Carpe Diem', 'Salt Beach Club',
    'Chiringuito Airemar', 'Ocana', 'Bar Marsella', 'Bar Pastis',
  ],
  'amsterdam-001': [
    'De School', 'Shelter', 'Radion', 'Claire', 'Paradiso',
    'Melkweg', 'AIR Amsterdam', 'Chicago Social Club', 'Sugar Factory',
    'Bitterzoet', 'Studio 80', 'Club Up', 'Disco Dolly',
    'Canvas', 'Cafe de Ceuvel', 'Skatecafe', 'Pllek', "A'DAM Tower",
    'Hannekes Boom', 'Tolhuistuin', 'Noorderlicht', 'De Marktkantine',
    'Trouw Amsterdam', 'Hotel Arena', 'Roest',
    'Warehouse Elementenstraat', 'Lofi', 'Garage Noord', 'Bret',
    'Vondelbunker', 'OT301', 'OCCII', 'De Nieuwe Anita',
    'Pacific Parc', 'Jimmy Woo', 'Club NYX', 'Q-Factory',
    'Escape', 'Club Rain', 'Club Home', 'Duke of Tokyo',
    'Tales & Spirits', 'Door 74', 'Hiding in Plain Sight', 'Super Lyan',
    'Rosalia\'s Menagerie', 'The Butcher Social Club', 'Bar Oldenhof', 'Wynand Fockink',
    'Cafe t Smalle', 'Cafe de Dokter',
  ],
  'dubai-001': [
    'WHITE Dubai', 'Base Dubai', 'Soho Garden', 'At.mosphere', 'CE LA VI',
    'Bluewaters Island', 'SKY2.0', 'Toy Room', 'Cavalli Club', 'Billionaire Mansion',
    'Provocateur', 'Zero Gravity', 'Barasti Beach Bar', 'Industrial Avenue',
    '1 OAK Dubai', 'Vault', 'Cirque le Soir', 'Armani/Prive',
    'VIP Room Dubai', 'Music Room', 'Trilogy', 'TAO Beach Club',
    'Soho Garden DXB', 'Eden Beach Club', 'Club Boudoir',
    'Five Palm Jumeirah', 'Penthouse', 'Luna Sky Bar', 'Mantis',
    'Secret Room', 'N\'Dulge', 'Bling', 'People by Crystal',
    'DIFC', 'Stereo Arcade', 'Lock Stock & Barrel', 'Belgian Beer Cafe',
    'Fibber Magee\'s', 'Mcgettigans', 'The Irish Village', 'Nezesaussi',
    'Siddharta Lounge', 'The Deck', 'Asia Asia', 'Hutong',
    'Zuma', 'Nobu', 'La Petite Maison', 'Tresind Studio',
    'Coya', 'Amazonico', 'Torno Subito', 'Hakkasan',
  ],
};

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORIES = [
  'Rooftop Bar', 'Jazz Club', 'Nightclub', 'Live Music', 'Comedy Club',
  'Sports Bar', 'Lounge', 'Beach Club', 'Speakeasy', 'Wine Bar',
  'Cocktail Bar', 'Dance Club', 'Electronic Music', 'Hip Hop Club',
  'Latin Club', 'Karaoke Bar', 'Brewery', 'Pub', 'Restaurant & Bar',
];

const GENRES = [
  'Electronic', 'House', 'Techno', 'Hip Hop', 'R&B', 'Jazz',
  'Rock', 'Indie', 'Latin', 'Reggaeton', 'EDM', 'Deep House',
];

const VIBES = [
  'Upbeat', 'Chill', 'Exclusive', 'Energetic', 'Intimate', 'Vibrant',
  'Sophisticated', 'Casual', 'Trendy', 'Underground', 'Classy', 'Fun',
];

const PLAN_TYPES: PlanType[] = ['BAR', 'CLUB', 'EVENT', 'RESTAURANT'];

const NEIGHBORHOODS: Record<string, string[]> = {
  'nyc-001': ['Lower East Side', 'Williamsburg', 'SoHo', 'East Village', 'Midtown', 'Brooklyn', 'Manhattan'],
  'la-001': ['West Hollywood', 'Downtown LA', 'Venice Beach', 'Hollywood', 'Santa Monica', 'Silver Lake'],
  'miami-001': ['South Beach', 'Wynwood', 'Brickell', 'Miami Beach', 'Downtown', 'Coconut Grove'],
  'london-001': ['Shoreditch', 'Soho', 'Camden', 'Brixton', 'Mayfair', 'Kings Cross', 'Dalston'],
  'paris-001': ['Le Marais', 'Pigalle', 'Oberkampf', 'Bastille', 'Belleville', 'Saint-Germain'],
  'tokyo-001': ['Shibuya', 'Roppongi', 'Shinjuku', 'Harajuku', 'Ginza', 'Akihabara'],
  'berlin-001': ['Kreuzberg', 'Friedrichshain', 'Neukolln', 'Mitte', 'Prenzlauer Berg'],
  'barcelona-001': ['Eixample', 'Gothic Quarter', 'El Raval', 'Gracia', 'Poblenou', 'Barceloneta'],
  'amsterdam-001': ['Centrum', 'De Pijp', 'Jordaan', 'Noord', 'West', 'Oost'],
  'dubai-001': ['Dubai Marina', 'Downtown Dubai', 'JBR', 'Palm Jumeirah', 'DIFC', 'Business Bay'],
};

const CURRENCIES: Record<string, string> = {
  'nyc-001': 'USD',
  'la-001': 'USD',
  'miami-001': 'USD',
  'london-001': 'GBP',
  'paris-001': 'EUR',
  'tokyo-001': 'JPY',
  'berlin-001': 'EUR',
  'barcelona-001': 'EUR',
  'amsterdam-001': 'EUR',
  'dubai-001': 'AED',
};

const FLOW_THEMES: Record<string, string[]> = {
  'nyc-001': [
    'Saturday Night Out in Williamsburg', 'Manhattan Upscale Experience', 'Brooklyn Nightlife Crawl',
    'Jazz & Cocktails in Greenwich', 'Lower East Side Party Night', 'Rooftop to Underground',
    'Comedy & Clubs Night', 'Brooklyn Brewery to Dance Club', 'SoHo to East Village', 'Ultimate NYC Night Out',
  ],
  'la-001': [
    'Hollywood Nights Experience', 'West Hollywood Party Circuit', 'Downtown LA Night Tour',
    'Beach to Club Experience', 'Sunset Boulevard Night', 'Venice to Santa Monica',
    'LA Rooftop Tour', 'Music Venue Crawl', 'Celebrity Hotspots Night', 'Ultimate LA Experience',
  ],
  'miami-001': [
    'South Beach Club Circuit', 'Wynwood Art & Nightlife', 'Miami Beach Ultimate Night',
    'Downtown to Brickell', 'Beach to Bass Experience', 'VIP Miami Experience',
    'Cocktails to Dance Floor', 'Ocean Drive to Club Space', 'Rooftop to Beach Club', 'Ultimate Miami Night',
  ],
  'london-001': [
    'Shoreditch Night Out', 'Soho to Camden Experience', 'West End to Mayfair',
    'Electronic Music Tour', 'Jazz to Dance Clubs', 'Rooftop to Underground',
    'Kings Cross Circuit', 'East London Crawl', 'Central London VIP Night', 'Ultimate London Experience',
  ],
  'paris-001': [
    'Le Marais to Pigalle', 'Latin Quarter Night', 'Oberkampf Party Circuit',
    'Electronic Paris Experience', 'Champs-Elysees to Bastille', 'Montmartre Jazz & Clubs',
    'Seine Riverside Night', 'Underground Paris Tour', 'Belleville to Bastille', 'Ultimate Paris Night',
  ],
  'tokyo-001': [
    'Shibuya to Roppongi', 'Shinjuku Night Experience', 'Harajuku to Ginza',
    'Tokyo Electronic Tour', 'Karaoke to Dance Clubs', 'Tokyo Bay Night',
    'Akihabara to Shibuya', 'Roppongi Hills Circuit', 'Jazz & Techno Tokyo', 'Ultimate Tokyo Night',
  ],
  'berlin-001': [
    'Kreuzberg Circuit', 'Friedrichshain Experience', 'Neukolln Night Tour',
    'Techno Temple Tour', 'East Side Gallery to Berghain', 'Warschauer to RAW',
    'Mitte to Kreuzberg', 'Underground Berlin', 'Waterfront Night', 'Ultimate Berlin Experience',
  ],
  'barcelona-001': [
    'Gothic Quarter to Barceloneta', 'Eixample Party Night', 'Beach to Club Experience',
    'Gracia to El Raval', 'Barcelona Electronic Tour', 'Rambla to Port Olimpic',
    'Poblenou Night Circuit', 'Rooftop to Beach Club', 'Barcelona VIP Experience', 'Ultimate Barcelona Night',
  ],
  'amsterdam-001': [
    'De Pijp to Jordaan', 'Noord Underground Tour', 'Canal Ring Experience',
    'Amsterdam Electronic Circuit', 'Centrum to Oost', 'Waterfront Night',
    'Red Light to West', 'Amsterdam Festival Night', 'Warehouse to Club Tour', 'Ultimate Amsterdam Night',
  ],
  'dubai-001': [
    'Dubai Marina Circuit', 'Downtown to DIFC', 'Palm Jumeirah Experience',
    'JBR to Business Bay', 'Dubai Luxury Night', 'Beach to Sky Experience',
    'Marina to Downtown', 'Burj Khalifa to Club', 'Rooftop Dubai Tour', 'Ultimate Dubai Night',
  ],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getRandomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getDateFromNow(daysFromNow: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
}

function getCurrentWeek(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function seedCities() {
  console.log('Seeding cities...');

  const createdCities: { id: string; cityId: string }[] = [];

  for (const city of CITIES) {
    const created = await prisma.city.create({
      data: {
        cityId: city.cityId,
        name: city.name,
        country: city.country,
        countryCode: city.countryCode,
        rank: city.rank,
        timezone: city.timezone,
        heroImage: city.heroImage,
        cardImage: city.cardImage,
        accentColor: city.accentColor,
        latitude: city.latitude,
        longitude: city.longitude,
        featured: city.featured,
        totalPlansThisWeek: 50,
      },
    });

    createdCities.push({ id: created.id, cityId: city.cityId });
    console.log(`  Created city: ${city.name}`);
  }

  console.log(`  Total: ${createdCities.length} cities created\n`);
  return createdCities;
}

async function seedPlans(cities: { id: string; cityId: string }[]) {
  console.log('Seeding plans (50 per city)...');

  let totalPlans = 0;
  const createdPlans: { id: string; planId: string; cityId: string }[] = [];

  for (const city of cities) {
    const venues = CITY_VENUES[city.cityId] || [];
    const neighborhoods = NEIGHBORHOODS[city.cityId] || ['Downtown'];
    const currency = CURRENCIES[city.cityId] || 'USD';

    for (let rank = 1; rank <= 50; rank++) {
      const venueName = venues[rank - 1] || getRandomItem(venues);
      const category = getRandomItem(CATEGORIES);
      const type = getRandomItem(PLAN_TYPES);
      const neighborhood = getRandomItem(neighborhoods);
      const isWeekend = Math.random() > 0.7;
      const daysFromNow = getRandomInRange(0, 6);
      const date = getDateFromNow(daysFromNow);
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
      const startHour = getRandomInRange(18, 23);
      const startTime = `${startHour.toString().padStart(2, '0')}:00`;
      const freeEntry = Math.random() > 0.5;
      const entryFee = freeEntry ? null : getRandomInRange(1000, 5000);
      const priceRange = entryFee === null ? '$' : entryFee < 2000 ? '$$' : entryFee < 3500 ? '$$$' : '$$$$';
      const averageRating = parseFloat((3.5 + Math.random() * 1.5).toFixed(1));
      const totalReviews = getRandomInRange(50, 500);

      const planId = `${city.cityId}-plan-${rank.toString().padStart(3, '0')}`;

      const plan = await prisma.plan.create({
        data: {
          planId,
          cityId: city.id,
          rank,
          title: venueName,
          venueName,
          description: `Experience ${venueName} in ${neighborhood}. ${category} featuring ${getRandomItems(GENRES, 2).join(' and ')} with a ${getRandomItem(VIBES).toLowerCase()} vibe.`,
          category,
          type,
          heroImage: `https://images.unsplash.com/photo-${getRandomInRange(1500000000000, 1600000000000)}-nightlife`,
          thumbnailImage: `https://images.unsplash.com/photo-${getRandomInRange(1500000000000, 1600000000000)}-nightlife?w=400`,
          galleryImages: [],
          address: `${getRandomInRange(100, 999)} ${neighborhood} St`,
          neighborhood,
          googleMapsUrl: `https://maps.google.com/?q=${venueName.replace(/\s/g, '+')}`,
          latitude: null,
          longitude: null,
          date: date.toISOString().split('T')[0],
          startTime,
          endTime: null,
          isWeekend,
          weekday,
          entryFee,
          currency,
          priceRange,
          freeEntry,
          genres: getRandomItems(GENRES, getRandomInRange(1, 3)),
          vibes: getRandomItems(VIBES, getRandomInRange(1, 3)),
          eventType: getRandomItem(['DJ Night', 'Live Band', 'Open Mic', 'Themed Night', 'Happy Hour']),
          isIndividual: true,
          isGroup: rank <= 10,
          isFeatured: rank <= 5,
          averageRating,
          totalReviews,
          reviewSource: getRandomItem(['Google', 'Yelp', 'TripAdvisor']),
          source: 'Seed Script',
        },
      });

      createdPlans.push({ id: plan.id, planId, cityId: city.cityId });
      totalPlans++;
    }

    console.log(`  Created 50 plans for ${city.cityId}`);
  }

  console.log(`  Total: ${totalPlans} plans created\n`);
  return createdPlans;
}

async function seedGroupFlows(cities: { id: string; cityId: string }[], plans: { id: string; planId: string; cityId: string }[]) {
  console.log('Seeding group flows (10 per city)...');

  let totalFlows = 0;

  for (const city of cities) {
    const themes = FLOW_THEMES[city.cityId] || [];
    const cityPlans = plans.filter(p => p.cityId === city.cityId);
    const currency = CURRENCIES[city.cityId] || 'USD';

    for (let rank = 1; rank <= 10; rank++) {
      const flowId = `${city.cityId}-flow-${rank.toString().padStart(3, '0')}`;
      const title = themes[rank - 1] || getRandomItem(themes);
      const numSteps = getRandomInRange(2, 3);
      const selectedPlans = cityPlans.slice((rank - 1) * 3, (rank - 1) * 3 + numSteps);

      const totalHours = numSteps * 1.5;
      const totalEstimate = getRandomInRange(5000, 15000);
      const isWeekend = Math.random() > 0.5;

      const flow = await prisma.groupFlow.create({
        data: {
          flowId,
          cityId: city.id,
          rank,
          title,
          description: `A ${totalHours}-hour experience through the best nightlife spots.`,
          totalHours,
          startTime: '20:00',
          endTime: '02:00',
          totalEstimate,
          currency,
          isWeekend,
          proOnly: true,
          aiGenerated: true,
        },
      });

      // Create steps for this flow
      for (let stepNum = 0; stepNum < selectedPlans.length; stepNum++) {
        const plan = selectedPlans[stepNum];
        const planData = await prisma.plan.findUnique({ where: { id: plan.id } });

        await prisma.groupFlowStep.create({
          data: {
            flowId: flow.id,
            planId: plan.id,
            stepNumber: stepNum + 1,
            title: stepNum === 0 ? 'Pre-Game Drinks' : stepNum === selectedPlans.length - 1 ? 'Main Event' : 'Second Stop',
            venueName: planData?.venueName || 'Venue',
            duration: stepNum === 0 ? 60 : 90,
            thumbnail: planData?.thumbnailImage,
          },
        });
      }

      totalFlows++;
    }

    console.log(`  Created 10 group flows for ${city.cityId}`);
  }

  console.log(`  Total: ${totalFlows} group flows created\n`);
}

async function seedUsers() {
  console.log('Seeding users...');

  // Free user
  const freeUser = await prisma.user.create({
    data: {
      supabaseUserId: 'supabase_test_free_user',
      email: 'free@test.litplanz.com',
      displayName: 'Free Test User',
      imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
    },
  });

  // Free subscription
  await prisma.subscription.create({
    data: {
      userId: freeUser.id,
      supabaseUserId: freeUser.supabaseUserId,
      status: SubscriptionStatus.FREE,
      tier: SubscriptionTier.FREE,
      autoRenew: false,
      maxCitiesPerWeek: 1,
      maxPlansPerCity: 10,
      weekendAccess: false,
      groupPlansAccess: false,
      savedCitiesAccess: false,
    },
  });

  console.log(`  Created free user: ${freeUser.email}`);

  // Pro user
  const proUser = await prisma.user.create({
    data: {
      supabaseUserId: 'supabase_test_pro_user',
      email: 'pro@test.litplanz.com',
      displayName: 'Pro Test User',
      imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
    },
  });

  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  // Pro subscription
  await prisma.subscription.create({
    data: {
      userId: proUser.id,
      supabaseUserId: proUser.supabaseUserId,
      status: SubscriptionStatus.PRO,
      tier: SubscriptionTier.PRO,
      startDate: new Date(),
      expiryDate: oneYearFromNow,
      autoRenew: true,
      transactionId: 'test-transaction-12345',
      productId: 'litplan_pro_yearly',
      originalTransactionId: 'test-original-12345',
      maxCitiesPerWeek: 100,
      maxPlansPerCity: 50,
      weekendAccess: true,
      groupPlansAccess: true,
      savedCitiesAccess: true,
    },
  });

  console.log(`  Created pro user: ${proUser.email}\n`);

  return { freeUser, proUser };
}

async function seedUserData(users: { freeUser: any; proUser: any }, cities: { id: string; cityId: string }[]) {
  console.log('Seeding user activity data...');

  const { freeUser, proUser } = users;

  // Save some cities for pro user
  const savedCityIds = cities.slice(0, 5);
  for (const city of savedCityIds) {
    await prisma.savedCity.create({
      data: {
        userId: proUser.id,
        cityId: city.id,
        notes: `Love the nightlife in this city!`,
      },
    });
  }
  console.log(`  Created ${savedCityIds.length} saved cities for pro user`);

  // Add viewed cities for both users
  for (const city of cities.slice(0, 3)) {
    await prisma.viewedCity.create({
      data: {
        userId: freeUser.id,
        cityId: city.id,
        viewCount: getRandomInRange(1, 5),
      },
    });
  }
  console.log(`  Created viewed cities for free user`);

  for (const city of cities.slice(0, 8)) {
    await prisma.viewedCity.create({
      data: {
        userId: proUser.id,
        cityId: city.id,
        viewCount: getRandomInRange(1, 10),
      },
    });
  }
  console.log(`  Created viewed cities for pro user`);

  // Add user activity
  const activityTypes: ActivityType[] = ['VIEWED_CITY', 'VIEWED_PLAN', 'SEARCH'];

  for (let i = 0; i < 20; i++) {
    await prisma.userActivity.create({
      data: {
        userId: proUser.id,
        type: getRandomItem(activityTypes),
        cityId: getRandomItem(cities).id,
        source: getRandomItem(['explore_tab', 'search', 'saved_cities']),
        sessionId: `session-${getRandomInRange(1000, 9999)}`,
      },
    });
  }

  for (let i = 0; i < 10; i++) {
    await prisma.userActivity.create({
      data: {
        userId: freeUser.id,
        type: getRandomItem(activityTypes),
        cityId: getRandomItem(cities).id,
        source: getRandomItem(['explore_tab', 'search']),
        sessionId: `session-${getRandomInRange(1000, 9999)}`,
      },
    });
  }

  console.log(`  Created user activity records\n`);
}

async function seedAppConfig() {
  console.log('Seeding app config...');

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  await prisma.appConfig.create({
    data: {
      id: 'app',
      currentWeek: getCurrentWeek(),
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      freeMaxCities: 1,
      freeMaxPlans: 10,
      freeWeekendAccess: false,
      proMaxCities: 100,
      proMaxPlans: 50,
      proWeekendAccess: true,
    },
  });

  console.log(`  Created app config for week ${getCurrentWeek()}\n`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('LITPLAN - PRISMA DATABASE SEED');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Clear existing data
    console.log('Clearing existing data...\n');
    await prisma.userActivity.deleteMany();
    await prisma.savedCity.deleteMany();
    await prisma.viewedCity.deleteMany();
    await prisma.groupFlowStep.deleteMany();
    await prisma.groupFlow.deleteMany();
    await prisma.plan.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.user.deleteMany();
    await prisma.city.deleteMany();
    await prisma.appConfig.deleteMany();

    // Seed all data
    const cities = await seedCities();
    const plans = await seedPlans(cities);
    await seedGroupFlows(cities, plans);
    const users = await seedUsers();
    await seedUserData(users, cities);
    await seedAppConfig();

    console.log('='.repeat(60));
    console.log('SEEDING COMPLETE!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Summary:');
    console.log('  - 10 cities');
    console.log('  - 500 plans (50 per city)');
    console.log('  - 100 group flows (10 per city)');
    console.log('  - 2 users (1 free, 1 pro)');
    console.log('  - User activity data');
    console.log('  - App config');
    console.log('');
    console.log('Test Users:');
    console.log('  Free User:');
    console.log('    - Supabase ID: supabase_test_free_user');
    console.log('    - Email: free@test.litplanz.com');
    console.log('    - Max Cities: 1/week');
    console.log('    - Max Plans: 10/city');
    console.log('');
    console.log('  Pro User:');
    console.log('    - Supabase ID: supabase_test_pro_user');
    console.log('    - Email: pro@test.litplanz.com');
    console.log('    - Max Cities: 100/week');
    console.log('    - Max Plans: 50/city');
    console.log('    - Weekend Access: Yes');
    console.log('    - Saved Cities: 5');
    console.log('');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
