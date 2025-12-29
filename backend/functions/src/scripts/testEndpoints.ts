/**
 * E2E API Endpoint Test Script
 *
 * Automated testing script for Litplan backend API endpoints.
 * Tests all public endpoints and reports pass/fail status.
 *
 * Usage:
 *   npx ts-node src/scripts/testEndpoints.ts
 *   npm run test:endpoints (after adding to package.json)
 *
 * @module scripts/testEndpoints
 * @since Sprint 6 Phase 7 - Testing & Deployment
 */

import dotenv from 'dotenv';
dotenv.config();

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';

// Test result types
interface TestResult {
  name: string;
  endpoint: string;
  method: string;
  passed: boolean;
  statusCode: number;
  expectedStatus: number;
  duration: number;
  error?: string;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
}

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

// Logging helpers
function log(message: string, color = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(result: TestResult): void {
  const status = result.passed
    ? `${colors.green}PASS${colors.reset}`
    : `${colors.red}FAIL${colors.reset}`;
  const duration = `${colors.dim}${result.duration}ms${colors.reset}`;

  console.log(
    `  ${status} ${result.method} ${result.endpoint} [${result.statusCode}] ${duration}`
  );

  if (!result.passed && result.error) {
    console.log(`       ${colors.red}Error: ${result.error}${colors.reset}`);
  }
}

// HTTP request helper
async function makeRequest(
  endpoint: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  body?: object
): Promise<{ status: number; data: unknown; duration: number }> {
  const url = `${BASE_URL}${endpoint}`;
  const startTime = Date.now();

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const duration = Date.now() - startTime;

    let data: unknown;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return { status: response.status, data, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      status: 0,
      data: null,
      duration,
    };
  }
}

// Test definitions
interface TestCase {
  name: string;
  endpoint: string;
  method?: string;
  expectedStatus: number;
  headers?: Record<string, string>;
  body?: object;
  validate?: (data: unknown) => boolean;
}

const testCases: TestCase[] = [
  // Health & Status
  {
    name: 'Health Check',
    endpoint: '/health',
    expectedStatus: 200,
    validate: (data) => {
      const d = data as { status: string; database: string };
      return d.status === 'healthy' && d.database === 'connected';
    },
  },
  {
    name: 'Root Endpoint',
    endpoint: '/',
    expectedStatus: 200,
    validate: (data) => {
      const d = data as { version: string };
      return d.version === '2.0.0';
    },
  },
  {
    name: 'API v2 Documentation',
    endpoint: '/api/v2',
    expectedStatus: 200,
    validate: (data) => {
      const d = data as { success: boolean; data: { version: string } };
      return d.success === true && d.data.version === '2.0.0';
    },
  },

  // Cities (Public)
  {
    name: 'List All Cities',
    endpoint: '/api/v2/cities',
    expectedStatus: 200,
    validate: (data) => {
      const d = data as { success: boolean; data: { cities: unknown[] } };
      return d.success === true && Array.isArray(d.data.cities);
    },
  },
  {
    name: 'Featured Cities',
    endpoint: '/api/v2/cities/featured',
    expectedStatus: 200,
    validate: (data) => {
      const d = data as { success: boolean; data: { cities: unknown[] } };
      return d.success === true && Array.isArray(d.data.cities);
    },
  },
  {
    name: 'Featured Cities with Limit',
    endpoint: '/api/v2/cities/featured?limit=3',
    expectedStatus: 200,
    validate: (data) => {
      const d = data as { success: boolean; data: { cities: unknown[] } };
      return d.success === true && d.data.cities.length <= 3;
    },
  },
  {
    name: 'Search Cities',
    endpoint: '/api/v2/cities/search?q=New',
    expectedStatus: 200,
    validate: (data) => {
      const d = data as { success: boolean; data: { cities: unknown[]; query: string } };
      return d.success === true && d.data.query === 'New';
    },
  },
  {
    name: 'Search Without Query (Should Fail)',
    endpoint: '/api/v2/cities/search',
    expectedStatus: 400,
    validate: (data) => {
      const d = data as { success: boolean; error: { code: string } };
      return d.success === false && d.error.code === 'VALIDATION_ERROR';
    },
  },
  {
    name: 'City Details by Legacy ID',
    endpoint: '/api/v2/cities/nyc-001',
    expectedStatus: 200,
    validate: (data) => {
      const d = data as { success: boolean; data: { city: { cityId: string } } };
      return d.success === true && d.data.city.cityId === 'nyc-001';
    },
  },
  {
    name: 'City Not Found',
    endpoint: '/api/v2/cities/invalid-city-id',
    expectedStatus: 404,
    validate: (data) => {
      const d = data as { success: boolean; error: { code: string } };
      return d.success === false && d.error.code === 'NOT_FOUND';
    },
  },

  // Plans (Public)
  {
    name: 'Featured Plans for City',
    endpoint: '/api/v2/plans/featured/nyc-001',
    expectedStatus: 200,
    validate: (data) => {
      const d = data as { success: boolean; data: { plans: unknown[] } };
      return d.success === true && Array.isArray(d.data.plans);
    },
  },

  // Config (Public)
  {
    name: 'App Config',
    endpoint: '/api/v2/config',
    expectedStatus: 200,
    validate: (data) => {
      const d = data as { success: boolean; data: { config: { currentWeek: string } } };
      return d.success === true && typeof d.data.config.currentWeek === 'string';
    },
  },
  {
    name: 'Tier Limits',
    endpoint: '/api/v2/config/tier-limits',
    expectedStatus: 200,
    validate: (data): boolean => {
      const d = data as { success: boolean; data: { tierLimits: { FREE: unknown; PRO: unknown } } };
      return d.success === true && Boolean(d.data.tierLimits.FREE) && Boolean(d.data.tierLimits.PRO);
    },
  },

  // Storage (Public)
  {
    name: 'Storage Info',
    endpoint: '/api/v2/storage/info',
    expectedStatus: 200,
    validate: (data) => {
      const d = data as { success: boolean; data: { buckets: unknown } };
      return d.success === true && typeof d.data.buckets === 'object';
    },
  },

  // Auth Required Endpoints (Should fail without token)
  {
    name: 'City Plans (No Auth)',
    endpoint: '/api/v2/cities/nyc-001/plans',
    expectedStatus: 401,
    validate: (data) => {
      const d = data as { success: boolean; error: { code: string } };
      return d.success === false && d.error.code === 'AUTH_REQUIRED';
    },
  },
  {
    name: 'User Profile (No Auth)',
    endpoint: '/api/v2/user/profile',
    expectedStatus: 401,
    validate: (data) => {
      const d = data as { success: boolean; error: { code: string } };
      return d.success === false && d.error.code === 'AUTH_REQUIRED';
    },
  },
  {
    name: 'Subscription Status (No Auth)',
    endpoint: '/api/v2/subscription',
    expectedStatus: 401,
    validate: (data) => {
      const d = data as { success: boolean; error: { code: string } };
      return d.success === false && d.error.code === 'AUTH_REQUIRED';
    },
  },
  {
    name: 'Group Flows (No Auth)',
    endpoint: '/api/v2/cities/nyc-001/group-flows',
    expectedStatus: 401,
    validate: (data) => {
      const d = data as { success: boolean; error: { code: string } };
      return d.success === false && d.error.code === 'AUTH_REQUIRED';
    },
  },
];

