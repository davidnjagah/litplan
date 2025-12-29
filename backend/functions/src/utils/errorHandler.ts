/**
 * Error Handler Utilities
 * Production-safe error handling with sanitized error messages
 *
 * Sprint 3, Day 15 - Security Hardening
 * Sprint 4, Day 17 - Enhanced with global middleware and comprehensive error handling
 */

import { Request, Response, NextFunction } from 'express';
import * as functions from 'firebase-functions';
import {
  BaseError,
  NotFoundError,
  RateLimitError,
  getTechnicalDetails,
  isOperationalError,
} from './errors';

/**
 * Standard error codes (maintained for backward compatibility)
 */
export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',

  // Tier/subscription errors
  TIER_LIMIT_REACHED = 'TIER_LIMIT_REACHED',
  PRO_TIER_REQUIRED = 'PRO_TIER_REQUIRED',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  WEEKEND_ACCESS_RESTRICTED = 'WEEKEND_ACCESS_RESTRICTED',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Payment/subscription errors
  INVALID_RECEIPT = 'INVALID_RECEIPT',
  SUBSCRIPTION_VALIDATION_FAILED = 'SUBSCRIPTION_VALIDATION_FAILED',

  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

/**
 * Custom API Error class (maintained for backward compatibility)
 */
export class APIError extends Error {
  public statusCode: number;
  public code: ErrorCode;
  public details?: any;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'APIError';

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }
}

/**
 * Standard error response format
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp?: string;
    retryAfter?: number;
  };
}

/**
 * Sanitize error message for production
 * Removes stack traces and sensitive information
 */
const sanitizeErrorMessage = (error: any, isDevelopment: boolean): string => {
  // In development, return full error message
  if (isDevelopment) {
    return error.message || 'An error occurred';
  }

  // In production, return generic messages for security
  if (error instanceof APIError || error instanceof BaseError) {
    return error.message;
  }

  // For unexpected errors, don't leak details
  return 'An unexpected error occurred. Please try again later.';
};

/**
 * Log error with appropriate severity and context
 */
const logError = (error: any, context: string, userId?: string, endpoint?: string): void => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const technicalDetails = getTechnicalDetails(error);

  const errorInfo = {
    context,
    endpoint,
    userId,
    message: error.message,
    code: technicalDetails.code,
    statusCode: error.statusCode || 500,
    isOperational: isOperationalError(error),
    timestamp: new Date().toISOString(),
    // Only include stack traces in development
    stack: isDevelopment ? error.stack : undefined,
    technicalDetails: isDevelopment ? technicalDetails.technicalDetails : undefined,
  };

  // Determine log level based on error type and status code
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    // Server errors (5xx) - log as error
    functions.logger.error('Server error', errorInfo);
  } else if (statusCode >= 400) {
    // Client errors (4xx) - log as warning
    functions.logger.warn('Client error', errorInfo);
  } else {
    // Informational
    functions.logger.info('Request error', errorInfo);
  }
};

/**
 * Handle errors and send appropriate response
 */
export const handleError = (
  error: any,
  res: Response,
  context: string = 'Request',
  userId?: string,
  endpoint?: string
): void => {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Log the error with full context
  logError(error, context, userId, endpoint);

  // Default values
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = sanitizeErrorMessage(error, isDevelopment);
  let details = undefined;
  let retryAfter = undefined;

  // Handle BaseError instances (new error system)
  if (error instanceof BaseError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = isDevelopment ? error.technicalDetails : undefined;

    // Add retry-after for rate limit errors
    if (error instanceof RateLimitError) {
      retryAfter = error.retryAfter;
    }
  }
  // Handle APIError instances (old error system - backward compatibility)
  else if (error instanceof APIError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = isDevelopment ? error.details : undefined;
  }
  // Handle Firebase errors
  else if (error.code) {
    if (error.code === 'permission-denied') {
      statusCode = 403;
      code = 'FORBIDDEN';
      message = 'Permission denied';
    } else if (error.code === 'not-found') {
      statusCode = 404;
      code = 'NOT_FOUND';
      message = 'Resource not found';
    } else if (error.code === 'already-exists') {
      statusCode = 409;
      code = 'ALREADY_EXISTS';
      message = 'Resource already exists';
    } else if (error.code === 'unauthenticated') {
      statusCode = 401;
      code = 'UNAUTHORIZED';
      message = 'Authentication required';
    }
  }

  // Build standardized error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };

  // Add optional fields
  if (details && isDevelopment) {
    errorResponse.error.details = details;
  }
  if (retryAfter) {
    errorResponse.error.retryAfter = retryAfter;
  }

  // Always include timestamp in development
  if (isDevelopment) {
    errorResponse.error.timestamp = new Date().toISOString();
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper for route handlers
 * Automatically catches and handles errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      const userId = req.user?.uid;
      const endpoint = `${req.method} ${req.path}`;
      handleError(error, res, 'Route handler', userId, endpoint);
    });
  };
};

/**
 * Global Error Handler Middleware
 * Catches all unhandled errors in Express routes
 * MUST be registered last in middleware chain
 */
