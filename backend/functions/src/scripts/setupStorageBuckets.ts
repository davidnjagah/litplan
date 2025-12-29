/**
 * Setup Storage Buckets Script
 *
 * Sprint 6 Phase 4: Storage Migration
 * Creates and configures Supabase Storage buckets for the Litplan application.
 *
 * Buckets created:
 * - city-images: Public bucket for city hero and card images
 * - plan-images: Public bucket for plan activity images
 * - user-avatars: Public bucket for user profile avatars
 *
 * Usage: npx ts-node src/scripts/setupStorageBuckets.ts
 *
 * @module scripts/setupStorageBuckets
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { supabaseAdmin } from '../config/supabase';
import { STORAGE_BUCKETS } from '../services/supabase/StorageService';

// Bucket configurations
interface BucketConfig {
  name: string;
  public: boolean;
  allowedMimeTypes: string[];
  fileSizeLimit: number; // in bytes
}

const BUCKET_CONFIGS: BucketConfig[] = [
  {
    name: STORAGE_BUCKETS.CITY_IMAGES,
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
  },
  {
    name: STORAGE_BUCKETS.PLAN_IMAGES,
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
  },
  {
    name: STORAGE_BUCKETS.USER_AVATARS,
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    fileSizeLimit: 2 * 1024 * 1024, // 2MB
  },
];

/**
 * Create a storage bucket if it doesn't exist
 */
async function createBucket(config: BucketConfig): Promise<boolean> {
  console.log(`\nCreating bucket: ${config.name}...`);

  try {
    // Check if bucket already exists
    const { data: existingBuckets, error: listError } = await supabaseAdmin.storage.listBuckets();

    if (listError) {
      console.error(`Error listing buckets: ${listError.message}`);
      return false;
    }

    const bucketExists = existingBuckets?.some((b) => b.name === config.name);

    if (bucketExists) {
      console.log(`  Bucket '${config.name}' already exists`);

      // Update bucket settings
      const { error: updateError } = await supabaseAdmin.storage.updateBucket(config.name, {
        public: config.public,
        allowedMimeTypes: config.allowedMimeTypes,
        fileSizeLimit: config.fileSizeLimit,
      });

      if (updateError) {
        console.error(`  Error updating bucket settings: ${updateError.message}`);
        return false;
      }

      console.log(`  Updated bucket settings successfully`);
      return true;
    }

    // Create new bucket
    const { error: createError } = await supabaseAdmin.storage.createBucket(config.name, {
      public: config.public,
      allowedMimeTypes: config.allowedMimeTypes,
      fileSizeLimit: config.fileSizeLimit,
    });

    if (createError) {
      console.error(`  Error creating bucket: ${createError.message}`);
      return false;
    }

    console.log(`  Created bucket '${config.name}' successfully`);
    console.log(`    - Public: ${config.public}`);
    console.log(`    - Allowed types: ${config.allowedMimeTypes.join(', ')}`);
    console.log(`    - Max file size: ${config.fileSizeLimit / 1024 / 1024}MB`);

    return true;
  } catch (error) {
    console.error(`  Unexpected error: ${error}`);
    return false;
  }
}

/**
 * List all buckets and their contents
 */
async function listAllBuckets(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('EXISTING STORAGE BUCKETS');
  console.log('='.repeat(60));

  try {
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();

    if (error) {
      console.error(`Error listing buckets: ${error.message}`);
      return;
    }

    if (!buckets || buckets.length === 0) {
      console.log('No buckets found');
      return;
    }

    for (const bucket of buckets) {
      console.log(`\nBucket: ${bucket.name}`);
      console.log(`  - ID: ${bucket.id}`);
      console.log(`  - Public: ${bucket.public}`);
      console.log(`  - Created: ${bucket.created_at}`);

      // List files in bucket (root level)
      const { data: files, error: filesError } = await supabaseAdmin.storage
        .from(bucket.name)
        .list();

      if (!filesError && files) {
        console.log(`  - Files/Folders: ${files.length}`);
      }
    }
  } catch (error) {
    console.error(`Unexpected error: ${error}`);
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('LITPLAN - STORAGE BUCKETS SETUP');
  console.log('Sprint 6 Phase 4: Storage Migration');
  console.log('='.repeat(60));

  // Verify Supabase configuration
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('\nERROR: Missing Supabase configuration');
    console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
    process.exit(1);
  }

  console.log('\nSupabase URL:', supabaseUrl);
  console.log('Service Key:', serviceKey.substring(0, 20) + '...');

  // List existing buckets
  await listAllBuckets();

  // Create/update buckets
  console.log('\n' + '='.repeat(60));
  console.log('CREATING/UPDATING BUCKETS');
  console.log('='.repeat(60));

  let successCount = 0;
  let failureCount = 0;

  for (const config of BUCKET_CONFIGS) {
    const success = await createBucket(config);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SETUP COMPLETE');
  console.log('='.repeat(60));
  console.log(`\nResults:`);
  console.log(`  - Successful: ${successCount}`);
  console.log(`  - Failed: ${failureCount}`);

  if (failureCount > 0) {
    console.log('\nWARNING: Some buckets failed to create/update');
    console.log('Please check the error messages above');
    process.exit(1);
  }

  // List final state
  await listAllBuckets();

  console.log('\n' + '='.repeat(60));
  console.log('NEXT STEPS');
  console.log('='.repeat(60));
  console.log('\n1. Verify buckets in Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard/project/YOUR_PROJECT/storage/buckets');
  console.log('\n2. Test image uploads using the StorageService:');
  console.log('   import { StorageService } from "./services/supabase/StorageService";');
  console.log('\n3. Existing Unsplash URLs will continue to work');
  console.log('   Storage URLs can be used for new uploads');

  process.exit(0);
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
