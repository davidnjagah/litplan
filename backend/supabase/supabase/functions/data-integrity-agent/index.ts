/**
 * Data Integrity Agent - AI Agent for validating and correcting data
 * Validates addresses, coordinates, and details for plans and group flows
 * Uses OpenAI API
 *
 * Endpoints:
 * POST /data-integrity-agent/validate-plans - Validate plan data
 * POST /data-integrity-agent/validate-group-flows - Validate group flow data
 * POST /data-integrity-agent/validate-city - Validate all data for a city
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { openaiRequest, parseOpenAIJSON } from '../_shared/openai-client.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import {
  DATA_INTEGRITY_SYSTEM_PROMPT,
  VALIDATE_PLANS_PROMPT,
  VALIDATE_GROUP_FLOWS_PROMPT,
  CITY_BOUNDS,
} from './prompts.ts';

// Types
interface PlanValidationResult {
  id: string;
  validated: boolean;
  corrections?: {
    venueName?: string;
    address?: string;
    neighborhood?: string;
    latitude?: number;
    longitude?: number;
    priceRange?: string;
  };
  issues: string[];
  confidence: number;
}

interface GroupFlowValidationResult {
  flowId: string;
  validated: boolean;
  flowCorrections?: {
    title?: string;
  };
  stepCorrections?: {
    stepNumber: number;
    venueName?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  }[];
  issues: string[];
  confidence: number;
}

interface ValidationSummary {
  total: number;
  validated: number;
  corrected: number;
  flagged: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const action = pathParts[pathParts.length - 1];

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  const supabase = createServiceClient();

  try {
    const body = await req.json();

    switch (action) {
      case 'validate-plans':
        return await validatePlans(supabase, body);
      case 'validate-group-flows':
        return await validateGroupFlows(supabase, body);
      case 'validate-city':
        return await validateCity(supabase, body);
      default:
        // Default action: validate city if cityId provided
        if (body.cityId) {
          return await validateCity(supabase, body);
        }
        return errorResponse(`Unknown action: ${action}`, 400, 'BAD_REQUEST');
    }
  } catch (error) {
    console.error('[data-integrity-agent] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500, 'SERVER_ERROR');
  }
});

/**
 * Validate plans for a city
 */
async function validatePlans(
  supabase: ReturnType<typeof createServiceClient>,
  body: { cityId: string; cityName: string; country: string; planIds?: string[]; applyCorrections?: boolean }
) {
  const { cityId, cityName, country, planIds, applyCorrections = false } = body;

  if (!cityId || !cityName || !country) {
    return errorResponse('cityId, cityName, and country required', 400, 'BAD_REQUEST');
  }

  console.log(`[data-integrity-agent] Validating plans for ${cityName}, ${country}`);

  // Fetch plans to validate
  let query = supabase
    .from('Plan')
    .select('id, title, venueName, category, address, neighborhood, latitude, longitude, priceRange, entryFee')
    .eq('cityId', cityId);

  if (planIds && planIds.length > 0) {
    query = query.in('id', planIds);
  }

  const { data: plans, error: fetchError } = await query.limit(50);

  if (fetchError) {
    console.error('[data-integrity-agent] Error fetching plans:', fetchError);
    return errorResponse('Failed to fetch plans', 500, 'DATABASE_ERROR');
  }

  if (!plans || plans.length === 0) {
    return jsonResponse({
      success: true,
      data: {
        results: [],
        summary: { total: 0, validated: 0, corrected: 0, flagged: 0 },
      },
    });
  }

  console.log(`[data-integrity-agent] Validating ${plans.length} plans`);

  // Format plans for validation
  const plansForValidation = plans.map((plan) => ({
    id: plan.id,
    venueName: plan.venueName,
    title: plan.title,
    category: plan.category,
    address: plan.address,
    neighborhood: plan.neighborhood,
    latitude: plan.latitude,
    longitude: plan.longitude,
    priceRange: plan.priceRange,
  }));

  // Call OpenAI for validation
  const userPrompt = `${VALIDATE_PLANS_PROMPT(cityName, country)}

Plans to validate:
${JSON.stringify(plansForValidation, null, 2)}`;

  const response = await openaiRequest(
    [{ role: 'user', content: userPrompt }],
    {
      systemPrompt: DATA_INTEGRITY_SYSTEM_PROMPT,
      temperature: 0.3, // Lower temperature for more consistent validation
      maxTokens: 4096,
      jsonMode: true,
      model: 'gpt-4o',
    }
  );

  const validationResult = parseOpenAIJSON<{
    results: PlanValidationResult[];
    summary: ValidationSummary;
  }>(response);

  // Apply corrections if requested
  if (applyCorrections && validationResult.results) {
    const correctionsApplied = await applyPlanCorrections(supabase, validationResult.results);
    console.log(`[data-integrity-agent] Applied ${correctionsApplied} corrections`);
  }

  return jsonResponse({
    success: true,
    data: {
      cityId,
      cityName,
      results: validationResult.results,
      summary: validationResult.summary,
      correctionsApplied: applyCorrections,
    },
  });
}

