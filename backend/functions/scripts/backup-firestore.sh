#!/bin/bash
# Firestore Backup Script
# Creates automated backups of Firestore data to Cloud Storage
# Run: ./scripts/backup-firestore.sh [staging|production]

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/${TIMESTAMP}"

# Determine environment
ENVIRONMENT="${1:-staging}"

if [ "$ENVIRONMENT" = "production" ]; then
    PROJECT_ID="litplan-production"
    BUCKET="gs://litplan-backups"
elif [ "$ENVIRONMENT" = "staging" ]; then
    PROJECT_ID="litplan-staging"
    BUCKET="gs://litplan-staging-backups"
else
    echo -e "${RED}❌ Invalid environment. Use: staging or production${NC}"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}💾 Firestore Backup Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
echo -e "${YELLOW}Project: $PROJECT_ID${NC}"
echo -e "${YELLOW}Timestamp: $TIMESTAMP${NC}"
echo ""

# Check if gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI not installed${NC}"
    echo -e "${YELLOW}Install from: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

# Set the project
echo -e "${YELLOW}🔧 Setting gcloud project...${NC}"
gcloud config set project "$PROJECT_ID"
echo -e "${GREEN}✓ Project set to: $PROJECT_ID${NC}"

# Check if bucket exists
echo ""
echo -e "${YELLOW}📦 Checking if backup bucket exists...${NC}"
if gsutil ls "$BUCKET" &> /dev/null; then
    echo -e "${GREEN}✓ Backup bucket exists${NC}"
else
    echo -e "${YELLOW}⚠️  Bucket does not exist. Creating...${NC}"
    gsutil mb -p "$PROJECT_ID" -l us-central1 "$BUCKET"
    echo -e "${GREEN}✓ Bucket created${NC}"
fi

# Create backup
echo ""
echo -e "${YELLOW}💾 Starting Firestore export...${NC}"
echo -e "${BLUE}Backup location: ${BUCKET}/${BACKUP_DIR}${NC}"

BACKUP_PATH="${BUCKET}/${BACKUP_DIR}"

# Export Firestore data
if gcloud firestore export "$BACKUP_PATH" --async; then
    echo -e "${GREEN}✓ Firestore backup initiated${NC}"
    echo ""
    echo -e "${BLUE}Backup is running in the background${NC}"
    echo -e "${BLUE}Monitor progress in Cloud Console:${NC}"
    echo -e "${BLUE}https://console.cloud.google.com/firestore/import-export?project=${PROJECT_ID}${NC}"
else
    echo -e "${RED}❌ Backup failed${NC}"
    exit 1
fi

# List recent backups
echo ""
echo -e "${YELLOW}📋 Recent backups:${NC}"
gsutil ls "${BUCKET}/backups/" | tail -5 || echo "No previous backups found"

# Backup metadata
echo ""
echo -e "${YELLOW}📝 Saving backup metadata...${NC}"

METADATA_FILE="/tmp/backup-${TIMESTAMP}.json"
cat > "$METADATA_FILE" << EOF
{
  "timestamp": "$TIMESTAMP",
  "environment": "$ENVIRONMENT",
  "project": "$PROJECT_ID",
  "backupPath": "$BACKUP_PATH",
  "initiatedBy": "$(whoami)",
  "initiatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "in_progress"
}
EOF

gsutil cp "$METADATA_FILE" "${BACKUP_PATH}/metadata.json"
rm "$METADATA_FILE"

echo -e "${GREEN}✓ Metadata saved${NC}"

# Display summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✨ Backup initiated successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Backup details:${NC}"
echo -e "  Environment: $ENVIRONMENT"
echo -e "  Project: $PROJECT_ID"
echo -e "  Timestamp: $TIMESTAMP"
echo -e "  Location: $BACKUP_PATH"
echo ""
echo -e "${YELLOW}To restore from this backup:${NC}"
echo -e "  gcloud firestore import $BACKUP_PATH --project=$PROJECT_ID"
echo ""
echo -e "${YELLOW}To monitor backup progress:${NC}"
echo -e "  gcloud firestore operations list --project=$PROJECT_ID"
echo ""
echo -e "${GREEN}Backup complete! 🎉${NC}"
