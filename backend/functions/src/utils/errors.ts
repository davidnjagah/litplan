/**
 * Comprehensive Error Classes
 * Custom error types for production-grade error handling
 *
 * Sprint 4, Day 17 - Error Handling & Edge Cases
 */

/**
 * Base API Error class
 * All custom errors extend from this
 */
export class BaseError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly technicalDetails?: any;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational: boolean = true,
    technicalDetails?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.technicalDetails = technicalDetails;

    Error.captureStackTrace(this);
  }
}

/**
 * ValidationError - Invalid request data (400)
 * Use when client sends invalid or malformed data
 */
export class ValidationError extends BaseError {
  constructor(message: string, technicalDetails?: any) {
    super(message, 400, 'VALIDATION_ERROR', true, technicalDetails);
    this.name = 'ValidationError';
  }

  static missingField(fieldName: string): ValidationError {
    return new ValidationError(
      `Missing required field: ${fieldName}`,
      { field: fieldName }
    );
  }

  static invalidFormat(fieldName: string, expectedFormat: string): ValidationError {
    return new ValidationError(
      `Invalid format for ${fieldName}. Expected: ${expectedFormat}`,
      { field: fieldName, expectedFormat }
    );
  }

  static invalidValue(fieldName: string, value: any, reason?: string): ValidationError {
    return new ValidationError(
      `Invalid value for ${fieldName}${reason ? ': ' + reason : ''}`,
      { field: fieldName, value }
    );
  }

  static outOfRange(fieldName: string, min: number, max: number): ValidationError {
    return new ValidationError(
      `${fieldName} must be between ${min} and ${max}`,
      { field: fieldName, min, max }
    );
  }
}

/**
 * AuthenticationError - Auth failures (401)
 * Use when user is not authenticated or token is invalid
 */
export class AuthenticationError extends BaseError {
  constructor(message: string = 'Authentication required', technicalDetails?: any) {
    super(message, 401, 'AUTHENTICATION_ERROR', true, technicalDetails);
    this.name = 'AuthenticationError';
  }

  static invalidToken(): AuthenticationError {
    return new AuthenticationError('Invalid or expired authentication token');
  }

  static missingToken(): AuthenticationError {
    return new AuthenticationError('Authentication token not provided');
  }

  static tokenExpired(): AuthenticationError {
    return new AuthenticationError('Authentication token has expired');
  }

  static invalidCredentials(): AuthenticationError {
    return new AuthenticationError('Invalid credentials provided');
  }
}

/**
 * AuthorizationError - Permission denied (403)
 * Use when user is authenticated but lacks permission
 */
export class AuthorizationError extends BaseError {
  constructor(message: string = 'Access forbidden', technicalDetails?: any) {
    super(message, 403, 'AUTHORIZATION_ERROR', true, technicalDetails);
    this.name = 'AuthorizationError';
  }

  static insufficientPermissions(resource: string): AuthorizationError {
    return new AuthorizationError(
      `Insufficient permissions to access ${resource}`,
      { resource }
    );
  }

  static proTierRequired(feature: string): AuthorizationError {
    return new AuthorizationError(
      `Pro subscription required to access ${feature}`,
      { feature, tier: 'pro' }
    );
  }

  static weekendAccessRestricted(): AuthorizationError {
    return new AuthorizationError(
      'Weekend plans are exclusive to Pro members. Upgrade to access premium weekend experiences.'
    );
  }

  static planLimitReached(limit: number, tier: string): AuthorizationError {
    const message = tier === 'pro'
      ? `You've viewed ${limit} plans in this city. That's the Pro limit!`
      : `You've viewed ${limit} plans in this city. Upgrade to Pro to see up to 50 plans per city.`;

    return new AuthorizationError(message, { limit, tier });
  }

  static cityLimitReached(tier: string): AuthorizationError {
    return new AuthorizationError(
      tier === 'pro'
        ? 'You have reached your city limit for this week'
        : 'You have reached your weekly city limit. Upgrade to Pro for unlimited cities.',
      { tier }
    );
  }
}

/**
 * NotFoundError - Resource not found (404)
 * Use when requested resource doesn't exist
 */
export class NotFoundError extends BaseError {
  constructor(resource: string = 'Resource', technicalDetails?: any) {
    super(`${resource} not found`, 404, 'NOT_FOUND', true, technicalDetails);
    this.name = 'NotFoundError';
  }

  static user(): NotFoundError {
    return new NotFoundError('User');
  }

  static plan(): NotFoundError {
    return new NotFoundError('Plan');
  }

  static city(): NotFoundError {
    return new NotFoundError('City');
  }

  static groupFlow(): NotFoundError {
    return new NotFoundError('Group Flow');
  }

  static subscription(): NotFoundError {
    return new NotFoundError('Subscription');
  }
}

/**
 * RateLimitError - Rate limit exceeded (429)
 * Use when client exceeds rate limits
 */
export class RateLimitError extends BaseError {
  public readonly retryAfter: number;

