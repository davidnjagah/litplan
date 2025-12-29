/**
 * Sync Subscription Status - Scheduled Function
 *
 * This Cloud Function runs daily at 2 AM UTC to check all active Pro subscriptions
 * and downgrade expired ones to free tier.
 *
 * Schedule: Daily at 2 AM UTC (cron: '0 2 * * *')
 * Purpose: Ensure subscription status stays in sync with expiry dates
 *
 * Sprint 3, Day 12
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { updateUserEntitlements } from '../utils/helpers';

/**
 * Subscription Sync Job Result Interface
 */
interface SyncJobResult {
  success: boolean;
  totalChecked: number;
  totalDowngraded: number;
  errors: number;
  timestamp: string;
}

/**
 * Process a single user's subscription status
 * Returns true if downgraded, false otherwise
 */
async function processUserSubscription(
  userDoc: admin.firestore.QueryDocumentSnapshot,
  now: Date
): Promise<{ downgraded: boolean; error?: string }> {
  try {
    const userData = userDoc.data();
    const subscription = userData.subscription;

    // Validate subscription data
    if (!subscription || !subscription.expiryDate) {
      console.warn(
        `User ${userDoc.id} has Pro tier but no expiry date. Skipping.`
      );
      return { downgraded: false };
    }

    // Convert Firestore Timestamp to Date
    const expiryDate = subscription.expiryDate.toDate();

    // Check if subscription has expired
    if (expiryDate < now) {
      console.log(
        `User ${userDoc.id} subscription expired at ${expiryDate.toISOString()}. Downgrading to free tier...`
      );

      // Downgrade user to free tier
      const result = await updateUserEntitlements(userDoc.id, 'free');

      if (result.success) {
        console.log(`Successfully downgraded user ${userDoc.id} to free tier`);
        return { downgraded: true };
      } else {
        console.error(
          `Failed to downgrade user ${userDoc.id}:`,
          result.error
        );
        return { downgraded: false, error: result.error };
      }
    } else {
      // Subscription is still active
      console.log(
        `User ${userDoc.id} subscription is active until ${expiryDate.toISOString()}`
      );
      return { downgraded: false };
    }
  } catch (error) {
    console.error(`Error processing user ${userDoc.id}:`, error);
    return {
      downgraded: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process a batch of users
 * Returns count of downgrades and errors
 */
async function processBatch(
  batch: admin.firestore.QueryDocumentSnapshot[],
  now: Date
): Promise<{ downgrades: number; errors: number }> {
  const results = await Promise.all(
    batch.map((userDoc) => processUserSubscription(userDoc, now))
  );

  const downgrades = results.filter((r) => r.downgraded).length;
  const errors = results.filter((r) => r.error).length;

  return { downgrades, errors };
}

/**
 * Main Scheduled Function
 * Runs daily at 2 AM UTC to sync subscription status
 */
export const syncSubscriptionStatus = functions.pubsub
  .schedule('0 2 * * *') // Daily at 2 AM UTC
  .timeZone('UTC')
  .onRun(async (context): Promise<SyncJobResult> => {
    const startTime = Date.now();
    const now = new Date();

    console.log('========================================');
    console.log('Starting subscription sync job');
    console.log(`Timestamp: ${now.toISOString()}`);
    console.log('========================================');

    let totalChecked = 0;
    let totalDowngraded = 0;
    let totalErrors = 0;

    try {
      const db = admin.firestore();

      // Query all Pro users
      console.log('Querying all Pro users...');
      const proUsersSnapshot = await db
        .collection('users')
        .where('subscription.tier', '==', 'pro')
        .get();

      totalChecked = proUsersSnapshot.size;
      console.log(`Found ${totalChecked} Pro users to check`);

      if (totalChecked === 0) {
        console.log('No Pro users found. Job completed.');
        return {
          success: true,
          totalChecked: 0,
          totalDowngraded: 0,
          errors: 0,
          timestamp: now.toISOString(),
        };
      }

      // Process users in batches of 100 to avoid timeouts
      const BATCH_SIZE = 100;
      const allDocs = proUsersSnapshot.docs;
      const totalBatches = Math.ceil(allDocs.length / BATCH_SIZE);

      console.log(`Processing ${totalChecked} users in ${totalBatches} batches`);

      for (let i = 0; i < allDocs.length; i += BATCH_SIZE) {
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const batchDocs = allDocs.slice(i, i + BATCH_SIZE);

        console.log(
          `Processing batch ${batchNumber}/${totalBatches} (${batchDocs.length} users)`
        );

        const batchResult = await processBatch(batchDocs, now);

        totalDowngraded += batchResult.downgrades;
        totalErrors += batchResult.errors;

        console.log(
          `Batch ${batchNumber} completed: ${batchResult.downgrades} downgrades, ${batchResult.errors} errors`
        );
      }

      // Calculate execution time
      const executionTime = Date.now() - startTime;
      const executionSeconds = (executionTime / 1000).toFixed(2);

      // Final summary
      console.log('========================================');
      console.log('Subscription sync job completed');
      console.log(`Total checked: ${totalChecked}`);
      console.log(`Total downgraded: ${totalDowngraded}`);
      console.log(`Total errors: ${totalErrors}`);
      console.log(`Execution time: ${executionSeconds}s`);
      console.log(`Timestamp: ${new Date().toISOString()}`);
      console.log('========================================');

      return {
        success: true,
        totalChecked,
        totalDowngraded,
        errors: totalErrors,
        timestamp: now.toISOString(),
      };
    } catch (error) {
      console.error('========================================');
      console.error('FATAL ERROR in subscription sync job');
      console.error('Error:', error);
      console.error('========================================');

      // Re-throw error to mark the job as failed in Cloud Scheduler
      throw error;
    }
  });

/**
 * Export the function for testing purposes
 * This allows the function to be tested locally without deploying
 */
export const processUserSubscriptionForTesting = processUserSubscription;
export const processBatchForTesting = processBatch;
