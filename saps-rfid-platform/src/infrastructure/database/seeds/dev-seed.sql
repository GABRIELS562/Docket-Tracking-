-- ============================================================================
-- Development Seed Data
-- Description: Sample data for development and testing
-- ============================================================================

-- Clear existing data (be careful in production!)
TRUNCATE TABLE location_history CASCADE;
TRUNCATE TABLE dockets CASCADE;
TRUNCATE TABLE readers CASCADE;
TRUNCATE TABLE zones CASCADE;

-- ============================================================================
-- Seed Zones
-- ============================================================================

INSERT INTO zones (id, name, code, description, zone_type, capacity, floor_number, building, coordinates) VALUES
-- Storage zones
('11111111-1111-1111-1111-111111111111', 'Evidence Storage - A', 'STOR-A', 'Primary evidence storage area - Section A', 'storage', 500, 1, 'Main Building', '{"x": 10.00, "y": 20.00, "z": 0.00}'::jsonb),
('11111111-1111-1111-1111-111111111112', 'Evidence Storage - B', 'STOR-B', 'Primary evidence storage area - Section B', 'storage', 500, 1, 'Main Building', '{"x": 10.00, "y": 40.00, "z": 0.00}'::jsonb),
('11111111-1111-1111-1111-111111111113', 'Evidence Storage - C', 'STOR-C', 'Primary evidence storage area - Section C', 'storage', 300, 1, 'Main Building', '{"x": 10.00, "y": 60.00, "z": 0.00}'::jsonb),

-- Examination zones
('22222222-2222-2222-2222-222222222221', 'Ballistics Lab', 'EXAM-BALL', 'Firearm and ballistics examination', 'examination', 50, 2, 'Main Building', '{"x": 30.00, "y": 20.00, "z": 3.50}'::jsonb),
('22222222-2222-2222-2222-222222222222', 'Digital Forensics Lab', 'EXAM-DIG', 'Digital evidence examination', 'examination', 30, 2, 'Main Building', '{"x": 30.00, "y": 40.00, "z": 3.50}'::jsonb),
('22222222-2222-2222-2222-222222222223', 'Biology Lab', 'EXAM-BIO', 'Biological evidence examination', 'examination', 40, 2, 'Main Building', '{"x": 30.00, "y": 60.00, "z": 3.50}'::jsonb),
('22222222-2222-2222-2222-222222222224', 'Chemistry Lab', 'EXAM-CHEM', 'Chemical analysis laboratory', 'examination', 35, 2, 'Main Building', '{"x": 30.00, "y": 80.00, "z": 3.50}'::jsonb),

-- Transit zones
('33333333-3333-3333-3333-333333333331', 'Receiving Bay', 'TRANS-RCV', 'Evidence receiving and intake area', 'transit', 100, 0, 'Main Building', '{"x": 0.00, "y": 50.00, "z": -1.00}'::jsonb),
('33333333-3333-3333-3333-333333333332', 'Dispatch Bay', 'TRANS-DIS', 'Evidence dispatch and return area', 'transit', 100, 0, 'Main Building', '{"x": 0.00, "y": 70.00, "z": -1.00}'::jsonb),

-- Archive zone
('44444444-4444-4444-4444-444444444441', 'Long-term Archive', 'ARCH-LT', 'Long-term evidence archive storage', 'archive', 1000, -1, 'Archive Building', '{"x": 50.00, "y": 50.00, "z": -3.00}'::jsonb);

-- ============================================================================
-- Seed RFID Readers
-- ============================================================================

INSERT INTO readers (id, name, ip_address, port, zone_id, reader_model, serial_number, antenna_count, configuration, status) VALUES
-- Storage area readers
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Reader-STOR-A-01', '192.168.1.101', 5084, '11111111-1111-1111-1111-111111111111', 'Zebra FX9600', 'FX9600-001', 4, '{"transmit_power": 31.5, "session": 2}'::jsonb, 'connected'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab', 'Reader-STOR-A-02', '192.168.1.102', 5084, '11111111-1111-1111-1111-111111111111', 'Zebra FX9600', 'FX9600-002', 4, '{"transmit_power": 31.5, "session": 2}'::jsonb, 'connected'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac', 'Reader-STOR-B-01', '192.168.1.103', 5084, '11111111-1111-1111-1111-111111111112', 'Zebra FX9600', 'FX9600-003', 4, '{"transmit_power": 31.5, "session": 2}'::jsonb, 'connected'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaad', 'Reader-STOR-C-01', '192.168.1.104', 5084, '11111111-1111-1111-1111-111111111113', 'Zebra FX9600', 'FX9600-004', 4, '{"transmit_power": 31.5, "session": 2}'::jsonb, 'connected'),

