-- RFID Docket Tracking System Database Schema
-- Version: 1.0.0
-- Description: Complete database schema for 500k docket management system

-- Enable UUID extension for better ID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS retrieval_request_items CASCADE;
DROP TABLE IF EXISTS retrieval_requests CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS billing_rates CASCADE;
DROP TABLE IF EXISTS rfid_events CASCADE;
DROP TABLE IF EXISTS rfid_readers CASCADE;
DROP TABLE IF EXISTS docket_movements CASCADE;
DROP TABLE IF EXISTS dockets CASCADE;
DROP TABLE IF EXISTS storage_boxes CASCADE;
DROP TABLE IF EXISTS storage_zones CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =============================================
-- USERS AND AUTHENTICATION
-- =============================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CLIENTS AND ORGANIZATIONS
-- =============================================

CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    client_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    organization_type VARCHAR(100), -- government, police, court, etc.
    registration_number VARCHAR(100),
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    billing_address TEXT,
    pricing_tier VARCHAR(50) DEFAULT 'standard', -- standard, professional, enterprise
    storage_rate DECIMAL(10,2) DEFAULT 40.00,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    credit_limit DECIMAL(12,2) DEFAULT 100000.00,
    payment_terms INTEGER DEFAULT 30, -- days
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- STORAGE MANAGEMENT
-- =============================================

