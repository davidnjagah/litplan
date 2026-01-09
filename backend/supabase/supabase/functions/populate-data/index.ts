import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Top 50 cities with their details
const CITIES_DATA = [
  { name: 'New York', country: 'United States', timezone: 'America/New_York', flag: '🇺🇸' },
  { name: 'Los Angeles', country: 'United States', timezone: 'America/Los_Angeles', flag: '🇺🇸' },
  { name: 'Miami', country: 'United States', timezone: 'America/New_York', flag: '🇺🇸' },
  { name: 'Chicago', country: 'United States', timezone: 'America/Chicago', flag: '🇺🇸' },
  { name: 'Las Vegas', country: 'United States', timezone: 'America/Los_Angeles', flag: '🇺🇸' },
  { name: 'San Francisco', country: 'United States', timezone: 'America/Los_Angeles', flag: '🇺🇸' },
  { name: 'Austin', country: 'United States', timezone: 'America/Chicago', flag: '🇺🇸' },
  { name: 'Nashville', country: 'United States', timezone: 'America/Chicago', flag: '🇺🇸' },
  { name: 'New Orleans', country: 'United States', timezone: 'America/Chicago', flag: '🇺🇸' },
  { name: 'Boston', country: 'United States', timezone: 'America/New_York', flag: '🇺🇸' },
  { name: 'London', country: 'United Kingdom', timezone: 'Europe/London', flag: '🇬🇧' },
  { name: 'Paris', country: 'France', timezone: 'Europe/Paris', flag: '🇫🇷' },
  { name: 'Berlin', country: 'Germany', timezone: 'Europe/Berlin', flag: '🇩🇪' },
  { name: 'Barcelona', country: 'Spain', timezone: 'Europe/Madrid', flag: '🇪🇸' },
  { name: 'Amsterdam', country: 'Netherlands', timezone: 'Europe/Amsterdam', flag: '🇳🇱' },
  { name: 'Madrid', country: 'Spain', timezone: 'Europe/Madrid', flag: '🇪🇸' },
  { name: 'Rome', country: 'Italy', timezone: 'Europe/Rome', flag: '🇮🇹' },
  { name: 'Milan', country: 'Italy', timezone: 'Europe/Rome', flag: '🇮🇹' },
  { name: 'Lisbon', country: 'Portugal', timezone: 'Europe/Lisbon', flag: '🇵🇹' },
  { name: 'Prague', country: 'Czech Republic', timezone: 'Europe/Prague', flag: '🇨🇿' },
  { name: 'Vienna', country: 'Austria', timezone: 'Europe/Vienna', flag: '🇦🇹' },
  { name: 'Dublin', country: 'Ireland', timezone: 'Europe/Dublin', flag: '🇮🇪' },
  { name: 'Copenhagen', country: 'Denmark', timezone: 'Europe/Copenhagen', flag: '🇩🇰' },
  { name: 'Stockholm', country: 'Sweden', timezone: 'Europe/Stockholm', flag: '🇸🇪' },
  { name: 'Brussels', country: 'Belgium', timezone: 'Europe/Brussels', flag: '🇧🇪' },
  { name: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo', flag: '🇯🇵' },
  { name: 'Seoul', country: 'South Korea', timezone: 'Asia/Seoul', flag: '🇰🇷' },
  { name: 'Bangkok', country: 'Thailand', timezone: 'Asia/Bangkok', flag: '🇹🇭' },
  { name: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore', flag: '🇸🇬' },
  { name: 'Hong Kong', country: 'China', timezone: 'Asia/Hong_Kong', flag: '🇭🇰' },
  { name: 'Shanghai', country: 'China', timezone: 'Asia/Shanghai', flag: '🇨🇳' },
  { name: 'Taipei', country: 'Taiwan', timezone: 'Asia/Taipei', flag: '🇹🇼' },
  { name: 'Bali', country: 'Indonesia', timezone: 'Asia/Makassar', flag: '🇮🇩' },
  { name: 'Mumbai', country: 'India', timezone: 'Asia/Kolkata', flag: '🇮🇳' },
  { name: 'Dubai', country: 'United Arab Emirates', timezone: 'Asia/Dubai', flag: '🇦🇪' },
  { name: 'Tel Aviv', country: 'Israel', timezone: 'Asia/Jerusalem', flag: '🇮🇱' },
  { name: 'Istanbul', country: 'Turkey', timezone: 'Europe/Istanbul', flag: '🇹🇷' },
  { name: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney', flag: '🇦🇺' },
  { name: 'Melbourne', country: 'Australia', timezone: 'Australia/Melbourne', flag: '🇦🇺' },
  { name: 'Auckland', country: 'New Zealand', timezone: 'Pacific/Auckland', flag: '🇳🇿' },
  { name: 'Toronto', country: 'Canada', timezone: 'America/Toronto', flag: '🇨🇦' },
  { name: 'Montreal', country: 'Canada', timezone: 'America/Montreal', flag: '🇨🇦' },
  { name: 'Vancouver', country: 'Canada', timezone: 'America/Vancouver', flag: '🇨🇦' },
  { name: 'Mexico City', country: 'Mexico', timezone: 'America/Mexico_City', flag: '🇲🇽' },
  { name: 'Buenos Aires', country: 'Argentina', timezone: 'America/Argentina/Buenos_Aires', flag: '🇦🇷' },
  { name: 'São Paulo', country: 'Brazil', timezone: 'America/Sao_Paulo', flag: '🇧🇷' },
  { name: 'Rio de Janeiro', country: 'Brazil', timezone: 'America/Sao_Paulo', flag: '🇧🇷' },
  { name: 'Bogotá', country: 'Colombia', timezone: 'America/Bogota', flag: '🇨🇴' },
  { name: 'Cape Town', country: 'South Africa', timezone: 'Africa/Johannesburg', flag: '🇿🇦' },
  { name: 'Marrakech', country: 'Morocco', timezone: 'Africa/Casablanca', flag: '🇲🇦' },
];

// Real venues data by city
const VENUES_BY_CITY: Record<string, any[]> = {
  'New York': [
    { venueName: 'Blue Note Jazz Club', category: 'Jazz Club', neighborhood: 'Greenwich Village', address: '131 W 3rd St', lat: 40.7308, lng: -74.0008, priceRange: '$$$', entryFee: 35, ageRestriction: 21, tags: ['Live Music', 'Jazz', 'Intimate', 'Historic'], description: 'Legendary jazz club hosting world-class performers since 1981. Experience intimate live jazz performances in this iconic Greenwich Village venue that has hosted the greatest names in jazz history.' },
    { venueName: 'Le Bain', category: 'Nightclub', neighborhood: 'Meatpacking District', address: '848 Washington St', lat: 40.7409, lng: -74.0076, priceRange: '$$$', entryFee: 30, ageRestriction: 21, tags: ['Rooftop', 'Dancing', 'DJ', 'Views'], description: 'Iconic rooftop nightclub at The Standard High Line with stunning views, world-class DJs, and a legendary hot tub on the dance floor. The perfect late-night destination.' },
    { venueName: 'The Roof at PUBLIC', category: 'Rooftop Bar', neighborhood: 'Lower East Side', address: '215 Chrystie St', lat: 40.7231, lng: -73.9911, priceRange: '$$$$', entryFee: 0, ageRestriction: 21, tags: ['Rooftop', 'Cocktails', 'Views', 'Upscale'], description: 'Stunning rooftop bar with panoramic Manhattan views, craft cocktails, and sophisticated atmosphere. Perfect for sunset drinks and evening socializing.' },
    { venueName: 'Brooklyn Brewery', category: 'Brewery', neighborhood: 'Williamsburg', address: '79 N 11th St', lat: 40.7217, lng: -73.9576, priceRange: '$$', entryFee: 0, ageRestriction: 21, tags: ['Craft Beer', 'Tours', 'Casual', 'Brooklyn'], description: 'Brooklyn\'s most famous craft brewery offering tours, tastings, and a vibrant taproom. A must-visit for beer lovers exploring Williamsburg.' },
    { venueName: 'Comedy Cellar', category: 'Comedy Club', neighborhood: 'Greenwich Village', address: '117 MacDougal St', lat: 40.7299, lng: -74.0003, priceRange: '$$', entryFee: 25, ageRestriction: 18, tags: ['Comedy', 'Stand-up', 'Legends', 'Intimate'], description: 'The most legendary comedy club in America where stars like Dave Chappelle, Amy Schumer, and Chris Rock drop in regularly. Intimate basement setting with world-class comedy.' },
    { venueName: 'House of Yes', category: 'Nightclub', neighborhood: 'Bushwick', address: '2 Wyckoff Ave', lat: 40.7062, lng: -73.9201, priceRange: '$$', entryFee: 20, ageRestriction: 21, tags: ['Performance Art', 'Dancing', 'Immersive', 'Creative'], description: 'Brooklyn\'s most creative nightlife venue combining circus, dance, and performance art. Every night is a unique immersive experience in this wildly artistic space.' },
    { venueName: 'Elsewhere', category: 'Live Music', neighborhood: 'Bushwick', address: '599 Johnson Ave', lat: 40.7012, lng: -73.9268, priceRange: '$$', entryFee: 25, ageRestriction: 21, tags: ['Live Music', 'Electronic', 'Multi-Room', 'Brooklyn'], description: 'Multi-room music venue in Bushwick featuring cutting-edge electronic, indie, and alternative acts across multiple stages and a rooftop.' },
    { venueName: 'Bemelmans Bar', category: 'Cocktail Bar', neighborhood: 'Upper East Side', address: '35 E 76th St', lat: 40.7744, lng: -73.9638, priceRange: '$$$$', entryFee: 0, ageRestriction: 21, tags: ['Classic Cocktails', 'Art Deco', 'Piano Bar', 'Elegant'], description: 'Timeless Art Deco cocktail bar at The Carlyle featuring live piano and the only intact Ludwig Bemelmans murals. Old New York elegance at its finest.' },
    { venueName: 'Nowadays', category: 'Nightclub', neighborhood: 'Ridgewood', address: '56-06 Cooper Ave', lat: 40.7022, lng: -73.8957, priceRange: '$$', entryFee: 15, ageRestriction: 21, tags: ['Outdoor', 'Electronic', 'Dancing', 'Garden'], description: 'Open-air club with indoor/outdoor spaces featuring world-class electronic music programming. A Brooklyn institution for house and techno lovers.' },
    { venueName: 'The Box', category: 'Nightclub', neighborhood: 'Lower East Side', address: '189 Chrystie St', lat: 40.7219, lng: -73.9922, priceRange: '$$$$', entryFee: 50, ageRestriction: 21, tags: ['Burlesque', 'VIP', 'Performance', 'Exclusive'], description: 'Ultra-exclusive theatrical nightclub featuring provocative burlesque performances and A-list clientele. One of NYC\'s most exclusive nightlife experiences.' },
    { venueName: 'Smalls Jazz Club', category: 'Jazz Club', neighborhood: 'Greenwich Village', address: '183 W 10th St', lat: 40.7339, lng: -74.0034, priceRange: '$$', entryFee: 20, ageRestriction: 18, tags: ['Jazz', 'Intimate', 'Late Night', 'Underground'], description: 'Intimate basement jazz club known for late-night jam sessions and emerging talent. A Village institution for serious jazz enthusiasts.' },
    { venueName: 'Output', category: 'Nightclub', neighborhood: 'Williamsburg', address: '74 Wythe Ave', lat: 40.7211, lng: -73.9579, priceRange: '$$$', entryFee: 30, ageRestriction: 21, tags: ['Electronic', 'Funktion-One', 'Dancing', 'Underground'], description: 'Premium electronic music venue with world-class Funktion-One sound system. Hosting top international DJs in an immersive warehouse setting.' },
    { venueName: 'Cielo', category: 'Nightclub', neighborhood: 'Meatpacking District', address: '18 Little W 12th St', lat: 40.7405, lng: -74.0071, priceRange: '$$$', entryFee: 25, ageRestriction: 21, tags: ['House Music', 'Dancing', 'Underground', 'Intimate'], description: 'Legendary underground house music club with one of NYC\'s best dance floors and sound systems. A must for house and techno purists.' },
    { venueName: 'Sleep No More', category: 'Theater', neighborhood: 'Chelsea', address: '530 W 27th St', lat: 40.7513, lng: -74.0048, priceRange: '$$$$', entryFee: 150, ageRestriction: 18, tags: ['Immersive', 'Theater', 'Macbeth', 'Experience'], description: 'Groundbreaking immersive theater experience based on Macbeth set in a 1930s hotel. Wear a mask and explore the mysterious McKittrick Hotel.' },
    { venueName: 'Please Don\'t Tell', category: 'Speakeasy', neighborhood: 'East Village', address: '113 St Marks Pl', lat: 40.7271, lng: -73.9850, priceRange: '$$$', entryFee: 0, ageRestriction: 21, tags: ['Speakeasy', 'Hidden', 'Craft Cocktails', 'Hot Dogs'], description: 'Hidden speakeasy accessed through a phone booth in Crif Dogs. Exceptional craft cocktails in a vintage setting. Reservations recommended.' },
    { venueName: 'Webster Hall', category: 'Concert Venue', neighborhood: 'East Village', address: '125 E 11th St', lat: 40.7320, lng: -73.9893, priceRange: '$$', entryFee: 35, ageRestriction: 18, tags: ['Live Music', 'Historic', 'Multi-Level', 'Dancing'], description: 'Historic multi-level venue hosting concerts and club nights since 1886. Recently renovated with modern sound while preserving its legendary character.' },
    { venueName: 'Angels Share', category: 'Cocktail Bar', neighborhood: 'East Village', address: '8 Stuyvesant St', lat: 40.7296, lng: -73.9894, priceRange: '$$$', entryFee: 0, ageRestriction: 21, tags: ['Japanese Cocktails', 'Hidden', 'Intimate', 'Craft'], description: 'Hidden Japanese cocktail bar accessed through a Japanese restaurant. Exquisite craft cocktails in a sophisticated, intimate setting.' },
    { venueName: 'The Jane Hotel Ballroom', category: 'Lounge', neighborhood: 'West Village', address: '113 Jane St', lat: 40.7380, lng: -74.0090, priceRange: '$$$', entryFee: 20, ageRestriction: 21, tags: ['Historic', 'Elegant', 'Dancing', 'Cocktails'], description: 'Gorgeous vintage ballroom in a historic hotel that once housed Titanic survivors. Elegant cocktails and weekend dance parties.' },
    { venueName: 'Birdland Jazz Club', category: 'Jazz Club', neighborhood: 'Midtown', address: '315 W 44th St', lat: 40.7580, lng: -73.9910, priceRange: '$$$', entryFee: 40, ageRestriction: 18, tags: ['Jazz', 'Big Bands', 'Historic', 'Dinner'], description: 'Legendary jazz club hosting big bands and jazz legends. Full dinner service with premium sound and sightlines for every seat.' },
    { venueName: 'Russ & Daughters Cafe', category: 'Wine Bar', neighborhood: 'Lower East Side', address: '127 Orchard St', lat: 40.7193, lng: -73.9904, priceRange: '$$', entryFee: 0, ageRestriction: 21, tags: ['Jewish Deli', 'Wine', 'Classic', 'Appetizing'], description: 'Sit-down extension of the legendary appetizing shop. Classic Jewish fare paired with an excellent wine and cocktail selection.' },
    // Additional NYC venues
    { venueName: 'Marquee New York', category: 'Nightclub', neighborhood: 'Chelsea', address: '289 10th Ave', lat: 40.7491, lng: -74.0052, priceRange: '$$$$', entryFee: 40, ageRestriction: 21, tags: ['VIP', 'Bottle Service', 'Dancing', 'Celebrity'], description: 'Premier nightclub destination attracting celebrities and the fashion crowd. World-class DJs and premium bottle service.' },
    { venueName: 'Good Room', category: 'Nightclub', neighborhood: 'Greenpoint', address: '98 Meserole Ave', lat: 40.7269, lng: -73.9510, priceRange: '$$', entryFee: 20, ageRestriction: 21, tags: ['Electronic', 'Underground', 'Dancing', 'Brooklyn'], description: 'Brooklyn underground electronic music venue with excellent sound and a dedicated dance music following.' },
    { venueName: 'Death & Co', category: 'Cocktail Bar', neighborhood: 'East Village', address: '433 E 6th St', lat: 40.7261, lng: -73.9857, priceRange: '$$$', entryFee: 0, ageRestriction: 21, tags: ['Craft Cocktails', 'Award-Winning', 'Intimate', 'Speakeasy'], description: 'Award-winning cocktail bar that helped define modern cocktail culture. Creative drinks in an intimate, dimly lit space.' },
    { venueName: 'The Shed', category: 'Concert Venue', neighborhood: 'Hudson Yards', address: '545 W 30th St', lat: 40.7536, lng: -74.0011, priceRange: '$$$', entryFee: 50, ageRestriction: 0, tags: ['Arts', 'Performance', 'Modern', 'Architecture'], description: 'Cutting-edge cultural center hosting concerts, performances, and art exhibitions in a stunning architectural space.' },
    { venueName: 'Village Vanguard', category: 'Jazz Club', neighborhood: 'Greenwich Village', address: '178 7th Ave S', lat: 40.7361, lng: -74.0011, priceRange: '$$$', entryFee: 35, ageRestriction: 18, tags: ['Jazz', 'Legendary', 'Intimate', 'Historic'], description: 'The most prestigious jazz club in the world, hosting live jazz since 1935. Every major jazz musician has played this intimate basement room.' },
    { venueName: 'Brooklyn Mirage', category: 'Nightclub', neighborhood: 'Brooklyn Navy Yard', address: '140 Stewart Ave', lat: 40.6976, lng: -73.9739, priceRange: '$$$', entryFee: 40, ageRestriction: 21, tags: ['Electronic', 'Outdoor', 'Festival', 'Massive'], description: 'Epic outdoor electronic music venue with festival-quality production. Summer season brings world-class DJs to this massive Brooklyn space.' },
    { venueName: 'Attaboy', category: 'Speakeasy', neighborhood: 'Lower East Side', address: '134 Eldridge St', lat: 40.7196, lng: -73.9917, priceRange: '$$$', entryFee: 0, ageRestriction: 21, tags: ['Bespoke Cocktails', 'No Menu', 'Intimate', 'Expert'], description: 'No-menu cocktail bar where expert bartenders craft drinks based on your preferences. Intimate space, exceptional cocktails.' },
    { venueName: 'B.B. King Blues Club', category: 'Live Music', neighborhood: 'Times Square', address: '237 W 42nd St', lat: 40.7565, lng: -73.9884, priceRange: '$$', entryFee: 25, ageRestriction: 18, tags: ['Blues', 'Soul', 'Live Music', 'Dinner'], description: 'Times Square institution for blues, soul, and R&B featuring live performances and Southern comfort food.' },
    { venueName: 'Bowery Ballroom', category: 'Concert Venue', neighborhood: 'Lower East Side', address: '6 Delancey St', lat: 40.7203, lng: -73.9936, priceRange: '$$', entryFee: 30, ageRestriction: 18, tags: ['Indie Rock', 'Alternative', 'Historic', 'Sound'], description: 'One of NYC\'s best indie rock venues with perfect acoustics and sightlines. A rite of passage for rising artists.' },
    { venueName: 'Brooklyn Bowl', category: 'Live Music', neighborhood: 'Williamsburg', address: '61 Wythe Ave', lat: 40.7223, lng: -73.9579, priceRange: '$$', entryFee: 20, ageRestriction: 21, tags: ['Live Music', 'Bowling', 'Food', 'Dancing'], description: 'Unique venue combining live music with bowling, craft beer, and Blue Ribbon fried chicken. Great for groups and concerts.' },
  ],
  'Los Angeles': [
    { venueName: 'The Viper Room', category: 'Live Music', neighborhood: 'West Hollywood', address: '8852 Sunset Blvd', lat: 34.0903, lng: -118.3869, priceRange: '$$', entryFee: 15, ageRestriction: 21, tags: ['Rock', 'Historic', 'Intimate', 'Sunset Strip'], description: 'Legendary Sunset Strip rock club with decades of rock history. Intimate shows from emerging and established rock acts.' },
    { venueName: 'The Hollywood Roosevelt Pool', category: 'Rooftop Bar', neighborhood: 'Hollywood', address: '7000 Hollywood Blvd', lat: 34.1013, lng: -118.3388, priceRange: '$$$$', entryFee: 0, ageRestriction: 21, tags: ['Pool', 'Celebrity', 'Views', 'Glamorous'], description: 'Iconic poolside bar at the historic Hollywood Roosevelt Hotel. Celebrity spotting, craft cocktails, and old Hollywood glamour.' },
    { venueName: 'Catch One', category: 'Nightclub', neighborhood: 'Mid-City', address: '4067 W Pico Blvd', lat: 34.0473, lng: -118.3326, priceRange: '$$', entryFee: 20, ageRestriction: 21, tags: ['LGBTQ+', 'Historic', 'Dancing', 'Diverse'], description: 'Historic LGBTQ+ club and concert venue, one of the first Black-owned discos in America. Now hosts diverse concerts and dance nights.' },
    { venueName: 'Skybar at Mondrian', category: 'Rooftop Bar', neighborhood: 'West Hollywood', address: '8440 Sunset Blvd', lat: 34.0901, lng: -118.3752, priceRange: '$$$$', entryFee: 0, ageRestriction: 21, tags: ['Pool', 'Views', 'Celebrities', 'Upscale'], description: 'Iconic LA poolside bar with sweeping city views and celebrity clientele. The epitome of LA glamour and nightlife.' },
    { venueName: 'Sound Nightclub', category: 'Nightclub', neighborhood: 'Hollywood', address: '1642 N Las Palmas Ave', lat: 34.1014, lng: -118.3325, priceRange: '$$$', entryFee: 30, ageRestriction: 21, tags: ['Electronic', 'Funktion-One', 'Underground', 'Dancing'], description: 'Premier underground electronic music venue with world-class Funktion-One sound. Intimate setting for house and techno lovers.' },
    { venueName: 'The Troubadour', category: 'Live Music', neighborhood: 'West Hollywood', address: '9081 Santa Monica Blvd', lat: 34.0815, lng: -118.3890, priceRange: '$$', entryFee: 25, ageRestriction: 18, tags: ['Legendary', 'Rock', 'Singer-Songwriter', 'Historic'], description: 'Legendary venue that launched countless careers from Elton John to James Taylor. Still discovering the next generation of artists.' },
    { venueName: 'The Comedy Store', category: 'Comedy Club', neighborhood: 'West Hollywood', address: '8433 Sunset Blvd', lat: 34.0901, lng: -118.3741, priceRange: '$$', entryFee: 25, ageRestriction: 18, tags: ['Comedy', 'Legendary', 'Stand-up', 'Historic'], description: 'The most famous comedy club in LA where legends like Robin Williams and Richard Pryor got their start. Three rooms of nightly comedy.' },
    { venueName: 'Jumbo\'s Clown Room', category: 'Dive Bar', neighborhood: 'Hollywood', address: '5153 Hollywood Blvd', lat: 34.0982, lng: -118.3073, priceRange: '$', entryFee: 0, ageRestriction: 21, tags: ['Dive Bar', 'Burlesque', 'Quirky', 'Legendary'], description: 'Legendary LA dive bar famous for its retro burlesque dancers and rock & roll atmosphere. A true Hollywood institution.' },
    { venueName: 'Exchange LA', category: 'Nightclub', neighborhood: 'Downtown', address: '618 S Spring St', lat: 34.0456, lng: -118.2503, priceRange: '$$$', entryFee: 35, ageRestriction: 21, tags: ['EDM', 'Historic Building', 'Massive', 'Production'], description: 'Massive EDM nightclub in a historic Stock Exchange building. World-class production and top-tier DJ bookings.' },
    { venueName: 'The Biltmore', category: 'Cocktail Bar', neighborhood: 'Downtown', address: '506 S Grand Ave', lat: 34.0489, lng: -118.2554, priceRange: '$$$', entryFee: 0, ageRestriction: 21, tags: ['Historic', 'Elegant', 'Classic Cocktails', 'Art Deco'], description: 'Stunning Art Deco bar in the legendary Millennium Biltmore Hotel. Classic cocktails in breathtaking historic surroundings.' },
    { venueName: 'No Vacancy', category: 'Speakeasy', neighborhood: 'Hollywood', address: '1727 N Hudson Ave', lat: 34.1023, lng: -118.3330, priceRange: '$$$', entryFee: 0, ageRestriction: 21, tags: ['Speakeasy', 'Hidden', 'Victorian', 'Performance'], description: 'Hidden speakeasy in a Victorian house with burlesque performances, magic shows, and craft cocktails. Enter through a secret closet.' },
    { venueName: 'The Dresden', category: 'Lounge', neighborhood: 'Los Feliz', address: '1760 N Vermont Ave', lat: 34.1029, lng: -118.2920, priceRange: '$$', entryFee: 0, ageRestriction: 21, tags: ['Retro', 'Live Music', 'Lounge', 'Classic'], description: 'Timeless Hollywood lounge featuring legendary duo Marty and Elayne. Retro atmosphere and classic cocktails since 1954.' },
    { venueName: 'Whisky a Go Go', category: 'Live Music', neighborhood: 'West Hollywood', address: '8901 Sunset Blvd', lat: 34.0903, lng: -118.3855, priceRange: '$$', entryFee: 20, ageRestriction: 18, tags: ['Rock', 'Historic', 'Sunset Strip', 'Legendary'], description: 'Iconic Sunset Strip rock venue where The Doors were the house band. Still hosting rock shows that make history.' },
    { venueName: 'Avalon Hollywood', category: 'Nightclub', neighborhood: 'Hollywood', address: '1735 Vine St', lat: 34.1023, lng: -118.3263, priceRange: '$$$', entryFee: 30, ageRestriction: 21, tags: ['EDM', 'Historic', 'Dancing', 'Production'], description: 'Historic theater turned premier nightclub hosting world-class EDM acts. Beautiful venue with incredible production.' },
    { venueName: 'The Roger Room', category: 'Cocktail Bar', neighborhood: 'West Hollywood', address: '370 N La Cienega Blvd', lat: 34.0795, lng: -118.3769, priceRange: '$$$', entryFee: 0, ageRestriction: 21, tags: ['Craft Cocktails', 'Intimate', 'Quality', 'Bar'], description: 'Intimate cocktail bar known for exceptional drinks and knowledgeable bartenders. No-frills quality in a neighborhood setting.' },
    { venueName: 'The Hollywood Bowl', category: 'Concert Venue', neighborhood: 'Hollywood', address: '2301 N Highland Ave', lat: 34.1122, lng: -118.3391, priceRange: '$$$$', entryFee: 50, ageRestriction: 0, tags: ['Outdoor', 'Orchestra', 'Iconic', 'Views'], description: 'The most iconic outdoor concert venue in LA hosting the LA Philharmonic and legendary performers under the stars.' },
    { venueName: 'Clifton\'s Republic', category: 'Bar', neighborhood: 'Downtown', address: '648 S Broadway', lat: 34.0444, lng: -118.2532, priceRange: '$$', entryFee: 0, ageRestriction: 21, tags: ['Historic', 'Quirky', 'Multi-Level', 'Tiki'], description: 'Historic five-story wonderland with multiple bars including a tiki bar in a redwood forest. LA\'s most unique drinking destination.' },
    { venueName: 'The Greek Theatre', category: 'Concert Venue', neighborhood: 'Los Feliz', address: '2700 N Vermont Ave', lat: 34.1195, lng: -118.2965, priceRange: '$$$', entryFee: 60, ageRestriction: 0, tags: ['Outdoor', 'Views', 'Historic', 'Amphitheater'], description: 'Stunning outdoor amphitheater in Griffith Park hosting major tours in an intimate natural setting.' },
    { venueName: 'Academy LA', category: 'Nightclub', neighborhood: 'Hollywood', address: '6021 Hollywood Blvd', lat: 34.1017, lng: -118.3178, priceRange: '$$$', entryFee: 30, ageRestriction: 21, tags: ['EDM', 'Multi-Room', 'Production', 'Dancing'], description: 'Multi-room nightclub destination with exceptional production and diverse electronic music programming.' },
    { venueName: 'The Satellite', category: 'Live Music', neighborhood: 'Silver Lake', address: '1717 Silver Lake Blvd', lat: 34.0894, lng: -118.2677, priceRange: '$$', entryFee: 15, ageRestriction: 21, tags: ['Indie', 'Intimate', 'Emerging Artists', 'Silver Lake'], description: 'Intimate Silver Lake venue championing indie and alternative artists. Known for Monday night residencies that launch careers.' },
    { venueName: 'La Descarga', category: 'Speakeasy', neighborhood: 'Hollywood', address: '1159 N Western Ave', lat: 34.0935, lng: -118.3093, priceRange: '$$$', entryFee: 20, ageRestriction: 21, tags: ['Cuban', 'Rum', 'Dancing', 'Speakeasy'], description: 'Cuban-themed speakeasy with live salsa bands, world-class rum selection, and late-night dancing. Havana nights in Hollywood.' },
    { venueName: 'Musso & Frank Grill', category: 'Cocktail Bar', neighborhood: 'Hollywood', address: '6667 Hollywood Blvd', lat: 34.1017, lng: -118.3358, priceRange: '$$$', entryFee: 0, ageRestriction: 21, tags: ['Classic', 'Historic', 'Martinis', 'Old Hollywood'], description: 'Hollywood\'s oldest restaurant (1919) with legendary bartenders and the best martinis in LA. Where Old Hollywood still drinks.' },
    { venueName: 'The Roxy Theatre', category: 'Live Music', neighborhood: 'West Hollywood', address: '9009 Sunset Blvd', lat: 34.0812, lng: -118.3882, priceRange: '$$', entryFee: 25, ageRestriction: 18, tags: ['Rock', 'Legendary', 'Intimate', 'Sunset Strip'], description: 'Legendary Sunset Strip venue with perfect sound and intimate setting. Bruce Springsteen recorded a live album here.' },
    { venueName: 'Harvelle\'s', category: 'Live Music', neighborhood: 'Santa Monica', address: '1432 4th St', lat: 34.0154, lng: -118.4953, priceRange: '$$', entryFee: 15, ageRestriction: 21, tags: ['Blues', 'Jazz', 'Historic', 'Dancing'], description: 'Santa Monica\'s oldest live music venue (1931) featuring blues, jazz, and soul with dancing. A true LA institution.' },
    { venueName: 'Teragram Ballroom', category: 'Concert Venue', neighborhood: 'Downtown', address: '1234 W 7th St', lat: 34.0517, lng: -118.2643, priceRange: '$$', entryFee: 30, ageRestriction: 18, tags: ['Indie', 'Alternative', 'Historic', 'Sound'], description: 'Beautifully restored historic ballroom hosting mid-size concerts with exceptional sound. Downtown\'s premier indie venue.' },
    { venueName: 'Pattern Bar', category: 'Cocktail Bar', neighborhood: 'Downtown', address: '100 W 9th St', lat: 34.0441, lng: -118.2549, priceRange: '$$', entryFee: 0, ageRestriction: 21, tags: ['Design', 'Cocktails', 'Hip', 'Downtown'], description: 'Stylish downtown cocktail bar in the historic Pattern building with excellent drinks and weekend DJ sets.' },
    { venueName: 'Genghis Cohen', category: 'Live Music', neighborhood: 'Fairfax', address: '740 N Fairfax Ave', lat: 34.0840, lng: -118.3616, priceRange: '$$', entryFee: 15, ageRestriction: 21, tags: ['Singer-Songwriter', 'Intimate', 'Chinese Food', 'Eclectic'], description: 'Unique venue combining a Chinese restaurant with an intimate performance space. Known for singer-songwriter showcases.' },
    { venueName: 'The Standard Downtown', category: 'Rooftop Bar', neighborhood: 'Downtown', address: '550 S Flower St', lat: 34.0487, lng: -118.2586, priceRange: '$$$', entryFee: 0, ageRestriction: 21, tags: ['Rooftop', 'Pool', 'Views', 'Trendy'], description: 'Iconic rooftop pool bar with stunning downtown views, vibrating water beds, and weekend DJ sets. Peak LA nightlife.' },
    { venueName: 'Hotel Cafe', category: 'Live Music', neighborhood: 'Hollywood', address: '1623 N Cahuenga Blvd', lat: 34.0994, lng: -118.3286, priceRange: '$$', entryFee: 15, ageRestriction: 21, tags: ['Singer-Songwriter', 'Intimate', 'Acoustic', 'Discovery'], description: 'Intimate listening room that launched Ingrid Michaelson, Adele, and countless others. The premier singer-songwriter venue.' },
    { venueName: '1720', category: 'Nightclub', neighborhood: 'Downtown', address: '1720 E 16th St', lat: 34.0208, lng: -118.2388, priceRange: '$$', entryFee: 25, ageRestriction: 21, tags: ['Electronic', 'Underground', 'Warehouse', 'Dancing'], description: 'Downtown warehouse venue for underground electronic music. Authentic rave atmosphere with quality bookings.' },
  ],
  'Miami': [
    { venueName: 'LIV', category: 'Nightclub', neighborhood: 'South Beach', address: '4441 Collins Ave', lat: 25.8141, lng: -80.1223, priceRange: '$$$$', entryFee: 50, ageRestriction: 21, tags: ['VIP', 'Celebrity', 'Bottle Service', 'Mega Club'], description: 'Miami\'s most famous nightclub at the Fontainebleau hosting celebrity-studded nights with world-class DJs and stunning production.' },
    { venueName: 'Club Space', category: 'Nightclub', neighborhood: 'Downtown', address: '34 NE 11th St', lat: 25.7874, lng: -80.1905, priceRange: '$$$', entryFee: 40, ageRestriction: 21, tags: ['24-Hour', 'Terrace', 'Electronic', 'Marathon'], description: 'Legendary 24-hour club with rooftop terrace, famous for marathon Sunday sets and underground electronic programming.' },
    { venueName: 'Ball & Chain', category: 'Live Music', neighborhood: 'Little Havana', address: '1513 SW 8th St', lat: 25.7652, lng: -80.2135, priceRange: '$$', entryFee: 0, ageRestriction: 21, tags: ['Cuban', 'Live Music', 'Dancing', 'Historic'], description: 'Historic Little Havana venue with live Cuban music, dancing, and authentic Cuban cocktails. A cultural institution since 1935.' },
    { venueName: 'E11EVEN', category: 'Nightclub', neighborhood: 'Downtown', address: '29 NE 11th St', lat: 25.7875, lng: -80.1908, priceRange: '$$$$', entryFee: 50, ageRestriction: 21, tags: ['24-Hour', 'Ultra Club', 'Acrobats', 'Extravagant'], description: '24-hour ultraclub with aerial performers, world-class DJs, and over-the-top production. Miami nightlife at its most extravagant.' },
    { venueName: 'Basement Miami', category: 'Nightclub', neighborhood: 'South Beach', address: '2901 Collins Ave', lat: 25.7997, lng: -80.1257, priceRange: '$$$', entryFee: 30, ageRestriction: 21, tags: ['Bowling', 'Ice Skating', 'Dancing', 'Unique'], description: 'Underground venue combining nightclub with bowling alley and ice skating rink. Three venues in one unique space.' },
    { venueName: 'The Anderson', category: 'Cocktail Bar', neighborhood: 'Upper Eastside', address: '709 NE 79th St', lat: 25.8483, lng: -80.1813, priceRange: '$$', entryFee: 0, ageRestriction: 21, tags: ['Neighborhood', 'Craft Cocktails', 'Casual', 'Local'], description: 'Beloved neighborhood cocktail bar with excellent drinks and a locals-first atmosphere. No pretension, just quality.' },
    { venueName: 'Gramps', category: 'Dive Bar', neighborhood: 'Wynwood', address: '176 NW 24th St', lat: 25.7963, lng: -80.1992, priceRange: '$', entryFee: 0, ageRestriction: 21, tags: ['Dive Bar', 'Drag Shows', 'Backyard', 'Quirky'], description: 'Wynwood\'s favorite dive bar with a great backyard, regular drag shows, and unpretentious vibes. A neighborhood staple.' },
    { venueName: 'Broken Shaker', category: 'Cocktail Bar', neighborhood: 'Miami Beach', address: '2727 Indian Creek Dr', lat: 25.8008, lng: -80.1338, priceRange: '$$$', entryFee: 0, ageRestriction: 21, tags: ['Award-Winning', 'Poolside', 'Craft Cocktails', 'Garden'], description: 'Award-winning cocktail bar at the Freehand with a tropical garden setting. Creative drinks that pushed Miami\'s cocktail scene forward.' },
    { venueName: 'The Fillmore Miami Beach', category: 'Concert Venue', neighborhood: 'South Beach', address: '1700 Washington Ave', lat: 25.7892, lng: -80.1367, priceRange: '$$$', entryFee: 50, ageRestriction: 18, tags: ['Art Deco', 'Historic', 'Concerts', 'Theater'], description: 'Stunning Art Deco theater hosting major tours and concerts. Historic beauty with modern sound in the heart of South Beach.' },
    { venueName: 'Do Not Sit On The Furniture', category: 'Nightclub', neighborhood: 'Wynwood', address: '423 NW 23rd St', lat: 25.7955, lng: -80.1989, priceRange: '$$', entryFee: 25, ageRestriction: 21, tags: ['House Music', 'Underground', 'Intimate', 'Quality'], description: 'Intimate underground house and techno club with no-photos policy and serious dancers. Quality over hype.' },
    { venueName: 'Mango\'s Tropical Cafe', category: 'Nightclub', neighborhood: 'South Beach', address: '900 Ocean Dr', lat: 25.7805, lng: -80.1300, priceRange: '$$', entryFee: 20, ageRestriction: 21, tags: ['Latin', 'Dancing', 'Live Music', 'Tourist'], description: 'Iconic Ocean Drive nightclub with live Latin bands and high-energy dancing. A tourist landmark but genuinely fun.' },
    { venueName: 'Treehouse', category: 'Nightclub', neighborhood: 'North Miami Beach', address: '323 NW 23rd St', lat: 25.7957, lng: -80.1991, priceRange: '$$', entryFee: 25, ageRestriction: 21, tags: ['Electronic', 'Outdoor', 'Intimate', 'Underground'], description: 'Open-air electronic music venue with an intimate, quality-focused atmosphere. House and techno in the fresh air.' },
    { venueName: 'The Oasis', category: 'Bar', neighborhood: 'Wynwood', address: '2335 N Miami Ave', lat: 25.7975, lng: -80.1920, priceRange: '$$', entryFee: 0, ageRestriction: 21, tags: ['Outdoor', 'Market', 'Casual', 'Food'], description: 'Open-air marketplace with multiple bars, food vendors, and live music. The perfect Wynwood hangout.' },
    { venueName: 'Blackbird Ordinary', category: 'Cocktail Bar', neighborhood: 'Brickell', address: '729 SW 1st Ave', lat: 25.7667, lng: -80.1964, priceRange: '$$', entryFee: 0, ageRestriction: 21, tags: ['Craft Cocktails', 'Late Night', 'Industry', 'Backyard'], description: 'Brickell\'s best cocktail bar with an extensive menu, great backyard, and late-night service. Industry favorite.' },
    { venueName: 'Floyd', category: 'Nightclub', neighborhood: 'Downtown', address: '34 NE 11th St', lat: 25.7874, lng: -80.1906, priceRange: '$$$', entryFee: 30, ageRestriction: 21, tags: ['Electronic', 'Underground', 'Quality Sound', 'Dancing'], description: 'Underground electronic music venue focused on quality sound and serious programming. For dedicated dance music fans.' },
    { venueName: 'The Corner', category: 'Cocktail Bar', neighborhood: 'Wynwood', address: '1035 N Miami Ave', lat: 25.7854, lng: -80.1938, priceRange: '$$', entryFee: 0, ageRestriction: 21, tags: ['Speakeasy', 'Craft Cocktails', 'Intimate', 'Hidden'], description: 'Hidden speakeasy with excellent cocktails and intimate atmosphere. A quality escape from Wynwood\'s crowds.' },
    { venueName: 'Hoy Como Ayer', category: 'Live Music', neighborhood: 'Little Havana', address: '2212 SW 8th St', lat: 25.7651, lng: -80.2287, priceRange: '$$', entryFee: 15, ageRestriction: 21, tags: ['Cuban', 'Live Music', 'Dancing', 'Authentic'], description: 'Authentic Little Havana live music venue with Cuban bands, dancing, and old-school atmosphere. Cultural immersion.' },
    { venueName: 'The Sylvester', category: 'Cocktail Bar', neighborhood: 'Design District', address: '3456 N Miami Ave', lat: 25.8134, lng: -80.1909, priceRange: '$$$', entryFee: 0, ageRestriction: 21, tags: ['Design', 'Cocktails', 'Stylish', 'DJ'], description: 'Stylish Design District bar with quality cocktails and weekend DJ sets. Sophisticated without being stuffy.' },
    { venueName: 'Sweet Liberty', category: 'Cocktail Bar', neighborhood: 'South Beach', address: '237 20th St', lat: 25.7922, lng: -80.1368, priceRange: '$$$', entryFee: 0, ageRestriction: 21, tags: ['Award-Winning', 'Craft Cocktails', 'Neighborhood', 'Quality'], description: 'Award-winning cocktail bar that feels like a neighborhood joint. World-class drinks without South Beach attitude.' },
    { venueName: 'Vizcaya Museum Gardens', category: 'Event Space', neighborhood: 'Coconut Grove', address: '3251 S Miami Ave', lat: 25.7445, lng: -80.2104, priceRange: '$$$$', entryFee: 25, ageRestriction: 0, tags: ['Historic', 'Gardens', 'Architecture', 'Events'], description: 'Stunning Italian villa and gardens hosting special evening events and concerts. Miami\'s most beautiful venue.' },
    { venueName: 'Kiki On The River', category: 'Restaurant Bar', neighborhood: 'Miami River', address: '450 NW North River Dr', lat: 25.7762, lng: -80.2035, priceRange: '$$$', entryFee: 0, ageRestriction: 21, tags: ['Greek', 'Waterfront', 'Bottle Service', 'Nightlife'], description: 'Greek restaurant that transforms into a nightclub destination. Waterfront dancing, bottle service, and late nights.' },
    { venueName: 'Bodega Taqueria', category: 'Speakeasy', neighborhood: 'South Beach', address: '1220 16th St', lat: 25.7876, lng: -80.1372, priceRange: '$$', entryFee: 0, ageRestriction: 21, tags: ['Speakeasy', 'Tacos', 'Hidden', 'Dancing'], description: 'Taco shop hiding a speakeasy nightclub in the back. Excellent tacos up front, excellent dancing through the porta-potty door.' },
    { venueName: 'Wynwood Yard', category: 'Bar', neighborhood: 'Wynwood', address: '56 NW 29th St', lat: 25.8003, lng: -80.1992, priceRange: '$$', entryFee: 0, ageRestriction: 21, tags: ['Outdoor', 'Food Trucks', 'Live Music', 'Casual'], description: 'Open-air entertainment venue with rotating food concepts, live music, and casual drinking. Community gathering spot.' },
    { venueName: 'Liv At The Fontainebleau', category: 'Nightclub', neighborhood: 'Miami Beach', address: '4441 Collins Ave', lat: 25.8141, lng: -80.1223, priceRange: '$$$$', entryFee: 50, ageRestriction: 21, tags: ['Celebrity', 'VIP', 'Extravagant', 'Mega Club'], description: 'Miami\'s ultimate nightclub experience with world-famous DJs, celebrity sightings, and unmatched production.' },
    { venueName: 'The Wharf', category: 'Bar', neighborhood: 'Miami River', address: '114 SW North River Dr', lat: 25.7741, lng: -80.1997, priceRange: '$$', entryFee: 0, ageRestriction: 21, tags: ['Waterfront', 'Outdoor', 'Boats', 'Casual'], description: 'Riverfront pop-up bar with food trucks, live music, and arrive-by-boat access. Quintessential Miami waterfront drinking.' },
    { venueName: 'Story Nightclub', category: 'Nightclub', neighborhood: 'South Beach', address: '136 Collins Ave', lat: 25.7706, lng: -80.1342, priceRange: '$$$$', entryFee: 40, ageRestriction: 21, tags: ['Mega Club', 'EDM', 'Production', 'VIP'], description: 'Massive South Beach nightclub with incredible production and top-tier EDM bookings. Theatrical nightlife at scale.' },
    { venueName: 'Coyo Taco', category: 'Speakeasy', neighborhood: 'Wynwood', address: '2300 NW 2nd Ave', lat: 25.7969, lng: -80.1992, priceRange: '$$', entryFee: 0, ageRestriction: 21, tags: ['Tacos', 'Mezcal', 'Speakeasy', 'Dancing'], description: 'Excellent taqueria with a hidden mezcal bar and late-night dancing. Walk through the kitchen to find the fun.' },
    { venueName: 'Faena Theater', category: 'Theater', neighborhood: 'Miami Beach', address: '3201 Collins Ave', lat: 25.8029, lng: -80.1247, priceRange: '$$$$', entryFee: 100, ageRestriction: 18, tags: ['Cabaret', 'Dinner Show', 'Luxury', 'Immersive'], description: 'Ultra-luxury cabaret theater with immersive dinner shows and world-class performances. Miami\'s most glamorous night out.' },
    { venueName: 'Baby Jane', category: 'Cocktail Bar', neighborhood: 'Downtown', address: '500 Brickell Key Dr', lat: 25.7637, lng: -80.1864, priceRange: '$$$', entryFee: 0, ageRestriction: 21, tags: ['Views', 'Cocktails', 'Intimate', 'Waterfront'], description: 'Intimate cocktail bar with stunning Brickell skyline views. Sophisticated drinks in a romantic waterfront setting.' },
    { venueName: 'Kill Your Idol', category: 'Dive Bar', neighborhood: 'South Beach', address: '222 Espanola Way', lat: 25.7861, lng: -80.1327, priceRange: '$', entryFee: 0, ageRestriction: 21, tags: ['Dive Bar', 'Rock', 'Late Night', 'No Pretense'], description: 'South Beach\'s best dive bar for escaping the glitz. Cheap drinks, rock music, and zero attitude.' },
  ],
  // Adding more cities with venues...
  'London': [
    { venueName: 'Fabric', category: 'Nightclub', neighborhood: 'Farringdon', address: '77a Charterhouse St', lat: 51.5197, lng: -0.1025, priceRange: '$$$', entryFee: 25, ageRestriction: 18, tags: ['Electronic', 'Legendary', 'Three Rooms', 'Underground'], description: 'World-famous nightclub with three rooms of cutting-edge electronic music. A pilgrimage site for dance music fans worldwide.' },
    { venueName: 'Ronnie Scott\'s', category: 'Jazz Club', neighborhood: 'Soho', address: '47 Frith St', lat: 51.5133, lng: -0.1315, priceRange: '$$$', entryFee: 35, ageRestriction: 0, tags: ['Jazz', 'Legendary', 'Intimate', 'Historic'], description: 'London\'s most famous jazz club hosting world-class performers since 1959. Intimate setting, legendary programming.' },
    { venueName: 'Ministry of Sound', category: 'Nightclub', neighborhood: 'Elephant & Castle', address: '103 Gaunt St', lat: 51.4941, lng: -0.0998, priceRange: '$$$', entryFee: 30, ageRestriction: 18, tags: ['Electronic', 'Legendary', 'Sound System', 'Institution'], description: 'Iconic superclub that defined British dance music culture. World-class sound system and legendary DJ residencies.' },
    { venueName: 'The Jazz Cafe', category: 'Live Music', neighborhood: 'Camden', address: '5 Parkway', lat: 51.5394, lng: -0.1411, priceRange: '$$', entryFee: 20, ageRestriction: 18, tags: ['Jazz', 'Soul', 'Funk', 'Intimate'], description: 'Intimate Camden venue for jazz, soul, and world music. Quality programming in a perfect listening environment.' },
    { venueName: 'Printworks', category: 'Nightclub', neighborhood: 'Canada Water', address: 'Surrey Quays Rd', lat: 51.4906, lng: -0.0485, priceRange: '$$$', entryFee: 35, ageRestriction: 18, tags: ['Electronic', 'Industrial', 'Massive', 'Daytime'], description: 'Massive industrial venue hosting spectacular daytime electronic events. Unique atmosphere in a former newspaper press.' },
    { venueName: 'Electric Brixton', category: 'Concert Venue', neighborhood: 'Brixton', address: 'Town Hall Parade', lat: 51.4612, lng: -0.1152, priceRange: '$$', entryFee: 25, ageRestriction: 18, tags: ['Live Music', 'Club Nights', 'Historic', 'South London'], description: 'Beautiful Art Deco venue hosting concerts and club nights. Brixton\'s premier live music destination.' },
    { venueName: 'KOKO', category: 'Concert Venue', neighborhood: 'Camden', address: '1a Camden High St', lat: 51.5399, lng: -0.1427, priceRange: '$$', entryFee: 25, ageRestriction: 18, tags: ['Historic', 'Theater', 'Concerts', 'Club Nights'], description: 'Stunning Victorian theater turned concert venue. Historic beauty hosting major tours and legendary club nights.' },
    { venueName: 'The Connaught Bar', category: 'Cocktail Bar', neighborhood: 'Mayfair', address: 'Carlos Pl', lat: 51.5105, lng: -0.1493, priceRange: '$$$$', entryFee: 0, ageRestriction: 18, tags: ['World\'s Best', 'Elegant', 'Classic', 'Luxury'], description: 'Multiple-time winner of World\'s Best Bar. Impeccable service, stunning Art Deco design, and legendary martinis.' },
    { venueName: 'Phonox', category: 'Nightclub', neighborhood: 'Brixton', address: '418 Brixton Rd', lat: 51.4595, lng: -0.1138, priceRange: '$$', entryFee: 15, ageRestriction: 18, tags: ['House', 'Techno', 'Underground', 'South London'], description: 'Brixton\'s premier underground electronic music venue. Quality house and techno in an intimate basement setting.' },
    { venueName: 'Night Tales', category: 'Nightclub', neighborhood: 'Hackney', address: '12 Bohemia Pl', lat: 51.5445, lng: -0.0546, priceRange: '$$', entryFee: 20, ageRestriction: 18, tags: ['Outdoor', 'Food', 'Electronic', 'Summer'], description: 'Rooftop venue combining street food, cocktails, and electronic music. East London\'s summer party destination.' },
    { venueName: 'Spiritland', category: 'Bar', neighborhood: 'King\'s Cross', address: '9-10 Stable St', lat: 51.5357, lng: -0.1248, priceRange: '$$', entryFee: 0, ageRestriction: 18, tags: ['Hi-Fi', 'Vinyl', 'Audiophile', 'Quality'], description: 'Audiophile bar with custom sound system playing vinyl selections. For those who truly appreciate sound quality.' },
    { venueName: 'The Windmill', category: 'Live Music', neighborhood: 'Brixton', address: '22 Blenheim Gardens', lat: 51.4613, lng: -0.1190, priceRange: '$', entryFee: 10, ageRestriction: 18, tags: ['Indie', 'Punk', 'DIY', 'Emerging'], description: 'Legendary Brixton pub venue discovering the next generation of British rock. Where Black Midi and Squid got their start.' },
    { venueName: 'The 100 Club', category: 'Live Music', neighborhood: 'Oxford Street', address: '100 Oxford St', lat: 51.5161, lng: -0.1355, priceRange: '$$', entryFee: 15, ageRestriction: 18, tags: ['Historic', 'Punk', 'Jazz', 'Legendary'], description: 'Historic venue that hosted the first UK punk festival. Still presenting jazz, rock, and alternative music in an intimate setting.' },
    { venueName: 'Corsica Studios', category: 'Nightclub', neighborhood: 'Elephant & Castle', address: '4-5 Elephant Rd', lat: 51.4942, lng: -0.0982, priceRange: '$$', entryFee: 15, ageRestriction: 18, tags: ['Underground', 'Electronic', 'Experimental', 'Intimate'], description: 'Underground venue for experimental electronic music and left-field bookings. Serious dancers, serious music.' },
    { venueName: 'The Social', category: 'Bar', neighborhood: 'Fitzrovia', address: '5 Little Portland St', lat: 51.5173, lng: -0.1398, priceRange: '$$', entryFee: 0, ageRestriction: 18, tags: ['DJ Bar', 'Indie', 'Intimate', 'Music Focused'], description: 'Iconic DJ bar with a basement dance floor. Two decades of championing independent music and quality DJ sets.' },
    { venueName: 'Village Underground', category: 'Concert Venue', neighborhood: 'Shoreditch', address: '54 Holywell Ln', lat: 51.5257, lng: -0.0774, priceRange: '$$', entryFee: 20, ageRestriction: 18, tags: ['Alternative', 'Creative', 'Warehouse', 'Diverse'], description: 'Creative warehouse venue in old train carriages and vaults. Eclectic programming from live music to club nights.' },
    { venueName: 'Dalston Superstore', category: 'Nightclub', neighborhood: 'Dalston', address: '117 Kingsland High St', lat: 51.5481, lng: -0.0749, priceRange: '$$', entryFee: 10, ageRestriction: 18, tags: ['LGBTQ+', 'Queer', 'Underground', 'East London'], description: 'East London\'s most beloved queer venue with legendary basement parties. Inclusive, underground, essential.' },
    { venueName: 'Royal Albert Hall', category: 'Concert Venue', neighborhood: 'Kensington', address: 'Kensington Gore', lat: 51.5009, lng: -0.1774, priceRange: '$$$$', entryFee: 60, ageRestriction: 0, tags: ['Historic', 'Iconic', 'Classical', 'Concerts'], description: 'The most iconic concert hall in Britain hosting everything from classical to rock in a stunning Victorian setting.' },
    { venueName: 'Cafe OTO', category: 'Live Music', neighborhood: 'Dalston', address: '18-22 Ashwin St', lat: 51.5497, lng: -0.0747, priceRange: '$$', entryFee: 15, ageRestriction: 18, tags: ['Experimental', 'Avant-Garde', 'Jazz', 'Unique'], description: 'East London\'s home for experimental and avant-garde music. Boundary-pushing programming in an intimate setting.' },
    { venueName: 'Cargo', category: 'Nightclub', neighborhood: 'Shoreditch', address: '83 Rivington St', lat: 51.5264, lng: -0.0804, priceRange: '$$', entryFee: 15, ageRestriction: 18, tags: ['Eclectic', 'Garden', 'Dancing', 'East London'], description: 'Shoreditch institution with railway arch dance floors and outdoor terrace. Diverse programming and great atmosphere.' },
    { venueName: 'Brilliant Corners', category: 'Bar', neighborhood: 'Dalston', address: '470 Kingsland Rd', lat: 51.5465, lng: -0.0745, priceRange: '$$', entryFee: 0, ageRestriction: 18, tags: ['Japanese', 'Hi-Fi', 'Sake', 'Quality'], description: 'Japanese-inspired bar with exceptional hi-fi system and sake selection. Quality listening in a relaxed atmosphere.' },
    { venueName: 'The Blues Kitchen', category: 'Live Music', neighborhood: 'Camden', address: '111-113 Camden High St', lat: 51.5396, lng: -0.1420, priceRange: '$$', entryFee: 0, ageRestriction: 18, tags: ['Blues', 'Rock', 'BBQ', 'Dancing'], description: 'Live blues and soul seven nights a week with Southern BBQ and bourbon. Get there early for a good spot.' },
    { venueName: 'EGG London', category: 'Nightclub', neighborhood: 'King\'s Cross', address: '200 York Way', lat: 51.5413, lng: -0.1228, priceRange: '$$', entryFee: 25, ageRestriction: 18, tags: ['Electronic', 'Multi-Room', 'Garden', 'After-Hours'], description: 'Multi-room venue with garden hosting marathon electronic music sessions. King\'s Cross after-hours institution.' },
    { venueName: 'Peckham Audio', category: 'Nightclub', neighborhood: 'Peckham', address: '133 Rye Ln', lat: 51.4697, lng: -0.0665, priceRange: '$', entryFee: 10, ageRestriction: 18, tags: ['Underground', 'South London', 'Intimate', 'Quality'], description: 'Intimate Peckham venue with excellent sound and underground programming. South London\'s best-kept secret.' },
    { venueName: 'The Old Blue Last', category: 'Pub', neighborhood: 'Shoreditch', address: '38 Great Eastern St', lat: 51.5256, lng: -0.0808, priceRange: '$', entryFee: 0, ageRestriction: 18, tags: ['Vice', 'Free Entry', 'Indie', 'Discovery'], description: 'Vice magazine\'s legendary pub venue. Free entry, emerging talent, and countless legendary nights.' },
    { venueName: 'XOYO', category: 'Nightclub', neighborhood: 'Shoreditch', address: '32-37 Cowper St', lat: 51.5270, lng: -0.0850, priceRange: '$$', entryFee: 20, ageRestriction: 18, tags: ['Residencies', 'Electronic', 'Diverse', 'East London'], description: 'East London club known for its three-month DJ residencies. Diverse electronic programming from house to hip-hop.' },
    { venueName: 'The Lexington', category: 'Pub', neighborhood: 'Angel', address: '96-98 Pentonville Rd', lat: 51.5319, lng: -0.1131, priceRange: '$', entryFee: 10, ageRestriction: 18, tags: ['Americana', 'Country', 'Rock', 'Intimate'], description: 'American-themed pub with intimate upstairs venue. Quality Americana, country, and rock programming.' },
    { venueName: 'Colour Factory', category: 'Nightclub', neighborhood: 'Hackney', address: '8 Queen\'s Yard', lat: 51.5432, lng: -0.0442, priceRange: '$$', entryFee: 20, ageRestriction: 18, tags: ['Warehouse', 'Electronic', 'Underground', 'East London'], description: 'Hackney warehouse venue for underground electronic music. Industrial setting, quality programming.' },
    { venueName: 'Nightjar', category: 'Speakeasy', neighborhood: 'Shoreditch', address: '129 City Rd', lat: 51.5280, lng: -0.0873, priceRange: '$$$', entryFee: 0, ageRestriction: 18, tags: ['Speakeasy', 'Live Jazz', 'Cocktails', 'Intimate'], description: 'Prohibition-era speakeasy with live jazz and world-class cocktails. Reservations essential for this hidden gem.' },
    { venueName: 'O2 Brixton Academy', category: 'Concert Venue', neighborhood: 'Brixton', address: '211 Stockwell Rd', lat: 51.4657, lng: -0.1152, priceRange: '$$$', entryFee: 35, ageRestriction: 0, tags: ['Historic', 'Legendary', 'Concerts', 'Brixton'], description: 'One of London\'s most beloved concert venues. Perfect sightlines and electric atmosphere for major tours.' },
  ],
  'Paris': [
    { venueName: 'Rex Club', category: 'Nightclub', neighborhood: 'Grands Boulevards', address: '5 Boulevard Poissonnière', lat: 48.8717, lng: 2.3459, priceRange: '$$', entryFee: 15, ageRestriction: 18, tags: ['Electronic', 'Underground', 'Legendary', 'Sound System'], description: 'Paris\'s most legendary techno club with exceptional sound system. Underground electronic music since 1988.' },
    { venueName: 'Le Baron', category: 'Nightclub', neighborhood: 'Champs-Élysées', address: '6 Avenue Marceau', lat: 48.8697, lng: 2.2990, priceRange: '$$$$', entryFee: 30, ageRestriction: 21, tags: ['Exclusive', 'Fashion', 'Dancing', 'VIP'], description: 'Ultra-exclusive nightclub favored by fashion and art crowds. Getting past the door is the hardest part.' },
    { venueName: 'Silencio', category: 'Members Club', neighborhood: 'Opera', address: '142 Rue Montmartre', lat: 48.8680, lng: 2.3430, priceRange: '$$$$', entryFee: 0, ageRestriction: 18, tags: ['David Lynch', 'Members', 'Art', 'Cinema'], description: 'David Lynch-designed members club with surreal interiors. Cinema, concerts, and DJs in an artistic setting.' },
    { venueName: 'Concrete', category: 'Nightclub', neighborhood: 'Seine', address: 'Port de la Rapée', lat: 48.8427, lng: 2.3706, priceRange: '$$', entryFee: 15, ageRestriction: 18, tags: ['Boat', 'Electronic', 'Marathon', 'Sunday'], description: 'Floating club on a concrete barge on the Seine. Famous for marathon Sunday sessions and quality techno.' },
    { venueName: 'La Bellevilloise', category: 'Concert Venue', neighborhood: 'Belleville', address: '19-21 Rue Boyer', lat: 48.8683, lng: 2.3891, priceRange: '$$', entryFee: 15, ageRestriction: 18, tags: ['Cultural', 'Multi-Space', 'Diverse', 'Historic'], description: 'Beautiful multi-space cultural venue hosting concerts, exhibitions, and club nights. A Belleville institution.' },
    { venueName: 'Experimental Cocktail Club', category: 'Speakeasy', neighborhood: 'Sentier', address: '37 Rue Saint-Sauveur', lat: 48.8659, lng: 2.3471, priceRange: '$$$', entryFee: 0, ageRestriction: 18, tags: ['Speakeasy', 'Cocktails', 'Intimate', 'Pioneering'], description: 'The bar that launched Paris\'s cocktail revolution. Intimate speakeasy setting with exceptional drinks.' },
    { venueName: 'New Morning', category: 'Jazz Club', neighborhood: 'Strasbourg-Saint-Denis', address: '7-9 Rue des Petites-Écuries', lat: 48.8719, lng: 2.3537, priceRange: '$$', entryFee: 25, ageRestriction: 0, tags: ['Jazz', 'World Music', 'Legendary', 'Intimate'], description: 'Legendary jazz and world music venue hosting the biggest names. Intimate atmosphere for serious music lovers.' },
    { venueName: 'Le Perchoir', category: 'Rooftop Bar', neighborhood: 'Ménilmontant', address: '14 Rue Crespin du Gast', lat: 48.8648, lng: 2.3835, priceRange: '$$', entryFee: 0, ageRestriction: 18, tags: ['Rooftop', 'Views', 'Industrial', 'Trendy'], description: 'Trendy rooftop bar with stunning Paris views. Arrive early for sunset over the rooftops.' },
    { venueName: 'La Machine du Moulin Rouge', category: 'Nightclub', neighborhood: 'Pigalle', address: '90 Boulevard de Clichy', lat: 48.8844, lng: 2.3328, priceRange: '$$', entryFee: 20, ageRestriction: 18, tags: ['Electronic', 'Diverse', 'Three Floors', 'Montmartre'], description: 'Multi-level club next to the Moulin Rouge with diverse electronic programming and excellent production.' },
    { venueName: 'Le Comptoir Général', category: 'Bar', neighborhood: 'Canal Saint-Martin', address: '80 Quai de Jemmapes', lat: 48.8719, lng: 2.3651, priceRange: '$$', entryFee: 0, ageRestriction: 18, tags: ['Tropical', 'Eclectic', 'African', 'Unique'], description: 'Unique tropical bar with African-inspired décor, rum cocktails, and eclectic cultural programming.' },
    { venueName: 'Sacré', category: 'Nightclub', neighborhood: 'Grands Boulevards', address: '50 Rue de Paradis', lat: 48.8746, lng: 2.3498, priceRange: '$$', entryFee: 15, ageRestriction: 18, tags: ['Gay-Friendly', 'Electronic', 'Diverse', 'Welcoming'], description: 'Gay-friendly club with diverse electronic programming and welcoming atmosphere. Quality music for everyone.' },
    { venueName: 'Point Ephémère', category: 'Cultural Center', neighborhood: 'Canal Saint-Martin', address: '200 Quai de Valmy', lat: 48.8810, lng: 2.3665, priceRange: '$', entryFee: 10, ageRestriction: 18, tags: ['Alternative', 'Concerts', 'Art', 'Canalside'], description: 'Canalside cultural center hosting concerts, exhibitions, and artist residencies. Alternative Paris at its best.' },
    { venueName: 'Le Duc des Lombards', category: 'Jazz Club', neighborhood: 'Châtelet', address: '42 Rue des Lombards', lat: 48.8597, lng: 2.3487, priceRange: '$$$', entryFee: 30, ageRestriction: 0, tags: ['Jazz', 'Intimate', 'Quality', 'Traditional'], description: 'Intimate jazz club on the famous Rue des Lombards. World-class jazz in a traditional Parisian setting.' },
    { venueName: 'Rosa Bonheur', category: 'Bar', neighborhood: 'Buttes-Chaumont', address: 'Parc des Buttes-Chaumont', lat: 48.8810, lng: 2.3820, priceRange: '$$', entryFee: 0, ageRestriction: 18, tags: ['Park', 'Outdoor', 'LGBTQ+', 'Guinguette'], description: 'Beloved guinguette in the Buttes-Chaumont park. Dancing, drinks, and diverse crowds in a magical setting.' },
    { venueName: 'Glazart', category: 'Concert Venue', neighborhood: 'Porte de la Villette', address: '7-15 Avenue de la Porte de la Villette', lat: 48.8969, lng: 2.3884, priceRange: '$', entryFee: 10, ageRestriction: 18, tags: ['Alternative', 'Outdoor', 'Underground', 'Beach'], description: 'Alternative venue with urban beach and underground programming. Concerts, club nights, and summer barbecues.' },
    { venueName: 'Wanderlust', category: 'Nightclub', neighborhood: 'Bercy', address: '32 Quai d\'Austerlitz', lat: 48.8383, lng: 2.3741, priceRange: '$$', entryFee: 15, ageRestriction: 18, tags: ['Waterfront', 'Rooftop', 'Electronic', 'Summer'], description: 'Seine-side venue with rooftop terrace. Perfect for summer sunset sessions and late-night dancing.' },
    { venueName: 'Le Caveau de la Huchette', category: 'Jazz Club', neighborhood: 'Latin Quarter', address: '5 Rue de la Huchette', lat: 48.8529, lng: 2.3467, priceRange: '$$', entryFee: 15, ageRestriction: 0, tags: ['Jazz', 'Swing', 'Dancing', 'Historic'], description: 'Medieval cellar hosting jazz and swing dancing since 1946. Authentic Paris jazz cave experience.' },
    { venueName: 'Badaboum', category: 'Nightclub', neighborhood: 'Bastille', address: '2bis Rue des Taillandiers', lat: 48.8543, lng: 2.3745, priceRange: '$$', entryFee: 15, ageRestriction: 18, tags: ['Electronic', 'Alternative', 'Intimate', 'Quality'], description: 'Intimate Bastille club with quality electronic and alternative programming. Good sound, good crowds.' },
    { venueName: 'Social Club', category: 'Nightclub', neighborhood: 'Grands Boulevards', address: '142 Rue Montmartre', lat: 48.8680, lng: 2.3430, priceRange: '$$', entryFee: 15, ageRestriction: 18, tags: ['Hip-Hop', 'Electronic', 'Intimate', 'Underground'], description: 'Underground venue specializing in hip-hop and electronic music. Intimate basement setting.' },
    { venueName: 'Chez Moune', category: 'Nightclub', neighborhood: 'Pigalle', address: '54 Rue Jean-Baptiste Pigalle', lat: 48.8833, lng: 2.3381, priceRange: '$$', entryFee: 15, ageRestriction: 18, tags: ['Historic', 'Cabaret', 'Diverse', 'Dancing'], description: 'Historic lesbian cabaret turned inclusive dance venue. Retro charm and diverse crowds in Pigalle.' },
    { venueName: 'Petit Bain', category: 'Concert Venue', neighborhood: 'Bibliothèque', address: 'Port de la Gare', lat: 48.8324, lng: 2.3737, priceRange: '$', entryFee: 10, ageRestriction: 18, tags: ['Floating', 'Concerts', 'Terrace', 'Seine'], description: 'Floating venue on the Seine with concerts and summer terrace. Quality alternative programming.' },
    { venueName: 'La Rotonde Stalingrad', category: 'Bar', neighborhood: 'Stalingrad', address: '6-8 Place de la Bataille de Stalingrad', lat: 48.8833, lng: 2.3681, priceRange: '$', entryFee: 0, ageRestriction: 18, tags: ['Historic', 'Terrace', 'Casual', 'Diverse'], description: 'Beautiful round rotunda with huge terrace overlooking the canal. All walks of life mixing.' },
    { venueName: 'Nüba', category: 'Rooftop Bar', neighborhood: 'Les Docks', address: '34 Quai d\'Austerlitz', lat: 48.8380, lng: 2.3743, priceRange: '$$', entryFee: 0, ageRestriction: 18, tags: ['Rooftop', 'Seine Views', 'Dancing', 'Summer'], description: 'Seine-side rooftop at the Cité de la Mode. Stunning views and summer dance parties.' },
    { venueName: 'Le Trabendo', category: 'Concert Venue', neighborhood: 'La Villette', address: 'Parc de la Villette', lat: 48.8934, lng: 2.3927, priceRange: '$$', entryFee: 20, ageRestriction: 18, tags: ['Rock', 'Electronic', 'Quality Sound', 'La Villette'], description: 'Quality mid-size venue in La Villette park. Excellent sound for rock and electronic shows.' },
    { venueName: 'Le Sunset/Le Sunside', category: 'Jazz Club', neighborhood: 'Châtelet', address: '60 Rue des Lombards', lat: 48.8597, lng: 2.3499, priceRange: '$$', entryFee: 20, ageRestriction: 0, tags: ['Jazz', 'Two Venues', 'Traditional', 'Contemporary'], description: 'Twin jazz venues - traditional upstairs, contemporary downstairs. Quality jazz programming every night.' },
    { venueName: 'Bus Palladium', category: 'Live Music', neighborhood: 'Pigalle', address: '6 Rue Fontaine', lat: 48.8817, lng: 2.3348, priceRange: '$$', entryFee: 15, ageRestriction: 18, tags: ['Rock', 'Historic', 'Intimate', 'Pigalle'], description: 'Historic Pigalle rock venue with intimate atmosphere. Quality rock and indie programming.' },
    { venueName: 'Candelaria', category: 'Speakeasy', neighborhood: 'Marais', address: '52 Rue de Saintonge', lat: 48.8647, lng: 2.3615, priceRange: '$$', entryFee: 0, ageRestriction: 18, tags: ['Mexican', 'Speakeasy', 'Tacos', 'Mezcal'], description: 'Taco stand hiding a mezcal speakeasy in the back. Excellent drinks and late-night tacos.' },
    { venueName: 'La Gaîté Lyrique', category: 'Cultural Center', neighborhood: 'Réaumur-Sébastopol', address: '3bis Rue Papin', lat: 48.8671, lng: 2.3520, priceRange: '$$', entryFee: 15, ageRestriction: 0, tags: ['Digital Arts', 'Concerts', 'Exhibitions', 'Modern'], description: 'Digital arts center hosting concerts and exhibitions. Electronic music meets digital culture.' },
    { venueName: 'Dock B', category: 'Nightclub', neighborhood: 'Pantin', address: '51-55 Quai de la Seine', lat: 48.8980, lng: 2.3923, priceRange: '$$', entryFee: 15, ageRestriction: 18, tags: ['Electronic', 'Industrial', 'Underground', 'Pantin'], description: 'Industrial warehouse space for underground electronic music. Quality techno outside the périphérique.' },
    { venueName: 'Lulu White', category: 'Cocktail Bar', neighborhood: 'Pigalle', address: '12 Rue Frochot', lat: 48.8823, lng: 2.3357, priceRange: '$$$', entryFee: 0, ageRestriction: 18, tags: ['New Orleans', 'Jazz', 'Cocktails', 'Intimate'], description: 'New Orleans-inspired cocktail bar with live jazz. Intimate Pigalle gem with exceptional drinks.' },
  ],
};

// Generate venues for cities without specific data
function generateGenericVenues(cityName: string, country: string): any[] {
  const categories = ['Nightclub', 'Cocktail Bar', 'Live Music', 'Rooftop Bar', 'Jazz Club', 'Speakeasy', 'Lounge', 'Brewery', 'Wine Bar', 'Dive Bar'];
  const neighborhoods = ['Downtown', 'Old Town', 'City Center', 'Arts District', 'Historic Quarter', 'Waterfront', 'Uptown', 'Entertainment District'];

  const venues = [];
  for (let i = 0; i < 30; i++) {
    const category = categories[i % categories.length];
    const neighborhood = neighborhoods[i % neighborhoods.length];
    venues.push({
      venueName: `${cityName} ${category} ${i + 1}`,
      category,
      neighborhood,
      address: `${100 + i} Main Street`,
      lat: 40 + (Math.random() * 20 - 10),
      lng: -74 + (Math.random() * 150 - 75),
      priceRange: ['$', '$$', '$$$', '$$$$'][Math.floor(Math.random() * 4)],
      entryFee: [0, 15, 20, 25, 30][Math.floor(Math.random() * 5)],
      ageRestriction: [18, 21][Math.floor(Math.random() * 2)],
      tags: ['Nightlife', 'Local Favorite', 'Quality Drinks', category],
      description: `One of ${cityName}'s best ${category.toLowerCase()} venues. A local favorite known for quality drinks and great atmosphere in the ${neighborhood} area.`,
    });
  }
  return venues;
}

// Helper to get current week dates
function getCurrentWeekDates(): { dates: string[], dayNames: string[] } {
  const today = new Date();
  const dayOfWeek = today.getUTCDay(); // 0 = Sunday
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - ((dayOfWeek + 6) % 7)); // Go back to Monday

  const dates: string[] = [];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }

  return { dates, dayNames };
}

// Generate unique ID
function generateId(): string {
  return 'cmj' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action = 'all' } = await req.json().catch(() => ({}));

    const results = {
      citiesCreated: 0,
      citiesUpdated: 0,
      plansCreated: 0,
      groupFlowsCreated: 0,
      errors: [] as string[],
    };

    const { dates, dayNames } = getCurrentWeekDates();

    // Step 1: Ensure all 50 cities exist
    console.log('Step 1: Creating/updating cities...');
    const cityIdMap: Record<string, string> = {};

    for (let i = 0; i < CITIES_DATA.length; i++) {
      const cityData = CITIES_DATA[i];
      // Check if city exists
      const { data: existingCity } = await supabase
        .from('City')
        .select('id')
        .eq('name', cityData.name)
        .eq('country', cityData.country)
        .single();

      if (existingCity) {
        cityIdMap[cityData.name] = existingCity.id;
        results.citiesUpdated++;
      } else {
        // Create new city with correct schema
        const cityId = generateId();
        const shortId = cityData.name.toLowerCase().replace(/\s+/g, '-').substring(0, 10) + '-' + (i + 1).toString().padStart(3, '0');
        const { error } = await supabase
          .from('City')
          .insert({
            id: cityId,
            cityId: shortId,
            name: cityData.name,
            country: cityData.country,
            countryCode: cityData.flag.replace(/[^\u{1F1E6}-\u{1F1FF}]/gu, '').length === 4 ?
              String.fromCodePoint(...[...cityData.flag].filter(c => c.codePointAt(0)! >= 0x1F1E6 && c.codePointAt(0)! <= 0x1F1FF).map(c => c.codePointAt(0)! - 0x1F1E6 + 65)) :
              cityData.country.substring(0, 2).toUpperCase(),
            rank: i + 1,
            timezone: cityData.timezone,
            heroImage: `https://images.unsplash.com/photo-1500916434205-0c77489c6cf7?w=1200&q=80`,
            cardImage: `https://images.unsplash.com/photo-1500916434205-0c77489c6cf7?w=400&q=80`,
            accentColor: '#00D9FF',
            totalPlansThisWeek: 0,
            featured: i < 10,
            searchCount: 0,
            latitude: 40.0 + (Math.random() * 40 - 20),
            longitude: -74.0 + (Math.random() * 150 - 75),
            lastUpdated: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

        if (error) {
          results.errors.push(`Failed to create city ${cityData.name}: ${error.message}`);
        } else {
          cityIdMap[cityData.name] = cityId;
          results.citiesCreated++;
        }
      }
    }

    console.log(`Cities processed: ${results.citiesCreated} created, ${results.citiesUpdated} existing`);

    // Step 2: Delete old plans for current week and create new ones
    if (action === 'all' || action === 'plans') {
      console.log('Step 2: Creating plans for all cities...');

      for (const cityData of CITIES_DATA) {
        const cityId = cityIdMap[cityData.name];
        if (!cityId) continue;

        // Get venues for this city
        let venues = VENUES_BY_CITY[cityData.name];
        if (!venues || venues.length === 0) {
          venues = generateGenericVenues(cityData.name, cityData.country);
        }

        // Delete ALL existing plans for this city (clean slate)
        await supabase
          .from('Plan')
          .delete()
          .eq('cityId', cityId);

        // Create plans distributed across all days
        const plansToCreate = [];
        let venueIndex = 0;

        // Distribute venues across days: more on weekends
        const dayDistribution = [5, 5, 5, 6, 10, 12, 10]; // Mon-Sun distribution

        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
          const date = dates[dayIdx];
          const dayName = dayNames[dayIdx];
          const isWeekend = dayIdx >= 4; // Friday-Sunday
          const plansForDay = Math.min(dayDistribution[dayIdx], venues.length - venueIndex);

          for (let p = 0; p < plansForDay && venueIndex < venues.length; p++) {
            const venue = venues[venueIndex];
            venueIndex++;

            // Generate start times based on category
            let startHour = 19;
            let endHour = 23;
            if (venue.category === 'Nightclub') {
              startHour = isWeekend ? 22 : 21;
              endHour = isWeekend ? 4 : 2;
            } else if (venue.category === 'Rooftop Bar' || venue.category === 'Cocktail Bar') {
              startHour = 17 + Math.floor(Math.random() * 3);
              endHour = startHour + 5;
            } else if (venue.category === 'Jazz Club' || venue.category === 'Live Music') {
              startHour = 19 + Math.floor(Math.random() * 2);
              endHour = startHour + 3;
            }

            const startTime = `${startHour.toString().padStart(2, '0')}:00`;
            const endTime = `${(endHour % 24).toString().padStart(2, '0')}:00`;

            const planId = generateId();
            const shortPlanId = `${cityData.name.toLowerCase().replace(/\s+/g, '-').substring(0, 6)}-${venueIndex.toString().padStart(3, '0')}`;

            // Map category to PlanType
            const categoryToType: Record<string, string> = {
              'Nightclub': 'CLUB',
              'Jazz Club': 'BAR',
              'Live Music': 'EVENT',
              'Cocktail Bar': 'BAR',
              'Rooftop Bar': 'BAR',
              'Speakeasy': 'BAR',
              'Lounge': 'BAR',
              'Brewery': 'BAR',
              'Wine Bar': 'BAR',
              'Dive Bar': 'BAR',
              'Concert Venue': 'EVENT',
              'Theater': 'EVENT',
              'Comedy Club': 'EVENT',
              'Bar': 'BAR',
            };

            plansToCreate.push({
              id: planId,
              planId: shortPlanId,
              cityId,
              rank: p < 10 ? p + 1 : 10 + p,
              title: venue.venueName,
              venueName: venue.venueName,
              description: venue.description,
              category: venue.category,
              type: categoryToType[venue.category] || 'BAR',
              heroImage: `https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80`,
              thumbnailImage: `https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&q=80`,
              galleryImages: [],
              address: venue.address,
              neighborhood: venue.neighborhood,
              latitude: venue.lat,
              longitude: venue.lng,
              date,
              startTime,
              endTime,
              weekday: dayName,
              isWeekend,
              entryFee: venue.entryFee * 100, // Convert to cents
              priceRange: venue.priceRange,
              currency: 'USD',
              freeEntry: venue.entryFee === 0,
              genres: venue.tags.slice(0, 2),
              vibes: venue.tags.slice(2),
              isIndividual: true,
              isGroup: false,
              isFeatured: p < 3,
              aiGenerated: true,
              source: 'populate-data',
              isEvent: venue.category === 'Concert Venue' || venue.category === 'Theater',
              isRecurring: !(venue.category === 'Concert Venue' || venue.category === 'Theater'),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }

        // Reset venue index if we've used all venues but need more
        if (plansToCreate.length < 50) {
          venueIndex = 0;
          while (plansToCreate.length < 50 && venueIndex < venues.length) {
            const venue = venues[venueIndex];
            const dayIdx = plansToCreate.length % 7;
            const date = dates[dayIdx];
            const dayName = dayNames[dayIdx];
            const isWeekend = dayIdx >= 4;

            const startHour = 20 + Math.floor(Math.random() * 3);
            const startTime = `${startHour.toString().padStart(2, '0')}:00`;
            const endTime = `${((startHour + 4) % 24).toString().padStart(2, '0')}:00`;

            const planId2 = generateId();
            const shortPlanId2 = `${cityData.name.toLowerCase().replace(/\s+/g, '-').substring(0, 6)}-ln${venueIndex.toString().padStart(3, '0')}`;

            plansToCreate.push({
              id: planId2,
              planId: shortPlanId2,
              cityId,
              rank: 50 + venueIndex,
              title: `${venue.venueName} - Late Night`,
              venueName: venue.venueName,
              description: venue.description,
              category: venue.category,
              type: 'BAR',
              heroImage: `https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80`,
              thumbnailImage: `https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&q=80`,
              galleryImages: [],
              address: venue.address,
              neighborhood: venue.neighborhood,
              latitude: venue.lat,
              longitude: venue.lng,
              date,
              startTime,
              endTime,
              weekday: dayName,
              isWeekend,
              entryFee: venue.entryFee * 100,
              priceRange: venue.priceRange,
              currency: 'USD',
              freeEntry: venue.entryFee === 0,
              genres: venue.tags.slice(0, 2),
              vibes: venue.tags.slice(2),
              isIndividual: true,
              isGroup: false,
              isFeatured: false,
              aiGenerated: true,
              source: 'populate-data',
              isEvent: false,
              isRecurring: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            venueIndex++;
          }
        }

        // Insert plans in batches
        const batchSize = 25;
        for (let i = 0; i < plansToCreate.length; i += batchSize) {
          const batch = plansToCreate.slice(i, i + batchSize);
          const { error } = await supabase.from('Plan').insert(batch);
          if (error) {
            results.errors.push(`Failed to insert plans for ${cityData.name}: ${error.message}`);
          } else {
            results.plansCreated += batch.length;
          }
        }

        console.log(`Created ${plansToCreate.length} plans for ${cityData.name}`);
      }
    }

    // Step 3: Create group flows
    if (action === 'all' || action === 'groupflows') {
      console.log('Step 3: Creating group flows...');

      for (const cityData of CITIES_DATA) {
        const cityId = cityIdMap[cityData.name];
        if (!cityId) continue;

        // Get plans for this city
        const { data: cityPlans } = await supabase
          .from('Plan')
          .select('*')
          .eq('cityId', cityId)
          .limit(50);

        if (!cityPlans || cityPlans.length < 3) continue;

        // Delete existing group flows for this city
        await supabase
          .from('GroupFlow')
          .delete()
          .eq('cityId', cityId);

        // Create 10 group flows
        const groupFlowThemes = [
          { theme: 'Friday Night Out', description: 'The perfect Friday evening from cocktails to dancing' },
          { theme: 'Saturday Party Crawl', description: 'Hit the best spots for an epic Saturday night' },
          { theme: 'Sunday Funday', description: 'Relaxed vibes and great music for Sunday' },
          { theme: 'Jazz & Cocktails', description: 'Sophisticated evening of jazz and craft cocktails' },
          { theme: 'Rooftop Hopping', description: 'Experience the best views the city has to offer' },
          { theme: 'Underground Adventure', description: 'Discover the city\'s best kept secrets' },
          { theme: 'Live Music Tour', description: 'A night of incredible live performances' },
          { theme: 'VIP Experience', description: 'Premium venues for a luxurious night out' },
          { theme: 'Neighborhood Crawl', description: 'Explore the best of one iconic neighborhood' },
          { theme: 'Late Night Marathon', description: 'For those who want to dance until sunrise' },
        ];

        for (let gf = 0; gf < 10; gf++) {
          const theme = groupFlowThemes[gf];
          const flowId = generateId();

          // Pick 3-5 random plans for this flow
          const numSteps = 3 + Math.floor(Math.random() * 3);
          const shuffled = [...cityPlans].sort(() => Math.random() - 0.5);
          const selectedPlans = shuffled.slice(0, numSteps);

          // Create the group flow with correct schema
          const shortFlowId = `flow-${cityData.name.toLowerCase().replace(/\s/g, '-').substring(0, 6)}-${(gf + 1).toString().padStart(2, '0')}`;
          const totalHours = (numSteps * 90) / 60; // Convert minutes to hours
          const { error: flowError } = await supabase
            .from('GroupFlow')
            .insert({
              id: flowId,
              flowId: shortFlowId,
              cityId,
              rank: gf + 1,
              title: `${theme.theme} in ${cityData.name}`,
              description: theme.description,
              totalHours,
              startTime: '19:00',
              endTime: `${(19 + Math.floor(totalHours)) % 24}:00`,
              totalEstimate: (selectedPlans.reduce((sum: number, p: any) => sum + (p.entryFee || 0), 0) + 5000), // In cents
              currency: 'USD',
              isWeekend: gf < 3,
              proOnly: gf >= 3,
              aiGenerated: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });

          if (flowError) {
            results.errors.push(`Failed to create group flow: ${flowError.message}`);
            continue;
          }

          // Create steps for this flow with correct schema
          for (let s = 0; s < selectedPlans.length; s++) {
            const plan = selectedPlans[s];
            const duration = 60 + Math.floor(Math.random() * 60);
            await supabase
              .from('GroupFlowStep')
              .insert({
                id: generateId(),
                flowId,
                planId: plan.id,
                stepNumber: s + 1,
                title: `Step ${s + 1}: ${plan.category}`,
                venueName: plan.venueName || plan.title,
                duration,
                thumbnail: plan.thumbnailImage || plan.heroImage,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
          }

          results.groupFlowsCreated++;
        }

        console.log(`Created 10 group flows for ${cityData.name}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Data population complete',
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
