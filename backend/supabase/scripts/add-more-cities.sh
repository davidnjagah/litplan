#!/bin/bash

# Add More Cities to Supabase Database
# This script adds additional cities to reach 100 total

SUPABASE_URL="https://clktdigankjszupvrsqt.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsa3RkaWdhbmtqc3p1cHZyc3F0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzAxNjQzNywiZXhwIjoyMDgyNTkyNDM3fQ.MpZ0c4A1M58ih0Tdij7zcnzyoziI1plDwFwzN-FVCKs"

echo "🚀 Adding Additional Cities to Database"
echo "============================================================"

# Generate unique ID
generate_id() {
    echo "city$(date +%s)$(head /dev/urandom | LC_ALL=C tr -dc 'a-z0-9' | head -c 8)"
}

# Add a city
add_city() {
    local name="$1"
    local country="$2"
    local country_code="$3"
    local timezone="$4"
    local latitude="$5"
    local longitude="$6"
    local rank="$7"

    local id=$(generate_id)
    local city_id=$(echo "$name" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' | sed 's/[^a-z0-9-]//g' | head -c 20)
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
    local hero_image="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80"

    local response=$(curl -s -w "%{http_code}" -o /tmp/city_response.json -X POST "${SUPABASE_URL}/rest/v1/City" \
        -H "apikey: ${SERVICE_KEY}" \
        -H "Authorization: Bearer ${SERVICE_KEY}" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "{
            \"id\": \"${id}\",
            \"cityId\": \"${city_id}\",
            \"name\": \"${name}\",
            \"country\": \"${country}\",
            \"countryCode\": \"${country_code}\",
            \"rank\": ${rank},
            \"timezone\": \"${timezone}\",
            \"heroImage\": \"${hero_image}\",
            \"cardImage\": \"${hero_image}\",
            \"accentColor\": \"#00D9FF\",
            \"totalPlansThisWeek\": 0,
            \"featured\": false,
            \"searchCount\": 0,
            \"latitude\": ${latitude},
            \"longitude\": ${longitude},
            \"lastUpdated\": \"${timestamp}\",
            \"createdAt\": \"${timestamp}\",
            \"updatedAt\": \"${timestamp}\"
        }")

    if [ "$response" = "201" ]; then
        echo "✓ Added: ${name}, ${country} (rank: ${rank})"
        return 0
    else
        echo "✗ Failed: ${name} (HTTP ${response})"
        return 1
    fi
}

# Get current city count
echo ""
echo "📊 Checking existing cities..."
CITY_COUNT=$(curl -s -I "${SUPABASE_URL}/rest/v1/City?select=id" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Prefer: count=exact" | grep -i content-range | sed 's/.*\///' | tr -d '\r')

echo "   Current city count: ${CITY_COUNT:-50}"
echo ""

# Start rank after existing cities
START_RANK=$((${CITY_COUNT:-50} + 1))
ADDED=0

echo "📝 Adding new cities..."
echo ""

# North America
add_city "Seattle" "USA" "US" "America/Los_Angeles" "47.6062" "-122.3321" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Atlanta" "USA" "US" "America/New_York" "33.749" "-84.388" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Denver" "USA" "US" "America/Denver" "39.7392" "-104.9903" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Philadelphia" "USA" "US" "America/New_York" "39.9526" "-75.1652" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "San Diego" "USA" "US" "America/Los_Angeles" "32.7157" "-117.1611" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Portland" "USA" "US" "America/Los_Angeles" "45.5155" "-122.6789" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Phoenix" "USA" "US" "America/Phoenix" "33.4484" "-112.074" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Dallas" "USA" "US" "America/Chicago" "32.7767" "-96.797" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Houston" "USA" "US" "America/Chicago" "29.7604" "-95.3698" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Washington DC" "USA" "US" "America/New_York" "38.9072" "-77.0369" "$((START_RANK + ADDED))" && ((ADDED++))

# Europe
add_city "Munich" "Germany" "DE" "Europe/Berlin" "48.1351" "11.582" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Hamburg" "Germany" "DE" "Europe/Berlin" "53.5511" "9.9937" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Edinburgh" "UK" "GB" "Europe/London" "55.9533" "-3.1883" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Manchester" "UK" "GB" "Europe/London" "53.4808" "-2.2426" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Athens" "Greece" "GR" "Europe/Athens" "37.9838" "23.7275" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Budapest" "Hungary" "HU" "Europe/Budapest" "47.4979" "19.0402" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Warsaw" "Poland" "PL" "Europe/Warsaw" "52.2297" "21.0122" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Krakow" "Poland" "PL" "Europe/Warsaw" "50.0647" "19.945" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Oslo" "Norway" "NO" "Europe/Oslo" "59.9139" "10.7522" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Helsinki" "Finland" "FI" "Europe/Helsinki" "60.1699" "24.9384" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Zurich" "Switzerland" "CH" "Europe/Zurich" "47.3769" "8.5417" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Florence" "Italy" "IT" "Europe/Rome" "43.7696" "11.2558" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Nice" "France" "FR" "Europe/Paris" "43.7102" "7.262" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Seville" "Spain" "ES" "Europe/Madrid" "37.3891" "-5.9845" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Valencia" "Spain" "ES" "Europe/Madrid" "39.4699" "-0.3763" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Porto" "Portugal" "PT" "Europe/Lisbon" "41.1579" "-8.6291" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Ibiza" "Spain" "ES" "Europe/Madrid" "38.9067" "1.4206" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Mykonos" "Greece" "GR" "Europe/Athens" "37.4467" "25.3289" "$((START_RANK + ADDED))" && ((ADDED++))

# Asia Pacific
add_city "Osaka" "Japan" "JP" "Asia/Tokyo" "34.6937" "135.5023" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Kyoto" "Japan" "JP" "Asia/Tokyo" "35.0116" "135.7681" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Beijing" "China" "CN" "Asia/Shanghai" "39.9042" "116.4074" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Kuala Lumpur" "Malaysia" "MY" "Asia/Kuala_Lumpur" "3.139" "101.6869" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Ho Chi Minh City" "Vietnam" "VN" "Asia/Ho_Chi_Minh" "10.8231" "106.6297" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Jakarta" "Indonesia" "ID" "Asia/Jakarta" "-6.2088" "106.8456" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Manila" "Philippines" "PH" "Asia/Manila" "14.5995" "120.9842" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Delhi" "India" "IN" "Asia/Kolkata" "28.7041" "77.1025" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Bangalore" "India" "IN" "Asia/Kolkata" "12.9716" "77.5946" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Phuket" "Thailand" "TH" "Asia/Bangkok" "7.8804" "98.3923" "$((START_RANK + ADDED))" && ((ADDED++))

# Oceania
add_city "Brisbane" "Australia" "AU" "Australia/Brisbane" "-27.4698" "153.0251" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Perth" "Australia" "AU" "Australia/Perth" "-31.9505" "115.8605" "$((START_RANK + ADDED))" && ((ADDED++))

# Middle East
add_city "Abu Dhabi" "UAE" "AE" "Asia/Dubai" "24.4539" "54.3773" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Doha" "Qatar" "QA" "Asia/Qatar" "25.2854" "51.531" "$((START_RANK + ADDED))" && ((ADDED++))

# South America
add_city "Medellin" "Colombia" "CO" "America/Bogota" "6.2442" "-75.5812" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Lima" "Peru" "PE" "America/Lima" "-12.0464" "-77.0428" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Santiago" "Chile" "CL" "America/Santiago" "-33.4489" "-70.6693" "$((START_RANK + ADDED))" && ((ADDED++))

# Africa
add_city "Johannesburg" "South Africa" "ZA" "Africa/Johannesburg" "-26.2041" "28.0473" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Nairobi" "Kenya" "KE" "Africa/Nairobi" "-1.2921" "36.8219" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Cairo" "Egypt" "EG" "Africa/Cairo" "30.0444" "31.2357" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Lagos" "Nigeria" "NG" "Africa/Lagos" "6.5244" "3.3792" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Accra" "Ghana" "GH" "Africa/Accra" "5.6037" "-0.187" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Casablanca" "Morocco" "MA" "Africa/Casablanca" "33.5731" "-7.5898" "$((START_RANK + ADDED))" && ((ADDED++))

# Caribbean
add_city "Cancun" "Mexico" "MX" "America/Cancun" "21.1619" "-86.8515" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "San Juan" "Puerto Rico" "PR" "America/Puerto_Rico" "18.4655" "-66.1057" "$((START_RANK + ADDED))" && ((ADDED++))
add_city "Havana" "Cuba" "CU" "America/Havana" "23.1136" "-82.3666" "$((START_RANK + ADDED))" && ((ADDED++))

echo ""
echo "============================================================"
echo "🎉 Complete!"
echo ""
echo "   Cities added: ${ADDED}"

# Verify final count
FINAL_COUNT=$(curl -s -I "${SUPABASE_URL}/rest/v1/City?select=id" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Prefer: count=exact" | grep -i content-range | sed 's/.*\///' | tr -d '\r')

echo "   Total cities: ${FINAL_COUNT:-unknown}"
