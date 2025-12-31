/**
 * Data Integrity Checks Script
 *
 * Verifies data integrity across all database tables.
 * Checks for orphaned records and invalid foreign key references.
 *
 * Usage:
 *   npm run check:integrity  # Run integrity checks
 *
 * Or run directly:
 *   npx ts-node src/scripts/checkDataIntegrity.ts
 *
 * @module scripts/checkDataIntegrity
 * @since Sprint 11 - Database Cleanup
 */

import prisma from '../lib/prisma';

interface IntegrityReport {
  valid: boolean;
  issues: IntegrityIssue[];
  summary: {
    totalUsers: number;
    totalCities: number;
    totalViewedCities: number;
    totalSavedCities: number;
    totalSearchedCities: number;
    totalSubscriptions: number;
  };
}

interface IntegrityIssue {
  table: string;
  type: 'orphaned_record' | 'invalid_reference' | 'missing_reference';
  count: number;
  description: string;
  recordIds?: string[];
}

/**
 * Check ViewedCity records for valid userId and cityId
 */
async function checkViewedCities(): Promise<IntegrityIssue[]> {
  const issues: IntegrityIssue[] = [];

  console.log('  Checking ViewedCity records...');

  // Get all ViewedCity records
  const viewedCities = await prisma.viewedCity.findMany({
    select: { id: true, userId: true, cityId: true },
  });

  // Get all valid user IDs and city IDs
  const validUserIds = new Set(
    (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id)
  );
  const validCityIds = new Set(
    (await prisma.city.findMany({ select: { id: true } })).map((c) => c.id)
  );

  // Check for invalid user references
  const invalidUserRefs = viewedCities.filter((vc) => !validUserIds.has(vc.userId));
  if (invalidUserRefs.length > 0) {
    issues.push({
      table: 'ViewedCity',
      type: 'invalid_reference',
      count: invalidUserRefs.length,
      description: `${invalidUserRefs.length} ViewedCity record(s) reference non-existent users`,
      recordIds: invalidUserRefs.slice(0, 10).map((r) => r.id),
    });
    console.log(`    [!] Found ${invalidUserRefs.length} records with invalid userId`);
  }

  // Check for invalid city references
  const invalidCityRefs = viewedCities.filter((vc) => !validCityIds.has(vc.cityId));
  if (invalidCityRefs.length > 0) {
    issues.push({
      table: 'ViewedCity',
      type: 'invalid_reference',
      count: invalidCityRefs.length,
      description: `${invalidCityRefs.length} ViewedCity record(s) reference non-existent cities`,
      recordIds: invalidCityRefs.slice(0, 10).map((r) => r.id),
    });
    console.log(`    [!] Found ${invalidCityRefs.length} records with invalid cityId`);
  }

  if (invalidUserRefs.length === 0 && invalidCityRefs.length === 0) {
    console.log(`    [OK] All ${viewedCities.length} ViewedCity records are valid`);
  }

  return issues;
}

/**
 * Check SavedCity records for valid userId and cityId
 */
async function checkSavedCities(): Promise<IntegrityIssue[]> {
  const issues: IntegrityIssue[] = [];

  console.log('  Checking SavedCity records...');

  // Get all SavedCity records
  const savedCities = await prisma.savedCity.findMany({
    select: { id: true, userId: true, cityId: true },
  });

  // Get all valid user IDs and city IDs
  const validUserIds = new Set(
    (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id)
  );
  const validCityIds = new Set(
    (await prisma.city.findMany({ select: { id: true } })).map((c) => c.id)
  );

  // Check for invalid user references
  const invalidUserRefs = savedCities.filter((sc) => !validUserIds.has(sc.userId));
  if (invalidUserRefs.length > 0) {
    issues.push({
      table: 'SavedCity',
      type: 'invalid_reference',
      count: invalidUserRefs.length,
      description: `${invalidUserRefs.length} SavedCity record(s) reference non-existent users`,
      recordIds: invalidUserRefs.slice(0, 10).map((r) => r.id),
    });
    console.log(`    [!] Found ${invalidUserRefs.length} records with invalid userId`);
  }

  // Check for invalid city references
  const invalidCityRefs = savedCities.filter((sc) => !validCityIds.has(sc.cityId));
  if (invalidCityRefs.length > 0) {
    issues.push({
      table: 'SavedCity',
      type: 'invalid_reference',
      count: invalidCityRefs.length,
      description: `${invalidCityRefs.length} SavedCity record(s) reference non-existent cities`,
      recordIds: invalidCityRefs.slice(0, 10).map((r) => r.id),
    });
    console.log(`    [!] Found ${invalidCityRefs.length} records with invalid cityId`);
  }

  if (invalidUserRefs.length === 0 && invalidCityRefs.length === 0) {
    console.log(`    [OK] All ${savedCities.length} SavedCity records are valid`);
  }

  return issues;
}

