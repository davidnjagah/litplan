#!/bin/bash

# Insert Unique Group Plans via REST API
# This script inserts high-quality curated group plans into Supabase

SUPABASE_URL="https://clktdigankjszupvrsqt.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsa3RkaWdhbmtqc3p1cHZyc3F0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzAxNjQzNywiZXhwIjoyMDgyNTkyNDM3fQ.MpZ0c4A1M58ih0Tdij7zcnzyoziI1plDwFwzN-FVCKs"

echo "🚀 Starting Group Plans Insertion"
echo "=================================="

# 1. Delete all existing GroupFlowSteps
echo ""
echo "🗑️ Clearing existing GroupFlowSteps..."
curl -s -X DELETE "${SUPABASE_URL}/rest/v1/GroupFlowStep?id=neq." \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Prefer: return=minimal"
echo "   ✓ Cleared GroupFlowSteps"

# 2. Delete all existing GroupFlows
echo "🗑️ Clearing existing GroupFlows..."
curl -s -X DELETE "${SUPABASE_URL}/rest/v1/GroupFlow?id=neq." \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Prefer: return=minimal"
echo "   ✓ Cleared GroupFlows"

echo ""
echo "📋 Getting city IDs..."

# Get city IDs (we need to map city names to IDs)
CITIES=$(curl -s "${SUPABASE_URL}/rest/v1/City?select=id,name&order=rank.asc" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

echo "   Found cities"

# Function to get city ID by name
get_city_id() {
  local city_name="$1"
  echo "$CITIES" | python3 -c "import json,sys; cities=json.load(sys.stdin); print(next((c['id'] for c in cities if c['name']=='$city_name'), ''))"
}

# Function to insert a group flow and its steps
insert_group_flow() {
  local city_id="$1"
  local city_name="$2"
  local title="$3"
  local description="$4"
  local difficulty="$5"
  local is_weekend="$6"
  local pro_only="$7"
  local rank="$8"
  shift 8
  local venues=("$@")

  # Generate unique flow ID
  local flow_id="gf$(date +%s)${RANDOM}"

  # Insert GroupFlow
  local flow_response=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/GroupFlow" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "{
      \"id\": \"${flow_id}\",
      \"flowId\": \"${flow_id}\",
      \"cityId\": \"${city_id}\",
      \"title\": \"${title}\",
      \"description\": \"${description}\",
      \"difficulty\": \"${difficulty}\",
      \"isWeekend\": ${is_weekend},
      \"proOnly\": ${pro_only},
      \"rank\": ${rank},
      \"currency\": \"USD\"
    }")

  # Insert steps
  local step_num=1
  for venue_data in "${venues[@]}"; do
    IFS='|' read -r venue_name venue_desc start_time duration <<< "$venue_data"
    local step_id="${flow_id}-step-${step_num}"

    curl -s -X POST "${SUPABASE_URL}/rest/v1/GroupFlowStep" \
      -H "apikey: ${SERVICE_KEY}" \
      -H "Authorization: Bearer ${SERVICE_KEY}" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d "{
        \"id\": \"${step_id}\",
        \"flowId\": \"${flow_id}\",
        \"stepNumber\": ${step_num},
        \"title\": \"${venue_name}\",
        \"venueName\": \"${venue_name}\",
        \"description\": \"${venue_desc}\",
        \"duration\": ${duration},
        \"startTime\": \"${start_time}\",
        \"thumbnail\": \"https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&q=80\"
      }"

    ((step_num++))
  done

  echo "   ✓ ${title} (${#venues[@]} stops)"
}

echo ""
echo "📍 Inserting Group Plans..."
echo ""

