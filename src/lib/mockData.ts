import type {
  Zone,
  Item,
  ItemSummary,
  Reader,
  OccupancyData,
  DistributionSummary,
  ReaderActivity,
  PaginatedResponse,
  ItemCategory,
  ItemStatus,
  ItemMovementEvent,
  ZoneOccupancyEvent,
  ReaderStatusEvent,
  LegacyReaderStatus,
} from './types';

// ============================================================================
// Zone Configuration - Data-driven (no hardcoded positions)
// Zone positions are now computed by the visualization layer
// ============================================================================

export const mockZones: Zone[] = [
  {
    zoneId: 1,
    zoneName: 'Office Accommodation',
    zoneCode: 'OFF-001',
    zoneType: 'office',
    capacity: 2000,
    currentOccupancy: 450,
    occupancyPercentage: 23,
    readers: ['READER-001', 'READER-002'],
    isActive: true,
  },
  {
    zoneId: 2,
    zoneName: 'Processing Room 1',
    zoneCode: 'PROC-001',
    zoneType: 'processing',
    capacity: 8000,
    currentOccupancy: 5600,
    occupancyPercentage: 70,
    readers: ['READER-003'],
    isActive: true,
  },
  {
    zoneId: 3,
    zoneName: 'Processing Room 2',
    zoneCode: 'PROC-002',
    zoneType: 'processing',
    capacity: 8000,
    currentOccupancy: 6200,
    occupancyPercentage: 78,
    readers: ['READER-004'],
    isActive: true,
  },
  {
    zoneId: 4,
    zoneName: 'Processing Room 3',
    zoneCode: 'PROC-003',
    zoneType: 'processing',
    capacity: 8000,
    currentOccupancy: 5800,
    occupancyPercentage: 73,
    readers: ['READER-005'],
    isActive: true,
  },
  {
    zoneId: 5,
    zoneName: 'Processing Room 4',
    zoneCode: 'PROC-004',
    zoneType: 'processing',
    capacity: 8000,
    currentOccupancy: 7100,
    occupancyPercentage: 89,
    readers: ['READER-006'],
    isActive: true,
  },
  {
    zoneId: 6,
    zoneName: 'Central Storage',
    zoneCode: 'STOR-001',
    zoneType: 'storage',
    capacity: 150000,
    currentOccupancy: 115500,
    occupancyPercentage: 77,
    readers: ['READER-007', 'READER-008', 'READER-009'],
    isActive: true,
  },
  {
    zoneId: 7,
    zoneName: 'Admin Offices',
    zoneCode: 'OFF-002',
    zoneType: 'office',
    capacity: 1000,
    currentOccupancy: 230,
    occupancyPercentage: 23,
    readers: ['READER-010'],
    isActive: true,
  },
  {
    zoneId: 8,
    zoneName: 'Support Services',
    zoneCode: 'OFF-003',
    zoneType: 'office',
    capacity: 600,
    currentOccupancy: 120,
    occupancyPercentage: 20,
    readers: ['READER-011'],
    isActive: true,
  },
  {
    zoneId: 9,
    zoneName: 'Main Corridor',
    zoneCode: 'COR-001',
    zoneType: 'corridor',
    capacity: 500,
    currentOccupancy: 80,
    occupancyPercentage: 16,
    readers: ['READER-012'],
    isActive: true,
  },
  {
    zoneId: 10,
    zoneName: 'Conference Hall',
    zoneCode: 'OFF-004',
    zoneType: 'office',
    capacity: 3000,
    currentOccupancy: 780,
    occupancyPercentage: 26,
    readers: ['READER-013', 'READER-014'],
    isActive: true,
  },
  {
    zoneId: 11,
    zoneName: 'Main Entrance',
    zoneCode: 'ENT-001',
    zoneType: 'entrance',
    capacity: 1000,
    currentOccupancy: 340,
    occupancyPercentage: 34,
    readers: ['READER-015', 'READER-016'],
    isActive: true,
  },
  {
    zoneId: 12,
    zoneName: 'Archive Storage',
    zoneCode: 'STOR-002',
    zoneType: 'storage',
    capacity: 200000,
    currentOccupancy: 158000,
    occupancyPercentage: 79,
    readers: ['READER-017'],
    isActive: true,
  },
  {
    zoneId: 13,
    zoneName: 'Restricted Access',
    zoneCode: 'REST-001',
    zoneType: 'restricted',
    capacity: 50000,
    currentOccupancy: 42500,
    occupancyPercentage: 85,
    readers: ['READER-018', 'READER-019'],
    isActive: true,
  },
  {
    zoneId: 14,
    zoneName: 'Long-Term Storage',
    zoneCode: 'STOR-003',
    zoneType: 'storage',
    capacity: 100000,
    currentOccupancy: 87000,
    occupancyPercentage: 87,
    readers: ['READER-020'],
    isActive: true,
  },
];

