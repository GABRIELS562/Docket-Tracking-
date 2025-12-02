-- ============================================================================
-- Development Seed Data
-- Description: Sample data for development and testing
-- WARNING: This will truncate all tables and insert fresh test data
-- ============================================================================

-- Clear existing data (be careful in production!)
TRUNCATE TABLE docket_location_history CASCADE;
TRUNCATE TABLE dockets CASCADE;
TRUNCATE TABLE readers CASCADE;
TRUNCATE TABLE zones CASCADE;

-- ============================================================================
-- Seed Zones
-- ============================================================================

INSERT INTO zones (zone_id, zone_name, zone_type, capacity) VALUES
  (1, 'Evidence Storage A', 'storage', 10000),
  (2, 'Evidence Storage B', 'storage', 10000),
  (3, 'Ballistics Lab', 'lab', 500),
  (4, 'DNA Lab', 'lab', 500),
  (5, 'Toxicology Lab', 'lab', 300),
  (6, 'Main Corridor', 'corridor', 100),
  (7, 'Secure Entrance', 'entrance', 50),
  (8, 'Office Area', 'office', 200)
ON CONFLICT (zone_id) DO NOTHING;

-- ============================================================================
-- Seed RFID Readers
-- ============================================================================

INSERT INTO readers (reader_id, reader_name, ip_address, zone_id, status, configuration) VALUES
  ('FX7500-01', 'Storage A - North', '192.168.1.101', 1, 'offline', '{"transmitPower": 25, "antennas": [1,2,3,4], "readInterval": 1000, "rssiThreshold": -80}'),
  ('FX7500-02', 'Storage A - South', '192.168.1.102', 1, 'offline', '{"transmitPower": 25, "antennas": [1,2,3,4], "readInterval": 1000, "rssiThreshold": -80}'),
  ('FX7500-03', 'Storage B - North', '192.168.1.103', 2, 'offline', '{"transmitPower": 25, "antennas": [1,2,3,4], "readInterval": 1000, "rssiThreshold": -80}'),
  ('FX7500-04', 'Storage B - South', '192.168.1.104', 2, 'offline', '{"transmitPower": 25, "antennas": [1,2,3,4], "readInterval": 1000, "rssiThreshold": -80}'),
  ('FX7500-05', 'Ballistics Lab', '192.168.1.105', 3, 'offline', '{"transmitPower": 20, "antennas": [1,2], "readInterval": 1000, "rssiThreshold": -75}'),
  ('FX7500-06', 'DNA Lab', '192.168.1.106', 4, 'offline', '{"transmitPower": 20, "antennas": [1,2], "readInterval": 1000, "rssiThreshold": -75}'),
  ('FX7500-07', 'Toxicology Lab', '192.168.1.107', 5, 'offline', '{"transmitPower": 20, "antennas": [1,2], "readInterval": 1000, "rssiThreshold": -75}'),
  ('FX7500-08', 'Main Entrance', '192.168.1.108', 7, 'offline', '{"transmitPower": 22, "antennas": [1,2,3,4], "readInterval": 500, "rssiThreshold": -75}')
ON CONFLICT (reader_id) DO NOTHING;

-- ============================================================================
-- Seed Dockets (Sample Evidence Items)
-- ============================================================================

