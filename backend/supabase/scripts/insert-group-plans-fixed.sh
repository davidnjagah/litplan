#!/bin/bash

# Insert Unique Group Plans via REST API - FIXED VERSION
# Matches the actual GroupFlowStep schema (no description/startTime columns)

SUPABASE_URL="https://clktdigankjszupvrsqt.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsa3RkaWdhbmtqc3p1cHZyc3F0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzAxNjQzNywiZXhwIjoyMDgyNTkyNDM3fQ.MpZ0c4A1M58ih0Tdij7zcnzyoziI1plDwFwzN-FVCKs"

echo "🚀 Starting Group Plans Insertion (Fixed)"
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
echo "📋 Getting city IDs and plan IDs..."

# Get city IDs (we need to map city names to IDs)
CITIES=$(curl -s "${SUPABASE_URL}/rest/v1/City?select=id,name&order=rank.asc" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

# Get plans by city for linking
PLANS=$(curl -s "${SUPABASE_URL}/rest/v1/Plan?select=id,cityId,venueName&order=rank.asc" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

echo "   Found cities and plans"

# Function to get city ID by name
get_city_id() {
  local city_name="$1"
  echo "$CITIES" | python3 -c "import json,sys; cities=json.load(sys.stdin); print(next((c['id'] for c in cities if c['name']=='$city_name'), ''))"
}

# Function to get a plan ID for a city (we'll use the first available plan)
get_plan_id_for_city() {
  local city_id="$1"
  echo "$PLANS" | python3 -c "import json,sys; plans=json.load(sys.stdin); print(next((p['id'] for p in plans if p['cityId']=='$city_id'), ''))"
}

# Function to insert a group flow and its steps
# GroupFlowStep schema: id, flowId, planId, stepNumber, title, venueName, duration, thumbnail
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

  # Get a plan ID from this city to link steps to
  local default_plan_id=$(get_plan_id_for_city "$city_id")

  # Get current timestamp
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

  # Insert GroupFlow (with required createdAt and updatedAt)
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
      \"totalHours\": 4,
      \"isWeekend\": ${is_weekend},
      \"proOnly\": ${pro_only},
      \"rank\": ${rank},
      \"currency\": \"USD\",
      \"createdAt\": \"${timestamp}\",
      \"updatedAt\": \"${timestamp}\"
    }")

  # Insert steps - schema: id, flowId, planId, stepNumber, title, venueName, duration, thumbnail
  local step_num=1
  for venue_data in "${venues[@]}"; do
    IFS='|' read -r venue_name duration <<< "$venue_data"
    local step_id="${flow_id}-step-${step_num}"

    # Use the default plan ID from this city (required field)
    curl -s -X POST "${SUPABASE_URL}/rest/v1/GroupFlowStep" \
      -H "apikey: ${SERVICE_KEY}" \
      -H "Authorization: Bearer ${SERVICE_KEY}" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d "{
        \"id\": \"${step_id}\",
        \"flowId\": \"${flow_id}\",
        \"planId\": \"${default_plan_id}\",
        \"stepNumber\": ${step_num},
        \"title\": \"Stop ${step_num}\",
        \"venueName\": \"${venue_name}\",
        \"duration\": ${duration},
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
    "Brooklyn Brewery|90" \
    "Blue Note Jazz Club|120" \
    "Le Bain at The Standard|90"

  insert_group_flow "$NYC_ID" "New York" \
    "Comedy & Cocktails" \
    "Laugh the night away with world-class cocktails and legendary comedy." \
    "easy" "true" "false" "2" \
    "The Dead Rabbit|90" \
    "Comedy Cellar|120"

  insert_group_flow "$NYC_ID" "New York" \
    "Speakeasy Secret Tour" \
    "Discover NYCs hidden bars and prohibition-era secrets." \
    "moderate" "false" "true" "3" \
    "Please Dont Tell (PDT)|90" \
    "Employees Only|90" \
    "Attaboy|90"

  insert_group_flow "$NYC_ID" "New York" \
    "Rooftop Hopping" \
    "Take in stunning skyline views from Manhattans best rooftops." \
    "moderate" "true" "true" "4" \
    "230 Fifth|90" \
    "Westlight|90" \
    "The Roof at PUBLIC|120"

  insert_group_flow "$NYC_ID" "New York" \
    "Harbor Yacht Party" \
    "Sail around Manhattan with drinks, dancing, and stunning skyline views." \
    "moderate" "true" "true" "5" \
    "Pier A Harbor House|90" \
    "NYC Boat Party Cruise|180" \
    "Output Brooklyn|120"
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
    "Skybar at Mondrian|90" \
    "The Troubadour|120"

  insert_group_flow "$LA_ID" "Los Angeles" \
    "Rooftop Sunset Crawl" \
    "Chase the sunset across LAs most stunning rooftop venues." \
    "moderate" "true" "false" "2" \
    "Perch|90" \
    "EP and LP|90" \
    "Mama Shelter Rooftop|120"

  insert_group_flow "$LA_ID" "Los Angeles" \
    "Venice Beach Day Party" \
    "California dreaming with beach vibes and yacht parties." \
    "moderate" "true" "true" "3" \
    "The Brig|90" \
    "Marina del Rey Yacht Party|180" \
    "Elia Beach Club|120"

  insert_group_flow "$LA_ID" "Los Angeles" \
    "Hollywood Legends Night" \
    "Walk the red carpet at Hollywoods most iconic venues." \
    "intense" "true" "true" "4" \
    "Musso and Frank Grill|90" \
    "No Vacancy|90" \
    "Avalon Hollywood|120"
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
    "Sugar at EAST|90" \
    "Ball and Chain|90" \
    "LIV at Fontainebleau|150"

  insert_group_flow "$MIAMI_ID" "Miami" \
    "Biscayne Bay Yacht Party" \
    "Sail the turquoise waters with champagne and stunning Miami views." \
    "moderate" "true" "false" "2" \
    "Nikki Beach|120" \
    "Miami Yacht Party|180" \
    "E11EVEN|180"

  insert_group_flow "$MIAMI_ID" "Miami" \
    "Little Havana Nights" \
    "Authentic Cuban culture with salsa, cigars, and cocktails." \
    "easy" "false" "true" "3" \
    "Cubaocho Museum|90" \
    "Hoy Como Ayer|120"

  insert_group_flow "$MIAMI_ID" "Miami" \
    "Wynwood Art and Cocktails" \
    "Street art, craft cocktails, and Miamis creative scene." \
    "easy" "true" "true" "4" \
    "Gramps|90" \
    "Shots Miami|90" \
    "Treehouse|120"
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
    "American Bar at The Savoy|90" \
    "Ronnie Scotts Jazz Club|120" \
    "Experimental Cocktail Club|90"

  insert_group_flow "$LONDON_ID" "London" \
    "Shoreditch Alternative" \
    "East Londons edgy bars, clubs, and creative energy." \
    "moderate" "true" "false" "2" \
    "Callooh Callay|90" \
    "XOYO|120" \
    "Fabric|180"

  insert_group_flow "$LONDON_ID" "London" \
    "Thames River Party" \
    "Dance on the water with Londons skyline as your backdrop." \
    "moderate" "true" "true" "3" \
    "OXO Tower Bar|90" \
    "Thames Party Boat|180" \
    "Ministry of Sound|180"
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
    "Le Tres Particulier|90" \
    "Au Lapin Agile|120" \
    "Moulin Rouge|120"

  insert_group_flow "$PARIS_ID" "Paris" \
    "Le Marais Night Out" \
    "Trendy bars and clubs in Paris hippest neighborhood." \
    "easy" "true" "false" "2" \
    "Candelaria|90" \
    "Le Baron|150"

  insert_group_flow "$PARIS_ID" "Paris" \
    "Seine River Cruise Party" \
    "Glide past Paris monuments with champagne and dancing." \
    "moderate" "true" "true" "3" \
    "Les Ombres|90" \
    "Paris Boat Party|180" \
    "Concrete|180"
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
    "Albatross|60" \
    "Champion Bar|60" \
    "Death Match in Hell|60" \
    "Contact|180"

  insert_group_flow "$TOKYO_ID" "Tokyo" \
    "Shibuya to Roppongi" \
    "From scramble crossing to all-night dancing." \
    "intense" "true" "false" "2" \
    "WOMB|120" \
    "Sound Museum Vision|180" \
    "Oath|120"

  insert_group_flow "$TOKYO_ID" "Tokyo" \
    "Tokyo Bay Cruise" \
    "Sail past Rainbow Bridge with the neon skyline glowing." \
    "moderate" "true" "true" "3" \
    "Two Rooms Grill Bar|90" \
    "Tokyo Bay Night Cruise|150" \
    "Ageha|180"
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
    "Klunkerkranich|120" \
    "Tresor|180" \
    "Berghain|300"

  insert_group_flow "$BERLIN_ID" "Berlin" \
    "Kreuzberg Crawl" \
    "Dive bars, street food, and Berlins alternative soul." \
    "easy" "true" "false" "2" \
    "Luzia|90" \
    "Mobel Olfe|90" \
    "Watergate|180"

  insert_group_flow "$BERLIN_ID" "Berlin" \
    "Spree River Party" \
    "Float down Berlins river with drinks and beats." \
    "moderate" "true" "true" "3" \
    "Club der Visionare|120" \
    "Berlin Boat Party|180" \
    "Sisyphos|300"
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
    "Paradiso|90" \
    "Marula Cafe|90" \
    "Moog|180"

  insert_group_flow "$BARCELONA_ID" "Barcelona" \
    "Barceloneta Beach Party" \
    "From beachside chiringuitos to yacht parties on the Med." \
    "moderate" "true" "false" "2" \
    "Opium Mar|120" \
    "Barcelona Boat Party|180" \
    "Pacha Barcelona|180"

  insert_group_flow "$BARCELONA_ID" "Barcelona" \
    "El Born Art and Drinks" \
    "Artsy bars and vermouth in Barcelonas trendiest hood." \
    "easy" "false" "true" "3" \
    "El Xampanyet|60" \
    "Collage Cocktail Bar|90"
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
    "La Latina Tapas Crawl|120" \
    "Corral de la Moreria|120" \
    "Teatro Kapital|180"

  insert_group_flow "$MADRID_ID" "Madrid" \
    "Rooftop and Culture" \
    "Sunset views and authentic flamenco in the heart of Madrid." \
    "moderate" "true" "false" "2" \
    "Circulo de Bellas Artes|90" \
    "Cardamomo Tablao|120"

  insert_group_flow "$MADRID_ID" "Madrid" \
    "Malasana Alternative Scene" \
    "Dive into Madrids coolest neighborhood for indie vibes." \
    "easy" "true" "true" "3" \
    "Ojala Beach Bar|120" \
    "Tupperware Club|120"

  insert_group_flow "$MADRID_ID" "Madrid" \
    "Chueca Pride Night" \
    "Madrids legendary LGBTQ neighborhood comes alive." \
    "moderate" "true" "true" "4" \
    "Mercado de San Anton|90" \
    "Bar Cock|90" \
    "Medias Puri|150"
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
    "Cafe Hoppe|90" \
    "Tales and Spirits|90" \
    "Air Amsterdam|180"

  insert_group_flow "$AMSTERDAM_ID" "Amsterdam" \
    "Amsterdam Canal Boat Party" \
    "Float through the UNESCO canals with drinks and music." \
    "moderate" "true" "false" "2" \
    "Hannekes Boom|90" \
    "Amsterdam Boat Party|180" \
    "De School|240"
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
    "At.Mosphere Burj Khalifa|120" \
    "Iris Dubai|90" \
    "WHITE Dubai|180"

  insert_group_flow "$DUBAI_ID" "Dubai" \
    "Dubai Marina Yacht Party" \
    "Sail past the Palm with champagne and sunset views." \
    "moderate" "true" "false" "2" \
    "Zero Gravity|120" \
    "Dubai Yacht Party|180" \
    "Cavalli Club|180"
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
    "Pavilhao Chines|90" \
    "Tasca do Chico|90" \
    "Lux Fragil|180"

  insert_group_flow "$LISBON_ID" "Lisbon" \
    "Tagus River Party" \
    "Sail past Belem Tower with drinks and dancing." \
    "moderate" "true" "false" "2" \
    "Rio Maravilha|90" \
    "Lisbon Boat Party|180" \
    "Musicbox|150"
fi

# ============================================
# Additional cities
# ============================================

# CHICAGO
CHICAGO_ID=$(get_city_id "Chicago")
if [ -n "$CHICAGO_ID" ]; then
  echo "🌆 Chicago"
  insert_group_flow "$CHICAGO_ID" "Chicago" \
    "Jazz and Blues Chicago" \
    "Experience the birthplace of Chicago blues and jazz." \
    "moderate" "true" "false" "1" \
    "The Green Mill|120" \
    "Kingston Mines|150"
fi

# LAS VEGAS
VEGAS_ID=$(get_city_id "Las Vegas")
if [ -n "$VEGAS_ID" ]; then
  echo "🌆 Las Vegas"
  insert_group_flow "$VEGAS_ID" "Las Vegas" \
    "Strip Club Crawl" \
    "The ultimate Vegas nightclub experience." \
    "intense" "true" "false" "1" \
    "Marquee|120" \
    "Hakkasan|150" \
    "XS Nightclub|180"
fi

# SAN FRANCISCO
SF_ID=$(get_city_id "San Francisco")
if [ -n "$SF_ID" ]; then
  echo "🌆 San Francisco"
  insert_group_flow "$SF_ID" "San Francisco" \
    "Mission District Crawl" \
    "Dive bars, taquerias, and the citys best cocktails." \
    "easy" "true" "false" "1" \
    "ABV|90" \
    "El Rio|90" \
    "Make-Out Room|120"
fi

# AUSTIN
AUSTIN_ID=$(get_city_id "Austin")
if [ -n "$AUSTIN_ID" ]; then
  echo "🌆 Austin"
  insert_group_flow "$AUSTIN_ID" "Austin" \
    "6th Street Crawl" \
    "Live music capital of the world." \
    "easy" "true" "false" "1" \
    "The Continental Club|90" \
    "Stubbs BBQ|120" \
    "The Mohawk|120"
fi

# NASHVILLE
NASHVILLE_ID=$(get_city_id "Nashville")
if [ -n "$NASHVILLE_ID" ]; then
  echo "🌆 Nashville"
  insert_group_flow "$NASHVILLE_ID" "Nashville" \
    "Honky Tonk Highway" \
    "Country music and cold beer on Lower Broadway." \
    "moderate" "true" "false" "1" \
    "Roberts Western World|90" \
    "Tootsies Orchid Lounge|90" \
    "FGL House|120"
fi

# NEW ORLEANS
NOLA_ID=$(get_city_id "New Orleans")
if [ -n "$NOLA_ID" ]; then
  echo "🌆 New Orleans"
  insert_group_flow "$NOLA_ID" "New Orleans" \
    "Bourbon Street Experience" \
    "Classic NOLA revelry on the world-famous street." \
    "moderate" "true" "false" "1" \
    "Preservation Hall|90" \
    "Fritzels European Jazz|90" \
    "The Spotted Cat|120"
fi

# ROME
ROME_ID=$(get_city_id "Rome")
if [ -n "$ROME_ID" ]; then
  echo "🌆 Rome"
  insert_group_flow "$ROME_ID" "Rome" \
    "Trastevere Nights" \
    "Winding streets, wine bars, and Italian charm." \
    "easy" "true" "false" "1" \
    "Ma Che Siete Venuti|90" \
    "Big Star Rome|90" \
    "Lanificio 159|180"
fi

# SEOUL
SEOUL_ID=$(get_city_id "Seoul")
if [ -n "$SEOUL_ID" ]; then
  echo "🌆 Seoul"
  insert_group_flow "$SEOUL_ID" "Seoul" \
    "Hongdae Underground" \
    "K-indie, hip-hop, and youth culture." \
    "moderate" "true" "false" "1" \
    "Club FF|90" \
    "Madholic|120" \
    "Cakeshop|180"
fi

# BANGKOK
BANGKOK_ID=$(get_city_id "Bangkok")
if [ -n "$BANGKOK_ID" ]; then
  echo "🌆 Bangkok"
  insert_group_flow "$BANGKOK_ID" "Bangkok" \
    "Thonglor Night Out" \
    "Bangkoks hippest neighborhood for cocktails and clubs." \
    "moderate" "true" "false" "1" \
    "Rabbit Hole|90" \
    "Iron Fairies|90" \
    "Beam|180"
fi

# SINGAPORE
SINGAPORE_ID=$(get_city_id "Singapore")
if [ -n "$SINGAPORE_ID" ]; then
  echo "🌆 Singapore"
  insert_group_flow "$SINGAPORE_ID" "Singapore" \
    "Marina Bay Heights" \
    "Sky-high cocktails with city-state views." \
    "moderate" "true" "false" "1" \
    "CE LA VI|90" \
    "28 HongKong Street|90" \
    "Zouk|180"
fi

# HONG KONG
HK_ID=$(get_city_id "Hong Kong")
if [ -n "$HK_ID" ]; then
  echo "🌆 Hong Kong"
  insert_group_flow "$HK_ID" "Hong Kong" \
    "Lan Kwai Fong Crawl" \
    "Hong Kongs legendary party district." \
    "moderate" "true" "false" "1" \
    "Employees Only HK|90" \
    "Dragon-i|120" \
    "Oma|180"
fi

# TEL AVIV
TELAVIV_ID=$(get_city_id "Tel Aviv")
if [ -n "$TELAVIV_ID" ]; then
  echo "🌆 Tel Aviv"
  insert_group_flow "$TELAVIV_ID" "Tel Aviv" \
    "White City Nightlife" \
    "Bauhaus buildings and beach clubs." \
    "moderate" "true" "false" "1" \
    "Imperial Craft Cocktail|90" \
    "Kuli Alma|120" \
    "The Block|300"
fi

# SYDNEY
SYDNEY_ID=$(get_city_id "Sydney")
if [ -n "$SYDNEY_ID" ]; then
  echo "🌆 Sydney"
  insert_group_flow "$SYDNEY_ID" "Sydney" \
    "Sydney Harbour Party" \
    "Sail past the Opera House and Harbour Bridge." \
    "moderate" "true" "false" "1" \
    "Opera Bar|90" \
    "Sydney Boat Party|180" \
    "Chinese Laundry|180"
fi

# CAPE TOWN
CAPETOWN_ID=$(get_city_id "Cape Town")
if [ -n "$CAPETOWN_ID" ]; then
  echo "🌆 Cape Town"
  insert_group_flow "$CAPETOWN_ID" "Cape Town" \
    "Cape Town Boat Party" \
    "Sail with Table Mountain as your backdrop." \
    "moderate" "true" "false" "1" \
    "Grand Cafe Beach|90" \
    "Cape Town Boat Party|180" \
    "Fiction|180"
fi

# RIO
RIO_ID=$(get_city_id "Rio de Janeiro")
if [ -n "$RIO_ID" ]; then
  echo "🌆 Rio de Janeiro"
  insert_group_flow "$RIO_ID" "Rio de Janeiro" \
    "Lapa Nights" \
    "Samba, caipirinhas, and Rios famous arches." \
    "moderate" "true" "false" "1" \
    "Rio Scenarium|120" \
    "Carioca da Gema|150"
fi

# BALI
BALI_ID=$(get_city_id "Bali")
if [ -n "$BALI_ID" ]; then
  echo "🌆 Bali"
  insert_group_flow "$BALI_ID" "Bali" \
    "Bali Boat Party" \
    "Sail to Nusa islands with DJ and drinks." \
    "moderate" "true" "false" "1" \
    "Single Fin|120" \
    "Bali Boat Party|180" \
    "Mirror Lounge|150"
fi

# ISTANBUL
ISTANBUL_ID=$(get_city_id "Istanbul")
if [ -n "$ISTANBUL_ID" ]; then
  echo "🌆 Istanbul"
  insert_group_flow "$ISTANBUL_ID" "Istanbul" \
    "Bosphorus Yacht Party" \
    "Sail between Europe and Asia with drinks." \
    "moderate" "true" "false" "1" \
    "Mikla|90" \
    "Istanbul Boat Party|180" \
    "Anjelique|150"
fi

echo ""
echo "=================================="
echo "🎉 Insertion Complete!"
echo ""

# Verify counts
FLOW_COUNT=$(curl -s "${SUPABASE_URL}/rest/v1/GroupFlow?select=id" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))")

STEP_COUNT=$(curl -s "${SUPABASE_URL}/rest/v1/GroupFlowStep?select=id" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))")

echo "📊 Summary:"
echo "   - GroupFlows in DB: ${FLOW_COUNT}"
echo "   - GroupFlowSteps in DB: ${STEP_COUNT}"
