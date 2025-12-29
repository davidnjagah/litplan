/**
 * Subscription Service
 *
 * Provides CRUD operations for Subscription model.
 * Handles subscription management, tier upgrades/downgrades, and entitlement checks.
 *
 * @module services/prisma/SubscriptionService
 * @since Sprint 5 Phase 2 - Prisma Service Layer
 */

import prisma from '../../lib/prisma';
import {
  Subscription,
  SubscriptionStatus,
  SubscriptionTier,
  User,
} from '@prisma/client';

export interface SubscriptionCreateInput {
  status?: SubscriptionStatus;
  tier?: SubscriptionTier;
  startDate?: Date;
  expiryDate?: Date;
  autoRenew?: boolean;
  transactionId?: string;
  productId?: string;
  originalTransactionId?: string;
}

export interface TransactionData {
  transactionId: string;
  productId: string;
  originalTransactionId?: string;
}

export interface Entitlements {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  maxCitiesPerWeek: number;
  maxPlansPerCity: number;
  weekendAccess: boolean;
  groupPlansAccess: boolean;
  savedCitiesAccess: boolean;
  isActive: boolean;
}

export interface SubscriptionWithUser extends Subscription {
  user: User;
}

// Default entitlements by tier
const FREE_TIER_ENTITLEMENTS = {
  maxCitiesPerWeek: 1,
  maxPlansPerCity: 10,
  weekendAccess: false,
  groupPlansAccess: false,
  savedCitiesAccess: false,
};

const PRO_TIER_ENTITLEMENTS = {
  maxCitiesPerWeek: 100,
  maxPlansPerCity: 50,
  weekendAccess: true,
  groupPlansAccess: true,
  savedCitiesAccess: true,
};

