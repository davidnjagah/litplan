/**
 * Prisma Client Singleton
 *
 * This module provides a singleton instance of the Prisma Client for database access.
 * In development, it prevents multiple instances during hot-reloading.
 *
 * @module lib/prisma
 * @since Sprint 5 - Prisma Migration
 */

import { PrismaClient } from '@prisma/client';

// Extend the global namespace to include the prisma client
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Create the Prisma client instance
// In development, we reuse the global instance to prevent multiple connections during hot-reload
// In production, we create a new instance for each request (serverless optimization)
export const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
  });

// Only set the global instance in development to prevent memory leaks
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
