/**
 * User Activity Service
 *
 * Provides CRUD operations for user activity tracking.
 * Handles viewed cities, saved cities, searched cities, and user engagement metrics.
 *
 * @module services/prisma/UserActivityService
 * @since Sprint 5 Phase 2 - Prisma Service Layer
 * @updated Sprint 9 - Removed UserActivity model, using ViewedCity/SavedCity only
 * @updated Sprint 10 - Added SearchedCity tracking and pagination support
 */

import prisma from '../../lib/prisma';
import {
  SavedCity,
  ViewedCity,
  SearchedCity,
  City,
} from '@prisma/client';

export interface SavedCityWithDetails extends SavedCity {
  city: City;
}

export interface ViewedCityWithDetails extends ViewedCity {
  city: City;
}

export interface SearchedCityWithDetails extends SearchedCity {
  city: City;
}

export interface PaginatedViewedCities {
  viewedCities: ViewedCityWithDetails[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export class UserActivityService {
  /**
   * Get viewed cities for a user (paginated)
   * @param userId - The user's primary ID
   * @param limit - Maximum number of cities to return (default 20)
   * @param offset - Number of cities to skip (default 0)
   * @returns Paginated viewed cities ordered by lastViewedAt DESC with city data
   */
  static async getViewedCities(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<PaginatedViewedCities> {
    try {
      // Run count and data fetch in parallel for efficiency
      const [viewedCities, total] = await Promise.all([
        prisma.viewedCity.findMany({
          where: { userId },
          take: limit,
          skip: offset,
          orderBy: { lastViewedAt: 'desc' },
          include: {
            city: true,
          },
        }),
        prisma.viewedCity.count({
          where: { userId },
        }),
      ]);

      return {
        viewedCities,
        total,
        limit,
        offset,
        hasMore: offset + viewedCities.length < total,
      };
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
   * Uses efficient upsert to increment viewCount if exists, create if not.
   * Updates lastViewedAt timestamp on each view for efficient sorting.
   *
   * @param userId - The user's primary ID
   * @param cityId - The city's primary ID
   * @returns Updated or created viewed city record
   */
  static async recordCityView(userId: string, cityId: string): Promise<ViewedCity> {
    try {
      const now = new Date();
      // Use upsert to increment view count or create new record
      // This is more efficient than read-then-write pattern
      const viewedCity = await prisma.viewedCity.upsert({
        where: {
          userId_cityId: {
            userId,
            cityId,
          },
        },
        update: {
          lastViewedAt: now, // Update lastViewedAt on each view for sorting
          viewCount: {
            increment: 1,
          },
        },
        create: {
          userId,
          cityId,
          viewCount: 1,
          viewedAt: now,
          lastViewedAt: now,
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

  // ==================== SEARCHED CITIES ====================

  /**
   * Record a city search for a user
   * Creates a new record for each search to support analytics.
   *
   * @param userId - The user's primary ID
   * @param cityId - The city's primary ID
   * @param searchQuery - The search term the user entered
   * @returns Created searched city record
   */
  static async recordCitySearch(
    userId: string,
    cityId: string,
    searchQuery: string
  ): Promise<SearchedCity> {
    try {
      // Create new record for each search (for analytics)
      // This allows tracking search patterns over time
      const searchedCity = await prisma.searchedCity.create({
        data: {
          userId,
          cityId,
          searchQuery: searchQuery.trim(),
        },
      });

      return searchedCity;
    } catch (error) {
      console.error(`Error recording city search for user ${userId}:`, error);
      throw new Error('Failed to record city search');
    }
  }

  /**
   * Get search history for a user
   * Returns recent unique cities searched, ordered by most recent search.
   *
   * @param userId - The user's primary ID
   * @param limit - Maximum number of unique cities to return (default 10)
   * @returns Array of searched cities with city data (unique by city, most recent first)
   */
  static async getSearchHistory(
    userId: string,
    limit: number = 10
  ): Promise<SearchedCityWithDetails[]> {
    try {
      // Get recent searches with city data
      // We use a subquery approach to get unique cities by most recent search
      const recentSearches = await prisma.searchedCity.findMany({
        where: { userId },
        orderBy: { searchedAt: 'desc' },
        include: {
          city: true,
        },
      });

      // Deduplicate by cityId, keeping only the most recent search per city
      const uniqueCitiesMap = new Map<string, SearchedCityWithDetails>();
      for (const search of recentSearches) {
        if (!uniqueCitiesMap.has(search.cityId)) {
          uniqueCitiesMap.set(search.cityId, search);
        }
      }

      // Convert to array and apply limit
      return Array.from(uniqueCitiesMap.values()).slice(0, limit);
    } catch (error) {
      console.error(`Error fetching search history for user ${userId}:`, error);
      throw new Error('Failed to fetch search history');
    }
  }

  /**
   * Get search count for a user
   * @param userId - The user's primary ID
   * @returns Total number of searches
   */
  static async getSearchCount(userId: string): Promise<number> {
    try {
      return await prisma.searchedCity.count({
        where: { userId },
      });
    } catch (error) {
      console.error(`Error counting searches for user ${userId}:`, error);
      throw new Error('Failed to count searches');
    }
  }
}

export default UserActivityService;
