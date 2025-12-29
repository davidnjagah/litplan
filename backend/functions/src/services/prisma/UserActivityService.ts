/**
 * User Activity Service
 *
 * Provides CRUD operations for user activity tracking.
 * Handles activity logging, viewed cities, saved cities, and user engagement metrics.
 *
 * @module services/prisma/UserActivityService
 * @since Sprint 5 Phase 2 - Prisma Service Layer
 */

import prisma from '../../lib/prisma';
import {
  UserActivity,
  ActivityType,
  SavedCity,
  ViewedCity,
  City,
} from '@prisma/client';

export interface LogActivityData {
  cityId?: string;
  planId?: string;
  flowId?: string;
  source?: string;
  sessionId?: string;
}

export interface SavedCityWithDetails extends SavedCity {
  city: City;
}

export interface ViewedCityWithDetails extends ViewedCity {
  city: City;
}

export class UserActivityService {
  /**
   * Log a user activity
   * @param userId - The user's primary ID
   * @param type - The activity type
   * @param data - Optional activity data
   * @returns Created activity record
   */
  static async logActivity(
    userId: string,
    type: ActivityType,
    data?: LogActivityData
  ): Promise<UserActivity> {
    try {
      return await prisma.userActivity.create({
        data: {
          userId,
          type,
          cityId: data?.cityId,
          planId: data?.planId,
          flowId: data?.flowId,
          source: data?.source,
          sessionId: data?.sessionId,
        },
      });
    } catch (error) {
      console.error(`Error logging activity for user ${userId}:`, error);
      throw new Error('Failed to log activity');
    }
  }

  /**
   * Get viewed cities for a user
   * @param userId - The user's primary ID
   * @param limit - Maximum number of cities to return
   * @returns Array of viewed cities ordered by most recent
   */
  static async getViewedCities(
    userId: string,
    limit?: number
  ): Promise<ViewedCityWithDetails[]> {
    try {
      return await prisma.viewedCity.findMany({
        where: { userId },
        take: limit,
        orderBy: { viewedAt: 'desc' },
        include: {
          city: true,
        },
      });
    } catch (error) {
      console.error(`Error fetching viewed cities for user ${userId}:`, error);
      throw new Error('Failed to fetch viewed cities');
    }
  }

  /**
   * Get saved cities for a user
   * @param userId - The user's primary ID
   * @returns Array of saved cities
   */
  static async getSavedCities(userId: string): Promise<SavedCityWithDetails[]> {
    try {
      return await prisma.savedCity.findMany({
        where: { userId },
        orderBy: { savedAt: 'desc' },
        include: {
          city: true,
        },
      });
    } catch (error) {
      console.error(`Error fetching saved cities for user ${userId}:`, error);
      throw new Error('Failed to fetch saved cities');
    }
  }

  /**
   * Save a city for a user
   * @param userId - The user's primary ID
   * @param cityId - The city's primary ID
   * @param notes - Optional notes about the saved city
   * @returns Created saved city record
   */
  static async saveCity(
    userId: string,
    cityId: string,
    notes?: string
  ): Promise<SavedCity> {
    try {
      // Use upsert to handle case where city is already saved
      const savedCity = await prisma.savedCity.upsert({
        where: {
          userId_cityId: {
            userId,
            cityId,
          },
        },
        update: {
          notes,
          savedAt: new Date(),
        },
        create: {
          userId,
          cityId,
          notes,
        },
      });

      // Log the save activity
      await this.logActivity(userId, ActivityType.SAVED_CITY, { cityId });

      return savedCity;
    } catch (error) {
      console.error(`Error saving city ${cityId} for user ${userId}:`, error);
      throw new Error('Failed to save city');
    }
  }

