#!/bin/bash
# Production Deployment Script for Litplan Backend
# This script includes safety measures, confirmations, backups, and rollback capabilities

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_PROJECT="litplan-production"
STAGING_PROJECT="litplan-staging"
FUNCTIONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_BUCKET="gs://litplan-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ROLLBACK_SCRIPT="/tmp/litplan-rollback-${TIMESTAMP}.sh"

echo -e "${MAGENTA}========================================${NC}"
echo -e "${MAGENTA}🚀 Litplan Production Deployment${NC}"
echo -e "${MAGENTA}========================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "$FUNCTIONS_DIR/package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Are you in the functions directory?${NC}"
    exit 1
fi

cd "$FUNCTIONS_DIR"

# Step 1: Pre-deployment safety checks
echo -e "${YELLOW}🛡️  Running pre-deployment safety checks...${NC}"

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

# Check if gcloud CLI is installed (for backups)
if ! command -v gcloud &> /dev/null; then
    echo -e "${YELLOW}⚠️  Warning: gcloud CLI not installed. Backups will be skipped.${NC}"
    echo -e "${YELLOW}Install from: https://cloud.google.com/sdk/docs/install${NC}"
    SKIP_BACKUP=true
else
    echo -e "${GREEN}✓ gcloud CLI installed${NC}"
    SKIP_BACKUP=false
fi

# Check if git repo is clean
if [ -d .git ]; then
    if ! git diff-index --quiet HEAD --; then
        echo -e "${RED}❌ Error: Git repository has uncommitted changes.${NC}"
        echo -e "${YELLOW}Please commit or stash your changes before deploying to production.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Git repository is clean${NC}"

    # Get current git commit
    GIT_COMMIT=$(git rev-parse --short HEAD)
    echo -e "${BLUE}Current commit: $GIT_COMMIT${NC}"
fi

# Step 2: Confirmation prompt
echo ""
echo -e "${RED}⚠️  WARNING: You are about to deploy to PRODUCTION${NC}"
echo -e "${BLUE}Project: $PRODUCTION_PROJECT${NC}"
echo -e "${BLUE}Timestamp: $TIMESTAMP${NC}"
echo ""
read -p "$(echo -e ${YELLOW}Are you sure you want to continue? [yes/no]: ${NC})" -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled.${NC}"
    exit 0
fi

# Step 3: Create backup of Firestore data
if [ "$SKIP_BACKUP" = false ]; then
    echo ""
    echo -e "${YELLOW}💾 Creating Firestore backup...${NC}"

    # Switch to production project for gcloud
    gcloud config set project "$PRODUCTION_PROJECT" 2>/dev/null || true

    # Export Firestore data
    BACKUP_PATH="${BACKUP_BUCKET}/backups/${TIMESTAMP}"
    echo -e "${BLUE}Backup location: $BACKUP_PATH${NC}"

    if gcloud firestore export "$BACKUP_PATH" --async 2>/dev/null; then
        echo -e "${GREEN}✓ Firestore backup initiated${NC}"
        echo -e "${BLUE}Backup will continue in background${NC}"
    else
        echo -e "${YELLOW}⚠️  Backup failed or not supported. Continuing anyway...${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping backup (gcloud not installed)${NC}"
fi

# Step 4: Install dependencies
echo ""
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm ci --production=false
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 5: Run linter
echo ""
echo -e "${YELLOW}🔍 Running linter...${NC}"
npm run lint
echo -e "${GREEN}✓ Linting passed${NC}"

# Step 6: Build TypeScript
echo ""
echo -e "${YELLOW}🔨 Building TypeScript...${NC}"
npm run build
echo -e "${GREEN}✓ Build successful${NC}"

# Step 7: Run tests (when implemented)
# echo ""
# echo -e "${YELLOW}🧪 Running tests...${NC}"
# npm test
# if [ $? -ne 0 ]; then
#     echo -e "${RED}❌ Tests failed. Deployment cancelled.${NC}"
#     exit 1
# fi
# echo -e "${GREEN}✓ Tests passed${NC}"

# Step 8: Switch to production project
echo ""
echo -e "${YELLOW}🔧 Switching to production project...${NC}"
firebase use production 2>/dev/null || firebase use "$PRODUCTION_PROJECT"
CURRENT_PROJECT=$(firebase use 2>&1 | grep -o "Active Project:.*" | cut -d' ' -f3 || echo "")
echo -e "${GREEN}✓ Using project: $CURRENT_PROJECT${NC}"

# Step 9: Generate rollback script
echo ""
echo -e "${YELLOW}📝 Generating rollback script...${NC}"

cat > "$ROLLBACK_SCRIPT" << 'EOF'
#!/bin/bash
# Rollback script generated during production deployment
# This script can be used to revert to the previous deployment

set -e

PRODUCTION_PROJECT="litplan-production"

echo "🔄 Rolling back to previous deployment..."

# Get the previous functions deployment
PREVIOUS_VERSION=$(gcloud functions list --project="$PRODUCTION_PROJECT" --format="value(versionId)" --limit=2 | tail -n 1)

if [ -z "$PREVIOUS_VERSION" ]; then
    echo "❌ No previous version found"
    exit 1
fi

echo "Rolling back to version: $PREVIOUS_VERSION"

# Note: Firebase doesn't support direct rollback
# You need to redeploy the previous version from git

