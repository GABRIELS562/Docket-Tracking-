import { create } from 'zustand';
import type { ItemMovementEvent, ZoneOccupancyEvent, ReaderStatusEvent } from '@/lib/types';

/**
 * Alert types for the simulation system
 */
export type AlertType = 'exit' | 'stale' | 'overcapacity' | 'reader_offline' | 'movement' | 'info';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface SimulationAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  dismissed: boolean;
}

export interface SimulationMetrics {
  totalItemsTracked: number;
  activeZones: number;
  onlineReaders: number;
  lastMovementTime: Date | null;
  movementsPerMinute: number;
  alertsToday: number;
}

interface SimulationState {
  // Simulation control
  isRunning: boolean;
  simulationSpeed: 1 | 2 | 5 | 10;

  // Recent events
  recentMovements: ItemMovementEvent[];
  recentOccupancyChanges: ZoneOccupancyEvent[];
  recentReaderChanges: ReaderStatusEvent[];

  // Alerts
  alerts: SimulationAlert[];
  maxAlerts: number;

  // Metrics
  metrics: SimulationMetrics;

  // Movement history (for analytics)
  movementHistory: Array<{ timestamp: Date; count: number }>;

  // Actions - Simulation Control
  startSimulation: () => void;
  stopSimulation: () => void;
  setSimulationSpeed: (speed: 1 | 2 | 5 | 10) => void;

  // Actions - Events
  addMovement: (event: ItemMovementEvent) => void;
  addOccupancyChange: (event: ZoneOccupancyEvent) => void;
  addReaderChange: (event: ReaderStatusEvent) => void;

  // Actions - Alerts
  addAlert: (alert: Omit<SimulationAlert, 'id' | 'timestamp' | 'dismissed'>) => void;
  dismissAlert: (id: string) => void;
  dismissAllAlerts: () => void;
  clearOldAlerts: () => void;

  // Actions - Metrics
  updateMetrics: (updates: Partial<SimulationMetrics>) => void;
  incrementMovements: () => void;

  // Computed
  getActiveAlerts: () => SimulationAlert[];
  getAlertsByType: (type: AlertType) => SimulationAlert[];
  getRecentMovements: (limit?: number) => ItemMovementEvent[];
}

const INITIAL_METRICS: SimulationMetrics = {
  totalItemsTracked: 0,
  activeZones: 0,
  onlineReaders: 0,
  lastMovementTime: null,
  movementsPerMinute: 0,
  alertsToday: 0,
};

export const useSimulationStore = create<SimulationState>((set, get) => ({
  // Initial state
  isRunning: false,
  simulationSpeed: 1,

  recentMovements: [],
  recentOccupancyChanges: [],
  recentReaderChanges: [],

  alerts: [],
  maxAlerts: 100,

  metrics: INITIAL_METRICS,

  movementHistory: [],

  // Actions - Simulation Control
  startSimulation: () => set({ isRunning: true }),

  stopSimulation: () => set({ isRunning: false }),

  setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),

  // Actions - Events
  addMovement: (event) =>
    set((state) => {
      const newMovements = [event, ...state.recentMovements].slice(0, 50);
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);

      // Count movements in the last minute
      const recentCount = newMovements.filter((m) => new Date(m.timestamp) > oneMinuteAgo).length;

      return {
        recentMovements: newMovements,
        metrics: {
          ...state.metrics,
          lastMovementTime: now,
          movementsPerMinute: recentCount,
        },
        movementHistory: [{ timestamp: now, count: recentCount }, ...state.movementHistory].slice(
          0,
          60
        ), // Keep last 60 entries
      };
    }),

  addOccupancyChange: (event) =>
    set((state) => ({
      recentOccupancyChanges: [event, ...state.recentOccupancyChanges].slice(0, 20),
    })),

  addReaderChange: (event) =>
    set((state) => ({
      recentReaderChanges: [event, ...state.recentReaderChanges].slice(0, 20),
    })),

  // Actions - Alerts
  addAlert: (alertData) =>
    set((state) => {
      const alert: SimulationAlert = {
        ...alertData,
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        dismissed: false,
      };

      const newAlerts = [alert, ...state.alerts].slice(0, state.maxAlerts);

      return {
        alerts: newAlerts,
        metrics: {
          ...state.metrics,
          alertsToday: state.metrics.alertsToday + 1,
        },
      };
    }),

  dismissAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.id === id ? { ...alert, dismissed: true } : alert
      ),
    })),

  dismissAllAlerts: () =>
    set((state) => ({
      alerts: state.alerts.map((alert) => ({ ...alert, dismissed: true })),
    })),

  clearOldAlerts: () =>
    set((state) => {
      const oneHourAgo = new Date(Date.now() - 3600000);
      return {
        alerts: state.alerts.filter((alert) => !alert.dismissed || alert.timestamp > oneHourAgo),
      };
    }),

  // Actions - Metrics
  updateMetrics: (updates) =>
    set((state) => ({
      metrics: { ...state.metrics, ...updates },
    })),

  incrementMovements: () =>
    set((state) => ({
      metrics: {
        ...state.metrics,
        lastMovementTime: new Date(),
      },
    })),

  // Computed
  getActiveAlerts: () => get().alerts.filter((a) => !a.dismissed),

  getAlertsByType: (type) => get().alerts.filter((a) => a.type === type),

  getRecentMovements: (limit = 10) => get().recentMovements.slice(0, limit),
}));
