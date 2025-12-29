/**
 * Security Headers Middleware
 * Applies security headers to all HTTP responses to protect against common attacks
 *
 * Sprint 3, Day 15 - Security Hardening
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './middleware';

/**
 * Security Headers Middleware
 * Adds security headers to all responses to protect against:
 * - MIME type sniffing
 * - Clickjacking
 * - XSS attacks
 * - Information leakage
 */
export const securityHeaders = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // Prevent MIME type sniffing
  // Forces browsers to respect the Content-Type header
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking attacks
  // Prevents the page from being embedded in iframes
  res.setHeader('X-Frame-Options', 'DENY');

  // XSS protection for legacy browsers
  // Modern browsers use CSP instead, but this provides fallback protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  // Controls how much referrer information is included with requests
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy
  // Restricts what resources can be loaded
  // API-only, so we don't need to load any resources
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'"
  );

  // HTTP Strict Transport Security (HSTS)
  // Forces HTTPS for all future requests
  // Max age: 1 year (31536000 seconds)
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // Remove server information
  // Prevents leaking server version information
  res.removeHeader('X-Powered-By');

  // Permissions Policy (formerly Feature-Policy)
  // Disables unnecessary browser features
  res.setHeader(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  );

  next();
};

/**
 * CORS Security Headers
 * Additional headers for CORS responses
 */
export const corsSecurityHeaders = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // Limit allowed methods
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');

  // Limit allowed headers
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Don't allow credentials from untrusted origins
  // Note: If CORS origin is set to specific domains, you can enable credentials
  res.setHeader('Access-Control-Allow-Credentials', 'false');

  // Cache preflight requests for 1 hour
  res.setHeader('Access-Control-Max-Age', '3600');

  next();
};
