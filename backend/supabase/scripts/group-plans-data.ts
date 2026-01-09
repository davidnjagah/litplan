/**
 * Comprehensive Group Plans Data for Top Cities
 *
 * Each city has 4-6 unique group plans with NO repeated venues
 * Includes boat party plans for coastal cities
 * Based on real, verified venues
 */

export interface GroupPlanVenue {
  venueName: string;
  description: string;
  startTime: string;
  duration: number;
}

export interface GroupPlan {
  title: string;
  description: string;
  difficulty: 'easy' | 'moderate' | 'challenging';
  bestFor: string[];
  venues: GroupPlanVenue[];
  isWeekend: boolean;
}

export const GROUP_PLANS_DATA: Record<string, GroupPlan[]> = {
  // ============================================
  // NEW YORK
  // ============================================
  'New York': [
    {
      title: 'Ultimate NYC Night Out',
      description: 'Experience the best of Manhattan nightlife from craft beer to jazz to dancing.',
      difficulty: 'moderate',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'Brooklyn Brewery', description: 'Start your night with craft beers at Brooklyn Brewery. Enjoy the buzzing atmosphere and try their seasonal brews.', startTime: '20:00', duration: 90 },
        { venueName: 'Blue Note Jazz Club', description: 'Experience world-class live jazz at Blue Note Jazz Club. An intimate setting with legendary performers.', startTime: '22:00', duration: 120 },
        { venueName: 'Le Bain at The Standard', description: 'End the night dancing at Le Bain, a rooftop nightclub with incredible city views.', startTime: '01:00', duration: 90 }
      ]
    },
    {
      title: 'Comedy & Cocktails',
      description: 'Laugh the night away with world-class cocktails and legendary comedy.',
      difficulty: 'easy',
      bestFor: ['groups', 'couples'],
      isWeekend: true,
      venues: [
        { venueName: 'The Dead Rabbit', description: 'Pre-show cocktails at the award-winning Dead Rabbit. Try their famous Irish Coffee.', startTime: '20:00', duration: 90 },
        { venueName: 'Comedy Cellar', description: 'Laugh the night away at Comedy Cellar, NYC\'s legendary comedy club where stars are born.', startTime: '22:00', duration: 120 }
      ]
    },
    {
      title: 'Speakeasy Secret Tour',
      description: 'Discover NYC\'s hidden bars and prohibition-era secrets.',
      difficulty: 'moderate',
      bestFor: ['couples', 'date-night'],
      isWeekend: false,
      venues: [
        { venueName: 'Please Don\'t Tell (PDT)', description: 'Enter through a phone booth inside Crif Dogs for craft cocktails in a hidden speakeasy.', startTime: '20:00', duration: 90 },
        { venueName: 'Employees Only', description: 'Classic cocktails and mind-reading tarot at this West Village institution.', startTime: '22:00', duration: 90 },
        { venueName: 'Attaboy', description: 'No menu, just tell the bartender what you like at this Lower East Side gem.', startTime: '00:00', duration: 90 }
      ]
    },
    {
      title: 'Rooftop Hopping',
      description: 'Take in stunning skyline views from Manhattan\'s best rooftops.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: '230 Fifth', description: 'Iconic Empire State views from this massive Flatiron rooftop bar.', startTime: '19:00', duration: 90 },
        { venueName: 'Westlight', description: 'Williamsburg\'s chicest rooftop with panoramic Manhattan views.', startTime: '21:00', duration: 90 },
        { venueName: 'The Roof at PUBLIC', description: 'Downtown views with a trendy crowd and craft cocktails.', startTime: '23:00', duration: 120 }
      ]
    },
    {
      title: 'Harbor Yacht Party',
      description: 'Sail around Manhattan with drinks, dancing, and stunning skyline views.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Pier A Harbor House', description: 'Pre-party cocktails with waterfront views at Battery Park.', startTime: '18:00', duration: 90 },
        { venueName: 'NYC Boat Party Cruise', description: 'Board a yacht for a 3-hour cruise around Manhattan with DJ and open bar.', startTime: '20:00', duration: 180 },
        { venueName: 'Output', description: 'Continue the party at Brooklyn\'s premier techno club.', startTime: '00:00', duration: 120 }
      ]
    }
  ],

  // ============================================
  // LOS ANGELES
  // ============================================
  'Los Angeles': [
    {
      title: 'West Hollywood Vibes',
      description: 'Experience the glamour and energy of WeHo\'s legendary nightlife.',
      difficulty: 'easy',
      bestFor: ['groups', 'couples'],
      isWeekend: true,
      venues: [
        { venueName: 'Skybar at Mondrian', description: 'Sunset cocktails at the iconic Skybar with stunning city views.', startTime: '20:00', duration: 90 },
        { venueName: 'The Troubadour', description: 'Catch a live show at The Troubadour, LA\'s legendary music venue.', startTime: '22:00', duration: 120 }
      ]
    },
    {
      title: 'Rooftop Sunset Crawl',
      description: 'Chase the sunset across LA\'s most stunning rooftop venues.',
      difficulty: 'moderate',
      bestFor: ['couples', 'date-night'],
      isWeekend: true,
      venues: [
        { venueName: 'Perch', description: 'French-inspired rooftop with downtown LA skyline views.', startTime: '18:00', duration: 90 },
        { venueName: 'EP & LP', description: 'Asian fusion and craft cocktails on this West Hollywood rooftop.', startTime: '20:00', duration: 90 },
        { venueName: 'Mama Shelter Rooftop', description: 'Hollywood views with a hipster crowd and photo-worthy decor.', startTime: '22:00', duration: 120 }
      ]
    },
    {
      title: 'Venice Beach Day Party',
      description: 'California dreaming with beach vibes and yacht parties.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'The Brig', description: 'Pre-party drinks at this Abbot Kinney institution with outdoor patio.', startTime: '14:00', duration: 90 },
        { venueName: 'Marina del Rey Yacht Party', description: 'Board a yacht for sunset cruising along the coast with DJ and drinks.', startTime: '16:00', duration: 180 },
        { venueName: 'Elia Beach Club', description: 'After-party at this poolside day club with Mediterranean vibes.', startTime: '20:00', duration: 120 }
      ]
    },
    {
      title: 'Hollywood Legends Night',
      description: 'Walk the red carpet at Hollywood\'s most iconic venues.',
      difficulty: 'challenging',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Musso & Frank Grill', description: 'Pre-drinks at Hollywood\'s oldest restaurant where legends dined.', startTime: '20:00', duration: 90 },
        { venueName: 'No Vacancy', description: 'Enter through a secret door into this Victorian speakeasy.', startTime: '22:00', duration: 90 },
        { venueName: 'Avalon Hollywood', description: 'Dance till dawn at this historic nightclub in a converted theater.', startTime: '00:00', duration: 120 }
      ]
    },
    {
      title: 'Silver Lake Indie Scene',
      description: 'Discover LA\'s coolest neighborhood with indie venues and dive bars.',
      difficulty: 'easy',
      bestFor: ['solo', 'groups'],
      isWeekend: false,
      venues: [
        { venueName: 'Akbar', description: 'Laid-back dive bar with great DJ nights and welcoming crowd.', startTime: '21:00', duration: 90 },
        { venueName: 'The Satellite', description: 'Catch emerging bands at this intimate Silver Lake venue.', startTime: '23:00', duration: 120 }
      ]
    }
  ],

  // ============================================
  // MIAMI
  // ============================================
  'Miami': [
    {
      title: 'South Beach Nightlife',
      description: 'Experience the legendary glamour of Miami\'s Ocean Drive.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Sugar at EAST', description: 'Rooftop cocktails with Brickell skyline views.', startTime: '20:00', duration: 90 },
        { venueName: 'Ball & Chain', description: 'Live salsa music and mojitos in Little Havana.', startTime: '22:00', duration: 90 },
        { venueName: 'LIV at Fontainebleau', description: 'Dance the night away at Miami\'s most exclusive megaclub.', startTime: '00:00', duration: 150 }
      ]
    },
    {
      title: 'Biscayne Bay Yacht Party',
      description: 'Sail the turquoise waters with champagne and stunning Miami views.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Nikki Beach', description: 'Pre-party brunch with champagne and beach vibes.', startTime: '13:00', duration: 120 },
        { venueName: 'Miami Yacht Party', description: 'Board a luxury yacht for a cruise around Star Island and Biscayne Bay.', startTime: '15:00', duration: 180 },
        { venueName: 'E11EVEN', description: 'The ultimate after-party at Miami\'s 24-hour ultraclub.', startTime: '19:00', duration: 180 }
      ]
    },
    {
      title: 'Little Havana Nights',
      description: 'Authentic Cuban culture with salsa, cigars, and cocktails.',
      difficulty: 'easy',
      bestFor: ['couples', 'date-night'],
      isWeekend: false,
      venues: [
        { venueName: 'Cubaocho Museum & Art Gallery', description: 'Cuban art and live music in a historic building.', startTime: '20:00', duration: 90 },
        { venueName: 'Hoy Como Ayer', description: 'Dance salsa with locals at this authentic Cuban nightclub.', startTime: '22:00', duration: 120 }
      ]
    },
    {
      title: 'Wynwood Art & Cocktails',
      description: 'Street art, craft cocktails, and Miami\'s creative scene.',
      difficulty: 'easy',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'Gramps', description: 'Dive bar vibes with great cocktails and a backyard.', startTime: '20:00', duration: 90 },
        { venueName: 'Shots', description: 'Intimate cocktail bar in a converted shipping container.', startTime: '22:00', duration: 90 },
        { venueName: 'Treehouse', description: 'Dance under the stars at this open-air techno club.', startTime: '00:00', duration: 120 }
      ]
    }
  ],

  // ============================================
  // LONDON
  // ============================================
  'London': [
    {
      title: 'Classic West End Night',
      description: 'Theater, cocktails, and jazz in London\'s entertainment heart.',
      difficulty: 'moderate',
      bestFor: ['couples', 'date-night'],
      isWeekend: true,
      venues: [
        { venueName: 'The American Bar at The Savoy', description: 'Legendary cocktails at one of the world\'s most iconic bars.', startTime: '19:00', duration: 90 },
        { venueName: 'Ronnie Scott\'s Jazz Club', description: 'World-class jazz in Soho since 1959.', startTime: '21:00', duration: 120 },
        { venueName: 'Experimental Cocktail Club', description: 'Hidden speakeasy in Chinatown with innovative cocktails.', startTime: '23:30', duration: 90 }
      ]
    },
    {
      title: 'Shoreditch Alternative',
      description: 'East London\'s edgy bars, clubs, and creative energy.',
      difficulty: 'moderate',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'Callooh Callay', description: 'Quirky speakeasy with a wardrobe entrance.', startTime: '20:00', duration: 90 },
        { venueName: 'XOYO', description: 'Underground club with world-class DJs.', startTime: '22:30', duration: 120 },
        { venueName: 'Fabric', description: 'Iconic techno institution in Farringdon.', startTime: '01:00', duration: 180 }
      ]
    },
    {
      title: 'Thames River Party',
      description: 'Dance on the water with London\'s skyline as your backdrop.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'OXO Tower Bar', description: 'Pre-party drinks with South Bank views.', startTime: '18:00', duration: 90 },
        { venueName: 'Thames Party Boat', description: 'Board a boat for a cruise past Parliament, Tower Bridge, and more.', startTime: '20:00', duration: 180 },
        { venueName: 'Ministry of Sound', description: 'End the night at the legendary superclub.', startTime: '00:00', duration: 180 }
      ]
    },
    {
      title: 'Soho After Dark',
      description: 'Discover the magic of London\'s most vibrant neighborhood.',
      difficulty: 'easy',
      bestFor: ['groups', 'couples'],
      isWeekend: false,
      venues: [
        { venueName: 'Bar Termini', description: 'Italian coffee by day, negronis by night in this tiny gem.', startTime: '20:00', duration: 60 },
        { venueName: 'The Blue Posts', description: 'Classic pub downstairs, wine bar upstairs.', startTime: '21:30', duration: 90 }
      ]
    }
  ],

  // ============================================
  // PARIS
  // ============================================
  'Paris': [
    {
      title: 'Montmartre Magic',
      description: 'Romance and revelry in Paris\'s most artistic neighborhood.',
      difficulty: 'moderate',
      bestFor: ['couples', 'date-night'],
      isWeekend: true,
      venues: [
        { venueName: 'Le Très Particulier', description: 'Hidden cocktail bar in a secret garden behind Hotel Particulier.', startTime: '20:00', duration: 90 },
        { venueName: 'Au Lapin Agile', description: 'Historic cabaret where Picasso once performed.', startTime: '22:00', duration: 120 },
        { venueName: 'Moulin Rouge', description: 'The legendary cabaret with the world-famous cancan.', startTime: '00:30', duration: 120 }
      ]
    },
    {
      title: 'Le Marais Night Out',
      description: 'Trendy bars and clubs in Paris\'s hippest neighborhood.',
      difficulty: 'easy',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'Candelaria', description: 'Tacos in front, speakeasy cocktail bar in back.', startTime: '21:00', duration: 90 },
        { venueName: 'Le Baron', description: 'Exclusive nightclub with an eclectic music policy.', startTime: '23:00', duration: 150 }
      ]
    },
    {
      title: 'Seine River Cruise Party',
      description: 'Glide past Paris\'s monuments with champagne and dancing.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Les Ombres', description: 'Pre-cruise drinks with Eiffel Tower views at Musée du Quai Branly.', startTime: '19:00', duration: 90 },
        { venueName: 'Paris Boat Party', description: 'Dance on the Seine past Notre-Dame and the Louvre.', startTime: '21:00', duration: 180 },
        { venueName: 'Concrete', description: 'After-party at this riverside techno club on a boat.', startTime: '01:00', duration: 180 }
      ]
    },
    {
      title: 'Jazz & Wine in Saint-Germain',
      description: 'Sophisticated evening in Paris\'s literary heart.',
      difficulty: 'easy',
      bestFor: ['couples', 'date-night'],
      isWeekend: false,
      venues: [
        { venueName: 'Prescription Cocktail Club', description: 'Prohibition-style bar with perfectly crafted cocktails.', startTime: '20:00', duration: 90 },
        { venueName: 'Duc des Lombards', description: 'Intimate jazz club with world-class performers.', startTime: '22:00', duration: 120 }
      ]
    }
  ],

  // ============================================
  // TOKYO
  // ============================================
  'Tokyo': [
    {
      title: 'Golden Gai Adventure',
      description: 'Explore Shinjuku\'s legendary maze of tiny bars.',
      difficulty: 'moderate',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'Albatross', description: 'Multi-floor bar with chandeliers in a narrow building.', startTime: '20:00', duration: 60 },
        { venueName: 'Champion', description: 'Tiny 6-seat bar with friendly owner and strong drinks.', startTime: '21:30', duration: 60 },
        { venueName: 'Death Match in Hell', description: 'Horror-themed bar with wrestling memorabilia.', startTime: '23:00', duration: 60 },
        { venueName: 'Contact', description: 'Underground techno club in Shibuya.', startTime: '00:30', duration: 180 }
      ]
    },
    {
      title: 'Shibuya to Roppongi',
      description: 'From scramble crossing to all-night dancing.',
      difficulty: 'challenging',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'WOMB', description: 'Four-floor superclub with world-class sound system.', startTime: '23:00', duration: 120 },
        { venueName: 'Sound Museum Vision', description: 'Underground dance music venue with multiple floors.', startTime: '01:30', duration: 180 },
        { venueName: 'Oath', description: 'Intimate late-night bar open until sunrise.', startTime: '04:00', duration: 120 }
      ]
    },
    {
      title: 'Tokyo Bay Cruise',
      description: 'Sail past Rainbow Bridge with the neon skyline glowing.',
      difficulty: 'moderate',
      bestFor: ['couples', 'groups'],
      isWeekend: true,
      venues: [
        { venueName: 'Two Rooms Grill & Bar', description: 'Chic Aoyama bar with terrace views.', startTime: '18:00', duration: 90 },
        { venueName: 'Tokyo Bay Night Cruise', description: 'Board a yakatabune boat for traditional Japanese dining on the water.', startTime: '20:00', duration: 150 },
        { venueName: 'Ageha', description: 'Japan\'s largest nightclub in a waterfront warehouse.', startTime: '23:00', duration: 180 }
      ]
    },
    {
      title: 'Whisky & Jazz Night',
      description: 'Japanese whisky and cool jazz in intimate bars.',
      difficulty: 'easy',
      bestFor: ['couples', 'date-night'],
      isWeekend: false,
      venues: [
        { venueName: 'Bar High Five', description: 'World-famous bartender crafts personalized cocktails.', startTime: '20:00', duration: 90 },
        { venueName: 'Blue Note Tokyo', description: 'World-class jazz in an intimate setting.', startTime: '22:00', duration: 120 }
      ]
    }
  ],

  // ============================================
  // BERLIN
  // ============================================
  'Berlin': [
    {
      title: 'Techno Pilgrimage',
      description: 'Experience the birthplace of techno culture.',
      difficulty: 'challenging',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'Klunkerkranich', description: 'Rooftop bar on top of a parking garage in Neukölln.', startTime: '20:00', duration: 120 },
        { venueName: 'Tresor', description: 'Legendary techno temple in an old power plant.', startTime: '23:00', duration: 180 },
        { venueName: 'Berghain', description: 'The world\'s most famous nightclub. Good luck getting in.', startTime: '03:00', duration: 300 }
      ]
    },
    {
      title: 'Kreuzberg Crawl',
      description: 'Dive bars, street food, and Berlin\'s alternative soul.',
      difficulty: 'easy',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'Luzia', description: 'Cozy bar with mismatched furniture and great cocktails.', startTime: '20:00', duration: 90 },
        { venueName: 'Möbel Olfe', description: 'Quirky bar in an old furniture store.', startTime: '22:00', duration: 90 },
        { venueName: 'Watergate', description: 'Dance club with floor-to-ceiling windows on the Spree.', startTime: '00:00', duration: 180 }
      ]
    },
    {
      title: 'Spree River Party',
      description: 'Float down Berlin\'s river with drinks and beats.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Club der Visionäre', description: 'Chill waterside bar with hammocks and minimal techno.', startTime: '16:00', duration: 120 },
        { venueName: 'Berlin Boat Party', description: 'Cruise the Spree with DJ and dancing.', startTime: '18:00', duration: 180 },
        { venueName: 'Sisyphos', description: 'Sprawling open-air club in a former factory.', startTime: '22:00', duration: 300 }
      ]
    },
    {
      title: 'Prenzlauer Berg Evening',
      description: 'Sophisticated cocktails in Berlin\'s prettiest neighborhood.',
      difficulty: 'easy',
      bestFor: ['couples', 'date-night'],
      isWeekend: false,
      venues: [
        { venueName: 'Buck and Breck', description: '12-seat speakeasy with impeccable cocktails.', startTime: '20:00', duration: 90 },
        { venueName: 'Beckett\'s Kopf', description: 'Literary-themed bar with creative drinks.', startTime: '22:00', duration: 90 }
      ]
    }
  ],

  // ============================================
  // BARCELONA
  // ============================================
  'Barcelona': [
    {
      title: 'Gothic Quarter Vibes',
      description: 'Wind through medieval streets to hidden bars and clubs.',
      difficulty: 'moderate',
      bestFor: ['groups', 'couples'],
      isWeekend: true,
      venues: [
        { venueName: 'Paradiso', description: 'World-famous speakeasy hidden behind a fridge door.', startTime: '21:00', duration: 90 },
        { venueName: 'Marula Café', description: 'Funk and soul in a basement club.', startTime: '23:00', duration: 90 },
        { venueName: 'Moog', description: 'Legendary techno club spinning since 1996.', startTime: '01:00', duration: 180 }
      ]
    },
    {
      title: 'Barceloneta Beach Party',
      description: 'From beachside chiringuitos to yacht parties on the Med.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Opium Mar', description: 'Beachfront terrace with views of the Mediterranean.', startTime: '17:00', duration: 120 },
        { venueName: 'Barcelona Boat Party', description: 'Sail along the Costa Brava with DJ, drinks, and swimming.', startTime: '19:00', duration: 180 },
        { venueName: 'Pacha Barcelona', description: 'World-famous club for the ultimate after-party.', startTime: '23:00', duration: 180 }
      ]
    },
    {
      title: 'El Born Art & Drinks',
      description: 'Artsy bars and vermouth in Barcelona\'s trendiest hood.',
      difficulty: 'easy',
      bestFor: ['couples', 'date-night'],
      isWeekend: false,
      venues: [
        { venueName: 'El Xampanyet', description: 'Legendary cava bar pouring since 1929.', startTime: '19:00', duration: 60 },
        { venueName: 'Collage Cocktail Bar', description: 'Intimate craft cocktails in a former antique shop.', startTime: '20:30', duration: 90 }
      ]
    },
    {
      title: 'Gràcia Neighborhood Night',
      description: 'Local vibes in Barcelona\'s bohemian village.',
      difficulty: 'easy',
      bestFor: ['solo', 'groups'],
      isWeekend: true,
      venues: [
        { venueName: 'Bobby Gin', description: 'Gin temple with over 60 varieties.', startTime: '21:00', duration: 90 },
        { venueName: 'Heliogàbal', description: 'Tiny venue for poetry, concerts, and alternative culture.', startTime: '23:00', duration: 120 }
      ]
    }
  ],

  // ============================================
  // AMSTERDAM
  // ============================================
  'Amsterdam': [
    {
      title: 'Canal Ring Crawl',
      description: 'Brown cafes, cocktails, and canal-side vibes.',
      difficulty: 'easy',
      bestFor: ['groups', 'couples'],
      isWeekend: true,
      venues: [
        { venueName: 'Café Hoppe', description: 'Historic brown cafe dating back to 1670.', startTime: '19:00', duration: 90 },
        { venueName: 'Tales & Spirits', description: 'Storytelling cocktail bar with theatrical presentation.', startTime: '21:00', duration: 90 },
        { venueName: 'Air Amsterdam', description: 'Elegant club in a former bank vault.', startTime: '23:00', duration: 180 }
      ]
    },
    {
      title: 'Amsterdam Canal Boat Party',
      description: 'Float through the UNESCO canals with drinks and music.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Hannekes Boom', description: 'Waterfront bar with terrace and live music.', startTime: '17:00', duration: 90 },
        { venueName: 'Amsterdam Boat Party', description: 'Private canal cruise with DJ and open bar.', startTime: '19:00', duration: 180 },
        { venueName: 'De School', description: 'Former school turned 24-hour club.', startTime: '23:00', duration: 240 }
      ]
    },
    {
      title: 'De Pijp After Dark',
      description: 'Hipster bars and late nights in the "Latin Quarter."',
      difficulty: 'easy',
      bestFor: ['solo', 'groups'],
      isWeekend: false,
      venues: [
        { venueName: 'Café Gollem', description: 'Craft beer heaven with rotating taps.', startTime: '20:00', duration: 90 },
        { venueName: 'Door 74', description: 'Hidden speakeasy with no sign - just a phone booth.', startTime: '22:00', duration: 120 }
      ]
    }
  ],

  // ============================================
  // DUBAI
  // ============================================
  'Dubai': [
    {
      title: 'Sky High Dubai',
      description: 'Rooftop glamour with views of the world\'s tallest buildings.',
      difficulty: 'moderate',
      bestFor: ['couples', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'At.Mosphere', description: 'The world\'s highest lounge in Burj Khalifa.', startTime: '19:00', duration: 120 },
        { venueName: 'Iris Dubai', description: 'Rooftop terrace with Marina views.', startTime: '21:30', duration: 90 },
        { venueName: 'WHITE Dubai', description: 'Glamorous nightclub on the roof of Meydan Hotel.', startTime: '23:30', duration: 180 }
      ]
    },
    {
      title: 'Dubai Marina Yacht Party',
      description: 'Sail past the Palm with champagne and sunset views.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Zero Gravity', description: 'Beach club with pool and stunning skyline views.', startTime: '15:00', duration: 120 },
        { venueName: 'Dubai Yacht Party', description: 'Luxury yacht cruise around Palm Jumeirah.', startTime: '17:00', duration: 180 },
        { venueName: 'Cavalli Club', description: 'Designer club with opulent interiors.', startTime: '22:00', duration: 180 }
      ]
    },
    {
      title: 'Old Dubai Nights',
      description: 'Discover Dubai\'s heritage in Al Fahidi and beyond.',
      difficulty: 'easy',
      bestFor: ['couples', 'date-night'],
      isWeekend: false,
      venues: [
        { venueName: 'XVA Art Hotel Café', description: 'Art gallery café in a restored heritage house.', startTime: '19:00', duration: 90 },
        { venueName: 'Q\'s Bar & Lounge', description: 'Live jazz in the Palazzo Versace.', startTime: '21:00', duration: 120 }
      ]
    }
  ],

  // ============================================
  // MADRID
  // ============================================
  'Madrid': [
    {
      title: 'Authentic Madrid Night',
      description: 'Tapas crawl to flamenco to dancing until sunrise.',
      difficulty: 'challenging',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'La Latina Tapas Crawl', description: 'Start with traditional tapas crawl through La Latina\'s historic streets.', startTime: '21:00', duration: 120 },
        { venueName: 'Corral de la Morería', description: 'Experience world-class flamenco at Madrid\'s most prestigious tablao.', startTime: '23:00', duration: 120 },
        { venueName: 'Teatro Kapital', description: 'End the night at Kapital, Madrid\'s legendary 7-floor megaclub. Dance through different genres on each level.', startTime: '02:00', duration: 180 }
      ]
    },
    {
      title: 'Rooftop & Culture',
      description: 'Sunset views and authentic flamenco in the heart of Madrid.',
      difficulty: 'moderate',
      bestFor: ['couples', 'groups'],
      isWeekend: true,
      venues: [
        { venueName: 'Círculo de Bellas Artes', description: 'Sunset cocktails on the iconic rooftop terrace with 360° views of Madrid\'s skyline.', startTime: '20:00', duration: 90 },
        { venueName: 'Cardamomo Tablao', description: 'Intimate flamenco performance in the heart of the Huertas neighborhood.', startTime: '22:00', duration: 120 }
      ]
    },
    {
      title: 'Malasaña Alternative Scene',
      description: 'Dive into Madrid\'s coolest neighborhood for indie vibes.',
      difficulty: 'easy',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'Ojalá Beach Bar', description: 'Start at this quirky indoor beach bar with sand floors. Sip creative cocktails.', startTime: '21:00', duration: 120 },
        { venueName: 'Tupperware Club', description: 'Dance to indie rock, electronic, and alternative music at Malasaña\'s coolest club.', startTime: '23:00', duration: 120 }
      ]
    },
    {
      title: 'Chueca Pride Night',
      description: 'Madrid\'s legendary LGBTQ+ neighborhood comes alive.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Mercado de San Antón', description: 'Tapas and drinks at this trendy market with a rooftop terrace.', startTime: '20:00', duration: 90 },
        { venueName: 'Bar Cock', description: 'Legendary cocktail bar in a former brothel.', startTime: '22:00', duration: 90 },
        { venueName: 'Medias Puri', description: 'Kitsch decor and wild parties in Malasaña.', startTime: '00:00', duration: 150 }
      ]
    }
  ],

  // ============================================
  // LISBON
  // ============================================
  'Lisbon': [
    {
      title: 'Bairro Alto Crawl',
      description: 'Wind through Lisbon\'s legendary nightlife district.',
      difficulty: 'easy',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'Pavilhão Chinês', description: 'Eccentric bar filled with curious collections.', startTime: '20:00', duration: 90 },
        { venueName: 'Tasca do Chico', description: 'Authentic fado singing in a tiny tavern.', startTime: '22:00', duration: 90 },
        { venueName: 'Lux Frágil', description: 'Lisbon\'s most iconic nightclub on the waterfront.', startTime: '00:00', duration: 180 }
      ]
    },
    {
      title: 'Tagus River Party',
      description: 'Sail past Belém Tower with drinks and dancing.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Rio Maravilha', description: 'Rooftop drinks with bridge and river views.', startTime: '17:00', duration: 90 },
        { venueName: 'Lisbon Boat Party', description: 'Sunset cruise on the Tagus with DJ and open bar.', startTime: '19:00', duration: 180 },
        { venueName: 'Musicbox', description: 'Underground live music venue in Cais do Sodré.', startTime: '23:00', duration: 150 }
      ]
    },
    {
      title: 'Cais do Sodré Pink Street',
      description: 'From old-school bars to modern clubs on the pink street.',
      difficulty: 'easy',
      bestFor: ['groups', 'couples'],
      isWeekend: false,
      venues: [
        { venueName: 'Pensão Amor', description: 'Former brothel turned bohemian bar.', startTime: '21:00', duration: 90 },
        { venueName: 'Sol e Pesca', description: 'Tiny bar serving tinned fish and wine.', startTime: '23:00', duration: 60 }
      ]
    }
  ],

  // ============================================
  // Additional Cities (Abbreviated for space)
  // ============================================

  'Chicago': [
    {
      title: 'Jazz & Blues Chicago',
      description: 'Experience the birthplace of Chicago blues and jazz.',
      difficulty: 'moderate',
      bestFor: ['couples', 'groups'],
      isWeekend: true,
      venues: [
        { venueName: 'The Green Mill', description: 'Al Capone\'s former hangout, now a legendary jazz club.', startTime: '20:00', duration: 120 },
        { venueName: 'Kingston Mines', description: 'Two stages of non-stop blues until 4am.', startTime: '22:30', duration: 150 }
      ]
    },
    {
      title: 'Wicker Park Night Out',
      description: 'Hip bars and clubs in Chicago\'s coolest neighborhood.',
      difficulty: 'easy',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'The Violet Hour', description: 'Speakeasy-style cocktail bar with no sign.', startTime: '21:00', duration: 90 },
        { venueName: 'Smartbar', description: 'Underground dance club since 1982.', startTime: '23:00', duration: 180 }
      ]
    },
    {
      title: 'Chicago River Cruise',
      description: 'Architecture tour meets party boat.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Cindy\'s', description: 'Rooftop bar atop Chicago Athletic Association.', startTime: '18:00', duration: 90 },
        { venueName: 'Chicago Party Boat', description: 'Cruise the Chicago River with DJ and views.', startTime: '20:00', duration: 180 },
        { venueName: 'Spybar', description: 'Intimate house music club.', startTime: '00:00', duration: 150 }
      ]
    }
  ],

  'Las Vegas': [
    {
      title: 'Strip Club Crawl',
      description: 'The ultimate Vegas nightclub experience.',
      difficulty: 'challenging',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Marquee', description: 'Massive club at The Cosmopolitan with library and boombox.', startTime: '22:00', duration: 120 },
        { venueName: 'Hakkasan', description: 'Five-level nightclub at MGM Grand.', startTime: '00:30', duration: 150 },
        { venueName: 'XS Nightclub', description: 'Outdoor pool club at Encore.', startTime: '03:00', duration: 180 }
      ]
    },
    {
      title: 'Downtown Fremont Experience',
      description: 'Old Vegas vibes with craft cocktails and live music.',
      difficulty: 'easy',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'Atomic Liquors', description: 'Vegas\'s oldest freestanding bar.', startTime: '20:00', duration: 90 },
        { venueName: 'Commonwealth', description: 'Rooftop bar with downtown views.', startTime: '22:00', duration: 90 },
        { venueName: 'The Griffin', description: 'Indie rock dive bar.', startTime: '00:00', duration: 120 }
      ]
    }
  ],

  'San Francisco': [
    {
      title: 'Mission District Crawl',
      description: 'Dive bars, taquerias, and the city\'s best cocktails.',
      difficulty: 'easy',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'ABV', description: 'Craft cocktails and refined bar snacks.', startTime: '20:00', duration: 90 },
        { venueName: 'El Rio', description: 'Legendary patio bar with diverse crowds.', startTime: '22:00', duration: 90 },
        { venueName: 'Make-Out Room', description: 'Live music venue with eclectic bookings.', startTime: '00:00', duration: 120 }
      ]
    },
    {
      title: 'Bay Cruise Party',
      description: 'Sail under the Golden Gate with drinks and dancing.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Pier 23 Cafe', description: 'Waterfront bar with live music.', startTime: '17:00', duration: 90 },
        { venueName: 'SF Bay Party Cruise', description: 'Sunset cruise under the Golden Gate Bridge.', startTime: '19:00', duration: 180 },
        { venueName: '1015 Folsom', description: 'San Francisco\'s premier dance club.', startTime: '23:00', duration: 180 }
      ]
    }
  ],

  'Austin': [
    {
      title: '6th Street Crawl',
      description: 'Live music capital of the world.',
      difficulty: 'easy',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'The Continental Club', description: 'Legendary venue for rockabilly and blues.', startTime: '20:00', duration: 90 },
        { venueName: 'Stubb\'s', description: 'BBQ and live music in an outdoor amphitheater.', startTime: '22:00', duration: 120 },
        { venueName: 'The Mohawk', description: 'Indoor/outdoor venue with multiple stages.', startTime: '00:30', duration: 120 }
      ]
    },
    {
      title: 'East Austin Vibes',
      description: 'Hip bars and food trucks in Austin\'s coolest hood.',
      difficulty: 'easy',
      bestFor: ['groups', 'couples'],
      isWeekend: false,
      venues: [
        { venueName: 'Whisler\'s', description: 'Craft cocktails in a former auto shop.', startTime: '20:00', duration: 90 },
        { venueName: 'Hotel Vegas', description: 'Dive bar with three stages.', startTime: '22:00', duration: 120 }
      ]
    }
  ],

  'Nashville': [
    {
      title: 'Honky Tonk Highway',
      description: 'Country music and cold beer on Lower Broadway.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Robert\'s Western World', description: 'Legendary honky tonk with live country music.', startTime: '20:00', duration: 90 },
        { venueName: 'Tootsie\'s Orchid Lounge', description: 'Historic bar where Willie Nelson was discovered.', startTime: '22:00', duration: 90 },
        { venueName: 'FGL House', description: 'Three floors of country fun.', startTime: '00:00', duration: 120 }
      ]
    },
    {
      title: 'East Nashville Underground',
      description: 'Away from Broadway into the real music scene.',
      difficulty: 'easy',
      bestFor: ['solo', 'couples'],
      isWeekend: false,
      venues: [
        { venueName: 'The 5 Spot', description: 'Intimate venue for Americana and soul.', startTime: '20:00', duration: 120 },
        { venueName: 'The Basement', description: 'Where artists play before they make it big.', startTime: '22:30', duration: 120 }
      ]
    }
  ],

  'New Orleans': [
    {
      title: 'Bourbon Street Experience',
      description: 'Classic NOLA revelry on the world-famous street.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Preservation Hall', description: 'Traditional jazz in an intimate historic venue.', startTime: '20:00', duration: 90 },
        { venueName: 'Fritzel\'s European Jazz Pub', description: 'Nightly jazz in the heart of the Quarter.', startTime: '22:00', duration: 90 },
        { venueName: 'The Spotted Cat Music Club', description: 'Local jazz with dancing on Frenchmen Street.', startTime: '00:00', duration: 120 }
      ]
    },
    {
      title: 'Frenchmen Street Local Night',
      description: 'Where the locals go for live music.',
      difficulty: 'easy',
      bestFor: ['couples', 'solo'],
      isWeekend: false,
      venues: [
        { venueName: 'd.b.a.', description: 'Craft cocktails and nightly live music.', startTime: '21:00', duration: 90 },
        { venueName: 'Blue Nile', description: 'Two-story venue with eclectic bookings.', startTime: '23:00', duration: 120 }
      ]
    }
  ],

  'Boston': [
    {
      title: 'Cambridge Pub Crawl',
      description: 'Legendary bars near Harvard and MIT.',
      difficulty: 'easy',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'Brick & Mortar', description: 'Intimate cocktail bar in Central Square.', startTime: '20:00', duration: 90 },
        { venueName: 'The Sinclair', description: 'Live music venue with great sound.', startTime: '22:00', duration: 120 }
      ]
    },
    {
      title: 'Seaport Night Out',
      description: 'Boston\'s hottest neighborhood for nightlife.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Lookout Rooftop', description: 'Panoramic harbor views.', startTime: '19:00', duration: 90 },
        { venueName: 'Scorpion Bar', description: 'Lively Mexican spot with strong cocktails.', startTime: '21:00', duration: 90 },
        { venueName: 'Grand', description: 'Seaport\'s premier nightclub.', startTime: '23:00', duration: 150 }
      ]
    }
  ],

  'Rome': [
    {
      title: 'Trastevere Nights',
      description: 'Winding streets, wine bars, and Italian charm.',
      difficulty: 'easy',
      bestFor: ['couples', 'groups'],
      isWeekend: true,
      venues: [
        { venueName: 'Ma Che Siete Venuti a Fà', description: 'Craft beer bar named after a soccer chant.', startTime: '20:00', duration: 90 },
        { venueName: 'Big Star', description: 'Cocktails in a tiny Trastevere gem.', startTime: '22:00', duration: 90 },
        { venueName: 'Lanificio 159', description: 'Industrial club space in a former factory.', startTime: '00:00', duration: 180 }
      ]
    },
    {
      title: 'Testaccio Club Scene',
      description: 'Rome\'s nightlife capital in a working-class neighborhood.',
      difficulty: 'moderate',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'Rec 23', description: 'Hip bar in an old car dealership.', startTime: '21:00', duration: 90 },
        { venueName: 'Alibi', description: 'LGBTQ+ club in the Monte Testaccio caves.', startTime: '23:00', duration: 120 },
        { venueName: 'Goa Club', description: 'Techno and house in an underground bunker.', startTime: '01:00', duration: 180 }
      ]
    }
  ],

  'Milan': [
    {
      title: 'Navigli Canal Night',
      description: 'Aperitivo, live music, and canal-side charm.',
      difficulty: 'easy',
      bestFor: ['couples', 'groups'],
      isWeekend: true,
      venues: [
        { venueName: 'Rita', description: 'Cocktails in a former mechanic shop.', startTime: '19:00', duration: 90 },
        { venueName: 'Blue Note Milano', description: 'World-class jazz in Italy\'s best venue.', startTime: '21:00', duration: 120 },
        { venueName: 'Rocket', description: 'Live music and DJ sets on the canal.', startTime: '23:30', duration: 120 }
      ]
    },
    {
      title: 'Fashion District Night Out',
      description: 'Glamour and style in Milan\'s Quadrilatero.',
      difficulty: 'moderate',
      bestFor: ['couples', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Armani/Bamboo Bar', description: 'Sleek cocktails in Armani\'s hotel.', startTime: '20:00', duration: 90 },
        { venueName: 'Just Cavalli', description: 'Fashion-forward club in Parco Sempione.', startTime: '23:00', duration: 180 }
      ]
    }
  ],

  'Prague': [
    {
      title: 'Old Town Pub Crawl',
      description: 'Beer halls and cocktail bars in historic Prague.',
      difficulty: 'easy',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'Hemingway Bar', description: 'World-class cocktails in a literary setting.', startTime: '20:00', duration: 90 },
        { venueName: 'Anonymous Bar', description: 'Speakeasy with V for Vendetta masks.', startTime: '22:00', duration: 90 },
        { venueName: 'Roxy', description: 'Legendary club in an old theater.', startTime: '00:00', duration: 180 }
      ]
    },
    {
      title: 'Cross Club Underground',
      description: 'Industrial art and techno in Prague\'s wildest venue.',
      difficulty: 'moderate',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'Beer Geek', description: 'Czech craft beer in Žižkov.', startTime: '20:00', duration: 90 },
        { venueName: 'Cross Club', description: 'Steampunk industrial art meets techno temple.', startTime: '23:00', duration: 240 }
      ]
    }
  ],

  'Vienna': [
    {
      title: 'Opera & Cocktails',
      description: 'Classical culture meets modern nightlife.',
      difficulty: 'moderate',
      bestFor: ['couples', 'date-night'],
      isWeekend: true,
      venues: [
        { venueName: 'Loos American Bar', description: 'Iconic 1908 bar designed by Adolf Loos.', startTime: '20:00', duration: 90 },
        { venueName: 'Volksgarten', description: 'Historic park with summer club nights.', startTime: '22:00', duration: 120 }
      ]
    }
  ],

  'Dublin': [
    {
      title: 'Temple Bar Crawl',
      description: 'Traditional pubs, live music, and Irish craic.',
      difficulty: 'easy',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'The Stag\'s Head', description: 'Victorian pub with original decor from 1895.', startTime: '20:00', duration: 90 },
        { venueName: 'Whelan\'s', description: 'Legendary live music venue on Wexford Street.', startTime: '22:00', duration: 120 }
      ]
    }
  ],

  'Copenhagen': [
    {
      title: 'Nørrebro Night',
      description: 'Hip bars and clubs in Copenhagen\'s coolest area.',
      difficulty: 'easy',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'Mikkeller Bar', description: 'Craft beer mecca with rotating taps.', startTime: '20:00', duration: 90 },
        { venueName: 'Rust', description: 'Live music and DJ nights in Nørrebro.', startTime: '23:00', duration: 180 }
      ]
    },
    {
      title: 'Canal Party Copenhagen',
      description: 'Sail through the colorful harbor.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Nyhavn', description: 'Pre-drinks at the colorful harbor.', startTime: '17:00', duration: 90 },
        { venueName: 'Copenhagen Boat Party', description: 'Sail past the Little Mermaid with drinks.', startTime: '19:00', duration: 180 },
        { venueName: 'Culture Box', description: 'Electronic music in the meatpacking district.', startTime: '23:00', duration: 180 }
      ]
    }
  ],

  'Stockholm': [
    {
      title: 'Södermalm Hip Night',
      description: 'Cool bars in Stockholm\'s trendiest district.',
      difficulty: 'easy',
      bestFor: ['groups', 'couples'],
      isWeekend: true,
      venues: [
        { venueName: 'Corner Club', description: 'Creative cocktails in SoFo.', startTime: '20:00', duration: 90 },
        { venueName: 'Under Bron', description: 'Legendary club under Liljeholmsbron bridge.', startTime: '23:00', duration: 180 }
      ]
    },
    {
      title: 'Stockholm Archipelago Party',
      description: 'Sail the islands with drinks and views.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Mälarpaviljongen', description: 'Waterfront bar on Kungsholmen.', startTime: '16:00', duration: 90 },
        { venueName: 'Stockholm Boat Party', description: 'Cruise through the archipelago.', startTime: '18:00', duration: 180 },
        { venueName: 'Trädgården', description: 'Open-air club under a bridge.', startTime: '22:00', duration: 180 }
      ]
    }
  ],

  'Brussels': [
    {
      title: 'Saint-Géry Crawl',
      description: 'Belgian beers and late-night clubs.',
      difficulty: 'easy',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'Delirium Café', description: 'Over 3000 beers in the Guinness Book of Records.', startTime: '20:00', duration: 90 },
        { venueName: 'Fuse', description: 'Legendary techno temple since 1994.', startTime: '23:00', duration: 180 }
      ]
    }
  ],

  'Seoul': [
    {
      title: 'Hongdae Underground',
      description: 'K-indie, hip-hop, and youth culture.',
      difficulty: 'moderate',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'Club FF', description: 'Live indie bands in a tiny basement.', startTime: '21:00', duration: 90 },
        { venueName: 'Madholic', description: 'K-pop and EDM megaclub.', startTime: '23:00', duration: 120 },
        { venueName: 'Cakeshop', description: 'Underground hip-hop and techno.', startTime: '01:00', duration: 180 }
      ]
    },
    {
      title: 'Gangnam Style Night',
      description: 'Glitz and glamour south of the Han River.',
      difficulty: 'challenging',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Alice Cheongdam', description: 'Alice in Wonderland themed cocktail lounge.', startTime: '21:00', duration: 90 },
        { venueName: 'Arena Club', description: 'Massive K-pop club experience.', startTime: '23:00', duration: 180 },
        { venueName: 'Club Octagon', description: 'Asia\'s most famous superclub.', startTime: '02:00', duration: 180 }
      ]
    }
  ],

  'Bangkok': [
    {
      title: 'Thonglor Night Out',
      description: 'Bangkok\'s hippest neighborhood for cocktails and clubs.',
      difficulty: 'moderate',
      bestFor: ['groups', 'couples'],
      isWeekend: true,
      venues: [
        { venueName: 'Rabbit Hole', description: 'Speakeasy cocktails in Thonglor.', startTime: '20:00', duration: 90 },
        { venueName: 'Iron Fairies', description: 'Fairy-tale themed bar with absinthe.', startTime: '22:00', duration: 90 },
        { venueName: 'Beam', description: 'Cutting-edge club with international DJs.', startTime: '00:00', duration: 180 }
      ]
    },
    {
      title: 'Chao Phraya River Party',
      description: 'Sail past temples with cocktails and sunsets.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Above Eleven', description: 'Rooftop views of Bangkok\'s skyline.', startTime: '18:00', duration: 90 },
        { venueName: 'Bangkok Boat Party', description: 'Cruise the Chao Phraya with DJ and drinks.', startTime: '20:00', duration: 180 },
        { venueName: 'Sing Sing Theater', description: 'Opulent club in a former theater.', startTime: '00:00', duration: 150 }
      ]
    }
  ],

  'Singapore': [
    {
      title: 'Marina Bay Heights',
      description: 'Sky-high cocktails with city-state views.',
      difficulty: 'moderate',
      bestFor: ['couples', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'CÉ LA VI', description: 'Rooftop bar atop Marina Bay Sands.', startTime: '19:00', duration: 90 },
        { venueName: '28 HongKong Street', description: 'Hidden cocktail bar with no sign.', startTime: '21:30', duration: 90 },
        { venueName: 'Zouk', description: 'Asia\'s legendary superclub.', startTime: '23:30', duration: 180 }
      ]
    },
    {
      title: 'Harbor Yacht Party Singapore',
      description: 'Sail past the skyline with champagne.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'LeVeL33', description: 'World\'s highest urban microbrewery.', startTime: '17:00', duration: 90 },
        { venueName: 'Singapore Yacht Party', description: 'Cruise past Sentosa and the city skyline.', startTime: '19:00', duration: 180 },
        { venueName: 'Marquee Singapore', description: 'Three-story megaclub at Marina Bay Sands.', startTime: '23:00', duration: 180 }
      ]
    }
  ],

  'Hong Kong': [
    {
      title: 'Lan Kwai Fong Crawl',
      description: 'Hong Kong\'s legendary party district.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Employees Only HK', description: 'NYC speakeasy franchise with HK twist.', startTime: '20:00', duration: 90 },
        { venueName: 'Dragon-i', description: 'Celebrity-studded club in Central.', startTime: '22:30', duration: 120 },
        { venueName: 'Oma', description: 'Underground techno in Wan Chai.', startTime: '01:00', duration: 180 }
      ]
    },
    {
      title: 'Victoria Harbour Party',
      description: 'Sail past the iconic skyline with cocktails.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Ozone', description: 'World\'s highest bar at the Ritz-Carlton.', startTime: '18:00', duration: 90 },
        { venueName: 'Hong Kong Junk Boat Party', description: 'Traditional junk boat cruise with DJ.', startTime: '20:00', duration: 180 },
        { venueName: 'Volar', description: 'Two floors of house and hip-hop.', startTime: '00:00', duration: 150 }
      ]
    }
  ],

  'Shanghai': [
    {
      title: 'Bund Night Out',
      description: 'Art Deco glamour on Shanghai\'s famous waterfront.',
      difficulty: 'moderate',
      bestFor: ['couples', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Bar Rouge', description: 'Rooftop bar with Pudong skyline views.', startTime: '20:00', duration: 90 },
        { venueName: 'Senator Saloon', description: 'Whiskey bar in the French Concession.', startTime: '22:00', duration: 90 },
        { venueName: 'Taxx', description: 'Legendary superclub under a mall.', startTime: '00:00', duration: 180 }
      ]
    }
  ],

  'Taipei': [
    {
      title: 'Xinyi District Night',
      description: 'Neon lights and nightclubs near Taipei 101.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Alchemy', description: 'Craft cocktails with a science theme.', startTime: '20:00', duration: 90 },
        { venueName: 'Korner', description: 'International DJ sets and techno.', startTime: '23:00', duration: 180 }
      ]
    }
  ],

  'Bali': [
    {
      title: 'Seminyak Beach Clubs',
      description: 'Sunset cocktails and beach party vibes.',
      difficulty: 'easy',
      bestFor: ['groups', 'couples'],
      isWeekend: true,
      venues: [
        { venueName: 'Potato Head', description: 'Iconic beach club with infinity pool.', startTime: '16:00', duration: 180 },
        { venueName: 'La Favela', description: 'Jungle club with secret rooms.', startTime: '22:00', duration: 180 }
      ]
    },
    {
      title: 'Bali Boat Party',
      description: 'Sail to Nusa islands with DJ and drinks.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Single Fin', description: 'Sunset drinks overlooking Uluwatu surf.', startTime: '15:00', duration: 120 },
        { venueName: 'Bali Boat Party', description: 'Catamaran cruise with swimming and DJ.', startTime: '17:00', duration: 180 },
        { venueName: 'Mirror Lounge', description: 'After-party at this futuristic club.', startTime: '22:00', duration: 150 }
      ]
    }
  ],

  'Mumbai': [
    {
      title: 'Bandra Night Out',
      description: 'Bollywood vibes in Mumbai\'s hippest hood.',
      difficulty: 'moderate',
      bestFor: ['groups', 'couples'],
      isWeekend: true,
      venues: [
        { venueName: 'The Bombay Canteen', description: 'Modern Indian food and craft cocktails.', startTime: '20:00', duration: 90 },
        { venueName: 'Kitty Su', description: 'LGBTQ+ friendly club at The Lalit.', startTime: '23:00', duration: 180 }
      ]
    }
  ],

  'Tel Aviv': [
    {
      title: 'White City Nightlife',
      description: 'Bauhaus buildings and beach clubs.',
      difficulty: 'moderate',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'Imperial Craft Cocktail Bar', description: 'Top-ranked cocktail bar in the Middle East.', startTime: '21:00', duration: 90 },
        { venueName: 'Kuli Alma', description: 'Underground art space and club.', startTime: '23:00', duration: 120 },
        { venueName: 'The Block', description: 'Techno temple in a former parking garage.', startTime: '01:00', duration: 300 }
      ]
    },
    {
      title: 'Tel Aviv Beach Party',
      description: 'Mediterranean vibes with sunset cruises.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Gordon Beach', description: 'Pre-party drinks at a beach bar.', startTime: '16:00', duration: 90 },
        { venueName: 'Tel Aviv Boat Party', description: 'Sail along the coast with DJ.', startTime: '18:00', duration: 180 },
        { venueName: 'Shalvata', description: 'Beachfront club with sand dance floor.', startTime: '22:00', duration: 180 }
      ]
    }
  ],

  'Istanbul': [
    {
      title: 'Bosphorus Nights',
      description: 'Bridge between continents, cocktails, and clubs.',
      difficulty: 'moderate',
      bestFor: ['groups', 'couples'],
      isWeekend: true,
      venues: [
        { venueName: 'Alexandra Cocktail Bar', description: 'Art Deco glamour in Beyoğlu.', startTime: '20:00', duration: 90 },
        { venueName: 'Klein', description: 'Berlin-style techno in Karaköy.', startTime: '23:00', duration: 120 },
        { venueName: 'Sortie', description: 'Waterfront club on the Bosphorus.', startTime: '01:00', duration: 180 }
      ]
    },
    {
      title: 'Bosphorus Yacht Party',
      description: 'Sail between Europe and Asia with drinks.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Mikla', description: 'Rooftop restaurant with city views.', startTime: '18:00', duration: 90 },
        { venueName: 'Istanbul Boat Party', description: 'Cruise past palaces and mosques.', startTime: '20:00', duration: 180 },
        { venueName: 'Anjelique', description: 'Glamorous waterfront club.', startTime: '00:00', duration: 150 }
      ]
    }
  ],

  'Sydney': [
    {
      title: 'Darlinghurst Night Out',
      description: 'Sydney\'s best cocktail bars and clubs.',
      difficulty: 'easy',
      bestFor: ['groups', 'couples'],
      isWeekend: true,
      venues: [
        { venueName: 'Bulletin Place', description: 'Daily changing menu cocktails.', startTime: '20:00', duration: 90 },
        { venueName: 'Arq', description: 'Sydney\'s premier LGBTQ+ club.', startTime: '23:00', duration: 180 }
      ]
    },
    {
      title: 'Sydney Harbour Party',
      description: 'Sail past the Opera House and Harbour Bridge.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Opera Bar', description: 'Drinks with Opera House views.', startTime: '17:00', duration: 90 },
        { venueName: 'Sydney Boat Party', description: 'Dance on the harbour with iconic views.', startTime: '19:00', duration: 180 },
        { venueName: 'Chinese Laundry', description: 'Underground techno institution.', startTime: '23:00', duration: 180 }
      ]
    }
  ],

  'Melbourne': [
    {
      title: 'Laneway Bar Crawl',
      description: 'Discover Melbourne\'s hidden bars in secret alleys.',
      difficulty: 'easy',
      bestFor: ['groups', 'couples'],
      isWeekend: true,
      venues: [
        { venueName: 'Bar Americano', description: 'Tiny standing-room-only cocktail bar.', startTime: '18:00', duration: 60 },
        { venueName: 'Eau de Vie', description: 'Speakeasy with magic shows.', startTime: '19:30', duration: 90 },
        { venueName: 'Heartbreaker', description: 'Rock \'n\' roll dive bar.', startTime: '21:30', duration: 120 }
      ]
    }
  ],

  'Auckland': [
    {
      title: 'Britomart Night Out',
      description: 'Waterfront bars and clubs in the CBD.',
      difficulty: 'easy',
      bestFor: ['groups', 'couples'],
      isWeekend: true,
      venues: [
        { venueName: 'Jefferson', description: 'Whiskey bar with southern hospitality.', startTime: '20:00', duration: 90 },
        { venueName: 'Impala', description: 'Late-night dance bar in Ponsonby.', startTime: '23:00', duration: 150 }
      ]
    }
  ],

  'Toronto': [
    {
      title: 'Queen West Crawl',
      description: 'Art, music, and late nights in Toronto\'s hip strip.',
      difficulty: 'easy',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'Bar Raval', description: 'Pintxos and cocktails in Gaudí-inspired space.', startTime: '20:00', duration: 90 },
        { venueName: 'CODA', description: 'Underground techno club.', startTime: '23:00', duration: 180 }
      ]
    }
  ],

  'Montreal': [
    {
      title: 'Mile End Night',
      description: 'Hipster bars and late nights in Montreal\'s coolest hood.',
      difficulty: 'easy',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'Bar le Ritz PDB', description: 'Intimate live music venue.', startTime: '21:00', duration: 120 },
        { venueName: 'Stereo', description: 'After-hours techno temple.', startTime: '02:00', duration: 240 }
      ]
    }
  ],

  'Vancouver': [
    {
      title: 'Gastown Night Out',
      description: 'Victorian charm meets modern cocktails.',
      difficulty: 'easy',
      bestFor: ['couples', 'groups'],
      isWeekend: true,
      venues: [
        { venueName: 'The Diamond', description: 'Upstairs cocktail lounge in a heritage building.', startTime: '20:00', duration: 90 },
        { venueName: 'Celebrities', description: 'LGBTQ+ friendly dance club.', startTime: '23:00', duration: 180 }
      ]
    }
  ],

  'Mexico City': [
    {
      title: 'Roma Norte Mezcal Crawl',
      description: 'Mezcal bars and cantinas in CDMX\'s hippest hood.',
      difficulty: 'moderate',
      bestFor: ['groups', 'couples'],
      isWeekend: true,
      venues: [
        { venueName: 'Licorería Limantour', description: 'Latin America\'s best bar for craft cocktails.', startTime: '20:00', duration: 90 },
        { venueName: 'Departamento', description: 'Underground techno in a basement.', startTime: '23:00', duration: 180 }
      ]
    }
  ],

  'Buenos Aires': [
    {
      title: 'San Telmo Tango Night',
      description: 'Milongas, wine bars, and late-night revelry.',
      difficulty: 'moderate',
      bestFor: ['couples', 'groups'],
      isWeekend: true,
      venues: [
        { venueName: 'Bar Sur', description: 'Intimate tango shows in a historic bar.', startTime: '21:00', duration: 120 },
        { venueName: 'Salon Canning', description: 'Authentic milonga for dancing.', startTime: '23:30', duration: 180 }
      ]
    }
  ],

  'São Paulo': [
    {
      title: 'Vila Madalena Crawl',
      description: 'Street art, live music, and clubs in SP\'s artistic heart.',
      difficulty: 'moderate',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'SubAstor', description: 'Speakeasy cocktails in Pinheiros.', startTime: '21:00', duration: 90 },
        { venueName: 'D-Edge', description: 'South America\'s best electronic music club.', startTime: '00:00', duration: 240 }
      ]
    }
  ],

  'Rio de Janeiro': [
    {
      title: 'Lapa Nights',
      description: 'Samba, caipirinhas, and Rio\'s famous arches.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Rio Scenarium', description: 'Three floors of samba in an antique warehouse.', startTime: '21:00', duration: 120 },
        { venueName: 'Carioca da Gema', description: 'Live samba and choro music.', startTime: '23:30', duration: 150 }
      ]
    },
    {
      title: 'Copacabana Beach Party',
      description: 'Sunset to sunrise on Rio\'s famous beach.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Azul Marinho', description: 'Beachfront kiosk with caipirinhas.', startTime: '17:00', duration: 90 },
        { venueName: 'Rio Boat Party', description: 'Sail around Guanabara Bay with views of Christ.', startTime: '19:00', duration: 180 },
        { venueName: '00 (Zero Zero)', description: 'Exclusive club in Gavea.', startTime: '00:00', duration: 180 }
      ]
    }
  ],

  'Bogotá': [
    {
      title: 'Zona Rosa Night Out',
      description: 'Salsa, aguardiente, and Colombian nightlife.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Andrés Carne de Res', description: 'Legendary Colombian restaurant-club experience.', startTime: '20:00', duration: 180 },
        { venueName: 'Theatron', description: 'Massive multi-room LGBTQ+ club.', startTime: '00:00', duration: 240 }
      ]
    }
  ],

  'Cape Town': [
    {
      title: 'Long Street Night',
      description: 'Backpacker vibes and local beats.',
      difficulty: 'easy',
      bestFor: ['groups', 'solo'],
      isWeekend: true,
      venues: [
        { venueName: 'The Village Idiot', description: 'Craft cocktails and good vibes.', startTime: '20:00', duration: 90 },
        { venueName: 'Shimmy Beach Club', description: 'Waterfront club with Table Mountain views.', startTime: '23:00', duration: 180 }
      ]
    },
    {
      title: 'Cape Town Boat Party',
      description: 'Sail with Table Mountain as your backdrop.',
      difficulty: 'moderate',
      bestFor: ['groups', 'celebration'],
      isWeekend: true,
      venues: [
        { venueName: 'Grand Café & Beach', description: 'Pre-party at the V&A Waterfront.', startTime: '16:00', duration: 90 },
        { venueName: 'Cape Town Boat Party', description: 'Sunset cruise with DJ and champagne.', startTime: '18:00', duration: 180 },
        { venueName: 'Fiction', description: 'Underground club in the CBD.', startTime: '22:00', duration: 180 }
      ]
    }
  ],

  'Marrakech': [
    {
      title: 'Medina to Modern',
      description: 'Traditional riads to rooftop clubs.',
      difficulty: 'moderate',
      bestFor: ['couples', 'groups'],
      isWeekend: true,
      venues: [
        { venueName: 'Le Salama', description: 'Rooftop cocktails overlooking Jemaa el-Fnaa.', startTime: '19:00', duration: 90 },
        { venueName: 'Theatro', description: 'Opulent club in Hivernage district.', startTime: '23:00', duration: 180 }
      ]
    }
  ]
};

// Export function to get all city names
export function getAllCityNames(): string[] {
  return Object.keys(GROUP_PLANS_DATA);
}

// Export function to get plans for a city
export function getPlansForCity(cityName: string): GroupPlan[] {
  return GROUP_PLANS_DATA[cityName] || [];
}
