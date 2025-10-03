-- ============================================================================
-- Migration: 004_create_location_history_hypertable
-- Description: Create TimescaleDB hypertable for location history (time-series data)
-- ============================================================================

-- Enable TimescaleDB extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create location history table
CREATE TABLE IF NOT EXISTS docket_location_history (
  timestamp TIMESTAMP NOT NULL,
  lab_number VARCHAR(50) NOT NULL,
  rfid_tag_epc VARCHAR(24) NOT NULL,
  reader_id VARCHAR(50) NOT NULL,
  zone_id INTEGER NOT NULL,
  rssi INTEGER NOT NULL,
  antenna_port INTEGER NOT NULL,
  confidence_score NUMERIC(3,2) NOT NULL DEFAULT 0.5,

  CONSTRAINT fk_docket FOREIGN KEY (lab_number) REFERENCES dockets(lab_number) ON DELETE CASCADE,
  CONSTRAINT fk_reader FOREIGN KEY (reader_id) REFERENCES readers(reader_id) ON DELETE CASCADE,
  CONSTRAINT fk_zone FOREIGN KEY (zone_id) REFERENCES zones(zone_id) ON DELETE CASCADE,
  CONSTRAINT valid_rssi CHECK (rssi >= -100 AND rssi <= 0),
  CONSTRAINT valid_antenna CHECK (antenna_port >= 1 AND antenna_port <= 16),
  CONSTRAINT valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

-- Convert to hypertable (time-series partitioning)
-- Chunk by 1 week intervals
SELECT create_hypertable(
  'docket_location_history',
  'timestamp',
  chunk_time_interval => INTERVAL '1 week',
  if_not_exists => TRUE
);

-- Add indexes optimized for time-series queries
CREATE INDEX idx_location_history_lab_number_time
  ON docket_location_history (lab_number, timestamp DESC);

CREATE INDEX idx_location_history_zone_time
  ON docket_location_history (zone_id, timestamp DESC);

CREATE INDEX idx_location_history_reader_time
  ON docket_location_history (reader_id, timestamp DESC);

CREATE INDEX idx_location_history_epc_time
  ON docket_location_history (rfid_tag_epc, timestamp DESC);

-- Index for recent activity queries
CREATE INDEX idx_location_history_recent
  ON docket_location_history (timestamp DESC)
  WHERE timestamp > NOW() - INTERVAL '24 hours';

-- Compression policy (compress data older than 7 days)
ALTER TABLE docket_location_history SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'lab_number, zone_id, reader_id',
  timescaledb.compress_orderby = 'timestamp DESC'
);

SELECT add_compression_policy(
  'docket_location_history',
  INTERVAL '7 days',
  if_not_exists => TRUE
);

-- Retention policy (drop data older than 1 year)
SELECT add_retention_policy(
  'docket_location_history',
  INTERVAL '1 year',
  if_not_exists => TRUE
);

-- Comments
COMMENT ON TABLE docket_location_history IS 'Time-series history of docket locations tracked by RFID readers';
COMMENT ON COLUMN docket_location_history.timestamp IS 'Time when the RFID tag was read';
COMMENT ON COLUMN docket_location_history.rssi IS 'Received Signal Strength Indicator in dBm (-100 to 0)';
COMMENT ON COLUMN docket_location_history.confidence_score IS 'Location confidence based on RSSI and other factors (0-1)';
COMMENT ON COLUMN docket_location_history.antenna_port IS 'Antenna port number that detected the tag (1-16)';
