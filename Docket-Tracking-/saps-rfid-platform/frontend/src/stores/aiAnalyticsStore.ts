import { create } from 'zustand';
import { TENANTS } from '../pages/TenantSelectPage';
import type { TenantId } from '../pages/TenantSelectPage';
import { analyticsApi, mapZoneAnalyticsToPattern } from '../services/analyticsApi';

/**
 * Anomaly Types
 */
export type AnomalyType = 'dwell_exceeded' | 'unusual_sequence' | 'unusual_time' | 'unauthorized_zone';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Anomaly Event
 */
export interface AnomalyEvent {
  id: string;
  tenantId: string;
  itemEpc: string;
  itemName: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  confidence: number; // 0-100
  message: string;
  details: {
    zone?: string;
    fromZone?: string;
    toZone?: string;
    dwellDays?: number;
    expectedDays?: number;
    timestamp?: string;
    reason?: string;
  };
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

/**
 * Zone Pattern (learned baseline)
 */
export interface ZonePattern {
  zoneId: string;
  zoneName: string;
  avgDwellMinutes: number;
  stdDwellMinutes: number;
  typicalNextZones: { zoneId: string; probability: number }[];
  hourlyActivity: number[]; // 24 values, normalized 0-1
  itemCount: number;
}

/**
 * Dwell Time Alert
 */
export interface DwellAlert {
  itemEpc: string;
  itemName: string;
  zone: string;
  zoneName: string;
  dwellMinutes: number;
  dwellDays: number;
  thresholdDays: number;
  severity: 'warning' | 'critical';
  enteredAt: Date;
}

/**
 * AI Analytics State
 */
interface AIAnalyticsState {
  // Current tenant
  currentTenant: TenantId | null;
  tenantConfig: typeof TENANTS[TenantId] | null;

  // Anomaly events
  anomalies: AnomalyEvent[];
  unacknowledgedCount: number;

  // Learned patterns (simulated for demo)
  zonePatterns: ZonePattern[];

  // Dwell time monitoring
  dwellAlerts: DwellAlert[];

  // AI Status
  isLearning: boolean;
  learningProgress: number; // 0-100
  patternsLastUpdated: Date | null;
  totalEventsProcessed: number;

  // Actions
  setTenant: (tenantId: TenantId) => void;
  addAnomaly: (anomaly: Omit<AnomalyEvent, 'id' | 'timestamp' | 'acknowledged'>) => void;
  acknowledgeAnomaly: (anomalyId: string, userId?: string) => void;
  dismissAnomaly: (anomalyId: string) => void;
  clearAllAnomalies: () => void;
  updateZonePatterns: (patterns: ZonePattern[]) => void;
  addDwellAlert: (alert: DwellAlert) => void;
  removeDwellAlert: (itemEpc: string) => void;
  clearDwellAlerts: () => void;
  setLearningStatus: (isLearning: boolean, progress?: number) => void;
  incrementEventsProcessed: (count?: number) => void;

