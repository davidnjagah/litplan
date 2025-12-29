# Litplan Backend - Vercel Deployment Guide

This guide covers deploying the Litplan Express backend to Vercel as a serverless function.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Environment Variables](#environment-variables)
4. [Deployment Steps](#deployment-steps)
5. [Database Configuration](#database-configuration)
6. [Vercel Configuration](#vercel-configuration)
7. [Monitoring & Health Checks](#monitoring--health-checks)
8. [Troubleshooting](#troubleshooting)
9. [Local Development](#local-development)

---

## Prerequisites

Before deploying, ensure you have:

- [ ] Node.js 18+ installed
- [ ] Vercel CLI installed (`npm i -g vercel`)
- [ ] Vercel account and project created
- [ ] Supabase project with PostgreSQL database
- [ ] All required environment variables ready

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Run database migrations (if needed)
npx prisma migrate deploy

# 4. Deploy to Vercel
vercel --prod
```

---

## Environment Variables

### Required Variables

Configure these in Vercel Dashboard > Project Settings > Environment Variables:

| Variable | Description | Environment |
|----------|-------------|-------------|
| `DATABASE_URL` | Supabase connection string with PgBouncer (port 6543) | Production, Preview |
| `DIRECT_DATABASE_URL` | Direct connection string for migrations (port 5432) | Production, Preview |
| `SUPABASE_URL` | Supabase project URL | Production, Preview |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret) | Production, Preview |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI features | Production |
| `NODE_ENV` | Set to `production` | Production only |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) | See vercel.json |
| `LOG_REQUESTS` | Enable request logging | `false` |
| `RATE_LIMIT_READ_PER_MINUTE` | Read rate limit | `100` |
| `RATE_LIMIT_WRITE_PER_MINUTE` | Write rate limit | `20` |

### Database URL Formats

**Connection Pooling (for serverless - use this for `DATABASE_URL`):**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Direct Connection (for migrations - use this for `DIRECT_DATABASE_URL`):**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

---

## Deployment Steps

### First-Time Setup

1. **Login to Vercel:**
   ```bash
   vercel login
   ```

2. **Link your project:**
   ```bash
   vercel link
   ```

3. **Set environment variables:**
   ```bash
   # Using Vercel CLI
   vercel env add DATABASE_URL production
   vercel env add SUPABASE_URL production
   vercel env add SUPABASE_ANON_KEY production
   vercel env add SUPABASE_SERVICE_ROLE_KEY production
   vercel env add ANTHROPIC_API_KEY production
   ```

   Or configure via Vercel Dashboard:
   - Go to Project Settings > Environment Variables
   - Add each variable for the appropriate environment

4. **Deploy:**
   ```bash
   vercel --prod
   ```

### Subsequent Deployments

```bash
# Production deployment
npm run deploy:vercel

# Or directly
vercel --prod
```

### Preview Deployments

Preview deployments are created automatically for pull requests, or manually:

```bash
vercel
```

---

## Database Configuration

### Supabase PostgreSQL Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Get connection strings** from:
   - Dashboard > Project Settings > Database > Connection string
   - Use "Connection pooling" mode for `DATABASE_URL`
   - Use "Direct connection" for `DIRECT_DATABASE_URL`

3. **Run migrations:**
   ```bash
   # Ensure DIRECT_DATABASE_URL is set
   npx prisma migrate deploy
   ```

### Connection Pooling (PgBouncer)

Supabase provides PgBouncer for connection pooling, which is essential for serverless deployments:

- **Port 6543**: Connection pooler (use for `DATABASE_URL`)
- **Port 5432**: Direct connection (use for `DIRECT_DATABASE_URL`)

The connection pooler:
- Manages connection limits efficiently
- Reduces cold start times
- Prevents connection exhaustion

### Prisma Configuration

The Prisma schema is configured for serverless:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
  binaryTargets   = ["native", "rhel-openssl-3.0.x"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}
```

---

## Vercel Configuration

### vercel.json Overview

```json
{
  "version": 2,
  "regions": ["iad1"],
  "functions": {
    "api/index.js": {
      "runtime": "@vercel/node@3.2.0",
      "memory": 1024,
      "maxDuration": 30
    }
  },
  "routes": [
    { "src": "/api/v2/(.*)", "dest": "/api/index.js" },
    { "src": "/health", "dest": "/api/index.js" },
    { "src": "/(.*)", "dest": "/api/index.js" }
  ]
}
```

### Region Selection

The backend is deployed to `iad1` (US East - N. Virginia) to minimize latency with Supabase:

- Choose a region closest to your Supabase project
- Available regions: `iad1`, `sfo1`, `fra1`, `hnd1`, etc.

### Function Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| `memory` | 1024 MB | Memory allocation per function |
| `maxDuration` | 30 seconds | Maximum execution time |

---

## Monitoring & Health Checks

### Health Check Endpoints

The API provides health check endpoints at:

- `GET /health` - Basic health check
- `GET /api/health` - API-prefixed health check

**Response (healthy):**
```json
{
  "status": "healthy",
  "database": "connected",
  "dbLatency": "5ms",
  "environment": "production",
  "region": "iad1",
  "timestamp": "2024-12-29T00:00:00.000Z"
}
```

**Response (unhealthy):**
```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Connection refused",
  "timestamp": "2024-12-29T00:00:00.000Z"
}
```

### Vercel Analytics

Enable in Vercel Dashboard:
- Real User Monitoring (RUM)
- Function logs
- Error tracking

### Recommended Monitoring Setup

1. **Vercel Dashboard**: Function invocations, errors, latency
2. **Supabase Dashboard**: Database connections, queries, performance
3. **External Monitoring**: Use tools like Better Uptime, Checkly, or Vercel's native monitoring

---

## Troubleshooting

### Common Issues

#### 1. Cold Start Timeouts

**Symptom:** First request after idle period times out

**Solution:**
- Increase `maxDuration` in vercel.json
- Use connection pooling (PgBouncer)
- Consider Vercel Edge Functions for faster cold starts

#### 2. Database Connection Errors

**Symptom:** `ECONNREFUSED` or connection pool exhausted

**Solutions:**
- Verify `DATABASE_URL` uses port 6543 (PgBouncer)
- Add `?pgbouncer=true` to connection string
- Check Supabase connection limits

#### 3. Prisma Client Not Generated

**Symptom:** `Error: @prisma/client did not initialize yet`

**Solution:**
```bash
# Ensure postinstall runs
npm install

# Or manually generate
npx prisma generate
```

#### 4. Environment Variables Not Available

**Symptom:** `undefined` environment variables

**Solutions:**
- Verify variables are set in Vercel Dashboard
- Check correct environment (Production vs Preview)
- Redeploy after adding variables

#### 5. CORS Errors

**Symptom:** Blocked by CORS policy

**Solutions:**
- Add origin to `CORS_ORIGIN` environment variable
- Check vercel.json headers configuration
- Verify preflight (OPTIONS) requests are handled

### Logs and Debugging

```bash
# View deployment logs
vercel logs [deployment-url]

# View real-time logs
vercel logs --follow

# Check function logs in Dashboard
# Vercel Dashboard > Project > Deployments > Functions
```

---

## Local Development

### Running Locally

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev

# Or with hot reload
npm run dev:watch
```

### Testing Vercel Locally

```bash
# Run Vercel development server
npm run vercel:dev

# Or directly
vercel dev
```

### Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in your local/development values
3. For local Supabase, use direct connection string

---

## API Endpoints

### Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://your-project.vercel.app/api/v2` |
| Preview | `https://your-project-[branch].vercel.app/api/v2` |
| Local | `http://localhost:3001/api/v2` |

### Available Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v2` | GET | No | API documentation |
| `/api/v2/cities` | GET | No | List all cities |
| `/api/v2/cities/:id` | GET | No | Get city details |
| `/api/v2/cities/:id/plans` | GET | Yes | Get city plans |
| `/api/v2/plans/:id` | GET | Yes | Get plan details |
| `/api/v2/user/profile` | GET | Yes | Get user profile |
| `/api/v2/subscription` | GET | Yes | Get subscription status |
| `/api/v2/config` | GET | No | Get app configuration |
| `/health` | GET | No | Health check |

---

## Security Checklist

Before deploying to production:

- [ ] `SUPABASE_SERVICE_ROLE_KEY` marked as secret in Vercel
- [ ] `ANTHROPIC_API_KEY` marked as secret in Vercel
- [ ] CORS origins properly configured
- [ ] Rate limiting enabled
- [ ] Supabase Row Level Security (RLS) enabled
- [ ] Database passwords are strong and unique
- [ ] No sensitive data in logs

---

## Support

For issues:
1. Check this guide's troubleshooting section
2. Review Vercel deployment logs
3. Check Supabase database logs
4. Open an issue in the repository

---

*Last updated: December 29, 2024 - Sprint 6 Phase 5*
