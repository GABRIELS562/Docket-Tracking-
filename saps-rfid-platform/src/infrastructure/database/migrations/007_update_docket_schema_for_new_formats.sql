-- ============================================================================
-- Migration: 007_update_docket_schema_for_new_formats
-- Description: Update dockets table to support new lab number and case number formats
--              Lab Number: NNNNNN/YY (e.g., 12345/25)
--              Case Number: DD/NN/YY (e.g., 25/34/25)
-- ============================================================================

BEGIN;

-- Drop old constraint on lab_number if it exists
ALTER TABLE dockets DROP CONSTRAINT IF EXISTS valid_lab_number;

-- Add new constraint for lab number format: NNNNNN/YY
ALTER TABLE dockets ADD CONSTRAINT valid_lab_number
  CHECK (lab_number ~ '^\d{1,6}/\d{2}$');

-- If case_number column doesn't exist (for older schemas), add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dockets' AND column_name = 'case_number'
  ) THEN
    -- Add case_number column
    ALTER TABLE dockets ADD COLUMN case_number VARCHAR(20) NOT NULL DEFAULT '1/1/25';

    -- Remove the default after adding (we just needed it to add the NOT NULL column)
    ALTER TABLE dockets ALTER COLUMN case_number DROP DEFAULT;
  END IF;
END $$;

-- Add constraint for case_number format: DD/NN/YY
ALTER TABLE dockets DROP CONSTRAINT IF EXISTS valid_case_number;
ALTER TABLE dockets ADD CONSTRAINT valid_case_number
  CHECK (case_number ~ '^\d{1,2}/\d{1,3}/\d{2}$');

-- Update comments
COMMENT ON COLUMN dockets.lab_number IS 'Lab number format: NNNNNN/YY (e.g., 12345/25 for lab 12345 in year 2025)';
COMMENT ON COLUMN dockets.case_number IS 'CAS number format: DD/NN/YY (e.g., 25/34/25 for day 25, case 34, year 2025)';

-- Create index on case_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_dockets_case_number ON dockets(case_number);

-- Full-text search on case_number
CREATE INDEX IF NOT EXISTS idx_dockets_case_number_gin
  ON dockets USING gin(to_tsvector('english', case_number));

-- Combined search index on lab_number and case_number
CREATE INDEX IF NOT EXISTS idx_dockets_lab_case_search
  ON dockets USING gin(
    to_tsvector('english', lab_number || ' ' || case_number)
  );

COMMIT;

-- Rollback script (keep this commented, use if you need to rollback)
/*
BEGIN;

-- Remove new indexes
DROP INDEX IF EXISTS idx_dockets_lab_case_search;
DROP INDEX IF EXISTS idx_dockets_case_number_gin;
DROP INDEX IF EXISTS idx_dockets_case_number;

-- Restore old constraint (if needed)
ALTER TABLE dockets DROP CONSTRAINT IF EXISTS valid_lab_number;
ALTER TABLE dockets ADD CONSTRAINT valid_lab_number
  CHECK (lab_number ~ '^FSL-\d{4}-\d{6}$');

-- Note: Cannot easily drop case_number column if it has data
-- Consider data migration strategy before rollback

COMMIT;
*/