  // Backend integration
  fetchZonePatternsFromBackend: (authToken?: string) => Promise<void>;
  isLoadingPatterns: boolean;
  patternsError: string | null;
}

/**
 * Generate unique ID
 */
const generateId = () => `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Default zone patterns for SAPS Forensics (simulated learned data)
 */
const DEFAULT_SAPS_PATTERNS: ZonePattern[] = [
  {
    zoneId: 'receiving',
    zoneName: 'Receiving',
    avgDwellMinutes: 120, // 2 hours average
    stdDwellMinutes: 60,
    typicalNextZones: [
      { zoneId: 'storage-a', probability: 0.6 },
      { zoneId: 'processing', probability: 0.3 },
      { zoneId: 'storage-b', probability: 0.1 },
    ],
    hourlyActivity: [0.1, 0.05, 0.02, 0.02, 0.02, 0.05, 0.2, 0.5, 0.8, 0.9, 0.85, 0.7, 0.5, 0.6, 0.7, 0.8, 0.6, 0.4, 0.2, 0.15, 0.1, 0.1, 0.1, 0.1],
    itemCount: 45,
  },
  {
    zoneId: 'processing',
    zoneName: 'Processing',
    avgDwellMinutes: 4320, // 3 days average
    stdDwellMinutes: 2880,
    typicalNextZones: [
      { zoneId: 'secure-storage', probability: 0.5 },
      { zoneId: 'storage-a', probability: 0.3 },
      { zoneId: 'shipping', probability: 0.2 },
    ],
    hourlyActivity: [0.05, 0.02, 0.02, 0.02, 0.02, 0.05, 0.3, 0.6, 0.9, 1.0, 0.95, 0.8, 0.6, 0.7, 0.85, 0.9, 0.7, 0.5, 0.3, 0.2, 0.1, 0.08, 0.05, 0.05],
    itemCount: 32,
  },
  {
    zoneId: 'secure-storage',
    zoneName: 'Secure Storage',
    avgDwellMinutes: 20160, // 14 days average
    stdDwellMinutes: 10080,
    typicalNextZones: [
      { zoneId: 'processing', probability: 0.4 },
      { zoneId: 'shipping', probability: 0.5 },
      { zoneId: 'staging', probability: 0.1 },
    ],
    hourlyActivity: [0.02, 0.01, 0.01, 0.01, 0.01, 0.02, 0.1, 0.3, 0.5, 0.6, 0.5, 0.4, 0.3, 0.4, 0.5, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05, 0.03, 0.02, 0.02],
    itemCount: 89,
  },
  {
    zoneId: 'storage-a',
    zoneName: 'Storage A',
    avgDwellMinutes: 10080, // 7 days average
    stdDwellMinutes: 5760,
    typicalNextZones: [
      { zoneId: 'processing', probability: 0.5 },
      { zoneId: 'storage-b', probability: 0.2 },
      { zoneId: 'shipping', probability: 0.3 },
    ],
    hourlyActivity: [0.1, 0.05, 0.05, 0.05, 0.05, 0.1, 0.3, 0.5, 0.7, 0.8, 0.75, 0.6, 0.5, 0.55, 0.65, 0.7, 0.55, 0.4, 0.25, 0.15, 0.1, 0.1, 0.1, 0.1],
    itemCount: 67,
  },
  {
    zoneId: 'storage-b',
    zoneName: 'Storage B',
    avgDwellMinutes: 8640, // 6 days average
    stdDwellMinutes: 4320,
    typicalNextZones: [
      { zoneId: 'processing', probability: 0.4 },
      { zoneId: 'storage-a', probability: 0.3 },
      { zoneId: 'staging', probability: 0.3 },
    ],
    hourlyActivity: [0.1, 0.05, 0.05, 0.05, 0.05, 0.1, 0.3, 0.5, 0.7, 0.8, 0.75, 0.6, 0.5, 0.55, 0.65, 0.7, 0.55, 0.4, 0.25, 0.15, 0.1, 0.1, 0.1, 0.1],
    itemCount: 54,
  },
  {
    zoneId: 'shipping',
    zoneName: 'Shipping',
    avgDwellMinutes: 240, // 4 hours average
    stdDwellMinutes: 120,
    typicalNextZones: [
      { zoneId: 'receiving', probability: 0.1 }, // Returns
    ],
    hourlyActivity: [0.05, 0.02, 0.02, 0.02, 0.02, 0.05, 0.2, 0.4, 0.6, 0.7, 0.8, 0.9, 0.85, 0.8, 0.9, 1.0, 0.8, 0.5, 0.3, 0.2, 0.1, 0.08, 0.05, 0.05],
    itemCount: 23,
  },
  {
    zoneId: 'staging',
    zoneName: 'Staging',
    avgDwellMinutes: 480, // 8 hours average
    stdDwellMinutes: 240,
    typicalNextZones: [
      { zoneId: 'shipping', probability: 0.7 },
      { zoneId: 'processing', probability: 0.2 },
      { zoneId: 'storage-a', probability: 0.1 },
    ],
    hourlyActivity: [0.05, 0.02, 0.02, 0.02, 0.02, 0.05, 0.15, 0.3, 0.5, 0.6, 0.7, 0.75, 0.7, 0.75, 0.8, 0.85, 0.7, 0.5, 0.3, 0.2, 0.1, 0.08, 0.05, 0.05],
    itemCount: 18,
  },
];

/**
 * AI Analytics Store
 *
 * Manages AI-powered anomaly detection, pattern learning, and alerts.
 * For demo purposes, uses statistical thresholds rather than real ML models.
 */
export const useAIAnalyticsStore = create<AIAnalyticsState>((set, get) => ({
  currentTenant: null,
  tenantConfig: null,
  anomalies: [],
  unacknowledgedCount: 0,
  zonePatterns: DEFAULT_SAPS_PATTERNS,
  dwellAlerts: [],
  isLearning: false,
  learningProgress: 100, // Pretend we've already learned
  patternsLastUpdated: new Date(),
  totalEventsProcessed: 15847, // Simulated historical processing
  isLoadingPatterns: false,
  patternsError: null,

  setTenant: (tenantId) => {
    const config = TENANTS[tenantId];
    set({
      currentTenant: tenantId,
      tenantConfig: config,
      anomalies: [],
      unacknowledgedCount: 0,
      dwellAlerts: [],
    });
  },

  addAnomaly: (anomalyData) => {
    const anomaly: AnomalyEvent = {
      ...anomalyData,
      id: generateId(),
      timestamp: new Date(),
      acknowledged: false,
    };

    set((state) => ({
      anomalies: [anomaly, ...state.anomalies].slice(0, 100), // Keep last 100
      unacknowledgedCount: state.unacknowledgedCount + 1,
    }));
  },

  acknowledgeAnomaly: (anomalyId, userId) => {
    set((state) => ({
      anomalies: state.anomalies.map((a) =>
        a.id === anomalyId
          ? { ...a, acknowledged: true, acknowledgedBy: userId, acknowledgedAt: new Date() }
          : a
      ),
      unacknowledgedCount: Math.max(0, state.unacknowledgedCount - 1),
    }));
  },

  dismissAnomaly: (anomalyId) => {
    set((state) => {
      const anomaly = state.anomalies.find((a) => a.id === anomalyId);
      const wasUnacknowledged = anomaly && !anomaly.acknowledged;
      return {
        anomalies: state.anomalies.filter((a) => a.id !== anomalyId),
        unacknowledgedCount: wasUnacknowledged
          ? Math.max(0, state.unacknowledgedCount - 1)
          : state.unacknowledgedCount,
      };
    });
  },

  clearAllAnomalies: () => {
    set({ anomalies: [], unacknowledgedCount: 0 });
  },

  updateZonePatterns: (patterns) => {
    set({
      zonePatterns: patterns,
      patternsLastUpdated: new Date(),
    });
  },

  addDwellAlert: (alert) => {
    set((state) => {
      // Don't duplicate
      const exists = state.dwellAlerts.some((a) => a.itemEpc === alert.itemEpc);
      if (exists) return state;
      return {
        dwellAlerts: [...state.dwellAlerts, alert].slice(0, 50),
      };
    });
  },

  removeDwellAlert: (itemEpc) => {
    set((state) => ({
      dwellAlerts: state.dwellAlerts.filter((a) => a.itemEpc !== itemEpc),
    }));
  },

  clearDwellAlerts: () => {
    set({ dwellAlerts: [] });
  },

  setLearningStatus: (isLearning, progress = 0) => {
    set({ isLearning, learningProgress: progress });
  },

  incrementEventsProcessed: (count = 1) => {
    set((state) => ({
      totalEventsProcessed: state.totalEventsProcessed + count,
    }));
  },

  // Fetch real zone patterns from backend analytics API
  fetchZonePatternsFromBackend: async (authToken?: string) => {
    set({ isLoadingPatterns: true, patternsError: null });

    try {
      // Fetch zone analytics for the past 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const zoneAnalytics = await analyticsApi.getZoneAnalytics(authToken, {
        startDate,
        endDate,
        granularity: 'day',
      });

      // Map backend DTOs to frontend ZonePattern format
      const patterns: ZonePattern[] = zoneAnalytics.map(mapZoneAnalyticsToPattern);

      set({
        zonePatterns: patterns.length > 0 ? patterns : get().zonePatterns,
        patternsLastUpdated: new Date(),
        isLoadingPatterns: false,
        isLearning: false,
        learningProgress: 100,
      });

      console.log(`Loaded ${patterns.length} zone patterns from backend`);
    } catch (error) {
      console.warn('Failed to fetch zone patterns from backend, using defaults:', error);
      set({
        isLoadingPatterns: false,
        patternsError: error instanceof Error ? error.message : 'Failed to fetch patterns',
      });
      // Keep using default/simulated patterns on error
    }
  },
}));

// Selector hooks for performance
export const useAnomalies = () => useAIAnalyticsStore((s) => s.anomalies);
export const useUnacknowledgedCount = () => useAIAnalyticsStore((s) => s.unacknowledgedCount);
export const useDwellAlerts = () => useAIAnalyticsStore((s) => s.dwellAlerts);
export const useZonePatterns = () => useAIAnalyticsStore((s) => s.zonePatterns);
export const useTenantConfig = () => useAIAnalyticsStore((s) => s.tenantConfig);
