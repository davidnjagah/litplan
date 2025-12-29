/**
 * App Config Service
 *
 * Provides operations for application configuration management.
 * Handles current week tracking and tier limits.
 *
 * @module services/prisma/AppConfigService
 * @since Sprint 5 Phase 2 - Prisma Service Layer
 */

import prisma from '../../lib/prisma';
import { AppConfig, SubscriptionTier } from '@prisma/client';

export interface TierLimits {
  maxCities: number;
  maxPlans: number;
  weekendAccess: boolean;
}

export interface WeekInfo {
  currentWeek: string;
  weekStartDate: Date;
  weekEndDate: Date;
}

// Default config ID (singleton)
const CONFIG_ID = 'app';

export class AppConfigService {
  /**
   * Get the application configuration
   * @returns AppConfig or null if not found
   */
  static async getConfig(): Promise<AppConfig | null> {
    try {
      return await prisma.appConfig.findUnique({
        where: { id: CONFIG_ID },
      });
    } catch (error) {
      console.error('Error fetching app config:', error);
      throw new Error('Failed to fetch app config');
    }
  }

  /**
   * Get or create the application configuration
   * @returns AppConfig
   */
  static async getOrCreateConfig(): Promise<AppConfig> {
    try {
      const existing = await this.getConfig();
      if (existing) {
        return existing;
      }

      // Create default config with current week
      const weekInfo = this.calculateCurrentWeek();
      return await prisma.appConfig.create({
        data: {
          id: CONFIG_ID,
          currentWeek: weekInfo.currentWeek,
          weekStartDate: weekInfo.weekStartDate,
          weekEndDate: weekInfo.weekEndDate,
        },
      });
    } catch (error) {
      console.error('Error getting or creating app config:', error);
      throw new Error('Failed to get or create app config');
    }
  }

  /**
   * Update the current week in the configuration
   * @returns Updated AppConfig
   */
  static async updateCurrentWeek(): Promise<AppConfig> {
    try {
      const weekInfo = this.calculateCurrentWeek();

      return await prisma.appConfig.upsert({
        where: { id: CONFIG_ID },
        update: {
          currentWeek: weekInfo.currentWeek,
          weekStartDate: weekInfo.weekStartDate,
          weekEndDate: weekInfo.weekEndDate,
        },
        create: {
          id: CONFIG_ID,
          currentWeek: weekInfo.currentWeek,
          weekStartDate: weekInfo.weekStartDate,
          weekEndDate: weekInfo.weekEndDate,
        },
      });
    } catch (error) {
      console.error('Error updating current week:', error);
      throw new Error('Failed to update current week');
    }
  }

  /**
   * Get tier limits for a specific subscription tier
   * @param tier - The subscription tier ('FREE' or 'PRO')
   * @returns TierLimits for the specified tier
   */
  static async getTierLimits(tier: 'FREE' | 'PRO'): Promise<TierLimits> {
    try {
      const config = await this.getOrCreateConfig();

      if (tier === 'PRO') {
        return {
          maxCities: config.proMaxCities,
          maxPlans: config.proMaxPlans,
          weekendAccess: config.proWeekendAccess,
        };
      }

      return {
        maxCities: config.freeMaxCities,
        maxPlans: config.freeMaxPlans,
        weekendAccess: config.freeWeekendAccess,
      };
    } catch (error) {
      console.error(`Error getting tier limits for ${tier}:`, error);
      throw new Error('Failed to get tier limits');
    }
  }

