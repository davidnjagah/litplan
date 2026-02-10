/**
 * Database Cleanup Script
 *
 * Removes mock/test data and orphaned records from the database.
 * Keeps only real users who signed in through the app.
 *
 * Usage:
 *   npm run cleanup:dry-run  # Preview what will be deleted
 *   npm run cleanup:force    # Actually delete the data
 *
 * Or run directly:
 *   npx ts-node src/scripts/cleanupMockData.ts --dry-run
 *   npx ts-node src/scripts/cleanupMockData.ts --force
 *
 * @module scripts/cleanupMockData
 * @since Sprint 11 - Database Cleanup
 */

import prisma from '../lib/prisma';

// Known mock/test user patterns
const MOCK_USER_PATTERNS = [
  'test-free-user',
  'test-pro-user',
  'mock-user',
  'seed-user',
  'demo-user',
  'fake-user',
];

const MOCK_EMAIL_PATTERNS = [
  '@test.litplanz.com',
  '@mock.litplanz.com',
  '@example.com',
  '@test.com',
  '@fake.com',
];

interface CleanupReport {
  mockUsersFound: number;
  orphanedViewedCities: number;
  orphanedSavedCities: number;
  orphanedSearchedCities: number;
  orphanedSubscriptions: number;
  mockUsersDeleted: number;
  orphanedRecordsDeleted: number;
}

/**
 * Check if a user is a mock/test user
 */