/**
 * Validate group flows for a city
 */
async function validateGroupFlows(
  supabase: ReturnType<typeof createServiceClient>,
  body: { cityId: string; cityName: string; country: string; flowIds?: string[]; applyCorrections?: boolean }
) {
  const { cityId, cityName, country, flowIds, applyCorrections = false } = body;

  if (!cityId || !cityName || !country) {
    return errorResponse('cityId, cityName, and country required', 400, 'BAD_REQUEST');
  }

  console.log(`[data-integrity-agent] Validating group flows for ${cityName}, ${country}`);

  // Fetch group flows with steps
  let query = supabase
    .from('GroupFlow')
    .select(`
      id,
      title,
      subtitle,
      theme,
      steps:GroupFlowStep(
        id,
        stepNumber,
        venueName,
        address,
        neighborhood,
        latitude,
        longitude,
        startTime,
        endTime
      )
    `)
    .eq('cityId', cityId)
    .order('stepNumber', { foreignTable: 'GroupFlowStep', ascending: true });

  if (flowIds && flowIds.length > 0) {
    query = query.in('id', flowIds);
  }

  const { data: flows, error: fetchError } = await query.limit(20);

  if (fetchError) {
    console.error('[data-integrity-agent] Error fetching group flows:', fetchError);
    return errorResponse('Failed to fetch group flows', 500, 'DATABASE_ERROR');
  }

  if (!flows || flows.length === 0) {
    return jsonResponse({
      success: true,
      data: {
        results: [],
        summary: { total: 0, validated: 0, corrected: 0, flagged: 0 },
      },
    });
  }

  console.log(`[data-integrity-agent] Validating ${flows.length} group flows`);

  // Format flows for validation
  const flowsForValidation = flows.map((flow: any) => ({
    id: flow.id,
    title: flow.title,
    subtitle: flow.subtitle,
    theme: flow.theme,
    steps: (flow.steps || []).map((step: any) => ({
      stepNumber: step.stepNumber,
      venueName: step.venueName,
      address: step.address,
      neighborhood: step.neighborhood,
      latitude: step.latitude,
      longitude: step.longitude,
      startTime: step.startTime,
      endTime: step.endTime,
    })),
  }));

  // Call OpenAI for validation
  const userPrompt = `${VALIDATE_GROUP_FLOWS_PROMPT(cityName, country)}

Group flows to validate:
${JSON.stringify(flowsForValidation, null, 2)}`;

  const response = await openaiRequest(
    [{ role: 'user', content: userPrompt }],
    {
      systemPrompt: DATA_INTEGRITY_SYSTEM_PROMPT,
      temperature: 0.3,
      maxTokens: 4096,
      jsonMode: true,
      model: 'gpt-4o',
    }
  );

  const validationResult = parseOpenAIJSON<{
    results: GroupFlowValidationResult[];
    summary: ValidationSummary;
  }>(response);

  // Apply corrections if requested
  if (applyCorrections && validationResult.results) {
    const correctionsApplied = await applyGroupFlowCorrections(supabase, validationResult.results);
    console.log(`[data-integrity-agent] Applied ${correctionsApplied} group flow corrections`);
  }

  return jsonResponse({
    success: true,
    data: {
      cityId,
      cityName,
      results: validationResult.results,
      summary: validationResult.summary,
      correctionsApplied: applyCorrections,
    },
  });
}

/**
 * Validate all data for a city (plans + group flows)
 */
async function validateCity(
  supabase: ReturnType<typeof createServiceClient>,
  body: { cityId: string; cityName: string; country: string; applyCorrections?: boolean }
) {
  const { cityId, cityName, country, applyCorrections = false } = body;

  if (!cityId || !cityName || !country) {
    return errorResponse('cityId, cityName, and country required', 400, 'BAD_REQUEST');
  }

  console.log(`[data-integrity-agent] Full validation for ${cityName}, ${country}`);

  // Validate plans
  const plansResult = await validatePlans(supabase, { cityId, cityName, country, applyCorrections });
  const plansData = await plansResult.json();

  // Add delay to avoid rate limiting
  await sleep(1000);

  // Validate group flows
  const flowsResult = await validateGroupFlows(supabase, { cityId, cityName, country, applyCorrections });
  const flowsData = await flowsResult.json();

  // Check coordinates against city bounds
  const boundsCheck = checkCityBounds(cityName, plansData.data?.results || [], flowsData.data?.results || []);

  return jsonResponse({
    success: true,
    data: {
      cityId,
      cityName,
      country,
      plans: plansData.data,
      groupFlows: flowsData.data,
      boundsCheck,
      correctionsApplied: applyCorrections,
    },
  });
}

