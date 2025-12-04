import { useEffect, useRef, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAIAnalyticsStore } from '../stores/aiAnalyticsStore';
import { useSceneStore } from '../stores/sceneStore';

/**
 * Unusual zone transitions for generating sequence anomalies
 * These are transitions that would be flagged as suspicious
 */
const UNUSUAL_TRANSITIONS = [
  { from: 'secure-storage', to: 'shipping' }, // Evidence going directly to shipping? Suspicious
  { from: 'receiving', to: 'secure-storage' }, // Skipping processing
  { from: 'processing', to: 'receiving' }, // Going backwards
  { from: 'storage-a', to: 'secure-storage' }, // Unauthorized secure access
  { from: 'staging', to: 'receiving' }, // Backwards flow
];

/**
 * Zone names for display
 */
const ZONE_NAMES: Record<string, string> = {
  'receiving': 'Receiving',
  'shipping': 'Shipping',
  'storage-a': 'Storage A',
  'storage-b': 'Storage B',
  'processing': 'Processing',
  'staging': 'Staging',
  'secure-storage': 'Secure Storage',
  'returns': 'Returns',
};

/**
 * AI Anomaly Generator Hook
 *
 * Simulates AI-detected anomalies for demo purposes.
 * Generates realistic anomaly events at configured intervals.
 *
 * Types of anomalies generated:
 * 1. Dwell time exceeded - Item in zone too long
 * 2. Unusual sequence - Suspicious zone transition
 * 3. Unusual time - Activity at odd hours (simulated)
 * 4. Unauthorized zone exit - Item leaving secure area
 */