# ============================================
# NEW YORK
# ============================================
NYC_ID=$(get_city_id "New York")
if [ -n "$NYC_ID" ]; then
  echo "🌆 New York"

  insert_group_flow "$NYC_ID" "New York" \
    "Ultimate NYC Night Out" \
    "Experience the best of Manhattan nightlife from craft beer to jazz to dancing." \
    "moderate" "true" "false" "1" \
    "Brooklyn Brewery|Start your night with craft beers at Brooklyn Brewery. Enjoy the buzzing atmosphere and try their seasonal brews.|20:00|90" \
    "Blue Note Jazz Club|Experience world-class live jazz at Blue Note Jazz Club. An intimate setting with legendary performers.|22:00|120" \
    "Le Bain at The Standard|End the night dancing at Le Bain, a rooftop nightclub with incredible city views.|01:00|90"

  insert_group_flow "$NYC_ID" "New York" \
    "Comedy & Cocktails" \
    "Laugh the night away with world-class cocktails and legendary comedy." \
    "easy" "true" "false" "2" \
    "The Dead Rabbit|Pre-show cocktails at the award-winning Dead Rabbit. Try their famous Irish Coffee.|20:00|90" \
    "Comedy Cellar|Laugh the night away at Comedy Cellar, NYCs legendary comedy club where stars are born.|22:00|120"

  insert_group_flow "$NYC_ID" "New York" \
    "Speakeasy Secret Tour" \
    "Discover NYCs hidden bars and prohibition-era secrets." \
    "moderate" "false" "true" "3" \
    "Please Dont Tell (PDT)|Enter through a phone booth inside Crif Dogs for craft cocktails in a hidden speakeasy.|20:00|90" \
    "Employees Only|Classic cocktails and mind-reading tarot at this West Village institution.|22:00|90" \
    "Attaboy|No menu, just tell the bartender what you like at this Lower East Side gem.|00:00|90"

  insert_group_flow "$NYC_ID" "New York" \
    "Rooftop Hopping" \
    "Take in stunning skyline views from Manhattans best rooftops." \
    "moderate" "true" "true" "4" \
    "230 Fifth|Iconic Empire State views from this massive Flatiron rooftop bar.|19:00|90" \
    "Westlight|Williamsburgs chicest rooftop with panoramic Manhattan views.|21:00|90" \
    "The Roof at PUBLIC|Downtown views with a trendy crowd and craft cocktails.|23:00|120"

  insert_group_flow "$NYC_ID" "New York" \
    "Harbor Yacht Party" \
    "Sail around Manhattan with drinks, dancing, and stunning skyline views." \
    "moderate" "true" "true" "5" \
    "Pier A Harbor House|Pre-party cocktails with waterfront views at Battery Park.|18:00|90" \
    "NYC Boat Party Cruise|Board a yacht for a 3-hour cruise around Manhattan with DJ and open bar.|20:00|180" \
    "Output|Continue the party at Brooklyns premier techno club.|00:00|120"
fi

# ============================================
# LOS ANGELES
# ============================================
LA_ID=$(get_city_id "Los Angeles")
if [ -n "$LA_ID" ]; then
  echo "🌆 Los Angeles"

  insert_group_flow "$LA_ID" "Los Angeles" \
    "West Hollywood Vibes" \
    "Experience the glamour and energy of WeHos legendary nightlife." \
    "easy" "true" "false" "1" \
    "Skybar at Mondrian|Sunset cocktails at the iconic Skybar with stunning city views.|20:00|90" \
    "The Troubadour|Catch a live show at The Troubadour, LAs legendary music venue.|22:00|120"

  insert_group_flow "$LA_ID" "Los Angeles" \
    "Rooftop Sunset Crawl" \
    "Chase the sunset across LAs most stunning rooftop venues." \
    "moderate" "true" "false" "2" \
    "Perch|French-inspired rooftop with downtown LA skyline views.|18:00|90" \
    "EP & LP|Asian fusion and craft cocktails on this West Hollywood rooftop.|20:00|90" \
    "Mama Shelter Rooftop|Hollywood views with a hipster crowd and photo-worthy decor.|22:00|120"

  insert_group_flow "$LA_ID" "Los Angeles" \
    "Venice Beach Day Party" \
    "California dreaming with beach vibes and yacht parties." \
    "moderate" "true" "true" "3" \
    "The Brig|Pre-party drinks at this Abbot Kinney institution with outdoor patio.|14:00|90" \
    "Marina del Rey Yacht Party|Board a yacht for sunset cruising along the coast with DJ and drinks.|16:00|180" \
    "Elia Beach Club|After-party at this poolside day club with Mediterranean vibes.|20:00|120"

  insert_group_flow "$LA_ID" "Los Angeles" \
    "Hollywood Legends Night" \
    "Walk the red carpet at Hollywoods most iconic venues." \
    "intense" "true" "true" "4" \
    "Musso & Frank Grill|Pre-drinks at Hollywoods oldest restaurant where legends dined.|20:00|90" \
    "No Vacancy|Enter through a secret door into this Victorian speakeasy.|22:00|90" \
    "Avalon Hollywood|Dance till dawn at this historic nightclub in a converted theater.|00:00|120"
fi

