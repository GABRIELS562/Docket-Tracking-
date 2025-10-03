-- ============================================================================
-- Migration: 001_create_zones
-- Description: Create zones table for tracking physical locations
-- ============================================================================

-- Create zone_type enum
CREATE TYPE zone_type_enum AS ENUM ('storage', 'lab', 'office', 'corridor', 'entrance');

-- Create zones table
CREATE TABLE IF NOT EXISTS zones (
  zone_id INTEGER PRIMARY KEY,
  zone_name VARCHAR(255) NOT NULL,
  zone_type zone_type_enum NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1000,
  current_occupancy INTEGER NOT NULL DEFAULT 0,
  parent_zone_id INTEGER REFERENCES zones(zone_id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_capacity CHECK (capacity > 0),
  CONSTRAINT valid_occupancy CHECK (current_occupancy >= 0 AND current_occupancy <= capacity)
);

-- Add indexes for zone lookups
CREATE INDEX idx_zones_type ON zones(zone_type);
CREATE INDEX idx_zones_parent ON zones(parent_zone_id) WHERE parent_zone_id IS NOT NULL;
CREATE INDEX idx_zones_occupancy ON zones(current_occupancy) WHERE current_occupancy > 0;

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_zones_updated_at
  BEFORE UPDATE ON zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE zones IS 'Physical zones in the forensic laboratory';
COMMENT ON COLUMN zones.zone_type IS 'Type of zone: storage, lab, office, corridor, entrance';
COMMENT ON COLUMN zones.capacity IS 'Maximum number of dockets the zone can hold';
COMMENT ON COLUMN zones.current_occupancy IS 'Current number of dockets in the zone';
COMMENT ON COLUMN zones.parent_zone_id IS 'Parent zone for hierarchical organization';
