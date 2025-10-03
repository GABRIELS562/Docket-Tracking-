# Database Migrations - SAPS RFID Platform

Complete PostgreSQL + TimescaleDB schema migrations for the SAPS RFID Evidence Tracking Platform.

## Overview

This directory contains all database migration files that create the complete schema for tracking evidence dockets using RFID technology in a forensic laboratory environment.

## Migration Files

### 001_create_zones.sql
- Creates the `zones` table for physical locations in the laboratory
- Defines `zone_type_enum` (storage, lab, office, corridor, entrance)
- Includes capacity constraints and hierarchical zone support
- Adds indexes for efficient zone lookups

**Key Features:**
- Zone capacity tracking with automatic validation
- Parent-child zone relationships for hierarchical organization
- Automatic `updated_at` timestamp tracking

### 002_create_readers.sql
- Creates the `readers` table for RFID reader devices
- Defines `reader_status` enum (online, offline, error, connecting)
- Stores reader configuration as JSONB
- Links readers to zones

**Key Features:**
- IPv4 and IPv6 address validation
- Flexible JSONB configuration for reader-specific settings
- Status tracking with last_seen_at timestamps
- Error message logging

### 003_create_dockets.sql
- Creates the `dockets` table for evidence items
- Defines `docket_status` enum (active, archived, missing)
- Enables full-text and fuzzy search capabilities
- Links dockets to current zones

**Key Features:**
- Lab number format validation: `FSL-YYYY-NNNNNN`
- RFID tag EPC validation (24 hex characters)
- Full-text search on case references
- Trigram fuzzy search for typo tolerance
- JSONB metadata for flexible evidence attributes

### 004_create_location_history_hypertable.sql
- Creates TimescaleDB hypertable for high-volume time-series data
- Stores every RFID tag read event with metadata
- Implements automatic data compression and retention

**Key Features:**
- **Hypertable Partitioning:** 1-week chunks for optimal performance
- **Compression Policy:** Compress data older than 7 days
- **Retention Policy:** Auto-delete data older than 1 year
- RSSI and confidence score tracking
- Foreign key relationships to dockets, readers, and zones

### 005_create_indexes.sql
- Additional performance indexes across all tables
- Partial indexes for common query patterns
- Expression indexes for calculated fields

**Key Features:**
- Zone occupancy percentage index
- Docket staleness detection
- Reader health monitoring
- Recent activity tracking (last 24 hours, last 7 days)
- Low confidence read detection

### 006_create_continuous_aggregates.sql
- TimescaleDB continuous aggregates for real-time analytics
- Pre-computed statistics updated automatically

**Materialized Views:**
1. **zone_activity_hourly** - Hourly zone statistics
2. **docket_activity_daily** - Daily docket movement patterns
3. **reader_performance_hourly** - Reader performance metrics
4. **system_metrics_hourly** - System-wide KPIs

**Key Features:**
- Automatic refresh policies
- Optimized indexes on aggregated data
- Low-latency analytics queries

### seed-dev-data.sql
- Development and testing seed data
- Sample zones, readers, dockets, and location history

**Includes:**
- 8 zones (storage, labs, corridors)
- 8 RFID readers
- 10 sample dockets with various evidence types
- 6000+ location history records spanning 7 days
- Movement history showing docket transitions

## Prerequisites

### Required Software
- **PostgreSQL** 14+ (15+ recommended)
- **TimescaleDB** 2.11+ extension
- **pg_trgm** extension (for fuzzy search)

### Installation

#### Ubuntu/Debian
```bash
# PostgreSQL
sudo apt-get install postgresql-15 postgresql-contrib-15

# TimescaleDB
sudo add-apt-repository ppa:timescale/timescaledb-ppa
sudo apt-get update
sudo apt-get install timescaledb-2-postgresql-15

# Enable TimescaleDB
sudo timescaledb-tune
sudo systemctl restart postgresql
```

#### macOS (Homebrew)
```bash
# PostgreSQL
brew install postgresql@15

# TimescaleDB
brew tap timescale/tap
brew install timescaledb

# Enable TimescaleDB
timescaledb-tune
brew services restart postgresql@15
```