# ============================================
# MIAMI
# ============================================
MIAMI_ID=$(get_city_id "Miami")
if [ -n "$MIAMI_ID" ]; then
  echo "🌆 Miami"

  insert_group_flow "$MIAMI_ID" "Miami" \
    "South Beach Nightlife" \
    "Experience the legendary glamour of Miamis Ocean Drive." \
    "moderate" "true" "false" "1" \
    "Sugar at EAST|Rooftop cocktails with Brickell skyline views.|20:00|90" \
    "Ball & Chain|Live salsa music and mojitos in Little Havana.|22:00|90" \
    "LIV at Fontainebleau|Dance the night away at Miamis most exclusive megaclub.|00:00|150"

  insert_group_flow "$MIAMI_ID" "Miami" \
    "Biscayne Bay Yacht Party" \
    "Sail the turquoise waters with champagne and stunning Miami views." \
    "moderate" "true" "false" "2" \
    "Nikki Beach|Pre-party brunch with champagne and beach vibes.|13:00|120" \
    "Miami Yacht Party|Board a luxury yacht for a cruise around Star Island and Biscayne Bay.|15:00|180" \
    "E11EVEN|The ultimate after-party at Miamis 24-hour ultraclub.|19:00|180"

  insert_group_flow "$MIAMI_ID" "Miami" \
    "Little Havana Nights" \
    "Authentic Cuban culture with salsa, cigars, and cocktails." \
    "easy" "false" "true" "3" \
    "Cubaocho Museum & Art Gallery|Cuban art and live music in a historic building.|20:00|90" \
    "Hoy Como Ayer|Dance salsa with locals at this authentic Cuban nightclub.|22:00|120"

  insert_group_flow "$MIAMI_ID" "Miami" \
    "Wynwood Art & Cocktails" \
    "Street art, craft cocktails, and Miamis creative scene." \
    "easy" "true" "true" "4" \
    "Gramps|Dive bar vibes with great cocktails and a backyard.|20:00|90" \
    "Shots|Intimate cocktail bar in a converted shipping container.|22:00|90" \
    "Treehouse|Dance under the stars at this open-air techno club.|00:00|120"
fi

# ============================================
# LONDON
# ============================================
LONDON_ID=$(get_city_id "London")
if [ -n "$LONDON_ID" ]; then
  echo "🌆 London"

  insert_group_flow "$LONDON_ID" "London" \
    "Classic West End Night" \
    "Theater, cocktails, and jazz in Londons entertainment heart." \
    "moderate" "true" "false" "1" \
    "The American Bar at The Savoy|Legendary cocktails at one of the worlds most iconic bars.|19:00|90" \
    "Ronnie Scotts Jazz Club|World-class jazz in Soho since 1959.|21:00|120" \
    "Experimental Cocktail Club|Hidden speakeasy in Chinatown with innovative cocktails.|23:30|90"

  insert_group_flow "$LONDON_ID" "London" \
    "Shoreditch Alternative" \
    "East Londons edgy bars, clubs, and creative energy." \
    "moderate" "true" "false" "2" \
    "Callooh Callay|Quirky speakeasy with a wardrobe entrance.|20:00|90" \
    "XOYO|Underground club with world-class DJs.|22:30|120" \
    "Fabric|Iconic techno institution in Farringdon.|01:00|180"

  insert_group_flow "$LONDON_ID" "London" \
    "Thames River Party" \
    "Dance on the water with Londons skyline as your backdrop." \
    "moderate" "true" "true" "3" \
    "OXO Tower Bar|Pre-party drinks with South Bank views.|18:00|90" \
    "Thames Party Boat|Board a boat for a cruise past Parliament, Tower Bridge, and more.|20:00|180" \
    "Ministry of Sound|End the night at the legendary superclub.|00:00|180"
fi

# ============================================
# PARIS
# ============================================
PARIS_ID=$(get_city_id "Paris")
if [ -n "$PARIS_ID" ]; then
  echo "🌆 Paris"

  insert_group_flow "$PARIS_ID" "Paris" \
    "Montmartre Magic" \
    "Romance and revelry in Paris most artistic neighborhood." \
    "moderate" "true" "false" "1" \
    "Le Tres Particulier|Hidden cocktail bar in a secret garden behind Hotel Particulier.|20:00|90" \
    "Au Lapin Agile|Historic cabaret where Picasso once performed.|22:00|120" \
    "Moulin Rouge|The legendary cabaret with the world-famous cancan.|00:30|120"

  insert_group_flow "$PARIS_ID" "Paris" \
    "Le Marais Night Out" \
    "Trendy bars and clubs in Paris hippest neighborhood." \
    "easy" "true" "false" "2" \
    "Candelaria|Tacos in front, speakeasy cocktail bar in back.|21:00|90" \
    "Le Baron|Exclusive nightclub with an eclectic music policy.|23:00|150"

  insert_group_flow "$PARIS_ID" "Paris" \
    "Seine River Cruise Party" \
    "Glide past Paris monuments with champagne and dancing." \
    "moderate" "true" "true" "3" \
    "Les Ombres|Pre-cruise drinks with Eiffel Tower views at Musee du Quai Branly.|19:00|90" \
    "Paris Boat Party|Dance on the Seine past Notre-Dame and the Louvre.|21:00|180" \
    "Concrete|After-party at this riverside techno club on a boat.|01:00|180"
