/**
 * Request Logger Middleware
 * Logs all API requests with timing information
 * Sprint 3, Day 14
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Request Logger Middleware
 * Logs all incoming requests with:
 * - userId (if authenticated)
 * - HTTP method
 * - Request path
 * - Status code
 * - Response time in milliseconds
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Get userId from authenticated request
  const userId = (req as any).user?.uid || 'anonymous';

  // Capture original res.json to log response
  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    // Calculate duration
    const duration = Date.now() - startTime;

    // Log request details
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      userId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
    }));

    // Call original json method
    return originalJson(body);
  };

  next();
};

/**
 * Performance Logger
 * Logs slow requests (> 1000ms) for monitoring
 */
export const performanceLogger = (threshold: number = 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;

      if (duration > threshold) {
        const userId = (req as any).user?.uid || 'anonymous';

        console.warn(JSON.stringify({
          type: 'SLOW_REQUEST',
          timestamp: new Date().toISOString(),
          userId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          threshold: `${threshold}ms`,
        }));
      }
    });

    next();
  };
};

/**
 * Error Logger
 * Logs requests that result in errors (4xx, 5xx)
 */
export const errorLogger = (req: Request, res: Response, next: NextFunction) => {
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      const userId = (req as any).user?.uid || 'anonymous';

      console.error(JSON.stringify({
        type: 'ERROR_RESPONSE',
        timestamp: new Date().toISOString(),
        userId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        ip: req.ip || req.socket.remoteAddress,
      }));
    }
  });

  next();
};