CREATE TABLE storage_zones (
    id SERIAL PRIMARY KEY,
    zone_code VARCHAR(20) UNIQUE NOT NULL,
    zone_name VARCHAR(100) NOT NULL,
    building VARCHAR(100),
    floor VARCHAR(20),
    total_capacity INTEGER NOT NULL,
    used_capacity INTEGER DEFAULT 0,
    temperature_threshold_min DECIMAL(5,2) DEFAULT 15.0,
    temperature_threshold_max DECIMAL(5,2) DEFAULT 25.0,
    humidity_threshold_min DECIMAL(5,2) DEFAULT 30.0,
    humidity_threshold_max DECIMAL(5,2) DEFAULT 60.0,
    is_climate_controlled BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE storage_boxes (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    box_code VARCHAR(50) UNIQUE NOT NULL,
    zone_id INTEGER REFERENCES storage_zones(id),
    client_id INTEGER REFERENCES clients(id),
    shelf_code VARCHAR(50),
    position_x INTEGER, -- for grid positioning
    position_y INTEGER,
    position_z INTEGER, -- height/level
    capacity INTEGER DEFAULT 100,
    occupied INTEGER DEFAULT 0,
    box_type VARCHAR(50) DEFAULT 'standard', -- standard, archive, evidence, confidential
    status VARCHAR(50) DEFAULT 'active', -- active, full, archived, maintenance
    seal_number VARCHAR(100),
    is_sealed BOOLEAN DEFAULT false,
    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    last_accessed TIMESTAMP,
    last_inventory TIMESTAMP,
    monthly_rate DECIMAL(10,2) DEFAULT 40.00,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- DOCKETS AND RFID TAGS
-- =============================================

CREATE TABLE dockets (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    docket_code VARCHAR(100) UNIQUE NOT NULL,
    case_number VARCHAR(200),
    client_id INTEGER REFERENCES clients(id),
    storage_box_id INTEGER REFERENCES storage_boxes(id),
    rfid_tag VARCHAR(100) UNIQUE,
    barcode VARCHAR(100) UNIQUE,
    docket_type VARCHAR(50), -- evidence, legal, medical, financial
    classification VARCHAR(50) DEFAULT 'standard', -- standard, confidential, restricted
    description TEXT,
    current_location VARCHAR(255),
    current_zone_id INTEGER REFERENCES storage_zones(id),
    status VARCHAR(50) DEFAULT 'active', -- active, archived, destroyed, lost
    retention_date DATE,
    destruction_date DATE,
    is_fragile BOOLEAN DEFAULT false,
    is_high_value BOOLEAN DEFAULT false,
    chain_of_custody JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE docket_movements (
    id SERIAL PRIMARY KEY,
    docket_id INTEGER REFERENCES dockets(id) ON DELETE CASCADE,
    from_location VARCHAR(255),
    to_location VARCHAR(255),
    from_zone_id INTEGER REFERENCES storage_zones(id),
    to_zone_id INTEGER REFERENCES storage_zones(id),
    from_box_id INTEGER REFERENCES storage_boxes(id),
    to_box_id INTEGER REFERENCES storage_boxes(id),
    movement_type VARCHAR(50), -- check-in, check-out, transfer, audit
    movement_reason TEXT,
    performed_by INTEGER REFERENCES users(id),
    authorized_by INTEGER REFERENCES users(id),
    witness_by INTEGER REFERENCES users(id),
    signature_data TEXT, -- base64 encoded signature
    movement_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- =============================================
-- RFID TRACKING
-- =============================================

CREATE TABLE rfid_readers (
    id SERIAL PRIMARY KEY,
    reader_code VARCHAR(50) UNIQUE NOT NULL,
    reader_name VARCHAR(100),
    reader_type VARCHAR(50), -- portal, overhead, handheld
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    location VARCHAR(255),
    zone_id INTEGER REFERENCES storage_zones(id),
    antenna_count INTEGER DEFAULT 1,
    read_range_meters DECIMAL(5,2),
    status VARCHAR(50) DEFAULT 'online', -- online, offline, maintenance, error
    last_ping TIMESTAMP,
    last_maintenance DATE,
    firmware_version VARCHAR(50),
    configuration JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rfid_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL, -- read, entry, exit, alarm
    reader_id INTEGER REFERENCES rfid_readers(id),
    docket_id INTEGER REFERENCES dockets(id),
    rfid_tag VARCHAR(100),
    signal_strength INTEGER,
    antenna_number INTEGER,
    read_count INTEGER DEFAULT 1,
    direction VARCHAR(20), -- in, out, pass
    event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'
);

-- =============================================
-- BILLING AND INVOICING
-- =============================================

CREATE TABLE billing_rates (
    id SERIAL PRIMARY KEY,
    service_type VARCHAR(50) NOT NULL, -- storage, retrieval_normal, retrieval_urgent, bulk_transfer
    tier VARCHAR(50) DEFAULT 'standard', -- standard, professional, enterprise
    rate DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20), -- per_box_month, per_retrieval, per_batch
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id INTEGER REFERENCES clients(id),
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    storage_box_count INTEGER DEFAULT 0,
    storage_fees DECIMAL(12,2) DEFAULT 0,
    retrieval_fees DECIMAL(12,2) DEFAULT 0,
    other_fees DECIMAL(12,2) DEFAULT 0,
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
    due_date DATE,
    paid_date DATE,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    notes TEXT,
    line_items JSONB DEFAULT '[]',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- RETRIEVAL REQUESTS
-- =============================================

CREATE TABLE retrieval_requests (
    id SERIAL PRIMARY KEY,
    request_number VARCHAR(50) UNIQUE NOT NULL,
    client_id INTEGER REFERENCES clients(id),
    requested_by INTEGER REFERENCES users(id),
    urgency VARCHAR(20) DEFAULT 'normal', -- normal, urgent, scheduled
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, ready, completed, cancelled
    scheduled_date DATE,
    scheduled_time TIME,
    completion_deadline TIMESTAMP,
    actual_completion TIMESTAMP,
    total_items INTEGER DEFAULT 0,
    retrieval_fee DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE retrieval_request_items (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES retrieval_requests(id) ON DELETE CASCADE,
    docket_id INTEGER REFERENCES dockets(id),
    status VARCHAR(50) DEFAULT 'pending', -- pending, retrieved, not_found, error
    retrieved_at TIMESTAMP,
    retrieved_by INTEGER REFERENCES users(id),
    notes TEXT
);

-- =============================================
-- AUDIT LOGS
-- =============================================

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER,
    action VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT
    user_id INTEGER REFERENCES users(id),
    ip_address VARCHAR(45),
    user_agent TEXT,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- User and Auth indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- Client indexes
CREATE INDEX idx_clients_code ON clients(client_code);
CREATE INDEX idx_clients_active ON clients(is_active);

-- Storage indexes
CREATE INDEX idx_storage_boxes_zone ON storage_boxes(zone_id);
CREATE INDEX idx_storage_boxes_client ON storage_boxes(client_id);
CREATE INDEX idx_storage_boxes_code ON storage_boxes(box_code);
CREATE INDEX idx_storage_boxes_status ON storage_boxes(status);

-- Docket indexes
CREATE INDEX idx_dockets_code ON dockets(docket_code);
CREATE INDEX idx_dockets_case ON dockets(case_number);
CREATE INDEX idx_dockets_rfid ON dockets(rfid_tag);
CREATE INDEX idx_dockets_barcode ON dockets(barcode);
CREATE INDEX idx_dockets_client ON dockets(client_id);
CREATE INDEX idx_dockets_box ON dockets(storage_box_id);
CREATE INDEX idx_dockets_status ON dockets(status);
CREATE INDEX idx_dockets_created ON dockets(created_at);

-- Movement indexes
CREATE INDEX idx_movements_docket ON docket_movements(docket_id);
CREATE INDEX idx_movements_timestamp ON docket_movements(movement_timestamp);

-- RFID indexes
CREATE INDEX idx_rfid_events_reader ON rfid_events(reader_id);
CREATE INDEX idx_rfid_events_docket ON rfid_events(docket_id);
CREATE INDEX idx_rfid_events_tag ON rfid_events(rfid_tag);
CREATE INDEX idx_rfid_events_timestamp ON rfid_events(event_timestamp);
CREATE INDEX idx_rfid_events_processed ON rfid_events(processed);

-- Invoice indexes
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due ON invoices(due_date);

-- Retrieval indexes
CREATE INDEX idx_retrievals_client ON retrieval_requests(client_id);
CREATE INDEX idx_retrievals_status ON retrieval_requests(status);

-- Audit log indexes
CREATE INDEX idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_storage_boxes_updated_at BEFORE UPDATE ON storage_boxes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dockets_updated_at BEFORE UPDATE ON dockets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_retrieval_requests_updated_at BEFORE UPDATE ON retrieval_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TRIGGER FOR AUDIT LOGGING
-- =============================================

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs(table_name, record_id, action, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs(table_name, record_id, action, old_values, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs(table_name, record_id, action, old_values)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_dockets AFTER INSERT OR UPDATE OR DELETE ON dockets
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_docket_movements AFTER INSERT OR UPDATE OR DELETE ON docket_movements
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_storage_boxes AFTER INSERT OR UPDATE OR DELETE ON storage_boxes
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =============================================
-- VIEWS FOR REPORTING
-- =============================================

CREATE VIEW v_storage_utilization AS
SELECT 
    sz.zone_code,
    sz.zone_name,
    sz.total_capacity,
    sz.used_capacity,
    ROUND((sz.used_capacity::numeric / sz.total_capacity::numeric * 100), 2) as utilization_percentage,
    COUNT(DISTINCT sb.id) as total_boxes,
    COUNT(DISTINCT CASE WHEN sb.status = 'active' THEN sb.id END) as active_boxes,
    COUNT(DISTINCT d.id) as total_dockets
FROM storage_zones sz
LEFT JOIN storage_boxes sb ON sz.id = sb.zone_id
LEFT JOIN dockets d ON sb.id = d.storage_box_id
GROUP BY sz.id, sz.zone_code, sz.zone_name, sz.total_capacity, sz.used_capacity;

CREATE VIEW v_client_summary AS
SELECT 
    c.id,
    c.name,
    c.client_code,
    COUNT(DISTINCT d.id) as total_dockets,
    COUNT(DISTINCT sb.id) as total_boxes,
    COUNT(DISTINCT CASE WHEN d.status = 'active' THEN d.id END) as active_dockets,
    SUM(sb.monthly_rate) as monthly_storage_fees
FROM clients c
LEFT JOIN storage_boxes sb ON c.id = sb.client_id
LEFT JOIN dockets d ON c.id = d.client_id
GROUP BY c.id, c.name, c.client_code;

-- =============================================
-- GRANT PERMISSIONS (adjust as needed)
-- =============================================

-- Create application user if not exists
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;