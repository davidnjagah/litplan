/**
 * City Service
 *
 * Provides CRUD operations for City model.
 * Handles city data including featured cities, search, and plan count updates.
 *
 * @module services/prisma/CityService
 * @since Sprint 5 Phase 2 - Prisma Service Layer
 */

import prisma from '../../lib/prisma';
import { City } from '@prisma/client';

export interface GetCitiesOptions {
  featured?: boolean;
  limit?: number;
}

export interface CityWithPlanCount extends City {
  _count?: {
    plans: number;
  };
}

export class CityService {
  /**
   * Get all cities with optional filtering
   * @param options - Filter options (featured, limit)
   * @returns Array of cities ordered by rank
   */
  static async getAllCities(options?: GetCitiesOptions): Promise<City[]> {
    try {
      const where: { featured?: boolean } = {};

      if (options?.featured !== undefined) {
        where.featured = options.featured;
      }

      return await prisma.city.findMany({
        where,
        take: options?.limit,
        orderBy: { rank: 'asc' },
      });
    } catch (error) {
      console.error('Error fetching cities:', error);
      throw new Error('Failed to fetch cities');
    }
  }

  /**
   * Get a city by its primary ID
   * @param id - The city's primary ID (cuid)
   * @returns City or null if not found
   */
  static async getCityById(id: string): Promise<City | null> {
    try {
      return await prisma.city.findUnique({
        where: { id },
      });
    } catch (error) {
      console.error(`Error fetching city by ID ${id}:`, error);
      throw new Error('Failed to fetch city');
    }
  }

  /**
   * Get a city by its legacy cityId (for backward compatibility)
   * @param cityId - The legacy city ID (e.g., 'nyc-001')
   * @returns City or null if not found
   */
  static async getCityByLegacyId(cityId: string): Promise<City | null> {
    try {
      return await prisma.city.findUnique({
        where: { cityId },
      });
    } catch (error) {
      console.error(`Error fetching city by legacy ID ${cityId}:`, error);
      throw new Error('Failed to fetch city');
    }
  }

  /**
   * Search cities by name or country
   * @param query - Search query string
   * @returns Array of matching cities
   */
  static async searchCities(query: string): Promise<City[]> {
    try {
      const searchTerm = query.toLowerCase().trim();

      if (!searchTerm) {
        return [];
      }

      return await prisma.city.findMany({
        where: {
          OR: [
            {
              name: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
            {
              country: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          ],
        },
        orderBy: { rank: 'asc' },
      });
    } catch (error) {
      console.error(`Error searching cities with query "${query}":`, error);
      throw new Error('Failed to search cities');
    }
  }

  /**
   * Update the plan count for a city
   * @param cityId - The city's primary ID
   * @param count - The new plan count
   * @returns Updated city
   */
  static async updateCityPlanCount(cityId: string, count: number): Promise<City> {
    try {
      return await prisma.city.update({
        where: { id: cityId },
        data: {
          totalPlansThisWeek: count,
          lastUpdated: new Date(),
        },
      });
    } catch (error) {
      console.error(`Error updating plan count for city ${cityId}:`, error);
      throw new Error('Failed to update city plan count');
    }
  }

  /**
   * Get city with plan count
   * @param id - The city's primary ID
   * @returns City with plan count or null
   */
  static async getCityWithPlanCount(id: string): Promise<CityWithPlanCount | null> {
    try {
      return await prisma.city.findUnique({
        where: { id },
        include: {
          _count: {
            select: { plans: true },
          },
        },
      });
    } catch (error) {
      console.error(`Error fetching city with plan count ${id}:`, error);
      throw new Error('Failed to fetch city with plan count');
    }
  }

  /**
   * Get featured cities
   * @param limit - Maximum number of cities to return
   * @returns Array of featured cities
   */
  static async getFeaturedCities(limit?: number): Promise<City[]> {
    return this.getAllCities({ featured: true, limit });
  }

  /**
   * Get all cities with their plan counts
   * @returns Array of cities with plan counts
   */
  static async getAllCitiesWithPlanCounts(): Promise<CityWithPlanCount[]> {
    try {
      return await prisma.city.findMany({
        orderBy: { rank: 'asc' },
        include: {
          _count: {
            select: { plans: true },
          },
        },
      });
    } catch (error) {
      console.error('Error fetching cities with plan counts:', error);
      throw new Error('Failed to fetch cities with plan counts');
    }
  }
}

export default CityService;