  /**
   * Unsave a city for a user
   * @param userId - The user's primary ID
   * @param cityId - The city's primary ID
   * @returns true if city was unsaved, false if it wasn't saved
   */
  static async unsaveCity(userId: string, cityId: string): Promise<boolean> {
    try {
      const result = await prisma.savedCity.deleteMany({
        where: {
          userId,
          cityId,
        },
      });

      if (result.count > 0) {
        // Log the unsave activity
        await this.logActivity(userId, ActivityType.UNSAVED_CITY, { cityId });
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error unsaving city ${cityId} for user ${userId}:`, error);
      throw new Error('Failed to unsave city');
    }
  }

  /**
   * Record a city view for a user
   * @param userId - The user's primary ID
   * @param cityId - The city's primary ID
   * @returns Updated or created viewed city record
   */
  static async recordCityView(userId: string, cityId: string): Promise<ViewedCity> {
    try {
      // Use upsert to increment view count or create new record
      const viewedCity = await prisma.viewedCity.upsert({
        where: {
          userId_cityId: {
            userId,
            cityId,
          },
        },
        update: {
          viewedAt: new Date(),
          viewCount: {
            increment: 1,
          },
        },
        create: {
          userId,
          cityId,
          viewCount: 1,
        },
      });

      // Log the view activity
      await this.logActivity(userId, ActivityType.VIEWED_CITY, { cityId });

      return viewedCity;
    } catch (error) {
      console.error(`Error recording city view ${cityId} for user ${userId}:`, error);
      throw new Error('Failed to record city view');
    }
  }

  /**
   * Record a plan view for a user
   * @param userId - The user's primary ID
   * @param planId - The plan's primary ID
   * @param cityId - The city's primary ID (optional)
   * @param source - The source of the view (optional)
   * @returns Created activity record
   */
  static async recordPlanView(
    userId: string,
    planId: string,
    cityId?: string,
    source?: string
  ): Promise<UserActivity> {
    try {
      return await this.logActivity(userId, ActivityType.VIEWED_PLAN, {
        planId,
        cityId,
        source,
      });
    } catch (error) {
      console.error(`Error recording plan view ${planId} for user ${userId}:`, error);
      throw new Error('Failed to record plan view');
    }
  }

  /**
   * Record a flow view for a user
   * @param userId - The user's primary ID
   * @param flowId - The flow's primary ID
   * @param cityId - The city's primary ID (optional)
   * @param source - The source of the view (optional)
   * @returns Created activity record
   */
  static async recordFlowView(
    userId: string,
    flowId: string,
    cityId?: string,
    source?: string
  ): Promise<UserActivity> {
    try {
      return await this.logActivity(userId, ActivityType.VIEWED_FLOW, {
        flowId,
        cityId,
        source,
      });
    } catch (error) {
      console.error(`Error recording flow view ${flowId} for user ${userId}:`, error);
      throw new Error('Failed to record flow view');
    }
  }

  /**
   * Record a search activity
   * @param userId - The user's primary ID
   * @param source - Search source/query info
   * @returns Created activity record
   */
  static async recordSearch(userId: string, source: string): Promise<UserActivity> {
    try {
      return await this.logActivity(userId, ActivityType.SEARCH, { source });
    } catch (error) {
      console.error(`Error recording search for user ${userId}:`, error);
      throw new Error('Failed to record search');
    }
  }

  /**
   * Check if a city is saved by a user
   * @param userId - The user's primary ID
   * @param cityId - The city's primary ID
   * @returns true if city is saved
   */
  static async isCitySaved(userId: string, cityId: string): Promise<boolean> {
    try {
      const savedCity = await prisma.savedCity.findUnique({
        where: {
          userId_cityId: {
            userId,
            cityId,
          },
        },
        select: { id: true },
      });
      return savedCity !== null;
    } catch (error) {
      console.error(`Error checking if city ${cityId} is saved for user ${userId}:`, error);
      throw new Error('Failed to check saved city status');
    }
  }

  /**
   * Get user's recent activity
   * @param userId - The user's primary ID
   * @param limit - Maximum number of activities to return
   * @returns Array of recent activities
   */
  static async getRecentActivity(
    userId: string,
    limit?: number
  ): Promise<UserActivity[]> {
    try {
      return await prisma.userActivity.findMany({
        where: { userId },
        take: limit || 50,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error(`Error fetching recent activity for user ${userId}:`, error);
      throw new Error('Failed to fetch recent activity');
    }
  }

  /**
   * Get activity by type for a user
   * @param userId - The user's primary ID
   * @param type - The activity type to filter by
   * @param limit - Maximum number of activities to return
   * @returns Array of activities of the specified type
   */
  static async getActivityByType(
    userId: string,
    type: ActivityType,
    limit?: number
  ): Promise<UserActivity[]> {
    try {
      return await prisma.userActivity.findMany({
        where: {
          userId,
          type,
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error(`Error fetching ${type} activities for user ${userId}:`, error);
      throw new Error(`Failed to fetch ${type} activities`);
    }
  }

  /**
   * Get saved city count for a user
   * @param userId - The user's primary ID
   * @returns Number of saved cities
   */
  static async getSavedCityCount(userId: string): Promise<number> {
    try {
      return await prisma.savedCity.count({
        where: { userId },
      });
    } catch (error) {
      console.error(`Error counting saved cities for user ${userId}:`, error);
      throw new Error('Failed to count saved cities');
    }
  }

  /**
   * Get the number of unique cities viewed this week by a user
   * @param userId - The user's primary ID
   * @returns Number of unique cities viewed this week
   */
  static async getCitiesViewedThisWeek(userId: string): Promise<number> {
    try {
      // Get the start of the current week (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      startOfWeek.setHours(0, 0, 0, 0);

      const viewedCities = await prisma.viewedCity.count({
        where: {
          userId,
          viewedAt: {
            gte: startOfWeek,
          },
        },
      });

      return viewedCities;
    } catch (error) {
      console.error(`Error counting cities viewed this week for user ${userId}:`, error);
      throw new Error('Failed to count cities viewed this week');
    }
  }
}

export default UserActivityService;