export class SubscriptionService {
  /**
   * Get subscription by user ID
   * @param userId - The user's primary ID
   * @returns Subscription or null if not found
   */
  static async getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
    try {
      return await prisma.subscription.findUnique({
        where: { userId },
      });
    } catch (error) {
      console.error(`Error fetching subscription by user ID ${userId}:`, error);
      throw new Error('Failed to fetch subscription');
    }
  }

  /**
   * Get subscription by Clerk user ID
   * @param clerkUserId - The Clerk user ID
   * @returns Subscription or null if not found
   */
  static async getSubscriptionByClerkId(clerkUserId: string): Promise<Subscription | null> {
    try {
      return await prisma.subscription.findUnique({
        where: { clerkUserId },
      });
    } catch (error) {
      console.error(`Error fetching subscription by Clerk ID ${clerkUserId}:`, error);
      throw new Error('Failed to fetch subscription');
    }
  }

  /**
   * Create a subscription for a user
   * @param userId - The user's primary ID
   * @param data - Subscription creation data
   * @returns Created subscription
   */
  static async createSubscription(
    userId: string,
    data: SubscriptionCreateInput
  ): Promise<Subscription> {
    try {
      // First, get the user to get their clerkUserId
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { clerkUserId: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const tier = data.tier || SubscriptionTier.FREE;
      const entitlements =
        tier === SubscriptionTier.PRO ? PRO_TIER_ENTITLEMENTS : FREE_TIER_ENTITLEMENTS;

      return await prisma.subscription.create({
        data: {
          userId,
          clerkUserId: user.clerkUserId,
          status: data.status || SubscriptionStatus.FREE,
          tier,
          startDate: data.startDate,
          expiryDate: data.expiryDate,
          autoRenew: data.autoRenew || false,
          transactionId: data.transactionId,
          productId: data.productId,
          originalTransactionId: data.originalTransactionId,
          ...entitlements,
        },
      });
    } catch (error) {
      console.error(`Error creating subscription for user ${userId}:`, error);
      throw new Error('Failed to create subscription');
    }
  }

  /**
   * Update a subscription
   * @param id - The subscription's primary ID
   * @param data - Partial subscription data to update
   * @returns Updated subscription
   */
  static async updateSubscription(
    id: string,
    data: Partial<Subscription>
  ): Promise<Subscription> {
    try {
      // Remove id, userId, clerkUserId from update data
      const { id: _, userId: __, clerkUserId: ___, ...updateData } = data as Subscription & {
        id: string;
        userId: string;
        clerkUserId: string;
      };

      return await prisma.subscription.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      console.error(`Error updating subscription ${id}:`, error);
      throw new Error('Failed to update subscription');
    }
  }

  /**
   * Upgrade user to Pro tier
   * @param userId - The user's primary ID
   * @param transactionData - StoreKit transaction data
   * @returns Updated subscription
   */
  static async upgradeToProTier(
    userId: string,
    transactionData: TransactionData
  ): Promise<Subscription> {
    try {
      const existingSubscription = await this.getSubscriptionByUserId(userId);

      if (!existingSubscription) {
        // Create new Pro subscription
        return await this.createSubscription(userId, {
          status: SubscriptionStatus.PRO,
          tier: SubscriptionTier.PRO,
          startDate: new Date(),
          autoRenew: true,
          ...transactionData,
        });
      }

      // Update existing subscription to Pro
      return await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: SubscriptionStatus.PRO,
          tier: SubscriptionTier.PRO,
          startDate: new Date(),
          autoRenew: true,
          transactionId: transactionData.transactionId,
          productId: transactionData.productId,
          originalTransactionId: transactionData.originalTransactionId,
          ...PRO_TIER_ENTITLEMENTS,
        },
      });
    } catch (error) {
      console.error(`Error upgrading user ${userId} to Pro:`, error);
      throw new Error('Failed to upgrade to Pro tier');
    }
  }

  /**
   * Downgrade user to Free tier
   * @param userId - The user's primary ID
   * @returns Updated subscription
   */
  static async downgradeToFreeTier(userId: string): Promise<Subscription> {
    try {
      const existingSubscription = await this.getSubscriptionByUserId(userId);

      if (!existingSubscription) {
        // Create new Free subscription
        return await this.createSubscription(userId, {
          status: SubscriptionStatus.FREE,
          tier: SubscriptionTier.FREE,
        });
      }

      // Update existing subscription to Free
      return await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: SubscriptionStatus.FREE,
          tier: SubscriptionTier.FREE,
          expiryDate: new Date(),
          autoRenew: false,
          ...FREE_TIER_ENTITLEMENTS,
        },
      });
    } catch (error) {
      console.error(`Error downgrading user ${userId} to Free:`, error);
      throw new Error('Failed to downgrade to Free tier');
    }
  }

  /**
   * Check user's entitlements
   * @param userId - The user's primary ID
   * @returns User's current entitlements
   */
  static async checkEntitlements(userId: string): Promise<Entitlements> {
    try {
      const subscription = await this.getSubscriptionByUserId(userId);

      if (!subscription) {
        // No subscription = free tier defaults
        return {
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.FREE,
          ...FREE_TIER_ENTITLEMENTS,
          isActive: true,
        };
      }

      // Check if subscription has expired
      const isExpired =
        subscription.expiryDate && new Date(subscription.expiryDate) < new Date();
      const isActive =
        !isExpired &&
        (subscription.status === SubscriptionStatus.PRO ||
          subscription.status === SubscriptionStatus.FREE ||
          subscription.status === SubscriptionStatus.TRIAL);

      return {
        tier: subscription.tier,
        status: subscription.status,
        maxCitiesPerWeek: subscription.maxCitiesPerWeek,
        maxPlansPerCity: subscription.maxPlansPerCity,
        weekendAccess: subscription.weekendAccess,
        groupPlansAccess: subscription.groupPlansAccess,
        savedCitiesAccess: subscription.savedCitiesAccess,
        isActive,
      };
    } catch (error) {
      console.error(`Error checking entitlements for user ${userId}:`, error);
      throw new Error('Failed to check entitlements');
    }
  }

  /**
   * Check entitlements by Clerk ID
   * @param clerkUserId - The Clerk user ID
   * @returns User's current entitlements
   */
  static async checkEntitlementsByClerkId(clerkUserId: string): Promise<Entitlements> {
    try {
      const subscription = await this.getSubscriptionByClerkId(clerkUserId);

      if (!subscription) {
        return {
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.FREE,
          ...FREE_TIER_ENTITLEMENTS,
          isActive: true,
        };
      }

      const isExpired =
        subscription.expiryDate && new Date(subscription.expiryDate) < new Date();
      const isActive =
        !isExpired &&
        (subscription.status === SubscriptionStatus.PRO ||
          subscription.status === SubscriptionStatus.FREE ||
          subscription.status === SubscriptionStatus.TRIAL);

      return {
        tier: subscription.tier,
        status: subscription.status,
        maxCitiesPerWeek: subscription.maxCitiesPerWeek,
        maxPlansPerCity: subscription.maxPlansPerCity,
        weekendAccess: subscription.weekendAccess,
        groupPlansAccess: subscription.groupPlansAccess,
        savedCitiesAccess: subscription.savedCitiesAccess,
        isActive,
      };
    } catch (error) {
      console.error(`Error checking entitlements by Clerk ID ${clerkUserId}:`, error);
      throw new Error('Failed to check entitlements');
    }
  }

  /**
   * Get subscription with user data
   * @param id - The subscription's primary ID
   * @returns Subscription with user or null
   */
  static async getSubscriptionWithUser(id: string): Promise<SubscriptionWithUser | null> {
    try {
      return await prisma.subscription.findUnique({
        where: { id },
        include: {
          user: true,
        },
      });
    } catch (error) {
      console.error(`Error fetching subscription with user ${id}:`, error);
      throw new Error('Failed to fetch subscription with user');
    }
  }

  /**
   * Handle subscription expiry
   * @param userId - The user's primary ID
   * @returns Updated subscription
   */
  static async handleSubscriptionExpiry(userId: string): Promise<Subscription | null> {
    try {
      const subscription = await this.getSubscriptionByUserId(userId);

      if (!subscription) {
        return null;
      }

      // Update to expired status but keep Pro entitlements visible for grace period
      return await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.EXPIRED,
        },
      });
    } catch (error) {
      console.error(`Error handling subscription expiry for user ${userId}:`, error);
      throw new Error('Failed to handle subscription expiry');
    }
  }

  /**
   * Get or create subscription for a user (ensures user always has a subscription record)
   * @param userId - The user's primary ID
   * @returns Subscription
   */
  static async getOrCreateSubscription(userId: string): Promise<Subscription> {
    try {
      const existing = await this.getSubscriptionByUserId(userId);
      if (existing) {
        return existing;
      }
      return await this.createSubscription(userId, {});
    } catch (error) {
      console.error(`Error getting or creating subscription for user ${userId}:`, error);
      throw new Error('Failed to get or create subscription');
    }
  }
}

export default SubscriptionService;
