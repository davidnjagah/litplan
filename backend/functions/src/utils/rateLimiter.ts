/**
 * Rate Limiter Middleware
 * Token bucket implementation with in-memory store
 * Sprint 3, Day 14
 */

import { Request, Response, NextFunction } from 'express';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitStore {
  [key: string]: TokenBucket;
}

/**
 * In-memory rate limit store
 * Keys: `userId:endpoint` or `ip:endpoint`
 * Values: { tokens: number, lastRefill: number }
 */
const rateLimitStore: RateLimitStore = {};

/**
 * Cleanup interval: Remove entries older than 1 hour
 */
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const ENTRY_TTL_MS = 60 * 60 * 1000; // 1 hour

// Run cleanup every hour
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach((key) => {
    const bucket = rateLimitStore[key];
    if (now - bucket.lastRefill > ENTRY_TTL_MS) {
      delete rateLimitStore[key];
    }
  });
  console.log(`Rate limiter cleanup completed. Active entries: ${Object.keys(rateLimitStore).length}`);
}, CLEANUP_INTERVAL_MS);

/**
 * Rate Limit Presets
 */
export const RateLimitPresets = {
  // Standard API endpoints
  standard: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
  },

  // Subscription validation/restore (stricter limits)
  subscription: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 requests per minute
  },

  // Subscription status checks (more lenient)
  subscriptionStatus: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 100 requests per minute
  },

  // Browsing endpoints (cities, plans)
  browsing: {
    maxRequests: 200,
    windowMs: 60 * 1000, // 200 requests per minute
  },

  // Mutation endpoints (save/unsave cities)
  mutations: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 30 requests per minute
  },
};

/**
 * Token Bucket Rate Limiter
 *
 * @param maxRequests - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @param keyGenerator - Optional function to generate rate limit key (default: userId)
 */
export const rateLimiter = (
  maxRequests: number,
  windowMs: number,
  keyGenerator?: (req: Request) => string
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Generate rate limit key
      let key: string;
      if (keyGenerator) {
        key = keyGenerator(req);
      } else {
        // Default: use userId from authenticated user, fallback to IP
        const userId = (req as any).user?.uid;
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        key = userId ? `user:${userId}` : `ip:${ip}`;
      }

      // Add endpoint to key for per-endpoint limiting
      const endpoint = `${req.method}:${req.path}`;
      const fullKey = `${key}:${endpoint}`;

      const now = Date.now();

      // Get or create bucket
      let bucket = rateLimitStore[fullKey];

      if (!bucket) {
        // First request - create new bucket
        bucket = {
          tokens: maxRequests,
          lastRefill: now,
        };
        rateLimitStore[fullKey] = bucket;
      }

      // Calculate tokens to refill based on time elapsed
      const timeSinceLastRefill = now - bucket.lastRefill;
      const refillRate = maxRequests / windowMs; // tokens per millisecond
      const tokensToAdd = Math.floor(timeSinceLastRefill * refillRate);

      if (tokensToAdd > 0) {
        bucket.tokens = Math.min(maxRequests, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;
      }

      // Check if request can proceed
      if (bucket.tokens >= 1) {
        // Allow request
        bucket.tokens -= 1;

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', Math.floor(bucket.tokens).toString());
        res.setHeader('X-RateLimit-Reset', (bucket.lastRefill + windowMs).toString());

        next();
      } else {
        // Rate limit exceeded
        const retryAfter = Math.ceil((windowMs - timeSinceLastRefill) / 1000); // seconds

        res.setHeader('Retry-After', retryAfter.toString());
        res.setHeader('X-RateLimit-Limit', maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', (bucket.lastRefill + windowMs).toString());

        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many requests. Please try again in ${retryAfter} seconds.`,
            retryAfter,
          },
        });
      }
    } catch (error) {
      console.error('Rate limiter error:', error);
      // On error, allow request to proceed (fail open)
      return next();
    }
  };
};

/**
 * Preset rate limiters for common use cases
 */
export const rateLimiters = {
  standard: rateLimiter(
    RateLimitPresets.standard.maxRequests,
    RateLimitPresets.standard.windowMs
  ),

  subscription: rateLimiter(
    RateLimitPresets.subscription.maxRequests,
    RateLimitPresets.subscription.windowMs
  ),

  subscriptionStatus: rateLimiter(
    RateLimitPresets.subscriptionStatus.maxRequests,
    RateLimitPresets.subscriptionStatus.windowMs
  ),

  browsing: rateLimiter(
    RateLimitPresets.browsing.maxRequests,
    RateLimitPresets.browsing.windowMs
  ),

  mutations: rateLimiter(
    RateLimitPresets.mutations.maxRequests,
    RateLimitPresets.mutations.windowMs
  ),
};

/**
 * Get rate limit statistics (for monitoring/debugging)
 */
export const getRateLimitStats = () => {
  return {
    totalEntries: Object.keys(rateLimitStore).length,
    entries: Object.entries(rateLimitStore).map(([key, bucket]) => ({
      key,
      tokens: bucket.tokens,
      lastRefill: new Date(bucket.lastRefill).toISOString(),
    })),
  };
};
