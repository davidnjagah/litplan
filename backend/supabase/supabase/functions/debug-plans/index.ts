/**
 * Debug Plans Endpoint
 * Diagnostic endpoint to understand plan storage and retrieval issues
 *
 * GET /debug-plans - Get comprehensive plan diagnostics
 * GET /debug-plans?cityId=xxx - Get plans for a specific city
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'GET') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    const url = new URL(req.url);
    const cityId = url.searchParams.get('cityId');
    const cityName = url.searchParams.get('cityName');

    const supabase = createServiceClient();
    const diagnostics: any = {};

    // 1. Get all cities
    const { data: cities, error: citiesError } = await supabase
      .from('City')
      .select('id, name, country')
      .order('name');

    diagnostics.cities = {
      count: cities?.length || 0,
      error: citiesError?.message,
      list: cities?.map(c => ({ id: c.id, name: c.name, country: c.country })) || [],
    };

    // 2. Get total plan count
    const { count: totalPlanCount, error: planCountError } = await supabase
      .from('Plan')
      .select('*', { count: 'exact', head: true });

    diagnostics.totalPlans = {
      count: totalPlanCount || 0,
      error: planCountError?.message,
    };

    // 3. Get plan count by city
    const plansByCity: any[] = [];
    for (const city of cities || []) {
      const { count } = await supabase
        .from('Plan')
        .select('*', { count: 'exact', head: true })
        .eq('cityId', city.id);

      if ((count || 0) > 0) {
        plansByCity.push({
          cityId: city.id,
          cityName: city.name,
          planCount: count,
        });
      }
    }
    diagnostics.plansByCity = plansByCity;

    // 4. Get sample plans (first 10)
    const { data: samplePlans, error: sampleError } = await supabase
      .from('Plan')
      .select('id, title, venueName, cityId, date, weekday, aiGenerated, source')
      .order('createdAt', { ascending: false })
      .limit(10);

    diagnostics.samplePlans = {
      count: samplePlans?.length || 0,
      error: sampleError?.message,
      plans: samplePlans || [],
    };

    // 5. If cityId provided, get specific city's plans
    if (cityId) {
      const { data: cityData } = await supabase
        .from('City')
        .select('id, name')
        .eq('id', cityId)
        .single();

      const { data: cityPlans, count, error: cityPlansError } = await supabase
        .from('Plan')
        .select('*', { count: 'exact' })
        .eq('cityId', cityId)
        .order('date', { ascending: true })
        .limit(50);

      diagnostics.queriedCity = {
        cityId,
        cityName: cityData?.name,
        found: !!cityData,
        planCount: count,
        plansReturned: cityPlans?.length || 0,
        error: cityPlansError?.message,
        plans: cityPlans?.map(p => ({
          id: p.id,
          title: p.title,
          venueName: p.venueName,
          date: p.date,
          weekday: p.weekday,
          aiGenerated: p.aiGenerated,
          source: p.source,
        })) || [],
      };
    }

    // 6. If cityName provided, look up by name
    if (cityName) {
      const { data: cityByName } = await supabase
        .from('City')
        .select('id, name')
        .eq('name', cityName)
        .single();

      if (cityByName) {
        const { data: cityPlans, count } = await supabase
          .from('Plan')
          .select('id, title, venueName, cityId, date', { count: 'exact' })
          .eq('cityId', cityByName.id)
          .limit(50);

        diagnostics.queriedByName = {
          cityName,
          cityId: cityByName.id,
          found: true,
          planCount: count,
          plans: cityPlans || [],
        };
      } else {
        diagnostics.queriedByName = {
          cityName,
          found: false,
          message: `City "${cityName}" not found in database`,
        };
      }
    }

    // 7. Check for plans with pattern matching (like the 6-agent plans)
    const { data: aiAgentPlans, count: aiAgentCount } = await supabase
      .from('Plan')
      .select('id, title, cityId, source', { count: 'exact' })
      .like('id', 'plan-%agent%')
      .limit(20);

    diagnostics.aiAgentPlans = {
      count: aiAgentCount,
      plans: aiAgentPlans || [],
    };

    return jsonResponse({
      success: true,
      timestamp: new Date().toISOString(),
      diagnostics,
    });

  } catch (error) {
    console.error('[debug-plans] Error:', error);
    return errorResponse((error as Error).message, 500, 'SERVER_ERROR');
  }
});
