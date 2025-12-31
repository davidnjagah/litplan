/**
 * User Service
 *
 * Provides CRUD operations for User model.
 * Handles user creation, updates, and deletion with cascade support.
 *
 * @module services/prisma/UserService
 * @since Sprint 5 Phase 2 - Prisma Service Layer
 * @updated Sprint 6 Phase 2 - Supabase Auth Integration
 * @updated Sprint 9 - Enhanced user sync for all auth methods (Email, Google, Apple)
 */

import prisma from '../../lib/prisma';
import { User, Subscription, SavedCity, ViewedCity } from '@prisma/client';

export interface CreateUserInput {
  supabaseUserId: string;
  email?: string;
  displayName?: string;
  imageUrl?: string;
}

// Keep legacy interface for backward compatibility
export interface CreateUserInputLegacy {
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
   * Get a user by their Supabase user ID
   * @param supabaseUserId - The Supabase user ID
   * @returns User or null if not found
   */
  static async getUserBySupabaseId(supabaseUserId: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { supabaseUserId },
      });
    } catch (error) {
      console.error(`Error fetching user by Supabase ID ${supabaseUserId}:`, error);
      throw new Error('Failed to fetch user');
    }
  }

  /**
   * Get a user by their Clerk user ID (DEPRECATED - use getUserBySupabaseId)
   * @param clerkUserId - The Clerk user ID
   * @returns User or null if not found
   * @deprecated Use getUserBySupabaseId instead
   */
  static async getUserByClerkId(clerkUserId: string): Promise<User | null> {
    // Map to Supabase ID field for backward compatibility
    return this.getUserBySupabaseId(clerkUserId);
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
          supabaseUserId: data.supabaseUserId,
          email: data.email,
          displayName: data.displayName || data.email?.split('@')[0],
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
   * Update user by Supabase ID
   * @param supabaseUserId - The Supabase user ID
   * @param data - Partial user data to update
   * @returns Updated user
   */
  static async updateUserBySupabaseId(
    supabaseUserId: string,
    data: UpdateUserInput
  ): Promise<User> {
    try {
      return await prisma.user.update({
        where: { supabaseUserId },
        data,
      });
    } catch (error) {
      console.error(`Error updating user by Supabase ID ${supabaseUserId}:`, error);
      throw new Error('Failed to update user');
    }
  }

  /**
   * Update user by Clerk ID (DEPRECATED - use updateUserBySupabaseId)
   * @param clerkUserId - The Clerk user ID
   * @param data - Partial user data to update
   * @returns Updated user
   * @deprecated Use updateUserBySupabaseId instead
   */
  static async updateUserByClerkId(
    clerkUserId: string,
    data: UpdateUserInput
  ): Promise<User> {
    // Map to Supabase ID field for backward compatibility
    return this.updateUserBySupabaseId(clerkUserId, data);
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
   * Delete a user by Supabase ID
   * @param supabaseUserId - The Supabase user ID
   * @returns Deleted user
   */
  static async deleteUserBySupabaseId(supabaseUserId: string): Promise<User> {
    try {
      return await prisma.user.delete({
        where: { supabaseUserId },
      });
    } catch (error) {
      console.error(`Error deleting user by Supabase ID ${supabaseUserId}:`, error);
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Delete a user by Clerk ID (DEPRECATED - use deleteUserBySupabaseId)
   * @param clerkUserId - The Clerk user ID
   * @returns Deleted user
   * @deprecated Use deleteUserBySupabaseId instead
   */
  static async deleteUserByClerkId(clerkUserId: string): Promise<User> {
    // Map to Supabase ID field for backward compatibility
    return this.deleteUserBySupabaseId(clerkUserId);
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
   * Get user with subscription by Supabase ID
   * @param supabaseUserId - The Supabase user ID
   * @returns User with subscription or null
   */
  static async getUserWithSubscriptionBySupabaseId(
    supabaseUserId: string
  ): Promise<UserWithSubscription | null> {
    try {
      return await prisma.user.findUnique({
        where: { supabaseUserId },
        include: {
          subscription: true,
        },
      });
    } catch (error) {
      console.error(`Error fetching user with subscription by Supabase ID ${supabaseUserId}:`, error);
      throw new Error('Failed to fetch user with subscription');
    }
  }

  /**
   * Get user with subscription by Clerk ID (DEPRECATED - use getUserWithSubscriptionBySupabaseId)
   * @param clerkUserId - The Clerk user ID
   * @returns User with subscription or null
   * @deprecated Use getUserWithSubscriptionBySupabaseId instead
   */
  static async getUserWithSubscriptionByClerkId(
    clerkUserId: string
  ): Promise<UserWithSubscription | null> {
    // Map to Supabase ID field for backward compatibility
    return this.getUserWithSubscriptionBySupabaseId(clerkUserId);
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
   * Check if a user exists by Supabase ID
   * @param supabaseUserId - The Supabase user ID
   * @returns true if user exists
   */
  static async userExistsBySupabaseId(supabaseUserId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { supabaseUserId },
        select: { id: true },
      });
      return user !== null;
    } catch (error) {
      console.error(`Error checking user existence by Supabase ID ${supabaseUserId}:`, error);
      throw new Error('Failed to check user existence');
    }
  }

  /**
   * Check if a user exists by Clerk ID (DEPRECATED - use userExistsBySupabaseId)
   * @param clerkUserId - The Clerk user ID
   * @returns true if user exists
   * @deprecated Use userExistsBySupabaseId instead
   */
  static async userExistsByClerkId(clerkUserId: string): Promise<boolean> {
    // Map to Supabase ID field for backward compatibility
    return this.userExistsBySupabaseId(clerkUserId);
  }

  /**
   * Get or create a user (upsert)
   * @param data - User creation data
   * @returns User (existing or newly created)
   */
  static async getOrCreateUser(data: CreateUserInput): Promise<User> {
    try {
      return await prisma.user.upsert({
        where: { supabaseUserId: data.supabaseUserId },
        update: {
          email: data.email,
          displayName: data.displayName,
          imageUrl: data.imageUrl,
        },
        create: {
          supabaseUserId: data.supabaseUserId,
          email: data.email,
          displayName: data.displayName || data.email?.split('@')[0],
          imageUrl: data.imageUrl,
        },
      });
    } catch (error) {
      console.error('Error upserting user:', error);
      throw new Error('Failed to get or create user');
    }
  }

  /**
   * Sync user from auth provider (Email, Google, Apple)
   * Creates user if not exists, updates with latest provider info if exists
   *
   * This is the primary method called after any auth method login to ensure
   * the user is saved to the database with all provider information.
   *
   * @param supabaseUserId - The Supabase user ID from auth
   * @param email - User's email from auth provider
   * @param displayName - Display name from auth provider (optional)
   * @param imageUrl - Profile image URL from auth provider (optional, common with Google/Apple)
   * @returns User with subscription data
   * @since Sprint 9 - Unified user sync for all auth methods
   */
  static async syncUserFromAuth(
    supabaseUserId: string,
    email?: string,
    displayName?: string,
    imageUrl?: string
  ): Promise<User> {
    try {
      // Build update data - only include fields that are provided
      const updateData: UpdateUserInput = {};
      if (email !== undefined) updateData.email = email;
      if (displayName !== undefined) updateData.displayName = displayName;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

      return await prisma.user.upsert({
        where: { supabaseUserId },
        update: updateData,
        create: {
          supabaseUserId,
          email,
          displayName: displayName || email?.split('@')[0],
          imageUrl,
        },
      });
    } catch (error) {
      console.error(`Error syncing user from auth for ${supabaseUserId}:`, error);
      throw new Error('Failed to sync user from auth');
    }
  }
}

export default UserService;