fi

# ============================================
# TOKYO
# ============================================
TOKYO_ID=$(get_city_id "Tokyo")
if [ -n "$TOKYO_ID" ]; then
  echo "🌆 Tokyo"

  insert_group_flow "$TOKYO_ID" "Tokyo" \
    "Golden Gai Adventure" \
    "Explore Shinjukus legendary maze of tiny bars." \
    "moderate" "true" "false" "1" \
    "Albatross|Multi-floor bar with chandeliers in a narrow building.|20:00|60" \
    "Champion|Tiny 6-seat bar with friendly owner and strong drinks.|21:30|60" \
    "Death Match in Hell|Horror-themed bar with wrestling memorabilia.|23:00|60" \
    "Contact|Underground techno club in Shibuya.|00:30|180"

  insert_group_flow "$TOKYO_ID" "Tokyo" \
    "Shibuya to Roppongi" \
    "From scramble crossing to all-night dancing." \
    "intense" "true" "false" "2" \
    "WOMB|Four-floor superclub with world-class sound system.|23:00|120" \
    "Sound Museum Vision|Underground dance music venue with multiple floors.|01:30|180" \
    "Oath|Intimate late-night bar open until sunrise.|04:00|120"

  insert_group_flow "$TOKYO_ID" "Tokyo" \
    "Tokyo Bay Cruise" \
    "Sail past Rainbow Bridge with the neon skyline glowing." \
    "moderate" "true" "true" "3" \
    "Two Rooms Grill & Bar|Chic Aoyama bar with terrace views.|18:00|90" \
    "Tokyo Bay Night Cruise|Board a yakatabune boat for traditional Japanese dining on the water.|20:00|150" \
    "Ageha|Japans largest nightclub in a waterfront warehouse.|23:00|180"
fi

# ============================================
# BERLIN
# ============================================
BERLIN_ID=$(get_city_id "Berlin")
if [ -n "$BERLIN_ID" ]; then
  echo "🌆 Berlin"

  insert_group_flow "$BERLIN_ID" "Berlin" \
    "Techno Pilgrimage" \
    "Experience the birthplace of techno culture." \
    "intense" "true" "false" "1" \
    "Klunkerkranich|Rooftop bar on top of a parking garage in Neukolln.|20:00|120" \
    "Tresor|Legendary techno temple in an old power plant.|23:00|180" \
    "Berghain|The worlds most famous nightclub. Good luck getting in.|03:00|300"

  insert_group_flow "$BERLIN_ID" "Berlin" \
    "Kreuzberg Crawl" \
    "Dive bars, street food, and Berlins alternative soul." \
    "easy" "true" "false" "2" \
    "Luzia|Cozy bar with mismatched furniture and great cocktails.|20:00|90" \
    "Mobel Olfe|Quirky bar in an old furniture store.|22:00|90" \
    "Watergate|Dance club with floor-to-ceiling windows on the Spree.|00:00|180"

  insert_group_flow "$BERLIN_ID" "Berlin" \
    "Spree River Party" \
    "Float down Berlins river with drinks and beats." \
    "moderate" "true" "true" "3" \
    "Club der Visionare|Chill waterside bar with hammocks and minimal techno.|16:00|120" \
    "Berlin Boat Party|Cruise the Spree with DJ and dancing.|18:00|180" \
    "Sisyphos|Sprawling open-air club in a former factory.|22:00|300"
fi