-- Examination lab readers
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Reader-BALL-01', '192.168.1.111', 5084, '22222222-2222-2222-2222-222222222221', 'Zebra FX7500', 'FX7500-001', 4, '{"transmit_power": 30.0, "session": 2}'::jsonb, 'connected'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc', 'Reader-DIG-01', '192.168.1.112', 5084, '22222222-2222-2222-2222-222222222222', 'Zebra FX7500', 'FX7500-002', 4, '{"transmit_power": 30.0, "session": 2}'::jsonb, 'connected'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbd', 'Reader-BIO-01', '192.168.1.113', 5084, '22222222-2222-2222-2222-222222222223', 'Zebra FX7500', 'FX7500-003', 4, '{"transmit_power": 30.0, "session": 2}'::jsonb, 'connected'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbe', 'Reader-CHEM-01', '192.168.1.114', 5084, '22222222-2222-2222-2222-222222222224', 'Zebra FX7500', 'FX7500-004', 4, '{"transmit_power": 30.0, "session": 2}'::jsonb, 'connected'),

-- Transit readers
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Reader-RCV-01', '192.168.1.121', 5084, '33333333-3333-3333-3333-333333333331', 'Impinj Speedway', 'R420-001', 4, '{"transmit_power": 28.0, "session": 2}'::jsonb, 'connected'),
('cccccccc-cccc-cccc-cccc-cccccccccccd', 'Reader-DIS-01', '192.168.1.122', 5084, '33333333-3333-3333-3333-333333333332', 'Impinj Speedway', 'R420-002', 4, '{"transmit_power": 28.0, "session": 2}'::jsonb, 'connected'),

-- Archive reader
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Reader-ARCH-01', '192.168.1.131', 5084, '44444444-4444-4444-4444-444444444441', 'Zebra FX9600', 'FX9600-005', 4, '{"transmit_power": 31.5, "session": 2}'::jsonb, 'connected');

-- ============================================================================
-- Seed Dockets (Sample Evidence Items)
-- ============================================================================

INSERT INTO dockets (id, lab_number, rfid_tag_epc, case_number, exhibit_number, description, category, current_zone_id, status) VALUES
-- Firearms
('d0000001-0000-0000-0000-000000000001', 'FSL-2025-000001', '300833B2DDD906C000000001', 'CAS-2025-0123', 'EXH-001', '9mm Pistol - Smith & Wesson', 'firearm', '11111111-1111-1111-1111-111111111111', 'registered'),
('d0000001-0000-0000-0000-000000000002', 'FSL-2025-000002', '300833B2DDD906C000000002', 'CAS-2025-0123', 'EXH-002', 'Spent casings (x12)', 'firearm', '11111111-1111-1111-1111-111111111111', 'registered'),
('d0000001-0000-0000-0000-000000000003', 'FSL-2025-000003', '300833B2DDD906C000000003', 'CAS-2025-0456', 'EXH-001', 'Rifle - AK-47', 'firearm', '22222222-2222-2222-2222-222222222221', 'in_examination'),

-- Drugs
('d0000002-0000-0000-0000-000000000001', 'FSL-2025-000004', '300833B2DDD906C000000004', 'CAS-2025-0789', 'EXH-001', 'Cocaine - 250g', 'drug', '22222222-2222-2222-2222-222222222224', 'in_examination'),
('d0000002-0000-0000-0000-000000000002', 'FSL-2025-000005', '300833B2DDD906C000000005', 'CAS-2025-0789', 'EXH-002', 'Heroin - 100g', 'drug', '11111111-1111-1111-1111-111111111112', 'registered'),

-- Digital evidence
('d0000003-0000-0000-0000-000000000001', 'FSL-2025-000006', '300833B2DDD906C000000006', 'CAS-2025-1011', 'EXH-001', 'iPhone 13 Pro', 'digital', '22222222-2222-2222-2222-222222222222', 'in_examination'),
('d0000003-0000-0000-0000-000000000002', 'FSL-2025-000007', '300833B2DDD906C000000007', 'CAS-2025-1011', 'EXH-002', 'Samsung Galaxy S22', 'digital', '22222222-2222-2222-2222-222222222222', 'in_examination'),
('d0000003-0000-0000-0000-000000000003', 'FSL-2025-000008', '300833B2DDD906C000000008', 'CAS-2025-1213', 'EXH-001', 'Laptop - Dell XPS', 'digital', '11111111-1111-1111-1111-111111111112', 'registered'),

