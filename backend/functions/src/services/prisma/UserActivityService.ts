/**
 * User Activity Service
 *
 * Provides CRUD operations for user activity tracking.
 * Handles viewed cities, saved cities, and user engagement metrics.
 *
 * @module services/prisma/UserActivityService
 * @since Sprint 5 Phase 2 - Prisma Service Layer
 * @updated Sprint 9 - Removed UserActivity model, using ViewedCity/SavedCity only
 */

import prisma from '../../lib/prisma';
import {
  SavedCity,
  ViewedCity,
  City,
} from '@prisma/client';

export interface SavedCityWithDetails extends SavedCity {
  city: City;
}

export interface ViewedCityWithDetails extends ViewedCity {
  city: City;
}

export class UserActivityService {
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

      return result.count > 0;
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

      return viewedCity;
    } catch (error) {
      console.error(`Error recording city view ${cityId} for user ${userId}:`, error);
      throw new Error('Failed to record city view');
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

  /**
   * Get viewed city count for a user
   * @param userId - The user's primary ID
   * @returns Number of viewed cities
   */
  static async getViewedCityCount(userId: string): Promise<number> {
    try {
      return await prisma.viewedCity.count({
        where: { userId },
      });
    } catch (error) {
      console.error(`Error counting viewed cities for user ${userId}:`, error);
      throw new Error('Failed to count viewed cities');
    }
  }
}

export default UserActivityService;