# ============================================
# BARCELONA
# ============================================
BARCELONA_ID=$(get_city_id "Barcelona")
if [ -n "$BARCELONA_ID" ]; then
  echo "🌆 Barcelona"

  insert_group_flow "$BARCELONA_ID" "Barcelona" \
    "Gothic Quarter Vibes" \
    "Wind through medieval streets to hidden bars and clubs." \
    "moderate" "true" "false" "1" \
    "Paradiso|World-famous speakeasy hidden behind a fridge door.|21:00|90" \
    "Marula Cafe|Funk and soul in a basement club.|23:00|90" \
    "Moog|Legendary techno club spinning since 1996.|01:00|180"

  insert_group_flow "$BARCELONA_ID" "Barcelona" \
    "Barceloneta Beach Party" \
    "From beachside chiringuitos to yacht parties on the Med." \
    "moderate" "true" "false" "2" \
    "Opium Mar|Beachfront terrace with views of the Mediterranean.|17:00|120" \
    "Barcelona Boat Party|Sail along the Costa Brava with DJ, drinks, and swimming.|19:00|180" \
    "Pacha Barcelona|World-famous club for the ultimate after-party.|23:00|180"

  insert_group_flow "$BARCELONA_ID" "Barcelona" \
    "El Born Art & Drinks" \
    "Artsy bars and vermouth in Barcelonas trendiest hood." \
    "easy" "false" "true" "3" \
    "El Xampanyet|Legendary cava bar pouring since 1929.|19:00|60" \
    "Collage Cocktail Bar|Intimate craft cocktails in a former antique shop.|20:30|90"
fi

# ============================================
# MADRID
# ============================================
MADRID_ID=$(get_city_id "Madrid")
if [ -n "$MADRID_ID" ]; then
  echo "🌆 Madrid"

  insert_group_flow "$MADRID_ID" "Madrid" \
    "Authentic Madrid Night" \
    "Tapas crawl to flamenco to dancing until sunrise." \
    "intense" "true" "false" "1" \
    "La Latina Tapas Crawl|Start with traditional tapas crawl through La Latinas historic streets.|21:00|120" \
    "Corral de la Moreria|Experience world-class flamenco at Madrids most prestigious tablao.|23:00|120" \
    "Teatro Kapital|End the night at Kapital, Madrids legendary 7-floor megaclub.|02:00|180"

  insert_group_flow "$MADRID_ID" "Madrid" \
    "Rooftop & Culture" \
    "Sunset views and authentic flamenco in the heart of Madrid." \
    "moderate" "true" "false" "2" \
    "Circulo de Bellas Artes|Sunset cocktails on the iconic rooftop terrace with 360 views of Madrids skyline.|20:00|90" \
    "Cardamomo Tablao|Intimate flamenco performance in the heart of the Huertas neighborhood.|22:00|120"

  insert_group_flow "$MADRID_ID" "Madrid" \
    "Malasana Alternative Scene" \
    "Dive into Madrids coolest neighborhood for indie vibes." \
    "easy" "true" "true" "3" \
    "Ojala Beach Bar|Start at this quirky indoor beach bar with sand floors. Sip creative cocktails.|21:00|120" \
    "Tupperware Club|Dance to indie rock, electronic, and alternative music at Malasanas coolest club.|23:00|120"

  insert_group_flow "$MADRID_ID" "Madrid" \
    "Chueca Pride Night" \
    "Madrids legendary LGBTQ+ neighborhood comes alive." \
    "moderate" "true" "true" "4" \
    "Mercado de San Anton|Tapas and drinks at this trendy market with a rooftop terrace.|20:00|90" \
    "Bar Cock|Legendary cocktail bar in a former brothel.|22:00|90" \
    "Medias Puri|Kitsch decor and wild parties in Malasana.|00:00|150"
fi

# ============================================
# AMSTERDAM
# ============================================
AMSTERDAM_ID=$(get_city_id "Amsterdam")
if [ -n "$AMSTERDAM_ID" ]; then
  echo "🌆 Amsterdam"

  insert_group_flow "$AMSTERDAM_ID" "Amsterdam" \
    "Canal Ring Crawl" \
    "Brown cafes, cocktails, and canal-side vibes." \
    "easy" "true" "false" "1" \
    "Cafe Hoppe|Historic brown cafe dating back to 1670.|19:00|90" \
    "Tales & Spirits|Storytelling cocktail bar with theatrical presentation.|21:00|90" \
    "Air Amsterdam|Elegant club in a former bank vault.|23:00|180"

  insert_group_flow "$AMSTERDAM_ID" "Amsterdam" \
    "Amsterdam Canal Boat Party" \
    "Float through the UNESCO canals with drinks and music." \
    "moderate" "true" "false" "2" \
    "Hannekes Boom|Waterfront bar with terrace and live music.|17:00|90" \
    "Amsterdam Boat Party|Private canal cruise with DJ and open bar.|19:00|180" \
    "De School|Former school turned 24-hour club.|23:00|240"
fi

