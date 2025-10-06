import { Zone, Docket, Reader, OccupancyData, DistributionSummary, ReaderActivity } from './api';

// Mock Zones
export const mockZones: Zone[] = [
  {
    zoneId: 1,
    zoneName: 'Explosives Lab',
    zoneType: 'lab',
    capacity: 150,
    currentOccupancy: 87,
    occupancyPercentage: 58,
    readers: ['READER-001', 'READER-002'],
  },
  {
    zoneId: 2,
    zoneName: 'Chemistry Lab',
    zoneType: 'lab',
    capacity: 200,
    currentOccupancy: 143,
    occupancyPercentage: 72,
    readers: ['READER-003', 'READER-004'],
  },
  {
    zoneId: 3,
    zoneName: 'Fraud Lab',
    zoneType: 'lab',
    capacity: 180,
    currentOccupancy: 156,
    occupancyPercentage: 87,
    readers: ['READER-005', 'READER-006'],
  },
  {
    zoneId: 4,
    zoneName: 'Biology Lab',
    zoneType: 'lab',
    capacity: 160,
    currentOccupancy: 92,
    occupancyPercentage: 58,
    readers: ['READER-007', 'READER-008'],
  },
  {
    zoneId: 5,
    zoneName: 'Ballistics Lab',
    zoneType: 'lab',
    capacity: 140,
    currentOccupancy: 118,
    occupancyPercentage: 84,
    readers: ['READER-009', 'READER-010'],
  },
  {
    zoneId: 6,
    zoneName: 'Security Hub',
    zoneType: 'office',
    capacity: 50,
    currentOccupancy: 12,
    occupancyPercentage: 24,
    readers: ['READER-011'],
  },
  {
    zoneId: 7,
    zoneName: 'Main Entrance',
    zoneType: 'entrance',
    capacity: 100,
    currentOccupancy: 34,
    occupancyPercentage: 34,
    readers: ['READER-012', 'READER-013'],
  },
  {
    zoneId: 8,
    zoneName: 'Auditorium',
    zoneType: 'office',
    capacity: 120,
    currentOccupancy: 28,
    occupancyPercentage: 23,
    readers: ['READER-014'],
  },
];

// Mock Readers
export const mockReaders: Reader[] = [
  { readerId: 'READER-001', readerName: 'Explosives Lab - North', ipAddress: '192.168.1.101', zoneId: 1, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-002', readerName: 'Explosives Lab - South', ipAddress: '192.168.1.102', zoneId: 1, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-003', readerName: 'Chemistry Lab - North', ipAddress: '192.168.1.103', zoneId: 2, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-004', readerName: 'Chemistry Lab - South', ipAddress: '192.168.1.104', zoneId: 2, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-005', readerName: 'Fraud Lab - North', ipAddress: '192.168.1.105', zoneId: 3, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-006', readerName: 'Fraud Lab - South', ipAddress: '192.168.1.106', zoneId: 3, status: 'offline', lastSeenAt: new Date(Date.now() - 300000).toISOString() },
  { readerId: 'READER-007', readerName: 'Biology Lab - North', ipAddress: '192.168.1.107', zoneId: 4, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-008', readerName: 'Biology Lab - South', ipAddress: '192.168.1.108', zoneId: 4, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-009', readerName: 'Ballistics Lab - North', ipAddress: '192.168.1.109', zoneId: 5, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-010', readerName: 'Ballistics Lab - South', ipAddress: '192.168.1.110', zoneId: 5, status: 'error', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-011', readerName: 'Security Hub - Central', ipAddress: '192.168.1.111', zoneId: 6, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-012', readerName: 'Main Entrance - Entry', ipAddress: '192.168.1.112', zoneId: 7, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-013', readerName: 'Main Entrance - Exit', ipAddress: '192.168.1.113', zoneId: 7, status: 'online', lastSeenAt: new Date().toISOString() },
  { readerId: 'READER-014', readerName: 'Auditorium - Central', ipAddress: '192.168.1.114', zoneId: 8, status: 'online', lastSeenAt: new Date().toISOString() },
];

// Generate Mock Dockets
function generateMockDockets(count: number): Docket[] {
  const caseTypes = ['Murder', 'Robbery', 'Fraud', 'Assault', 'Theft', 'Arson'];
  const statuses: ('active' | 'archived' | 'missing')[] = ['active', 'active', 'active', 'archived', 'missing'];
  const zones = mockZones.filter(z => z.zoneType === 'lab');

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

// Mock Analytics Data
export const mockOccupancyData: OccupancyData[] = Array.from({ length: 24 }, (_, i) => {
  const hour = new Date();
  hour.setHours(hour.getHours() - (23 - i));

  return {
    timestamp: hour.toISOString(),
    zones: {
      'Explosives Lab': Math.floor(50 + Math.random() * 100),
      'Chemistry Lab': Math.floor(70 + Math.random() * 130),
      'Fraud Lab': Math.floor(80 + Math.random() * 100),
      'Biology Lab': Math.floor(40 + Math.random() * 120),
      'Ballistics Lab': Math.floor(60 + Math.random() * 80),
    },
  };
});

export const mockDistribution: DistributionSummary = {
  total: 670,
  activeZones: 5,
  avgOccupancy: 119,
  peakZone: 'Fraud Lab',
  zones: [
    { name: 'Explosives Lab', value: 87, color: '#3b82f6' },
    { name: 'Chemistry Lab', value: 143, color: '#a855f7' },
    { name: 'Fraud Lab', value: 156, color: '#ec4899' },
    { name: 'Biology Lab', value: 92, color: '#10b981' },
    { name: 'Ballistics Lab', value: 118, color: '#f59e0b' },
    { name: 'Security Hub', value: 12, color: '#6b7280' },
    { name: 'Main Entrance', value: 34, color: '#8b5cf6' },
    { name: 'Auditorium', value: 28, color: '#06b6d4' },
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
