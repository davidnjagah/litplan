/**
 * Vercel Serverless API Entry Point
 *
 * This file exports the Express app as a Vercel serverless function.
 * It handles all API requests through the existing Express application.
 *
 * @module api/index
 * @since Sprint 6 Phase 5 - Vercel Deployment
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import V2 API routes (Prisma + Supabase Auth)
import v2Router from '../src/api/routes/v2';
import clerkAuthRoutes from '../src/api/routes/auth';
import clerkWebhookRoutes from '../src/api/webhooks/clerk';

// Create Express app
const app = express();

// Production CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://litplanz.com',
  'https://www.litplanz.com',
  'https://litplanai.vercel.app',
  process.env.CORS_ORIGIN,
].filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (process.env.NODE_ENV !== 'production') {
      // In development, allow all origins
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Accept-Version',
    'Content-Length',
    'Content-MD5',
    'Date',
    'X-Api-Version',
    'X-CSRF-Token',
  ],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware for production debugging
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production' && process.env.LOG_REQUESTS === 'true') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Clerk Webhooks (must be before JSON parsing for raw body access)
app.use('/webhooks/clerk', clerkWebhookRoutes);

// Clerk Authentication Routes
app.use('/api/v2/auth', clerkAuthRoutes);

// V2 API Routes (Prisma + Supabase Auth)
app.use('/api/v2', v2Router);

// Health check endpoints
app.get('/health', async (_req: Request, res: Response) => {
  try {
    // Lazy load Prisma to avoid cold start overhead when not needed
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - startTime;

    await prisma.$disconnect();

    res.json({
      status: 'healthy',
      database: 'connected',
      dbLatency: `${dbLatency}ms`,
      environment: process.env.NODE_ENV || 'development',
      region: process.env.VERCEL_REGION || 'unknown',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - startTime;

    await prisma.$disconnect();

    res.json({
      status: 'healthy',
      database: 'connected',
      dbLatency: `${dbLatency}ms`,
      environment: process.env.NODE_ENV || 'development',
      region: process.env.VERCEL_REGION || 'unknown',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Litplan Backend API',
    version: '2.0.0',
    database: 'PostgreSQL (Supabase)',
    auth: 'Supabase Auth',
    environment: process.env.NODE_ENV || 'development',
    region: process.env.VERCEL_REGION || 'unknown',
    endpoints: {
      docs: 'GET /api/v2',
      cities: 'GET /api/v2/cities',
      config: 'GET /api/v2/config',
      health: 'GET /health',
    },
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist',
    },
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);

  // Handle CORS errors specifically
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({
      success: false,
      error: {
        code: 'CORS_ERROR',
        message: 'Origin not allowed',
      },
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
  });
});

// Export the Express app as the default export for Vercel
export default app;