# ============================================
# DUBAI
# ============================================
DUBAI_ID=$(get_city_id "Dubai")
if [ -n "$DUBAI_ID" ]; then
  echo "🌆 Dubai"

  insert_group_flow "$DUBAI_ID" "Dubai" \
    "Sky High Dubai" \
    "Rooftop glamour with views of the worlds tallest buildings." \
    "moderate" "true" "false" "1" \
    "At.Mosphere|The worlds highest lounge in Burj Khalifa.|19:00|120" \
    "Iris Dubai|Rooftop terrace with Marina views.|21:30|90" \
    "WHITE Dubai|Glamorous nightclub on the roof of Meydan Hotel.|23:30|180"

  insert_group_flow "$DUBAI_ID" "Dubai" \
    "Dubai Marina Yacht Party" \
    "Sail past the Palm with champagne and sunset views." \
    "moderate" "true" "false" "2" \
    "Zero Gravity|Beach club with pool and stunning skyline views.|15:00|120" \
    "Dubai Yacht Party|Luxury yacht cruise around Palm Jumeirah.|17:00|180" \
    "Cavalli Club|Designer club with opulent interiors.|22:00|180"
fi

# ============================================
# LISBON
# ============================================
LISBON_ID=$(get_city_id "Lisbon")
if [ -n "$LISBON_ID" ]; then
  echo "🌆 Lisbon"

  insert_group_flow "$LISBON_ID" "Lisbon" \
    "Bairro Alto Crawl" \
    "Wind through Lisbons legendary nightlife district." \
    "easy" "true" "false" "1" \
    "Pavilhao Chines|Eccentric bar filled with curious collections.|20:00|90" \
    "Tasca do Chico|Authentic fado singing in a tiny tavern.|22:00|90" \
    "Lux Fragil|Lisbons most iconic nightclub on the waterfront.|00:00|180"

  insert_group_flow "$LISBON_ID" "Lisbon" \
    "Tagus River Party" \
    "Sail past Belem Tower with drinks and dancing." \
    "moderate" "true" "false" "2" \
    "Rio Maravilha|Rooftop drinks with bridge and river views.|17:00|90" \
    "Lisbon Boat Party|Sunset cruise on the Tagus with DJ and open bar.|19:00|180" \
    "Musicbox|Underground live music venue in Cais do Sodre.|23:00|150"
fi

# ============================================
# Additional cities (abbreviated)
# ============================================

# CHICAGO
CHICAGO_ID=$(get_city_id "Chicago")
if [ -n "$CHICAGO_ID" ]; then
  echo "🌆 Chicago"
  insert_group_flow "$CHICAGO_ID" "Chicago" \
    "Jazz & Blues Chicago" \
    "Experience the birthplace of Chicago blues and jazz." \
    "moderate" "true" "false" "1" \
    "The Green Mill|Al Capones former hangout, now a legendary jazz club.|20:00|120" \
    "Kingston Mines|Two stages of non-stop blues until 4am.|22:30|150"
fi

# LAS VEGAS
VEGAS_ID=$(get_city_id "Las Vegas")
if [ -n "$VEGAS_ID" ]; then
  echo "🌆 Las Vegas"
  insert_group_flow "$VEGAS_ID" "Las Vegas" \
    "Strip Club Crawl" \
    "The ultimate Vegas nightclub experience." \
    "intense" "true" "false" "1" \
    "Marquee|Massive club at The Cosmopolitan with library and boombox.|22:00|120" \
    "Hakkasan|Five-level nightclub at MGM Grand.|00:30|150" \
    "XS Nightclub|Outdoor pool club at Encore.|03:00|180"
fi

# SAN FRANCISCO
SF_ID=$(get_city_id "San Francisco")
if [ -n "$SF_ID" ]; then
  echo "🌆 San Francisco"
  insert_group_flow "$SF_ID" "San Francisco" \
    "Mission District Crawl" \
    "Dive bars, taquerias, and the citys best cocktails." \
    "easy" "true" "false" "1" \
    "ABV|Craft cocktails and refined bar snacks.|20:00|90" \
    "El Rio|Legendary patio bar with diverse crowds.|22:00|90" \
    "Make-Out Room|Live music venue with eclectic bookings.|00:00|120"
fi

# AUSTIN
AUSTIN_ID=$(get_city_id "Austin")
if [ -n "$AUSTIN_ID" ]; then
  echo "🌆 Austin"
  insert_group_flow "$AUSTIN_ID" "Austin" \
    "6th Street Crawl" \
    "Live music capital of the world." \
    "easy" "true" "false" "1" \
    "The Continental Club|Legendary venue for rockabilly and blues.|20:00|90" \
    "Stubbs|BBQ and live music in an outdoor amphitheater.|22:00|120" \
    "The Mohawk|Indoor outdoor venue with multiple stages.|00:30|120"
