-- ============================================================================
-- Migration: 003_create_dockets
-- Description: Create dockets (evidence items) table
-- ============================================================================

-- Create docket_status enum
CREATE TYPE docket_status AS ENUM ('active', 'archived', 'missing');

-- Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create dockets table
CREATE TABLE IF NOT EXISTS dockets (
  lab_number VARCHAR(50) PRIMARY KEY,
  case_reference VARCHAR(500) NOT NULL,
  rfid_tag_epc VARCHAR(24) NOT NULL UNIQUE,
  current_zone_id INTEGER REFERENCES zones(zone_id) ON DELETE SET NULL,
  status docket_status NOT NULL DEFAULT 'active',
  last_seen_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}',

  CONSTRAINT valid_lab_number CHECK (lab_number ~ '^FSL-\d{4}-\d{6}$'),
  CONSTRAINT valid_epc CHECK (LENGTH(rfid_tag_epc) = 24 AND rfid_tag_epc ~ '^[0-9A-Fa-f]{24}$')
);

-- Add indexes for common queries
CREATE INDEX idx_dockets_epc ON dockets(rfid_tag_epc);
CREATE INDEX idx_dockets_zone ON dockets(current_zone_id) WHERE current_zone_id IS NOT NULL;
CREATE INDEX idx_dockets_status ON dockets(status);
CREATE INDEX idx_dockets_last_seen ON dockets(last_seen_at) WHERE last_seen_at IS NOT NULL;
CREATE INDEX idx_dockets_created ON dockets(created_at);

-- Full-text search on case_reference
CREATE INDEX idx_dockets_case_reference_gin ON dockets USING gin(to_tsvector('english', case_reference));

-- Trigram index for fuzzy search on case_reference
CREATE INDEX idx_dockets_case_reference_trigram ON dockets USING gin(case_reference gin_trgm_ops);

-- Composite index for common query pattern
CREATE INDEX idx_dockets_zone_status ON dockets(current_zone_id, status) WHERE current_zone_id IS NOT NULL;

-- Index for finding stale dockets
CREATE INDEX idx_dockets_stale ON dockets(last_seen_at) WHERE status = 'active' AND last_seen_at IS NOT NULL;

-- JSONB index for metadata queries
CREATE INDEX idx_dockets_metadata ON dockets USING gin(metadata);

-- Add trigger
CREATE TRIGGER update_dockets_updated_at
  BEFORE UPDATE ON dockets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE dockets IS 'Evidence dockets tracked in the system';
COMMENT ON COLUMN dockets.lab_number IS 'Unique lab number format: FSL-YYYY-NNNNNN';
COMMENT ON COLUMN dockets.rfid_tag_epc IS 'RFID tag EPC (24 hex characters)';
COMMENT ON COLUMN dockets.case_reference IS 'Case reference/description for searching';
COMMENT ON COLUMN dockets.metadata IS 'Additional metadata (evidence type, etc.)';