echo ""
echo "⚠️  Manual rollback required:"
echo "1. Check out previous commit: git checkout <previous-commit>"
echo "2. Run deployment: ./scripts/deploy-production.sh"
echo ""
echo "To restore Firestore data from backup:"
echo "gcloud firestore import gs://litplan-backups/backups/<backup-timestamp> --project=$PRODUCTION_PROJECT"

EOF

chmod +x "$ROLLBACK_SCRIPT"
echo -e "${GREEN}✓ Rollback script created: $ROLLBACK_SCRIPT${NC}"

# Step 10: Deploy Firestore security rules
echo ""
echo -e "${YELLOW}🔒 Deploying Firestore security rules...${NC}"
cd ..
if [ -f "firestore.rules" ]; then
    firebase deploy --only firestore:rules --project "$PRODUCTION_PROJECT"
    echo -e "${GREEN}✓ Security rules deployed${NC}"
else
    echo -e "${YELLOW}⚠️  firestore.rules not found, skipping...${NC}"
fi
cd functions

# Step 11: Deploy Firestore indexes
echo ""
echo -e "${YELLOW}📊 Deploying Firestore indexes...${NC}"
cd ..
if [ -f "firestore.indexes.json" ]; then
    firebase deploy --only firestore:indexes --project "$PRODUCTION_PROJECT"
    echo -e "${GREEN}✓ Firestore indexes deployed${NC}"
else
    echo -e "${YELLOW}⚠️  firestore.indexes.json not found, skipping...${NC}"
fi
cd functions

# Step 12: Deploy Cloud Functions with gradual rollout
echo ""
echo -e "${YELLOW}☁️  Deploying Cloud Functions...${NC}"
echo -e "${BLUE}Deployment strategy: Direct (no traffic splitting available in Firebase)${NC}"

# Deploy all functions
firebase deploy --only functions --project "$PRODUCTION_PROJECT"
echo -e "${GREEN}✓ Cloud Functions deployed${NC}"

# Note: Firebase Cloud Functions doesn't support traffic splitting
# Traffic switching happens automatically upon successful deployment

# Step 13: Post-deployment smoke tests
echo ""
echo -e "${YELLOW}🧪 Running post-deployment smoke tests...${NC}"

# Wait for functions to be fully deployed
sleep 10

HEALTH_URL="https://us-central1-${PRODUCTION_PROJECT}.cloudfunctions.net/api/health"
echo -e "${BLUE}Testing health endpoint: $HEALTH_URL${NC}"

if curl -f -s "$HEALTH_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Health check passed${NC}"

    # Display health check response
    echo ""
    echo -e "${BLUE}Health check response:${NC}"
    curl -s "$HEALTH_URL" | python3 -m json.tool || curl -s "$HEALTH_URL"
else
    echo -e "${RED}❌ Health check failed!${NC}"
    echo -e "${RED}CRITICAL: Production deployment may have issues${NC}"
    echo ""
    echo -e "${YELLOW}Rollback instructions:${NC}"
    echo -e "1. Review logs: firebase functions:log --project $PRODUCTION_PROJECT"
    echo -e "2. Use rollback script: $ROLLBACK_SCRIPT"
    exit 1
fi

# Test critical endpoints
echo ""
echo -e "${YELLOW}Testing critical endpoints...${NC}"

# Test cities endpoint
CITIES_URL="https://us-central1-${PRODUCTION_PROJECT}.cloudfunctions.net/api/cities"
if curl -f -s "$CITIES_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Cities endpoint responding${NC}"
else
    echo -e "${YELLOW}⚠️  Cities endpoint failed (may be expected if no data)${NC}"
fi

# Step 14: Send notification (placeholder)
echo ""
echo -e "${YELLOW}📧 Sending deployment notification...${NC}"

# Placeholder for Slack/email notification
# You can add Slack webhook or email notification here
echo -e "${BLUE}Notification would be sent here (not implemented)${NC}"

# Step 15: Display deployment summary
echo ""
echo -e "${MAGENTA}========================================${NC}"
echo -e "${GREEN}✨ Production deployment complete!${NC}"
echo -e "${MAGENTA}========================================${NC}"
echo ""
echo -e "${BLUE}Project: ${PRODUCTION_PROJECT}${NC}"
echo -e "${BLUE}Deployment time: ${TIMESTAMP}${NC}"
if [ -n "${GIT_COMMIT:-}" ]; then
    echo -e "${BLUE}Git commit: ${GIT_COMMIT}${NC}"
fi
echo -e "${BLUE}API Base URL: https://us-central1-${PRODUCTION_PROJECT}.cloudfunctions.net/api${NC}"
echo ""
echo -e "${YELLOW}Important files:${NC}"
echo -e "  Rollback script: $ROLLBACK_SCRIPT"
if [ "$SKIP_BACKUP" = false ]; then
    echo -e "  Firestore backup: $BACKUP_PATH"
fi
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Monitor Cloud Functions: https://console.firebase.google.com/project/${PRODUCTION_PROJECT}/functions"
echo -e "2. Check error rates: firebase functions:log --project ${PRODUCTION_PROJECT}"
echo -e "3. Monitor API performance and error rates"
echo -e "4. Notify team about deployment"
echo ""
echo -e "${GREEN}Deployment successful! 🎉${NC}"