fi

# NASHVILLE
NASHVILLE_ID=$(get_city_id "Nashville")
if [ -n "$NASHVILLE_ID" ]; then
  echo "🌆 Nashville"
  insert_group_flow "$NASHVILLE_ID" "Nashville" \
    "Honky Tonk Highway" \
    "Country music and cold beer on Lower Broadway." \
    "moderate" "true" "false" "1" \
    "Roberts Western World|Legendary honky tonk with live country music.|20:00|90" \
    "Tootsies Orchid Lounge|Historic bar where Willie Nelson was discovered.|22:00|90" \
    "FGL House|Three floors of country fun.|00:00|120"
fi

# NEW ORLEANS
NOLA_ID=$(get_city_id "New Orleans")
if [ -n "$NOLA_ID" ]; then
  echo "🌆 New Orleans"
  insert_group_flow "$NOLA_ID" "New Orleans" \
    "Bourbon Street Experience" \
    "Classic NOLA revelry on the world-famous street." \
    "moderate" "true" "false" "1" \
    "Preservation Hall|Traditional jazz in an intimate historic venue.|20:00|90" \
    "Fritzels European Jazz Pub|Nightly jazz in the heart of the Quarter.|22:00|90" \
    "The Spotted Cat Music Club|Local jazz with dancing on Frenchmen Street.|00:00|120"
fi

# ROME
ROME_ID=$(get_city_id "Rome")
if [ -n "$ROME_ID" ]; then
  echo "🌆 Rome"
  insert_group_flow "$ROME_ID" "Rome" \
    "Trastevere Nights" \
    "Winding streets, wine bars, and Italian charm." \
    "easy" "true" "false" "1" \
    "Ma Che Siete Venuti a Fa|Craft beer bar named after a soccer chant.|20:00|90" \
    "Big Star|Cocktails in a tiny Trastevere gem.|22:00|90" \
    "Lanificio 159|Industrial club space in a former factory.|00:00|180"
fi

# SEOUL
SEOUL_ID=$(get_city_id "Seoul")
if [ -n "$SEOUL_ID" ]; then
  echo "🌆 Seoul"
  insert_group_flow "$SEOUL_ID" "Seoul" \
    "Hongdae Underground" \
    "K-indie, hip-hop, and youth culture." \
    "moderate" "true" "false" "1" \
    "Club FF|Live indie bands in a tiny basement.|21:00|90" \
    "Madholic|K-pop and EDM megaclub.|23:00|120" \
    "Cakeshop|Underground hip-hop and techno.|01:00|180"
fi

# BANGKOK
BANGKOK_ID=$(get_city_id "Bangkok")
if [ -n "$BANGKOK_ID" ]; then
  echo "🌆 Bangkok"
  insert_group_flow "$BANGKOK_ID" "Bangkok" \
    "Thonglor Night Out" \
    "Bangkoks hippest neighborhood for cocktails and clubs." \
    "moderate" "true" "false" "1" \
    "Rabbit Hole|Speakeasy cocktails in Thonglor.|20:00|90" \
    "Iron Fairies|Fairy-tale themed bar with absinthe.|22:00|90" \
    "Beam|Cutting-edge club with international DJs.|00:00|180"
fi

# SINGAPORE
SINGAPORE_ID=$(get_city_id "Singapore")
if [ -n "$SINGAPORE_ID" ]; then
  echo "🌆 Singapore"
  insert_group_flow "$SINGAPORE_ID" "Singapore" \
    "Marina Bay Heights" \
    "Sky-high cocktails with city-state views." \
    "moderate" "true" "false" "1" \
    "CE LA VI|Rooftop bar atop Marina Bay Sands.|19:00|90" \
    "28 HongKong Street|Hidden cocktail bar with no sign.|21:30|90" \
    "Zouk|Asias legendary superclub.|23:30|180"
fi

# HONG KONG
HK_ID=$(get_city_id "Hong Kong")
if [ -n "$HK_ID" ]; then
  echo "🌆 Hong Kong"
  insert_group_flow "$HK_ID" "Hong Kong" \
    "Lan Kwai Fong Crawl" \
    "Hong Kongs legendary party district." \
    "moderate" "true" "false" "1" \
    "Employees Only HK|NYC speakeasy franchise with HK twist.|20:00|90" \
    "Dragon-i|Celebrity-studded club in Central.|22:30|120" \
    "Oma|Underground techno in Wan Chai.|01:00|180"
