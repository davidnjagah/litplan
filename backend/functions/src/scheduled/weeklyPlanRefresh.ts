/**
 * Monthly Plan Refresh - Scheduled Function
 *
 * This Cloud Function runs on the 1st of every month at 00:00 UTC to refresh
 * nightlife plans for all active cities using AI generation via Claude/Anthropic.
 *
 * Schedule: 1st of every month at 00:00 UTC (cron: '0 0 1 * *')
 * Purpose: Generate fresh, AI-powered nightlife plans and group flows
 *
 * Cost Optimization: Changed from weekly to monthly to reduce AI API costs by 75%
 * - Weekly: ~$520/month (12,000 API calls)
 * - Monthly: ~$130/month (3,000 API calls)
 *
 * Sprint 4, Day 16 (Updated for monthly schedule)
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Anthropic from '@anthropic-ai/sdk';
import { Plan } from '../models/Plan';
import { GroupFlow } from '../models/GroupFlow';
import {
  ExternalServiceError,
  DatabaseError,
  ValidationError,
} from '../utils/errors';

/**
 * Weekly Plan Refresh Job Result Interface
 */
interface RefreshJobResult {
  success: boolean;
  totalPlansGenerated: number;
  totalGroupFlowsGenerated: number;
  errors: number;
  citiesProcessed: number;
  citiesFailed: number;
  duration: number;
  timestamp: string;
  errorDetails?: Array<{ cityId: string; error: string }>;
}

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000, // 1 second
  maxDelayMs: 8000, // 8 seconds max
  timeout: 10000, // 10 seconds timeout for API calls
};

/**
 * Batch processing configuration (Day 18 optimization)
 */
const BATCH_CONFIG = {
  citiesPerBatch: 5, // Process 5 cities in parallel
  progressLogInterval: 10, // Log progress every 10 cities
};

/**
 * Exponential backoff retry helper
 * Retries failed operations with exponential backoff (1s, 2s, 4s)
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  operationName: string,
  retries: number = RETRY_CONFIG.maxRetries
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      const isRetryable =
        error instanceof ExternalServiceError && error.retryable;

      // Don't retry non-retryable errors
      if (!isRetryable && attempt > 0) {
        throw error;
      }

      // Don't retry if it's the last attempt
      if (attempt === retries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
        RETRY_CONFIG.maxDelayMs
      );

      console.warn(
        `${operationName} failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`,
        { error: error instanceof Error ? error.message : error }
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error(`${operationName} failed after ${retries} retries`);
}

/**
 * AI-Generated Plan (raw format from Claude)
 */
interface AIGeneratedPlan {
  title: string;
  venueName: string;
  description: string;
  startTime: string;
  duration: number; // in minutes
  entryFee: string; // e.g., '$', '$$', '$$$'
  vibe: string;
  tags: string[];
  category?: string;
}

/**
 * AI-Generated Group Flow (raw format from Claude)
 */
interface AIGeneratedGroupFlow {
  title: string;
  description: string;
  activities: Array<{
    venueName: string;
    description: string;
    startTime: string;
    duration: number;
    order: number;
  }>;
  totalDuration: number;
  estimatedCost: {
    min: number;
    max: number;
    currency: string;
  };
  difficulty: 'easy' | 'moderate' | 'intense';
  bestFor: string[];
}

/**
 * Main Scheduled Function
 * Runs on the 1st of every month at 00:00 UTC to refresh nightlife plans
 *
 * Disabled 2026-05-11: Explore screen removed to reduce costs (~$130/month).
 * Re-enable when Explore screen is reintroduced or user count justifies generation.
 * To re-enable: change `const` back to `export const` on the next line.
 */
