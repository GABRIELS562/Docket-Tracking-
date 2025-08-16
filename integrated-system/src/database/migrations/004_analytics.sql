-- =====================================================
-- Advanced Analytics & Reporting Database Schema
-- Real-time metrics and KPI tracking for government operations
-- =====================================================

-- Analytics metrics aggregation table
CREATE TABLE IF NOT EXISTS analytics_metrics (
    id SERIAL PRIMARY KEY,
    metric_date DATE NOT NULL,
    metric_hour INTEGER DEFAULT 0, -- 0-23 for hourly aggregation
    
    -- Docket Metrics
    total_dockets INTEGER DEFAULT 0,
    active_dockets INTEGER DEFAULT 0,
    archived_dockets INTEGER DEFAULT 0,
    retrieved_dockets INTEGER DEFAULT 0,
    new_dockets INTEGER DEFAULT 0,
    
    -- Storage Metrics
    total_storage_boxes INTEGER DEFAULT 0,
    occupied_boxes INTEGER DEFAULT 0,
    available_boxes INTEGER DEFAULT 0,
    storage_utilization DECIMAL(5,2) DEFAULT 0,
    
    -- User Activity Metrics
    active_users INTEGER DEFAULT 0,
    total_logins INTEGER DEFAULT 0,
    unique_sessions INTEGER DEFAULT 0,
    avg_session_duration INTEGER DEFAULT 0, -- in seconds
    
    -- RFID Metrics
    rfid_scans INTEGER DEFAULT 0,
    successful_locates INTEGER DEFAULT 0,
    failed_locates INTEGER DEFAULT 0,
    avg_locate_time INTEGER DEFAULT 0, -- in seconds
    
    -- Performance Metrics
    api_requests INTEGER DEFAULT 0,
    avg_response_time INTEGER DEFAULT 0, -- in milliseconds
    error_rate DECIMAL(5,2) DEFAULT 0,
    system_uptime DECIMAL(5,2) DEFAULT 100,
    
    -- Compliance Metrics
    compliance_score DECIMAL(5,2) DEFAULT 100,
    audit_events INTEGER DEFAULT 0,
    security_incidents INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(metric_date, metric_hour)
);

-- Department-wise analytics
CREATE TABLE IF NOT EXISTS department_analytics (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    
    -- Department Activity
    total_dockets INTEGER DEFAULT 0,
    dockets_created INTEGER DEFAULT 0,
    dockets_retrieved INTEGER DEFAULT 0,
    dockets_archived INTEGER DEFAULT 0,
    
    -- Staff Metrics
    active_staff INTEGER DEFAULT 0,
    total_operations INTEGER DEFAULT 0,
    avg_processing_time INTEGER DEFAULT 0, -- in minutes
    
    -- Efficiency Metrics
    efficiency_score DECIMAL(5,2) DEFAULT 0,
    error_rate DECIMAL(5,2) DEFAULT 0,
    compliance_rate DECIMAL(5,2) DEFAULT 100,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(department_id, metric_date)
);

