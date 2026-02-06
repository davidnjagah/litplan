/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Discover City Edge Function
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Allows Pro users to discover cities that don't yet have plans.
 * Creates a discovery job and triggers the 7-agent pipeline in background.
 *
 * POST /discover-city
 * Body: { "cityName": "Barcelona", "country": "Spain" }
 * Headers: Authorization: Bearer <user_token>
 *
 * Responses:
 * - 200: City already has plans (returns plans)
 * - 202: Discovery started or subscribed to existing job
 * - 403: User is not Pro
 * - 400: Invalid request
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient, createAuthenticatedClient, getUserFromRequest } from '../_shared/supabase-client.ts';
import { gptRequest, parseGPTJSON } from '../_shared/gpt-client.ts';

// Types
interface DiscoverCityRequest {
  cityName: string;
  country: string;
  notifyPush?: boolean;
  notifyEmail?: boolean;
}

interface CityDiscoveryJob {
  id: string;
  cityName: string;
  country: string;
  requestedBy: string;
  status: string;
  plansGenerated?: number;
  createdAt: string;
}

// Generate a unique job ID
function generateJobId(cityName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const citySlug = cityName.toLowerCase().replace(/\s+/g, '-');
  return `discovery-${citySlug}-${timestamp}-${random}`;
}

// Check if user has Pro subscription
async function checkProStatus(userId: string, supabase: any): Promise<boolean> {
  // Check User table for subscription status
  const { data: user, error } = await supabase
    .from('User')
    .select('subscriptionStatus, subscriptionTier')
    .eq('id', userId)
    .single();

  if (error || !user) {
    console.log('[discover-city] Could not fetch user subscription status:', error?.message);
    // Default to checking if they have any active subscription
    return false;
  }

  // Check if user has an active subscription
  const activeStatuses = ['active', 'trialing', 'grace_period'];
  return activeStatuses.includes(user.subscriptionStatus?.toLowerCase() || '');
}

// Check if city already exists with plans
async function checkCityExists(cityName: string, country: string, supabase: any): Promise<{ exists: boolean; cityId?: string; hasPlans: boolean }> {
  // Search for the city in the database
  const { data: city, error } = await supabase
    .from('City')
    .select('id, name, country, planStatus')
    .ilike('name', cityName)
    .ilike('country', country)
    .single();

  if (error || !city) {
    return { exists: false, hasPlans: false };
  }

  // Check if there are GroupFlows for this city
  const { count, error: flowError } = await supabase
    .from('GroupFlow')
    .select('*', { count: 'exact', head: true })
    .eq('city', cityName);

  const hasPlans = (count || 0) > 0 || city.planStatus === 'available';

  return { exists: true, cityId: city.id, hasPlans };
}

// Check if there's an active discovery job for this city
async function getActiveDiscoveryJob(cityName: string, country: string, supabase: any): Promise<CityDiscoveryJob | null> {
  const { data: job, error } = await supabase
    .from('CityDiscoveryJob')
    .select('*')
    .ilike('cityName', cityName)
    .ilike('country', country)
    .in('status', ['pending', 'processing'])
    .single();

  if (error || !job) {
    return null;
  }

  return job;
}

// Subscribe user to an existing discovery job
async function subscribeToJob(jobId: string, userId: string, notifyPush: boolean, notifyEmail: boolean, supabase: any): Promise<void> {
  // Check if already subscribed
  const { data: existing } = await supabase
    .from('CityDiscoverySubscriber')
    .select('id')
    .eq('jobId', jobId)
    .eq('userId', userId)
    .single();

  if (existing) {
    console.log(`[discover-city] User ${userId} already subscribed to job ${jobId}`);
    return;
  }

  // Subscribe
  const { error } = await supabase
    .from('CityDiscoverySubscriber')
    .insert({
      jobId,
      userId,
      notifyPush,
      notifyEmail,
    });

  if (error) {
    console.error('[discover-city] Failed to subscribe user:', error.message);
    throw new Error('Failed to subscribe to discovery notifications');
  }

  console.log(`[discover-city] User ${userId} subscribed to job ${jobId}`);
}

