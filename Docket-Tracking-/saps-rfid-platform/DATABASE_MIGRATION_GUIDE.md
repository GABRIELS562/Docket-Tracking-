# Database Migration Guide

## Lab Number and Case Number Format Update

This guide explains how to migrate your existing docket data from the old formats to the new formats.

### Format Changes

**Lab Number:**
- **Old Format:** `FSL-YYYY-NNNNNN` (e.g., `FSL-2025-000123`)
- **New Format:** `NNNNNN/YY` (e.g., `12345/25`)

**Case Number:**
- **New Field:** `DD/NN/YY` (e.g., `25/34/25`)
- Format: Day/CaseNumber/Year

### Migration Steps

#### 1. Run the Schema Migration

```bash
# Navigate to the migrations directory
cd saps-rfid-platform/src/infrastructure/database/migrations/

# Run the migration
psql -U your_username -d your_database -f 007_update_docket_schema_for_new_formats.sql
```

#### 2. Migrate Existing Data (if applicable)

If you have existing data in the old `FSL-YYYY-NNNNNN` format, you need to convert it to the new format.

**Option A: Automatic Conversion Script**

```sql
-- This script converts FSL-2025-000123 to 123/25 format
-- WARNING: Backup your database before running this!

BEGIN;

-- Update lab_number from FSL-YYYY-NNNNNN to NNNNNN/YY
UPDATE dockets
SET lab_number = (
  -- Extract the sequence number (remove leading zeros)
  CAST(CAST(SUBSTRING(lab_number FROM 11 FOR 6) AS INTEGER) AS VARCHAR)
  || '/'
  -- Extract last 2 digits of year
  || SUBSTRING(lab_number FROM 6 FOR 2)
)
WHERE lab_number ~ '^FSL-\d{4}-\d{6}$';

-- Set a default case_number if it doesn't exist
-- You should update this based on your actual case numbers
UPDATE dockets
SET case_number = '1/1/' || SUBSTRING(lab_number FROM POSITION('/' IN lab_number) + 1 FOR 2)
WHERE case_number IS NULL OR case_number = '';

COMMIT;
```

**Option B: Manual Migration via CSV**

1. Export existing data:
```sql
COPY (
  SELECT
    lab_number,
    CAST(CAST(SUBSTRING(lab_number FROM 11 FOR 6) AS INTEGER) AS VARCHAR)
      || '/' || SUBSTRING(lab_number FROM 6 FOR 2) as new_lab_number,
    case_reference,
    rfid_tag_epc
  FROM dockets
  WHERE lab_number ~ '^FSL-\d{4}-\d{6}$'
) TO '/tmp/dockets_migration.csv' WITH CSV HEADER;
```

2. Review and update the CSV file with correct case numbers

3. Import updated data:
```sql
-- Create temporary table
CREATE TEMP TABLE docket_migration (
  old_lab_number VARCHAR(50),
  new_lab_number VARCHAR(20),
  case_number VARCHAR(20),
  rfid_tag_epc VARCHAR(24)
);

-- Import CSV
COPY docket_migration FROM '/tmp/dockets_migration_updated.csv' WITH CSV HEADER;

-- Update dockets
UPDATE dockets d
SET
  lab_number = dm.new_lab_number,
  case_number = dm.case_number
FROM docket_migration dm
WHERE d.rfid_tag_epc = dm.rfid_tag_epc;

-- Clean up
DROP TABLE docket_migration;
```

#### 3. Verify Migration

```sql
-- Check for any invalid lab numbers
SELECT lab_number, case_number
FROM dockets
WHERE NOT (lab_number ~ '^\d{1,6}/\d{2}$');

-- Check for any invalid case numbers
SELECT lab_number, case_number
FROM dockets
WHERE NOT (case_number ~ '^\d{1,2}/\d{1,3}/\d{2}$');

-- Count migrated records
SELECT
  COUNT(*) as total_dockets,
  COUNT(CASE WHEN lab_number ~ '^\d{1,6}/\d{2}$' THEN 1 END) as valid_lab_numbers,
  COUNT(CASE WHEN case_number ~ '^\d{1,2}/\d{1,3}/\d{2}$' THEN 1 END) as valid_case_numbers
FROM dockets;
```

#### 4. Update Application Configuration

After database migration, restart your application servers to pick up the new schema:

```bash
# If using Docker
docker-compose restart app

# If using PM2
pm2 restart saps-rfid-app

# If running directly
# Stop and start your Node.js application
```

### Rollback Procedure

If you need to rollback the migration:

```sql
-- See the rollback script in 007_update_docket_schema_for_new_formats.sql
-- WARNING: This will fail if you have data in the new format
```

### QR Code Integration

After migration, dockets can be registered using QR codes containing:

**QR Code Format Options:**

1. **JSON Format:**
```json
{
  "labNumber": "12345/25",
  "caseNumber": "25/34/25"
}
```

2. **Pipe-Separated:**
```
12345/25|25/34/25
```

3. **Comma-Separated:**
```
12345/25,25/34/25
```

### Testing

1. Test single docket registration via UI
2. Test QR code scanning
3. Test bulk import feature
4. Verify RFID tag tracking works with new formats
5. Check reporting and analytics dashboards

### Support

For issues or questions:
- Check application logs: `docker logs saps-rfid-app`
- Database logs: `docker logs saps-rfid-postgres`
- Submit issues to the development team

## Migration Checklist

- [ ] Backup database
- [ ] Run schema migration (007_update_docket_schema_for_new_formats.sql)
- [ ] Convert existing lab numbers (if applicable)
- [ ] Add case numbers to existing records
- [ ] Verify data integrity
- [ ] Test QR code scanning
- [ ] Test bulk import
- [ ] Update documentation
- [ ] Train users on new formats
- [ ] Restart application services

## Important Notes

1. **Always backup your database** before running migrations
2. Test migrations in a development/staging environment first
3. The new format is more concise and easier to read
4. QR codes simplify the registration process
5. Bulk import reduces manual data entry errors
6. Case numbers provide better tracking granularity