  /**
   * Update tier limits in the configuration
   * @param tier - The subscription tier to update
   * @param limits - New limits to apply
   * @returns Updated AppConfig
   */
  static async updateTierLimits(
    tier: 'FREE' | 'PRO',
    limits: Partial<TierLimits>
  ): Promise<AppConfig> {
    try {
      const updateData: Record<string, number | boolean> = {};

      if (tier === 'PRO') {
        if (limits.maxCities !== undefined) updateData.proMaxCities = limits.maxCities;
        if (limits.maxPlans !== undefined) updateData.proMaxPlans = limits.maxPlans;
        if (limits.weekendAccess !== undefined) updateData.proWeekendAccess = limits.weekendAccess;
      } else {
        if (limits.maxCities !== undefined) updateData.freeMaxCities = limits.maxCities;
        if (limits.maxPlans !== undefined) updateData.freeMaxPlans = limits.maxPlans;
        if (limits.weekendAccess !== undefined) updateData.freeWeekendAccess = limits.weekendAccess;
      }

      return await prisma.appConfig.update({
        where: { id: CONFIG_ID },
        data: updateData,
      });
    } catch (error) {
      console.error(`Error updating tier limits for ${tier}:`, error);
      throw new Error('Failed to update tier limits');
    }
  }

  /**
   * Get current week info
   * @returns Current week information
   */
  static async getCurrentWeekInfo(): Promise<WeekInfo> {
    try {
      const config = await this.getOrCreateConfig();
      return {
        currentWeek: config.currentWeek,
        weekStartDate: config.weekStartDate,
        weekEndDate: config.weekEndDate,
      };
    } catch (error) {
      console.error('Error getting current week info:', error);
      throw new Error('Failed to get current week info');
    }
  }

  /**
   * Check if a date is within the current week
   * @param date - The date to check
   * @returns true if the date is within the current week
   */
  static async isDateInCurrentWeek(date: Date): Promise<boolean> {
    try {
      const config = await this.getOrCreateConfig();
      return date >= config.weekStartDate && date <= config.weekEndDate;
    } catch (error) {
      console.error('Error checking if date is in current week:', error);
      throw new Error('Failed to check date');
    }
  }

  /**
   * Calculate the current week information
   * @returns WeekInfo for the current week
   */
  static calculateCurrentWeek(): WeekInfo {
    const now = new Date();
    const year = now.getFullYear();

    // Calculate week number (ISO week)
    const jan1 = new Date(year, 0, 1);
    const dayOfYear = Math.ceil(
      (now.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000)
    );
    const weekNumber = Math.ceil((dayOfYear + jan1.getDay()) / 7);
    const paddedWeek = weekNumber.toString().padStart(2, '0');

    // Calculate week start (Monday) and end (Sunday)
    const dayOfWeek = now.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const weekStartDate = new Date(now);
    weekStartDate.setDate(now.getDate() - daysFromMonday);
    weekStartDate.setHours(0, 0, 0, 0);

    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    weekEndDate.setHours(23, 59, 59, 999);

    return {
      currentWeek: `${year}-W${paddedWeek}`,
      weekStartDate,
      weekEndDate,
    };
  }

  /**
   * Get limits for a user based on their subscription tier
   * @param tier - The user's subscription tier
   * @returns TierLimits
   */
  static async getLimitsForTier(tier: SubscriptionTier): Promise<TierLimits> {
    return this.getTierLimits(tier);
  }

  /**
   * Check if the week needs to be updated
   * @returns true if the stored week is outdated
   */
  static async isWeekOutdated(): Promise<boolean> {
    try {
      const config = await this.getConfig();
      if (!config) {
        return true;
      }

      const currentWeekInfo = this.calculateCurrentWeek();
      return config.currentWeek !== currentWeekInfo.currentWeek;
    } catch (error) {
      console.error('Error checking if week is outdated:', error);
      throw new Error('Failed to check week status');
    }
  }

  /**
   * Update week if outdated
   * @returns Updated AppConfig or null if no update needed
   */
  static async updateWeekIfNeeded(): Promise<AppConfig | null> {
    try {
      const isOutdated = await this.isWeekOutdated();
      if (isOutdated) {
        return await this.updateCurrentWeek();
      }
      return null;
    } catch (error) {
      console.error('Error updating week if needed:', error);
      throw new Error('Failed to update week');
    }
  }
}

export default AppConfigService;
