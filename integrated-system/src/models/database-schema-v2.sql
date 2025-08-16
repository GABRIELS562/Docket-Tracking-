-- =====================================================
-- RFID DOCKET TRACKING SYSTEM V2
-- With Managed Storage Service
-- =====================================================

-- Drop existing tables if needed (careful in production!)
-- DROP SCHEMA IF EXISTS docket_tracking CASCADE;
-- CREATE SCHEMA docket_tracking;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Organizations/Clients using the system
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    client_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    storage_service_active BOOLEAN DEFAULT false,
    storage_start_date DATE,
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, quarterly, annual
    payment_terms INTEGER DEFAULT 30, -- days
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Physical storage boxes for managed storage service
CREATE TABLE IF NOT EXISTS storage_boxes (
    id SERIAL PRIMARY KEY,
    box_code VARCHAR(50) UNIQUE NOT NULL,
    rfid_tag_id VARCHAR(128) UNIQUE NOT NULL,
    barcode_value VARCHAR(50) UNIQUE NOT NULL,
    client_id INTEGER REFERENCES clients(id),
    box_type VARCHAR(50) DEFAULT 'standard', -- standard, fireproof, climate_controlled
    capacity INTEGER DEFAULT 100, -- number of dockets
    current_count INTEGER DEFAULT 0,
    location_code VARCHAR(50), -- shelf location in storage room
    status VARCHAR(20) DEFAULT 'active', -- active, full, retrieved, archived
    monthly_rate DECIMAL(10,2) DEFAULT 40.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP,
    notes TEXT,
    INDEX idx_box_client (client_id),
    INDEX idx_box_status (status),
    INDEX idx_box_rfid (rfid_tag_id)
);

-- Main dockets table (updated)
CREATE TABLE IF NOT EXISTS dockets (
    id SERIAL PRIMARY KEY,
    docket_code VARCHAR(100) UNIQUE NOT NULL,
    case_number VARCHAR(100),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- RFID & Barcode
    rfid_tag_id VARCHAR(128) UNIQUE NOT NULL,
    barcode_value VARCHAR(50) UNIQUE NOT NULL,
    qr_code_value VARCHAR(100),
    
    -- Ownership & Classification
    client_id INTEGER REFERENCES clients(id),
    department VARCHAR(255),
    category VARCHAR(50), -- legal, evidence, administrative, financial
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, critical
    security_level VARCHAR(20) DEFAULT 'standard', -- public, confidential, secret, top_secret
    
    -- Storage Information
    storage_type VARCHAR(20) DEFAULT 'on_site', -- on_site, managed_storage, external
    storage_box_id INTEGER REFERENCES storage_boxes(id),
    box_position INTEGER, -- position within box (1-100)
    current_location VARCHAR(255), -- flexible location field
    
    -- Dates
    date_created DATE NOT NULL,
    date_closed DATE,
    retention_date DATE, -- when it can be destroyed
    last_accessed TIMESTAMP,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, archived, retrieved, destroyed
    is_checked_out BOOLEAN DEFAULT false,
    checked_out_by INTEGER REFERENCES users(id),
    checked_out_date TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_docket_client (client_id),
    INDEX idx_docket_box (storage_box_id),
    INDEX idx_docket_rfid (rfid_tag_id),
    INDEX idx_docket_barcode (barcode_value),
    INDEX idx_docket_status (status),
    INDEX idx_docket_storage_type (storage_type)
);

-- Storage service requests
CREATE TABLE IF NOT EXISTS storage_requests (
    id SERIAL PRIMARY KEY,
    request_number VARCHAR(50) UNIQUE NOT NULL,
    client_id INTEGER REFERENCES clients(id),
    request_type VARCHAR(20), -- retrieval, storage, return, bulk_retrieval
    urgency VARCHAR(20) DEFAULT 'normal', -- normal, urgent, scheduled
    
    -- Request details
    docket_ids INTEGER[], -- array of requested docket IDs
    box_ids INTEGER[], -- array of requested box IDs
    reason TEXT,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    requested_by INTEGER REFERENCES users(id),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fulfilled_by INTEGER REFERENCES users(id),
    fulfilled_at TIMESTAMP,
    
    -- Costs
    base_cost DECIMAL(10,2) DEFAULT 0,
    urgency_fee DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Scheduling
    scheduled_date DATE,
    scheduled_time TIME,
    completion_deadline TIMESTAMP,
    
    notes TEXT,
    INDEX idx_request_client (client_id),
    INDEX idx_request_status (status),
    INDEX idx_request_date (requested_at)
);