/**
 * Check SearchedCity records for valid userId and cityId
 */
async function checkSearchedCities(): Promise<IntegrityIssue[]> {
  const issues: IntegrityIssue[] = [];

  console.log('  Checking SearchedCity records...');

  // Get all SearchedCity records
  const searchedCities = await prisma.searchedCity.findMany({
    select: { id: true, userId: true, cityId: true },
  });

  // Get all valid user IDs and city IDs
  const validUserIds = new Set(
    (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id)
  );
  const validCityIds = new Set(
    (await prisma.city.findMany({ select: { id: true } })).map((c) => c.id)
  );

  // Check for invalid user references
  const invalidUserRefs = searchedCities.filter((sc) => !validUserIds.has(sc.userId));
  if (invalidUserRefs.length > 0) {
    issues.push({
      table: 'SearchedCity',
      type: 'invalid_reference',
      count: invalidUserRefs.length,
      description: `${invalidUserRefs.length} SearchedCity record(s) reference non-existent users`,
      recordIds: invalidUserRefs.slice(0, 10).map((r) => r.id),
    });
    console.log(`    [!] Found ${invalidUserRefs.length} records with invalid userId`);
  }

  // Check for invalid city references
  const invalidCityRefs = searchedCities.filter((sc) => !validCityIds.has(sc.cityId));
  if (invalidCityRefs.length > 0) {
    issues.push({
      table: 'SearchedCity',
      type: 'invalid_reference',
      count: invalidCityRefs.length,
      description: `${invalidCityRefs.length} SearchedCity record(s) reference non-existent cities`,
      recordIds: invalidCityRefs.slice(0, 10).map((r) => r.id),
    });
    console.log(`    [!] Found ${invalidCityRefs.length} records with invalid cityId`);
  }

  if (invalidUserRefs.length === 0 && invalidCityRefs.length === 0) {
    console.log(`    [OK] All ${searchedCities.length} SearchedCity records are valid`);
  }

  return issues;
}

/**
 * Check Subscription records for valid userId
 */
async function checkSubscriptions(): Promise<IntegrityIssue[]> {
  const issues: IntegrityIssue[] = [];

  console.log('  Checking Subscription records...');

  // Get all Subscription records
  const subscriptions = await prisma.subscription.findMany({
    select: { id: true, userId: true },
  });

  // Get all valid user IDs
  const validUserIds = new Set(
    (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id)
  );

  // Check for invalid user references
  const invalidUserRefs = subscriptions.filter((sub) => !validUserIds.has(sub.userId));
  if (invalidUserRefs.length > 0) {
    issues.push({
      table: 'Subscription',
      type: 'invalid_reference',
      count: invalidUserRefs.length,
      description: `${invalidUserRefs.length} Subscription record(s) reference non-existent users`,
      recordIds: invalidUserRefs.slice(0, 10).map((r) => r.id),
    });
    console.log(`    [!] Found ${invalidUserRefs.length} records with invalid userId`);
  } else {
    console.log(`    [OK] All ${subscriptions.length} Subscription records are valid`);
  }

  return issues;
}

/**
 * Check Plan records for valid cityId
 */
