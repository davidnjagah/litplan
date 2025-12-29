/**
 * Prisma Client Singleton
 *
 * This module provides a singleton instance of the Prisma Client for database access.
 * Optimized for both local development and Vercel serverless deployment.
 *
 * Key optimizations for serverless:
 * - Connection pooling via Supabase PgBouncer
 * - Singleton pattern to reuse connections across warm starts
 * - Proper connection management to prevent connection exhaustion
 *
 * @module lib/prisma
 * @since Sprint 5 - Prisma Migration
 * @updated Sprint 6 Phase 5 - Vercel Serverless Optimization
 */

import { PrismaClient } from '@prisma/client';

// Extend the global namespace to include the prisma client
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Prisma Client configuration optimized for serverless
 *
 * In serverless environments:
 * - Connection pooling is handled by Supabase PgBouncer
 * - We reuse the global instance to maximize connection efficiency
 * - Connection limits are managed at the database level
 */
const prismaClientSingleton = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    // Serverless-optimized connection handling
    // The actual connection pooling is configured in DATABASE_URL with PgBouncer
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
};

// Create singleton instance
// In both development and production, we want to reuse the same client
// to maximize connection efficiency in serverless environments
export const prisma = global.prisma ?? prismaClientSingleton();

// Store in global to reuse across hot-reloads (dev) and warm starts (serverless)
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
} else {
  // In production serverless, also store globally to reuse during warm starts
  // This prevents creating new clients on every function invocation
  global.prisma = prisma;
}

/**
 * Disconnect helper for graceful shutdown
 * Call this in cleanup handlers if needed
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

export default prisma;
