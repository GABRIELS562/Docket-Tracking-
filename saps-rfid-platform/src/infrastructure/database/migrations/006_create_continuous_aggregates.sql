-- ============================================================================
-- Migration: 006_create_continuous_aggregates
-- Description: Create TimescaleDB continuous aggregates for analytics
-- ============================================================================

-- ============================================================================
-- Continuous Aggregate: Hourly Zone Activity
-- ============================================================================

CREATE MATERIALIZED VIEW zone_activity_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', timestamp) AS hour,
  zone_id,
  COUNT(*) AS read_count,
  COUNT(DISTINCT lab_number) AS unique_dockets,
  AVG(rssi) AS avg_rssi,
  MIN(rssi) AS min_rssi,
  MAX(rssi) AS max_rssi,
  AVG(confidence_score) AS avg_confidence,
  COUNT(DISTINCT reader_id) AS active_readers
FROM docket_location_history
GROUP BY hour, zone_id
WITH NO DATA;

-- Refresh policy: Refresh every hour for data between 3 hours and 1 hour ago
SELECT add_continuous_aggregate_policy(
  'zone_activity_hourly',
  start_offset => INTERVAL '3 hours',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists => TRUE
);

-- Add indexes for faster querying
CREATE INDEX idx_zone_activity_hourly_zone_hour
  ON zone_activity_hourly(zone_id, hour DESC);

CREATE INDEX idx_zone_activity_hourly_hour
  ON zone_activity_hourly(hour DESC);

-- ============================================================================
-- Continuous Aggregate: Daily Docket Activity
-- ============================================================================

CREATE MATERIALIZED VIEW docket_activity_daily
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', timestamp) AS day,
  lab_number,
  COUNT(*) AS read_count,
  COUNT(DISTINCT zone_id) AS zones_visited,
  COUNT(DISTINCT reader_id) AS readers_encountered,
  MIN(timestamp) AS first_seen,
  MAX(timestamp) AS last_seen,
  AVG(rssi) AS avg_rssi,
  AVG(confidence_score) AS avg_confidence
FROM docket_location_history
GROUP BY day, lab_number
WITH NO DATA;

-- Refresh policy: Refresh daily for data between 3 days and 1 day ago
SELECT add_continuous_aggregate_policy(
  'docket_activity_daily',
  start_offset => INTERVAL '3 days',
  end_offset => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Add indexes
CREATE INDEX idx_docket_activity_daily_lab_day
  ON docket_activity_daily(lab_number, day DESC);

CREATE INDEX idx_docket_activity_daily_day
  ON docket_activity_daily(day DESC);

-- ============================================================================
-- Continuous Aggregate: Reader Performance (Hourly)
-- ============================================================================

CREATE MATERIALIZED VIEW reader_performance_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', timestamp) AS hour,
  reader_id,
  zone_id,
  COUNT(*) AS total_reads,
  COUNT(DISTINCT lab_number) AS unique_dockets_read,
  COUNT(DISTINCT rfid_tag_epc) AS unique_tags_read,
  AVG(rssi) AS avg_rssi,
  MIN(rssi) AS min_rssi,
  MAX(rssi) AS max_rssi,
  AVG(confidence_score) AS avg_confidence,
  COUNT(*) FILTER (WHERE confidence_score < 0.5) AS low_confidence_reads
FROM docket_location_history
GROUP BY hour, reader_id, zone_id
WITH NO DATA;

-- Refresh policy
SELECT add_continuous_aggregate_policy(
  'reader_performance_hourly',
  start_offset => INTERVAL '3 hours',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists => TRUE
);

-- Add indexes
CREATE INDEX idx_reader_performance_hourly_reader_hour
  ON reader_performance_hourly(reader_id, hour DESC);

CREATE INDEX idx_reader_performance_hourly_zone_hour
  ON reader_performance_hourly(zone_id, hour DESC);

-- ============================================================================
-- Continuous Aggregate: System-wide Metrics (Hourly)
-- ============================================================================

CREATE MATERIALIZED VIEW system_metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', timestamp) AS hour,
  COUNT(*) AS total_reads,
  COUNT(DISTINCT lab_number) AS active_dockets,
  COUNT(DISTINCT zone_id) AS active_zones,
  COUNT(DISTINCT reader_id) AS active_readers,
  AVG(rssi) AS avg_rssi,
  AVG(confidence_score) AS avg_confidence,
  COUNT(*) FILTER (WHERE confidence_score < 0.5) AS low_confidence_reads,
  COUNT(*) FILTER (WHERE confidence_score >= 0.8) AS high_confidence_reads
FROM docket_location_history
GROUP BY hour
WITH NO DATA;

-- Refresh policy
SELECT add_continuous_aggregate_policy(
  'system_metrics_hourly',
  start_offset => INTERVAL '3 hours',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists => TRUE
);

-- Add index
CREATE INDEX idx_system_metrics_hourly_hour
  ON system_metrics_hourly(hour DESC);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON MATERIALIZED VIEW zone_activity_hourly IS 'Aggregated zone activity by hour for analytics';
COMMENT ON MATERIALIZED VIEW docket_activity_daily IS 'Aggregated docket movement and activity by day';
COMMENT ON MATERIALIZED VIEW reader_performance_hourly IS 'Reader performance metrics aggregated hourly';
COMMENT ON MATERIALIZED VIEW system_metrics_hourly IS 'System-wide performance metrics aggregated hourly';
