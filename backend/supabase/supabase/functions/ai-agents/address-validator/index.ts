/**
 * Agent 3: Address Validator
 *
 * Triple-checks all venue addresses in group plans.
 * Searches for correct addresses when wrong.
 * Removes plans with uncorrectable addresses.
 *
 * POST /ai-agents/address-validator
 * Body: { cityId, flowIds? }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../../_shared/cors.ts';
import { gptRequest, parseGPTJSON } from '../../_shared/gpt-client.ts';
import { createServiceClient } from '../../_shared/supabase-client.ts';

interface AddressValidation {
  stepId: string;
  venueName: string;
  originalAddress: string;
  isValid: boolean;
  correctedAddress?: string;
  correctedCoordinates?: {
    latitude: number;
    longitude: number;
  };
  confidence: 'high' | 'medium' | 'low' | 'failed';
  reasoning: string;
}

interface FlowValidationResult {
  flowId: string;
  title: string;
  allAddressesValid: boolean;
  addressResults: AddressValidation[];
  removed: boolean;
  removalReason?: string;
}

interface AgentResult {
  cityId: string;
  totalFlowsProcessed: number;
  addressesValidated: number;
  addressesCorrected: number;
  flowsRemoved: number;
  results: FlowValidationResult[];
}

const ADDRESS_VALIDATOR_SYSTEM_PROMPT = `You are an expert at verifying and correcting venue addresses for nightlife establishments.

Your task is to VERIFY that each venue address is:
1. REAL and ACCURATE - The address actually exists
2. CORRECTLY FORMATTED - Includes street number, street name, city, postal code
3. MATCHES THE VENUE - The venue is actually located at this address
4. HAS CORRECT COORDINATES - Latitude and longitude are accurate

ADDRESS FORMAT REQUIREMENTS:
- US: "123 Main St, City, ST 12345" (number, street, city, state abbrev, ZIP)
- UK: "123 High Street, London, W1A 1AA" (number, street, city, postcode)
- Spain: "Calle Mayor, 123, 28013 Madrid" (street name, number, postal code, city)
- France: "123 Rue de la Paix, 75001 Paris" (number, street, postal code, city)
- Germany: "Hauptstraße 123, 10117 Berlin" (street name + number, postal code, city)

For each venue, determine:
1. Is the address format correct for this country?
2. Does this address actually exist?
3. Is this venue really at this address?
4. Are the GPS coordinates accurate for this address?

If an address is WRONG:
- Search your knowledge for the CORRECT address
- Provide the corrected address in the proper format
- Provide accurate GPS coordinates
- Rate your confidence: high, medium, low, or failed

If you CANNOT find the correct address:
- Set confidence to "failed"
- The plan will be removed

RESPOND IN JSON FORMAT ONLY.`;

const VALIDATE_ADDRESSES_PROMPT = (venueName: string, address: string, coordinates: any, cityName: string, country: string) => `
VERIFY this venue address for ${cityName}, ${country}:

VENUE: "${venueName}"
GIVEN ADDRESS: ${address}
GIVEN COORDINATES: ${coordinates.latitude}, ${coordinates.longitude}

VERIFICATION TASKS:
1. Does this venue "${venueName}" exist in ${cityName}?
2. Is the address correctly formatted for ${country}?
3. Is the address accurate for this venue?
4. Are the coordinates correct (within 100 meters of the actual location)?

If the address is WRONG or INCOMPLETE:
- Search for the CORRECT address
- Provide it in the proper format for ${country}
- Provide accurate GPS coordinates

Return JSON:
{
  "isValid": true/false,
  "venueExists": true/false,
  "addressFormatCorrect": true/false,
  "addressAccurate": true/false,
  "coordinatesAccurate": true/false,
  "correctedAddress": "Full correct address if wrong, null if correct",
  "correctedCoordinates": {
    "latitude": 40.1234,
    "longitude": -74.5678
  },
  "confidence": "high|medium|low|failed",
  "reasoning": "Brief explanation of findings and any corrections made"
}`;

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    const body = await req.json();
    const { cityId, cityName, country, flowIds, batchSize = 3 } = body;

    if (!cityId) {
      return errorResponse('cityId required', 400, 'BAD_REQUEST');
    }

    console.log(`[address-validator] Starting address validation for ${cityName || cityId}`);

    const supabase = createServiceClient();
    const result: AgentResult = {
      cityId,
      totalFlowsProcessed: 0,
      addressesValidated: 0,
      addressesCorrected: 0,
      flowsRemoved: 0,
      results: [],
    };

    // Get flows at step 2 (details validated)
    let query = supabase
      .from('GroupFlow')
      .select('*')
      .eq('cityId', cityId)
      .eq('pipelineStep', 2)
      .in('pipelineStatus', ['details_validated', 'details_corrected']);

    if (flowIds && flowIds.length > 0) {
      query = query.in('id', flowIds);
    }

    const { data: flows, error: flowsError } = await query.limit(30);

    if (flowsError) {
      return errorResponse('Failed to fetch flows', 500, 'DATABASE_ERROR');
    }

    if (!flows || flows.length === 0) {
      return jsonResponse({
        success: true,
        message: 'No flows to validate addresses',
        data: result,
      });
    }

    console.log(`[address-validator] Found ${flows.length} flows to validate`);

    // Get city info for country context
    const { data: city } = await supabase
      .from('City')
      .select('name, country')
      .eq('id', cityId)
      .single();

    const actualCityName = cityName || city?.name || 'Unknown';
    const actualCountry = country || city?.country || 'Unknown';

    // Process flows
    for (let i = 0; i < flows.length; i += batchSize) {
      const batch = flows.slice(i, i + batchSize);

      for (const flow of batch) {
        try {
          const flowResult = await validateFlowAddresses(
            supabase,
            flow,
            actualCityName,
            actualCountry
          );

          result.results.push(flowResult);
          result.totalFlowsProcessed++;

          if (flowResult.removed) {
            result.flowsRemoved++;
          } else {
            result.addressesValidated += flowResult.addressResults.filter(a => a.isValid).length;
            result.addressesCorrected += flowResult.addressResults.filter(a => a.correctedAddress).length;
          }

        } catch (error) {
          console.error(`[address-validator] Error validating ${flow.title}:`, error);
        }
      }

      // Delay between batches to avoid rate limiting
      if (i + batchSize < flows.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`[address-validator] Complete: ${result.addressesValidated} validated, ${result.addressesCorrected} corrected, ${result.flowsRemoved} flows removed`);

    return jsonResponse({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('[address-validator] Error:', error);
    return errorResponse((error as Error).message, 500, 'SERVER_ERROR');
  }
});

/**
 * Validate all addresses in a flow
 */