/**
 * Apply validated corrections to plans
 */
async function applyPlanCorrections(
  supabase: ReturnType<typeof createServiceClient>,
  results: PlanValidationResult[]
): Promise<number> {
  let applied = 0;

  for (const result of results) {
    if (result.corrections && Object.keys(result.corrections).length > 0 && result.confidence >= 70) {
      const { error } = await supabase
        .from('Plan')
        .update({
          ...(result.corrections.venueName && { venueName: result.corrections.venueName }),
          ...(result.corrections.address && { address: result.corrections.address }),
          ...(result.corrections.neighborhood && { neighborhood: result.corrections.neighborhood }),
          ...(result.corrections.latitude && { latitude: result.corrections.latitude }),
          ...(result.corrections.longitude && { longitude: result.corrections.longitude }),
          ...(result.corrections.priceRange && { priceRange: result.corrections.priceRange }),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', result.id);

      if (!error) {
        applied++;
        console.log(`[data-integrity-agent] Applied corrections to plan ${result.id}`);
      } else {
        console.error(`[data-integrity-agent] Failed to apply corrections to plan ${result.id}:`, error);
      }
    }
  }

  return applied;
}

/**
 * Apply validated corrections to group flows
 */
async function applyGroupFlowCorrections(
  supabase: ReturnType<typeof createServiceClient>,
  results: GroupFlowValidationResult[]
): Promise<number> {
  let applied = 0;

  for (const result of results) {
    // Apply flow corrections
    if (result.flowCorrections && Object.keys(result.flowCorrections).length > 0 && result.confidence >= 70) {
      const { error } = await supabase
        .from('GroupFlow')
        .update({
          ...(result.flowCorrections.title && { title: result.flowCorrections.title }),
          lastRefreshed: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', result.flowId);

      if (!error) {
        applied++;
      }
    }

    // Apply step corrections
    if (result.stepCorrections && result.stepCorrections.length > 0 && result.confidence >= 70) {
      for (const stepCorrection of result.stepCorrections) {
        // Find the step by flow ID and step number
        const { data: steps } = await supabase
          .from('GroupFlowStep')
          .select('id')
          .eq('groupFlowId', result.flowId)
          .eq('stepNumber', stepCorrection.stepNumber)
          .limit(1);

        if (steps && steps.length > 0) {
          const { error } = await supabase
            .from('GroupFlowStep')
            .update({
              ...(stepCorrection.venueName && { venueName: stepCorrection.venueName }),
              ...(stepCorrection.address && { address: stepCorrection.address }),
              ...(stepCorrection.latitude && { latitude: stepCorrection.latitude }),
              ...(stepCorrection.longitude && { longitude: stepCorrection.longitude }),
              updatedAt: new Date().toISOString(),
            })
            .eq('id', steps[0].id);

          if (!error) {
            applied++;
          }
        }
      }
    }
  }

  return applied;
}

/**
 * Check if coordinates fall within city bounds
 */
function checkCityBounds(
  cityName: string,
  planResults: PlanValidationResult[],
  flowResults: GroupFlowValidationResult[]
): { inBounds: number; outOfBounds: number; outOfBoundsIds: string[] } {
  const bounds = CITY_BOUNDS[cityName];
  const outOfBoundsIds: string[] = [];
  let inBounds = 0;
  let outOfBounds = 0;

  if (!bounds) {
    // No bounds defined for this city, skip check
    return { inBounds: planResults.length, outOfBounds: 0, outOfBoundsIds: [] };
  }

  // Check plan coordinates
  for (const result of planResults) {
    if (result.corrections?.latitude && result.corrections?.longitude) {
      const lat = result.corrections.latitude;
      const lng = result.corrections.longitude;

      if (lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng) {
        inBounds++;
      } else {
        outOfBounds++;
        outOfBoundsIds.push(result.id);
      }
    } else {
      inBounds++; // Assume existing coordinates are valid if not corrected
    }
  }

  return { inBounds, outOfBounds, outOfBoundsIds };
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
