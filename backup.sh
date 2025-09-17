#!/bin/bash

# LevelUp Backup Script
# Run daily via cron job or manually before major changes

# Configuration
BACKUP_DIR="$HOME/levelup-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SUPABASE_PROJECT_ID="exxildftqhnlupxdlqfn"  # Your project ID
RETENTION_DAYS=30  # Keep backups for 30 days

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Starting LevelUp Backup...${NC}"
echo "Timestamp: $TIMESTAMP"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# 1. Backup Database Schema and Data
echo -e "\n${YELLOW}📊 Backing up database...${NC}"

# Use Supabase CLI to dump database
if command -v supabase &> /dev/null; then
    supabase db dump \
        --project-ref $SUPABASE_PROJECT_ID \
        -f "$BACKUP_DIR/database_${TIMESTAMP}.sql"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database backed up successfully${NC}"
    else
        echo -e "${RED}❌ Database backup failed${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Supabase CLI not found. Install with: brew install supabase/tap/supabase${NC}"
fi

# 2. Backup Environment Variables
echo -e "\n${YELLOW}🔐 Backing up environment configuration...${NC}"

if [ -f .env.local ]; then
    cp .env.local "$BACKUP_DIR/env_${TIMESTAMP}.txt"
    echo -e "${GREEN}✅ Environment variables backed up${NC}"
else
    echo -e "${YELLOW}⚠️  No .env.local found${NC}"
fi

# 3. Export Critical Application Data
echo -e "\n${YELLOW}📝 Exporting application data...${NC}"

# Create a data export via API (if your server is running)
if curl -s http://localhost:3000 > /dev/null; then
    # Export chapters list
    curl -s http://localhost:3000/api/chapters > "$BACKUP_DIR/chapters_${TIMESTAMP}.json"
    echo -e "${GREEN}✅ Chapters exported${NC}"
else
    echo -e "${YELLOW}⚠️  Server not running, skipping API exports${NC}"
fi

# 4. Create backup manifest
echo -e "\n${YELLOW}📋 Creating backup manifest...${NC}"

cat > "$BACKUP_DIR/manifest_${TIMESTAMP}.txt" << EOF
LevelUp Backup Manifest
========================
Date: $(date)
Timestamp: $TIMESTAMP
Project ID: $SUPABASE_PROJECT_ID
Git Branch: $(git branch --show-current)
Last Commit: $(git log -1 --oneline)

Files Included:
- database_${TIMESTAMP}.sql (Database dump)
- env_${TIMESTAMP}.txt (Environment variables)
- chapters_${TIMESTAMP}.json (Chapters data)

Restore Instructions:
1. Database: supabase db restore database_${TIMESTAMP}.sql
2. Environment: cp env_${TIMESTAMP}.txt .env.local
3. Verify: npm run dev && npm test
EOF

echo -e "${GREEN}✅ Manifest created${NC}"

# 5. Compress backup
echo -e "\n${YELLOW}🗜️  Compressing backup...${NC}"

cd "$BACKUP_DIR"
tar -czf "levelup_backup_${TIMESTAMP}.tar.gz" \
    "database_${TIMESTAMP}.sql" \
    "env_${TIMESTAMP}.txt" \
    "chapters_${TIMESTAMP}.json" \
    "manifest_${TIMESTAMP}.txt" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup compressed${NC}"

    # Remove uncompressed files
    rm -f "database_${TIMESTAMP}.sql" \
          "env_${TIMESTAMP}.txt" \
          "chapters_${TIMESTAMP}.json" \
          "manifest_${TIMESTAMP}.txt"
fi

# 6. Clean old backups
echo -e "\n${YELLOW}🧹 Cleaning old backups (>$RETENTION_DAYS days)...${NC}"

find "$BACKUP_DIR" -name "levelup_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
REMAINING=$(ls -1 "$BACKUP_DIR"/levelup_backup_*.tar.gz 2>/dev/null | wc -l)

echo -e "${GREEN}✅ Cleanup complete. $REMAINING backups retained${NC}"

# 7. Upload to cloud (optional)
if [ "$1" == "--cloud" ]; then
    echo -e "\n${YELLOW}☁️  Uploading to cloud storage...${NC}"

    # Example: Upload to Google Drive using rclone
    if command -v rclone &> /dev/null; then
        rclone copy "$BACKUP_DIR/levelup_backup_${TIMESTAMP}.tar.gz" gdrive:levelup-backups/
        echo -e "${GREEN}✅ Uploaded to Google Drive${NC}"
    else
        echo -e "${YELLOW}⚠️  rclone not installed. Install: brew install rclone${NC}"
    fi
fi

# Summary
echo -e "\n${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Backup Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "Location: $BACKUP_DIR/levelup_backup_${TIMESTAMP}.tar.gz"
echo -e "Size: $(du -h "$BACKUP_DIR/levelup_backup_${TIMESTAMP}.tar.gz" | cut -f1)"
echo -e "\nTo restore from this backup:"
echo -e "  tar -xzf $BACKUP_DIR/levelup_backup_${TIMESTAMP}.tar.gz"
echo -e "  cat manifest_${TIMESTAMP}.txt"