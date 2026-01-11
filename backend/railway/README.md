# Litplan Pipeline Orchestrator - Railway Deployment

This service hosts the AI pipeline orchestrator on Railway, bypassing Supabase's 60-second Edge Function timeout limit. Railway has **no timeout restrictions** for HTTP requests.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    RAILWAY ORCHESTRATOR                         │
│                   (Express.js Server)                           │
│                   No timeout limits                             │
└─────────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
┌───────────────────────┐         ┌───────────────────────┐
│   INDIVIDUAL PLANS    │         │     GROUP PLANS       │
│   (search-agent)      │         │(group-7agent-pipeline)│
│   Uses: CLAUDE        │         │   Uses: GPT-4o        │
│   ~60s per city       │         │   ~180s per city      │
└───────────────────────┘         └───────────────────────┘
```

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Account**: With access to `davidnjagah/litplan` repository
3. **Node.js 18+**: Required for local testing
4. **Supabase Service Key**: Your service role key from Supabase

## GitHub Repository

```
Repository: davidnjagah/litplan
Service Path: backend/railway
Branch: main
```

## Step-by-Step Deployment

### Step 1: Create Railway Account & Project

1. Go to [railway.app](https://railway.app)
2. Click **"Login"** → Sign in with GitHub (recommended for easy repo access)
3. Once logged in, click **"New Project"** (top right)
4. Select **"Empty Project"**
5. Click on the project name (top left) to rename it to: `litplan-pipeline`

### Step 2: Connect GitHub Repository

**Important: Railway only needs access to THIS specific repository, not all your repos.**

1. In your Railway project dashboard, click **"+ New"** or **"Add Service"**
2. Select **"GitHub Repo"**
3. If first time, Railway will ask for GitHub permissions:
   - Click **"Configure GitHub App"**
   - Select **"Only select repositories"** (NOT "All repositories")
   - Search and select: **`litplan`** (the davidnjagah/litplan repo)
   - Click **"Install & Authorize"**
4. Back in Railway, you'll now see `litplan` in the repo list
5. Click on **`davidnjagah/litplan`** to select it
6. **IMPORTANT**: Set the **Root Directory** to: `backend/railway`
   - Click on the service → **Settings** tab
   - Scroll to **"Root Directory"**
   - Enter: `backend/railway`
   - This tells Railway to only build from this subfolder

### Step 3: Configure Environment Variables

1. Click on your service in Railway
2. Go to **"Variables"** tab
3. Click **"+ New Variable"** and add each:

```
SUPABASE_URL=https://clktdigankjszupvrsqt.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsa3RkaWdhbmtqc3p1cHZyc3F0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzAxNjQzNywiZXhwIjoyMDgyNTkyNDM3fQ.MpZ0c4A1M58ih0Tdij7zcnzyoziI1plDwFwzN-FVCKs
NODE_ENV=production
PORT=3000
```

> **Note**: The `PORT=3000` is optional - Railway auto-assigns a port, but setting it explicitly helps with consistency.

### Step 4: Configure Build Settings

1. Go to **Settings** tab in your Railway service
2. Scroll to **"Build"** section and configure:

| Setting | Value |
|---------|-------|
| **Root Directory** | `backend/railway` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Watch Paths** | `backend/railway/**` |

3. Scroll to **"Networking"** section:
   - Click **"Generate Domain"** to get a public URL
   - Or add a custom domain if you have one

### Step 5: Deploy

Railway will automatically deploy when:
- You push changes to the `main` branch
- You click **"Deploy"** manually in the dashboard

To trigger first deployment:
1. Click **"Deploy"** button (top right of service)
2. Or push any commit to the repo

### Step 6: Get Your Railway URL

After deployment completes (2-3 minutes):

1. Go to your service → **Settings** → **Networking**
2. Your URL will look like:
```
https://litplan-pipeline-production-xxxx.up.railway.app
```

Or from the **Deployments** tab, click on the active deployment to see the URL.

### Step 7: Verify Deployment

```bash
# Test health endpoint
curl https://YOUR_RAILWAY_URL.up.railway.app/health

# Expected response:
# {"status":"ok","service":"litplan-pipeline-orchestrator","timestamp":"..."}
```

## API Endpoints

### Health Check
```bash
GET /health
```

### Generate Individual Plans (Claude)
```bash
POST /api/pipeline/individual
Content-Type: application/json

{
  "cityId": "cmjrcg43r0000wbxrw025frc8",
  "cityName": "New York",
  "country": "United States",
  "weekStartDate": "2026-01-06",
  "weekEndDate": "2026-01-12"
}
```

### Generate Group Plans (GPT 7-Agent)
```bash
POST /api/pipeline/group
Content-Type: application/json

{
  "cityName": "New York",
  "storeResults": true
}
```

Supported cities for group plans: `Ibiza`, `Paris`, `New York` (add more in group-7agent-pipeline)

### Full Pipeline (Individual + Group)
```bash
POST /api/pipeline/full
Content-Type: application/json

{
  "cityId": "cmjrcg43r0000wbxrw025frc8",
  "cityName": "New York",
  "country": "United States",
  "weekStartDate": "2026-01-06",
  "weekEndDate": "2026-01-12",
  "storeResults": true
}
```

### Batch Processing (Multiple Cities)
```bash
POST /api/pipeline/batch
Content-Type: application/json

{
  "cities": [
    {
      "cityId": "cmjrcg43r0000wbxrw025frc8",
      "cityName": "New York",
      "country": "United States"
    },
    {
      "cityId": "cmjrcg4s50004wbxrpzps2dkw",
      "cityName": "Paris",
      "country": "France"
    }
  ],
  "weekStartDate": "2026-01-06",
  "weekEndDate": "2026-01-12",
  "storeResults": true
}
```

## Local Development

```bash
# Navigate to railway folder
cd backend/railway

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env
# Edit .env with your actual SUPABASE_SERVICE_KEY

# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Testing the Deployment

After deploying, test with:

```bash
# Health check
curl https://YOUR_RAILWAY_URL.up.railway.app/health

# Test individual plans (Claude)
curl -X POST https://YOUR_RAILWAY_URL.up.railway.app/api/pipeline/individual \
  -H "Content-Type: application/json" \
  -d '{
    "cityId": "cmjrcg43r0000wbxrw025frc8",
    "cityName": "New York",
    "country": "United States",
    "weekStartDate": "2026-01-06",
    "weekEndDate": "2026-01-12"
  }'

# Test group plans (GPT 7-Agent)
curl -X POST https://YOUR_RAILWAY_URL.up.railway.app/api/pipeline/group \
  -H "Content-Type: application/json" \
  -d '{
    "cityName": "Ibiza",
    "storeResults": true
  }'
```

## Expected Response Times

| Pipeline | Time | Notes |
|----------|------|-------|
| Individual Plans | ~60s | Claude generates venues + events |
| Group Plans | ~180s | 7-agent GPT pipeline |
| Full Pipeline | ~240s | Both pipelines sequentially |

## Troubleshooting

### "Function not found" error
- Ensure Supabase functions are deployed: `search-agent` and `group-7agent-pipeline`

### Timeout on individual plans
- Check Claude API key in Supabase secrets: `ANTHROPIC_API_KEY`

### Timeout on group plans
- Check OpenAI API key in Supabase secrets: `OPENAI_API_KEY`

### Railway deployment fails
- Check build logs in Railway dashboard
- Ensure `backend/railway` is set as root directory

## Cost Estimates

Railway pricing:
- **Hobby Plan**: $5/month (includes 500 execution hours)
- **Pro Plan**: $20/month (unlimited execution hours)

For weekly refreshes of 100 cities, the Hobby plan should be sufficient.

## Files Structure

```
backend/railway/
├── package.json          # NPM dependencies
├── tsconfig.json         # TypeScript config
├── .env.example          # Environment template
├── README.md             # This file
└── src/
    └── index.ts          # Express server
```
