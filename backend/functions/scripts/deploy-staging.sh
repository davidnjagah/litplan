#!/bin/bash
# Staging Deployment Script for Litplan Backend
# This script automates the deployment of Cloud Functions, Firestore rules, and indexes to staging

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STAGING_PROJECT="litplan-staging"
FUNCTIONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 Litplan Staging Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "$FUNCTIONS_DIR/package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Are you in the functions directory?${NC}"
    exit 1
fi

cd "$FUNCTIONS_DIR"

# Step 1: Pre-deployment checks
echo -e "${YELLOW}📋 Running pre-deployment checks...${NC}"

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18 or higher required (current: $NODE_VERSION)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js version check passed${NC}"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI not installed. Run: npm install -g firebase-tools${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Firebase CLI installed${NC}"

# Check if required environment variables are set
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found. Make sure to set environment variables in Firebase Functions config${NC}"
fi

# Step 2: Install dependencies
echo ""
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 3: Run linter
echo ""
echo -e "${YELLOW}🔍 Running linter...${NC}"
npm run lint
echo -e "${GREEN}✓ Linting passed${NC}"

# Step 4: Build TypeScript
echo ""
echo -e "${YELLOW}🔨 Building TypeScript...${NC}"
npm run build
echo -e "${GREEN}✓ Build successful${NC}"

# Step 5: Run tests (when implemented)
# echo ""
# echo -e "${YELLOW}🧪 Running tests...${NC}"
# npm test
# echo -e "${GREEN}✓ Tests passed${NC}"

# Step 6: Switch to staging project
echo ""
echo -e "${YELLOW}🔧 Switching to staging project...${NC}"
firebase use staging 2>/dev/null || firebase use "$STAGING_PROJECT"
CURRENT_PROJECT=$(firebase use 2>&1 | grep -o "Active Project:.*" | cut -d' ' -f3 || echo "")
echo -e "${GREEN}✓ Using project: $CURRENT_PROJECT${NC}"

# Step 7: Deploy Firestore security rules
echo ""
echo -e "${YELLOW}🔒 Deploying Firestore security rules...${NC}"
cd ..
if [ -f "firestore.rules" ]; then
    firebase deploy --only firestore:rules --project "$STAGING_PROJECT"
    echo -e "${GREEN}✓ Security rules deployed${NC}"
else
    echo -e "${YELLOW}⚠️  firestore.rules not found, skipping...${NC}"
fi
cd functions

# Step 8: Deploy Firestore indexes
echo ""
echo -e "${YELLOW}📊 Deploying Firestore indexes...${NC}"
cd ..
if [ -f "firestore.indexes.json" ]; then
    firebase deploy --only firestore:indexes --project "$STAGING_PROJECT"
    echo -e "${GREEN}✓ Firestore indexes deployed${NC}"
else
    echo -e "${YELLOW}⚠️  firestore.indexes.json not found, skipping...${NC}"
fi
cd functions

# Step 9: Deploy Cloud Functions
echo ""
echo -e "${YELLOW}☁️  Deploying Cloud Functions...${NC}"
firebase deploy --only functions --project "$STAGING_PROJECT"
echo -e "${GREEN}✓ Cloud Functions deployed${NC}"

# Step 10: Post-deployment verification
echo ""
echo -e "${YELLOW}✅ Verifying deployment...${NC}"

# Wait a few seconds for functions to be fully deployed
sleep 5

# Test health endpoint
HEALTH_URL="https://us-central1-${STAGING_PROJECT}.cloudfunctions.net/api/health"
echo -e "${BLUE}Testing health endpoint: $HEALTH_URL${NC}"

if curl -f -s "$HEALTH_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Health check passed${NC}"

    # Display health check response
    echo ""
    echo -e "${BLUE}Health check response:${NC}"
    curl -s "$HEALTH_URL" | python3 -m json.tool || curl -s "$HEALTH_URL"
else
    echo -e "${RED}❌ Health check failed. Please check Cloud Functions logs:${NC}"
    echo -e "${YELLOW}firebase functions:log --project $STAGING_PROJECT${NC}"
    exit 1
fi

# Step 11: Display deployment summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✨ Staging deployment complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${BLUE}Deployed to: ${STAGING_PROJECT}${NC}"
echo -e "${BLUE}API Base URL: https://us-central1-${STAGING_PROJECT}.cloudfunctions.net/api${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Run smoke tests: npm run test:smoke"
echo -e "2. Test API endpoints manually"
echo -e "3. Check Firebase Console: https://console.firebase.google.com/project/${STAGING_PROJECT}"
echo -e "4. View logs: firebase functions:log --project ${STAGING_PROJECT}"
echo ""
echo -e "${GREEN}Happy testing! 🎉${NC}"
