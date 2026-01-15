/**
 * Test function for Google Places venue validation
 * Tests the searchVenue function with real venue names
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { searchVenue } from '../_shared/google-places-client.ts';

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    // Check if API key is configured
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    const apiKeyStatus = apiKey
      ? `Configured (${apiKey.substring(0, 10)}...)`
      : 'NOT CONFIGURED - Set GOOGLE_PLACES_API_KEY in Supabase secrets';

    console.log(`[TEST] GOOGLE_PLACES_API_KEY: ${apiKeyStatus}`);

    const body = await req.json();
    const { venues, city, country } = body;

    // First, do a direct API test to verify the key works
    let directApiTest = null;
    if (apiKey) {
      try {
        const testQuery = encodeURIComponent("Blue Note Jazz Club New York");
        const testUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${testQuery}&key=${apiKey}`;
        console.log(`[TEST] Direct API test URL: ${testUrl.replace(apiKey, 'REDACTED')}`);
        const directResponse = await fetch(testUrl);
        const directData = await directResponse.json();
        directApiTest = {
          status: directData.status,
          resultsCount: directData.results?.length || 0,
          errorMessage: directData.error_message || null,
          firstResult: directData.results?.[0]?.name || null
        };
        console.log(`[TEST] Direct API response:`, JSON.stringify(directApiTest));
      } catch (e) {
        directApiTest = { error: e instanceof Error ? e.message : 'Unknown error' };
      }
    }

    // Default test venues if none provided
    const testVenues = venues || [
      "Blue Note Jazz Club",
      "The Standard High Line",
      "Katz's Delicatessen",
      "Employees Only",
      "Death & Co"
    ];

    const testCity = city || "New York";
    const testCountry = country || "USA";

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`GOOGLE PLACES VENUE TEST`);
    console.log(`City: ${testCity}, ${testCountry}`);
    console.log(`Testing ${testVenues.length} venues`);
    console.log(`${'═'.repeat(60)}\n`);

    const results: Array<{
      searchedName: string;
      found: boolean;
      googleName?: string;
      address?: string;
      rating?: number;
      confidence?: string;
      googleMapsUrl?: string;
      error?: string;
    }> = [];

    for (const venueName of testVenues) {
      console.log(`\n--- Testing: "${venueName}" ---`);

      try {
        const result = await searchVenue(venueName, testCity, testCountry);

        console.log(`[DEBUG] Result for "${venueName}":`, JSON.stringify(result));

        if (result && result.isVerified && result.confidence !== 'not_found') {
          results.push({
            searchedName: venueName,
            found: true,
            googleName: result.venueName,
            address: result.address,
            rating: result.rating,
            confidence: result.confidence,
            googleMapsUrl: result.googleMapsUrl
          });
          console.log(`✅ FOUND: ${result.venueName}`);
          console.log(`   Address: ${result.address}`);
          console.log(`   Rating: ${result.rating || 'N/A'}`);
          console.log(`   Confidence: ${result.confidence}`);
        } else {
          // Include the actual result to see what Google returned
          results.push({
            searchedName: venueName,
            found: false,
            error: 'Not found on Google Places',
            rawResult: result ? {
              venueName: result.venueName,
              isVerified: result.isVerified,
              confidence: result.confidence,
              address: result.address
            } : null
          });
          console.log(`❌ NOT FOUND: ${venueName}`);
          console.log(`   Raw result:`, result);
        }

        // Small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        results.push({
          searchedName: venueName,
          found: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log(`❌ ERROR: ${venueName} - ${error}`);
      }
    }

    const foundCount = results.filter(r => r.found).length;
    const notFoundCount = results.filter(r => !r.found).length;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`TEST COMPLETE`);
    console.log(`Found: ${foundCount}/${testVenues.length}`);
    console.log(`Not Found: ${notFoundCount}/${testVenues.length}`);
    console.log(`${'═'.repeat(60)}\n`);

    return jsonResponse({
      success: true,
      apiKeyStatus: apiKey ? 'configured' : 'NOT_CONFIGURED',
      directApiTest,
      summary: {
        totalTested: testVenues.length,
        found: foundCount,
        notFound: notFoundCount,
        successRate: `${Math.round((foundCount / testVenues.length) * 100)}%`
      },
      results
    });

  } catch (error) {
    console.error('[TEST] Error:', error);
    return errorResponse(
      'Test failed',
      500,
      'TEST_ERROR'
    );
  }
});
