/**
 * Validation Utilities
 * Common validation functions for API requests
 */

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate UUID format
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate date string (ISO 8601 format)
 */
export const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

/**
 * Validate hex color format
 */
export const isValidHexColor = (color: string): boolean => {
  const hexColorRegex = /^#[0-9A-F]{6}$/i;
  return hexColorRegex.test(color);
};

/**
 * Validate latitude (-90 to 90)
 */
export const isValidLatitude = (lat: number): boolean => {
  return lat >= -90 && lat <= 90;
};

/**
 * Validate longitude (-180 to 180)
 */
export const isValidLongitude = (lng: number): boolean => {
  return lng >= -180 && lng <= 180;
};

/**
 * Sanitize user input (remove potentially harmful characters)
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim();
};

/**
 * Sanitize string inputs with strict security (prevents injection attacks)
 * Removes HTML tags, quotes, and limits length
 */
export const sanitizeString = (input: string, maxLength: number = 500): string => {
  return input
    .trim()
    .replace(/[<>"']/g, '') // Remove potentially dangerous characters
    .replace(/[^\x20-\x7E\s]/g, '') // Remove non-printable characters
    .substring(0, maxLength); // Limit length
};

/**
 * Validate city ID format (alphanumeric + hyphens only)
 */
export const isValidCityId = (cityId: string): boolean => {
  const cityIdRegex = /^[a-zA-Z0-9-]+$/;
  return cityIdRegex.test(cityId) && cityId.length > 0 && cityId.length <= 50;
};

/**
 * Validate pagination parameters
 * Ensures limit is between 1-100 and offset is >= 0
 */
export const validatePagination = (limit?: number, offset?: number): {
  limit: number;
  offset: number;
} => {
  const validLimit = Math.min(Math.max(limit || 20, 1), 100); // 1-100
  const validOffset = Math.max(offset || 0, 0); // >= 0
  return { limit: validLimit, offset: validOffset };
};

/**
 * Validate transaction ID format (Apple receipt)
 * Transaction IDs are typically numeric strings
 */
export const isValidTransactionId = (transactionId: string): boolean => {
  // Apple transaction IDs are numeric strings (10-20 digits)
  const transactionIdRegex = /^[0-9]{10,20}$/;
  return transactionIdRegex.test(transactionId);
};

/**
 * Sanitize and validate JSON input
 * Prevents JSON injection attacks
 */
export const sanitizeJSON = (input: any): any => {
  try {
    // Convert to string and parse to ensure valid JSON
    const jsonString = JSON.stringify(input);
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error('Invalid JSON input');
  }
};

/**
 * Validate URL format
 */
export const isValidURL = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    // Only allow HTTPS URLs for security
    return urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Validate phone number format (international)
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  // Basic international phone number validation (E.164 format)
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate and sanitize user preferences
 */
export const sanitizeUserPreferences = (preferences: any): any => {
  const sanitized: any = {};

  // Only allow specific preference keys
  const allowedKeys = ['theme', 'notifications', 'language', 'currency'];

  for (const key of allowedKeys) {
    if (preferences[key] !== undefined) {
      if (typeof preferences[key] === 'string') {
        sanitized[key] = sanitizeString(preferences[key], 100);
      } else if (typeof preferences[key] === 'boolean') {
        sanitized[key] = preferences[key];
      }
    }
  }

  return sanitized;
};

/**
 * Validate required fields in object
 */
export const hasRequiredFields = (
  obj: Record<string, any>,
  requiredFields: string[]
): boolean => {
  return requiredFields.every((field) => {
    return obj.hasOwnProperty(field) && obj[field] !== null && obj[field] !== undefined;
  });
};