async function validateFlowAddresses(
  supabase: any,
  flow: any,
  cityName: string,
  country: string
): Promise<FlowValidationResult> {
  // Get steps for this flow
  const { data: steps } = await supabase
    .from('GroupFlowStep')
    .select('*')
    .eq('flowId', flow.id)
    .order('stepNumber', { ascending: true });

  if (!steps || steps.length === 0) {
    await removeFlow(supabase, flow.id);
    return {
      flowId: flow.id,
      title: flow.title,
      allAddressesValid: false,
      addressResults: [],
      removed: true,
      removalReason: 'No activities found',
    };
  }

  const addressResults: AddressValidation[] = [];
  let failedAddresses = 0;

  // Validate each step's address
  for (const step of steps) {
    try {
      const validation = await validateSingleAddress(
        step.venueName,
        step.address,
        { latitude: step.latitude, longitude: step.longitude },
        cityName,
        country
      );

      const addressResult: AddressValidation = {
        stepId: step.id,
        venueName: step.venueName,
        originalAddress: step.address,
        isValid: validation.isValid,
        confidence: validation.confidence,
        reasoning: validation.reasoning,
      };

      if (validation.correctedAddress) {
        addressResult.correctedAddress = validation.correctedAddress;
      }

      if (validation.correctedCoordinates) {
        addressResult.correctedCoordinates = validation.correctedCoordinates;
      }

      if (validation.confidence === 'failed') {
        failedAddresses++;
      }

      // Apply corrections if we have them
      if (validation.correctedAddress || validation.correctedCoordinates) {
        await applyAddressCorrection(supabase, step.id, validation);
      }

      addressResults.push(addressResult);

      // Small delay between API calls
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`[address-validator] Error validating ${step.venueName}:`, error);
      addressResults.push({
        stepId: step.id,
        venueName: step.venueName,
        originalAddress: step.address,
        isValid: false,
        confidence: 'failed',
        reasoning: (error as Error).message,
      });
      failedAddresses++;
    }
  }

  // If more than 50% of addresses failed, remove the entire flow
  if (failedAddresses > steps.length / 2) {
    await removeFlow(supabase, flow.id);
    return {
      flowId: flow.id,
      title: flow.title,
      allAddressesValid: false,
      addressResults,
      removed: true,
      removalReason: `${failedAddresses}/${steps.length} addresses could not be verified`,
    };
  }

  // If any single address completely failed, we need to remaster the plan
  // by removing that step and potentially regenerating
  for (const result of addressResults) {
    if (result.confidence === 'failed') {
      // Remove this step from the flow
      await removeStep(supabase, result.stepId);

      // If we now have less than 2 steps, remove the whole flow
      const { count } = await supabase
        .from('GroupFlowStep')
        .select('*', { count: 'exact', head: true })
        .eq('flowId', flow.id);

      if (count < 2) {
        await removeFlow(supabase, flow.id);
        return {
          flowId: flow.id,
          title: flow.title,
          allAddressesValid: false,
          addressResults,
          removed: true,
          removalReason: 'Too few valid venues after removing invalid addresses',
        };
      }

      // Renumber remaining steps
      await renumberSteps(supabase, flow.id);
    }
  }

  // Update pipeline status
  await supabase
    .from('GroupFlow')
    .update({
      pipelineStep: 3,
      pipelineStatus: 'addresses_validated',
      updatedAt: new Date().toISOString(),
    })
    .eq('id', flow.id);

  return {
    flowId: flow.id,
    title: flow.title,
    allAddressesValid: addressResults.every(a => a.isValid),
    addressResults,
    removed: false,
  };
}