-- Storage zone analytics
CREATE TABLE IF NOT EXISTS storage_zone_analytics (
    id SERIAL PRIMARY KEY,
    zone_id INTEGER REFERENCES storage_zones(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    
    -- Capacity Metrics
    total_capacity INTEGER DEFAULT 0,
    used_capacity INTEGER DEFAULT 0,
    utilization_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Activity Metrics
    items_added INTEGER DEFAULT 0,
    items_removed INTEGER DEFAULT 0,
    items_moved INTEGER DEFAULT 0,
    
    -- Performance Metrics
    avg_retrieval_time INTEGER DEFAULT 0, -- in minutes
    avg_storage_time INTEGER DEFAULT 0, -- in minutes
    
    -- Temperature & Environment (for climate-controlled zones)
    avg_temperature DECIMAL(5,2),
    avg_humidity DECIMAL(5,2),
    environmental_alerts INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(zone_id, metric_date)
);

-- KPI definitions and targets
CREATE TABLE IF NOT EXISTS kpi_definitions (
    id SERIAL PRIMARY KEY,
    kpi_code VARCHAR(50) UNIQUE NOT NULL,
    kpi_name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- operational, financial, compliance, efficiency
    
    -- Target Values
    target_value DECIMAL(10,2),
    min_threshold DECIMAL(10,2),
    max_threshold DECIMAL(10,2),
    
    -- Measurement
    unit VARCHAR(50), -- percentage, count, minutes, etc.
    calculation_method TEXT,
    data_source VARCHAR(100),
    
    -- Configuration
    is_active BOOLEAN DEFAULT TRUE,
    refresh_frequency VARCHAR(20) DEFAULT 'daily', -- realtime, hourly, daily, weekly, monthly
    alert_enabled BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- KPI tracking and history
CREATE TABLE IF NOT EXISTS kpi_tracking (
    id SERIAL PRIMARY KEY,
    kpi_id INTEGER REFERENCES kpi_definitions(id) ON DELETE CASCADE,
    tracking_date DATE NOT NULL,
    tracking_hour INTEGER, -- NULL for daily KPIs
    
    -- Values
    actual_value DECIMAL(10,2) NOT NULL,
    target_value DECIMAL(10,2),
    variance DECIMAL(10,2), -- actual - target
    variance_percentage DECIMAL(5,2),
    
    -- Status
    status VARCHAR(20), -- on_target, above_target, below_target, critical
    trend VARCHAR(20), -- improving, stable, declining
    
    -- Context
    department_id INTEGER REFERENCES departments(id),
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(kpi_id, tracking_date, tracking_hour)
);

-- Custom report configurations
CREATE TABLE IF NOT EXISTS report_configurations (
    id SERIAL PRIMARY KEY,
    report_name VARCHAR(200) NOT NULL,
    report_type VARCHAR(50) NOT NULL, -- dashboard, detailed, summary, compliance
    description TEXT,
    
    -- Configuration
    metrics JSONB NOT NULL, -- Array of metrics to include
    filters JSONB, -- Default filters
    grouping VARCHAR(50), -- department, zone, date, user
    time_range VARCHAR(50), -- daily, weekly, monthly, quarterly, yearly, custom
    
    -- Visualization
    chart_types JSONB, -- Array of chart configurations
    layout JSONB, -- Dashboard layout configuration
    
    -- Scheduling
    is_scheduled BOOLEAN DEFAULT FALSE,
    schedule_cron VARCHAR(100),
    recipients JSONB, -- Array of email addresses
    
    -- Metadata
    created_by INTEGER REFERENCES users(id),
    is_public BOOLEAN DEFAULT FALSE,
    last_generated TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alert rules for analytics
CREATE TABLE IF NOT EXISTS analytics_alert_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(200) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- threshold, trend, anomaly
    
    -- Conditions
    metric_name VARCHAR(100) NOT NULL,
    condition VARCHAR(20) NOT NULL, -- gt, lt, eq, between, outside
    threshold_value DECIMAL(10,2),
    threshold_value_max DECIMAL(10,2), -- For between/outside conditions
    
    -- Alert Configuration
    severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    notification_channels JSONB, -- email, sms, dashboard, system
    recipients JSONB,
    
    -- Cooldown
    cooldown_minutes INTEGER DEFAULT 60,
    last_triggered TIMESTAMP,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics cache for faster dashboard loading
CREATE TABLE IF NOT EXISTS analytics_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_type VARCHAR(50) NOT NULL, -- summary, chart, report
    cache_data JSONB NOT NULL,
    
    -- Validity
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    hit_count INTEGER DEFAULT 0,
    
    -- Metadata
    parameters JSONB, -- Query parameters used
    computation_time_ms INTEGER
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_analytics_metrics_date ON analytics_metrics(metric_date DESC);
CREATE INDEX idx_analytics_metrics_date_hour ON analytics_metrics(metric_date, metric_hour);
CREATE INDEX idx_department_analytics_date ON department_analytics(metric_date DESC);
CREATE INDEX idx_department_analytics_dept ON department_analytics(department_id, metric_date);
CREATE INDEX idx_storage_zone_analytics_date ON storage_zone_analytics(metric_date DESC);
CREATE INDEX idx_kpi_tracking_date ON kpi_tracking(tracking_date DESC);
CREATE INDEX idx_kpi_tracking_kpi ON kpi_tracking(kpi_id, tracking_date);
CREATE INDEX idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX idx_analytics_cache_expires ON analytics_cache(expires_at);

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- Current day metrics view
CREATE OR REPLACE VIEW v_today_metrics AS
SELECT 
    am.*,
    COALESCE(am.successful_locates::DECIMAL / NULLIF(am.rfid_scans, 0) * 100, 0) as rfid_success_rate,
    COALESCE(am.occupied_boxes::DECIMAL / NULLIF(am.total_storage_boxes, 0) * 100, 0) as storage_occupancy
FROM analytics_metrics am
WHERE am.metric_date = CURRENT_DATE
ORDER BY am.metric_hour DESC
LIMIT 1;

-- Weekly trends view
CREATE OR REPLACE VIEW v_weekly_trends AS
SELECT 
    metric_date,
    SUM(total_dockets) as daily_dockets,
    SUM(active_users) as daily_users,
    SUM(rfid_scans) as daily_scans,
    AVG(storage_utilization) as avg_utilization,
    AVG(compliance_score) as avg_compliance
FROM analytics_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY metric_date
ORDER BY metric_date DESC;

-- Department performance view
CREATE OR REPLACE VIEW v_department_performance AS
SELECT 
    d.name as department_name,
    da.metric_date,
    da.total_dockets,
    da.efficiency_score,
    da.compliance_rate,
    da.avg_processing_time,
    RANK() OVER (PARTITION BY da.metric_date ORDER BY da.efficiency_score DESC) as efficiency_rank
FROM department_analytics da
JOIN departments d ON da.department_id = d.id
WHERE da.metric_date >= CURRENT_DATE - INTERVAL '30 days';

-- KPI dashboard view
CREATE OR REPLACE VIEW v_kpi_dashboard AS
SELECT 
    kd.kpi_code,
    kd.kpi_name,
    kd.category,
    kd.target_value,
    kt.actual_value,
    kt.variance,
    kt.variance_percentage,
    kt.status,
    kt.trend,
    kt.tracking_date
FROM kpi_definitions kd
LEFT JOIN LATERAL (
    SELECT * FROM kpi_tracking 
    WHERE kpi_id = kd.id 
    ORDER BY tracking_date DESC, tracking_hour DESC NULLS LAST
    LIMIT 1
) kt ON true
WHERE kd.is_active = TRUE;

-- =====================================================
-- FUNCTIONS FOR ANALYTICS
-- =====================================================

-- Function to calculate daily metrics
CREATE OR REPLACE FUNCTION calculate_daily_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
    v_total_dockets INTEGER;
    v_active_dockets INTEGER;
    v_active_users INTEGER;
    v_rfid_scans INTEGER;
BEGIN
    -- Calculate docket metrics
    SELECT COUNT(*) INTO v_total_dockets FROM dockets;
    SELECT COUNT(*) INTO v_active_dockets FROM dockets WHERE status = 'active';
    
    -- Calculate user metrics
    SELECT COUNT(DISTINCT user_id) INTO v_active_users 
    FROM audit_logs 
    WHERE DATE(timestamp) = target_date;
    
    -- Calculate RFID metrics
    SELECT COUNT(*) INTO v_rfid_scans
    FROM rfid_events
    WHERE DATE(timestamp) = target_date;
    
    -- Insert or update metrics
    INSERT INTO analytics_metrics (
        metric_date, total_dockets, active_dockets, active_users, rfid_scans
    ) VALUES (
        target_date, v_total_dockets, v_active_dockets, v_active_users, v_rfid_scans
    )
    ON CONFLICT (metric_date, metric_hour) 
    DO UPDATE SET
        total_dockets = EXCLUDED.total_dockets,
        active_dockets = EXCLUDED.active_dockets,
        active_users = EXCLUDED.active_users,
        rfid_scans = EXCLUDED.rfid_scans,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to check KPI thresholds and trigger alerts
CREATE OR REPLACE FUNCTION check_kpi_alerts()
RETURNS TABLE(alert_id INTEGER, kpi_name VARCHAR, status VARCHAR, message TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kt.id,
        kd.kpi_name,
        kt.status,
        CASE 
            WHEN kt.status = 'critical' THEN 'CRITICAL: ' || kd.kpi_name || ' is at ' || kt.actual_value || ' (' || kt.variance_percentage || '% variance)'
            WHEN kt.status = 'below_target' THEN 'WARNING: ' || kd.kpi_name || ' is below target at ' || kt.actual_value
            ELSE NULL
        END as message
    FROM kpi_tracking kt
    JOIN kpi_definitions kd ON kt.kpi_id = kd.id
    WHERE kt.tracking_date = CURRENT_DATE
        AND kt.status IN ('critical', 'below_target')
        AND kd.alert_enabled = TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default KPI definitions
INSERT INTO kpi_definitions (kpi_code, kpi_name, description, category, target_value, min_threshold, max_threshold, unit) VALUES
('DOC_RETRIEVAL_TIME', 'Document Retrieval Time', 'Average time to retrieve a docket', 'operational', 15, 5, 30, 'minutes'),
('STORAGE_UTILIZATION', 'Storage Utilization', 'Percentage of storage capacity used', 'operational', 75, 50, 90, 'percentage'),
('SYSTEM_UPTIME', 'System Uptime', 'System availability percentage', 'operational', 99.9, 99, 100, 'percentage'),
('COMPLIANCE_SCORE', 'Compliance Score', 'Overall compliance with regulations', 'compliance', 95, 90, 100, 'percentage'),
('USER_SATISFACTION', 'User Satisfaction', 'User satisfaction rating', 'operational', 4.5, 3.5, 5, 'rating'),
('RFID_ACCURACY', 'RFID Location Accuracy', 'Accuracy of RFID tracking', 'operational', 95, 90, 100, 'percentage'),
('DAILY_OPERATIONS', 'Daily Operations Count', 'Number of operations per day', 'operational', 500, 200, 1000, 'count'),
('ERROR_RATE', 'System Error Rate', 'Percentage of failed operations', 'operational', 1, 0, 5, 'percentage')
ON CONFLICT (kpi_code) DO NOTHING;

-- Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO PUBLIC;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;