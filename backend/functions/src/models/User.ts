/**
 * User Data Model
 * Represents a user in the Litplan system
 */

export interface User {
  userId: string; // iCloud ID or UUID
  email?: string; // Optional from iCloud
  displayName?: string; // Optional from iCloud
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  subscription: UserSubscription;
  entitlements: UserEntitlements;
  preferences: UserPreferences;
}

export interface UserSubscription {
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  startDate: FirebaseFirestore.Timestamp | null;
  expiryDate: FirebaseFirestore.Timestamp | null;
  autoRenew: boolean;
  transactionId: string | null; // StoreKit transaction ID
  productId: string | null; // e.g., 'litplan_pro_monthly'
}

export type SubscriptionStatus = 'free' | 'pro' | 'trial';
export type SubscriptionTier = 'free' | 'pro';

export interface UserEntitlements {
  maxCitiesPerWeek: number; // 1 for free, 100 for pro
  maxPlansPerCity: number; // 10 for free, 50 for pro
  weekendAccess: boolean; // false for free, true for pro
  groupPlansAccess: boolean; // false for free, true for pro
  savedCitiesAccess: boolean; // false for free, true for pro
}

export interface UserPreferences {
  notificationsEnabled: boolean;
  weeklyDigest: boolean;
}

// Default entitlements for free tier
export const FREE_TIER_ENTITLEMENTS: UserEntitlements = {
  maxCitiesPerWeek: 1,
  maxPlansPerCity: 10,
  weekendAccess: false,
  groupPlansAccess: false,
  savedCitiesAccess: false,
};

// Default entitlements for pro tier
export const PRO_TIER_ENTITLEMENTS: UserEntitlements = {
  maxCitiesPerWeek: 100,
  maxPlansPerCity: 50,
  weekendAccess: true,
  groupPlansAccess: true,
  savedCitiesAccess: true,
};

// Helper function to create a new user
export const createNewUser = (
  userId: string,
  email?: string,
  displayName?: string
): User => {
  const now = FirebaseFirestore.Timestamp.now();

  return {
    userId,
    email,
    displayName,
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
};

// Helper function to upgrade user to pro
export const upgradeUserToPro = (
  user: User,
  transactionId: string,
  productId: string,
  expiryDate: FirebaseFirestore.Timestamp
): User => {
  return {
    ...user,
    updatedAt: FirebaseFirestore.Timestamp.now(),
    subscription: {
      status: 'pro',
      tier: 'pro',
      startDate: FirebaseFirestore.Timestamp.now(),
      expiryDate,
      autoRenew: true,
      transactionId,
      productId,
    },
    entitlements: PRO_TIER_ENTITLEMENTS,
  };
};