// ============================================================================
// Reader Configuration
// ============================================================================

export const mockReaders: Reader[] = [
  {
    readerId: 'READER-001',
    readerName: 'Office Accommodation - North',
    ipAddress: '192.168.1.101',
    zoneId: 1,
    zoneName: 'Office Accommodation',
    status: 'online',
    lastSeenAt: new Date().toISOString(),
    totalReads: 15234,
    successRate: 99.2,
  },
  {
    readerId: 'READER-002',
    readerName: 'Office Accommodation - South',
    ipAddress: '192.168.1.102',
    zoneId: 1,
    zoneName: 'Office Accommodation',
    status: 'online',
    lastSeenAt: new Date().toISOString(),
    totalReads: 14876,
    successRate: 98.8,
  },
  {
    readerId: 'READER-003',
    readerName: 'Processing Room 1',
    ipAddress: '192.168.1.103',
    zoneId: 2,
    zoneName: 'Processing Room 1',
    status: 'online',
    lastSeenAt: new Date().toISOString(),
    totalReads: 45621,
    successRate: 99.5,
  },
  {
    readerId: 'READER-004',
    readerName: 'Processing Room 2',
    ipAddress: '192.168.1.104',
    zoneId: 3,
    zoneName: 'Processing Room 2',
    status: 'online',
    lastSeenAt: new Date().toISOString(),
    totalReads: 42387,
    successRate: 99.1,
  },
  {
    readerId: 'READER-005',
    readerName: 'Processing Room 3',
    ipAddress: '192.168.1.105',
    zoneId: 4,
    zoneName: 'Processing Room 3',
    status: 'online',
    lastSeenAt: new Date().toISOString(),
    totalReads: 38954,
    successRate: 98.9,
  },
  {
    readerId: 'READER-006',
    readerName: 'Processing Room 4',
    ipAddress: '192.168.1.106',
    zoneId: 5,
    zoneName: 'Processing Room 4',
    status: 'offline',
    lastSeenAt: new Date(Date.now() - 300000).toISOString(),
    totalReads: 41234,
    successRate: 97.5,
    errorMessage: 'Connection timeout',
  },
  {
    readerId: 'READER-007',
    readerName: 'Central Storage - West',
    ipAddress: '192.168.1.107',
    zoneId: 6,
    zoneName: 'Central Storage',
    status: 'online',
    lastSeenAt: new Date().toISOString(),
    totalReads: 156789,
    successRate: 99.7,
  },
  {
    readerId: 'READER-008',
    readerName: 'Central Storage - Central',
    ipAddress: '192.168.1.108',
    zoneId: 6,
    zoneName: 'Central Storage',
    status: 'online',
    lastSeenAt: new Date().toISOString(),
    totalReads: 167234,
    successRate: 99.8,
  },
  {
    readerId: 'READER-009',
    readerName: 'Central Storage - East',
    ipAddress: '192.168.1.109',
    zoneId: 6,
    zoneName: 'Central Storage',
    status: 'online',
    lastSeenAt: new Date().toISOString(),
    totalReads: 145678,
    successRate: 99.4,
  },
  {
    readerId: 'READER-010',
    readerName: 'Admin Offices',
    ipAddress: '192.168.1.110',
    zoneId: 7,
    zoneName: 'Admin Offices',
    status: 'online',
    lastSeenAt: new Date().toISOString(),
    totalReads: 8765,
    successRate: 99.0,
  },
  {
    readerId: 'READER-011',
    readerName: 'Support Services',
    ipAddress: '192.168.1.111',
    zoneId: 8,
    zoneName: 'Support Services',
    status: 'online',
    lastSeenAt: new Date().toISOString(),
    totalReads: 5432,
    successRate: 98.5,
  },
  {
    readerId: 'READER-012',
    readerName: 'Main Corridor',
    ipAddress: '192.168.1.112',
    zoneId: 9,
    zoneName: 'Main Corridor',
    status: 'online',
    lastSeenAt: new Date().toISOString(),
    totalReads: 234567,
    successRate: 99.9,
  },
  {
    readerId: 'READER-013',
    readerName: 'Conference Hall - North',
    ipAddress: '192.168.1.113',
    zoneId: 10,
    zoneName: 'Conference Hall',
    status: 'online',
    lastSeenAt: new Date().toISOString(),
    totalReads: 12345,
    successRate: 98.7,
  },
  {
    readerId: 'READER-014',
    readerName: 'Conference Hall - South',
    ipAddress: '192.168.1.114',
    zoneId: 10,
    zoneName: 'Conference Hall',
    status: 'online',
    lastSeenAt: new Date().toISOString(),
    totalReads: 11234,
    successRate: 98.3,
  },
  {
    readerId: 'READER-015',
    readerName: 'Main Entrance - Entry',
    ipAddress: '192.168.1.115',
    zoneId: 11,
    zoneName: 'Main Entrance',
    status: 'online',
    lastSeenAt: new Date().toISOString(),
    totalReads: 345678,
    successRate: 99.6,
  },
  {
    readerId: 'READER-016',
    readerName: 'Main Entrance - Exit',
    ipAddress: '192.168.1.116',
    zoneId: 11,
    zoneName: 'Main Entrance',
    status: 'online',
    lastSeenAt: new Date().toISOString(),
    totalReads: 342156,
    successRate: 99.5,
  },
  {
    readerId: 'READER-017',
    readerName: 'Archive Storage',
    ipAddress: '192.168.1.117',
    zoneId: 12,
    zoneName: 'Archive Storage',
    status: 'error',
    lastSeenAt: new Date().toISOString(),
    totalReads: 234567,
    successRate: 95.2,
    errorMessage: 'Antenna malfunction',
  },
  {
    readerId: 'READER-018',
    readerName: 'Restricted Access - Entry',
    ipAddress: '192.168.1.118',
    zoneId: 13,
    zoneName: 'Restricted Access',
    status: 'online',
    lastSeenAt: new Date().toISOString(),
    totalReads: 56789,
    successRate: 99.9,
  },
  {
    readerId: 'READER-019',
    readerName: 'Restricted Access - Exit',
    ipAddress: '192.168.1.119',
    zoneId: 13,
    zoneName: 'Restricted Access',
    status: 'online',
    lastSeenAt: new Date().toISOString(),
    totalReads: 54321,
    successRate: 99.8,
  },
  {
    readerId: 'READER-020',
    readerName: 'Long-Term Storage',
    ipAddress: '192.168.1.120',
    zoneId: 14,
    zoneName: 'Long-Term Storage',
    status: 'online',
    lastSeenAt: new Date().toISOString(),
    totalReads: 123456,
    successRate: 99.3,
  },
];

