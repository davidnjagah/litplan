/**
 * Top 100 Cities for Plan Generation
 * Major cities with active nightlife scenes
 */

export interface CityInfo {
  id: string;
  name: string;
  country: string;
  timezone: string;
  currency: string;
}

/**
 * Top 100 cities for plan generation
 */
export const TOP_CITIES: CityInfo[] = [
  // North America
  { id: 'nyc', name: 'New York', country: 'USA', timezone: 'America/New_York', currency: 'USD' },
  { id: 'lax', name: 'Los Angeles', country: 'USA', timezone: 'America/Los_Angeles', currency: 'USD' },
  { id: 'chi', name: 'Chicago', country: 'USA', timezone: 'America/Chicago', currency: 'USD' },
  { id: 'mia', name: 'Miami', country: 'USA', timezone: 'America/New_York', currency: 'USD' },
  { id: 'lvs', name: 'Las Vegas', country: 'USA', timezone: 'America/Los_Angeles', currency: 'USD' },
  { id: 'sfo', name: 'San Francisco', country: 'USA', timezone: 'America/Los_Angeles', currency: 'USD' },
  { id: 'sea', name: 'Seattle', country: 'USA', timezone: 'America/Los_Angeles', currency: 'USD' },
  { id: 'atl', name: 'Atlanta', country: 'USA', timezone: 'America/New_York', currency: 'USD' },
  { id: 'bos', name: 'Boston', country: 'USA', timezone: 'America/New_York', currency: 'USD' },
  { id: 'aus', name: 'Austin', country: 'USA', timezone: 'America/Chicago', currency: 'USD' },
  { id: 'nsh', name: 'Nashville', country: 'USA', timezone: 'America/Chicago', currency: 'USD' },
  { id: 'nol', name: 'New Orleans', country: 'USA', timezone: 'America/Chicago', currency: 'USD' },
  { id: 'den', name: 'Denver', country: 'USA', timezone: 'America/Denver', currency: 'USD' },
  { id: 'phl', name: 'Philadelphia', country: 'USA', timezone: 'America/New_York', currency: 'USD' },
  { id: 'sdg', name: 'San Diego', country: 'USA', timezone: 'America/Los_Angeles', currency: 'USD' },
  { id: 'tor', name: 'Toronto', country: 'Canada', timezone: 'America/Toronto', currency: 'CAD' },
  { id: 'van', name: 'Vancouver', country: 'Canada', timezone: 'America/Vancouver', currency: 'CAD' },
  { id: 'mtl', name: 'Montreal', country: 'Canada', timezone: 'America/Montreal', currency: 'CAD' },
  { id: 'mex', name: 'Mexico City', country: 'Mexico', timezone: 'America/Mexico_City', currency: 'MXN' },

  // Europe
  { id: 'lon', name: 'London', country: 'UK', timezone: 'Europe/London', currency: 'GBP' },
  { id: 'par', name: 'Paris', country: 'France', timezone: 'Europe/Paris', currency: 'EUR' },
  { id: 'ber', name: 'Berlin', country: 'Germany', timezone: 'Europe/Berlin', currency: 'EUR' },
  { id: 'ams', name: 'Amsterdam', country: 'Netherlands', timezone: 'Europe/Amsterdam', currency: 'EUR' },
  { id: 'bar', name: 'Barcelona', country: 'Spain', timezone: 'Europe/Madrid', currency: 'EUR' },
  { id: 'mad', name: 'Madrid', country: 'Spain', timezone: 'Europe/Madrid', currency: 'EUR' },
  { id: 'rom', name: 'Rome', country: 'Italy', timezone: 'Europe/Rome', currency: 'EUR' },
  { id: 'mil', name: 'Milan', country: 'Italy', timezone: 'Europe/Rome', currency: 'EUR' },
  { id: 'vie', name: 'Vienna', country: 'Austria', timezone: 'Europe/Vienna', currency: 'EUR' },
  { id: 'prg', name: 'Prague', country: 'Czech Republic', timezone: 'Europe/Prague', currency: 'CZK' },
  { id: 'lis', name: 'Lisbon', country: 'Portugal', timezone: 'Europe/Lisbon', currency: 'EUR' },
  { id: 'dub', name: 'Dublin', country: 'Ireland', timezone: 'Europe/Dublin', currency: 'EUR' },
  { id: 'cop', name: 'Copenhagen', country: 'Denmark', timezone: 'Europe/Copenhagen', currency: 'DKK' },
  { id: 'stk', name: 'Stockholm', country: 'Sweden', timezone: 'Europe/Stockholm', currency: 'SEK' },
  { id: 'osl', name: 'Oslo', country: 'Norway', timezone: 'Europe/Oslo', currency: 'NOK' },
  { id: 'hel', name: 'Helsinki', country: 'Finland', timezone: 'Europe/Helsinki', currency: 'EUR' },
  { id: 'bru', name: 'Brussels', country: 'Belgium', timezone: 'Europe/Brussels', currency: 'EUR' },
  { id: 'zur', name: 'Zurich', country: 'Switzerland', timezone: 'Europe/Zurich', currency: 'CHF' },
  { id: 'mun', name: 'Munich', country: 'Germany', timezone: 'Europe/Berlin', currency: 'EUR' },
  { id: 'ham', name: 'Hamburg', country: 'Germany', timezone: 'Europe/Berlin', currency: 'EUR' },
  { id: 'edi', name: 'Edinburgh', country: 'UK', timezone: 'Europe/London', currency: 'GBP' },
  { id: 'man', name: 'Manchester', country: 'UK', timezone: 'Europe/London', currency: 'GBP' },
  { id: 'ath', name: 'Athens', country: 'Greece', timezone: 'Europe/Athens', currency: 'EUR' },
  { id: 'bud', name: 'Budapest', country: 'Hungary', timezone: 'Europe/Budapest', currency: 'HUF' },
  { id: 'war', name: 'Warsaw', country: 'Poland', timezone: 'Europe/Warsaw', currency: 'PLN' },
  { id: 'kra', name: 'Krakow', country: 'Poland', timezone: 'Europe/Warsaw', currency: 'PLN' },

  // Asia Pacific
  { id: 'tyo', name: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo', currency: 'JPY' },
  { id: 'osa', name: 'Osaka', country: 'Japan', timezone: 'Asia/Tokyo', currency: 'JPY' },
  { id: 'kyo', name: 'Kyoto', country: 'Japan', timezone: 'Asia/Tokyo', currency: 'JPY' },
  { id: 'seo', name: 'Seoul', country: 'South Korea', timezone: 'Asia/Seoul', currency: 'KRW' },
  { id: 'hkg', name: 'Hong Kong', country: 'Hong Kong', timezone: 'Asia/Hong_Kong', currency: 'HKD' },
  { id: 'sin', name: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore', currency: 'SGD' },
  { id: 'bkk', name: 'Bangkok', country: 'Thailand', timezone: 'Asia/Bangkok', currency: 'THB' },
  { id: 'sha', name: 'Shanghai', country: 'China', timezone: 'Asia/Shanghai', currency: 'CNY' },
  { id: 'bei', name: 'Beijing', country: 'China', timezone: 'Asia/Shanghai', currency: 'CNY' },
  { id: 'tpe', name: 'Taipei', country: 'Taiwan', timezone: 'Asia/Taipei', currency: 'TWD' },
  { id: 'kul', name: 'Kuala Lumpur', country: 'Malaysia', timezone: 'Asia/Kuala_Lumpur', currency: 'MYR' },
  { id: 'hcm', name: 'Ho Chi Minh City', country: 'Vietnam', timezone: 'Asia/Ho_Chi_Minh', currency: 'VND' },
  { id: 'bal', name: 'Bali', country: 'Indonesia', timezone: 'Asia/Makassar', currency: 'IDR' },
  { id: 'jkt', name: 'Jakarta', country: 'Indonesia', timezone: 'Asia/Jakarta', currency: 'IDR' },
  { id: 'mni', name: 'Manila', country: 'Philippines', timezone: 'Asia/Manila', currency: 'PHP' },
  { id: 'del', name: 'Delhi', country: 'India', timezone: 'Asia/Kolkata', currency: 'INR' },
  { id: 'mum', name: 'Mumbai', country: 'India', timezone: 'Asia/Kolkata', currency: 'INR' },
  { id: 'blr', name: 'Bangalore', country: 'India', timezone: 'Asia/Kolkata', currency: 'INR' },

  // Oceania
  { id: 'syd', name: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney', currency: 'AUD' },
  { id: 'mel', name: 'Melbourne', country: 'Australia', timezone: 'Australia/Melbourne', currency: 'AUD' },
  { id: 'bri', name: 'Brisbane', country: 'Australia', timezone: 'Australia/Brisbane', currency: 'AUD' },
  { id: 'per', name: 'Perth', country: 'Australia', timezone: 'Australia/Perth', currency: 'AUD' },
  { id: 'akl', name: 'Auckland', country: 'New Zealand', timezone: 'Pacific/Auckland', currency: 'NZD' },

  // Middle East
  { id: 'dxb', name: 'Dubai', country: 'UAE', timezone: 'Asia/Dubai', currency: 'AED' },
  { id: 'auh', name: 'Abu Dhabi', country: 'UAE', timezone: 'Asia/Dubai', currency: 'AED' },
  { id: 'doh', name: 'Doha', country: 'Qatar', timezone: 'Asia/Qatar', currency: 'QAR' },
  { id: 'tlv', name: 'Tel Aviv', country: 'Israel', timezone: 'Asia/Jerusalem', currency: 'ILS' },
  { id: 'ist', name: 'Istanbul', country: 'Turkey', timezone: 'Europe/Istanbul', currency: 'TRY' },

  // South America
  { id: 'rio', name: 'Rio de Janeiro', country: 'Brazil', timezone: 'America/Sao_Paulo', currency: 'BRL' },
  { id: 'sao', name: 'São Paulo', country: 'Brazil', timezone: 'America/Sao_Paulo', currency: 'BRL' },
  { id: 'bue', name: 'Buenos Aires', country: 'Argentina', timezone: 'America/Argentina/Buenos_Aires', currency: 'ARS' },
  { id: 'bog', name: 'Bogotá', country: 'Colombia', timezone: 'America/Bogota', currency: 'COP' },
  { id: 'med', name: 'Medellín', country: 'Colombia', timezone: 'America/Bogota', currency: 'COP' },
  { id: 'lim', name: 'Lima', country: 'Peru', timezone: 'America/Lima', currency: 'PEN' },
  { id: 'scl', name: 'Santiago', country: 'Chile', timezone: 'America/Santiago', currency: 'CLP' },

  // Africa
  { id: 'cpt', name: 'Cape Town', country: 'South Africa', timezone: 'Africa/Johannesburg', currency: 'ZAR' },
  { id: 'jnb', name: 'Johannesburg', country: 'South Africa', timezone: 'Africa/Johannesburg', currency: 'ZAR' },
  { id: 'nbo', name: 'Nairobi', country: 'Kenya', timezone: 'Africa/Nairobi', currency: 'KES' },
  { id: 'cai', name: 'Cairo', country: 'Egypt', timezone: 'Africa/Cairo', currency: 'EGP' },
  { id: 'mar', name: 'Marrakech', country: 'Morocco', timezone: 'Africa/Casablanca', currency: 'MAD' },
  { id: 'cas', name: 'Casablanca', country: 'Morocco', timezone: 'Africa/Casablanca', currency: 'MAD' },
  { id: 'los', name: 'Lagos', country: 'Nigeria', timezone: 'Africa/Lagos', currency: 'NGN' },
  { id: 'acc', name: 'Accra', country: 'Ghana', timezone: 'Africa/Accra', currency: 'GHS' },

  // Caribbean
  { id: 'can', name: 'Cancún', country: 'Mexico', timezone: 'America/Cancun', currency: 'MXN' },
  { id: 'hav', name: 'Havana', country: 'Cuba', timezone: 'America/Havana', currency: 'CUP' },
  { id: 'sju', name: 'San Juan', country: 'Puerto Rico', timezone: 'America/Puerto_Rico', currency: 'USD' },
  { id: 'nas', name: 'Nassau', country: 'Bahamas', timezone: 'America/Nassau', currency: 'BSD' },

  // Additional European
  { id: 'ibi', name: 'Ibiza', country: 'Spain', timezone: 'Europe/Madrid', currency: 'EUR' },
  { id: 'myk', name: 'Mykonos', country: 'Greece', timezone: 'Europe/Athens', currency: 'EUR' },
];

/**
 * Get city by ID
 */
export function getCityById(id: string): CityInfo | undefined {
  return TOP_CITIES.find((city) => city.id === id);
}

/**
 * Get cities by country
 */
export function getCitiesByCountry(country: string): CityInfo[] {
  return TOP_CITIES.filter((city) => city.country === country);
}

/**
 * Get all city IDs
 */
export function getAllCityIds(): string[] {
  return TOP_CITIES.map((city) => city.id);
}
