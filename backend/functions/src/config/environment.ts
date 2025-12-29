/**
 * Environment Configuration
 * Centralized configuration for all environment variables and app settings
 */

/**
 * Environment type
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * Application configuration interface
 */
interface AppConfig {
  env: Environment;
  isProd: boolean;
  isStaging: boolean;
  isDev: boolean;

  anthropic: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };

  apple: {
    sharedSecret: string;
    sandboxUrl: string;
    productionUrl: string;
  };

  weeklyRefresh: {
    enabled: boolean;
    dryRun: boolean;
    schedule: string;
    batchSize: number;
  };

  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
  };

  cors: {
    allowedOrigins: string[];
  };

  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enablePerformanceLogging: boolean;
    slowRequestThreshold: number; // in milliseconds
  };

  subscription: {
    syncEnabled: boolean;
    syncSchedule: string;
  };

  tierLimits: {
    free: {
      maxCitiesPerWeek: number;
      maxPlansPerCity: number;
      weekendAccess: boolean;
      groupPlansAccess: boolean;
      savedCitiesAccess: boolean;
    };
    pro: {
      maxCitiesPerWeek: number;
      maxPlansPerCity: number;
      weekendAccess: boolean;
      groupPlansAccess: boolean;
      savedCitiesAccess: boolean;
    };
  };
}

/**
 * Get current environment
 */
function getEnvironment(): Environment {
  const env = process.env.NODE_ENV?.toLowerCase() || 'development';

  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'development';
}

/**
 * Get CORS allowed origins based on environment
 */
function getCorsOrigins(): string[] {
  const env = getEnvironment();

  switch (env) {
  case 'production':
    return [
      'https://litplan.app',
      'https://www.litplan.app',
    ];
  case 'staging':
    return [
      'https://staging.litplan.app',
      'http://localhost:3000',
      'http://localhost:8080',
    ];
  default:
    return ['*']; // Allow all in development
  }
}

/**
 * Get logging level based on environment
 */
function getLogLevel(): 'debug' | 'info' | 'warn' | 'error' {
  const env = getEnvironment();

  switch (env) {
  case 'production':
    return 'warn';
  case 'staging':
    return 'info';
  default:
    return 'debug';
  }
}

/**
 * Validate required environment variables
 */
function validateEnvironment(): void {
  const required = [
    'ANTHROPIC_API_KEY',
    'APPLE_SHARED_SECRET',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please set them in .env file or Firebase Functions config');

    // In development, warn but don't exit
    if (getEnvironment() === 'development') {
      console.warn('⚠️  Continuing in development mode...');
    } else {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}

/**
 * Application configuration object
 */
export const config: AppConfig = {
  // Environment
  env: getEnvironment(),
  isProd: getEnvironment() === 'production',
  isStaging: getEnvironment() === 'staging',
  isDev: getEnvironment() === 'development',

  // Anthropic (Claude AI)
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4096,
    temperature: 0.7,
  },

  // Apple In-App Purchases
  apple: {
    sharedSecret: process.env.APPLE_SHARED_SECRET || '',
    sandboxUrl: 'https://sandbox.itunes.apple.com/verifyReceipt',
    productionUrl: 'https://buy.itunes.apple.com/verifyReceipt',
  },

  // Weekly Plan Refresh (Scheduled Function)
  weeklyRefresh: {
    enabled: true,
    dryRun: process.env.WEEKLY_REFRESH_DRY_RUN === 'true',
    schedule: '0 0 * * 1', // Every Monday at 00:00 UTC
    batchSize: 10, // Process 10 cities at a time
  },

  // Rate Limiting
  rateLimit: {
    enabled: getEnvironment() !== 'development',
    windowMs: 60 * 1000, // 1 minute
    maxRequests: getEnvironment() === 'production' ? 100 : 1000,
  },

  // CORS Configuration
  cors: {
    allowedOrigins: getCorsOrigins(),
  },

  // Logging Configuration
  logging: {
    level: getLogLevel(),
    enablePerformanceLogging: true,
    slowRequestThreshold: 1000, // 1 second
  },

  // Subscription Sync (Scheduled Function)
  subscription: {
    syncEnabled: true,
    syncSchedule: '0 2 * * *', // Every day at 02:00 UTC
  },

  // Tier Limits
  tierLimits: {
    free: {
      maxCitiesPerWeek: 1,
      maxPlansPerCity: 10,
      weekendAccess: false,
      groupPlansAccess: false,
      savedCitiesAccess: false,
    },
    pro: {
      maxCitiesPerWeek: 100,
      maxPlansPerCity: 50,
      weekendAccess: true,
      groupPlansAccess: true,
      savedCitiesAccess: true,
    },
  },
};

// Validate environment on module load
validateEnvironment();

/**
 * Helper function to check if a feature is enabled
 */
export function isFeatureEnabled(feature: string): boolean {
  switch (feature) {
  case 'weeklyRefresh':
    return config.weeklyRefresh.enabled;
  case 'subscriptionSync':
    return config.subscription.syncEnabled;
  case 'rateLimit':
    return config.rateLimit.enabled;
  case 'performanceLogging':
    return config.logging.enablePerformanceLogging;
  default:
    return false;
  }
}

/**
 * Helper function to get tier limits
 */
export function getTierLimits(tier: 'free' | 'pro') {
  return config.tierLimits[tier];
}

/**
 * Helper function to log configuration on startup
 */
export function logConfiguration(): void {
  console.log('========================================');
  console.log('🔧 Litplan Backend Configuration');
  console.log('========================================');
  console.log(`Environment: ${config.env}`);
  console.log(`Logging Level: ${config.logging.level}`);
  console.log(`Rate Limiting: ${config.rateLimit.enabled ? 'enabled' : 'disabled'}`);
  console.log(`Weekly Refresh: ${config.weeklyRefresh.enabled ? 'enabled' : 'disabled'}`);
  console.log(`Dry Run Mode: ${config.weeklyRefresh.dryRun ? 'enabled' : 'disabled'}`);
  console.log(`CORS Origins: ${config.cors.allowedOrigins.join(', ')}`);
  console.log('========================================');
}

export default config;
