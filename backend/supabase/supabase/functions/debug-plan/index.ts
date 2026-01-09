/**
 * Debug endpoint to test plan generation and insertion
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { generatePlanWithClaude } from '../_shared/claude-client.ts';
import { validatePlan, generatePlanId, isWeekend } from '../_shared/plan-schema.ts';
import { GENERATOR_SYSTEM_PROMPT } from '../ai-agents/plan-generator/prompts.ts';

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabase = createServiceClient();

  try {
    // Get first city from database
    const { data: cities, error: cityError } = await supabase
      .from('City')
      .select('id, name, country')
      .limit(1);

    if (cityError || !cities || cities.length === 0) {
      return jsonResponse({ success: false, error: 'No cities found', cityError });
    }

    const city = cities[0];
    const date = '2026-02-03';
    const dayOfWeek = 'Tuesday';

    console.log('[debug-plan] Generating plan for:', city.name);

    const generatedPlan = await generatePlanWithClaude(
      city.name,
      city.country,
      date,
      dayOfWeek,
      GENERATOR_SYSTEM_PROMPT
    );

    console.log('[debug-plan] Plan generated:', JSON.stringify(generatedPlan));

    const validation = validatePlan(generatedPlan);

    // Create plan object matching database schema
    const plan = {
      id: generatePlanId(city.id, date),
      planId: `${city.id.substring(0, 8)}-${date.replace(/-/g, '')}-ai`,
      cityId: city.id,
      rank: 1,
      title: generatedPlan.title,
      venueName: generatedPlan.venueName,
      description: generatedPlan.description,
      category: generatedPlan.category,
      type: 'EVENT',
      heroImage: null,
      thumbnailImage: null,
      galleryImages: [],
      address: generatedPlan.location?.address || '',
      neighborhood: generatedPlan.location?.neighborhood || '',
      googleMapsUrl: null,
      latitude: generatedPlan.location?.coordinates?.latitude || null,
      longitude: generatedPlan.location?.coordinates?.longitude || null,
      date: date,
      startTime: generatedPlan.schedule?.startTime || '20:00',
      endTime: generatedPlan.schedule?.endTime || null,
      isWeekend: isWeekend(dayOfWeek),
      weekday: dayOfWeek,
      entryFee: generatedPlan.pricing?.entryFee || 0,
      currency: 'USD',
      priceRange: generatedPlan.pricing?.priceRange || '$$',
      freeEntry: (generatedPlan.pricing?.entryFee || 0) === 0,
      genres: generatedPlan.aiTags?.slice(0, 3) || [],
      vibes: generatedPlan.aiTags?.slice(3, 6) || [],
      eventType: generatedPlan.category,
      isIndividual: true,
      isGroup: true,
      isFeatured: false,
      averageRating: null,
      totalReviews: 0,
      reviewSource: null,
      source: 'AI Generated',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      aiGenerated: true,
      qualityScore: 100,
      generatedAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
    };

    // Try to insert
    const { data: insertData, error: insertError } = await supabase
      .from('Plan')
      .insert(plan)
      .select();

    return jsonResponse({
      success: !insertError,
      city,
      generatedPlan,
      validation,
      planToInsert: plan,
      insertResult: insertData,
      insertError: insertError,
    });
  } catch (error) {
    const err = error as Error;
    console.error('[debug-plan] Error:', err.message, err.stack);
    return jsonResponse({
      success: false,
      error: err.message,
      stack: err.stack,
    });
  }
});
