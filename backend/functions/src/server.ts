/**
 * Local Development Server
 *
 * Run with: npx ts-node src/server.ts
 * Or after build: node lib/server.js
 *
 * This runs the Express app directly without Firebase emulators,
 * useful for testing Prisma-based V2 endpoints.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import V2 API routes (Prisma + Clerk)
import v2Router from './api/routes/v2';
import clerkAuthRoutes from './api/routes/auth';
import clerkWebhookRoutes from './api/webhooks/clerk';

// Create Express app
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Clerk Webhooks
app.use('/webhooks/clerk', clerkWebhookRoutes);

// Clerk Authentication Routes
app.use('/api/v2/auth', clerkAuthRoutes);

// V2 API Routes (Prisma + Clerk)
app.use('/api/v2', v2Router);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Litplan Backend API - Local Development Server',
    version: '2.0.0',
    database: 'PostgreSQL (Prisma)',
    auth: 'Clerk',
    endpoints: {
      docs: 'GET /api/v2',
      cities: 'GET /api/v2/cities',
      config: 'GET /api/v2/config',
      health: 'GET /health',
    },
  });
});

// Health check
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();

    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
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

export default app;
