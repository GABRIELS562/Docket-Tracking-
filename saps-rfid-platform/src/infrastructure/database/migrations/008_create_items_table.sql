-- ============================================================================
-- Migration: 008_create_items_table
-- Description: Create generic items table (replacing forensic-specific dockets)
-- Part of Phase 0: Genericization
-- ============================================================================

-- Create item_status enum (generic status values)
DO $$ BEGIN
  CREATE TYPE item_status AS ENUM (
    'registered',
    'in_transit',
    'in_processing',
    'archived',
    'disposed',
    'missing'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create item_category enum (generic categories)
DO $$ BEGIN
  CREATE TYPE item_category AS ENUM (
    'equipment',
    'consumable',
    'electronic',
    'document',
    'material',
    'tool',
    'apparel',
    'container',
    'sample',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create items table
CREATE TABLE IF NOT EXISTS items (
  -- Primary identifier (UUID)
  id VARCHAR(36) PRIMARY KEY,

  -- Item identification
  item_number VARCHAR(50) NOT NULL UNIQUE,
  rfid_tag_epc VARCHAR(24) NOT NULL UNIQUE,

  -- Reference to external systems (flexible)
  reference_id VARCHAR(100) NOT NULL DEFAULT 'N/A',
  serial_number VARCHAR(100),

  -- Description and classification
  description TEXT NOT NULL,
  category item_category NOT NULL DEFAULT 'other',

  -- Current location tracking
  current_zone_id VARCHAR(36) REFERENCES zones(id) ON DELETE SET NULL,
  last_seen_at TIMESTAMPTZ,
  last_seen_reader_id VARCHAR(36) REFERENCES readers(id) ON DELETE SET NULL,
  location_confidence DECIMAL(3,2) CHECK (location_confidence IS NULL OR (location_confidence >= 0 AND location_confidence <= 1)),

  -- Status and lifecycle
  status item_status NOT NULL DEFAULT 'registered',
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Chain of custody
  received_by VARCHAR(100),
  received_at TIMESTAMPTZ,
  handled_by VARCHAR(100),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Flexible metadata for tenant-specific fields
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Constraints
  CONSTRAINT valid_item_number CHECK (
    LENGTH(item_number) >= 1 AND
    LENGTH(item_number) <= 50 AND
    item_number ~ '^[A-Za-z0-9][A-Za-z0-9\-\/_]*$'
  ),
  CONSTRAINT valid_epc CHECK (
    LENGTH(rfid_tag_epc) = 24 AND
    rfid_tag_epc ~ '^[0-9A-Fa-f]{24}$'
  )
);

-- ============================================================================
-- Primary Indexes
-- ============================================================================

-- Unique identifiers
CREATE INDEX IF NOT EXISTS idx_items_item_number ON items(item_number);
CREATE INDEX IF NOT EXISTS idx_items_epc ON items(rfid_tag_epc);

-- Status and lifecycle
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_is_active ON items(is_active) WHERE is_active = true;

-- Location tracking
CREATE INDEX IF NOT EXISTS idx_items_zone ON items(current_zone_id) WHERE current_zone_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_last_seen ON items(last_seen_at DESC) WHERE last_seen_at IS NOT NULL;

-- Temporal queries
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_updated_at ON items(updated_at DESC);

-- ============================================================================
-- Search Indexes
-- ============================================================================

-- Full-text search on description
CREATE INDEX IF NOT EXISTS idx_items_description_fts
  ON items USING gin(to_tsvector('english', description));

-- Full-text search on multiple fields
CREATE INDEX IF NOT EXISTS idx_items_search_combined
  ON items USING gin(to_tsvector('english', item_number || ' ' || reference_id || ' ' || description));

-- Trigram index for fuzzy search on description
CREATE INDEX IF NOT EXISTS idx_items_description_trigram
  ON items USING gin(description gin_trgm_ops);

-- Reference ID search
CREATE INDEX IF NOT EXISTS idx_items_reference_id ON items(reference_id) WHERE reference_id != 'N/A';

-- Category filter
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);

-- ============================================================================
-- Composite Indexes for Common Query Patterns
-- ============================================================================

-- Zone + status queries (dashboard)
CREATE INDEX IF NOT EXISTS idx_items_zone_status
  ON items(current_zone_id, status)
  WHERE current_zone_id IS NOT NULL;

-- Active items by zone
CREATE INDEX IF NOT EXISTS idx_items_zone_active
  ON items(current_zone_id, status)
  WHERE current_zone_id IS NOT NULL AND is_active = true;

-- Find stale items (not seen recently)
CREATE INDEX IF NOT EXISTS idx_items_stale
  ON items(last_seen_at)
  WHERE status IN ('registered', 'in_transit', 'in_processing')
    AND is_active = true
    AND last_seen_at IS NOT NULL;

-- Find missing items
CREATE INDEX IF NOT EXISTS idx_items_missing
  ON items(status, last_seen_at)
  WHERE status = 'missing';

-- Recent activity (7 days)
CREATE INDEX IF NOT EXISTS idx_items_recent_activity
  ON items(last_seen_at DESC, status)
  WHERE last_seen_at > NOW() - INTERVAL '7 days';

-- Items by creation date (for reporting)
CREATE INDEX IF NOT EXISTS idx_items_created_date
  ON items(DATE(created_at), status);

-- JSONB metadata queries
CREATE INDEX IF NOT EXISTS idx_items_metadata
  ON items USING gin(metadata);

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_items_updated_at ON items;
CREATE TRIGGER trigger_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_items_updated_at();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE items IS 'Generic items table for RFID inventory tracking (multi-tenant SaaS)';
COMMENT ON COLUMN items.id IS 'Primary key (UUID format)';
COMMENT ON COLUMN items.item_number IS 'Unique item identifier (flexible format, 1-50 chars)';
COMMENT ON COLUMN items.rfid_tag_epc IS 'RFID tag EPC (24 hex characters)';
COMMENT ON COLUMN items.reference_id IS 'External reference (order number, project code, etc.)';
COMMENT ON COLUMN items.serial_number IS 'Manufacturer serial number (optional)';
COMMENT ON COLUMN items.description IS 'Human-readable item description';
COMMENT ON COLUMN items.category IS 'Item classification category';
COMMENT ON COLUMN items.current_zone_id IS 'Current location zone (FK to zones)';
COMMENT ON COLUMN items.last_seen_at IS 'Last RFID detection timestamp';
COMMENT ON COLUMN items.last_seen_reader_id IS 'Reader that last detected item';
COMMENT ON COLUMN items.location_confidence IS 'Confidence score 0.0-1.0';
COMMENT ON COLUMN items.status IS 'Lifecycle status';
COMMENT ON COLUMN items.is_active IS 'Soft delete flag';
COMMENT ON COLUMN items.received_by IS 'Who received the item';
COMMENT ON COLUMN items.received_at IS 'When item was received';
COMMENT ON COLUMN items.handled_by IS 'Current handler (for in_processing status)';
COMMENT ON COLUMN items.metadata IS 'Flexible tenant-specific data (JSONB)';
