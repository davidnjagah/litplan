/**
 * Group Flow Service
 *
 * Provides CRUD operations for GroupFlow and GroupFlowStep models.
 * Handles group flow data retrieval including related steps and plans.
 *
 * @module services/prisma/GroupFlowService
 * @since Sprint 5 Phase 2 - Prisma Service Layer
 */

import prisma from '../../lib/prisma';
import { GroupFlow, GroupFlowStep, Plan } from '@prisma/client';

export interface GetGroupFlowsOptions {
  limit?: number;
  isWeekend?: boolean;
  proOnly?: boolean;
}

export interface GroupFlowStepWithPlan extends GroupFlowStep {
  plan: Plan;
}

export interface GroupFlowWithSteps extends GroupFlow {
  steps: GroupFlowStepWithPlan[];
}

export interface GroupFlowWithCity extends GroupFlow {
  city: {
    id: string;
    name: string;
    cityId: string;
  };
}

export class GroupFlowService {
  /**
   * Get group flows for a specific city with optional filtering
   * @param cityId - The city's primary ID (cuid)
   * @param options - Filter options (limit, isWeekend, proOnly)
   * @returns Array of group flows ordered by rank
   */
  static async getGroupFlowsByCityId(
    cityId: string,
    options?: GetGroupFlowsOptions
  ): Promise<GroupFlow[]> {
    try {
      const where: {
        cityId: string;
        isWeekend?: boolean;
        proOnly?: boolean;
      } = { cityId };

      if (options?.isWeekend !== undefined) {
        where.isWeekend = options.isWeekend;
      }

      if (options?.proOnly !== undefined) {
        where.proOnly = options.proOnly;
      }

      return await prisma.groupFlow.findMany({
        where,
        take: options?.limit,
        orderBy: { rank: 'asc' },
      });
    } catch (error) {
      console.error(`Error fetching group flows for city ${cityId}:`, error);
      throw new Error('Failed to fetch group flows');
    }
  }

  /**
   * Get a group flow by its primary ID
   * @param id - The group flow's primary ID (cuid)
   * @returns GroupFlow or null if not found
   */
  static async getGroupFlowById(id: string): Promise<GroupFlow | null> {
    try {
      return await prisma.groupFlow.findUnique({
        where: { id },
      });
    } catch (error) {
      console.error(`Error fetching group flow by ID ${id}:`, error);
      throw new Error('Failed to fetch group flow');
    }
  }

  /**
   * Get a group flow by its legacy flowId (for backward compatibility)
   * @param flowId - The legacy flow ID (e.g., 'nyc-flow-001')
   * @returns GroupFlow or null if not found
   */
  static async getGroupFlowByLegacyId(flowId: string): Promise<GroupFlow | null> {
    try {
      return await prisma.groupFlow.findUnique({
        where: { flowId },
      });
    } catch (error) {
      console.error(`Error fetching group flow by legacy ID ${flowId}:`, error);
      throw new Error('Failed to fetch group flow');
    }
  }

  /**
   * Get a group flow with all related steps and plans
   * @param id - The group flow's primary ID
   * @returns GroupFlow with steps and plans or null
   */
  static async getGroupFlowWithSteps(id: string): Promise<GroupFlowWithSteps | null> {
    try {
      return await prisma.groupFlow.findUnique({
        where: { id },
        include: {
          steps: {
            orderBy: { stepNumber: 'asc' },
            include: {
              plan: true,
            },
          },
        },
      });
    } catch (error) {
      console.error(`Error fetching group flow with steps ${id}:`, error);
      throw new Error('Failed to fetch group flow with steps');
    }
  }

  /**
   * Get group flow with city information
   * @param id - The group flow's primary ID
   * @returns GroupFlow with city data or null
   */
  static async getGroupFlowWithCity(id: string): Promise<GroupFlowWithCity | null> {
    try {
      return await prisma.groupFlow.findUnique({
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
      console.error(`Error fetching group flow with city ${id}:`, error);
      throw new Error('Failed to fetch group flow with city');
    }
  }

  /**
   * Get all group flows for a city with their steps
   * @param cityId - The city's primary ID
   * @param limit - Maximum number of flows to return
   * @returns Array of group flows with steps
   */
  static async getGroupFlowsWithStepsByCityId(
    cityId: string,
    limit?: number
  ): Promise<GroupFlowWithSteps[]> {
    try {
      return await prisma.groupFlow.findMany({
        where: { cityId },
        take: limit,
        orderBy: { rank: 'asc' },
        include: {
          steps: {
            orderBy: { stepNumber: 'asc' },
            include: {
              plan: true,
            },
          },
        },
      });
    } catch (error) {
      console.error(`Error fetching group flows with steps for city ${cityId}:`, error);
      throw new Error('Failed to fetch group flows with steps');
    }
  }

  /**
   * Get steps for a specific group flow
   * @param flowId - The group flow's primary ID
   * @returns Array of steps with plans
   */
  static async getStepsByFlowId(flowId: string): Promise<GroupFlowStepWithPlan[]> {
    try {
      return await prisma.groupFlowStep.findMany({
        where: { flowId },
        orderBy: { stepNumber: 'asc' },
        include: {
          plan: true,
        },
      });
    } catch (error) {
      console.error(`Error fetching steps for flow ${flowId}:`, error);
      throw new Error('Failed to fetch flow steps');
    }
  }

  /**
   * Get total group flow count for a city
   * @param cityId - The city's primary ID
   * @returns Number of group flows
   */
  static async getGroupFlowCountByCityId(cityId: string): Promise<number> {
    try {
      return await prisma.groupFlow.count({
        where: { cityId },
      });
    } catch (error) {
      console.error(`Error counting group flows for city ${cityId}:`, error);
      throw new Error('Failed to count group flows');
    }
  }

  /**
   * Get weekend group flows for a city
   * @param cityId - The city's primary ID
   * @param limit - Maximum number of flows to return
   * @returns Array of weekend group flows
   */
  static async getWeekendFlows(cityId: string, limit?: number): Promise<GroupFlow[]> {
    try {
      return await prisma.groupFlow.findMany({
        where: {
          cityId,
          isWeekend: true,
        },
        take: limit,
        orderBy: { rank: 'asc' },
      });
    } catch (error) {
      console.error(`Error fetching weekend flows for city ${cityId}:`, error);
      throw new Error('Failed to fetch weekend flows');
    }
  }
}

export default GroupFlowService;