#### Docker
```bash
docker run -d --name saps-timescaledb \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=saps_rfid \
  timescale/timescaledb:latest-pg15
```

## Running Migrations

### Option 1: Using psql (Manual)

```bash
# Set connection details
export PGHOST=localhost
export PGPORT=5432
export PGUSER=postgres
export PGPASSWORD=your_password
export PGDATABASE=saps_rfid

# Create database
psql -c "CREATE DATABASE saps_rfid;"

# Run migrations in order
psql -f 001_create_zones.sql
psql -f 002_create_readers.sql
psql -f 003_create_dockets.sql
psql -f 004_create_location_history_hypertable.sql
psql -f 005_create_indexes.sql
psql -f 006_create_continuous_aggregates.sql

# Load seed data (development only)
psql -f seed-dev-data.sql
```

### Option 2: Using the Migration Script

```bash
# Make script executable
chmod +x run-migrations.sh

# Run all migrations
./run-migrations.sh

# Run with seed data
./run-migrations.sh --seed
```

### Option 3: Using Node.js Migration Tool

```bash
# Install dependencies
npm install

# Run migrations
npm run migrate:up

# Run with seed data
npm run migrate:seed
```

## Database Schema Overview

```
┌─────────────────┐
│     zones       │
│─────────────────│
│ zone_id (PK)    │──┐
│ zone_name       │  │
│ zone_type       │  │
│ capacity        │  │
│ parent_zone_id  │──┘
└─────────────────┘
        │
        │ 1:N
        ↓
┌─────────────────┐         ┌──────────────────────┐
│    readers      │         │      dockets         │
│─────────────────│         │──────────────────────│
│ reader_id (PK)  │──┐      │ lab_number (PK)      │──┐
│ reader_name     │  │      │ case_reference       │  │
│ ip_address      │  │      │ rfid_tag_epc (UQ)    │  │
│ zone_id (FK)    │──┘      │ current_zone_id (FK) │──┘
│ status          │         │ status               │
│ configuration   │         │ metadata             │
└─────────────────┘         └──────────────────────┘
        │                            │
        │                            │
        └────────┬───────────────────┘
                 │ N:N
                 ↓
┌──────────────────────────────────┐
│  docket_location_history         │
│  (TimescaleDB Hypertable)        │
│──────────────────────────────────│
│ timestamp (PK part)              │
│ lab_number (FK)                  │
│ reader_id (FK)                   │
│ zone_id (FK)                     │
│ rssi                             │
│ confidence_score                 │
└──────────────────────────────────┘
                 │
                 │ Continuous Aggregates
                 ↓
┌────────────────────────────────────────┐
│ • zone_activity_hourly                 │
│ • docket_activity_daily                │
│ • reader_performance_hourly            │
│ • system_metrics_hourly                │
└────────────────────────────────────────┘
```

## Key Constraints

### Zones
- `valid_capacity`: Capacity must be > 0
- `valid_occupancy`: Occupancy must be between 0 and capacity

### Readers
- `valid_ip_address`: Must be valid IPv4 or IPv6 format

### Dockets
- `valid_lab_number`: Must match format `FSL-\d{4}-\d{6}`
- `valid_epc`: Must be exactly 24 hexadecimal characters

### Location History
- `valid_rssi`: RSSI must be between -100 and 0 dBm
- `valid_antenna`: Antenna port must be 1-16
- `valid_confidence`: Confidence score must be 0.0-1.0

## Performance Characteristics

### Expected Load
- **Location History Inserts:** 100,000+ reads/day
- **Query Response Time:** <100ms for recent queries
- **Aggregate Queries:** <1s for hourly/daily analytics

### Optimization Features
1. **TimescaleDB Chunking:** Automatic time-based partitioning
2. **Compression:** 7-day compression policy (up to 90% space savings)
3. **Continuous Aggregates:** Pre-computed analytics
4. **Partial Indexes:** Filter-specific indexes for common queries
5. **GIN Indexes:** Fast full-text and JSONB searches

