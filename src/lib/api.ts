import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export interface Zone {
  zoneId: number;
  zoneName: string;
  zoneType: 'storage' | 'lab' | 'office' | 'corridor' | 'entrance';
  capacity: number;
  currentOccupancy: number;
  occupancyPercentage: number;
  readers: string[];
}

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

export interface Reader {
  readerId: string;
  readerName: string;
  ipAddress: string;
  zoneId: number;
  zoneName?: string;
  status: 'online' | 'offline' | 'error' | 'connecting';
  lastSeenAt: string | null;
  errorMessage?: string;
  configuration?: {
    transmitPower?: number;
    antennas?: number[];
    rssiThreshold?: number;
  };
}

export const zoneApi = {
  getAll: async () => {
    const response = await api.get<{ data: Zone[] }>('/zones');
    return response.data.data;
  },
};

export const docketApi = {
  search: async (params?: { limit?: number }) => {
    const response = await api.get<{ data: Docket[] }>('/dockets', { params });
    return response.data;
  },
};

export const readerApi = {
  getAll: async () => {
    const response = await api.get<{ data: Reader[] }>('/readers');
    return response.data.data;
  },
};

export interface HistoryEvent {
  timestamp: string;
  docketId: string;
  labNumber: string;
  zoneId: number;
  zoneName: string;
  eventType: 'entry' | 'exit' | 'detected';
}

export const historyApi = {
  getTimeline: async (startTime: string, endTime: string) => {
    const response = await api.get<{ data: HistoryEvent[] }>('/history', {
      params: { startTime, endTime },
    });
    return response.data.data;
  },
};

export interface OccupancyData {
  timestamp: string;
  zones: Record<string, number>;
}

export interface ZoneDistribution {
  name: string;
  value: number;
  color: string;
}

export interface DistributionSummary {
  total: number;
  activeZones: number;
  avgOccupancy: number;
  peakZone: string;
  zones: ZoneDistribution[];
}

export interface ReaderActivity {
  readerId: string;
  reads: number;
  status: 'online' | 'offline' | 'error' | 'connecting';
}

export const analyticsApi = {
  getOccupancy: async () => {
    const response = await api.get<{ data: OccupancyData[] }>('/analytics/occupancy');
    return response.data.data;
  },

  getDistribution: async () => {
    const response = await api.get<{ data: DistributionSummary }>('/analytics/distribution');
    return response.data.data;
  },

  getReaderActivity: async () => {
    const response = await api.get<{ data: ReaderActivity[] }>('/analytics/reader-activity');
    return response.data.data;
  },
};
