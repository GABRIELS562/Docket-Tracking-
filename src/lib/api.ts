import axios from 'axios';
import type {
  Zone,
  Item,
  ItemSummary,
  Reader,
  PaginatedResponse,
  ItemSearchParams,
  LocationHistoryEntry,
  OccupancyData,
  DistributionSummary,
  ReaderActivity,
} from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ============================================================================
// Zone API
// ============================================================================

export const zoneApi = {
  /** Get all zones with current occupancy counts */
  getAll: async (): Promise<Zone[]> => {
    const response = await api.get<{ data: Zone[] }>('/zones');
    return response.data.data;
  },

  /** Get a single zone by ID */
  getById: async (zoneId: number): Promise<Zone> => {
    const response = await api.get<{ data: Zone }>(`/zones/${zoneId}`);
    return response.data.data;
  },

  /** Get items in a specific zone (paginated) */
  getItems: async (
    zoneId: number,
    params?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }
  ): Promise<PaginatedResponse<Item>> => {
    const response = await api.get<PaginatedResponse<Item>>(`/zones/${zoneId}/items`, { params });
    return response.data;
  },
};

// ============================================================================
// Item API (formerly Docket)
// ============================================================================

export const itemApi = {
  /** Search items with pagination and filters */
  search: async (params?: ItemSearchParams): Promise<PaginatedResponse<ItemSummary>> => {
    const response = await api.get<PaginatedResponse<ItemSummary>>('/items', { params });
    return response.data;
  },

  /** Get a single item by ID */
  getById: async (itemId: string): Promise<Item> => {
    const response = await api.get<{ data: Item }>(`/items/${itemId}`);
    return response.data.data;
  },

  /** Get item by item number (e.g., INV-2025-000001) */
  getByItemNumber: async (itemNumber: string): Promise<Item> => {
    const response = await api.get<{ data: Item }>(`/items/by-number/${itemNumber}`);
    return response.data.data;
  },

  /** Get item by RFID EPC */
  getByEpc: async (epc: string): Promise<Item> => {
    const response = await api.get<{ data: Item }>(`/items/by-epc/${epc}`);
    return response.data.data;
  },

  /** Get location history for an item */
  getLocationHistory: async (
    itemId: string,
    params?: { startTime?: string; endTime?: string; limit?: number }
  ): Promise<LocationHistoryEntry[]> => {
    const response = await api.get<{ data: LocationHistoryEntry[] }>(`/items/${itemId}/history`, {
      params,
    });
    return response.data.data;
  },
};

// ============================================================================
// Reader API
// ============================================================================

export const readerApi = {
  /** Get all readers */
  getAll: async (): Promise<Reader[]> => {
    const response = await api.get<{ data: Reader[] }>('/readers');
    return response.data.data;
  },

  /** Get a single reader by ID */
  getById: async (readerId: string): Promise<Reader> => {
    const response = await api.get<{ data: Reader }>(`/readers/${readerId}`);
    return response.data.data;
  },

  /** Get readers in a specific zone */
  getByZone: async (zoneId: number): Promise<Reader[]> => {
    const response = await api.get<{ data: Reader[] }>(`/zones/${zoneId}/readers`);
    return response.data.data;
  },
};

// ============================================================================
// Analytics API
// ============================================================================

export const analyticsApi = {
  /** Get occupancy time series data */
  getOccupancy: async (): Promise<OccupancyData[]> => {
    const response = await api.get<{ data: OccupancyData[] }>('/analytics/occupancy');
    return response.data.data;
  },

  /** Get occupancy with custom time range */
  getOccupancyRange: async (params: {
    startTime?: string;
    endTime?: string;
    interval?: 'hour' | 'day' | 'week';
  }): Promise<OccupancyData[]> => {
    const response = await api.get<{ data: OccupancyData[] }>('/analytics/occupancy', { params });
    return response.data.data;
  },

  /** Get item distribution across zones */
  getDistribution: async (): Promise<DistributionSummary> => {
    const response = await api.get<{ data: DistributionSummary }>('/analytics/distribution');
    return response.data.data;
  },

  /** Get reader activity metrics */
  getReaderActivity: async (): Promise<ReaderActivity[]> => {
    const response = await api.get<{ data: ReaderActivity[] }>('/analytics/reader-activity');
    return response.data.data;
  },

  /** Get system summary stats */
  getSummary: async (): Promise<{
    totalItems: number;
    totalZones: number;
    totalReaders: number;
    onlineReaders: number;
    recentMovements: number;
  }> => {
    const response = await api.get<{
      data: {
        totalItems: number;
        totalZones: number;
        totalReaders: number;
        onlineReaders: number;
        recentMovements: number;
      };
    }>('/analytics/summary');
    return response.data.data;
  },
};

// ============================================================================
// History API (for timeline playback)
// ============================================================================

export interface HistoryEvent {
  timestamp: string;
  itemId: string;
  itemNumber: string;
  zoneId: number;
  zoneName: string;
  readerId: string;
  eventType: 'entry' | 'exit' | 'detected' | 'movement';
}

export const historyApi = {
  /** Get timeline of events for playback */
  getTimeline: async (startTime: string, endTime: string): Promise<HistoryEvent[]> => {
    const response = await api.get<{ data: HistoryEvent[] }>('/history', {
      params: { startTime, endTime },
    });
    return response.data.data;
  },

  /** Get zone occupancy snapshot at a specific time */
  getSnapshot: async (timestamp: string): Promise<Record<number, number>> => {
    const response = await api.get<{ data: Record<number, number> }>('/history/snapshot', {
      params: { timestamp },
    });
    return response.data.data;
  },
};

// ============================================================================
// Legacy exports for backwards compatibility
// TODO: Remove after migration is complete
// ============================================================================

/** @deprecated Use Item from types.ts */
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

/** @deprecated Use itemApi instead */
export const docketApi = {
  search: async (params?: { limit?: number }) => {
    const response = await api.get<{ data: Docket[] }>('/dockets', { params });
    return response.data;
  },
};

// Re-export types for convenience
export type { Zone, Item, ItemSummary, Reader, PaginatedResponse, ItemSearchParams } from './types';