async function checkPlans(): Promise<IntegrityIssue[]> {
  const issues: IntegrityIssue[] = [];

  console.log('  Checking Plan records...');

  // Get all Plan records
  const plans = await prisma.plan.findMany({
    select: { id: true, cityId: true },
  });

  // Get all valid city IDs
  const validCityIds = new Set(
    (await prisma.city.findMany({ select: { id: true } })).map((c) => c.id)
  );

  // Check for invalid city references
  const invalidCityRefs = plans.filter((p) => !validCityIds.has(p.cityId));
  if (invalidCityRefs.length > 0) {
    issues.push({
      table: 'Plan',
      type: 'invalid_reference',
      count: invalidCityRefs.length,
      description: `${invalidCityRefs.length} Plan record(s) reference non-existent cities`,
      recordIds: invalidCityRefs.slice(0, 10).map((r) => r.id),
    });
    console.log(`    [!] Found ${invalidCityRefs.length} records with invalid cityId`);
  } else {
    console.log(`    [OK] All ${plans.length} Plan records are valid`);
  }

  return issues;
}

/**
 * Check GroupFlow records for valid cityId
 */
async function checkGroupFlows(): Promise<IntegrityIssue[]> {
  const issues: IntegrityIssue[] = [];

  console.log('  Checking GroupFlow records...');

  // Get all GroupFlow records
  const groupFlows = await prisma.groupFlow.findMany({
    select: { id: true, cityId: true },
  });

  // Get all valid city IDs
  const validCityIds = new Set(
    (await prisma.city.findMany({ select: { id: true } })).map((c) => c.id)
  );

  // Check for invalid city references
  const invalidCityRefs = groupFlows.filter((gf) => !validCityIds.has(gf.cityId));
  if (invalidCityRefs.length > 0) {
    issues.push({
      table: 'GroupFlow',
      type: 'invalid_reference',
      count: invalidCityRefs.length,
      description: `${invalidCityRefs.length} GroupFlow record(s) reference non-existent cities`,
      recordIds: invalidCityRefs.slice(0, 10).map((r) => r.id),
    });
    console.log(`    [!] Found ${invalidCityRefs.length} records with invalid cityId`);
  } else {
    console.log(`    [OK] All ${groupFlows.length} GroupFlow records are valid`);
  }

  return issues;
}

/**
 * Check GroupFlowStep records for valid flowId and planId
 */
async function checkGroupFlowSteps(): Promise<IntegrityIssue[]> {
  const issues: IntegrityIssue[] = [];

  console.log('  Checking GroupFlowStep records...');

  // Get all GroupFlowStep records
  const steps = await prisma.groupFlowStep.findMany({
    select: { id: true, flowId: true, planId: true },
  });

  // Get all valid flow IDs and plan IDs
  const validFlowIds = new Set(
    (await prisma.groupFlow.findMany({ select: { id: true } })).map((gf) => gf.id)
  );
  const validPlanIds = new Set(
    (await prisma.plan.findMany({ select: { id: true } })).map((p) => p.id)
  );

  // Check for invalid flow references
  const invalidFlowRefs = steps.filter((s) => !validFlowIds.has(s.flowId));
  if (invalidFlowRefs.length > 0) {
    issues.push({
      table: 'GroupFlowStep',
      type: 'invalid_reference',
      count: invalidFlowRefs.length,
      description: `${invalidFlowRefs.length} GroupFlowStep record(s) reference non-existent flows`,
      recordIds: invalidFlowRefs.slice(0, 10).map((r) => r.id),
    });
    console.log(`    [!] Found ${invalidFlowRefs.length} records with invalid flowId`);
  }

  // Check for invalid plan references
  const invalidPlanRefs = steps.filter((s) => !validPlanIds.has(s.planId));
  if (invalidPlanRefs.length > 0) {
    issues.push({
      table: 'GroupFlowStep',
      type: 'invalid_reference',
      count: invalidPlanRefs.length,
      description: `${invalidPlanRefs.length} GroupFlowStep record(s) reference non-existent plans`,
      recordIds: invalidPlanRefs.slice(0, 10).map((r) => r.id),
    });
    console.log(`    [!] Found ${invalidPlanRefs.length} records with invalid planId`);
  }

  if (invalidFlowRefs.length === 0 && invalidPlanRefs.length === 0) {
    console.log(`    [OK] All ${steps.length} GroupFlowStep records are valid`);
  }

  return issues;
}

