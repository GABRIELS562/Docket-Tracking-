-- Seed Data for RFID Docket Tracking System
-- This file populates the database with initial test data

-- =============================================
-- INSERT DEFAULT ROLES
-- =============================================

INSERT INTO roles (name, description, permissions) VALUES
('admin', 'System Administrator', '{"all": true}'),
('manager', 'Storage Manager', '{"storage": true, "reports": true, "billing": true}'),
('operator', 'System Operator', '{"dockets": true, "rfid": true, "search": true}'),
('client', 'Client User', '{"search": true, "reports": "own", "billing": "own"}'),
('auditor', 'Auditor', '{"reports": true, "audit": true, "search": true}');

-- =============================================
-- INSERT DEFAULT USERS
-- =============================================

-- Password for all users: admin123 (bcrypt hash)
INSERT INTO users (username, email, password_hash, full_name, phone, department, is_active, is_admin) VALUES
('admin', 'admin@govstorageservices.gov.za', '$2b$10$YKh3YXoHfNvJbKjmZVxRiuZKoNZOP8P7p8

RhZ1HQKPNMmU8GwLOm', 'System Administrator', '+27 11 123 4567', 'IT Department', true, true),
('john.smith', 'john.smith@justice.gov.za', '$2b$10$YKh3YXoHfNvJbKjmZVxRiuZKoNZOP8P7p8RhZ1HQKPNMmU8GwLOm', 'John Smith', '+27 11 234 5678', 'Department of Justice', true, false),
('jane.doe', 'jane.doe@saps.gov.za', '$2b$10$YKh3YXoHfNvJbKjmZVxRiuZKoNZOP8P7p8RhZ1HQKPNMmU8GwLOm', 'Jane Doe', '+27 11 345 6789', 'Metro Police Department', true, false),
('mike.wilson', 'mike.wilson@court.gov.za', '$2b$10$YKh3YXoHfNvJbKjmZVxRiuZKoNZOP8P7p8RhZ1HQKPNMmU8GwLOm', 'Mike Wilson', '+27 11 456 7890', 'Provincial Court', true, false),
('sarah.jones', 'sarah.jones@storage.gov.za', '$2b$10$YKh3YXoHfNvJbKjmZVxRiuZKoNZOP8P7p8RhZ1HQKPNMmU8GwLOm', 'Sarah Jones', '+27 11 567 8901', 'Storage Operations', true, false);

-- =============================================
-- ASSIGN ROLES TO USERS
-- =============================================

INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES
(1, 1, 1), -- admin -> admin role
(2, 4, 1), -- john.smith -> client role
(3, 4, 1), -- jane.doe -> client role
(4, 4, 1), -- mike.wilson -> client role
(5, 3, 1); -- sarah.jones -> operator role

-- =============================================
-- INSERT CLIENTS
-- =============================================

INSERT INTO clients (client_code, name, organization_type, registration_number, contact_person, email, phone, address, pricing_tier, storage_rate, discount_percentage) VALUES
('DOJ-001', 'Department of Justice', 'government', '2020/123456/07', 'John Smith', 'procurement@justice.gov.za', '+27 11 234 5678', '123 Justice Street, Pretoria, 0001', 'enterprise', 35.00, 12.5),
('MPD-001', 'Metro Police Department', 'police', '2019/234567/07', 'Jane Doe', 'evidence@saps.gov.za', '+27 11 345 6789', '456 Police Plaza, Johannesburg, 2000', 'professional', 38.00, 5.0),
('PRC-001', 'Provincial Court', 'court', '2018/345678/07', 'Mike Wilson', 'records@court.gov.za', '+27 11 456 7890', '789 Court House, Cape Town, 8000', 'standard', 40.00, 0),
('DHA-001', 'Department of Home Affairs', 'government', '2017/456789/07', 'Alice Brown', 'documents@dha.gov.za', '+27 11 678 9012', '321 Home Affairs Building, Durban, 4000', 'professional', 38.00, 5.0),
('NPA-001', 'National Prosecuting Authority', 'government', '2016/567890/07', 'Bob Johnson', 'cases@npa.gov.za', '+27 11 789 0123', '654 NPA Tower, Bloemfontein, 9300', 'enterprise', 35.00, 12.5);

-- =============================================
-- INSERT STORAGE ZONES
-- =============================================

INSERT INTO storage_zones (zone_code, zone_name, building, floor, total_capacity, used_capacity, is_climate_controlled) VALUES
('ZONE-A', 'Zone A - High Security', 'Building A', 'Ground Floor', 5000, 3900, true),
('ZONE-B', 'Zone B - Evidence Storage', 'Building A', 'Level 1', 5000, 4600, true),
('ZONE-C', 'Zone C - Document Archive', 'Building B', 'Ground Floor', 8000, 5200, false),
('ZONE-D', 'Zone D - Bulk Storage', 'Warehouse', 'Ground Floor', 10000, 4500, false),
('ZONE-E', 'Zone E - Climate Controlled', 'Building A', 'Basement', 3000, 2100, true);

-- =============================================
-- INSERT STORAGE BOXES
-- =============================================

-- Generate storage boxes for each zone
INSERT INTO storage_boxes (box_code, zone_id, client_id, shelf_code, capacity, occupied, box_type, status, monthly_rate) VALUES
-- Zone A boxes
('BOX-2024-0001', 1, 1, 'A-01-01', 100, 87, 'evidence', 'active', 35.00),
('BOX-2024-0002', 1, 1, 'A-01-02', 100, 92, 'evidence', 'active', 35.00),
('BOX-2024-0003', 1, 1, 'A-01-03', 100, 78, 'evidence', 'active', 35.00),
('BOX-2024-0004', 1, 2, 'A-01-04', 100, 100, 'evidence', 'full', 38.00),
('BOX-2024-0005', 1, 2, 'A-01-05', 100, 65, 'evidence', 'active', 38.00),
-- Zone B boxes
('BOX-2024-0006', 2, 2, 'B-01-01', 100, 95, 'evidence', 'active', 38.00),
('BOX-2024-0007', 2, 2, 'B-01-02', 100, 88, 'evidence', 'active', 38.00),
('BOX-2024-0008', 2, 3, 'B-01-03', 100, 72, 'standard', 'active', 40.00),
('BOX-2024-0009', 2, 3, 'B-01-04', 100, 100, 'standard', 'full', 40.00),
('BOX-2024-0010', 2, 3, 'B-01-05', 100, 45, 'standard', 'active', 40.00),
-- Zone C boxes
('BOX-2024-0011', 3, 4, 'C-01-01', 150, 120, 'archive', 'active', 38.00),
('BOX-2024-0012', 3, 4, 'C-01-02', 150, 135, 'archive', 'active', 38.00),
('BOX-2024-0013', 3, 4, 'C-01-03', 150, 98, 'archive', 'active', 38.00),
('BOX-2024-0014', 3, 5, 'C-01-04', 150, 150, 'archive', 'full', 35.00),
('BOX-2024-0015', 3, 5, 'C-01-05', 150, 110, 'archive', 'active', 35.00),
-- Zone D boxes
('BOX-2024-0016', 4, 1, 'D-01-01', 200, 180, 'standard', 'active', 35.00),
('BOX-2024-0017', 4, 1, 'D-01-02', 200, 165, 'standard', 'active', 35.00),
('BOX-2024-0018', 4, 5, 'D-01-03', 200, 145, 'standard', 'active', 35.00),
('BOX-2024-0019', 4, 5, 'D-01-04', 200, 200, 'standard', 'full', 35.00),
('BOX-2024-0020', 4, 2, 'D-01-05', 200, 90, 'standard', 'active', 38.00);

-- =============================================
-- INSERT SAMPLE DOCKETS
-- =============================================

-- Generate sample dockets
INSERT INTO dockets (docket_code, case_number, client_id, storage_box_id, rfid_tag, barcode, docket_type, description, current_location, current_zone_id, status, created_by) VALUES
-- Department of Justice dockets
('DOCKET-2024-0001', 'CASE-2024-1234', 1, 1, 'RFID-001-234567', 'BAR-001-234567', 'evidence', 'Forensic evidence - Case #1234', 'Zone A - Shelf A-01-01', 1, 'active', 1),
('DOCKET-2024-0002', 'CASE-2024-1235', 1, 1, 'RFID-002-234568', 'BAR-002-234568', 'evidence', 'Witness statements - Case #1235', 'Zone A - Shelf A-01-01', 1, 'active', 1),
('DOCKET-2024-0003', 'CASE-2024-1236', 1, 2, 'RFID-003-234569', 'BAR-003-234569', 'legal', 'Court documents - Case #1236', 'Zone A - Shelf A-01-02', 1, 'active', 1),
('DOCKET-2024-0004', 'CASE-2024-1237', 1, 2, 'RFID-004-234570', 'BAR-004-234570', 'legal', 'Legal briefs - Case #1237', 'Zone A - Shelf A-01-02', 1, 'active', 1),
('DOCKET-2024-0005', 'CASE-2024-1238', 1, 3, 'RFID-005-234571', 'BAR-005-234571', 'evidence', 'Physical evidence - Case #1238', 'Zone A - Shelf A-01-03', 1, 'active', 1),
-- Metro Police dockets
('DOCKET-2024-0006', 'MPD-2024-5678', 2, 4, 'RFID-006-345678', 'BAR-006-345678', 'evidence', 'Crime scene evidence - MPD #5678', 'Zone A - Shelf A-01-04', 1, 'active', 1),
('DOCKET-2024-0007', 'MPD-2024-5679', 2, 5, 'RFID-007-345679', 'BAR-007-345679', 'evidence', 'Surveillance footage - MPD #5679', 'Zone A - Shelf A-01-05', 1, 'active', 1),
('DOCKET-2024-0008', 'MPD-2024-5680', 2, 6, 'RFID-008-345680', 'BAR-008-345680', 'evidence', 'Weapon evidence - MPD #5680', 'Zone B - Shelf B-01-01', 2, 'active', 1),
('DOCKET-2024-0009', 'MPD-2024-5681', 2, 6, 'RFID-009-345681', 'BAR-009-345681', 'evidence', 'Drug evidence - MPD #5681', 'Zone B - Shelf B-01-01', 2, 'active', 1),
('DOCKET-2024-0010', 'MPD-2024-5682', 2, 7, 'RFID-010-345682', 'BAR-010-345682', 'evidence', 'Financial records - MPD #5682', 'Zone B - Shelf B-01-02', 2, 'active', 1),
-- Provincial Court dockets
('DOCKET-2024-0011', 'PRC-2024-9012', 3, 8, 'RFID-011-456789', 'BAR-011-456789', 'legal', 'Court transcripts - PRC #9012', 'Zone B - Shelf B-01-03', 2, 'active', 1),
('DOCKET-2024-0012', 'PRC-2024-9013', 3, 8, 'RFID-012-456790', 'BAR-012-456790', 'legal', 'Judgments - PRC #9013', 'Zone B - Shelf B-01-03', 2, 'active', 1),
('DOCKET-2024-0013', 'PRC-2024-9014', 3, 9, 'RFID-013-456791', 'BAR-013-456791', 'legal', 'Appeals documents - PRC #9014', 'Zone B - Shelf B-01-04', 2, 'active', 1),
('DOCKET-2024-0014', 'PRC-2024-9015', 3, 10, 'RFID-014-456792', 'BAR-014-456792', 'legal', 'Civil case files - PRC #9015', 'Zone B - Shelf B-01-05', 2, 'active', 1),
('DOCKET-2024-0015', 'PRC-2024-9016', 3, 10, 'RFID-015-456793', 'BAR-015-456793', 'legal', 'Criminal case files - PRC #9016', 'Zone B - Shelf B-01-05', 2, 'active', 1),
-- Home Affairs dockets
('DOCKET-2024-0016', 'DHA-2024-3456', 4, 11, 'RFID-016-567890', 'BAR-016-567890', 'legal', 'Immigration documents - DHA #3456', 'Zone C - Shelf C-01-01', 3, 'active', 1),
('DOCKET-2024-0017', 'DHA-2024-3457', 4, 11, 'RFID-017-567891', 'BAR-017-567891', 'legal', 'Citizenship applications - DHA #3457', 'Zone C - Shelf C-01-01', 3, 'active', 1),
('DOCKET-2024-0018', 'DHA-2024-3458', 4, 12, 'RFID-018-567892', 'BAR-018-567892', 'legal', 'Birth certificates archive - DHA #3458', 'Zone C - Shelf C-01-02', 3, 'archived', 1),
('DOCKET-2024-0019', 'DHA-2024-3459', 4, 13, 'RFID-019-567893', 'BAR-019-567893', 'legal', 'Marriage certificates - DHA #3459', 'Zone C - Shelf C-01-03', 3, 'active', 1),
('DOCKET-2024-0020', 'DHA-2024-3460', 4, 13, 'RFID-020-567894', 'BAR-020-567894', 'legal', 'Death certificates - DHA #3460', 'Zone C - Shelf C-01-03', 3, 'active', 1);

-- =============================================
-- INSERT RFID READERS
-- =============================================

INSERT INTO rfid_readers (reader_code, reader_name, reader_type, manufacturer, model, serial_number, ip_address, location, zone_id, antenna_count, read_range_meters, status, firmware_version) VALUES
('READER-001', 'Main Entrance Portal', 'portal', 'Zebra', 'FX9600', 'FX9600-001', '192.168.1.101', 'Building A - Main Entrance', NULL, 4, 10.0, 'online', 'v2.8.1'),
('READER-002', 'Zone A Entry', 'portal', 'Zebra', 'FX9600', 'FX9600-002', '192.168.1.102', 'Zone A - Entry Point', 1, 4, 10.0, 'online', 'v2.8.1'),
('READER-003', 'Zone B Entry', 'portal', 'Zebra', 'FX9600', 'FX9600-003', '192.168.1.103', 'Zone B - Entry Point', 2, 4, 10.0, 'online', 'v2.8.1'),
('READER-004', 'Zone C Entry', 'portal', 'Zebra', 'FX9600', 'FX9600-004', '192.168.1.104', 'Zone C - Entry Point', 3, 4, 10.0, 'offline', 'v2.8.1'),
('READER-005', 'Zone D Entry', 'portal', 'Zebra', 'FX9600', 'FX9600-005', '192.168.1.105', 'Zone D - Entry Point', 4, 4, 10.0, 'online', 'v2.8.1'),
('READER-006', 'Zone A Overhead 1', 'overhead', 'Zebra', 'FX9600', 'FX9600-006', '192.168.1.106', 'Zone A - Grid 1', 1, 4, 8.0, 'online', 'v2.8.1'),
('READER-007', 'Zone A Overhead 2', 'overhead', 'Zebra', 'FX9600', 'FX9600-007', '192.168.1.107', 'Zone A - Grid 2', 1, 4, 8.0, 'online', 'v2.8.1'),
('READER-008', 'Zone B Overhead 1', 'overhead', 'Zebra', 'FX9600', 'FX9600-008', '192.168.1.108', 'Zone B - Grid 1', 2, 4, 8.0, 'online', 'v2.8.1'),
('HANDHELD-001', 'Mobile Scanner 1', 'handheld', 'Zebra', 'MC3390R', 'MC3390R-001', 'DHCP', 'Mobile', NULL, 1, 3.0, 'online', 'v1.5.2'),
('HANDHELD-002', 'Mobile Scanner 2', 'handheld', 'Zebra', 'MC3390R', 'MC3390R-002', 'DHCP', 'Mobile', NULL, 1, 3.0, 'online', 'v1.5.2');

-- =============================================
-- INSERT BILLING RATES
-- =============================================

INSERT INTO billing_rates (service_type, tier, rate, unit, description) VALUES
('storage', 'standard', 40.00, 'per_box_month', 'Standard storage rate per box per month'),
('storage', 'professional', 38.00, 'per_box_month', 'Professional tier storage rate (5% discount)'),
('storage', 'enterprise', 35.00, 'per_box_month', 'Enterprise tier storage rate (12.5% discount)'),
('retrieval_normal', 'all', 0.00, 'per_retrieval', 'Normal retrieval (2-hour service) - Free'),
('retrieval_urgent', 'all', 50.00, 'per_retrieval', 'Urgent retrieval (30-minute service)'),
('bulk_transfer', 'all', 500.00, 'per_batch', 'Bulk transfer service per batch');

-- =============================================
-- INSERT SAMPLE MOVEMENTS
-- =============================================

INSERT INTO docket_movements (docket_id, from_location, to_location, from_zone_id, to_zone_id, from_box_id, to_box_id, movement_type, movement_reason, performed_by) VALUES
(1, 'Receiving Area', 'Zone A - Shelf A-01-01', NULL, 1, NULL, 1, 'check-in', 'Initial storage', 5),
(2, 'Receiving Area', 'Zone A - Shelf A-01-01', NULL, 1, NULL, 1, 'check-in', 'Initial storage', 5),
(6, 'Zone A - Shelf A-01-04', 'Evidence Room', 1, NULL, 4, NULL, 'check-out', 'Court presentation', 5),
(6, 'Evidence Room', 'Zone A - Shelf A-01-04', NULL, 1, NULL, 4, 'check-in', 'Returned from court', 5),
(11, 'Zone B - Shelf B-01-03', 'Court Room 5', 2, NULL, 8, NULL, 'check-out', 'Active case review', 5);

-- =============================================
-- INSERT SAMPLE RFID EVENTS
-- =============================================

INSERT INTO rfid_events (event_type, reader_id, docket_id, rfid_tag, signal_strength, antenna_number, direction, event_timestamp) VALUES
('entry', 1, 1, 'RFID-001-234567', 92, 1, 'in', NOW() - INTERVAL '2 hours'),
('read', 2, 1, 'RFID-001-234567', 88, 2, 'pass', NOW() - INTERVAL '1 hour 55 minutes'),
('entry', 1, 6, 'RFID-006-345678', 95, 1, 'in', NOW() - INTERVAL '1 hour'),
('exit', 2, 6, 'RFID-006-345678', 90, 3, 'out', NOW() - INTERVAL '30 minutes'),
('entry', 1, 11, 'RFID-011-456789', 87, 1, 'in', NOW() - INTERVAL '45 minutes');

-- =============================================
-- INSERT SAMPLE INVOICES
-- =============================================

INSERT INTO invoices (invoice_number, client_id, billing_period_start, billing_period_end, storage_box_count, storage_fees, total_amount, status, due_date, created_by) VALUES
('INV-2024-0001', 1, '2024-01-01', '2024-01-31', 5, 175.00, 175.00, 'paid', '2024-02-15', 1),
('INV-2024-0002', 2, '2024-01-01', '2024-01-31', 5, 190.00, 190.00, 'paid', '2024-02-15', 1),
('INV-2024-0003', 3, '2024-01-01', '2024-01-31', 3, 120.00, 120.00, 'pending', '2024-02-15', 1),
('INV-2024-0004', 4, '2024-01-01', '2024-01-31', 3, 114.00, 114.00, 'pending', '2024-02-15', 1),
('INV-2024-0005', 5, '2024-01-01', '2024-01-31', 4, 140.00, 140.00, 'overdue', '2024-02-10', 1);

-- =============================================
-- INSERT SAMPLE RETRIEVAL REQUESTS
-- =============================================

INSERT INTO retrieval_requests (request_number, client_id, requested_by, urgency, status, total_items, retrieval_fee, notes) VALUES
('REQ-2024-0001', 1, 2, 'urgent', 'completed', 2, 100.00, 'Urgent court case'),
('REQ-2024-0002', 2, 3, 'normal', 'processing', 1, 0.00, 'Evidence review'),
('REQ-2024-0003', 3, 4, 'normal', 'pending', 3, 0.00, 'Monthly audit');

INSERT INTO retrieval_request_items (request_id, docket_id, status) VALUES
(1, 1, 'completed'),
(1, 2, 'completed'),
(2, 6, 'pending'),
(3, 11, 'pending'),
(3, 12, 'pending'),
(3, 13, 'pending');

-- =============================================
-- UPDATE STATISTICS
-- =============================================

-- Update storage zone utilization
UPDATE storage_zones SET 
    used_capacity = (
        SELECT COUNT(DISTINCT d.id) 
        FROM dockets d 
        WHERE d.current_zone_id = storage_zones.id
    )
WHERE id IN (1,2,3,4,5);

-- Update box occupied counts
UPDATE storage_boxes SET 
    occupied = (
        SELECT COUNT(*) 
        FROM dockets 
        WHERE storage_box_id = storage_boxes.id
    );

-- =============================================
-- DISPLAY SUMMARY
-- =============================================

SELECT 'Database seeded successfully!' as message;
SELECT 'Users created: ' || COUNT(*) FROM users;
SELECT 'Clients created: ' || COUNT(*) FROM clients;
SELECT 'Storage zones created: ' || COUNT(*) FROM storage_zones;
SELECT 'Storage boxes created: ' || COUNT(*) FROM storage_boxes;
SELECT 'Dockets created: ' || COUNT(*) FROM dockets;
SELECT 'RFID readers created: ' || COUNT(*) FROM rfid_readers;