// ============================================================================
// Item Generation for Large Scale (500K items)
// Items are generated on-demand for pagination
// ============================================================================

const ITEM_CATEGORIES: ItemCategory[] = [
  'evidence',
  'equipment',
  'document',
  'sample',
  'consumable',
  'asset',
  'other',
];
const ALL_ITEM_STATUSES: ItemStatus[] = [
  'registered',
  'in_transit',
  'in_processing',
  'archived',
  'disposed',
  'missing',
];

// Distribution of items across zones (should match zone currentOccupancy)
const zoneItemCounts = new Map(mockZones.map((z) => [z.zoneId, z.currentOccupancy]));
const totalItems = Array.from(zoneItemCounts.values()).reduce((a, b) => a + b, 0);

/**
 * Generate a single mock item with consistent data based on index
 */
function generateMockItem(index: number, zoneId?: number): Item {
  // Deterministic zone assignment based on index if not specified
  let assignedZoneId = zoneId;
  if (!assignedZoneId) {
    let cumulative = 0;
    for (const [zId, count] of zoneItemCounts) {
      cumulative += count;
      if (index < cumulative) {
        assignedZoneId = zId;
        break;
      }
    }
    assignedZoneId = assignedZoneId || 6; // Default to Central Storage
  }

  const zone = mockZones.find((z) => z.zoneId === assignedZoneId)!;
  const year = 2024 + Math.floor(index / 100000);
  const itemNumber = `INV-${year}-${String(index % 100000).padStart(6, '0')}`;
  const referenceId = `REF/${year}/${String(Math.floor(index / 10) + 1000).padStart(6, '0')}`;

  // Deterministic but varied category and status
  const category = ITEM_CATEGORIES[index % ITEM_CATEGORIES.length];
  // Use distribution: 70% registered, 15% in_processing, 7% archived, 5% in_transit, 2% disposed, 1% missing
  const statusIndex = Math.floor((index * 7) % 100);
  const status: ItemStatus =
    statusIndex < 70
      ? ALL_ITEM_STATUSES[0] // registered
      : statusIndex < 85
        ? ALL_ITEM_STATUSES[2] // in_processing
        : statusIndex < 92
          ? ALL_ITEM_STATUSES[3] // archived
          : statusIndex < 97
            ? ALL_ITEM_STATUSES[1] // in_transit
            : statusIndex < 99
              ? ALL_ITEM_STATUSES[4] // disposed
              : ALL_ITEM_STATUSES[5]; // missing

  const descriptions = [
    'Tagged inventory item',
    'Standard tracking asset',
    'Documented material',
    'Registered equipment',
    'Catalogued sample',
  ];

  return {
    itemId: `item-${index}`,
    itemNumber,
    referenceId,
    rfidEpc: `E2801160${String(60000000 + index).padStart(16, '0')}`,
    description: `${descriptions[index % descriptions.length]} #${index}`,
    category,
    currentZone: status === 'missing' ? null : { id: assignedZoneId, name: zone.zoneName },
    status,
    lastSeenAt:
      status === 'missing'
        ? new Date(Date.now() - 86400000 * 7).toISOString()
        : new Date(Date.now() - Math.floor(index % 3600) * 1000).toISOString(),
    lastReaderId: status === 'missing' ? null : zone.readers[index % zone.readers.length],
    locationConfidence: status === 'missing' ? 0 : 85 + (index % 15),
    createdAt: new Date(Date.now() - 86400000 * (30 + (index % 365))).toISOString(),
    updatedAt: new Date(Date.now() - Math.floor(index % 86400) * 1000).toISOString(),
  };
}