/**
 * Validate a single address using Claude
 */
async function validateSingleAddress(
  venueName: string,
  address: string,
  coordinates: { latitude: number; longitude: number },
  cityName: string,
  country: string
): Promise<{
  isValid: boolean;
  correctedAddress?: string;
  correctedCoordinates?: { latitude: number; longitude: number };
  confidence: 'high' | 'medium' | 'low' | 'failed';
  reasoning: string;
}> {
  const response = await gptRequest(
    [{ role: 'user', content: VALIDATE_ADDRESSES_PROMPT(venueName, address, coordinates, cityName, country) }],
    {
      systemPrompt: ADDRESS_VALIDATOR_SYSTEM_PROMPT,
      temperature: 0.2, // Very low for consistent, accurate responses
      maxTokens: 1024,
      jsonMode: true,
    }
  );

  const result = parseGPTJSON<{
    isValid: boolean;
    venueExists: boolean;
    addressFormatCorrect: boolean;
    addressAccurate: boolean;
    coordinatesAccurate: boolean;
    correctedAddress: string | null;
    correctedCoordinates: { latitude: number; longitude: number } | null;
    confidence: 'high' | 'medium' | 'low' | 'failed';
    reasoning: string;
  }>(response);

  // If venue doesn't exist, mark as failed
  if (!result.venueExists) {
    return {
      isValid: false,
      confidence: 'failed',
      reasoning: `Venue "${venueName}" does not appear to exist in ${cityName}`,
    };
  }

  return {
    isValid: result.isValid,
    correctedAddress: result.correctedAddress || undefined,
    correctedCoordinates: result.correctedCoordinates || undefined,
    confidence: result.confidence,
    reasoning: result.reasoning,
  };
}

/**
 * Apply address correction to a step
 */
async function applyAddressCorrection(
  supabase: any,
  stepId: string,
  validation: {
    correctedAddress?: string;
    correctedCoordinates?: { latitude: number; longitude: number };
  }
): Promise<void> {
  const updates: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (validation.correctedAddress) {
    updates.address = validation.correctedAddress;
  }

  if (validation.correctedCoordinates) {
    updates.latitude = validation.correctedCoordinates.latitude;
    updates.longitude = validation.correctedCoordinates.longitude;
  }

  await supabase
    .from('GroupFlowStep')
    .update(updates)
    .eq('id', stepId);

  console.log(`[address-validator] Corrected address for step ${stepId}`);
}

/**
 * Remove a flow and its steps
 */
async function removeFlow(supabase: any, flowId: string): Promise<void> {
  await supabase.from('GroupFlowStep').delete().eq('flowId', flowId);
  await supabase.from('GroupFlow').delete().eq('id', flowId);
  console.log(`[address-validator] Removed flow: ${flowId}`);
}

/**
 * Remove a single step
 */
async function removeStep(supabase: any, stepId: string): Promise<void> {
  await supabase.from('GroupFlowStep').delete().eq('id', stepId);
  console.log(`[address-validator] Removed step: ${stepId}`);
}

/**
 * Renumber steps after removal
 */
async function renumberSteps(supabase: any, flowId: string): Promise<void> {
  const { data: steps } = await supabase
    .from('GroupFlowStep')
    .select('id')
    .eq('flowId', flowId)
    .order('stepNumber', { ascending: true });

  if (!steps) return;

  for (let i = 0; i < steps.length; i++) {
    await supabase
      .from('GroupFlowStep')
      .update({ stepNumber: i + 1 })
      .eq('id', steps[i].id);
  }
}
