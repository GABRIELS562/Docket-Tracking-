-- =====================================================
-- Mobile Support Tables
-- For mobile field operations and device management
-- =====================================================

-- Mobile devices table
CREATE TABLE IF NOT EXISTS mobile_devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    device_info JSONB,
    push_token TEXT,
    platform VARCHAR(20), -- ios, android
    app_version VARCHAR(20),
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- User departments junction table (for mobile task assignment)
CREATE TABLE IF NOT EXISTS user_departments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    role VARCHAR(50),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, department_id)
);

-- Mobile sync tracking
CREATE TABLE IF NOT EXISTS mobile_sync_log (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) REFERENCES mobile_devices(device_id),
    user_id INTEGER REFERENCES users(id),
    sync_type VARCHAR(50), -- full, partial, tasks, scans
    records_sent INTEGER DEFAULT 0,
    records_received INTEGER DEFAULT 0,
    sync_started TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_completed TIMESTAMP,
    sync_status VARCHAR(20), -- pending, success, failed
    error_message TEXT,
    data_size_kb INTEGER
);

-- Offline action queue
CREATE TABLE IF NOT EXISTS offline_actions (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255),
    user_id INTEGER REFERENCES users(id),
    action_type VARCHAR(50),
    action_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT
);

-- Mobile notifications
CREATE TABLE IF NOT EXISTS mobile_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    device_id VARCHAR(255),
    title VARCHAR(255),
    message TEXT,
    data JSONB,
    notification_type VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'normal',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered BOOLEAN DEFAULT FALSE,
    delivered_at TIMESTAMP,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mobile_devices_user ON mobile_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_devices_active ON mobile_devices(is_active, last_seen);
CREATE INDEX IF NOT EXISTS idx_user_departments_user ON user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_dept ON user_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_mobile_sync_device ON mobile_sync_log(device_id, sync_completed);
CREATE INDEX IF NOT EXISTS idx_offline_actions_sync ON offline_actions(synced, device_id);
CREATE INDEX IF NOT EXISTS idx_mobile_notifications_user ON mobile_notifications(user_id, read);

-- Grant permissions
GRANT ALL ON mobile_devices TO PUBLIC;
GRANT ALL ON user_departments TO PUBLIC;
GRANT ALL ON mobile_sync_log TO PUBLIC;
GRANT ALL ON offline_actions TO PUBLIC;
GRANT ALL ON mobile_notifications TO PUBLIC;