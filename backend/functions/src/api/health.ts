/**
 * Health Check Endpoint
 * Provides system health status for monitoring and alerting
 */

import {Router} from 'express';
import {db} from '../config/firestore';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

/**
 * Health check response interface
 */
interface HealthCheckResponse {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  checks: {
    firestore: HealthCheck;
    anthropic: HealthCheck;
    apple: HealthCheck;
    environment: HealthCheck;
  };
}

interface HealthCheck {
  healthy: boolean;
  message: string;
  latency?: number;
  details?: Record<string, any>;
}

/**
 * Check Firestore connectivity and performance
 */
async function checkFirestore(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // Try to read a document from a known collection
    const citiesRef = db.collection('cities');
    const snapshot = await citiesRef.limit(1).get();

    const latency = Date.now() - start;

    return {
      healthy: true,
      message: 'Firestore is accessible',
      latency,
      details: {
        documentsChecked: snapshot.size,
        responseTime: `${latency}ms`,
      },
    };
  } catch (error: any) {
    return {
      healthy: false,
      message: `Firestore check failed: ${error.message}`,
      latency: Date.now() - start,
    };
  }
}

/**
 * Check Anthropic API key validity and connectivity
 */
async function checkAnthropicAPI(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return {
        healthy: false,
        message: 'Anthropic API key not configured',
      };
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    // Make a minimal API call to verify key is valid
    // Using a very short message to minimize cost and latency
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: 'Hi',
      }],
    });

    const latency = Date.now() - start;

    return {
      healthy: true,
      message: 'Anthropic API is accessible',
      latency,
      details: {
        model: message.model,
        responseTime: `${latency}ms`,
      },
    };
  } catch (error: any) {
    return {
      healthy: false,
      message: `Anthropic API check failed: ${error.message}`,
      latency: Date.now() - start,
    };
  }
}

/**
 * Check Apple shared secret configuration
 */
function checkAppleConfig(): HealthCheck {
  try {
    const sharedSecret = process.env.APPLE_SHARED_SECRET;

    if (!sharedSecret) {
      return {
        healthy: false,
        message: 'Apple shared secret not configured',
      };
    }

    // Basic validation: check if it's a valid format
    if (sharedSecret.length < 10) {
      return {
        healthy: false,
        message: 'Apple shared secret appears invalid (too short)',
      };
    }

    return {
      healthy: true,
      message: 'Apple shared secret is configured',
      details: {
        configured: true,
        length: sharedSecret.length,
      },
    };
  } catch (error: any) {
    return {
      healthy: false,
      message: `Apple config check failed: ${error.message}`,
    };
  }
}

/**
 * Check required environment variables
 */
function checkEnvironment(): HealthCheck {
  const requiredVars = [
    'ANTHROPIC_API_KEY',
    'APPLE_SHARED_SECRET',
  ];

  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    return {
      healthy: false,
      message: `Missing environment variables: ${missing.join(', ')}`,
      details: {
        missing,
        required: requiredVars,
      },
    };
  }

  return {
    healthy: true,
    message: 'All required environment variables are set',
    details: {
      nodeEnv: process.env.NODE_ENV || 'development',
      region: process.env.FUNCTION_REGION || 'unknown',
    },
  };
}

/**
 * GET /health
 * Health check endpoint for monitoring
 */
router.get('/', async (req, res) => {
  try {
    // Run all health checks in parallel
    const [firestoreCheck, anthropicCheck, appleCheck, envCheck] =
      await Promise.all([
        checkFirestore(),
        checkAnthropicAPI(),
        checkAppleConfig(),
        Promise.resolve(checkEnvironment()),
      ]);

    const checks = {
      firestore: firestoreCheck,
      anthropic: anthropicCheck,
      apple: appleCheck,
      environment: envCheck,
    };

    // Determine overall health status
    const allHealthy = Object.values(checks).every((check) => check.healthy);
    const someUnhealthy = Object.values(checks).some((check) => !check.healthy);

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (allHealthy) {
      status = 'healthy';
    } else if (someUnhealthy && checks.firestore.healthy) {
      // If Firestore is healthy but others aren't, consider it degraded
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    const response: HealthCheckResponse = {
      timestamp: new Date().toISOString(),
      status,
      version: '1.0.0',
      uptime: process.uptime(),
      checks,
    };

    // Set appropriate HTTP status code
    const statusCode = status === 'healthy' ? 200 :
      status === 'degraded' ? 200 : 503;

    return res.status(statusCode).json(response);
  } catch (error: any) {
    console.error('Health check error:', error);

    const errorResponse: HealthCheckResponse = {
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      version: '1.0.0',
      uptime: process.uptime(),
      checks: {
        firestore: {
          healthy: false,
          message: 'Health check failed',
        },
        anthropic: {
          healthy: false,
          message: 'Health check failed',
        },
        apple: {
          healthy: false,
          message: 'Health check failed',
        },
        environment: {
          healthy: false,
          message: error.message,
        },
      },
    };

    return res.status(503).json(errorResponse);
  }
});

/**
 * GET /health/liveness
 * Simple liveness probe (returns 200 if service is running)
 */
router.get('/liveness', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/readiness
 * Readiness probe (returns 200 if service is ready to handle requests)
 */
router.get('/readiness', async (req, res) => {
  try {
    // Check if Firestore is accessible
    const firestoreCheck = await checkFirestore();

    if (firestoreCheck.healthy) {
      return res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      return res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        reason: firestoreCheck.message,
      });
    }
  } catch (error: any) {
    return res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      reason: error.message,
    });
  }
});

export default router;