/**
 * Get paginated items for a zone (simulates server-side pagination)
 */
export function getMockItemsForZone(
  zoneId: number,
  page: number = 1,
  limit: number = 50
): PaginatedResponse<Item> {
  const zone = mockZones.find((z) => z.zoneId === zoneId);
  if (!zone) {
    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    };
  }

  const total = zone.currentOccupancy;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;

  // Find the global index offset for this zone
  let globalOffset = 0;
  for (const [zId, count] of zoneItemCounts) {
    if (zId === zoneId) break;
    globalOffset += count;
  }

  const items: Item[] = [];
  for (let i = 0; i < limit && startIndex + i < total; i++) {
    items.push(generateMockItem(globalOffset + startIndex + i, zoneId));
  }

  return {
    data: items,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Search items across all zones (simulates server-side search)
 */
export function searchMockItems(
  query: string,
  page: number = 1,
  limit: number = 50
): PaginatedResponse<ItemSummary> {
  // Simple mock search - in reality this would be server-side
  const matchingIndices: number[] = [];
  const searchLower = query.toLowerCase();

  // Search first 10000 items for demo purposes
  for (let i = 0; i < Math.min(10000, totalItems); i++) {
    const item = generateMockItem(i);
    if (
      item.itemNumber.toLowerCase().includes(searchLower) ||
      item.referenceId.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower)
    ) {
      matchingIndices.push(i);
    }
  }

  const total = matchingIndices.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;

  const summaries: ItemSummary[] = matchingIndices
    .slice(startIndex, startIndex + limit)
    .map((idx) => {
      const item = generateMockItem(idx);
      return {
        itemId: item.itemId,
        itemNumber: item.itemNumber,
        referenceId: item.referenceId,
        status: item.status,
        currentZoneName: item.currentZone?.name ?? null,
        lastSeenAt: item.lastSeenAt,
      };
    });

  return {
    data: summaries,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

// ============================================================================
// Analytics Mock Data
// ============================================================================

export const mockOccupancyData: OccupancyData[] = Array.from({ length: 24 }, (_, i) => {
  const hour = new Date();
  hour.setHours(hour.getHours() - (23 - i));

  const zones: Record<string, number> = {};
  for (const zone of mockZones) {
    // Simulate hourly variation
    const variation = Math.sin((i + zone.zoneId) * 0.5) * 0.1;
    zones[zone.zoneName] = Math.floor(zone.currentOccupancy * (1 + variation));
  }

  return { timestamp: hour.toISOString(), zones };
});

export const mockDistribution: DistributionSummary = {
  total: totalItems,
  activeZones: mockZones.filter((z) => z.isActive).length,
  avgOccupancy: Math.round(totalItems / mockZones.length),
  peakZone: mockZones.reduce((max, z) => (z.currentOccupancy > max.currentOccupancy ? z : max))
    .zoneName,
  zones: mockZones.map((z, i) => ({
    name: z.zoneName,
    value: z.currentOccupancy,
    color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][i % 6],
    percentage: Math.round((z.currentOccupancy / totalItems) * 100),
  })),
};

export const mockReaderActivity: ReaderActivity[] = mockReaders.map((reader) => ({
  readerId: reader.readerId,
  readerName: reader.readerName,
  reads: reader.totalReads || Math.floor(Math.random() * 100000) + 10000,
  status: reader.status,
  lastReadAt: reader.lastSeenAt,
}));

// ============================================================================
// Real-time Event Simulation
// ============================================================================

export interface SimulationCallbacks {
  onZoneOccupancy?: (event: ZoneOccupancyEvent) => void;
  onReaderStatus?: (event: ReaderStatusEvent) => void;
  onItemMovement?: (event: ItemMovementEvent) => void;
  /** @deprecated Use onZoneOccupancy with percentage >= 100 check instead */
  onOverCapacity?: (data: {
    zoneId: number;
    zoneName: string;
    occupancy: number;
    capacity: number;
  }) => void;
}

export function simulateRealtimeUpdates(callbacks: SimulationCallbacks): () => void {
  // Simulate zone occupancy changes every 5 seconds
  const occupancyInterval = setInterval(() => {
    const zone = mockZones[Math.floor(Math.random() * mockZones.length)];
    const change = Math.floor(Math.random() * 20) - 10;
    const newOccupancy = Math.max(0, Math.min(zone.capacity * 1.1, zone.currentOccupancy + change));
    const percentage = Math.round((newOccupancy / zone.capacity) * 100);

    callbacks.onZoneOccupancy?.({
      zoneId: zone.zoneId,
      zoneName: zone.zoneName,
      occupancy: newOccupancy,
      capacity: zone.capacity,
      percentage,
    });

    // Legacy callback for overcapacity
    if (newOccupancy > zone.capacity) {
      callbacks.onOverCapacity?.({
        zoneId: zone.zoneId,
        zoneName: zone.zoneName,
        occupancy: newOccupancy,
        capacity: zone.capacity,
      });
    }
  }, 5000);

  // Simulate reader status changes every 30 seconds
  const statusInterval = setInterval(() => {
    const reader = mockReaders[Math.floor(Math.random() * mockReaders.length)];
    const statuses: LegacyReaderStatus[] = [
      'online',
      'online',
      'online',
      'online',
      'offline',
      'error',
    ];
    const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const previousStatus = reader.status as LegacyReaderStatus;

    if (newStatus !== previousStatus) {
      callbacks.onReaderStatus?.({
        readerId: reader.readerId,
        readerName: reader.readerName,
        status: newStatus,
        previousStatus: previousStatus,
      });
    }
  }, 30000);

  // Simulate item movements every 3 seconds
  const movementInterval = setInterval(() => {
    const fromZone = mockZones[Math.floor(Math.random() * mockZones.length)];
    const toZone = mockZones[Math.floor(Math.random() * mockZones.length)];

    if (fromZone.zoneId !== toZone.zoneId) {
      const itemIndex = Math.floor(Math.random() * 1000);
      const item = generateMockItem(itemIndex);

      callbacks.onItemMovement?.({
        itemId: item.itemId,
        itemNumber: item.itemNumber,
        fromZoneId: fromZone.zoneId,
        toZoneId: toZone.zoneId,
        fromZoneName: fromZone.zoneName,
        toZoneName: toZone.zoneName,
        readerId: toZone.readers[0],
        confidence: 85 + Math.floor(Math.random() * 15),
        timestamp: new Date().toISOString(),
      });
    }
  }, 3000);

  return () => {
    clearInterval(occupancyInterval);
    clearInterval(statusInterval);
    clearInterval(movementInterval);
  };
}

// ============================================================================
// Legacy Exports (for backwards compatibility during migration)
// ============================================================================

/** @deprecated Use Item type and getMockItemsForZone() */
export interface Docket {
  labNumber: string;
  caseReference: string;
  rfidEpc: string;
  currentZone: { id: number; name: string } | null;
  status: 'active' | 'archived' | 'missing';
  lastSeenAt: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

/** @deprecated Use getMockItemsForZone() instead */
export const mockDockets: Docket[] = Array.from({ length: 100 }, (_, i) => {
  const item = generateMockItem(i);
  return {
    labNumber: item.itemNumber,
    caseReference: item.referenceId,
    rfidEpc: item.rfidEpc,
    currentZone: item.currentZone,
    status:
      item.status === 'registered' ? 'active' : item.status === 'missing' ? 'missing' : 'archived',
    lastSeenAt: item.lastSeenAt,
    createdAt: item.createdAt,
  };
});