const weeklyPlanRefresh = functions.pubsub
  .schedule('0 0 1 * *') // 1st of every month at midnight UTC
  .timeZone('UTC')
  .onRun(async (context): Promise<RefreshJobResult> => {
    const startTime = Date.now();
    const now = new Date();

    // Check for dry-run mode (Day 18 optimization)
    const isDryRun = process.env.WEEKLY_REFRESH_DRY_RUN === 'true' ||
                     functions.config().refresh?.dry_run === 'true';

    console.log('========================================');
    console.log('Starting monthly plan refresh job');
    console.log(`Timestamp: ${now.toISOString()}`);
    console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'PRODUCTION'}`);
    console.log('========================================');

    let totalPlansGenerated = 0;
    let totalGroupFlowsGenerated = 0;
    let errors = 0;
    let citiesProcessed = 0;
    let citiesFailed = 0;
    const errorDetails: Array<{ cityId: string; error: string }> = [];

    try {
      const db = admin.firestore();

      // Get all cities with error handling
      console.log('Querying all cities...');
      let citiesSnapshot;
      try {
        citiesSnapshot = await retryWithBackoff(
          () => db.collection('cities').get(),
          'Query cities'
        );
      } catch (error) {
        console.error('Failed to query cities after retries:', error);
        throw DatabaseError.readFailed('cities', error as Error);
      }

      console.log(`Found ${citiesSnapshot.size} cities to refresh`);

      if (citiesSnapshot.size === 0) {
        console.log('No cities found. Job completed.');
        return {
          success: true,
          totalPlansGenerated: 0,
          totalGroupFlowsGenerated: 0,
          errors: 0,
          citiesProcessed: 0,
          citiesFailed: 0,
          duration: Date.now() - startTime,
          timestamp: now.toISOString(),
        };
      }

      // Estimate runtime (Day 18 optimization)
      const estimatedSecondsPerCity = 15; // ~15 seconds per city (API calls + DB writes)
      const estimatedTotalSeconds = citiesSnapshot.size * estimatedSecondsPerCity / BATCH_CONFIG.citiesPerBatch;
      const estimatedMinutes = Math.ceil(estimatedTotalSeconds / 60);
      console.log(`Estimated runtime: ${estimatedMinutes} minutes (${citiesSnapshot.size} cities, ${BATCH_CONFIG.citiesPerBatch} per batch)`);

      if (isDryRun) {
        console.log('DRY RUN: Skipping city processing. Job would process the following cities:');
        citiesSnapshot.docs.forEach((doc, index) => {
          console.log(`  ${index + 1}. ${doc.data().name} (${doc.id})`);
        });

        return {
          success: true,
          totalPlansGenerated: 0,
          totalGroupFlowsGenerated: 0,
          errors: 0,
          citiesProcessed: 0,
          citiesFailed: 0,
          duration: Date.now() - startTime,
          timestamp: now.toISOString(),
        };
      }

      // Process cities in batches (Day 18 optimization)
      const cityDocs = citiesSnapshot.docs;
      for (let i = 0; i < cityDocs.length; i += BATCH_CONFIG.citiesPerBatch) {
        const batch = cityDocs.slice(i, i + BATCH_CONFIG.citiesPerBatch);

        // Process batch in parallel
        const batchResults = await Promise.allSettled(
          batch.map((cityDoc) => processSingleCity(cityDoc, db))
        );

        // Aggregate results
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const cityResult = result.value;
            totalPlansGenerated += cityResult.plansGenerated;
            totalGroupFlowsGenerated += cityResult.groupFlowsGenerated;
            citiesProcessed++;
          } else {
            const cityDoc = batch[index];
            const cityId = cityDoc.id;
            const cityName = cityDoc.data()?.name || cityId;
            console.error(`✗ Batch processing failed for ${cityName}:`, result.reason);
            errors++;
            citiesFailed++;
            errorDetails.push({
              cityId,
              error: result.reason?.message || 'Unknown error',
            });
          }
        });

        // Progress logging (Day 18 optimization)
        if ((i + BATCH_CONFIG.citiesPerBatch) % BATCH_CONFIG.progressLogInterval === 0 ||
            i + BATCH_CONFIG.citiesPerBatch >= cityDocs.length) {
          const progress = Math.min(i + BATCH_CONFIG.citiesPerBatch, cityDocs.length);
          const percentage = ((progress / cityDocs.length) * 100).toFixed(1);
          const elapsed = (Date.now() - startTime) / 1000;
          const avgTimePerCity = elapsed / progress;
          const remaining = (cityDocs.length - progress) * avgTimePerCity;
          console.log(`Progress: ${progress}/${cityDocs.length} cities (${percentage}%) - ETA: ${Math.ceil(remaining / 60)} min`);
        }
      }

      const duration = Date.now() - startTime;
      const executionSeconds = (duration / 1000).toFixed(2);

      // Final summary
      console.log('\n========================================');
      console.log('Monthly plan refresh job completed');
      console.log(
        `Cities: ${citiesProcessed} succeeded, ${citiesFailed} failed, ${citiesSnapshot.size} total`
      );
      console.log(`Total plans generated: ${totalPlansGenerated}`);
      console.log(`Total group flows generated: ${totalGroupFlowsGenerated}`);
      console.log(`Errors: ${errors}`);
      console.log(`Execution time: ${executionSeconds}s`);
      console.log(`Timestamp: ${new Date().toISOString()}`);

      if (errorDetails.length > 0) {
        console.log('\nError details:');
        errorDetails.forEach((detail) => {
          console.log(`  - ${detail.cityId}: ${detail.error}`);
        });
      }

      console.log('========================================');

      // Job is successful even if some cities fail (partial success)
      const success = citiesProcessed > 0;

      return {
        success,
        totalPlansGenerated,
        totalGroupFlowsGenerated,
        errors,
        citiesProcessed,
        citiesFailed,
        duration,
        timestamp: now.toISOString(),
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('========================================');
      console.error('FATAL ERROR in monthly plan refresh job');
      console.error('Error:', error);
      console.error('Execution time:', (duration / 1000).toFixed(2), 's');
      console.error('========================================');

      // Re-throw error to mark the job as failed in Cloud Scheduler
      throw error;
    }
  });

/**
 * Process a single city: generate plans and group flows, save to Firestore
 * Day 18 optimization - extracted for batch processing
 */
async function processSingleCity(
  cityDoc: admin.firestore.QueryDocumentSnapshot,
  db: admin.firestore.Firestore
): Promise<{ plansGenerated: number; groupFlowsGenerated: number }> {
  const cityId = cityDoc.id;
  const cityData = cityDoc.data();

  // Validate city data
  if (!cityData || !cityData.name || !cityData.country) {
    throw new ValidationError(`Invalid city data for ${cityId} (missing name or country)`);
  }

  console.log(`\n--- Processing: ${cityData.name} (${cityId}) ---`);

  // Generate individual plans (50 per city) with retry logic
  console.log('Generating 50 individual plans...');
  let individualPlans: Partial<Plan>[] = [];
  try {
    individualPlans = await retryWithBackoff(
      () => generateIndividualPlans(cityId, cityData, 50),
      `Generate plans for ${cityData.name}`
    );
  } catch (error) {
    console.error(
      `Failed to generate individual plans for ${cityData.name}:`,
      error
    );
    throw error;
  }

  // Save individual plans with error handling
  if (individualPlans.length > 0) {
    try {
      await retryWithBackoff(
        () => saveIndividualPlans(db, cityId, individualPlans),
        `Save plans for ${cityData.name}`
      );
      console.log(`✓ Saved ${individualPlans.length} individual plans`);
    } catch (error) {
      console.error(`Failed to save plans for ${cityData.name}:`, error);
      throw DatabaseError.batchFailed(
        `Save plans for ${cityId}`,
        error as Error
      );
    }
  } else {
    console.warn('⚠ No individual plans generated');
  }

  // Generate group flows (10 per city) with retry logic
  console.log('Generating 10 group flows...');
  let groupFlows: Partial<GroupFlow>[] = [];
  try {
    groupFlows = await retryWithBackoff(
      () => generateGroupFlows(cityId, cityData, 10),
      `Generate group flows for ${cityData.name}`
    );
  } catch (error) {
    console.error(
      `Failed to generate group flows for ${cityData.name}:`,
      error
    );
    // Continue even if group flows fail
    console.warn('⚠ Continuing without group flows');
  }

  // Save group flows with error handling
  if (groupFlows.length > 0) {
    try {
      await retryWithBackoff(
        () => saveGroupFlows(db, cityId, groupFlows),
        `Save group flows for ${cityData.name}`
      );
      console.log(`✓ Saved ${groupFlows.length} group flows`);
    } catch (error) {
      console.error(
        `Failed to save group flows for ${cityData.name}:`,
        error
      );
      // Continue even if saving group flows fails
      console.warn('⚠ Continuing without group flows');
    }
  } else {
    console.warn('⚠ No group flows generated');
  }

  // Update city metadata with error handling
  try {
    await retryWithBackoff(
      () =>
        db.collection('cities').doc(cityId).update({
          'metadata.totalPlansThisWeek': individualPlans.length,
          'metadata.lastUpdated':
            admin.firestore.FieldValue.serverTimestamp(),
        }),
      `Update metadata for ${cityData.name}`
    );
  } catch (error) {
    console.error(
      `Failed to update metadata for ${cityData.name}:`,
      error
    );
    // Continue even if metadata update fails
  }

  console.log(
    `✓ ${cityData.name} complete: ${individualPlans.length} plans, ${groupFlows.length} flows`
  );

  return {
    plansGenerated: individualPlans.length,
    groupFlowsGenerated: groupFlows.length,
  };
}

/**
 * Generate individual nightlife plans using Claude AI
 */
async function generateIndividualPlans(
  cityId: string,
  cityData: any,
  count: number
): Promise<Partial<Plan>[]> {
  try {
    // Validate input
    if (!cityData.name || !cityData.country) {
      throw ValidationError.missingField('cityData.name or cityData.country');
    }

    // Get API key from environment
    const apiKey = functions.config().anthropic?.api_key || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new ExternalServiceError(
        'Anthropic API',
        'Anthropic API key not configured. Please set ANTHROPIC_API_KEY environment variable.',
        false // Not retryable - configuration issue
      );
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    const prompt = `Generate ${count} unique nightlife plans for ${cityData.name}, ${cityData.country}.

Each plan should include:
- title: Creative, catchy name for the night out (e.g., "Sunset Vibes at The Crown", "Jazz & Cocktails Night")
- venueName: Real or realistic venue/location name in ${cityData.name}
- description: 2-3 sentences describing the experience, vibe, and what makes it special
- startTime: Evening time in HH:MM format (between 18:00 and 23:00)
- duration: Duration in minutes (60-180 minutes)
- entryFee: Price range as a string ('$', '$$', '$$$', or 'Free')
- vibe: One word describing the atmosphere (energetic, chill, upscale, casual, artsy, romantic)
- tags: 2-4 relevant tags (examples: live-music, rooftop, cocktails, dancing, wine-bar, speakeasy, craft-beer, dj, late-night)
- category: Type of venue (Rooftop Bar, Nightclub, Live Music, Lounge, Cocktail Bar, Wine Bar, Beer Garden, Dance Club)

IMPORTANT:
- Focus on variety: Include different venue types, vibes, and price points
- Make about 33% of plans weekend-appropriate (Friday/Saturday nights)
- Include mix of: lounges, clubs, bars, live music venues, rooftop spots, speakeasies, etc.
- Use realistic venue names that sound authentic to ${cityData.name}

Return ONLY a valid JSON array with no markdown formatting or code blocks. Start with [ and end with ].`;

    console.log('Calling Claude API for individual plans...');
    let message;
    try {
      message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });
    } catch (error: any) {
      // Handle Anthropic API errors
      if (error?.status === 429) {
        throw ExternalServiceError.anthropicAPI('Rate limit exceeded', true);
      } else if (error?.status === 529 || error?.status === 500) {
        throw ExternalServiceError.anthropicAPI('Service temporarily unavailable', true);
      } else if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
        throw ExternalServiceError.networkError('Anthropic API', error);
      } else {
        throw ExternalServiceError.anthropicAPI(
          error?.message || 'Unknown API error',
          false
        );
      }
    }

    // Parse AI response
    const content = message.content[0];
    if (content.type === 'text') {
      // Extract JSON array from response
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        let aiPlans: AIGeneratedPlan[];
        try {
          aiPlans = JSON.parse(jsonMatch[0]);
        } catch (error) {
          throw new ExternalServiceError(
            'Anthropic API',
            'Failed to parse AI response as JSON',
            false,
            { responseText: content.text.substring(0, 500) }
          );
        }

        console.log(`AI generated ${aiPlans.length} plans`);

        // Validate AI response
        if (!Array.isArray(aiPlans) || aiPlans.length === 0) {
          throw new ExternalServiceError(
            'Anthropic API',
            'AI returned empty or invalid plans array',
            true
          );
        }

        // Transform AI plans to Plan model format
        const plans: Partial<Plan>[] = aiPlans.map((aiPlan, index) => {
          const isWeekend = index % 3 === 0; // 33% weekend plans
          const planId = `${cityId}-plan-${Date.now()}-${index}`;

          return {
            planId,
            cityId,
            rank: index + 1,
            title: aiPlan.title,
            venueName: aiPlan.venueName,
            description: aiPlan.description,
            category: aiPlan.category || 'Bar',
            type: 'bar' as const,
            images: {
              hero: '',
              thumbnail: '',
              gallery: [],
            },
            location: {
              address: '',
              neighborhood: '',
              googleMapsUrl: '',
              coordinates: {
                latitude: cityData.coordinates?.latitude || 0,
                longitude: cityData.coordinates?.longitude || 0,
              },
            },
            schedule: {
              date: new Date().toISOString().split('T')[0],
              startTime: aiPlan.startTime,
              endTime: calculateEndTime(aiPlan.startTime, aiPlan.duration),
              isWeekend,
              weekday: isWeekend ? 'Saturday' : 'Thursday',
            },
            pricing: {
              entryFee: aiPlan.entryFee === 'Free' ? 0 : null,
              currency: 'USD',
              priceRange: aiPlan.entryFee,
              freeEntry: aiPlan.entryFee === 'Free',
            },
            aiTags: {
              genre: [],
              vibe: [aiPlan.vibe],
              eventType: aiPlan.tags[0] || '',
            },
            flags: {
              isIndividual: true,
              isGroup: false,
              isWeekend,
              isFeatured: index < 5, // First 5 are featured
            },
            reviews: {
              averageRating: 4.0 + Math.random() * 1.0, // 4.0-5.0
              totalReviews: Math.floor(Math.random() * 500) + 50,
              source: 'Google',
            },
            metadata: {
              createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
              updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
              source: 'AI-generated-claude',
            },
          };
        });

        return plans;
      }
    }

    throw new ExternalServiceError(
      'Anthropic API',
      'No valid JSON content found in AI response',
      true
    );
  } catch (error) {
    // Re-throw custom errors
    if (
      error instanceof ExternalServiceError ||
      error instanceof ValidationError
    ) {
      throw error;
    }

    // Wrap unexpected errors
    console.error('Unexpected error generating individual plans:', error);
    throw new ExternalServiceError(
      'Anthropic API',
      error instanceof Error ? error.message : 'Unknown error generating plans',
      true,
      { originalError: error }
    );
  }
}

/**
 * Generate group flow experiences using Claude AI
 */
async function generateGroupFlows(
  cityId: string,
  cityData: any,
  count: number
): Promise<Partial<GroupFlow>[]> {
  try {
    // Validate input
    if (!cityData.name || !cityData.country) {
      throw ValidationError.missingField('cityData.name or cityData.country');
    }

    // Get API key from environment
    const apiKey = functions.config().anthropic?.api_key || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new ExternalServiceError(
        'Anthropic API',
        'Anthropic API key not configured',
        false
      );
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    const prompt = `Generate ${count} multi-venue group nightlife experiences for ${cityData.name}, ${cityData.country}.

Each group flow should include:
- title: Name for the complete night experience (e.g., "Ultimate Brooklyn Night Out", "Sunset to Sunrise Tour")
- description: 1-2 sentences describing the full journey and vibe
- activities: Array of 2-3 connected activities in order:
  - venueName: Real or realistic venue in ${cityData.name}
  - description: What happens at this stop (1 sentence)
  - startTime: Time in HH:MM format
  - duration: Minutes at this venue (30-120 minutes)
  - order: Sequential number (1, 2, 3)
- totalDuration: Total experience time in minutes
- estimatedCost: Price estimate object with min, max (in dollars), and currency ('USD')
- difficulty: How intense the experience is ('easy', 'moderate', or 'intense')
- bestFor: Array of 2-3 group types (e.g., 'friends', 'date-night', 'birthday', 'bachelorette', 'corporate')

IMPORTANT:
- Create logical progressions (dinner → bar → club, or sunset drinks → live music → late night)
- Make about 50% weekend-appropriate experiences
- Vary the difficulty and price points
- Include diverse themes: foodie tours, music-focused, party-heavy, relaxed, cultural, etc.

Return ONLY a valid JSON array with no markdown formatting or code blocks. Start with [ and end with ].`;

    console.log('Calling Claude API for group flows...');
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Parse AI response
    const content = message.content[0];
    if (content.type === 'text') {
      // Extract JSON array from response
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const aiFlows: AIGeneratedGroupFlow[] = JSON.parse(jsonMatch[0]);
        console.log(`AI generated ${aiFlows.length} group flows`);

        // Transform AI flows to GroupFlow model format
        const flows: Partial<GroupFlow>[] = aiFlows.map((aiFlow, index) => {
          const isWeekend = index % 2 === 0; // 50% weekend flows
          const flowId = `${cityId}-flow-${Date.now()}-${index}`;

          return {
            flowId,
            cityId,
            rank: index + 1,
            title: aiFlow.title,
            description: aiFlow.description,
            duration: {
              totalHours: Math.round((aiFlow.totalDuration / 60) * 10) / 10,
              startTime: aiFlow.activities[0]?.startTime || '18:00',
              endTime: aiFlow.activities[aiFlow.activities.length - 1]?.startTime || '23:00',
            },
            steps: aiFlow.activities.map((activity, stepIndex) => ({
              stepNumber: activity.order || stepIndex + 1,
              planId: `${cityId}-plan-flow-${index}-${stepIndex}`,
              title: activity.description,
              venueName: activity.venueName,
              duration: activity.duration,
              thumbnail: '',
            })),
            pricing: {
              totalEstimate: Math.round(
                ((aiFlow.estimatedCost.min + aiFlow.estimatedCost.max) / 2) * 100
              ), // Convert to cents
              currency: aiFlow.estimatedCost.currency,
            },
            flags: {
              isWeekend,
              proOnly: true, // Group flows are always Pro-only
            },
            metadata: {
              createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
              updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
              aiGenerated: true,
            },
          };
        });

        return flows;
      }
    }

    throw new ExternalServiceError(
      'Anthropic API',
      'No valid JSON content found in AI response for group flows',
      true
    );
  } catch (error) {
    // Re-throw custom errors
    if (
      error instanceof ExternalServiceError ||
      error instanceof ValidationError
    ) {
      throw error;
    }

    // Wrap unexpected errors
    console.error('Unexpected error generating group flows:', error);
    throw new ExternalServiceError(
      'Anthropic API',
      error instanceof Error ? error.message : 'Unknown error generating group flows',
      true,
      { originalError: error }
    );
  }
}

/**
 * Save individual plans to Firestore
 * Archives old plans and adds new ones
 */
async function saveIndividualPlans(
  db: admin.firestore.Firestore,
  cityId: string,
  plans: Partial<Plan>[]
): Promise<void> {
  try {
    // Get old plans for this city
    const oldPlansSnapshot = await db
      .collection('nightlifePlans')
      .where('cityId', '==', cityId)
      .get();

    console.log(`Archiving ${oldPlansSnapshot.size} old plans for ${cityId}`);

    // Use batch write for efficiency (max 500 operations per batch)
    const batches: admin.firestore.WriteBatch[] = [];
    let currentBatch = db.batch();
    let operationCount = 0;

    // Delete old plans
    oldPlansSnapshot.docs.forEach((doc) => {
      currentBatch.delete(doc.ref);
      operationCount++;

      if (operationCount === 500) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        operationCount = 0;
      }
    });

    // Add new plans
    plans.forEach((plan) => {
      if (!plan.planId) return; // Skip if no planId
      const ref = db.collection('nightlifePlans').doc(plan.planId);
      currentBatch.set(ref, plan);
      operationCount++;

      if (operationCount === 500) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        operationCount = 0;
      }
    });

    // Add the final batch if it has operations
    if (operationCount > 0) {
      batches.push(currentBatch);
    }

    // Commit all batches
    await Promise.all(batches.map((batch) => batch.commit()));

    console.log(`✓ Saved ${plans.length} individual plans for ${cityId}`);
  } catch (error) {
    console.error(`Error saving individual plans for ${cityId}:`, error);
    throw error;
  }
}

/**
 * Save group flows to Firestore
 * Archives old flows and adds new ones
 */
async function saveGroupFlows(
  db: admin.firestore.Firestore,
  cityId: string,
  flows: Partial<GroupFlow>[]
): Promise<void> {
  try {
    // Get old flows for this city
    const oldFlowsSnapshot = await db
      .collection('groupFlows')
      .where('cityId', '==', cityId)
      .get();

    console.log(`Archiving ${oldFlowsSnapshot.size} old flows for ${cityId}`);

    // Use batch write
    const batch = db.batch();

    // Delete old flows
    oldFlowsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Add new flows
    flows.forEach((flow) => {
      if (!flow.flowId) return; // Skip if no flowId
      const ref = db.collection('groupFlows').doc(flow.flowId);
      batch.set(ref, flow);
    });

    await batch.commit();

    console.log(`✓ Saved ${flows.length} group flows for ${cityId}`);
  } catch (error) {
    console.error(`Error saving group flows for ${cityId}:`, error);
    throw error;
  }
}

/**
 * Helper function to calculate end time based on start time and duration
 */
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;

  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

/**
 * Export for testing purposes
 */
export const generateIndividualPlansForTesting = generateIndividualPlans;
export const generateGroupFlowsForTesting = generateGroupFlows;
export const saveIndividualPlansForTesting = saveIndividualPlans;
export const saveGroupFlowsForTesting = saveGroupFlows;
