/**
 * Analytics API Service
 *
 * Connects to backend analytics endpoints for:
 * - Dashboard metrics
 * - Zone analytics (for pattern learning)
 * - Reader analytics
 * - System metrics
 *
 * Used to fetch real data instead of simulated patterns.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * Zone Analytics Response
 */
export interface ZoneAnalyticsDTO {
  zoneId: number;
  zoneName: string;
  statistics: {
    totalItems: number;
    avgDwellMinutes: number;
    stdDwellMinutes: number;
    totalMovements: number;
    uniqueItems: number;
  };
  hourlyActivity: number[]; // 24 values, normalized 0-1
  topNextZones: Array<{ zoneId: number; zoneName: string; count: number; probability: number }>;
}

/**
 * Dashboard Metrics Response
 */
export interface DashboardMetricsDTO {
  summary: {
    totalItems: number;
    activeItems: number;
    totalMovements: number;
    alertCount: number;
  };
  zoneOccupancy: Array<{
    zoneId: number;
    zoneName: string;
    currentCount: number;
    capacity: number;
    utilizationPercent: number;
  }>;
  readerHealth: {
    online: number;
    offline: number;
    total: number;
  };
  recentActivity: Array<{
    timestamp: string;
    type: string;
    itemId: string;
    zoneId: number;
    zoneName: string;
  }>;
}

/**
 * API Response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
  meta?: { timestamp: string; requestId?: string };
}

/**
 * Fetch with authentication
 */
async function fetchWithAuth<T>(endpoint: string, token?: string): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.error?.message || error.message || 'API request failed');
  }

  const result: ApiResponse<T> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || 'API request failed');
  }

  return result.data;
}

/**
 * Analytics API Client
 */
export const analyticsApi = {
  /**
   * Get dashboard overview metrics
   */
  async getDashboard(token?: string, hours = 24): Promise<DashboardMetricsDTO> {
    return fetchWithAuth<DashboardMetricsDTO>(
      `/api/v1/analytics/dashboard?hours=${hours}`,
      token
    );
  },

  /**
   * Get zone analytics for pattern learning
   */
  async getZoneAnalytics(
    token?: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      granularity?: 'hour' | 'day' | 'week';
    }
  ): Promise<ZoneAnalyticsDTO[]> {
    const params = new URLSearchParams();
    if (options?.startDate) params.set('startDate', options.startDate.toISOString());
    if (options?.endDate) params.set('endDate', options.endDate.toISOString());
    if (options?.granularity) params.set('granularity', options.granularity);

    return fetchWithAuth<ZoneAnalyticsDTO[]>(
      `/api/v1/analytics/zones?${params.toString()}`,
      token
    );
  },

  /**
   * Get single zone analytics
   */
  async getZoneAnalyticsById(
    zoneId: number,
    token?: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      granularity?: 'hour' | 'day' | 'week';
    }
  ): Promise<ZoneAnalyticsDTO> {
    const params = new URLSearchParams();
    if (options?.startDate) params.set('startDate', options.startDate.toISOString());
    if (options?.endDate) params.set('endDate', options.endDate.toISOString());
    if (options?.granularity) params.set('granularity', options.granularity);

    return fetchWithAuth<ZoneAnalyticsDTO>(
      `/api/v1/analytics/zones/${zoneId}?${params.toString()}`,
      token
    );
  },

  /**
   * Get system metrics
   */
  async getSystemMetrics(token?: string, hours = 24): Promise<unknown> {
    return fetchWithAuth<unknown>(
      `/api/v1/analytics/system?hours=${hours}`,
      token
    );
  },
};

/**
 * Convert backend ZoneAnalyticsDTO to frontend ZonePattern format
 */
export function mapZoneAnalyticsToPattern(dto: ZoneAnalyticsDTO) {
  return {
    zoneId: String(dto.zoneId),
    zoneName: dto.zoneName,
    avgDwellMinutes: dto.statistics.avgDwellMinutes,
    stdDwellMinutes: dto.statistics.stdDwellMinutes,
    typicalNextZones: dto.topNextZones.map((z) => ({
      zoneId: String(z.zoneId),
      probability: z.probability,
    })),
    hourlyActivity: dto.hourlyActivity,
    itemCount: dto.statistics.totalItems,
  };
}
