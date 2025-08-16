-- Phase 5: RFID Integration & Hardware Management Schema
-- Standalone implementation for RFID hardware integration

-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- RFID Readers table
CREATE TABLE IF NOT EXISTS rfid_readers (
    id SERIAL PRIMARY KEY,
    reader_id VARCHAR(50) UNIQUE NOT NULL,
    reader_name VARCHAR(255) NOT NULL,
    reader_type VARCHAR(50) DEFAULT 'FX9600',
    ip_address INET NOT NULL,
    port INTEGER NOT NULL DEFAULT 14150,
    location_id INTEGER,
    zone VARCHAR(100),
    antenna_count INTEGER DEFAULT 4,
    max_power DECIMAL(5,2) DEFAULT 30.0,
    frequency_region VARCHAR(10) DEFAULT 'US',
    status VARCHAR(20) DEFAULT 'offline',
    last_ping TIMESTAMP,
    last_event TIMESTAMP,
    firmware_version VARCHAR(50),
    configuration JSONB DEFAULT '{}'::jsonb,
    health_metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    active BOOLEAN DEFAULT true
);

-- RFID Antennas table (for detailed antenna configuration)
CREATE TABLE IF NOT EXISTS rfid_antennas (
    id SERIAL PRIMARY KEY,
    reader_id VARCHAR(50) REFERENCES rfid_readers(reader_id) ON DELETE CASCADE,
    antenna_number INTEGER NOT NULL,
    antenna_name VARCHAR(100),
    power_level DECIMAL(5,2) DEFAULT 25.0,
    enabled BOOLEAN DEFAULT true,
    polarization VARCHAR(20) DEFAULT 'linear',
    gain DECIMAL(5,2) DEFAULT 6.0,
    coordinates POINT,
    coverage_area POLYGON,
    last_read TIMESTAMP,
    read_count INTEGER DEFAULT 0,
    UNIQUE(reader_id, antenna_number)
);