-- Biological evidence
('d0000004-0000-0000-0000-000000000001', 'FSL-2025-000009', '300833B2DDD906C000000009', 'CAS-2025-1415', 'EXH-001', 'Blood sample - Victim', 'biological', '22222222-2222-2222-2222-222222222223', 'in_examination'),
('d0000004-0000-0000-0000-000000000002', 'FSL-2025-000010', '300833B2DDD906C000000010', 'CAS-2025-1415', 'EXH-002', 'Blood sample - Suspect', 'biological', '22222222-2222-2222-2222-222222222223', 'in_examination'),

-- Documents
('d0000005-0000-0000-0000-000000000001', 'FSL-2025-000011', '300833B2DDD906C000000011', 'CAS-2025-1617', 'EXH-001', 'Forged passport', 'document', '11111111-1111-1111-1111-111111111113', 'registered'),
('d0000005-0000-0000-0000-000000000002', 'FSL-2025-000012', '300833B2DDD906C000000012', 'CAS-2025-1617', 'EXH-002', 'Counterfeit currency', 'document', '11111111-1111-1111-1111-111111111113', 'registered'),

-- In transit
('d0000006-0000-0000-0000-000000000001', 'FSL-2025-000013', '300833B2DDD906C000000013', 'CAS-2025-1819', 'EXH-001', 'Knife - Kitchen knife', 'weapon', '33333333-3333-3333-3333-333333333331', 'in_transit'),
('d0000006-0000-0000-0000-000000000002', 'FSL-2025-000014', '300833B2DDD906C000000014', 'CAS-2025-2021', 'EXH-001', 'Clothing - Jacket', 'clothing', '33333333-3333-3333-3333-333333333331', 'in_transit'),

-- Archived
('d0000007-0000-0000-0000-000000000001', 'FSL-2024-005678', '300833B2DDD906C000000015', 'CAS-2024-0100', 'EXH-001', 'Firearm - Archived case', 'firearm', '44444444-4444-4444-4444-444444444441', 'archived');

-- Update zone occupancies
UPDATE zones SET current_occupancy = 3 WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE zones SET current_occupancy = 2 WHERE id = '11111111-1111-1111-1111-111111111112';
UPDATE zones SET current_occupancy = 2 WHERE id = '11111111-1111-1111-1111-111111111113';
UPDATE zones SET current_occupancy = 1 WHERE id = '22222222-2222-2222-2222-222222222221';
UPDATE zones SET current_occupancy = 2 WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE zones SET current_occupancy = 2 WHERE id = '22222222-2222-2222-2222-222222222223';
UPDATE zones SET current_occupancy = 1 WHERE id = '22222222-2222-2222-2222-222222222224';
UPDATE zones SET current_occupancy = 2 WHERE id = '33333333-3333-3333-3333-333333333331';
UPDATE zones SET current_occupancy = 1 WHERE id = '44444444-4444-4444-4444-444444444441';

-- ============================================================================
-- Seed Location History (Sample reads)
-- ============================================================================

-- Generate sample location history for the past 24 hours
INSERT INTO location_history (time, docket_id, lab_number, zone_id, zone_name, reader_id, reader_name, rfid_epc, antenna_port, rssi, event_type)
SELECT
    NOW() - (random() * INTERVAL '24 hours') AS time,
    d.id AS docket_id,
    d.lab_number,
    d.current_zone_id AS zone_id,
    z.name AS zone_name,
    r.id AS reader_id,
    r.name AS reader_name,
    d.rfid_tag_epc AS rfid_epc,
    (random() * 3 + 1)::INTEGER AS antenna_port,
    (-35 - (random() * 20))::DECIMAL(5,2) AS rssi,
    'tag_read' AS event_type
FROM dockets d
CROSS JOIN LATERAL (
    SELECT id, name FROM readers WHERE zone_id = d.current_zone_id LIMIT 1
) r
CROSS JOIN LATERAL (
    SELECT name FROM zones WHERE id = d.current_zone_id
) z
WHERE d.current_zone_id IS NOT NULL
ORDER BY random()
LIMIT 1000;

-- Add some zone entry/exit events
INSERT INTO location_history (time, docket_id, lab_number, zone_id, zone_name, reader_id, reader_name, rfid_epc, antenna_port, rssi, event_type)
SELECT
    NOW() - INTERVAL '2 hours',
    d.id,
    d.lab_number,
    d.current_zone_id,
    'Evidence Storage - A',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Reader-STOR-A-01',
    d.rfid_tag_epc,
    1,
    -42.5,
    'zone_entry'
FROM dockets d
WHERE d.current_zone_id = '11111111-1111-1111-1111-111111111111'
LIMIT 3;

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 'Seeding complete!' AS status;
SELECT COUNT(*) AS zones FROM zones;
SELECT COUNT(*) AS readers FROM readers;
SELECT COUNT(*) AS dockets FROM dockets;
SELECT COUNT(*) AS location_history_records FROM location_history;
