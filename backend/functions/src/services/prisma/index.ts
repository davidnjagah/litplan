/**
 * Prisma Service Layer
 *
 * Central export point for all Prisma-based service classes.
 * These services provide clean CRUD operations for all database models,
 * replacing the previous Firestore operations.
 *
 * @module services/prisma
 * @since Sprint 5 Phase 2 - Prisma Service Layer
 * @updated Sprint 9 - Removed ActivityType export (UserActivity model removed)
 */

// Service exports
export { CityService, type GetCitiesOptions, type CityWithPlanCount } from './CityService';
export {
  PlanService,
  type GetPlansOptions,
  type PlanWithCity,
} from './PlanService';
export {
  GroupFlowService,
  type GetGroupFlowsOptions,
  type GroupFlowStepWithPlan,
  type GroupFlowWithSteps,
  type GroupFlowWithCity,
} from './GroupFlowService';
export {
  UserService,
  type CreateUserInput,
  type UpdateUserInput,
  type UserWithSubscription,
  type UserWithRelations,
} from './UserService';
export {
  SubscriptionService,
  type SubscriptionCreateInput,
  type TransactionData,
  type Entitlements,
  type SubscriptionWithUser,
  type StoreKit2TransactionData,
  type ProductId,
  PRODUCT_IDS,
} from './SubscriptionService';
export {
  UserActivityService,
  type SavedCityWithDetails,
  type ViewedCityWithDetails,
  type SearchedCityWithDetails,
  type PaginatedViewedCities,
} from './UserActivityService';
export {
  AppConfigService,
  type TierLimits,
  type WeekInfo,
} from './AppConfigService';

// Re-export commonly used Prisma types for convenience
// Sprint 9: Removed ActivityType - UserActivity model removed
export {
  PlanType,
  SubscriptionStatus,
  SubscriptionTier,
} from '@prisma/client';

// Re-export prisma client for direct access if needed
export { default as prisma } from '../../lib/prisma';