function isMockUser(supabaseUserId: string, email: string | null): boolean {
  // Check Supabase user ID patterns
  for (const pattern of MOCK_USER_PATTERNS) {
    if (supabaseUserId.toLowerCase().includes(pattern)) {
      return true;
    }
  }

  // Check email patterns
  if (email) {
    for (const pattern of MOCK_EMAIL_PATTERNS) {
      if (email.toLowerCase().includes(pattern)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Find all mock/test users
 */
async function findMockUsers(): Promise<
  Array<{ id: string; supabaseUserId: string; email: string | null; displayName: string | null }>
> {
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      supabaseUserId: true,
      email: true,
      displayName: true,
    },
  });

  return allUsers.filter((user) => isMockUser(user.supabaseUserId, user.email));
}

/**
 * Find ViewedCity records that reference non-existent users
 */
async function findOrphanedViewedCities(): Promise<Array<{ id: string; userId: string; cityId: string }>> {
  const viewedCities = await prisma.viewedCity.findMany({
    select: { id: true, userId: true, cityId: true },
  });

  const validUserIds = new Set(
    (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id)
  );

  return viewedCities.filter((vc) => !validUserIds.has(vc.userId));
}

/**
 * Find SavedCity records that reference non-existent users
 */
async function findOrphanedSavedCities(): Promise<Array<{ id: string; userId: string; cityId: string }>> {
  const savedCities = await prisma.savedCity.findMany({
    select: { id: true, userId: true, cityId: true },
  });

  const validUserIds = new Set(
    (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id)
  );

  return savedCities.filter((sc) => !validUserIds.has(sc.userId));
}

/**
 * Find SearchedCity records that reference non-existent users
 */
async function findOrphanedSearchedCities(): Promise<
  Array<{ id: string; userId: string; cityId: string; searchQuery: string }>
> {
  const searchedCities = await prisma.searchedCity.findMany({
    select: { id: true, userId: true, cityId: true, searchQuery: true },
  });

  const validUserIds = new Set(
    (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id)
  );

  return searchedCities.filter((sc) => !validUserIds.has(sc.userId));
}

/**
 * Find Subscription records that reference non-existent users
 */
async function findOrphanedSubscriptions(): Promise<Array<{ id: string; userId: string }>> {
  const subscriptions = await prisma.subscription.findMany({
    select: { id: true, userId: true },
  });

  const validUserIds = new Set(
    (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id)
  );

  return subscriptions.filter((sub) => !validUserIds.has(sub.userId));
}

/**
 * Preview mode - show what will be deleted without actually deleting
 */
async function previewCleanup(): Promise<CleanupReport> {
  console.log('='.repeat(60));
  console.log('DATABASE CLEANUP - DRY RUN (Preview Mode)');
  console.log('='.repeat(60));
  console.log('');

  const report: CleanupReport = {
    mockUsersFound: 0,
    orphanedViewedCities: 0,
    orphanedSavedCities: 0,
    orphanedSearchedCities: 0,
    orphanedSubscriptions: 0,
    mockUsersDeleted: 0,
    orphanedRecordsDeleted: 0,
  };

  // Find mock users
  console.log('Scanning for mock/test users...');
  const mockUsers = await findMockUsers();
  report.mockUsersFound = mockUsers.length;

  if (mockUsers.length > 0) {
    console.log(`\nFound ${mockUsers.length} mock/test user(s):`);
    for (const user of mockUsers) {
      console.log(`  - ID: ${user.id}`);
      console.log(`    Supabase ID: ${user.supabaseUserId}`);
      console.log(`    Email: ${user.email || 'N/A'}`);
      console.log(`    Display Name: ${user.displayName || 'N/A'}`);
      console.log('');
    }
  } else {
    console.log('No mock/test users found.');
  }

  // Find orphaned ViewedCity records
  console.log('\nScanning for orphaned ViewedCity records...');
  const orphanedViewedCities = await findOrphanedViewedCities();
  report.orphanedViewedCities = orphanedViewedCities.length;

  if (orphanedViewedCities.length > 0) {
    console.log(`Found ${orphanedViewedCities.length} orphaned ViewedCity record(s):`);
    for (const record of orphanedViewedCities.slice(0, 10)) {
      console.log(`  - ID: ${record.id}, UserID: ${record.userId}, CityID: ${record.cityId}`);
    }
    if (orphanedViewedCities.length > 10) {
      console.log(`  ... and ${orphanedViewedCities.length - 10} more`);
    }
  } else {
    console.log('No orphaned ViewedCity records found.');
  }

  // Find orphaned SavedCity records
  console.log('\nScanning for orphaned SavedCity records...');
  const orphanedSavedCities = await findOrphanedSavedCities();
  report.orphanedSavedCities = orphanedSavedCities.length;

  if (orphanedSavedCities.length > 0) {
    console.log(`Found ${orphanedSavedCities.length} orphaned SavedCity record(s):`);
    for (const record of orphanedSavedCities.slice(0, 10)) {
      console.log(`  - ID: ${record.id}, UserID: ${record.userId}, CityID: ${record.cityId}`);
    }
    if (orphanedSavedCities.length > 10) {
      console.log(`  ... and ${orphanedSavedCities.length - 10} more`);
    }
  } else {
    console.log('No orphaned SavedCity records found.');
  }

  // Find orphaned SearchedCity records
  console.log('\nScanning for orphaned SearchedCity records...');
  const orphanedSearchedCities = await findOrphanedSearchedCities();
  report.orphanedSearchedCities = orphanedSearchedCities.length;

  if (orphanedSearchedCities.length > 0) {
    console.log(`Found ${orphanedSearchedCities.length} orphaned SearchedCity record(s):`);
    for (const record of orphanedSearchedCities.slice(0, 10)) {
      console.log(
        `  - ID: ${record.id}, UserID: ${record.userId}, Query: "${record.searchQuery}"`
      );
    }
    if (orphanedSearchedCities.length > 10) {
      console.log(`  ... and ${orphanedSearchedCities.length - 10} more`);
    }
  } else {
    console.log('No orphaned SearchedCity records found.');
  }

  // Find orphaned Subscription records
  console.log('\nScanning for orphaned Subscription records...');
  const orphanedSubscriptions = await findOrphanedSubscriptions();
  report.orphanedSubscriptions = orphanedSubscriptions.length;

  if (orphanedSubscriptions.length > 0) {
    console.log(`Found ${orphanedSubscriptions.length} orphaned Subscription record(s):`);
    for (const record of orphanedSubscriptions.slice(0, 10)) {
      console.log(`  - ID: ${record.id}, UserID: ${record.userId}`);
    }
    if (orphanedSubscriptions.length > 10) {
      console.log(`  ... and ${orphanedSubscriptions.length - 10} more`);
    }
  } else {
    console.log('No orphaned Subscription records found.');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY (DRY RUN - No data was deleted)');
  console.log('='.repeat(60));
  console.log(`Mock/test users to delete: ${report.mockUsersFound}`);
  console.log(`Orphaned ViewedCity records: ${report.orphanedViewedCities}`);
  console.log(`Orphaned SavedCity records: ${report.orphanedSavedCities}`);
  console.log(`Orphaned SearchedCity records: ${report.orphanedSearchedCities}`);
  console.log(`Orphaned Subscription records: ${report.orphanedSubscriptions}`);
  console.log('');
  console.log('To actually delete this data, run with --force flag');
  console.log('');

  return report;
}

/**
 * Force mode - actually delete the data
 */
async function executeCleanup(): Promise<CleanupReport> {
  console.log('='.repeat(60));
  console.log('DATABASE CLEANUP - FORCE MODE (Deleting Data)');
  console.log('='.repeat(60));
  console.log('');

  const report: CleanupReport = {
    mockUsersFound: 0,
    orphanedViewedCities: 0,
    orphanedSavedCities: 0,
    orphanedSearchedCities: 0,
    orphanedSubscriptions: 0,
    mockUsersDeleted: 0,
    orphanedRecordsDeleted: 0,
  };

  // Delete orphaned records first (they reference users that don't exist)
  console.log('Step 1: Deleting orphaned ViewedCity records...');
  const orphanedViewedCities = await findOrphanedViewedCities();
  report.orphanedViewedCities = orphanedViewedCities.length;

  if (orphanedViewedCities.length > 0) {
    const orphanedIds = orphanedViewedCities.map((r) => r.id);
    const deleted = await prisma.viewedCity.deleteMany({
      where: { id: { in: orphanedIds } },
    });
    console.log(`  Deleted ${deleted.count} orphaned ViewedCity records`);
    report.orphanedRecordsDeleted += deleted.count;
  } else {
    console.log('  No orphaned ViewedCity records found');
  }

  console.log('\nStep 2: Deleting orphaned SavedCity records...');
  const orphanedSavedCities = await findOrphanedSavedCities();
  report.orphanedSavedCities = orphanedSavedCities.length;

  if (orphanedSavedCities.length > 0) {
    const orphanedIds = orphanedSavedCities.map((r) => r.id);
    const deleted = await prisma.savedCity.deleteMany({
      where: { id: { in: orphanedIds } },
    });
    console.log(`  Deleted ${deleted.count} orphaned SavedCity records`);
    report.orphanedRecordsDeleted += deleted.count;
  } else {
    console.log('  No orphaned SavedCity records found');
  }

  console.log('\nStep 3: Deleting orphaned SearchedCity records...');
  const orphanedSearchedCities = await findOrphanedSearchedCities();
  report.orphanedSearchedCities = orphanedSearchedCities.length;

  if (orphanedSearchedCities.length > 0) {
    const orphanedIds = orphanedSearchedCities.map((r) => r.id);
    const deleted = await prisma.searchedCity.deleteMany({
      where: { id: { in: orphanedIds } },
    });
    console.log(`  Deleted ${deleted.count} orphaned SearchedCity records`);
    report.orphanedRecordsDeleted += deleted.count;
  } else {
    console.log('  No orphaned SearchedCity records found');
  }

  console.log('\nStep 4: Deleting orphaned Subscription records...');
  const orphanedSubscriptions = await findOrphanedSubscriptions();
  report.orphanedSubscriptions = orphanedSubscriptions.length;

  if (orphanedSubscriptions.length > 0) {
    const orphanedIds = orphanedSubscriptions.map((r) => r.id);
    const deleted = await prisma.subscription.deleteMany({
      where: { id: { in: orphanedIds } },
    });
    console.log(`  Deleted ${deleted.count} orphaned Subscription records`);
    report.orphanedRecordsDeleted += deleted.count;
  } else {
    console.log('  No orphaned Subscription records found');
  }

  // Delete mock users (cascade will delete their related records)
  console.log('\nStep 5: Deleting mock/test users...');
  const mockUsers = await findMockUsers();
  report.mockUsersFound = mockUsers.length;

  if (mockUsers.length > 0) {
    console.log(`  Found ${mockUsers.length} mock/test users to delete:`);
    for (const user of mockUsers) {
      console.log(`    - ${user.supabaseUserId} (${user.email || 'No email'})`);
    }

    // Delete users (cascade will handle related records)
    const mockUserIds = mockUsers.map((u) => u.id);
    const deleted = await prisma.user.deleteMany({
      where: { id: { in: mockUserIds } },
    });
    console.log(`  Deleted ${deleted.count} mock/test users`);
    report.mockUsersDeleted = deleted.count;
  } else {
    console.log('  No mock/test users found');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('CLEANUP COMPLETE');
  console.log('='.repeat(60));
  console.log(`Mock/test users deleted: ${report.mockUsersDeleted}`);
  console.log(`Orphaned records deleted: ${report.orphanedRecordsDeleted}`);
  console.log('');

  return report;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isForce = args.includes('--force');

  if (!isDryRun && !isForce) {
    console.log('Usage:');
    console.log('  npx ts-node src/scripts/cleanupMockData.ts --dry-run  # Preview mode');
    console.log('  npx ts-node src/scripts/cleanupMockData.ts --force    # Delete mode');
    console.log('');
    console.log('Please specify either --dry-run or --force');
    process.exit(1);
  }

  if (isDryRun && isForce) {
    console.log('Error: Cannot use both --dry-run and --force flags');
    process.exit(1);
  }

  try {
    if (isDryRun) {
      await previewCleanup();
    } else {
      await executeCleanup();
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
