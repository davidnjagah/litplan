/**
 * City Bounds Configuration
 * Geographic bounds for coordinate validation during plan generation
 */

export interface CityBounds {
  lat: { min: number; max: number };
  lng: { min: number; max: number };
  timezone: string;
  currency: string;
  country: string;
  neighborhoods: string[];
}

/**
 * City bounds for coordinate validation
 * Ensures generated venues have valid coordinates within city limits
 */
export const CITY_BOUNDS: Record<string, CityBounds> = {
  // North America - USA
  'New York': {
    lat: { min: 40.4774, max: 40.9176 },
    lng: { min: -74.2591, max: -73.7004 },
    timezone: 'America/New_York',
    currency: 'USD',
    country: 'United States',
    neighborhoods: ['Manhattan', 'Brooklyn', 'Queens', 'SoHo', 'Tribeca', 'Chelsea', 'West Village', 'East Village', 'Lower East Side', 'Williamsburg', 'DUMBO', 'Meatpacking District', 'Midtown', 'Upper East Side', 'Upper West Side', 'Harlem', 'Hell\'s Kitchen', 'Financial District'],
  },
  'Los Angeles': {
    lat: { min: 33.7037, max: 34.3373 },
    lng: { min: -118.6682, max: -118.1553 },
    timezone: 'America/Los_Angeles',
    currency: 'USD',
    country: 'United States',
    neighborhoods: ['Hollywood', 'West Hollywood', 'Downtown', 'Santa Monica', 'Venice', 'Beverly Hills', 'Silver Lake', 'Echo Park', 'Los Feliz', 'Koreatown', 'Culver City', 'Malibu', 'Pasadena', 'Highland Park'],
  },
  'Chicago': {
    lat: { min: 41.6445, max: 42.0230 },
    lng: { min: -87.9401, max: -87.5240 },
    timezone: 'America/Chicago',
    currency: 'USD',
    country: 'United States',
    neighborhoods: ['River North', 'Lincoln Park', 'Wicker Park', 'Bucktown', 'West Loop', 'Gold Coast', 'Old Town', 'Lakeview', 'Logan Square', 'Pilsen', 'South Loop', 'Streeterville'],
  },
  'Miami': {
    lat: { min: 25.5584, max: 25.9790 },
    lng: { min: -80.4395, max: -80.1254 },
    timezone: 'America/New_York',
    currency: 'USD',
    country: 'United States',
    neighborhoods: ['South Beach', 'Wynwood', 'Brickell', 'Downtown', 'Design District', 'Little Havana', 'Coconut Grove', 'Coral Gables', 'Midtown', 'Edgewater', 'Miami Beach'],
  },
  'Las Vegas': {
    lat: { min: 35.9819, max: 36.3136 },
    lng: { min: -115.3152, max: -115.0622 },
    timezone: 'America/Los_Angeles',
    currency: 'USD',
    country: 'United States',
    neighborhoods: ['The Strip', 'Downtown', 'Fremont Street', 'Arts District', 'Summerlin', 'Henderson', 'Paradise'],
  },
  'San Francisco': {
    lat: { min: 37.6398, max: 37.9298 },
    lng: { min: -123.1738, max: -122.2815 },
    timezone: 'America/Los_Angeles',
    currency: 'USD',
    country: 'United States',
    neighborhoods: ['Mission', 'Castro', 'SoMa', 'North Beach', 'Marina', 'Hayes Valley', 'Tenderloin', 'Nob Hill', 'Chinatown', 'Financial District', 'Haight-Ashbury', 'Pacific Heights'],
  },
  'Seattle': {
    lat: { min: 47.4810, max: 47.7341 },
    lng: { min: -122.4597, max: -122.2244 },
    timezone: 'America/Los_Angeles',
    currency: 'USD',
    country: 'United States',
    neighborhoods: ['Capitol Hill', 'Ballard', 'Fremont', 'Queen Anne', 'Belltown', 'Pioneer Square', 'South Lake Union', 'University District', 'Georgetown'],
  },
  'Atlanta': {
    lat: { min: 33.6479, max: 33.8869 },
    lng: { min: -84.5509, max: -84.2893 },
    timezone: 'America/New_York',
    currency: 'USD',
    country: 'United States',
    neighborhoods: ['Midtown', 'Buckhead', 'Virginia Highland', 'Little Five Points', 'Old Fourth Ward', 'East Atlanta', 'Westside', 'Inman Park', 'Poncey-Highland'],
  },
  'Boston': {
    lat: { min: 42.2279, max: 42.3969 },
    lng: { min: -71.1912, max: -70.9234 },
    timezone: 'America/New_York',
    currency: 'USD',
    country: 'United States',
    neighborhoods: ['Back Bay', 'Beacon Hill', 'South End', 'North End', 'Seaport', 'Cambridge', 'Somerville', 'Fenway', 'Jamaica Plain', 'Allston'],
  },
  'Austin': {
    lat: { min: 30.0985, max: 30.5168 },
    lng: { min: -97.9384, max: -97.5614 },
    timezone: 'America/Chicago',
    currency: 'USD',
    country: 'United States',
    neighborhoods: ['6th Street', 'Rainey Street', 'East Austin', 'South Congress', 'Downtown', 'West Campus', 'Hyde Park', 'Mueller', 'Domain'],
  },
  'Nashville': {
    lat: { min: 35.9787, max: 36.2729 },
    lng: { min: -86.9901, max: -86.5879 },
    timezone: 'America/Chicago',
    currency: 'USD',
    country: 'United States',
    neighborhoods: ['Broadway', 'The Gulch', 'East Nashville', 'Germantown', 'Music Row', '12 South', 'Midtown', 'Sobro', 'Wedgewood-Houston'],
  },
  'New Orleans': {
    lat: { min: 29.8679, max: 30.0682 },
    lng: { min: -90.1380, max: -89.8633 },
    timezone: 'America/Chicago',
    currency: 'USD',
    country: 'United States',
    neighborhoods: ['French Quarter', 'Garden District', 'Marigny', 'Bywater', 'Warehouse District', 'CBD', 'Uptown', 'Treme', 'Magazine Street'],
  },
  'Denver': {
    lat: { min: 39.6143, max: 39.9142 },
    lng: { min: -105.1098, max: -104.6002 },
    timezone: 'America/Denver',
    currency: 'USD',
    country: 'United States',
    neighborhoods: ['LoDo', 'RiNo', 'Capitol Hill', 'Baker', 'Highland', 'Cherry Creek', 'South Broadway', 'Five Points', 'Ballpark'],
  },
  'Philadelphia': {
    lat: { min: 39.8671, max: 40.1379 },
    lng: { min: -75.2803, max: -74.9558 },
    timezone: 'America/New_York',
    currency: 'USD',
    country: 'United States',
    neighborhoods: ['Center City', 'Old City', 'Rittenhouse Square', 'Fishtown', 'Northern Liberties', 'South Philly', 'University City', 'Manayunk'],
  },
  'San Diego': {
    lat: { min: 32.5349, max: 33.1142 },
    lng: { min: -117.2821, max: -116.9081 },
    timezone: 'America/Los_Angeles',
    currency: 'USD',
    country: 'United States',
    neighborhoods: ['Gaslamp Quarter', 'North Park', 'Hillcrest', 'Pacific Beach', 'La Jolla', 'Little Italy', 'East Village', 'Ocean Beach'],
  },
  'Portland': {
    lat: { min: 45.4325, max: 45.6530 },
    lng: { min: -122.8367, max: -122.4720 },
    timezone: 'America/Los_Angeles',
    currency: 'USD',
    country: 'United States',
    neighborhoods: ['Pearl District', 'Alberta Arts', 'Hawthorne', 'Mississippi', 'Division', 'Burnside', 'Downtown', 'Sellwood'],
  },
  'Phoenix': {
    lat: { min: 33.2901, max: 33.7490 },
    lng: { min: -112.3240, max: -111.9260 },
    timezone: 'America/Phoenix',
    currency: 'USD',
    country: 'United States',
    neighborhoods: ['Downtown', 'Scottsdale', 'Tempe', 'Old Town Scottsdale', 'Roosevelt Row', 'Arcadia', 'Melrose District'],
  },
  'Dallas': {
    lat: { min: 32.6184, max: 33.0237 },
    lng: { min: -96.9995, max: -96.5551 },
    timezone: 'America/Chicago',
    currency: 'USD',
    country: 'United States',
    neighborhoods: ['Deep Ellum', 'Uptown', 'Bishop Arts', 'Downtown', 'Knox-Henderson', 'Design District', 'Lower Greenville', 'Oak Lawn'],
  },
  'Houston': {
    lat: { min: 29.5220, max: 30.1107 },
    lng: { min: -95.7884, max: -95.0143 },
    timezone: 'America/Chicago',
    currency: 'USD',
    country: 'United States',
    neighborhoods: ['Montrose', 'Heights', 'Downtown', 'Midtown', 'Washington Avenue', 'EaDo', 'River Oaks', 'Museum District'],
  },
  'Washington DC': {
    lat: { min: 38.7916, max: 38.9959 },
    lng: { min: -77.1198, max: -76.9094 },
    timezone: 'America/New_York',
    currency: 'USD',
    country: 'United States',
    neighborhoods: ['Adams Morgan', 'Dupont Circle', 'Georgetown', 'U Street', 'Capitol Hill', 'Logan Circle', 'Shaw', 'Navy Yard', '14th Street'],
  },

  // North America - Canada
  'Toronto': {
    lat: { min: 43.5810, max: 43.8554 },
    lng: { min: -79.6393, max: -79.1168 },
    timezone: 'America/Toronto',
    currency: 'CAD',
    country: 'Canada',
    neighborhoods: ['King West', 'Queen West', 'Yorkville', 'Kensington Market', 'Distillery District', 'Entertainment District', 'Liberty Village', 'Ossington'],
  },
  'Vancouver': {
    lat: { min: 49.1999, max: 49.3167 },
    lng: { min: -123.2644, max: -123.0234 },
    timezone: 'America/Vancouver',
    currency: 'CAD',
    country: 'Canada',
    neighborhoods: ['Gastown', 'Yaletown', 'Granville Island', 'Commercial Drive', 'Main Street', 'Kitsilano', 'West End', 'Chinatown'],
  },
  'Montreal': {
    lat: { min: 45.4100, max: 45.7047 },
    lng: { min: -73.9749, max: -73.4744 },
    timezone: 'America/Montreal',
    currency: 'CAD',
    country: 'Canada',
    neighborhoods: ['Old Montreal', 'Plateau Mont-Royal', 'Mile End', 'Downtown', 'Griffintown', 'Saint-Henri', 'Jean-Talon'],
  },

  // North America - Mexico
  'Mexico City': {
    lat: { min: 19.2046, max: 19.5932 },
    lng: { min: -99.3648, max: -98.9406 },
    timezone: 'America/Mexico_City',
    currency: 'MXN',
    country: 'Mexico',
    neighborhoods: ['Polanco', 'Roma Norte', 'Condesa', 'Coyoacán', 'Juárez', 'Centro Histórico', 'Santa Fe', 'Zona Rosa'],
  },
  'Cancún': {
    lat: { min: 21.0343, max: 21.2051 },
    lng: { min: -86.9515, max: -86.7404 },
    timezone: 'America/Cancun',
    currency: 'MXN',
    country: 'Mexico',
    neighborhoods: ['Hotel Zone', 'Downtown', 'Puerto Cancún', 'Isla Mujeres'],
  },

  // Europe - UK
  'London': {
    lat: { min: 51.2867, max: 51.6918 },
    lng: { min: -0.5103, max: 0.3340 },
    timezone: 'Europe/London',
    currency: 'GBP',
    country: 'United Kingdom',
    neighborhoods: ['Soho', 'Shoreditch', 'Camden', 'Mayfair', 'Kensington', 'Notting Hill', 'Brixton', 'Dalston', 'Covent Garden', 'Islington', 'Hackney', 'Peckham', 'Fitzrovia', 'Westminster'],
  },
  'Edinburgh': {
    lat: { min: 55.8908, max: 55.9933 },
    lng: { min: -3.3200, max: -3.0761 },
    timezone: 'Europe/London',
    currency: 'GBP',
    country: 'United Kingdom',
    neighborhoods: ['Old Town', 'New Town', 'Leith', 'Stockbridge', 'Grassmarket', 'Cowgate'],
  },
  'Manchester': {
    lat: { min: 53.4087, max: 53.5450 },
    lng: { min: -2.3181, max: -2.1411 },
    timezone: 'Europe/London',
    currency: 'GBP',
    country: 'United Kingdom',
    neighborhoods: ['Northern Quarter', 'Deansgate', 'Spinningfields', 'Ancoats', 'Castlefield', 'Oxford Road'],
  },

  // Europe - France
  'Paris': {
    lat: { min: 48.8156, max: 48.9022 },
    lng: { min: 2.2242, max: 2.4699 },
    timezone: 'Europe/Paris',
    currency: 'EUR',
    country: 'France',
    neighborhoods: ['Le Marais', 'Saint-Germain-des-Prés', 'Montmartre', 'Bastille', 'Oberkampf', 'Pigalle', 'Belleville', 'Champs-Élysées', 'Latin Quarter', 'Opéra'],
  },
  'Nice': {
    lat: { min: 43.6750, max: 43.7384 },
    lng: { min: 7.1919, max: 7.3237 },
    timezone: 'Europe/Paris',
    currency: 'EUR',
    country: 'France',
    neighborhoods: ['Vieux Nice', 'Port', 'Promenade des Anglais', 'Jean-Médecin'],
  },

  // Europe - Germany
  'Berlin': {
    lat: { min: 52.3382, max: 52.6755 },
    lng: { min: 13.0884, max: 13.7611 },
    timezone: 'Europe/Berlin',
    currency: 'EUR',
    country: 'Germany',
    neighborhoods: ['Kreuzberg', 'Friedrichshain', 'Neukölln', 'Mitte', 'Prenzlauer Berg', 'Charlottenburg', 'Schöneberg', 'Wedding'],
  },
  'Munich': {
    lat: { min: 48.0616, max: 48.2481 },
    lng: { min: 11.3608, max: 11.7229 },
    timezone: 'Europe/Berlin',
    currency: 'EUR',
    country: 'Germany',
    neighborhoods: ['Altstadt', 'Schwabing', 'Glockenbachviertel', 'Maxvorstadt', 'Haidhausen', 'Sendling'],
  },
  'Hamburg': {
    lat: { min: 53.3951, max: 53.7102 },
    lng: { min: 9.7320, max: 10.3249 },
    timezone: 'Europe/Berlin',
    currency: 'EUR',
    country: 'Germany',
    neighborhoods: ['St. Pauli', 'Reeperbahn', 'Sternschanze', 'Altona', 'Neustadt', 'HafenCity'],
  },

  // Europe - Netherlands
  'Amsterdam': {
    lat: { min: 52.2780, max: 52.4311 },
    lng: { min: 4.7288, max: 5.0791 },
    timezone: 'Europe/Amsterdam',
    currency: 'EUR',
    country: 'Netherlands',
    neighborhoods: ['De Pijp', 'Jordaan', 'Leidseplein', 'Rembrandtplein', 'Centrum', 'Oud-West', 'Oost', 'Noord'],
  },

  // Europe - Spain
  'Barcelona': {
    lat: { min: 41.3200, max: 41.4695 },
    lng: { min: 2.0695, max: 2.2280 },
    timezone: 'Europe/Madrid',
    currency: 'EUR',
    country: 'Spain',
    neighborhoods: ['Gothic Quarter', 'El Born', 'Gràcia', 'Eixample', 'Raval', 'Barceloneta', 'Poble Sec', 'Poblenou'],
  },
  'Madrid': {
    lat: { min: 40.3120, max: 40.5307 },
    lng: { min: -3.8887, max: -3.5181 },
    timezone: 'Europe/Madrid',
    currency: 'EUR',
    country: 'Spain',
    neighborhoods: ['Malasaña', 'Chueca', 'La Latina', 'Lavapiés', 'Sol', 'Huertas', 'Salamanca', 'Chamberí'],
  },
  'Seville': {
    lat: { min: 37.3200, max: 37.4500 },
    lng: { min: -6.0500, max: -5.8800 },
    timezone: 'Europe/Madrid',
    currency: 'EUR',
    country: 'Spain',
    neighborhoods: ['Santa Cruz', 'Triana', 'Alameda', 'Macarena', 'Centro'],
  },
  'Valencia': {
    lat: { min: 39.4100, max: 39.5100 },
    lng: { min: -0.4200, max: -0.3200 },
    timezone: 'Europe/Madrid',
    currency: 'EUR',
    country: 'Spain',
    neighborhoods: ['El Carmen', 'Ruzafa', 'Cabanyal', 'Malvarrosa', 'Centro'],
  },
  'Ibiza': {
    lat: { min: 38.8679, max: 39.0500 },
    lng: { min: 1.2000, max: 1.5800 },
    timezone: 'Europe/Madrid',
    currency: 'EUR',
    country: 'Spain',
    neighborhoods: ['Ibiza Town', 'Playa d\'en Bossa', 'San Antonio', 'Santa Eulalia', 'Es Canar'],
  },

  // Europe - Italy
  'Rome': {
    lat: { min: 41.7998, max: 41.9919 },
    lng: { min: 12.3690, max: 12.6236 },
    timezone: 'Europe/Rome',
    currency: 'EUR',
    country: 'Italy',
    neighborhoods: ['Trastevere', 'Centro Storico', 'Testaccio', 'Monti', 'Pigneto', 'San Lorenzo', 'Prati', 'Ostiense'],
  },
  'Milan': {
    lat: { min: 45.3863, max: 45.5352 },
    lng: { min: 9.0657, max: 9.2782 },
    timezone: 'Europe/Rome',
    currency: 'EUR',
    country: 'Italy',
    neighborhoods: ['Navigli', 'Brera', 'Porta Romana', 'Isola', 'Centro', 'Tortona', 'Corso Como'],
  },
  'Florence': {
    lat: { min: 43.7400, max: 43.8100 },
    lng: { min: 11.2000, max: 11.2900 },
    timezone: 'Europe/Rome',
    currency: 'EUR',
    country: 'Italy',
    neighborhoods: ['Centro', 'Santa Croce', 'San Lorenzo', 'Oltrarno', 'Santo Spirito'],
  },

  // Europe - Portugal
  'Lisbon': {
    lat: { min: 38.6916, max: 38.7965 },
    lng: { min: -9.2298, max: -9.0863 },
    timezone: 'Europe/Lisbon',
    currency: 'EUR',
    country: 'Portugal',
    neighborhoods: ['Bairro Alto', 'Alfama', 'Chiado', 'Santos', 'Príncipe Real', 'Mouraria', 'Cais do Sodré', 'LX Factory'],
  },
  'Porto': {
    lat: { min: 41.1100, max: 41.1800 },
    lng: { min: -8.6800, max: -8.5600 },
    timezone: 'Europe/Lisbon',
    currency: 'EUR',
    country: 'Portugal',
    neighborhoods: ['Ribeira', 'Foz', 'Boavista', 'Downtown', 'Cedofeita'],
  },

  // Europe - Other
  'Vienna': {
    lat: { min: 48.1182, max: 48.3228 },
    lng: { min: 16.1826, max: 16.5770 },
    timezone: 'Europe/Vienna',
    currency: 'EUR',
    country: 'Austria',
    neighborhoods: ['Innere Stadt', 'Neubau', 'Leopoldstadt', 'Josefstadt', 'Margareten'],
  },
  'Prague': {
    lat: { min: 49.9419, max: 50.1774 },
    lng: { min: 14.2244, max: 14.7068 },
    timezone: 'Europe/Prague',
    currency: 'CZK',
    country: 'Czech Republic',
    neighborhoods: ['Old Town', 'Vinohrady', 'Žižkov', 'Malá Strana', 'Karlín', 'Holešovice'],
  },
  'Dublin': {
    lat: { min: 53.2987, max: 53.4109 },
    lng: { min: -6.3871, max: -6.1142 },
    timezone: 'Europe/Dublin',
    currency: 'EUR',
    country: 'Ireland',
    neighborhoods: ['Temple Bar', 'Camden Street', 'Portobello', 'Ranelagh', 'Rathmines', 'Smithfield'],
  },
  'Copenhagen': {
    lat: { min: 55.6150, max: 55.7331 },
    lng: { min: 12.4534, max: 12.6738 },
    timezone: 'Europe/Copenhagen',
    currency: 'DKK',
    country: 'Denmark',
    neighborhoods: ['Vesterbro', 'Nørrebro', 'Kødbyen', 'Frederiksberg', 'Indre By', 'Christianshavn'],
  },
  'Stockholm': {
    lat: { min: 59.2520, max: 59.4000 },
    lng: { min: 17.9405, max: 18.1684 },
    timezone: 'Europe/Stockholm',
    currency: 'SEK',
    country: 'Sweden',
    neighborhoods: ['Södermalm', 'Östermalm', 'Gamla Stan', 'Norrmalm', 'Kungsholmen'],
  },
  'Oslo': {
    lat: { min: 59.8700, max: 59.9700 },
    lng: { min: 10.6200, max: 10.8500 },
    timezone: 'Europe/Oslo',
    currency: 'NOK',
    country: 'Norway',
    neighborhoods: ['Grünerløkka', 'Sentrum', 'Tjuvholmen', 'Aker Brygge', 'St. Hanshaugen'],
  },
  'Helsinki': {
    lat: { min: 60.1100, max: 60.2500 },
    lng: { min: 24.8300, max: 25.0500 },
    timezone: 'Europe/Helsinki',
    currency: 'EUR',
    country: 'Finland',
    neighborhoods: ['Kallio', 'Punavuori', 'Kamppi', 'Kruununhaka', 'Ullanlinna'],
  },
  'Brussels': {
    lat: { min: 50.7962, max: 50.9133 },
    lng: { min: 4.2852, max: 4.4690 },
    timezone: 'Europe/Brussels',
    currency: 'EUR',
    country: 'Belgium',
    neighborhoods: ['Saint-Géry', 'Ixelles', 'Saint-Gilles', 'Matongé', 'Grand Place'],
  },
  'Zurich': {
    lat: { min: 47.3200, max: 47.4200 },
    lng: { min: 8.4800, max: 8.5800 },
    timezone: 'Europe/Zurich',
    currency: 'CHF',
    country: 'Switzerland',
    neighborhoods: ['Langstrasse', 'Niederdorf', 'Zurich West', 'Seefeld', 'Kreis 5'],
  },
  'Athens': {
    lat: { min: 37.9000, max: 38.0500 },
    lng: { min: 23.6700, max: 23.8100 },
    timezone: 'Europe/Athens',
    currency: 'EUR',
    country: 'Greece',
    neighborhoods: ['Plaka', 'Psyrri', 'Gazi', 'Kolonaki', 'Exarchia', 'Monastiraki'],
  },
  'Mykonos': {
    lat: { min: 37.4200, max: 37.4900 },
    lng: { min: 25.3200, max: 25.4500 },
    timezone: 'Europe/Athens',
    currency: 'EUR',
    country: 'Greece',
    neighborhoods: ['Chora', 'Little Venice', 'Paradise Beach', 'Super Paradise'],
  },
  'Budapest': {
    lat: { min: 47.3494, max: 47.6131 },
    lng: { min: 18.9260, max: 19.3346 },
    timezone: 'Europe/Budapest',
    currency: 'HUF',
    country: 'Hungary',
    neighborhoods: ['District VII', 'District VI', 'District V', 'Buda Castle', 'Ruin Bar District'],
  },
  'Warsaw': {
    lat: { min: 52.1100, max: 52.3700 },
    lng: { min: 20.8500, max: 21.1700 },
    timezone: 'Europe/Warsaw',
    currency: 'PLN',
    country: 'Poland',
    neighborhoods: ['Praga', 'Śródmieście', 'Nowy Świat', 'Powiśle', 'Żoliborz'],
  },
  'Krakow': {
    lat: { min: 49.9800, max: 50.1100 },
    lng: { min: 19.8600, max: 20.0400 },
    timezone: 'Europe/Warsaw',
    currency: 'PLN',
    country: 'Poland',
    neighborhoods: ['Old Town', 'Kazimierz', 'Podgórze', 'Nowa Huta'],
  },
  'Istanbul': {
    lat: { min: 40.8025, max: 41.3198 },
    lng: { min: 28.6362, max: 29.3734 },
    timezone: 'Europe/Istanbul',
    currency: 'TRY',
    country: 'Turkey',
    neighborhoods: ['Beyoğlu', 'Karaköy', 'Kadıköy', 'Beşiktaş', 'Sultanahmet', 'Galata', 'Cihangir'],
  },

  // Asia - Japan
  'Tokyo': {
    lat: { min: 35.5302, max: 35.8172 },
    lng: { min: 139.5062, max: 139.9105 },
    timezone: 'Asia/Tokyo',
    currency: 'JPY',
    country: 'Japan',
    neighborhoods: ['Shibuya', 'Shinjuku', 'Roppongi', 'Ginza', 'Harajuku', 'Ebisu', 'Nakameguro', 'Daikanyama', 'Shimokitazawa', 'Aoyama'],
  },
  'Osaka': {
    lat: { min: 34.5500, max: 34.7500 },
    lng: { min: 135.4000, max: 135.5500 },
    timezone: 'Asia/Tokyo',
    currency: 'JPY',
    country: 'Japan',
    neighborhoods: ['Dotonbori', 'Namba', 'Shinsaibashi', 'Umeda', 'Shinsekai', 'Amerika-Mura'],
  },
  'Kyoto': {
    lat: { min: 34.9200, max: 35.0700 },
    lng: { min: 135.7000, max: 135.8200 },
    timezone: 'Asia/Tokyo',
    currency: 'JPY',
    country: 'Japan',
    neighborhoods: ['Gion', 'Pontocho', 'Kawaramachi', 'Kiyamachi', 'Downtown'],
  },

  // Asia - South Korea
  'Seoul': {
    lat: { min: 37.4133, max: 37.7017 },
    lng: { min: 126.7343, max: 127.1838 },
    timezone: 'Asia/Seoul',
    currency: 'KRW',
    country: 'South Korea',
    neighborhoods: ['Gangnam', 'Hongdae', 'Itaewon', 'Myeongdong', 'Sinchon', 'Apgujeong', 'Hannam', 'Seongsu'],
  },

  // Asia - China/Hong Kong
  'Hong Kong': {
    lat: { min: 22.1533, max: 22.5618 },
    lng: { min: 113.8351, max: 114.4411 },
    timezone: 'Asia/Hong_Kong',
    currency: 'HKD',
    country: 'Hong Kong',
    neighborhoods: ['Lan Kwai Fong', 'SoHo', 'Wan Chai', 'Causeway Bay', 'Tsim Sha Tsui', 'Central', 'Kowloon'],
  },
  'Shanghai': {
    lat: { min: 30.9756, max: 31.4073 },
    lng: { min: 121.1003, max: 121.8045 },
    timezone: 'Asia/Shanghai',
    currency: 'CNY',
    country: 'China',
    neighborhoods: ['French Concession', 'The Bund', 'Jing\'an', 'Xintiandi', 'Huangpu', 'Pudong'],
  },
  'Beijing': {
    lat: { min: 39.4427, max: 41.0599 },
    lng: { min: 115.4174, max: 117.5000 },
    timezone: 'Asia/Shanghai',
    currency: 'CNY',
    country: 'China',
    neighborhoods: ['Sanlitun', 'Houhai', 'Wudaokou', 'Gulou', 'CBD', 'Chaoyang'],
  },

  // Asia - Southeast Asia
  'Singapore': {
    lat: { min: 1.2304, max: 1.4713 },
    lng: { min: 103.6055, max: 104.0089 },
    timezone: 'Asia/Singapore',
    currency: 'SGD',
    country: 'Singapore',
    neighborhoods: ['Clarke Quay', 'Boat Quay', 'Chinatown', 'Marina Bay', 'Orchard', 'Holland Village', 'Tiong Bahru', 'Kampong Glam'],
  },
  'Bangkok': {
    lat: { min: 13.4940, max: 13.9584 },
    lng: { min: 100.3510, max: 100.9386 },
    timezone: 'Asia/Bangkok',
    currency: 'THB',
    country: 'Thailand',
    neighborhoods: ['Sukhumvit', 'Silom', 'Khao San Road', 'Thonglor', 'Ekkamai', 'RCA', 'Chinatown', 'Sathorn'],
  },
  'Phuket': {
    lat: { min: 7.7500, max: 8.2000 },
    lng: { min: 98.2500, max: 98.4500 },
    timezone: 'Asia/Bangkok',
    currency: 'THB',
    country: 'Thailand',
    neighborhoods: ['Patong', 'Kata', 'Karon', 'Rawai', 'Kamala', 'Phuket Town'],
  },
  'Taipei': {
    lat: { min: 24.9606, max: 25.2100 },
    lng: { min: 121.4570, max: 121.6659 },
    timezone: 'Asia/Taipei',
    currency: 'TWD',
    country: 'Taiwan',
    neighborhoods: ['Da\'an', 'Xinyi', 'Ximending', 'Zhongshan', 'Shilin', 'Songshan'],
  },
  'Kuala Lumpur': {
    lat: { min: 3.0319, max: 3.2449 },
    lng: { min: 101.6171, max: 101.7584 },
    timezone: 'Asia/Kuala_Lumpur',
    currency: 'MYR',
    country: 'Malaysia',
    neighborhoods: ['Bukit Bintang', 'KLCC', 'Chinatown', 'Bangsar', 'Mont Kiara', 'Damansara'],
  },
  'Ho Chi Minh City': {
    lat: { min: 10.6949, max: 10.8769 },
    lng: { min: 106.5795, max: 106.8296 },
    timezone: 'Asia/Ho_Chi_Minh',
    currency: 'VND',
    country: 'Vietnam',
    neighborhoods: ['District 1', 'District 2', 'District 3', 'Bui Vien', 'Thao Dien', 'Binh Thanh'],
  },
  'Bali': {
    lat: { min: -8.8500, max: -8.0500 },
    lng: { min: 114.4000, max: 115.7000 },
    timezone: 'Asia/Makassar',
    currency: 'IDR',
    country: 'Indonesia',
    neighborhoods: ['Seminyak', 'Kuta', 'Canggu', 'Ubud', 'Uluwatu', 'Sanur', 'Nusa Dua'],
  },
  'Jakarta': {
    lat: { min: -6.3700, max: -6.0900 },
    lng: { min: 106.6800, max: 106.9700 },
    timezone: 'Asia/Jakarta',
    currency: 'IDR',
    country: 'Indonesia',
    neighborhoods: ['Kemang', 'SCBD', 'Senopati', 'Kota Tua', 'PIK', 'Menteng'],
  },
  'Manila': {
    lat: { min: 14.3500, max: 14.7800 },
    lng: { min: 120.9000, max: 121.1500 },
    timezone: 'Asia/Manila',
    currency: 'PHP',
    country: 'Philippines',
    neighborhoods: ['Makati', 'BGC', 'Poblacion', 'Quezon City', 'Manila Bay', 'Eastwood'],
  },

  // Asia - India
  'Mumbai': {
    lat: { min: 18.8900, max: 19.2700 },
    lng: { min: 72.7800, max: 72.9800 },
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    country: 'India',
    neighborhoods: ['Bandra', 'Colaba', 'Lower Parel', 'Andheri', 'Juhu', 'Worli', 'Kala Ghoda'],
  },
  'Delhi': {
    lat: { min: 28.4041, max: 28.8836 },
    lng: { min: 76.8387, max: 77.3469 },
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    country: 'India',
    neighborhoods: ['Connaught Place', 'Hauz Khas', 'Khan Market', 'Defence Colony', 'Greater Kailash', 'Mehrauli'],
  },
  'Bangalore': {
    lat: { min: 12.8300, max: 13.1400 },
    lng: { min: 77.4600, max: 77.7800 },
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    country: 'India',
    neighborhoods: ['Koramangala', 'Indiranagar', 'MG Road', 'HSR Layout', 'JP Nagar', 'Whitefield'],
  },

  // Middle East
  'Dubai': {
    lat: { min: 24.7936, max: 25.3585 },
    lng: { min: 54.8900, max: 55.5647 },
    timezone: 'Asia/Dubai',
    currency: 'AED',
    country: 'United Arab Emirates',
    neighborhoods: ['Downtown Dubai', 'JBR', 'DIFC', 'Marina', 'Business Bay', 'Palm Jumeirah', 'Al Quoz'],
  },
  'Abu Dhabi': {
    lat: { min: 24.3000, max: 24.5500 },
    lng: { min: 54.3000, max: 54.6000 },
    timezone: 'Asia/Dubai',
    currency: 'AED',
    country: 'United Arab Emirates',
    neighborhoods: ['Corniche', 'Saadiyat Island', 'Yas Island', 'Al Maryah Island', 'Downtown'],
  },
  'Doha': {
    lat: { min: 25.2200, max: 25.4200 },
    lng: { min: 51.4200, max: 51.6200 },
    timezone: 'Asia/Qatar',
    currency: 'QAR',
    country: 'Qatar',
    neighborhoods: ['The Pearl', 'West Bay', 'Souq Waqif', 'Msheireb', 'Katara'],
  },
  'Tel Aviv': {
    lat: { min: 32.0000, max: 32.1500 },
    lng: { min: 34.7400, max: 34.8200 },
    timezone: 'Asia/Jerusalem',
    currency: 'ILS',
    country: 'Israel',
    neighborhoods: ['Florentin', 'Neve Tzedek', 'Rothschild', 'Dizengoff', 'Jaffa', 'Tel Aviv Port'],
  },

  // Oceania
  'Sydney': {
    lat: { min: -34.1183, max: -33.5781 },
    lng: { min: 150.5209, max: 151.3430 },
    timezone: 'Australia/Sydney',
    currency: 'AUD',
    country: 'Australia',
    neighborhoods: ['Surry Hills', 'Darlinghurst', 'Kings Cross', 'Newtown', 'Bondi', 'Paddington', 'Potts Point', 'The Rocks', 'Circular Quay'],
  },
  'Melbourne': {
    lat: { min: -38.0339, max: -37.6590 },
    lng: { min: 144.5937, max: 145.5125 },
    timezone: 'Australia/Melbourne',
    currency: 'AUD',
    country: 'Australia',
    neighborhoods: ['CBD', 'Fitzroy', 'Collingwood', 'St Kilda', 'South Yarra', 'Richmond', 'Brunswick', 'Chapel Street'],
  },
  'Brisbane': {
    lat: { min: -27.6700, max: -27.2500 },
    lng: { min: 152.8500, max: 153.2000 },
    timezone: 'Australia/Brisbane',
    currency: 'AUD',
    country: 'Australia',
    neighborhoods: ['Fortitude Valley', 'West End', 'South Bank', 'New Farm', 'Paddington', 'CBD'],
  },
  'Perth': {
    lat: { min: -32.1500, max: -31.7500 },
    lng: { min: 115.7000, max: 116.0500 },
    timezone: 'Australia/Perth',
    currency: 'AUD',
    country: 'Australia',
    neighborhoods: ['Northbridge', 'Leederville', 'Fremantle', 'Subiaco', 'CBD', 'Mt Lawley'],
  },
  'Auckland': {
    lat: { min: -37.0662, max: -36.6800 },
    lng: { min: 174.6200, max: 174.9200 },
    timezone: 'Pacific/Auckland',
    currency: 'NZD',
    country: 'New Zealand',
    neighborhoods: ['Viaduct', 'Ponsonby', 'Britomart', 'Wynyard Quarter', 'K\' Road', 'Parnell'],
  },

  // South America
  'Rio de Janeiro': {
    lat: { min: -23.0826, max: -22.7461 },
    lng: { min: -43.7956, max: -43.1045 },
    timezone: 'America/Sao_Paulo',
    currency: 'BRL',
    country: 'Brazil',
    neighborhoods: ['Copacabana', 'Ipanema', 'Leblon', 'Lapa', 'Santa Teresa', 'Botafogo', 'Barra da Tijuca'],
  },
  'São Paulo': {
    lat: { min: -23.8000, max: -23.3500 },
    lng: { min: -46.8500, max: -46.3500 },
    timezone: 'America/Sao_Paulo',
    currency: 'BRL',
    country: 'Brazil',
    neighborhoods: ['Vila Madalena', 'Jardins', 'Pinheiros', 'Itaim Bibi', 'Beco do Batman', 'Centro', 'Liberdade'],
  },
  'Buenos Aires': {
    lat: { min: -34.7050, max: -34.5265 },
    lng: { min: -58.5310, max: -58.3355 },
    timezone: 'America/Argentina/Buenos_Aires',
    currency: 'ARS',
    country: 'Argentina',
    neighborhoods: ['Palermo', 'San Telmo', 'Recoleta', 'La Boca', 'Puerto Madero', 'Belgrano', 'Colegiales'],
  },
  'Bogotá': {
    lat: { min: 4.4700, max: 4.8400 },
    lng: { min: -74.2300, max: -73.9900 },
    timezone: 'America/Bogota',
    currency: 'COP',
    country: 'Colombia',
    neighborhoods: ['Zona Rosa', 'Chapinero', 'La Candelaria', 'Usaquén', 'Parque 93', 'La Macarena'],
  },
  'Medellín': {
    lat: { min: 6.1700, max: 6.3500 },
    lng: { min: -75.6500, max: -75.5000 },
    timezone: 'America/Bogota',
    currency: 'COP',
    country: 'Colombia',
    neighborhoods: ['El Poblado', 'Laureles', 'Envigado', 'Parque Lleras', 'Centro'],
  },
  'Lima': {
    lat: { min: -12.2200, max: -11.9700 },
    lng: { min: -77.1800, max: -76.8500 },
    timezone: 'America/Lima',
    currency: 'PEN',
    country: 'Peru',
    neighborhoods: ['Miraflores', 'Barranco', 'San Isidro', 'Centro Histórico', 'Surco'],
  },
  'Santiago': {
    lat: { min: -33.6500, max: -33.3500 },
    lng: { min: -70.8000, max: -70.5000 },
    timezone: 'America/Santiago',
    currency: 'CLP',
    country: 'Chile',
    neighborhoods: ['Lastarria', 'Bellavista', 'Providencia', 'Las Condes', 'Ñuñoa', 'Vitacura'],
  },

  // Africa
  'Cape Town': {
    lat: { min: -34.1700, max: -33.8500 },
    lng: { min: 18.3500, max: 18.6500 },
    timezone: 'Africa/Johannesburg',
    currency: 'ZAR',
    country: 'South Africa',
    neighborhoods: ['Long Street', 'Camps Bay', 'Woodstock', 'Green Point', 'De Waterkant', 'Bree Street'],
  },
  'Johannesburg': {
    lat: { min: -26.3500, max: -26.0500 },
    lng: { min: 27.9500, max: 28.1500 },
    timezone: 'Africa/Johannesburg',
    currency: 'ZAR',
    country: 'South Africa',
    neighborhoods: ['Maboneng', 'Braamfontein', 'Rosebank', 'Sandton', 'Melville', 'Parkhurst'],
  },
  'Nairobi': {
    lat: { min: -1.4000, max: -1.1700 },
    lng: { min: 36.7000, max: 36.9500 },
    timezone: 'Africa/Nairobi',
    currency: 'KES',
    country: 'Kenya',
    neighborhoods: ['Westlands', 'Kilimani', 'Lavington', 'Karen', 'CBD', 'Hurlingham'],
  },
  'Cairo': {
    lat: { min: 29.8500, max: 30.1500 },
    lng: { min: 31.1500, max: 31.4500 },
    timezone: 'Africa/Cairo',
    currency: 'EGP',
    country: 'Egypt',
    neighborhoods: ['Zamalek', 'Downtown', 'Maadi', 'Heliopolis', 'Garden City', 'Mohandessin'],
  },
  'Marrakech': {
    lat: { min: 31.5700, max: 31.6900 },
    lng: { min: -8.0500, max: -7.9200 },
    timezone: 'Africa/Casablanca',
    currency: 'MAD',
    country: 'Morocco',
    neighborhoods: ['Medina', 'Gueliz', 'Hivernage', 'Kasbah', 'Mellah'],
  },
  'Casablanca': {
    lat: { min: 33.5000, max: 33.6500 },
    lng: { min: -7.7000, max: -7.5000 },
    timezone: 'Africa/Casablanca',
    currency: 'MAD',
    country: 'Morocco',
    neighborhoods: ['Corniche', 'Gauthier', 'Maarif', 'Old Medina', 'Anfa'],
  },
  'Lagos': {
    lat: { min: 6.3900, max: 6.7000 },
    lng: { min: 3.1000, max: 3.5500 },
    timezone: 'Africa/Lagos',
    currency: 'NGN',
    country: 'Nigeria',
    neighborhoods: ['Victoria Island', 'Lekki', 'Ikoyi', 'Lagos Island', 'Ikeja'],
  },
  'Accra': {
    lat: { min: 5.5000, max: 5.7000 },
    lng: { min: -0.3000, max: 0.0000 },
    timezone: 'Africa/Accra',
    currency: 'GHS',
    country: 'Ghana',
    neighborhoods: ['Osu', 'Labone', 'East Legon', 'Airport Residential', 'Cantonments'],
  },

  // Caribbean
  'Havana': {
    lat: { min: 23.0000, max: 23.2000 },
    lng: { min: -82.5000, max: -82.3000 },
    timezone: 'America/Havana',
    currency: 'CUP',
    country: 'Cuba',
    neighborhoods: ['Habana Vieja', 'Vedado', 'Centro Habana', 'Miramar', 'Malecón'],
  },
  'San Juan': {
    lat: { min: 18.3800, max: 18.4800 },
    lng: { min: -66.1200, max: -65.9700 },
    timezone: 'America/Puerto_Rico',
    currency: 'USD',
    country: 'Puerto Rico',
    neighborhoods: ['Old San Juan', 'Condado', 'Santurce', 'Isla Verde', 'La Placita'],
  },
  'Nassau': {
    lat: { min: 25.0000, max: 25.1200 },
    lng: { min: -77.4500, max: -77.3000 },
    timezone: 'America/Nassau',
    currency: 'BSD',
    country: 'Bahamas',
    neighborhoods: ['Downtown', 'Cable Beach', 'Paradise Island', 'Bay Street'],
  },
};

/**
 * Validate if coordinates are within city bounds
 */
export function isWithinCityBounds(
  cityName: string,
  lat: number,
  lng: number
): boolean {
  const bounds = CITY_BOUNDS[cityName];
  if (!bounds) {
    console.warn(`[city-bounds] No bounds defined for city: ${cityName}`);
    return true; // Allow if no bounds defined
  }

  return (
    lat >= bounds.lat.min &&
    lat <= bounds.lat.max &&
    lng >= bounds.lng.min &&
    lng <= bounds.lng.max
  );
}

/**
 * Get city bounds by name
 */
export function getCityBounds(cityName: string): CityBounds | undefined {
  return CITY_BOUNDS[cityName];
}

/**
 * Get all city names with defined bounds
 */
export function getCitiesWithBounds(): string[] {
  return Object.keys(CITY_BOUNDS);
}

/**
 * Get neighborhoods for a city
 */
export function getCityNeighborhoods(cityName: string): string[] {
  return CITY_BOUNDS[cityName]?.neighborhoods || [];
}
