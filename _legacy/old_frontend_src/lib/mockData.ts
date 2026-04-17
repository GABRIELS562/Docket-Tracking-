import { Zone, Docket, Reader, OccupancyData, DistributionSummary, ReaderActivity } from './api';

// Mock Zones - Based on ACTUAL FSL-PAROW First Floor Architectural Drawing
export const mockZones: Zone[] = [
  // FAR LEFT - Large Office Space
  {
    zoneId: 1,
    zoneName: 'Office Accommodation',
    zoneType: 'office',
    capacity: 200,
    currentOccupancy: 45,
    occupancyPercentage: 23,
    readers: ['READER-001', 'READER-002'],
  },

  // TOP CURVED SECTION - Multiple small examination/lab rooms
  {
    zoneId: 2,
    zoneName: 'Exam Room 1',
    zoneType: 'lab',
    capacity: 80,
    currentOccupancy: 56,
    occupancyPercentage: 70,
    readers: ['READER-003'],
  },
  {
    zoneId: 3,
    zoneName: 'Exam Room 2',
    zoneType: 'lab',
    capacity: 80,
    currentOccupancy: 62,
    occupancyPercentage: 78,
    readers: ['READER-004'],
  },
  {
    zoneId: 4,
    zoneName: 'Exam Room 3',
    zoneType: 'lab',
    capacity: 80,
    currentOccupancy: 58,
    occupancyPercentage: 73,
    readers: ['READER-005'],
  },
  {
    zoneId: 5,
    zoneName: 'Exam Room 4',
    zoneType: 'lab',
    capacity: 80,
    currentOccupancy: 71,
    occupancyPercentage: 89,
    readers: ['READER-006'],
  },

  // CENTER - Large E.I.M.S Area (Evidence Information Management System)
  {
    zoneId: 6,
    zoneName: 'E.I.M.S Center',
    zoneType: 'storage',
    capacity: 500,
    currentOccupancy: 387,
    occupancyPercentage: 77,
    readers: ['READER-007', 'READER-008', 'READER-009'],
  },

  // RIGHT SIDE - Various offices and support rooms
  {
    zoneId: 7,
    zoneName: 'Admin Offices',
    zoneType: 'office',
    capacity: 100,
    currentOccupancy: 23,
    occupancyPercentage: 23,
    readers: ['READER-010'],
  },
  {
    zoneId: 8,
    zoneName: 'Support Services',
    zoneType: 'office',
    capacity: 60,
    currentOccupancy: 12,
    occupancyPercentage: 20,
    readers: ['READER-011'],
  },

  // STAIRWELL AREAS
  {
    zoneId: 9,
    zoneName: 'Main Stairwell',
    zoneType: 'corridor',
    capacity: 50,
    currentOccupancy: 8,
    occupancyPercentage: 16,
    readers: ['READER-012'],
  },

  // BOTTOM CURVED SECTION - Auditorium
  {
    zoneId: 10,
    zoneName: 'Auditorium',
    zoneType: 'office',
    capacity: 300,
    currentOccupancy: 78,
    occupancyPercentage: 26,
    readers: ['READER-013', 'READER-014'],
  },

  // ENTRANCE/RECEPTION
  {
    zoneId: 11,
    zoneName: 'Main Entrance',
    zoneType: 'entrance',
    capacity: 100,
    currentOccupancy: 34,
    occupancyPercentage: 34,
    readers: ['READER-015', 'READER-016'],
  },

  // STORAGE AREA
  {
    zoneId: 12,
    zoneName: 'Evidence Storage',
    zoneType: 'storage',
    capacity: 250,
    currentOccupancy: 198,
    occupancyPercentage: 79,
    readers: ['READER-017'],
  },
];

