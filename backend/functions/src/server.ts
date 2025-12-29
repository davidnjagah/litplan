/**
 * Local Development Server
 *
 * Run with: npx ts-node src/server.ts
 * Or after build: node lib/server.js
 *
 * This runs the Express app directly without Firebase emulators,
 * useful for testing Prisma-based V2 endpoints.
 *
 * @module server
 * @since Sprint 5 - Prisma Migration
 * @updated Sprint 6 Phase 5 - Vercel Deployment Preparation
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import Prisma client singleton
import prisma from './lib/prisma';

// Import V2 API routes (Prisma + Supabase Auth)
import v2Router from './api/routes/v2';
import clerkAuthRoutes from './api/routes/auth';
import clerkWebhookRoutes from './api/webhooks/clerk';

// Create Express app
const app = express();

// Development CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
  ],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Clerk Webhooks
app.use('/webhooks/clerk', clerkWebhookRoutes);

// Clerk Authentication Routes
app.use('/api/v2/auth', clerkAuthRoutes);

// V2 API Routes (Prisma + Supabase Auth)
app.use('/api/v2', v2Router);

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Litplan Backend API - Local Development Server',
    version: '2.0.0',
    database: 'PostgreSQL (Prisma)',
    auth: 'Supabase Auth',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      docs: 'GET /api/v2',
      cities: 'GET /api/v2/cities',
      config: 'GET /api/v2/config',
      health: 'GET /health',
    },
  });
});

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  try {
    // Test database connection using the singleton
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - startTime;

    res.json({
      status: 'healthy',
      database: 'connected',
      dbLatency: `${dbLatency}ms`,
      environment: process.env.NODE_ENV || 'development',
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

// Health check at /api/health as well
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - startTime;

    res.json({
      status: 'healthy',
      database: 'connected',
      dbLatency: `${dbLatency}ms`,
      environment: process.env.NODE_ENV || 'development',
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
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message,
    },
  });
});

// Start server
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('  LITPLAN BACKEND - LOCAL DEVELOPMENT SERVER');
  console.log('='.repeat(60));
  console.log('');
  console.log(`  Server running at: http://localhost:${PORT}`);
  console.log('');
  console.log('  Endpoints:');
  console.log(`    API Docs:     http://localhost:${PORT}/api/v2`);
  console.log(`    Cities:       http://localhost:${PORT}/api/v2/cities`);
  console.log(`    Config:       http://localhost:${PORT}/api/v2/config`);
  console.log(`    Health:       http://localhost:${PORT}/health`);
  console.log('');
  console.log('='.repeat(60));
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