INSERT INTO dockets (lab_number, case_reference, rfid_tag_epc, current_zone_id, status, metadata) VALUES
  ('FSL-2024-000001', 'Armed Robbery - Main Street', 'E280116060002004DECA48DA', 1, 'active', '{"evidenceType": "firearm", "officer": "Smith", "priority": "high"}'),
  ('FSL-2024-000002', 'Assault - Park Avenue', 'E28011606000204DECA48DB', 1, 'active', '{"evidenceType": "weapon", "officer": "Jones", "priority": "medium"}'),
  ('FSL-2024-000003', 'Burglary - Oak Road', 'E28011606000204DECA48DC', 2, 'active', '{"evidenceType": "electronics", "officer": "Brown", "priority": "low"}'),
  ('FSL-2024-000004', 'Murder - Pine Street', 'E28011606000204DECA48DD', 3, 'active', '{"evidenceType": "ballistic", "officer": "Davis", "priority": "critical"}'),
  ('FSL-2024-000005', 'Sexual Assault - Elm Avenue', 'E28011606000204DECA48DE', 4, 'active', '{"evidenceType": "biological", "officer": "Wilson", "priority": "high"}'),
  ('FSL-2024-000006', 'Drug Trafficking - First Street', 'E28011606000204DECA48DF', 5, 'active', '{"evidenceType": "narcotics", "officer": "Taylor", "priority": "high"}'),
  ('FSL-2024-000007', 'Theft - Second Avenue', 'E28011606000204DECA48E0', 2, 'active', '{"evidenceType": "jewelry", "officer": "Anderson", "priority": "low"}'),
  ('FSL-2024-000008', 'Arson - Third Street', 'E28011606000204DECA48E1', 3, 'active', '{"evidenceType": "accelerant", "officer": "Thomas", "priority": "medium"}'),
  ('FSL-2023-005432', 'Historical Case - Closed', 'E28011606000204DECA48E2', 1, 'archived', '{"evidenceType": "document", "officer": "Martinez", "priority": "low"}'),
  ('FSL-2024-000009', 'Missing Person - Fourth Ave', 'E28011606000204DECA48E3', NULL, 'missing', '{"evidenceType": "personal", "officer": "Garcia", "priority": "critical"}')
ON CONFLICT (lab_number) DO NOTHING;

-- Update zone occupancies based on current dockets
UPDATE zones SET current_occupancy = (
  SELECT COUNT(*) FROM dockets WHERE dockets.current_zone_id = zones.zone_id AND dockets.status = 'active'
);

-- ============================================================================
-- Seed Location History (Sample RFID Reads)
-- ============================================================================

-- Generate random location history for the past 7 days
INSERT INTO docket_location_history (timestamp, lab_number, rfid_tag_epc, reader_id, zone_id, rssi, antenna_port, confidence_score)
SELECT
  NOW() - (random() * INTERVAL '7 days') AS timestamp,
  d.lab_number,
  d.rfid_tag_epc,
  r.reader_id,
  r.zone_id,
  (-30 - (random() * 50))::INTEGER AS rssi,  -- Random RSSI between -30 and -80
  (1 + (random() * 3))::INTEGER AS antenna_port,  -- Random antenna 1-4
  CASE
    WHEN random() < 0.7 THEN (0.7 + random() * 0.3)::NUMERIC(3,2)  -- 70% high confidence (0.7-1.0)
    WHEN random() < 0.9 THEN (0.4 + random() * 0.3)::NUMERIC(3,2)  -- 20% medium confidence (0.4-0.7)
    ELSE (0.1 + random() * 0.3)::NUMERIC(3,2)  -- 10% low confidence (0.1-0.4)
  END AS confidence_score
FROM dockets d
CROSS JOIN LATERAL (
  SELECT reader_id, zone_id
  FROM readers
  WHERE zone_id = d.current_zone_id
  LIMIT 1
) r
WHERE d.current_zone_id IS NOT NULL AND d.status = 'active'
ORDER BY random()
LIMIT 5000;

-- Add some recent high-confidence reads (last 24 hours)
INSERT INTO docket_location_history (timestamp, lab_number, rfid_tag_epc, reader_id, zone_id, rssi, antenna_port, confidence_score)
SELECT
  NOW() - (random() * INTERVAL '24 hours') AS timestamp,
  d.lab_number,
  d.rfid_tag_epc,
  r.reader_id,
  r.zone_id,
  (-35 - (random() * 20))::INTEGER AS rssi,  -- Better RSSI: -35 to -55
  (1 + (random() * 3))::INTEGER AS antenna_port,
  (0.8 + random() * 0.2)::NUMERIC(3,2) AS confidence_score  -- High confidence: 0.8-1.0
