/**
 * Plan Service
 *
 * Provides CRUD operations for Plan model.
 * Handles plan data retrieval by city, featured plans, and weekend plans.
 *
 * @module services/prisma/PlanService
 * @since Sprint 5 Phase 2 - Prisma Service Layer
 */

import prisma from '../../lib/prisma';
import { Plan, PlanType } from '@prisma/client';

export interface GetPlansOptions {
  limit?: number;
  isWeekend?: boolean;
  type?: PlanType;
}

export interface PlanWithCity extends Plan {
  city: {
    id: string;
    name: string;
    cityId: string;
  };
}

export class PlanService {
  /**
   * Get plans for a specific city with optional filtering
   * @param cityId - The city's primary ID (cuid)
   * @param options - Filter options (limit, isWeekend, type)
   * @returns Array of plans ordered by rank
   */
  static async getPlansByCityId(
    cityId: string,
    options?: GetPlansOptions
  ): Promise<Plan[]> {
    try {
      const where: {
        cityId: string;
        isWeekend?: boolean;
        type?: PlanType;
      } = { cityId };

      if (options?.isWeekend !== undefined) {
        where.isWeekend = options.isWeekend;
      }

      if (options?.type) {
        where.type = options.type;
      }

      return await prisma.plan.findMany({
        where,
        take: options?.limit,
        orderBy: { rank: 'asc' },
      });
    } catch (error) {
      console.error(`Error fetching plans for city ${cityId}:`, error);
      throw new Error('Failed to fetch plans');
    }
  }

  /**
   * Get a plan by its primary ID
   * @param id - The plan's primary ID (cuid)
   * @returns Plan or null if not found
   */
  static async getPlanById(id: string): Promise<Plan | null> {
    try {
      return await prisma.plan.findUnique({
        where: { id },
      });
    } catch (error) {
      console.error(`Error fetching plan by ID ${id}:`, error);
      throw new Error('Failed to fetch plan');
    }
  }

  /**
   * Get a plan by its legacy planId (for backward compatibility)
   * @param planId - The legacy plan ID (e.g., 'nyc-plan-001')
   * @returns Plan or null if not found
   */
  static async getPlanByLegacyId(planId: string): Promise<Plan | null> {
    try {
      return await prisma.plan.findUnique({
        where: { planId },
      });
    } catch (error) {
      console.error(`Error fetching plan by legacy ID ${planId}:`, error);
      throw new Error('Failed to fetch plan');
    }
  }

  /**
   * Get featured plans for a city
   * @param cityId - The city's primary ID
   * @param limit - Maximum number of plans to return
   * @returns Array of featured plans
   */
  static async getFeaturedPlans(cityId: string, limit?: number): Promise<Plan[]> {
    try {
      return await prisma.plan.findMany({
        where: {
          cityId,
          isFeatured: true,
        },
        take: limit,
        orderBy: { rank: 'asc' },
      });
    } catch (error) {
      console.error(`Error fetching featured plans for city ${cityId}:`, error);
      throw new Error('Failed to fetch featured plans');
    }
  }

  /**
   * Get weekend plans for a city
   * @param cityId - The city's primary ID
   * @returns Array of weekend plans
   */
  static async getWeekendPlans(cityId: string): Promise<Plan[]> {
    try {
      return await prisma.plan.findMany({
        where: {
          cityId,
          isWeekend: true,
        },
        orderBy: { rank: 'asc' },
      });
    } catch (error) {
      console.error(`Error fetching weekend plans for city ${cityId}:`, error);
      throw new Error('Failed to fetch weekend plans');
    }
  }

  /**
   * Get plan with city information
   * @param id - The plan's primary ID
   * @returns Plan with city data or null
   */
  static async getPlanWithCity(id: string): Promise<PlanWithCity | null> {
    try {
      return await prisma.plan.findUnique({
        where: { id },
        include: {
          city: {
            select: {
              id: true,
              name: true,
              cityId: true,
            },
          },
        },
      });
    } catch (error) {
      console.error(`Error fetching plan with city ${id}:`, error);
      throw new Error('Failed to fetch plan with city');
    }
  }

  /**
   * Get plans by type for a city
   * @param cityId - The city's primary ID
   * @param type - The plan type (BAR, CLUB, EVENT, RESTAURANT)
   * @param limit - Maximum number of plans to return
   * @returns Array of plans of the specified type
   */
  static async getPlansByType(
    cityId: string,
    type: PlanType,
    limit?: number
  ): Promise<Plan[]> {
    try {
      return await prisma.plan.findMany({
        where: {
          cityId,
          type,
        },
        take: limit,
        orderBy: { rank: 'asc' },
      });
    } catch (error) {
      console.error(`Error fetching ${type} plans for city ${cityId}:`, error);
      throw new Error(`Failed to fetch ${type} plans`);
    }
  }

  /**
   * Search plans by title or venue name
   * @param cityId - The city's primary ID
   * @param query - Search query string
   * @param limit - Maximum number of results
   * @returns Array of matching plans
   */
  static async searchPlans(
    cityId: string,
    query: string,
    limit?: number
  ): Promise<Plan[]> {
    try {
      const searchTerm = query.toLowerCase().trim();

      if (!searchTerm) {
        return [];
      }

      return await prisma.plan.findMany({
        where: {
          cityId,
          OR: [
            {
              title: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
            {
              venueName: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
            {
              category: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          ],
        },
        take: limit,
        orderBy: { rank: 'asc' },
      });
    } catch (error) {
      console.error(`Error searching plans with query "${query}":`, error);
      throw new Error('Failed to search plans');
    }
  }

  /**
   * Get total plan count for a city
   * @param cityId - The city's primary ID
   * @returns Number of plans
   */
  static async getPlanCountByCityId(cityId: string): Promise<number> {
    try {
      return await prisma.plan.count({
        where: { cityId },
      });
    } catch (error) {
      console.error(`Error counting plans for city ${cityId}:`, error);
      throw new Error('Failed to count plans');
    }
  }
}

export default PlanService;