export const useAIAnomalyGenerator = (options: {
  enabled?: boolean;
  anomalyIntervalMs?: number; // How often to check for/generate anomalies
  dwellAlertIntervalMs?: number; // How often to generate dwell alerts
} = {}) => {
  const {
    enabled = true,
    anomalyIntervalMs = 15000, // Every 15 seconds
    dwellAlertIntervalMs = 30000, // Every 30 seconds
  } = options;

  const anomalyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dwellIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Extract store actions individually for stable references
  const addAnomaly = useAIAnalyticsStore((s) => s.addAnomaly);
  const addDwellAlert = useAIAnalyticsStore((s) => s.addDwellAlert);
  const tenantConfig = useAIAnalyticsStore((s) => s.tenantConfig);
  const currentTenant = useAIAnalyticsStore((s) => s.currentTenant);
  const incrementEventsProcessed = useAIAnalyticsStore((s) => s.incrementEventsProcessed);

  // Use useShallow to prevent new array reference on every render
  const items = useSceneStore(useShallow((s) => s.items));

  // Use refs for callbacks to avoid dependency issues
  const itemsRef = useRef(items);
  itemsRef.current = items;

  /**
   * Generate a random anomaly
   */
  const generateAnomaly = useCallback(() => {
    const currentItems = itemsRef.current;
    if (!tenantConfig || !currentTenant || currentItems.length === 0) return;

    // Pick random item
    const randomItem = currentItems[Math.floor(Math.random() * currentItems.length)];
    if (!randomItem) return;

    // Decide anomaly type (weighted)
    const anomalyTypes = [
      { type: 'dwell_exceeded', weight: 35 },
      { type: 'unusual_sequence', weight: 40 },
      { type: 'unusual_time', weight: 15 },
      { type: 'unauthorized_zone', weight: 10 },
    ];

    const totalWeight = anomalyTypes.reduce((sum, t) => sum + t.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedType = 'dwell_exceeded';

    for (const t of anomalyTypes) {
      random -= t.weight;
      if (random <= 0) {
        selectedType = t.type;
        break;
      }
    }

    const itemName = `${tenantConfig.itemTerm} ${randomItem.epc.slice(-6).toUpperCase()}`;
    const zoneName = ZONE_NAMES[randomItem.zone] || randomItem.zone;

    switch (selectedType) {
      case 'dwell_exceeded': {
        const dwellDays = Math.floor(Math.random() * 30) + 15; // 15-45 days
        const expectedDays = Math.floor(Math.random() * 10) + 3; // 3-13 days
        const confidence = Math.min(95, 60 + Math.random() * 30);

        addAnomaly({
          tenantId: currentTenant,
          itemEpc: randomItem.epc,
          itemName,
          type: 'dwell_exceeded',
          severity: dwellDays > 30 ? 'critical' : dwellDays > 20 ? 'high' : 'medium',
          confidence: Math.round(confidence),
          message: `${itemName} has been in ${zoneName} for ${dwellDays} days (expected: ${expectedDays} days)`,
          details: {
            zone: randomItem.zone,
            dwellDays,
            expectedDays,
            reason: 'Exceeded normal dwell time threshold based on historical patterns',
          },
        });
        break;
      }

      case 'unusual_sequence': {
        // Pick a suspicious transition
        const transition = UNUSUAL_TRANSITIONS[Math.floor(Math.random() * UNUSUAL_TRANSITIONS.length)];
        const fromName = ZONE_NAMES[transition.from] || transition.from;
        const toName = ZONE_NAMES[transition.to] || transition.to;
        const probability = Math.random() * 5; // 0-5% probability
        const confidence = Math.min(95, 85 + Math.random() * 10);

        addAnomaly({
          tenantId: currentTenant,
          itemEpc: randomItem.epc,
          itemName,
          type: 'unusual_sequence',
          severity: transition.to === 'shipping' && transition.from === 'secure-storage' ? 'critical' : 'high',
          confidence: Math.round(confidence),
          message: `Unusual movement: ${fromName} → ${toName} (${probability.toFixed(1)}% typical)`,
          details: {
            fromZone: transition.from,
            toZone: transition.to,
            reason: `This zone transition occurs in only ${probability.toFixed(1)}% of cases - potential protocol violation`,
          },
        });
        break;
      }

      case 'unusual_time': {
        const hour = Math.floor(Math.random() * 6); // 0-5 AM
        const activity = Math.random() * 5; // 0-5% activity
        const confidence = Math.min(90, 70 + Math.random() * 20);

        addAnomaly({
          tenantId: currentTenant,
          itemEpc: randomItem.epc,
          itemName,
          type: 'unusual_time',
          severity: hour < 3 ? 'high' : 'medium',
          confidence: Math.round(confidence),
          message: `Movement detected at ${hour}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')} - only ${activity.toFixed(0)}% normal activity at this hour`,
          details: {
            zone: randomItem.zone,
            timestamp: new Date().toISOString(),
            reason: `Activity between midnight and 6 AM is flagged for review`,
          },
        });
        break;
      }

      case 'unauthorized_zone': {
        const confidence = Math.min(95, 80 + Math.random() * 15);

        addAnomaly({
          tenantId: currentTenant,
          itemEpc: randomItem.epc,
          itemName,
          type: 'unauthorized_zone',
          severity: 'critical',
          confidence: Math.round(confidence),
          message: `${itemName} exited Secure Storage without authorization record`,
          details: {
            zone: 'secure-storage',
            fromZone: 'secure-storage',
            toZone: randomItem.zone,
            reason: 'No matching authorization found in access control system',
          },
        });
        break;
      }
    }

    incrementEventsProcessed(Math.floor(Math.random() * 50) + 10);
  }, [tenantConfig, currentTenant, addAnomaly, incrementEventsProcessed]); // Removed items - using ref

  /**
   * Generate dwell time alerts
   */
  const generateDwellAlerts = useCallback(() => {
    const currentItems = itemsRef.current;
    if (!tenantConfig || currentItems.length === 0) return;

    // Pick 2-4 random items for dwell alerts
    const alertCount = Math.floor(Math.random() * 3) + 2;
    const shuffled = [...currentItems].sort(() => Math.random() - 0.5);
    const selectedItems = shuffled.slice(0, alertCount);

    for (const item of selectedItems) {
      const dwellDays = Math.floor(Math.random() * 40) + 10; // 10-50 days
      const thresholdDays = tenantConfig.alertThresholds.dwellWarningDays;

      if (dwellDays > thresholdDays) {
        addDwellAlert({
          itemEpc: item.epc,
          itemName: `${tenantConfig.itemTerm} ${item.epc.slice(-6).toUpperCase()}`,
          zone: item.zone,
          zoneName: ZONE_NAMES[item.zone] || item.zone,
          dwellMinutes: dwellDays * 1440,
          dwellDays,
          thresholdDays,
          severity: dwellDays > tenantConfig.alertThresholds.dwellCriticalDays ? 'critical' : 'warning',
          enteredAt: new Date(Date.now() - dwellDays * 24 * 60 * 60 * 1000),
        });
      }
    }
  }, [tenantConfig, addDwellAlert]); // Removed items - using ref

  // Start/stop anomaly generation
  useEffect(() => {
    if (!enabled || !tenantConfig) {
      if (anomalyIntervalRef.current) {
        clearInterval(anomalyIntervalRef.current);
        anomalyIntervalRef.current = null;
      }
      if (dwellIntervalRef.current) {
        clearInterval(dwellIntervalRef.current);
        dwellIntervalRef.current = null;
      }
      return;
    }

    console.log('🤖 AI Anomaly Generator: Started');

    // Generate initial anomalies after a short delay
    setTimeout(() => {
      generateAnomaly();
      generateAnomaly();
      generateDwellAlerts();
    }, 3000);

    // Start intervals
    anomalyIntervalRef.current = setInterval(generateAnomaly, anomalyIntervalMs);
    dwellIntervalRef.current = setInterval(generateDwellAlerts, dwellAlertIntervalMs);

    return () => {
      if (anomalyIntervalRef.current) {
        clearInterval(anomalyIntervalRef.current);
        anomalyIntervalRef.current = null;
      }
      if (dwellIntervalRef.current) {
        clearInterval(dwellIntervalRef.current);
        dwellIntervalRef.current = null;
      }
      console.log('🤖 AI Anomaly Generator: Stopped');
    };
  }, [enabled, tenantConfig, anomalyIntervalMs, dwellAlertIntervalMs, generateAnomaly, generateDwellAlerts]);

  return {
    generateAnomaly,
    generateDwellAlerts,
  };
};

export default useAIAnomalyGenerator;