-- Objects table for RFID tracking
CREATE TABLE IF NOT EXISTS objects (
    id SERIAL PRIMARY KEY,
    object_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    object_type VARCHAR(50) DEFAULT 'docket',
    rfid_tag_id VARCHAR(50) UNIQUE NOT NULL,
    epc_code VARCHAR(96),
    current_location_id INTEGER,
    current_reader_id VARCHAR(50),
    current_antenna INTEGER,
    last_seen TIMESTAMP,
    signal_strength INTEGER,
    read_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Locations table with reader associations
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    location_code VARCHAR(50) UNIQUE NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    description TEXT,
    zone VARCHAR(50),
    building VARCHAR(50),
    floor INTEGER,
    room VARCHAR(50),
    coordinates POINT,
    coverage_area POLYGON,
    reader_id VARCHAR(50),
    security_level VARCHAR(20) DEFAULT 'normal',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- RFID Events table (high-volume real-time events)
CREATE TABLE IF NOT EXISTS rfid_events (
    id BIGSERIAL PRIMARY KEY,
    event_uuid UUID DEFAULT uuid_generate_v4(),
    tag_id VARCHAR(50) NOT NULL,
    epc_code VARCHAR(96),
    reader_id VARCHAR(50) NOT NULL,
    antenna_number INTEGER,
    signal_strength INTEGER,
    phase DECIMAL(8,4),
    frequency INTEGER,
    event_type VARCHAR(20) DEFAULT 'read',
    location_id INTEGER,
    object_id INTEGER,
    timestamp TIMESTAMP DEFAULT NOW(),
    processed BOOLEAN DEFAULT false,
    processing_time INTEGER,
    batch_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- RFID Event Processing Batches
CREATE TABLE IF NOT EXISTS rfid_event_batches (
    id SERIAL PRIMARY KEY,
    batch_uuid UUID DEFAULT uuid_generate_v4(),
    reader_id VARCHAR(50),
    event_count INTEGER DEFAULT 0,
    processed_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    processing_time_ms INTEGER,
    error_details JSONB
);

-- Object Movement History
CREATE TABLE IF NOT EXISTS object_movements (
    id BIGSERIAL PRIMARY KEY,
    object_id INTEGER REFERENCES objects(id) ON DELETE CASCADE,
    from_location_id INTEGER,
    to_location_id INTEGER,
    from_reader_id VARCHAR(50),
    to_reader_id VARCHAR(50),
    movement_type VARCHAR(20), -- 'detected', 'moved', 'lost'
    confidence_score DECIMAL(5,2) DEFAULT 100.0,
    signal_strength INTEGER,
    event_count INTEGER DEFAULT 1,
    timestamp TIMESTAMP DEFAULT NOW(),
    duration_seconds INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Reader Health Monitoring
CREATE TABLE IF NOT EXISTS reader_health_logs (
    id SERIAL PRIMARY KEY,
    reader_id VARCHAR(50) NOT NULL,
    check_timestamp TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20), -- 'online', 'offline', 'warning', 'error'
    response_time_ms INTEGER,
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    temperature DECIMAL(5,2),
    tag_read_rate INTEGER,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    firmware_version VARCHAR(50),
    uptime_seconds BIGINT,
    network_status JSONB,
    antenna_status JSONB
);

-- System Alerts
CREATE TABLE IF NOT EXISTS system_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    source VARCHAR(100), -- 'reader', 'system', 'object', 'network'
    source_id VARCHAR(100),
    reader_id VARCHAR(50),
    object_id INTEGER,
    location_id INTEGER,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMP,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Tag Collision Detection
CREATE TABLE IF NOT EXISTS tag_collisions (
    id SERIAL PRIMARY KEY,
    collision_uuid UUID DEFAULT uuid_generate_v4(),
    reader_id VARCHAR(50) NOT NULL,
    antenna_number INTEGER,
    tag_count INTEGER,
    collision_time TIMESTAMP DEFAULT NOW(),
    duration_ms INTEGER,
    resolved BOOLEAN DEFAULT false,
    resolution_method VARCHAR(50),
    tags_involved TEXT[], -- Array of tag IDs
    signal_strengths INTEGER[],
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_rfid_events_tag_time ON rfid_events(tag_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rfid_events_reader_time ON rfid_events(reader_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rfid_events_processed ON rfid_events(processed, timestamp);
CREATE INDEX IF NOT EXISTS idx_rfid_events_batch ON rfid_events(batch_id);
CREATE INDEX IF NOT EXISTS idx_rfid_events_location ON rfid_events(location_id);

CREATE INDEX IF NOT EXISTS idx_objects_tag_id ON objects(rfid_tag_id);
CREATE INDEX IF NOT EXISTS idx_objects_location ON objects(current_location_id);
CREATE INDEX IF NOT EXISTS idx_objects_reader ON objects(current_reader_id);
CREATE INDEX IF NOT EXISTS idx_objects_last_seen ON objects(last_seen DESC);

CREATE INDEX IF NOT EXISTS idx_readers_status ON rfid_readers(status);
CREATE INDEX IF NOT EXISTS idx_readers_location ON rfid_readers(location_id);

CREATE INDEX IF NOT EXISTS idx_movements_object_time ON object_movements(object_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_movements_location_time ON object_movements(to_location_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_health_logs_reader_time ON reader_health_logs(reader_id, check_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_type_time ON system_alerts(alert_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity_ack ON system_alerts(severity, acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_reader ON system_alerts(reader_id);

-- Partitioning for high-volume events table (by month)
-- Note: This would be implemented in production based on data volume

-- Views for monitoring and analytics
CREATE OR REPLACE VIEW reader_status_summary AS
SELECT 
    r.reader_id,
    r.reader_name,
    r.status,
    r.last_ping,
    r.last_event,
    COALESCE(recent_events.event_count, 0) as events_last_hour,
    COALESCE(recent_events.unique_tags, 0) as unique_tags_last_hour,
    rhl.cpu_usage,
    rhl.memory_usage,
    rhl.temperature,
    rhl.response_time_ms
FROM rfid_readers r
LEFT JOIN (
    SELECT 
        reader_id,
        COUNT(*) as event_count,
        COUNT(DISTINCT tag_id) as unique_tags
    FROM rfid_events 
    WHERE timestamp > NOW() - INTERVAL '1 hour'
    GROUP BY reader_id
) recent_events ON r.reader_id = recent_events.reader_id
LEFT JOIN LATERAL (
    SELECT * FROM reader_health_logs 
    WHERE reader_id = r.reader_id 
    ORDER BY check_timestamp DESC 
    LIMIT 1
) rhl ON true;

CREATE OR REPLACE VIEW object_tracking_summary AS
SELECT 
    o.object_code,
    o.name,
    o.rfid_tag_id,
    o.current_location_id,
    l.location_name,
    o.current_reader_id,
    o.last_seen,
    o.signal_strength,
    o.read_count,
    CASE 
        WHEN o.last_seen > NOW() - INTERVAL '5 minutes' THEN 'active'
        WHEN o.last_seen > NOW() - INTERVAL '1 hour' THEN 'recent'
        WHEN o.last_seen > NOW() - INTERVAL '24 hours' THEN 'stale'
        ELSE 'missing'
    END as tracking_status
FROM objects o
LEFT JOIN locations l ON o.current_location_id = l.id;

-- Functions for real-time processing
CREATE OR REPLACE FUNCTION process_rfid_event(
    p_tag_id VARCHAR(50),
    p_reader_id VARCHAR(50),
    p_antenna INTEGER,
    p_signal_strength INTEGER,
    p_timestamp TIMESTAMP DEFAULT NOW()
) RETURNS BOOLEAN AS $$
DECLARE
    v_object_id INTEGER;
    v_current_location INTEGER;
    v_new_location INTEGER;
    v_movement_detected BOOLEAN := false;
BEGIN
    -- Find object by tag ID
    SELECT id, current_location_id 
    INTO v_object_id, v_current_location
    FROM objects 
    WHERE rfid_tag_id = p_tag_id;
    
    IF v_object_id IS NULL THEN
        -- Log unknown tag
        INSERT INTO system_alerts (alert_type, severity, title, message, source, source_id)
        VALUES ('unknown_tag', 'medium', 'Unknown RFID Tag Detected', 
                'Tag ' || p_tag_id || ' detected by reader ' || p_reader_id, 
                'reader', p_reader_id);
        RETURN false;
    END IF;
    
    -- Get location for this reader
    SELECT location_id INTO v_new_location
    FROM rfid_readers 
    WHERE reader_id = p_reader_id;
    
    -- Check if movement occurred
    IF v_current_location IS DISTINCT FROM v_new_location THEN
        v_movement_detected := true;
        
        -- Log movement
        INSERT INTO object_movements (
            object_id, from_location_id, to_location_id, 
            from_reader_id, to_reader_id, movement_type,
            signal_strength, timestamp
        ) VALUES (
            v_object_id, v_current_location, v_new_location,
            (SELECT current_reader_id FROM objects WHERE id = v_object_id),
            p_reader_id, 'moved', p_signal_strength, p_timestamp
        );
    END IF;
    
    -- Update object location and metrics
    UPDATE objects SET
        current_location_id = v_new_location,
        current_reader_id = p_reader_id,
        current_antenna = p_antenna,
        last_seen = p_timestamp,
        signal_strength = p_signal_strength,
        read_count = read_count + 1,
        updated_at = NOW()
    WHERE id = v_object_id;
    
    RETURN v_movement_detected;
END;
$$ LANGUAGE plpgsql;

-- Function to update reader health
CREATE OR REPLACE FUNCTION update_reader_health(
    p_reader_id VARCHAR(50),
    p_status VARCHAR(20),
    p_response_time INTEGER DEFAULT NULL,
    p_metrics JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
BEGIN
    -- Update reader status
    UPDATE rfid_readers SET
        status = p_status,
        last_ping = NOW(),
        health_metrics = p_metrics,
        updated_at = NOW()
    WHERE reader_id = p_reader_id;
    
    -- Log health check
    INSERT INTO reader_health_logs (
        reader_id, status, response_time_ms, 
        cpu_usage, memory_usage, temperature,
        tag_read_rate, network_status, antenna_status
    ) VALUES (
        p_reader_id, p_status, p_response_time,
        (p_metrics->>'cpu_usage')::DECIMAL,
        (p_metrics->>'memory_usage')::DECIMAL,
        (p_metrics->>'temperature')::DECIMAL,
        (p_metrics->>'tag_read_rate')::INTEGER,
        p_metrics->'network',
        p_metrics->'antennas'
    );
    
    -- Create alert if reader went offline
    IF p_status = 'offline' THEN
        INSERT INTO system_alerts (alert_type, severity, title, message, source, source_id, reader_id)
        VALUES ('reader_offline', 'high', 'RFID Reader Offline', 
                'Reader ' || p_reader_id || ' has gone offline', 
                'reader', p_reader_id, p_reader_id);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rfid_readers_updated_at BEFORE UPDATE
    ON rfid_readers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE
    ON objects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing
INSERT INTO rfid_readers (reader_id, reader_name, ip_address, port, zone, status) VALUES
('FX9600-001', 'Main Entrance Reader', '192.168.1.101', 14150, 'Entrance', 'online'),
('FX9600-002', 'Storage Area Reader', '192.168.1.102', 14150, 'Storage', 'online'),
('FX9600-003', 'Lab Equipment Reader', '192.168.1.103', 14150, 'Laboratory', 'online'),
('FX9600-004', 'Archive Room Reader', '192.168.1.104', 14150, 'Archive', 'offline'),
('FX9600-005', 'Processing Area Reader', '192.168.1.105', 14150, 'Processing', 'online'),
('FX9600-006', 'Exit Gate Reader', '192.168.1.106', 14150, 'Exit', 'online');

INSERT INTO locations (location_code, location_name, zone, reader_id) VALUES
('ENT-001', 'Main Entrance', 'Entrance', 'FX9600-001'),
('STOR-001', 'Primary Storage', 'Storage', 'FX9600-002'),
('LAB-001', 'Laboratory Room 1', 'Laboratory', 'FX9600-003'),
('ARCH-001', 'Archive Storage', 'Archive', 'FX9600-004'),
('PROC-001', 'Processing Area', 'Processing', 'FX9600-005'),
('EXIT-001', 'Exit Gate', 'Exit', 'FX9600-006');

INSERT INTO rfid_antennas (reader_id, antenna_number, antenna_name, power_level) VALUES
('FX9600-001', 1, 'North Antenna', 25.0),
('FX9600-001', 2, 'South Antenna', 25.0),
('FX9600-001', 3, 'East Antenna', 20.0),
('FX9600-001', 4, 'West Antenna', 20.0),
('FX9600-002', 1, 'Shelf A Scanner', 30.0),
('FX9600-002', 2, 'Shelf B Scanner', 30.0),
('FX9600-002', 3, 'Shelf C Scanner', 28.0),
('FX9600-002', 4, 'Shelf D Scanner', 28.0);

COMMENT ON TABLE rfid_readers IS 'RFID hardware readers with configuration and status';
COMMENT ON TABLE rfid_events IS 'High-volume real-time RFID tag read events';
COMMENT ON TABLE object_movements IS 'Object movement history and tracking';
COMMENT ON TABLE reader_health_logs IS 'Reader hardware health monitoring data';
COMMENT ON TABLE system_alerts IS 'System alerts and notifications';
COMMENT ON TABLE tag_collisions IS 'RFID tag collision detection and resolution';