/**
 * Get database summary statistics
 */
async function getDatabaseSummary(): Promise<IntegrityReport['summary']> {
  const [users, cities, viewedCities, savedCities, searchedCities, subscriptions] =
    await Promise.all([
      prisma.user.count(),
      prisma.city.count(),
      prisma.viewedCity.count(),
      prisma.savedCity.count(),
      prisma.searchedCity.count(),
      prisma.subscription.count(),
    ]);

  return {
    totalUsers: users,
    totalCities: cities,
    totalViewedCities: viewedCities,
    totalSavedCities: savedCities,
    totalSearchedCities: searchedCities,
    totalSubscriptions: subscriptions,
  };
}

/**
 * Run all integrity checks
 */
async function runIntegrityChecks(): Promise<IntegrityReport> {
  console.log('='.repeat(60));
  console.log('DATA INTEGRITY CHECK');
  console.log('='.repeat(60));
  console.log('');

  const allIssues: IntegrityIssue[] = [];

  // Run all checks
  console.log('Running integrity checks...\n');

  const viewedCityIssues = await checkViewedCities();
  allIssues.push(...viewedCityIssues);

  const savedCityIssues = await checkSavedCities();
  allIssues.push(...savedCityIssues);

  const searchedCityIssues = await checkSearchedCities();
  allIssues.push(...searchedCityIssues);

  const subscriptionIssues = await checkSubscriptions();
  allIssues.push(...subscriptionIssues);

  const planIssues = await checkPlans();
  allIssues.push(...planIssues);

  const groupFlowIssues = await checkGroupFlows();
  allIssues.push(...groupFlowIssues);

  const groupFlowStepIssues = await checkGroupFlowSteps();
  allIssues.push(...groupFlowStepIssues);

  // Get summary statistics
  const summary = await getDatabaseSummary();

  // Build report
  const report: IntegrityReport = {
    valid: allIssues.length === 0,
    issues: allIssues,
    summary,
  };

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('DATABASE SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Total Users: ${summary.totalUsers}`);
  console.log(`  Total Cities: ${summary.totalCities}`);
  console.log(`  Total ViewedCity records: ${summary.totalViewedCities}`);
  console.log(`  Total SavedCity records: ${summary.totalSavedCities}`);
  console.log(`  Total SearchedCity records: ${summary.totalSearchedCities}`);
  console.log(`  Total Subscription records: ${summary.totalSubscriptions}`);

  console.log('\n' + '='.repeat(60));
  console.log('INTEGRITY CHECK RESULTS');
  console.log('='.repeat(60));

  if (report.valid) {
    console.log('');
    console.log('[PASS] All integrity checks passed! Database is healthy.');
    console.log('');
  } else {
    console.log('');
    console.log(`[FAIL] Found ${allIssues.length} integrity issue(s):`);
    console.log('');

    for (const issue of allIssues) {
      console.log(`  - ${issue.table}: ${issue.description}`);
      if (issue.recordIds && issue.recordIds.length > 0) {
        console.log(`    Sample IDs: ${issue.recordIds.join(', ')}`);
      }
    }

    console.log('');
    console.log('To fix these issues, run the cleanup script:');
    console.log('  npm run cleanup:dry-run  # Preview what will be deleted');
    console.log('  npm run cleanup:force    # Delete orphaned records');
    console.log('');
  }

  return report;
}

/**
 * Main function
 */
async function main() {
  try {
    const report = await runIntegrityChecks();

    // Exit with error code if there are issues
    if (!report.valid) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error running integrity checks:', error);
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