fi

# TEL AVIV
TELAVIV_ID=$(get_city_id "Tel Aviv")
if [ -n "$TELAVIV_ID" ]; then
  echo "🌆 Tel Aviv"
  insert_group_flow "$TELAVIV_ID" "Tel Aviv" \
    "White City Nightlife" \
    "Bauhaus buildings and beach clubs." \
    "moderate" "true" "false" "1" \
    "Imperial Craft Cocktail Bar|Top-ranked cocktail bar in the Middle East.|21:00|90" \
    "Kuli Alma|Underground art space and club.|23:00|120" \
    "The Block|Techno temple in a former parking garage.|01:00|300"
fi

# SYDNEY
SYDNEY_ID=$(get_city_id "Sydney")
if [ -n "$SYDNEY_ID" ]; then
  echo "🌆 Sydney"
  insert_group_flow "$SYDNEY_ID" "Sydney" \
    "Sydney Harbour Party" \
    "Sail past the Opera House and Harbour Bridge." \
    "moderate" "true" "false" "1" \
    "Opera Bar|Drinks with Opera House views.|17:00|90" \
    "Sydney Boat Party|Dance on the harbour with iconic views.|19:00|180" \
    "Chinese Laundry|Underground techno institution.|23:00|180"
fi

# CAPE TOWN
CAPETOWN_ID=$(get_city_id "Cape Town")
if [ -n "$CAPETOWN_ID" ]; then
  echo "🌆 Cape Town"
  insert_group_flow "$CAPETOWN_ID" "Cape Town" \
    "Cape Town Boat Party" \
    "Sail with Table Mountain as your backdrop." \
    "moderate" "true" "false" "1" \
    "Grand Cafe & Beach|Pre-party at the V&A Waterfront.|16:00|90" \
    "Cape Town Boat Party|Sunset cruise with DJ and champagne.|18:00|180" \
    "Fiction|Underground club in the CBD.|22:00|180"
fi

# RIO
RIO_ID=$(get_city_id "Rio de Janeiro")
if [ -n "$RIO_ID" ]; then
  echo "🌆 Rio de Janeiro"
  insert_group_flow "$RIO_ID" "Rio de Janeiro" \
    "Lapa Nights" \
    "Samba, caipirinhas, and Rios famous arches." \
    "moderate" "true" "false" "1" \
    "Rio Scenarium|Three floors of samba in an antique warehouse.|21:00|120" \
    "Carioca da Gema|Live samba and choro music.|23:30|150"
fi

# BALI
BALI_ID=$(get_city_id "Bali")
if [ -n "$BALI_ID" ]; then
  echo "🌆 Bali"
  insert_group_flow "$BALI_ID" "Bali" \
    "Bali Boat Party" \
    "Sail to Nusa islands with DJ and drinks." \
    "moderate" "true" "false" "1" \
    "Single Fin|Sunset drinks overlooking Uluwatu surf.|15:00|120" \
    "Bali Boat Party|Catamaran cruise with swimming and DJ.|17:00|180" \
    "Mirror Lounge|After-party at this futuristic club.|22:00|150"
fi

# ISTANBUL
ISTANBUL_ID=$(get_city_id "Istanbul")
if [ -n "$ISTANBUL_ID" ]; then
  echo "🌆 Istanbul"
  insert_group_flow "$ISTANBUL_ID" "Istanbul" \
    "Bosphorus Yacht Party" \
    "Sail between Europe and Asia with drinks." \
    "moderate" "true" "false" "1" \
    "Mikla|Rooftop restaurant with city views.|18:00|90" \
    "Istanbul Boat Party|Cruise past palaces and mosques.|20:00|180" \
    "Anjelique|Glamorous waterfront club.|00:00|150"
fi

echo ""
echo "=================================="
echo "🎉 Insertion Complete!"
echo ""

# Verify counts
FLOW_COUNT=$(curl -s -I "${SUPABASE_URL}/rest/v1/GroupFlow?select=*" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Prefer: count=exact" | grep -i "content-range" | sed 's/.*\///')

STEP_COUNT=$(curl -s -I "${SUPABASE_URL}/rest/v1/GroupFlowStep?select=*" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Prefer: count=exact" | grep -i "content-range" | sed 's/.*\///')

echo "📊 Summary:"
echo "   - GroupFlows in DB: ${FLOW_COUNT:-unknown}"
echo "   - GroupFlowSteps in DB: ${STEP_COUNT:-unknown}"