FROM dockets d
CROSS JOIN LATERAL (
  SELECT reader_id, zone_id
  FROM readers
  WHERE zone_id = d.current_zone_id
  LIMIT 1
) r
WHERE d.current_zone_id IS NOT NULL AND d.status = 'active'
ORDER BY random()
LIMIT 1000;

-- Add some movement history (docket moving between zones)
INSERT INTO docket_location_history (timestamp, lab_number, rfid_tag_epc, reader_id, zone_id, rssi, antenna_port, confidence_score)
VALUES
  -- FSL-2024-000004 moved from Storage to Ballistics Lab
  (NOW() - INTERVAL '2 days', 'FSL-2024-000004', 'E28011606000204DECA48DD', 'FX7500-01', 1, -45, 2, 0.85),
  (NOW() - INTERVAL '2 days' + INTERVAL '10 minutes', 'FSL-2024-000004', 'E28011606000204DECA48DD', 'FX7500-05', 3, -42, 1, 0.92),

  -- FSL-2024-000005 moved from Storage to DNA Lab
  (NOW() - INTERVAL '3 days', 'FSL-2024-000005', 'E28011606000204DECA48DE', 'FX7500-02', 1, -48, 3, 0.78),
  (NOW() - INTERVAL '3 days' + INTERVAL '15 minutes', 'FSL-2024-000005', 'E28011606000204DECA48DE', 'FX7500-06', 4, -40, 2, 0.88),

  -- FSL-2024-000006 moved from Storage to Toxicology
  (NOW() - INTERVAL '1 day', 'FSL-2024-000006', 'E28011606000204DECA48DF', 'FX7500-03', 2, -50, 1, 0.75),
  (NOW() - INTERVAL '1 day' + INTERVAL '20 minutes', 'FSL-2024-000006', 'E28011606000204DECA48DF', 'FX7500-07', 5, -38, 4, 0.90)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Update last_seen_at for dockets based on location history
-- ============================================================================

UPDATE dockets d
SET last_seen_at = (
  SELECT MAX(timestamp)
  FROM docket_location_history dlh
  WHERE dlh.lab_number = d.lab_number
)
WHERE EXISTS (
  SELECT 1 FROM docket_location_history dlh WHERE dlh.lab_number = d.lab_number
);

-- ============================================================================
-- Update reader last_seen_at
-- ============================================================================

UPDATE readers r
SET last_seen_at = (
  SELECT MAX(timestamp)
  FROM docket_location_history dlh
  WHERE dlh.reader_id = r.reader_id
)
WHERE EXISTS (
  SELECT 1 FROM docket_location_history dlh WHERE dlh.reader_id = r.reader_id
);

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Display summary
DO $$
DECLARE
  zone_count INTEGER;
  reader_count INTEGER;
  docket_count INTEGER;
  history_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO zone_count FROM zones;
  SELECT COUNT(*) INTO reader_count FROM readers;
  SELECT COUNT(*) INTO docket_count FROM dockets;
  SELECT COUNT(*) INTO history_count FROM docket_location_history;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Development Seed Data - Summary';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Zones created: %', zone_count;
  RAISE NOTICE 'Readers created: %', reader_count;
  RAISE NOTICE 'Dockets created: %', docket_count;
  RAISE NOTICE 'Location history records: %', history_count;
  RAISE NOTICE '========================================';
END $$;

-- Show zone occupancy
SELECT
  zone_id,
  zone_name,
  zone_type,
  current_occupancy,
  capacity,
  ROUND((current_occupancy::NUMERIC / capacity) * 100, 2) AS occupancy_percentage
FROM zones
ORDER BY zone_id;

-- Show docket distribution
SELECT
  z.zone_name,
  d.status,
  COUNT(*) AS docket_count
FROM dockets d
LEFT JOIN zones z ON d.current_zone_id = z.zone_id
GROUP BY z.zone_name, d.status
ORDER BY z.zone_name, d.status;