-- Billing for storage service
CREATE TABLE IF NOT EXISTS storage_billing (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id INTEGER REFERENCES clients(id),
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    
    -- Charges
    storage_box_count INTEGER DEFAULT 0,
    storage_rate DECIMAL(10,2) DEFAULT 40.00,
    storage_charges DECIMAL(10,2) DEFAULT 0,
    
    retrieval_count INTEGER DEFAULT 0,
    retrieval_charges DECIMAL(10,2) DEFAULT 0,
    
    urgent_count INTEGER DEFAULT 0,
    urgent_charges DECIMAL(10,2) DEFAULT 0,
    
    other_charges DECIMAL(10,2) DEFAULT 0,
    other_description TEXT,
    
    -- Totals
    subtotal DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 15.00, -- VAT
    tax_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Payment tracking
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, paid, overdue
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    paid_date DATE,
    payment_reference VARCHAR(100),
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_billing_client (client_id),
    INDEX idx_billing_status (status),
    INDEX idx_billing_period (billing_period_start, billing_period_end)
);

-- Movement tracking (updated for storage operations)
CREATE TABLE IF NOT EXISTS movements (
    id SERIAL PRIMARY KEY,
    movement_type VARCHAR(50), -- check_in, check_out, transfer, to_storage, from_storage
    
    -- What moved
    docket_id INTEGER REFERENCES dockets(id),
    box_id INTEGER REFERENCES storage_boxes(id),
    
    -- Movement details
    from_location VARCHAR(255),
    to_location VARCHAR(255),
    from_storage_type VARCHAR(20),
    to_storage_type VARCHAR(20),
    
    -- Who and when
    performed_by INTEGER REFERENCES users(id),
    authorized_by INTEGER REFERENCES users(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Verification
    rfid_verified BOOLEAN DEFAULT false,
    barcode_verified BOOLEAN DEFAULT false,
    manual_override BOOLEAN DEFAULT false,
    
    reason TEXT,
    notes TEXT,
    
    INDEX idx_movement_docket (docket_id),
    INDEX idx_movement_box (box_id),
    INDEX idx_movement_timestamp (timestamp),
    INDEX idx_movement_type (movement_type)
);

-- RFID reader events (unchanged but included for completeness)
CREATE TABLE IF NOT EXISTS rfid_events (
    id BIGSERIAL PRIMARY KEY,
    tag_id VARCHAR(128) NOT NULL,
    reader_id VARCHAR(50) NOT NULL,
    antenna_port INTEGER,
    signal_strength INTEGER,
    event_type VARCHAR(20), -- read, arrival, departure
    location_zone VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT false,
    
    INDEX idx_rfid_tag (tag_id),
    INDEX idx_rfid_timestamp (timestamp),
    INDEX idx_rfid_processed (processed)
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions for RFID events
CREATE TABLE IF NOT EXISTS rfid_events_2024_01 PARTITION OF rfid_events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- =====================================================
-- VIEWS FOR DASHBOARD
-- =====================================================

-- Storage service overview
CREATE OR REPLACE VIEW storage_overview AS
SELECT 
    c.id as client_id,
    c.name as client_name,
    COUNT(DISTINCT sb.id) as total_boxes,
    COUNT(DISTINCT d.id) as total_dockets,
    SUM(sb.monthly_rate) as monthly_revenue,
    COUNT(DISTINCT CASE WHEN sr.request_type = 'retrieval' 
           AND sr.requested_at > CURRENT_DATE - INTERVAL '30 days' 
           THEN sr.id END) as monthly_retrievals
FROM clients c
LEFT JOIN storage_boxes sb ON c.id = sb.client_id AND sb.status = 'active'
LEFT JOIN dockets d ON sb.id = d.storage_box_id
LEFT JOIN storage_requests sr ON c.id = sr.client_id
WHERE c.storage_service_active = true
GROUP BY c.id, c.name;

-- Real-time location view
CREATE OR REPLACE VIEW docket_locations AS
SELECT 
    d.id,
    d.docket_code,
    d.title,
    c.name as client_name,
    d.storage_type,
    CASE 
        WHEN d.storage_type = 'managed_storage' THEN 
            'Storage Room - Box ' || sb.box_code || ' - ' || sb.location_code
        WHEN d.storage_type = 'on_site' THEN 
            d.current_location
        ELSE 
            'External Storage'
    END as location,
    d.is_checked_out,
    u.username as checked_out_by,
    d.last_accessed
FROM dockets d
LEFT JOIN clients c ON d.client_id = c.id
LEFT JOIN storage_boxes sb ON d.storage_box_id = sb.id
LEFT JOIN users u ON d.checked_out_by = u.id;

-- Box utilization view
CREATE OR REPLACE VIEW box_utilization AS
SELECT 
    sb.id,
    sb.box_code,
    c.name as client_name,
    sb.capacity,
    sb.current_count,
    ROUND((sb.current_count::numeric / sb.capacity) * 100, 2) as utilization_percent,
    sb.location_code,
    sb.status,
    sb.monthly_rate,
    sb.last_accessed
FROM storage_boxes sb
LEFT JOIN clients c ON sb.client_id = c.id
ORDER BY utilization_percent DESC;

-- =====================================================
-- STORED PROCEDURES
-- =====================================================

-- Add docket to storage box
CREATE OR REPLACE FUNCTION add_docket_to_box(
    p_docket_id INTEGER,
    p_box_id INTEGER,
    p_user_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_count INTEGER;
    v_capacity INTEGER;
BEGIN
    -- Check box capacity
    SELECT current_count, capacity INTO v_current_count, v_capacity
    FROM storage_boxes WHERE id = p_box_id;
    
    IF v_current_count >= v_capacity THEN
        RAISE EXCEPTION 'Box is full';
    END IF;
    
    -- Update docket
    UPDATE dockets 
    SET storage_box_id = p_box_id,
        storage_type = 'managed_storage',
        current_location = 'Storage Room',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_docket_id;
    
    -- Update box count
    UPDATE storage_boxes
    SET current_count = current_count + 1,
        last_accessed = CURRENT_TIMESTAMP
    WHERE id = p_box_id;
    
    -- Log movement
    INSERT INTO movements (
        movement_type, docket_id, box_id, 
        to_location, to_storage_type, performed_by
    ) VALUES (
        'to_storage', p_docket_id, p_box_id,
        'Storage Room', 'managed_storage', p_user_id
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Generate monthly invoice
CREATE OR REPLACE FUNCTION generate_monthly_invoice(
    p_client_id INTEGER,
    p_billing_month DATE
) RETURNS INTEGER AS $$
DECLARE
    v_invoice_id INTEGER;
    v_box_count INTEGER;
    v_storage_charges DECIMAL;
    v_retrieval_charges DECIMAL;
    v_urgent_charges DECIMAL;
    v_subtotal DECIMAL;
    v_tax DECIMAL;
BEGIN
    -- Count active boxes for the month
    SELECT COUNT(*), SUM(monthly_rate)
    INTO v_box_count, v_storage_charges
    FROM storage_boxes
    WHERE client_id = p_client_id
    AND status = 'active';
    
    -- Calculate retrieval charges
    SELECT 
        COUNT(CASE WHEN urgency = 'normal' THEN 1 END) * 50,
        COUNT(CASE WHEN urgency = 'urgent' THEN 1 END) * 100
    INTO v_retrieval_charges, v_urgent_charges
    FROM storage_requests
    WHERE client_id = p_client_id
    AND DATE_TRUNC('month', requested_at) = DATE_TRUNC('month', p_billing_month)
    AND status = 'completed';
    
    -- Calculate totals
    v_subtotal := COALESCE(v_storage_charges, 0) + 
                  COALESCE(v_retrieval_charges, 0) + 
                  COALESCE(v_urgent_charges, 0);
    v_tax := v_subtotal * 0.15;
    
    -- Create invoice
    INSERT INTO storage_billing (
        invoice_number, client_id, billing_period_start, billing_period_end,
        storage_box_count, storage_charges, retrieval_charges, urgent_charges,
        subtotal, tax_amount, total_amount, due_date
    ) VALUES (
        'INV-' || TO_CHAR(p_billing_month, 'YYYYMM') || '-' || p_client_id,
        p_client_id,
        DATE_TRUNC('month', p_billing_month),
        DATE_TRUNC('month', p_billing_month) + INTERVAL '1 month' - INTERVAL '1 day',
        v_box_count, v_storage_charges, v_retrieval_charges, v_urgent_charges,
        v_subtotal, v_tax, v_subtotal + v_tax,
        CURRENT_DATE + INTERVAL '30 days'
    ) RETURNING id INTO v_invoice_id;
    
    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_dockets_search 
ON dockets USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_storage_active 
ON storage_boxes(client_id, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_movements_recent 
ON movements(timestamp) WHERE timestamp > CURRENT_DATE - INTERVAL '30 days';

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default client
INSERT INTO clients (client_code, name, department, email, storage_service_active)
VALUES ('GOV001', 'Government Department', 'Legal Division', 'legal@gov.za', true)
ON CONFLICT (client_code) DO NOTHING;

-- Insert sample storage boxes
INSERT INTO storage_boxes (box_code, rfid_tag_id, barcode_value, client_id, location_code)
SELECT 
    'BOX-2024-' || LPAD(generate_series::text, 4, '0'),
    'RFID-BOX-' || generate_series,
    'BAR-BOX-' || generate_series,
    1,
    'SHELF-' || CHR(65 + (generate_series % 10)) || '-' || ((generate_series / 10) + 1)
FROM generate_series(1, 100)
ON CONFLICT (box_code) DO NOTHING;

-- =====================================================
-- PERMISSIONS
-- =====================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO docket_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO docket_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO docket_user;