// Run a single test
async function runTest(testCase: TestCase): Promise<TestResult> {
  const method = testCase.method || 'GET';
  const { status, data, duration } = await makeRequest(
    testCase.endpoint,
    method,
    testCase.headers,
    testCase.body
  );

  let passed = status === testCase.expectedStatus;
  let error: string | undefined;

  if (passed && testCase.validate) {
    try {
      passed = testCase.validate(data);
      if (!passed) {
        error = 'Response validation failed';
      }
    } catch (e) {
      passed = false;
      error = `Validation error: ${e}`;
    }
  }

  if (status === 0) {
    error = 'Connection failed - is the server running?';
  } else if (!passed && !error) {
    error = `Expected status ${testCase.expectedStatus}, got ${status}`;
  }

  return {
    name: testCase.name,
    endpoint: testCase.endpoint,
    method,
    passed,
    statusCode: status,
    expectedStatus: testCase.expectedStatus,
    duration,
    error,
  };
}

// Run all tests
async function runAllTests(): Promise<TestSummary> {
  const startTime = Date.now();
  const results: TestResult[] = [];

  log('');
  log('='.repeat(60), colors.cyan);
  log('  LITPLAN API ENDPOINT TESTS', colors.bold);
  log('='.repeat(60), colors.cyan);
  log('');
  log(`  Base URL: ${BASE_URL}`, colors.dim);
  log(`  Tests: ${testCases.length}`, colors.dim);
  log('');

  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results.push(result);
    logTest(result);
  }

  const duration = Date.now() - startTime;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  return {
    total: results.length,
    passed,
    failed,
    duration,
    results,
  };
}

// Print summary
function printSummary(summary: TestSummary): void {
  log('');
  log('='.repeat(60), colors.cyan);
  log('  TEST SUMMARY', colors.bold);
  log('='.repeat(60), colors.cyan);
  log('');

  const passedColor = summary.passed === summary.total ? colors.green : colors.yellow;
  const failedColor = summary.failed > 0 ? colors.red : colors.green;

  log(`  Total:    ${summary.total}`, colors.dim);
  log(`  Passed:   ${summary.passed}`, passedColor);
  log(`  Failed:   ${summary.failed}`, failedColor);
  log(`  Duration: ${summary.duration}ms`, colors.dim);
  log('');

  if (summary.failed > 0) {
    log('  FAILED TESTS:', colors.red);
    summary.results
      .filter((r) => !r.passed)
      .forEach((r) => {
        log(`    - ${r.name}: ${r.error}`, colors.red);
      });
    log('');
  }

  const status = summary.failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED';
  const statusColor = summary.failed === 0 ? colors.green : colors.red;
  log(`  ${status}`, statusColor);
  log('');
  log('='.repeat(60), colors.cyan);
  log('');
}

// Main execution
async function main(): Promise<void> {
  try {
    const summary = await runAllTests();
    printSummary(summary);

    // Exit with appropriate code
    process.exit(summary.failed > 0 ? 1 : 0);
  } catch (error) {
    log(`\nFatal error: ${error}`, colors.red);
    process.exit(1);
  }
}

main();
