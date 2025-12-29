/**
 * User Service
 *
 * Provides CRUD operations for User model.
 * Handles user creation, updates, and deletion with cascade support.
 *
 * @module services/prisma/UserService
 * @since Sprint 5 Phase 2 - Prisma Service Layer
 */

import prisma from '../../lib/prisma';
import { User, Subscription, SavedCity, ViewedCity } from '@prisma/client';

export interface CreateUserInput {
  clerkUserId: string;
  email?: string;
  displayName?: string;
  imageUrl?: string;
}

export interface UpdateUserInput {
  email?: string;
  displayName?: string;
  imageUrl?: string;
}

export interface UserWithSubscription extends User {
  subscription: Subscription | null;
}

export interface UserWithRelations extends User {
  subscription: Subscription | null;
  savedCities: SavedCity[];
  viewedCities: ViewedCity[];
}

export class UserService {
  /**
   * Get a user by their Clerk user ID
   * @param clerkUserId - The Clerk user ID
   * @returns User or null if not found
   */
  static async getUserByClerkId(clerkUserId: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { clerkUserId },
      });
    } catch (error) {
      console.error(`Error fetching user by Clerk ID ${clerkUserId}:`, error);
      throw new Error('Failed to fetch user');
    }
  }

  /**
   * Get a user by their primary ID
   * @param id - The user's primary ID (cuid)
   * @returns User or null if not found
   */
  static async getUserById(id: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { id },
      });
    } catch (error) {
      console.error(`Error fetching user by ID ${id}:`, error);
      throw new Error('Failed to fetch user');
    }
  }

  /**
   * Create a new user
   * @param data - User creation data
   * @returns Created user
   */
  static async createUser(data: CreateUserInput): Promise<User> {
    try {
      return await prisma.user.create({
        data: {
          clerkUserId: data.clerkUserId,
          email: data.email,
          displayName: data.displayName,
          imageUrl: data.imageUrl,
        },
      });
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * Update an existing user
   * @param id - The user's primary ID
   * @param data - Partial user data to update
   * @returns Updated user
   */
  static async updateUser(id: string, data: UpdateUserInput): Promise<User> {
    try {
      return await prisma.user.update({
        where: { id },
        data,
      });
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      throw new Error('Failed to update user');
    }
  }

  /**
   * Update user by Clerk ID
   * @param clerkUserId - The Clerk user ID
   * @param data - Partial user data to update
   * @returns Updated user
   */
  static async updateUserByClerkId(
    clerkUserId: string,
    data: UpdateUserInput
  ): Promise<User> {
    try {
      return await prisma.user.update({
        where: { clerkUserId },
        data,
      });
    } catch (error) {
      console.error(`Error updating user by Clerk ID ${clerkUserId}:`, error);
      throw new Error('Failed to update user');
    }
  }

  /**
   * Delete a user and all associated data (cascade)
   * @param id - The user's primary ID
   * @returns Deleted user
   */
  static async deleteUser(id: string): Promise<User> {
    try {
      // Due to onDelete: Cascade in the schema, all related records will be deleted
      return await prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Delete a user by Clerk ID
   * @param clerkUserId - The Clerk user ID
   * @returns Deleted user
   */
  static async deleteUserByClerkId(clerkUserId: string): Promise<User> {
    try {
      return await prisma.user.delete({
        where: { clerkUserId },
      });
    } catch (error) {
      console.error(`Error deleting user by Clerk ID ${clerkUserId}:`, error);
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Get user with subscription
   * @param id - The user's primary ID
   * @returns User with subscription or null
   */
  static async getUserWithSubscription(id: string): Promise<UserWithSubscription | null> {
    try {
      return await prisma.user.findUnique({
        where: { id },
        include: {
          subscription: true,
        },
      });
    } catch (error) {
      console.error(`Error fetching user with subscription ${id}:`, error);
      throw new Error('Failed to fetch user with subscription');
    }
  }

  /**
   * Get user with subscription by Clerk ID
   * @param clerkUserId - The Clerk user ID
   * @returns User with subscription or null
   */
  static async getUserWithSubscriptionByClerkId(
    clerkUserId: string
  ): Promise<UserWithSubscription | null> {
    try {
      return await prisma.user.findUnique({
        where: { clerkUserId },
        include: {
          subscription: true,
        },
      });
    } catch (error) {
      console.error(`Error fetching user with subscription by Clerk ID ${clerkUserId}:`, error);
      throw new Error('Failed to fetch user with subscription');
    }
  }

  /**
   * Get user with all relations
   * @param id - The user's primary ID
   * @returns User with all relations or null
   */
  static async getUserWithRelations(id: string): Promise<UserWithRelations | null> {
    try {
      return await prisma.user.findUnique({
        where: { id },
        include: {
          subscription: true,
          savedCities: true,
          viewedCities: true,
        },
      });
    } catch (error) {
      console.error(`Error fetching user with relations ${id}:`, error);
      throw new Error('Failed to fetch user with relations');
    }
  }

  /**
   * Check if a user exists by Clerk ID
   * @param clerkUserId - The Clerk user ID
   * @returns true if user exists
   */
  static async userExistsByClerkId(clerkUserId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { clerkUserId },
        select: { id: true },
      });
      return user !== null;
    } catch (error) {
      console.error(`Error checking user existence by Clerk ID ${clerkUserId}:`, error);
      throw new Error('Failed to check user existence');
    }
  }

  /**
   * Get or create a user (upsert)
   * @param data - User creation data
   * @returns User (existing or newly created)
   */
  static async getOrCreateUser(data: CreateUserInput): Promise<User> {
    try {
      return await prisma.user.upsert({
        where: { clerkUserId: data.clerkUserId },
        update: {
          email: data.email,
          displayName: data.displayName,
          imageUrl: data.imageUrl,
        },
        create: {
          clerkUserId: data.clerkUserId,
          email: data.email,
          displayName: data.displayName,
          imageUrl: data.imageUrl,
        },
      });
    } catch (error) {
      console.error('Error upserting user:', error);
      throw new Error('Failed to get or create user');
    }
  }
}

export default UserService;
