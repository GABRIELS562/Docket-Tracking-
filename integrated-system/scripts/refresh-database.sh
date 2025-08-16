#!/bin/bash

# Database Refresh Script
# Drops and recreates the database with fresh schema and data

echo "🔄 Database Refresh Script"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database configuration
DB_NAME="rfid_tracking"
DB_USER="user"
DB_HOST="localhost"
DB_PORT="5432"

echo -e "${YELLOW}⚠️  WARNING: This will DROP and RECREATE the database!${NC}"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}❌ Database refresh cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}📦 Step 1: Dropping existing database...${NC}"
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -c "DROP DATABASE IF EXISTS $DB_NAME;" postgres 2>/dev/null || {
    echo -e "${YELLOW}Note: Database may not exist or may be in use${NC}"
}

echo -e "${GREEN}✅ Database dropped (if it existed)${NC}"

echo ""
echo -e "${YELLOW}📦 Step 2: Creating fresh database...${NC}"
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -c "CREATE DATABASE $DB_NAME;" postgres || {
    echo -e "${RED}❌ Failed to create database${NC}"
    exit 1
}
echo -e "${GREEN}✅ Database created${NC}"

echo ""
echo -e "${YELLOW}📦 Step 3: Creating UUID extension...${NC}"
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" || {
    echo -e "${RED}❌ Failed to create UUID extension${NC}"
    exit 1
}
echo -e "${GREEN}✅ UUID extension created${NC}"

echo ""
echo -e "${YELLOW}📦 Step 4: Running initial schema migration...${NC}"
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -f src/database/migrations/001_initial_schema.sql 2>&1 | grep -E "ERROR|NOTICE" | head -20 || true
echo -e "${GREEN}✅ Schema created${NC}"

echo ""
echo -e "${YELLOW}📦 Step 5: Loading seed data...${NC}"
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -f src/database/migrations/002_seed_data.sql 2>&1 | grep -E "ERROR|INSERT" | head -20 || true
echo -e "${GREEN}✅ Seed data loaded${NC}"

echo ""
echo -e "${YELLOW}📦 Step 6: Verifying database...${NC}"
echo "Tables created:"
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "\dt" | head -20

echo ""
echo "Record counts:"
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "
SELECT 
    'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL
SELECT 'dockets', COUNT(*) FROM dockets
UNION ALL
SELECT 'storage_boxes', COUNT(*) FROM storage_boxes
UNION ALL
SELECT 'storage_zones', COUNT(*) FROM storage_zones
UNION ALL
SELECT 'rfid_readers', COUNT(*) FROM rfid_readers
ORDER BY table_name;
"

echo ""
echo -e "${GREEN}✅ Database refresh complete!${NC}"
echo ""
echo "Default credentials:"
echo "  Admin: admin@govstorageservices.gov.za / admin123"
echo "  Manager: manager@govstorageservices.gov.za / manager123"
echo ""
echo "You can now restart your application servers."