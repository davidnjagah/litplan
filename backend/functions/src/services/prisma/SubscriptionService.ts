/**
 * Subscription Service
 *
 * Provides CRUD operations for Subscription model.
 * Handles subscription management, tier upgrades/downgrades, and entitlement checks.
 *
 * @module services/prisma/SubscriptionService
 * @since Sprint 5 Phase 2 - Prisma Service Layer
 * @updated Sprint 6 Phase 2 - Supabase Auth Integration
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
  purchaseDate?: Date;
  expiresDate?: Date;
  environment?: string;
}

export interface TransactionData {
  transactionId: string;
  productId: string;
  originalTransactionId?: string;
  purchaseDate?: Date;
  expiresDate?: Date;
  environment?: string;
}

/**
 * StoreKit 2 transaction verification data
 * Matches the data structure sent from iOS client
 */
export interface StoreKit2TransactionData {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: string | Date;
  expiresDate?: string | Date;
  environment: 'sandbox' | 'production';
  ownershipType?: string;
  signedTransactionInfo?: string;
}

/**
 * Supported product IDs
 */
export const PRODUCT_IDS = {
  MONTHLY: 'litplan_pro_monthly',
  YEARLY: 'litplan_pro_yearly',
} as const;

export type ProductId = typeof PRODUCT_IDS[keyof typeof PRODUCT_IDS];

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
   * Get subscription by Supabase user ID
   * @param supabaseUserId - The Supabase user ID
   * @returns Subscription or null if not found
   */
  static async getSubscriptionBySupabaseId(supabaseUserId: string): Promise<Subscription | null> {
    try {
      return await prisma.subscription.findUnique({
        where: { supabaseUserId },
      });
    } catch (error) {
      console.error(`Error fetching subscription by Supabase ID ${supabaseUserId}:`, error);
      throw new Error('Failed to fetch subscription');
    }
  }

  /**
   * Get subscription by Clerk user ID (DEPRECATED - use getSubscriptionBySupabaseId)
   * @param clerkUserId - The Clerk user ID
   * @returns Subscription or null if not found
   * @deprecated Use getSubscriptionBySupabaseId instead
   */
  static async getSubscriptionByClerkId(clerkUserId: string): Promise<Subscription | null> {
    // Map to Supabase ID field for backward compatibility
    return this.getSubscriptionBySupabaseId(clerkUserId);
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
      // First, get the user to get their supabaseUserId
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { supabaseUserId: true },
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
          supabaseUserId: user.supabaseUserId,
          status: data.status || SubscriptionStatus.FREE,
          tier,
          startDate: data.startDate,
          expiryDate: data.expiryDate,
          autoRenew: data.autoRenew || false,
          transactionId: data.transactionId,
          productId: data.productId,
          originalTransactionId: data.originalTransactionId,
          purchaseDate: data.purchaseDate,
          expiresDate: data.expiresDate,
          environment: data.environment || 'production',
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
      // Remove id, userId, supabaseUserId from update data
      const { id: _, userId: __, supabaseUserId: ___, ...updateData } = data as Subscription & {
        id: string;
        userId: string;
        supabaseUserId: string;
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
          purchaseDate: transactionData.purchaseDate,
          expiresDate: transactionData.expiresDate,
          environment: transactionData.environment || 'production',
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
   * Check entitlements by Supabase ID
   * @param supabaseUserId - The Supabase user ID
   * @returns User's current entitlements
   */
  static async checkEntitlementsBySupabaseId(supabaseUserId: string): Promise<Entitlements> {
    try {
      const subscription = await this.getSubscriptionBySupabaseId(supabaseUserId);

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
      console.error(`Error checking entitlements by Supabase ID ${supabaseUserId}:`, error);
      throw new Error('Failed to check entitlements');
    }
  }

  /**
   * Check entitlements by Clerk ID (DEPRECATED - use checkEntitlementsBySupabaseId)
   * @param clerkUserId - The Clerk user ID
   * @returns User's current entitlements
   * @deprecated Use checkEntitlementsBySupabaseId instead
   */
  static async checkEntitlementsByClerkId(clerkUserId: string): Promise<Entitlements> {
    // Map to Supabase ID field for backward compatibility
    return this.checkEntitlementsBySupabaseId(clerkUserId);
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

  /**
   * Verify and upsert a StoreKit 2 transaction
   * This method validates the transaction data and creates/updates the subscription record
   *
   * @param userId - The user's primary ID
   * @param transactionData - StoreKit 2 transaction data from iOS client
   * @returns Updated subscription with verification result
   */
  static async verifyAndUpsertTransaction(
    userId: string,
    transactionData: StoreKit2TransactionData
  ): Promise<{ subscription: Subscription; isNew: boolean; message: string }> {
    try {
      // Validate product ID
      const validProductIds = Object.values(PRODUCT_IDS);
      if (!validProductIds.includes(transactionData.productId as ProductId)) {
        throw new Error(`Invalid product ID: ${transactionData.productId}. Expected one of: ${validProductIds.join(', ')}`);
      }

      // Parse dates
      const purchaseDate = transactionData.purchaseDate instanceof Date
        ? transactionData.purchaseDate
        : new Date(transactionData.purchaseDate);

      const expiresDate = transactionData.expiresDate
        ? (transactionData.expiresDate instanceof Date
            ? transactionData.expiresDate
            : new Date(transactionData.expiresDate))
        : undefined;

      // Check if subscription has expired
      const now = new Date();
      const isExpired = expiresDate && expiresDate < now;

      // Determine subscription status
      let status: SubscriptionStatus;
      if (isExpired) {
        status = SubscriptionStatus.EXPIRED;
      } else {
        status = SubscriptionStatus.PRO;
      }

      // Get existing subscription
      const existingSubscription = await this.getSubscriptionByUserId(userId);

      if (existingSubscription) {
        // Update existing subscription
        const updatedSubscription = await prisma.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            status,
            tier: isExpired ? SubscriptionTier.FREE : SubscriptionTier.PRO,
            transactionId: transactionData.transactionId,
            originalTransactionId: transactionData.originalTransactionId,
            productId: transactionData.productId,
            purchaseDate,
            expiresDate,
            expiryDate: expiresDate, // Also update the legacy expiryDate field
            environment: transactionData.environment,
            autoRenew: !isExpired,
            startDate: existingSubscription.startDate || purchaseDate,
            ...(isExpired ? FREE_TIER_ENTITLEMENTS : PRO_TIER_ENTITLEMENTS),
          },
        });

        return {
          subscription: updatedSubscription,
          isNew: false,
          message: isExpired
            ? 'Subscription verified but has expired'
            : 'Subscription verified and updated successfully',
        };
      }

      // Create new subscription
      const newSubscription = await this.createSubscription(userId, {
        status,
        tier: isExpired ? SubscriptionTier.FREE : SubscriptionTier.PRO,
        transactionId: transactionData.transactionId,
        originalTransactionId: transactionData.originalTransactionId,
        productId: transactionData.productId,
        purchaseDate,
        expiresDate,
        expiryDate: expiresDate,
        environment: transactionData.environment,
        autoRenew: !isExpired,
        startDate: purchaseDate,
      });

      return {
        subscription: newSubscription,
        isNew: true,
        message: isExpired
          ? 'Subscription created but has expired'
          : 'Subscription verified and created successfully',
      };
    } catch (error) {
      console.error(`Error verifying transaction for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get subscription by original transaction ID
   * Used for finding existing subscriptions during restore
   *
   * @param originalTransactionId - The original transaction ID from Apple
   * @returns Subscription or null
   */
  static async getSubscriptionByOriginalTransactionId(
    originalTransactionId: string
  ): Promise<SubscriptionWithUser | null> {
    try {
      return await prisma.subscription.findFirst({
        where: { originalTransactionId },
        include: { user: true },
      });
    } catch (error) {
      console.error(`Error fetching subscription by original transaction ID ${originalTransactionId}:`, error);
      throw new Error('Failed to fetch subscription by original transaction ID');
    }
  }

  /**
   * Update subscription status (for webhook handlers)
   *
   * @param subscriptionId - The subscription's primary ID
   * @param status - New subscription status
   * @param additionalData - Optional additional data to update
   * @returns Updated subscription
   */
  static async updateSubscriptionStatus(
    subscriptionId: string,
    status: SubscriptionStatus,
    additionalData?: Partial<{
      expiresDate: Date;
      autoRenew: boolean;
      transactionId: string;
    }>
  ): Promise<Subscription> {
    try {
      // Determine if we need to update entitlements based on status
      const isActive = status === SubscriptionStatus.PRO || status === SubscriptionStatus.TRIAL;
      const entitlements = isActive ? PRO_TIER_ENTITLEMENTS : FREE_TIER_ENTITLEMENTS;
      const tier = isActive ? SubscriptionTier.PRO : SubscriptionTier.FREE;

      return await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status,
          tier,
          ...entitlements,
          ...(additionalData?.expiresDate && {
            expiresDate: additionalData.expiresDate,
            expiryDate: additionalData.expiresDate,
          }),
          ...(additionalData?.autoRenew !== undefined && { autoRenew: additionalData.autoRenew }),
          ...(additionalData?.transactionId && { transactionId: additionalData.transactionId }),
        },
      });
    } catch (error) {
      console.error(`Error updating subscription status for ${subscriptionId}:`, error);
      throw new Error('Failed to update subscription status');
    }
  }

  /**
   * Get detailed subscription status for API response
   *
   * @param userId - The user's primary ID
   * @returns Detailed subscription status
   */
  static async getDetailedSubscriptionStatus(userId: string): Promise<{
    hasSubscription: boolean;
    isActive: boolean;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    productId: string | null;
    purchaseDate: Date | null;
    expiresDate: Date | null;
    environment: string | null;
    autoRenew: boolean;
    daysUntilExpiry: number | null;
  }> {
    try {
      const subscription = await this.getSubscriptionByUserId(userId);

      if (!subscription) {
        return {
          hasSubscription: false,
          isActive: true, // Free tier is always "active"
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.FREE,
          productId: null,
          purchaseDate: null,
          expiresDate: null,
          environment: null,
          autoRenew: false,
          daysUntilExpiry: null,
        };
      }

      const now = new Date();
      const expiresDate = subscription.expiresDate;
      const isExpired = expiresDate && new Date(expiresDate) < now;

      // Calculate days until expiry
      let daysUntilExpiry: number | null = null;
      if (expiresDate && !isExpired) {
        const diffTime = new Date(expiresDate).getTime() - now.getTime();
        daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      const isActive = !isExpired && (
        subscription.status === SubscriptionStatus.PRO ||
        subscription.status === SubscriptionStatus.TRIAL ||
        subscription.status === SubscriptionStatus.GRACE_PERIOD
      );

      return {
        hasSubscription: true,
        isActive,
        tier: subscription.tier,
        status: subscription.status,
        productId: subscription.productId,
        purchaseDate: subscription.purchaseDate,
        expiresDate: subscription.expiresDate,
        environment: subscription.environment,
        autoRenew: subscription.autoRenew,
        daysUntilExpiry,
      };
    } catch (error) {
      console.error(`Error getting detailed subscription status for user ${userId}:`, error);
      throw new Error('Failed to get subscription status');
    }
  }
}

export default SubscriptionService;