// Mock Readers - FSL-PAROW First Floor
export const mockReaders: Reader[] = [
  { readerId: 'READER-001', readerName: 'Office Accommodation - North', ipAddress: '192.168.1.101', zoneId: 1, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-002', readerName: 'Office Accommodation - South', ipAddress: '192.168.1.102', zoneId: 1, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-003', readerName: 'Exam Room 1 - Main', ipAddress: '192.168.1.103', zoneId: 2, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-004', readerName: 'Exam Room 2 - Main', ipAddress: '192.168.1.104', zoneId: 3, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-005', readerName: 'Exam Room 3 - Main', ipAddress: '192.168.1.105', zoneId: 4, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-006', readerName: 'Exam Room 4 - Main', ipAddress: '192.168.1.106', zoneId: 5, status: 'offline', lastSeenAt: new Date(Date.now() - 300000).toISOString() },
  { readerId: 'READER-007', readerName: 'E.I.M.S Center - West', ipAddress: '192.168.1.107', zoneId: 6, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-008', readerName: 'E.I.M.S Center - Central', ipAddress: '192.168.1.108', zoneId: 6, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-009', readerName: 'E.I.M.S Center - East', ipAddress: '192.168.1.109', zoneId: 6, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-010', readerName: 'Admin Offices - Main', ipAddress: '192.168.1.110', zoneId: 7, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-011', readerName: 'Support Services - Main', ipAddress: '192.168.1.111', zoneId: 8, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-012', readerName: 'Main Stairwell', ipAddress: '192.168.1.112', zoneId: 9, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-013', readerName: 'Auditorium - North', ipAddress: '192.168.1.113', zoneId: 10, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-014', readerName: 'Auditorium - South', ipAddress: '192.168.1.114', zoneId: 10, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-015', readerName: 'Main Entrance - Entry', ipAddress: '192.168.1.115', zoneId: 11, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-016', readerName: 'Main Entrance - Exit', ipAddress: '192.168.1.116', zoneId: 11, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-017', readerName: 'Evidence Storage - Main', ipAddress: '192.168.1.117', zoneId: 12, status: 'error', lastSeenAt: new Date().toISOString() },
];

// Generate Mock Dockets
function generateMockDockets(count: number): Docket[] {
  const caseTypes = ['Murder', 'Robbery', 'Fraud', 'Assault', 'Theft', 'Arson'];
  const statuses: ('active' | 'archived' | 'missing')[] = ['active', 'active', 'active', 'archived', 'missing'];
  // Use labs, storage, and exam rooms for docket storage
  const zones = mockZones.filter(z => z.zoneType === 'lab' || z.zoneType === 'storage' || z.zoneName.includes('Exam'));

  const dockets: Docket[] = [];

  for (let i = 0; i < count; i++) {
    const zone = zones[Math.floor(Math.random() * zones.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const caseType = caseTypes[Math.floor(Math.random() * caseTypes.length)];

    const labNumber = `SAP${String(2024000 + i).padStart(7, '0')}`;
    const caseReference = `CAS/${caseType.substring(0, 3).toUpperCase()}/${2024}/${String(1000 + i).padStart(4, '0')}`;
    const rfidEpc = `EPC${String(3000000000 + i).padStart(10, '0')}`;

    dockets.push({
      labNumber,
      caseReference,
      rfidEpc,
      currentZone: status === 'active' ? { id: zone.zoneId, name: zone.zoneName } : null,
      status,
      lastSeenAt: status === 'missing'
        ? new Date(Date.now() - 2000000).toISOString()
        : new Date(Date.now() - Math.random() * 3600000).toISOString(),
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
    });
  }

  return dockets;
}

export const mockDockets = generateMockDockets(670);

// Mock Analytics Data - FSL-PAROW First Floor
export const mockOccupancyData: OccupancyData[] = Array.from({ length: 24 }, (_, i) => {
  const hour = new Date();
  hour.setHours(hour.getHours() - (23 - i));

  return {
    timestamp: hour.toISOString(),
    zones: {
      'Office Accommodation': Math.floor(30 + Math.random() * 60),
      'E.I.M.S Center': Math.floor(300 + Math.random() * 200),
      'Exam Room 1': Math.floor(40 + Math.random() * 40),
      'Exam Room 2': Math.floor(40 + Math.random() * 40),
      'Exam Room 3': Math.floor(40 + Math.random() * 40),
      'Exam Room 4': Math.floor(40 + Math.random() * 40),
      'Evidence Storage': Math.floor(150 + Math.random() * 100),
      'Auditorium': Math.floor(50 + Math.random() * 100),
    },
  };
});

export const mockDistribution: DistributionSummary = {
  total: 1431,
  activeZones: 12,
  avgOccupancy: 119,
  peakZone: 'E.I.M.S Center',
  zones: [
    { name: 'Office Accommodation', value: 45, color: '#1e40af' },
    { name: 'Exam Room 1', value: 56, color: '#ec4899' },
    { name: 'Exam Room 2', value: 62, color: '#ec4899' },
    { name: 'Exam Room 3', value: 58, color: '#ec4899' },
    { name: 'Exam Room 4', value: 71, color: '#ec4899' },
    { name: 'E.I.M.S Center', value: 387, color: '#3b82f6' },
    { name: 'Admin Offices', value: 23, color: '#1e40af' },
    { name: 'Support Services', value: 12, color: '#1e40af' },
    { name: 'Main Stairwell', value: 8, color: '#6b7280' },
    { name: 'Auditorium', value: 78, color: '#8b5cf6' },
    { name: 'Main Entrance', value: 34, color: '#6b7280' },
    { name: 'Evidence Storage', value: 198, color: '#3b82f6' },
  ],
};

export const mockReaderActivity: ReaderActivity[] = mockReaders.map((reader) => ({
  readerId: reader.readerId,
  reads: Math.floor(Math.random() * 500) + 50,
  status: reader.status,
}));

// Simulated WebSocket Events
export function simulateRealtimeUpdates(callbacks: {
  onZoneOccupancy?: (data: { zoneId: number; occupancy: number }) => void;
  onReaderStatus?: (data: { readerId: string; status: 'online' | 'offline' | 'error' | 'connecting' }) => void;
  onOverCapacity?: (data: { zoneId: number; zoneName: string; occupancy: number; capacity: number }) => void;
}) {
  // Simulate zone occupancy changes every 10 seconds
  const occupancyInterval = setInterval(() => {
    const zone = mockZones[Math.floor(Math.random() * mockZones.length)];
    const change = Math.floor(Math.random() * 20) - 10;
    const newOccupancy = Math.max(0, Math.min(zone.capacity, zone.currentOccupancy + change));

    callbacks.onZoneOccupancy?.({ zoneId: zone.zoneId, occupancy: newOccupancy });

    // Check for overcapacity
    if (newOccupancy > zone.capacity) {
      callbacks.onOverCapacity?.({
        zoneId: zone.zoneId,
        zoneName: zone.zoneName,
        occupancy: newOccupancy,
        capacity: zone.capacity,
      });
    }
  }, 10000);

  // Simulate reader status changes every 30 seconds
  const statusInterval = setInterval(() => {
    const reader = mockReaders[Math.floor(Math.random() * mockReaders.length)];
    const statuses: ('online' | 'offline' | 'error')[] = ['online', 'online', 'online', 'offline', 'error'];
    const newStatus = statuses[Math.floor(Math.random() * statuses.length)];

    callbacks.onReaderStatus?.({ readerId: reader.readerId, status: newStatus });
  }, 30000);

  // Cleanup function
  return () => {
    clearInterval(occupancyInterval);
    clearInterval(statusInterval);
  };
}
