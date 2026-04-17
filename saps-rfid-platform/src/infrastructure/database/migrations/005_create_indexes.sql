-- ============================================================================
-- Migration: 005_create_indexes
-- Description: Additional performance indexes and optimizations
-- ============================================================================

-- ============================================================================
-- Zone Indexes
-- ============================================================================

-- Find over-capacity zones quickly
CREATE INDEX idx_zones_occupancy_percentage
  ON zones((current_occupancy::float / NULLIF(capacity, 0)))
  WHERE current_occupancy > 0 AND capacity > 0;

-- Find zones by type and capacity
CREATE INDEX idx_zones_type_capacity
  ON zones(zone_type, capacity)
  WHERE capacity > 0;

-- ============================================================================
-- Reader Indexes
-- ============================================================================

-- Find readers by zone and status
CREATE INDEX idx_readers_zone_status
  ON readers(zone_id, status);

-- Find stale/problematic readers
CREATE INDEX idx_readers_health
  ON readers(status, last_seen_at)
  WHERE status IN ('offline', 'error');

-- ============================================================================
-- Docket Indexes
-- ============================================================================

-- Composite index for zone + status queries
CREATE INDEX idx_dockets_zone_status_active
  ON dockets(current_zone_id, status)
  WHERE current_zone_id IS NOT NULL AND status = 'active';

-- Find missing dockets
CREATE INDEX idx_dockets_missing
  ON dockets(status, last_seen_at)
  WHERE status = 'missing';

-- Recent docket activity
CREATE INDEX idx_dockets_recent_activity
  ON dockets(last_seen_at DESC, status)
  WHERE last_seen_at > NOW() - INTERVAL '7 days';

-- Dockets by creation date (for reporting)
CREATE INDEX idx_dockets_created_date
  ON dockets(DATE(created_at), status);

-- ============================================================================
-- Location History Indexes
-- ============================================================================

-- Find all reads for a specific tag in time range
CREATE INDEX idx_location_history_epc_timestamp
  ON docket_location_history(rfid_tag_epc, timestamp DESC);

-- Zone activity over time
CREATE INDEX idx_location_history_zone_timestamp
  ON docket_location_history(zone_id, timestamp DESC);

-- Reader performance analysis
CREATE INDEX idx_location_history_reader_timestamp
  ON docket_location_history(reader_id, timestamp DESC);

-- Recent reads (last hour) for deduplication
CREATE INDEX idx_location_history_recent_hour
  ON docket_location_history(timestamp DESC, lab_number, reader_id)
  WHERE timestamp > NOW() - INTERVAL '1 hour';

-- Low confidence reads
CREATE INDEX idx_location_history_low_confidence
  ON docket_location_history(confidence_score, timestamp DESC)
  WHERE confidence_score < 0.5;

-- ============================================================================
-- Performance Comments
-- ============================================================================

COMMENT ON INDEX idx_zones_occupancy_percentage IS 'Find zones approaching capacity';
COMMENT ON INDEX idx_readers_health IS 'Quickly identify problematic readers';
COMMENT ON INDEX idx_dockets_zone_status_active IS 'Optimize active docket queries by zone';
COMMENT ON INDEX idx_location_history_recent_hour IS 'Deduplication and recent activity queries';