  constructor(retryAfter: number = 60, message?: string, technicalDetails?: any) {
    super(
      message || `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      429,
      'RATE_LIMIT_EXCEEDED',
      true,
      technicalDetails
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * ExternalServiceError - Third-party API failures (502)
 * Use when external services (Apple, Anthropic, etc.) fail
 */
export class ExternalServiceError extends BaseError {
  public readonly service: string;
  public readonly retryable: boolean;

  constructor(
    service: string,
    message: string,
    retryable: boolean = true,
    technicalDetails?: any
  ) {
    super(
      message,
      502,
      'EXTERNAL_SERVICE_ERROR',
      true,
      technicalDetails
    );
    this.name = 'ExternalServiceError';
    this.service = service;
    this.retryable = retryable;
  }

  static anthropicAPI(reason: string, retryable: boolean = true): ExternalServiceError {
    return new ExternalServiceError(
      'Anthropic API',
      `AI service temporarily unavailable: ${reason}`,
      retryable,
      { reason }
    );
  }

  static appleAPI(statusCode: number, reason: string): ExternalServiceError {
    return new ExternalServiceError(
      'Apple API',
      `Apple receipt validation failed: ${reason}`,
      statusCode === 21005 || statusCode === 21009, // Retry only for temporary errors
      { statusCode, reason }
    );
  }

  static networkError(service: string, error: Error): ExternalServiceError {
    return new ExternalServiceError(
      service,
      `Network error communicating with ${service}`,
      true,
      { originalError: error.message }
    );
  }
}

/**
 * DatabaseError - Firestore errors (500)
 * Use when database operations fail
 */
export class DatabaseError extends BaseError {
  public readonly operation: string;
  public readonly retryable: boolean;

  constructor(
    operation: string,
    message: string,
    retryable: boolean = false,
    technicalDetails?: any
  ) {
    super(
      message,
      500,
      'DATABASE_ERROR',
      true,
      technicalDetails
    );
    this.name = 'DatabaseError';
    this.operation = operation;
    this.retryable = retryable;
  }

  static readFailed(collection: string, error?: Error): DatabaseError {
    return new DatabaseError(
      'read',
      `Failed to read from ${collection}`,
      true,
      { collection, originalError: error?.message }
    );
  }

  static writeFailed(collection: string, error?: Error): DatabaseError {
    return new DatabaseError(
      'write',
      `Failed to write to ${collection}`,
      true,
      { collection, originalError: error?.message }
    );
  }

  static updateFailed(collection: string, docId: string, error?: Error): DatabaseError {
    return new DatabaseError(
      'update',
      `Failed to update document in ${collection}`,
      true,
      { collection, docId, originalError: error?.message }
    );
  }

  static deleteFailed(collection: string, docId: string, error?: Error): DatabaseError {
    return new DatabaseError(
      'delete',
      `Failed to delete document from ${collection}`,
      true,
      { collection, docId, originalError: error?.message }
    );
  }

  static batchFailed(operation: string, error?: Error): DatabaseError {
    return new DatabaseError(
      'batch',
      `Batch operation failed: ${operation}`,
      true,
      { operation, originalError: error?.message }
    );
  }

  static transactionFailed(error?: Error): DatabaseError {
    return new DatabaseError(
      'transaction',
      'Database transaction failed',
      true,
      { originalError: error?.message }
    );
  }
}

/**
 * DuplicateTransactionError - Transaction already processed
 * Use to prevent duplicate purchase processing
 */
export class DuplicateTransactionError extends BaseError {
  public readonly transactionId: string;

  constructor(transactionId: string) {
    super(
      'This transaction has already been processed',
      409,
      'DUPLICATE_TRANSACTION',
      true,
      { transactionId }
    );
    this.name = 'DuplicateTransactionError';
    this.transactionId = transactionId;
  }
}

/**
 * SubscriptionError - Subscription-related errors (400/403)
 * Use for subscription validation and status issues
 */
export class SubscriptionError extends BaseError {
  constructor(
    message: string,
    statusCode: number = 400,
    technicalDetails?: any
  ) {
    super(message, statusCode, 'SUBSCRIPTION_ERROR', true, technicalDetails);
    this.name = 'SubscriptionError';
  }

  static invalidReceipt(reason: string): SubscriptionError {
    return new SubscriptionError(
      `Invalid receipt: ${reason}`,
      400,
      { reason }
    );
  }

  static expired(): SubscriptionError {
    return new SubscriptionError(
      'Subscription has expired. Please renew to continue.',
      403
    );
  }

  static mismatchedApp(): SubscriptionError {
    return new SubscriptionError(
      'Receipt is for a different application',
      400
    );
  }

  static sandboxInProduction(): SubscriptionError {
    return new SubscriptionError(
      'Sandbox receipt detected in production environment. Please use a production purchase.',
      400
    );
  }

  static alreadyActive(): SubscriptionError {
    return new SubscriptionError(
      'User already has an active subscription',
      409
    );
  }
}

/**
 * Type guard to check if error is operational
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof BaseError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Extract user-safe error message
 * Removes technical details for production
 */
export function getUserMessage(error: Error, isDevelopment: boolean = false): string {
  if (error instanceof BaseError) {
    return error.message;
  }

  // For non-operational errors, return generic message in production
  if (!isDevelopment) {
    return 'An unexpected error occurred. Please try again later.';
  }

  return error.message || 'An error occurred';
}

/**
 * Extract technical details for logging
 */
export function getTechnicalDetails(error: Error): any {
  if (error instanceof BaseError) {
    return {
      code: error.code,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      technicalDetails: error.technicalDetails,
      stack: error.stack,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: error.message,
    stack: error.stack,
  };
}
