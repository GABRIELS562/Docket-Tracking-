-- ============================================================================
-- Migration: 002_create_readers
-- Description: Create RFID readers table
-- ============================================================================

-- Create reader_status enum
CREATE TYPE reader_status AS ENUM ('online', 'offline', 'error', 'connecting');

-- Create readers table
CREATE TABLE IF NOT EXISTS readers (
  reader_id VARCHAR(50) PRIMARY KEY,
  reader_name VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL UNIQUE,  -- Supports IPv4 and IPv6
  zone_id INTEGER NOT NULL REFERENCES zones(zone_id) ON DELETE RESTRICT,
  status reader_status NOT NULL DEFAULT 'offline',
  last_seen_at TIMESTAMP,
  configuration JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_ip_address CHECK (
    ip_address ~ '^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$' OR  -- IPv4
    ip_address ~ '^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$'  -- IPv6 (simplified)
  )
);

-- Add indexes
CREATE INDEX idx_readers_zone ON readers(zone_id);
CREATE INDEX idx_readers_status ON readers(status);
CREATE INDEX idx_readers_last_seen ON readers(last_seen_at) WHERE last_seen_at IS NOT NULL;
CREATE INDEX idx_readers_offline ON readers(status, last_seen_at) WHERE status != 'online';

-- Add trigger
CREATE TRIGGER update_readers_updated_at
  BEFORE UPDATE ON readers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE readers IS 'RFID readers deployed in the laboratory';
COMMENT ON COLUMN readers.reader_id IS 'Unique reader identifier (usually from device)';
COMMENT ON COLUMN readers.configuration IS 'Reader configuration (transmit power, antennas, etc.)';
COMMENT ON COLUMN readers.last_seen_at IS 'Last time reader sent data';
COMMENT ON COLUMN readers.status IS 'Current reader status: online, offline, error, connecting';
