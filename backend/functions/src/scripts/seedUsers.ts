/**
 * Seed Users Script (DEPRECATED)
 *
 * WARNING: This script is DEPRECATED and should NOT be used in production.
 * As of Sprint 11, mock/test users are no longer seeded.
 * Users should only be created through real authentication flows (Email, Google, Apple).
 *
 * This script is kept for reference only and will exit with a warning.
 *
 * For local development testing, use the actual authentication flow instead.
 *
 * @deprecated Sprint 11 - Database cleanup removed mock user seeding
 * @module scripts/seedUsers
 */

/**
 * Main function - exits with deprecation warning
 */
const main = async () => {
  console.log('='.repeat(60));
  console.log('WARNING: seedUsers.ts is DEPRECATED');
  console.log('='.repeat(60));
  console.log('');
  console.log('As of Sprint 11, mock/test users are no longer seeded.');
  console.log('');
  console.log('Reasons:');
  console.log('  1. Mock users pollute the production database');
  console.log('  2. Real users should sign in through authentication');
  console.log('  3. API endpoints return empty arrays for new users');
  console.log('');
  console.log('For testing:');
  console.log('  - Use the real authentication flow (Email, Google, Apple)');
  console.log('  - Create test users through the app UI');
  console.log('  - Use the cleanup script to remove mock data:');
  console.log('    npm run cleanup:dry-run');
  console.log('    npm run cleanup:force');
  console.log('');
  console.log('Seed scripts that ARE still valid:');
  console.log('  - npm run seed:cities  (Seeds city content data)');
  console.log('  - npm run seed:plans   (Seeds plan content data)');
  console.log('');
  console.log('='.repeat(60));
  console.log('');

  process.exit(0);
};

// Run the main function
main();