## Monitoring Queries

### Check Hypertable Status
```sql
SELECT * FROM timescaledb_information.hypertables;
```

### Check Compression Status
```sql
SELECT
  chunk_schema,
  chunk_name,
  pg_size_pretty(before_compression_total_bytes) AS before,
  pg_size_pretty(after_compression_total_bytes) AS after,
  ROUND(100 - (after_compression_total_bytes::NUMERIC / before_compression_total_bytes * 100), 2) AS compression_ratio
FROM timescaledb_information.compressed_chunk_stats
ORDER BY chunk_name;
```

### Check Continuous Aggregate Refresh Status
```sql
SELECT
  view_name,
  materialization_hypertable,
  completed_threshold,
  invalidation_threshold
FROM timescaledb_information.continuous_aggregates;
```

### Database Size
```sql
SELECT
  pg_size_pretty(pg_database_size('saps_rfid')) AS total_size,
  pg_size_pretty(pg_total_relation_size('docket_location_history')) AS location_history_size;
```

## Maintenance

### Manual Compression
```sql
-- Compress all chunks older than 7 days
SELECT compress_chunk(i, if_not_compressed => true)
FROM show_chunks('docket_location_history', older_than => INTERVAL '7 days') i;
```

### Manual Refresh Aggregates
```sql
-- Refresh specific aggregate
CALL refresh_continuous_aggregate('zone_activity_hourly', NULL, NULL);
```

### Vacuum and Analyze
```bash
# Run weekly
psql -c "VACUUM ANALYZE;"

# Or per table
psql -c "VACUUM ANALYZE zones;"
psql -c "VACUUM ANALYZE docket_location_history;"
```

## Rollback

To rollback migrations, run in reverse order:

```sql
DROP MATERIALIZED VIEW IF EXISTS system_metrics_hourly CASCADE;
DROP MATERIALIZED VIEW IF EXISTS reader_performance_hourly CASCADE;
DROP MATERIALIZED VIEW IF EXISTS docket_activity_daily CASCADE;
DROP MATERIALIZED VIEW IF EXISTS zone_activity_hourly CASCADE;

DROP TABLE IF EXISTS docket_location_history CASCADE;
DROP TABLE IF EXISTS dockets CASCADE;
DROP TABLE IF EXISTS readers CASCADE;
DROP TABLE IF EXISTS zones CASCADE;

DROP TYPE IF EXISTS docket_status CASCADE;
DROP TYPE IF EXISTS reader_status CASCADE;
DROP TYPE IF EXISTS zone_type_enum CASCADE;

DROP EXTENSION IF EXISTS pg_trgm;
DROP EXTENSION IF EXISTS timescaledb;
```

## Troubleshooting

### TimescaleDB Extension Not Found
```sql
-- Check if TimescaleDB is installed
SELECT * FROM pg_available_extensions WHERE name = 'timescaledb';

-- If not, install it
CREATE EXTENSION timescaledb;
```

### Permission Errors
```sql
-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE saps_rfid TO your_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

### Slow Queries
```sql
-- Enable query logging
ALTER DATABASE saps_rfid SET log_min_duration_statement = 100;

-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Production Deployment

### Checklist
- [ ] Backup existing database
- [ ] Test migrations in staging environment
- [ ] Schedule maintenance window
- [ ] Run migrations during low-traffic period
- [ ] Verify data integrity after migration
- [ ] Monitor performance for 24-48 hours
- [ ] Update application connection strings if needed

### Backup Before Migration
```bash
pg_dump -Fc saps_rfid > backup_$(date +%Y%m%d_%H%M%S).dump
```

### Restore from Backup
```bash
pg_restore -d saps_rfid backup_20240101_120000.dump
```

## Support

For issues or questions:
- Check TimescaleDB docs: https://docs.timescale.com
- PostgreSQL docs: https://www.postgresql.org/docs/
- Project repository: [Your GitHub URL]

## License

[Your License]
