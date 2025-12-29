/**
 * Seed Users Script
 * Creates test users (1 free, 1 pro) for testing tier-based filtering
 *
 * Usage: npm run seed:users
 */

import * as admin from 'firebase-admin';
import {FREE_TIER_ENTITLEMENTS, PRO_TIER_ENTITLEMENTS} from '../models/User';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Create Free Tier Test User
 */
const createFreeUser = async () => {
  const userId = 'test-free-user';
  const now = admin.firestore.Timestamp.now();

  const freeUser = {
    userId,
    email: 'free@test.litplan.app',
    displayName: 'Free Test User',
    createdAt: now,
    updatedAt: now,
    subscription: {
      status: 'free',
      tier: 'free',
      startDate: null,
      expiryDate: null,
      autoRenew: false,
      transactionId: null,
      productId: null,
    },
    entitlements: FREE_TIER_ENTITLEMENTS,
    preferences: {
      notificationsEnabled: true,
      weeklyDigest: true,
    },
  };

  await db.collection('users').doc(userId).set(freeUser);
  console.log(`✅ Created Free tier test user: ${userId}`);
  console.log(`   - Email: ${freeUser.email}`);
  console.log(`   - Max Cities/Week: ${FREE_TIER_ENTITLEMENTS.maxCitiesPerWeek}`);
  console.log(`   - Max Plans/City: ${FREE_TIER_ENTITLEMENTS.maxPlansPerCity}`);
  console.log(`   - Weekend Access: ${FREE_TIER_ENTITLEMENTS.weekendAccess}`);
};

/**
 * Create Pro Tier Test User
 */
const createProUser = async () => {
  const userId = 'test-pro-user';
  const now = admin.firestore.Timestamp.now();
  const oneYearFromNow = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  );

  const proUser = {
    userId,
    email: 'pro@test.litplan.app',
    displayName: 'Pro Test User',
    createdAt: now,
    updatedAt: now,
    subscription: {
      status: 'pro',
      tier: 'pro',
      startDate: now,
      expiryDate: oneYearFromNow,
      autoRenew: true,
      transactionId: 'test-transaction-12345',
      productId: 'litplan_pro_yearly',
    },
    entitlements: PRO_TIER_ENTITLEMENTS,
    preferences: {
      notificationsEnabled: true,
      weeklyDigest: true,
    },
  };

  await db.collection('users').doc(userId).set(proUser);
  console.log(`✅ Created Pro tier test user: ${userId}`);
  console.log(`   - Email: ${proUser.email}`);
  console.log(`   - Max Cities/Week: ${PRO_TIER_ENTITLEMENTS.maxCitiesPerWeek}`);
  console.log(`   - Max Plans/City: ${PRO_TIER_ENTITLEMENTS.maxPlansPerCity}`);
  console.log(`   - Weekend Access: ${PRO_TIER_ENTITLEMENTS.weekendAccess}`);
};

/**
 * Main seed function
 */
const seedUsers = async () => {
  try {
    console.log('🌱 Seeding test users...\n');

    await createFreeUser();
    console.log('');
    await createProUser();

    console.log('\n✨ Test users seeded successfully!');
    console.log('\n📝 Test User Credentials:');
    console.log('   Free User ID: test-free-user');
    console.log('   Pro User ID:  test-pro-user');
    console.log('\n💡 To test, create Firebase custom tokens for these user IDs');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  }
};

// Run the seed function
seedUsers();