export const globalErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Extract context from request
  const userId = (req as any).user?.uid;
  const endpoint = `${req.method} ${req.path}`;
  const context = 'Global error handler';

  // Don't send response if headers already sent
  if (res.headersSent) {
    functions.logger.error('Error occurred after headers sent', {
      error: error.message,
      endpoint,
      userId,
    });
    return next(error);
  }

  // Handle the error
  handleError(error, res, context, userId, endpoint);
};

/**
 * Not Found Handler Middleware
 * Handles 404 errors for undefined routes
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.path}`);
  const userId = (req as any).user?.uid;
  handleError(error, res, 'Not found', userId, `${req.method} ${req.path}`);
};

/**
 * Common error factories
 */
export const ErrorFactory = {
  unauthorized: (message: string = 'Authentication required') =>
    new APIError(401, ErrorCode.UNAUTHORIZED, message),

  forbidden: (message: string = 'Access forbidden') =>
    new APIError(403, ErrorCode.FORBIDDEN, message),

  invalidToken: (message: string = 'Invalid authentication token') =>
    new APIError(401, ErrorCode.INVALID_TOKEN, message),

  notFound: (resource: string = 'Resource') =>
    new APIError(404, ErrorCode.NOT_FOUND, `${resource} not found`),

  invalidInput: (field: string, reason?: string) =>
    new APIError(
      400,
      ErrorCode.INVALID_INPUT,
      `Invalid input for field: ${field}${reason ? ` - ${reason}` : ''}`
    ),

  missingField: (field: string) =>
    new APIError(
      400,
      ErrorCode.MISSING_REQUIRED_FIELD,
      `Missing required field: ${field}`
    ),

  tierLimitReached: (limitType: string, limit: number) =>
    new APIError(
      403,
      ErrorCode.TIER_LIMIT_REACHED,
      `${limitType} limit reached. Maximum allowed: ${limit}`,
      { limitType, limit }
    ),

  proTierRequired: (feature: string) =>
    new APIError(
      403,
      ErrorCode.PRO_TIER_REQUIRED,
      `Pro tier required to access ${feature}`,
      { feature }
    ),

  subscriptionExpired: () =>
    new APIError(
      403,
      ErrorCode.SUBSCRIPTION_EXPIRED,
      'Subscription has expired. Please renew to continue.'
    ),

  weekendAccessRestricted: () =>
    new APIError(
      403,
      ErrorCode.WEEKEND_ACCESS_RESTRICTED,
      'Weekend plans are only available to Pro users'
    ),

  rateLimitExceeded: (retryAfter: number) =>
    new APIError(
      429,
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded. Please try again later.',
      { retryAfter }
    ),

  invalidReceipt: (reason?: string) =>
    new APIError(
      400,
      ErrorCode.INVALID_RECEIPT,
      `Invalid receipt${reason ? `: ${reason}` : ''}`
    ),

  subscriptionValidationFailed: (reason?: string) =>
    new APIError(
      400,
      ErrorCode.SUBSCRIPTION_VALIDATION_FAILED,
      `Subscription validation failed${reason ? `: ${reason}` : ''}`
    ),

  internalError: (message: string = 'Internal server error') =>
    new APIError(500, ErrorCode.INTERNAL_ERROR, message),

  serviceUnavailable: (service?: string) =>
    new APIError(
      503,
      ErrorCode.SERVICE_UNAVAILABLE,
      `Service temporarily unavailable${service ? `: ${service}` : ''}`
    ),
};

/**
 * Validation helper with automatic error throwing
 */
export const validate = {
  required: (value: any, fieldName: string): void => {
    if (value === undefined || value === null || value === '') {
      throw ErrorFactory.missingField(fieldName);
    }
  },

  type: (value: any, type: string, fieldName: string): void => {
    if (typeof value !== type) {
      throw ErrorFactory.invalidInput(
        fieldName,
        `Expected ${type}, got ${typeof value}`
      );
    }
  },

  arrayNotEmpty: (value: any[], fieldName: string): void => {
    if (!Array.isArray(value) || value.length === 0) {
      throw ErrorFactory.invalidInput(fieldName, 'Array must not be empty');
    }
  },

  stringLength: (
    value: string,
    min: number,
    max: number,
    fieldName: string
  ): void => {
    if (value.length < min || value.length > max) {
      throw ErrorFactory.invalidInput(
        fieldName,
        `Length must be between ${min} and ${max} characters`
      );
    }
  },

  numberRange: (
    value: number,
    min: number,
    max: number,
    fieldName: string
  ): void => {
    if (value < min || value > max) {
      throw ErrorFactory.invalidInput(
        fieldName,
        `Value must be between ${min} and ${max}`
      );
    }
  },

  enum: (value: any, allowedValues: any[], fieldName: string): void => {
    if (!allowedValues.includes(value)) {
      throw ErrorFactory.invalidInput(
        fieldName,
        `Must be one of: ${allowedValues.join(', ')}`
      );
    }
  },
};