// Create a new discovery job
async function createDiscoveryJob(cityName: string, country: string, userId: string, supabase: any): Promise<CityDiscoveryJob> {
  const jobId = generateJobId(cityName);

  const { data: job, error } = await supabase
    .from('CityDiscoveryJob')
    .insert({
      id: jobId,
      cityName,
      country,
      requestedBy: userId,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('[discover-city] Failed to create discovery job:', error.message);
    throw new Error('Failed to create discovery job');
  }

  console.log(`[discover-city] Created discovery job: ${jobId}`);
  return job;
}

// Generate city configuration using GPT
async function generateCityConfig(cityName: string, country: string): Promise<any> {
  const prompt = `You are a city expert. Generate configuration for ${cityName}, ${country} for a nightlife/entertainment app.

Return a JSON object with this exact structure:
{
  "cityName": "${cityName}",
  "country": "${country}",
  "currency": "USD/EUR/GBP/etc",
  "identity": "One sentence capturing the city's essence for nightlife",
  "vibe": "5-6 adjectives describing the city's atmosphere",
  "neighborhoods": ["List", "of", "8-12", "popular", "neighborhoods"],
  "coordRange": {
    "lat": [min_latitude, max_latitude],
    "lon": [min_longitude, max_longitude]
  },
  "legendaryVenues": "Comma-separated list of 10-15 famous bars, clubs, restaurants",
  "venueDetails": "Multi-line string with venue addresses and descriptions"
}

Be accurate with coordinates, currency, and venue names. Focus on real, popular venues.`;

  const response = await gptRequest([
    { role: 'system', content: 'You are a city expert. Respond only with valid JSON.' },
    { role: 'user', content: prompt }
  ], 'gpt-4o');

  return parseGPTJSON(response);
}

// Process discovery in background
async function processDiscoveryInBackground(
  jobId: string,
  cityName: string,
  country: string,
  supabase: any
): Promise<void> {
  try {
    console.log(`[discover-city] Starting background processing for ${cityName}, ${country}`);

    // Update job status to processing
    await supabase
      .from('CityDiscoveryJob')
      .update({
        status: 'processing',
        startedAt: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Generate city configuration
    console.log(`[discover-city] Generating city config for ${cityName}`);
    const cityConfig = await generateCityConfig(cityName, country);

    // Call the 7-agent pipeline
    console.log(`[discover-city] Calling 7-agent pipeline for ${cityName}`);

    // Get the Supabase URL and service role key for internal function call
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Import and run the pipeline logic directly (more efficient than HTTP call)
    // For now, we'll use HTTP call to the existing function
    const pipelineResponse = await fetch(`${SUPABASE_URL}/functions/v1/group-7agent-pipeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        city: cityName,
        storeResults: true,
        discoveryJobId: jobId,
        cityConfig: cityConfig, // Pass generated config
      }),
    });

    const pipelineResult = await pipelineResponse.json();

    if (!pipelineResponse.ok || !pipelineResult.success) {
      throw new Error(pipelineResult.error || 'Pipeline failed');
    }

    // Update job as completed
    await supabase
      .from('CityDiscoveryJob')
      .update({
        status: 'completed',
        completedAt: new Date().toISOString(),
        plansGenerated: pipelineResult.data?.totalStored || 0,
        result: pipelineResult.data,
      })
      .eq('id', jobId);

    // Update City planStatus to 'available' if city exists
    await supabase
      .from('City')
      .update({ planStatus: 'available' })
      .ilike('name', cityName)
      .ilike('country', country);

    console.log(`[discover-city] Discovery completed for ${cityName}. Plans generated: ${pipelineResult.data?.totalStored || 0}`);

    // Trigger notifications (via database trigger or separate call)
    await triggerNotifications(jobId, cityName, country, pipelineResult.data?.totalStored || 0, supabase);

  } catch (error) {
    console.error(`[discover-city] Discovery failed for ${cityName}:`, error);

    // Update job as failed
    await supabase
      .from('CityDiscoveryJob')
      .update({
        status: 'failed',
        completedAt: new Date().toISOString(),
        error: (error as Error).message,
      })
      .eq('id', jobId);

    // Still trigger notifications to inform subscribers of failure
    await triggerNotifications(jobId, cityName, country, 0, supabase, true);
  }
}

// Trigger notifications to all subscribers
async function triggerNotifications(
  jobId: string,
  cityName: string,
  country: string,
  plansGenerated: number,
  supabase: any,
  failed: boolean = false
): Promise<void> {
  try {
    // Get all subscribers
    const { data: subscribers, error } = await supabase
      .from('CityDiscoverySubscriber')
      .select(`
        userId,
        notifyPush,
        notifyEmail,
        User!inner (
          email,
          name
        )
      `)
      .eq('jobId', jobId);

    if (error || !subscribers || subscribers.length === 0) {
      console.log('[discover-city] No subscribers to notify');
      return;
    }

    console.log(`[discover-city] Notifying ${subscribers.length} subscribers`);

    // Get device tokens for push notifications
    const userIds = subscribers.filter((s: any) => s.notifyPush).map((s: any) => s.userId);

    if (userIds.length > 0) {
      const { data: deviceTokens } = await supabase
        .from('DeviceToken')
        .select('userId, token')
        .in('userId', userIds)
        .eq('isActive', true);

      // Queue push notifications
      if (deviceTokens && deviceTokens.length > 0) {
        console.log(`[discover-city] Queuing ${deviceTokens.length} push notifications`);
        // Push notifications will be sent via the send-notification function
        await queuePushNotifications(deviceTokens, cityName, plansGenerated, failed, supabase);
      }
    }

    // Queue email notifications
    const emailSubscribers = subscribers.filter((s: any) => s.notifyEmail && s.User?.email);
    if (emailSubscribers.length > 0) {
      console.log(`[discover-city] Queuing ${emailSubscribers.length} email notifications`);
      await queueEmailNotifications(emailSubscribers, cityName, country, plansGenerated, failed, supabase);
    }

  } catch (error) {
    console.error('[discover-city] Failed to trigger notifications:', error);
  }
}

// Queue push notifications
async function queuePushNotifications(
  deviceTokens: { userId: string; token: string }[],
  cityName: string,
  plansGenerated: number,
  failed: boolean,
  supabase: any
): Promise<void> {
  const title = failed
    ? `${cityName} Discovery Failed`
    : `${cityName} is Ready!`;

  const body = failed
    ? `We couldn't generate plans for ${cityName}. We'll try again soon.`
    : `${plansGenerated} amazing plans are now available in ${cityName}. Start exploring!`;

  // Call the send-notification function
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  for (const { token } of deviceTokens) {
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          type: 'push',
          token,
          title,
          body,
          data: {
            type: 'city_discovery',
            cityName,
            action: failed ? 'discovery_failed' : 'discovery_complete',
          },
        }),
      });
    } catch (error) {
      console.error(`[discover-city] Failed to send push to token:`, error);
    }
  }
}

// Queue email notifications
async function queueEmailNotifications(
  subscribers: any[],
  cityName: string,
  country: string,
  plansGenerated: number,
  failed: boolean,
  supabase: any
): Promise<void> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  for (const subscriber of subscribers) {
    const email = subscriber.User?.email;
    const name = subscriber.User?.name || 'there';

    if (!email) continue;

    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          type: 'email',
          to: email,
          subject: failed
            ? `${cityName} Discovery Update`
            : `${cityName} is Now Available on LitPlanz!`,
          templateData: {
            name,
            cityName,
            country,
            plansGenerated,
            failed,
          },
        }),
      });
    } catch (error) {
      console.error(`[discover-city] Failed to send email to ${email}:`, error);
    }
  }
}

// Main handler
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCors(req);
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user) {
      return errorResponse('Authentication required', 401);
    }

    // Parse request body
    const body: DiscoverCityRequest = await req.json();
    const { cityName, country, notifyPush = true, notifyEmail = true } = body;

    // Validate input
    if (!cityName || !country) {
      return errorResponse('cityName and country are required', 400);
    }

    const supabase = createServiceClient();

    // Check if user is Pro
    const isPro = await checkProStatus(user.id, supabase);
    if (!isPro) {
      return errorResponse('Pro subscription required to discover new cities', 403);
    }

    // Check if city already exists with plans
    const cityCheck = await checkCityExists(cityName, country, supabase);
    if (cityCheck.hasPlans) {
      // Return existing plans
      const { data: plans } = await supabase
        .from('GroupFlow')
        .select('*')
        .ilike('city', cityName)
        .limit(20);

      return jsonResponse({
        success: true,
        status: 'available',
        message: `${cityName} already has plans available`,
        cityId: cityCheck.cityId,
        plans: plans || [],
      });
    }

    // Check if there's an active discovery job
    const activeJob = await getActiveDiscoveryJob(cityName, country, supabase);
    if (activeJob) {
      // Subscribe user to existing job
      await subscribeToJob(activeJob.id, user.id, notifyPush, notifyEmail, supabase);

      return jsonResponse({
        success: true,
        status: 'in_progress',
        message: `Discovery already in progress for ${cityName}. You'll be notified when it's ready.`,
        jobId: activeJob.id,
        startedAt: activeJob.createdAt,
      }, 202);
    }

    // Create new discovery job
    const job = await createDiscoveryJob(cityName, country, user.id, supabase);

    // Subscribe the requester
    await subscribeToJob(job.id, user.id, notifyPush, notifyEmail, supabase);

    // Start background processing
    const processingPromise = processDiscoveryInBackground(job.id, cityName, country, supabase);

    // Use EdgeRuntime.waitUntil if available
    try {
      if (typeof EdgeRuntime !== 'undefined' && (EdgeRuntime as any).waitUntil) {
        (EdgeRuntime as any).waitUntil(processingPromise);
      }
    } catch (e) {
      console.log('[discover-city] EdgeRuntime.waitUntil not available, processing will continue');
    }

    // Return immediately
    return jsonResponse({
      success: true,
      status: 'started',
      message: `Discovery started for ${cityName}, ${country}. You'll be notified when plans are ready.`,
      jobId: job.id,
      estimatedTime: '5-10 minutes',
    }, 202);

  } catch (error) {
    console.error('[discover-city] Error:', error);
    return errorResponse((error as Error).message || 'Internal server error', 500);
  }
});
