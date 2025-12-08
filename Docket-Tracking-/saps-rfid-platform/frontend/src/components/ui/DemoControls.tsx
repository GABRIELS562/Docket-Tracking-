import { useState, useRef, useEffect } from 'react';
import {
  Play,
  Radio,
  Package,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Eye,
  Zap,
  MapPin,
  RotateCcw,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useSceneStore } from '../../stores/sceneStore';
import { useAIAnalyticsStore } from '../../stores/aiAnalyticsStore';
import type { TenantId } from '../../pages/TenantSelectPage';

/**
 * Demo Controls Panel
 *
 * Presentation helper for funding pitch demos.
 * Allows presenter to trigger specific scenarios and highlight features.
 */
// Demo zones for fallback
const DEMO_ZONES = ['receiving', 'shipping', 'storage-a', 'storage-b', 'processing', 'staging', 'secure-storage', 'returns'];

// Generate fallback demo item with LAB-XXXX format
const generateDemoItem = (zone?: string) => {
  const labNum = Math.floor(Math.random() * 250) + 1; // LAB-0001 to LAB-0250
  const epc = `LAB-${String(labNum).padStart(4, '0')}`;
  return {
    id: epc,
    epc,
    zone: zone || DEMO_ZONES[Math.floor(Math.random() * DEMO_ZONES.length)],
    position: [0, 0, 0] as [number, number, number],
  };
};

const DemoControls = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  // Use individual selectors to avoid re-renders when unrelated state changes
  const showReaders = useSceneStore((s) => s.showReaders);
  const toggleReaders = useSceneStore((s) => s.toggleReaders);
  const showLabels = useSceneStore((s) => s.showLabels);
  const toggleLabels = useSceneStore((s) => s.toggleLabels);
  const goToPreset = useSceneStore((s) => s.goToPreset);
  const flyToZone = useSceneStore((s) => s.flyToZone);
  const items = useSceneStore(useShallow((s) => s.items));

  const addAnomaly = useAIAnalyticsStore((s) => s.addAnomaly);
  const addDwellAlert = useAIAnalyticsStore((s) => s.addDwellAlert);
  const clearAllAnomalies = useAIAnalyticsStore((s) => s.clearAllAnomalies);
  const clearDwellAlerts = useAIAnalyticsStore((s) => s.clearDwellAlerts);
  const currentTenant = useAIAnalyticsStore((s) => s.currentTenant);
  const tenantConfig = useAIAnalyticsStore((s) => s.tenantConfig);
  const setTenant = useAIAnalyticsStore((s) => s.setTenant);

  // Use ref for items in callbacks
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Auto-initialize tenant if not set
  useEffect(() => {
    if (!currentTenant) {
      const savedTenant = localStorage.getItem('selectedTenant') as TenantId | null;
      if (savedTenant) {
        setTenant(savedTenant);
      } else {
        // Default to SAPS for demo
        setTenant('saps-forensics');
        localStorage.setItem('selectedTenant', 'saps-forensics');
      }
    }
  }, [currentTenant, setTenant]);

  // Demo: Show RFID Readers
  const demoRFIDReaders = () => {
    setActiveDemo('readers');
    if (!showReaders) toggleReaders();
    if (!showLabels) toggleLabels();
    goToPreset('overview');

    // Announce
    console.log('🎯 Demo: Showing 14 RFID readers across the facility');
  };

  // Demo: Show Inventory Items
  const demoInventory = () => {
    setActiveDemo('inventory');
    goToPreset('storage');

    console.log(`🎯 Demo: ${items.length} tagged items being tracked in real-time`);
  };

  // Demo: Trigger Dwell Time Alert
  const demoDwellAlert = () => {
    setActiveDemo('dwell');

    // Use real item or generate a fallback
    const randomItem = items.length > 0
      ? items[Math.floor(Math.random() * items.length)]
      : generateDemoItem('secure-storage');

    const itemTerm = tenantConfig?.itemTerm || 'Evidence Docket';
    const thresholdDays = tenantConfig?.alertThresholds?.dwellWarningDays || 14;
    const tenant = currentTenant || 'saps-forensics';

    // Calculate demo dwell time as 2.3x the tenant's threshold (always exceeds)
    // SAPS: 14 days * 2.3 = ~32 days (evidence sitting too long)
    // RetailGuard: 1 day * 2.3 = ~2.3 days (perishable item delayed)
    // MediTrack: 7 days * 2.3 = ~16 days (sample processing delayed)
    // MineSecure: 30 days * 2.3 = ~69 days (equipment inspection overdue)
    const dwellDays = Math.round(thresholdDays * 2.3);

    // Add critical dwell alert
    addDwellAlert({
      itemEpc: randomItem.epc,
      itemName: `${itemTerm} ${randomItem.epc.slice(-6).toUpperCase()}`,
      zone: randomItem.zone,
      zoneName: randomItem.zone.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()),
      dwellMinutes: dwellDays * 1440,
      dwellDays,
      thresholdDays,
      severity: 'critical',
      enteredAt: new Date(Date.now() - dwellDays * 24 * 60 * 60 * 1000),
    });

    // Also add anomaly
    addAnomaly({
      tenantId: tenant,
      itemEpc: randomItem.epc,
      itemName: `${itemTerm} ${randomItem.epc.slice(-6).toUpperCase()}`,
      type: 'dwell_exceeded',
      severity: 'critical',
      confidence: 94,
      message: `CRITICAL: ${itemTerm} has been in ${randomItem.zone.replace('-', ' ')} for ${dwellDays} days (threshold: ${thresholdDays} days)`,
      details: {
        zone: randomItem.zone,
        dwellDays,
        expectedDays: thresholdDays,
        reason: 'AI detected item exceeding maximum allowed dwell time',
      },
    });

    // Fly to the zone
    flyToZone(randomItem.zone);

    console.log(`🎯 Demo: Triggered dwell time alert for item in ${randomItem.zone} (${dwellDays} days > ${thresholdDays} day threshold)`);
  };

  // Demo: Trigger Unauthorized Movement
  const demoUnauthorizedMovement = () => {
    setActiveDemo('unauthorized');

    // Use real item or generate a fallback
    const randomItem = items.length > 0
      ? items[Math.floor(Math.random() * items.length)]
      : generateDemoItem('secure-storage');

    const itemTerm = tenantConfig?.itemTerm || 'Evidence Docket';
    const tenant = currentTenant || 'saps-forensics';

    addAnomaly({
      tenantId: tenant,
      itemEpc: randomItem.epc,
      itemName: `${itemTerm} ${randomItem.epc.slice(-6).toUpperCase()}`,
      type: 'unauthorized_zone',
      severity: 'critical',
      confidence: 97,
      message: `SECURITY ALERT: ${itemTerm} removed from Secure Storage without authorization`,
      details: {
        fromZone: 'secure-storage',
        toZone: 'shipping',
        reason: 'No matching authorization record found in access control system',
      },
    });

    flyToZone('secure-storage');

    console.log('🎯 Demo: Triggered unauthorized movement alert');
  };

  // Demo: Trigger Unusual Sequence
  const demoUnusualSequence = () => {
    setActiveDemo('sequence');

    // Use real item or generate a fallback
    const randomItem = items.length > 0
      ? items[Math.floor(Math.random() * items.length)]
      : generateDemoItem('processing');

    const itemTerm = tenantConfig?.itemTerm || 'Evidence Docket';
    const tenant = currentTenant || 'saps-forensics';

    addAnomaly({
      tenantId: tenant,
      itemEpc: randomItem.epc,
      itemName: `${itemTerm} ${randomItem.epc.slice(-6).toUpperCase()}`,
      type: 'unusual_sequence',
      severity: 'high',
      confidence: 89,
      message: `Unusual movement pattern: Secure Storage → Shipping (skipped Processing step)`,
      details: {
        fromZone: 'secure-storage',
        toZone: 'shipping',
        reason: 'This movement sequence occurs in only 2.1% of cases - possible protocol violation',
      },
    });

    flyToZone('processing');

    console.log('🎯 Demo: Triggered unusual sequence alert');
  };

  // Demo: After-hours Activity
  const demoAfterHours = () => {
    setActiveDemo('afterhours');

    // Use real item or generate a fallback
    const randomItem = items.length > 0
      ? items[Math.floor(Math.random() * items.length)]
      : generateDemoItem('shipping');

    const itemTerm = tenantConfig?.itemTerm || 'Evidence Docket';
    const tenant = currentTenant || 'saps-forensics';

    addAnomaly({
      tenantId: tenant,
      itemEpc: randomItem.epc,
      itemName: `${itemTerm} ${randomItem.epc.slice(-6).toUpperCase()}`,
      type: 'unusual_time',
      severity: 'high',
      confidence: 85,
      message: `Movement detected at 02:47 AM - only 3% normal activity at this hour`,
      details: {
        zone: randomItem.zone,
        timestamp: new Date().toISOString(),
        reason: 'Activity between midnight and 6 AM flagged for security review',
      },
    });

    flyToZone(randomItem.zone);

    console.log('🎯 Demo: Triggered after-hours activity alert');
  };

  // Reset Demo - Clear all alerts and return to overview
  const resetDemo = () => {
    setActiveDemo(null);
    clearAllAnomalies();
    clearDwellAlerts();
    goToPreset('overview');

    // Turn off readers and labels for a fresh start
    if (showReaders) toggleReaders();
    if (showLabels) toggleLabels();

    console.log('🔄 Demo: Reset - All alerts cleared, view reset to overview');
  };

  const demoScenarios = [
    {
      id: 'readers',
      icon: Radio,
      label: 'Show RFID Readers',
      description: '14 readers across facility',
      color: 'cyan',
      action: demoRFIDReaders,
    },
    {
      id: 'inventory',
      icon: Package,
      label: 'Show Tagged Inventory',
      description: `${items.length} items tracked`,
      color: 'blue',
      action: demoInventory,
    },
    {
      id: 'dwell',
      icon: Clock,
      label: 'Dwell Time Alert',
      description: 'Item in zone too long',
      color: 'amber',
      action: demoDwellAlert,
    },
    {
      id: 'unauthorized',
      icon: AlertTriangle,
      label: 'Unauthorized Exit',
      description: 'Security breach detected',
      color: 'red',
      action: demoUnauthorizedMovement,
    },
    {
      id: 'sequence',
      icon: MapPin,
      label: 'Unusual Sequence',
      description: 'Skipped required step',
      color: 'orange',
      action: demoUnusualSequence,
    },
    {
      id: 'afterhours',
      icon: Zap,
      label: 'After-Hours Activity',
      description: 'Movement at 2:47 AM',
      color: 'purple',
      action: demoAfterHours,
    },
  ];

  const colorClasses: Record<string, string> = {
    cyan: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30',
    blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30',
    amber: 'bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30',
    red: 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30',
    orange: 'bg-orange-500/20 border-orange-500/30 text-orange-400 hover:bg-orange-500/30',
    purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400 hover:bg-purple-500/30',
  };

  return (
    <div className="absolute bottom-24 right-4 z-40 w-72">
      {/* Header */}
      <div
        className={`bg-gradient-to-r from-emerald-900/95 to-teal-900/95 backdrop-blur-xl border border-emerald-500/30 cursor-pointer transition-all ${
          isExpanded ? 'rounded-t-2xl' : 'rounded-2xl'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">Demo Controls</h3>
              <p className="text-emerald-400/70 text-xs">Presentation Mode</p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-emerald-400" />
          ) : (
            <ChevronUp className="w-5 h-5 text-emerald-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="bg-slate-900/95 backdrop-blur-xl rounded-b-2xl border border-t-0 border-emerald-500/20 p-4">
          <p className="text-gray-400 text-xs mb-3">
            Click to demonstrate each feature:
          </p>

          <div className="space-y-2">
            {demoScenarios.map((scenario) => {
              const Icon = scenario.icon;
              const isActive = activeDemo === scenario.id;

              return (
                <button
                  key={scenario.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    scenario.action();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                    isActive
                      ? colorClasses[scenario.color]
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-white/10' : 'bg-white/5'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-sm font-medium">{scenario.label}</div>
                    <div className="text-xs opacity-60">{scenario.description}</div>
                  </div>
                  <Play className="w-4 h-4 opacity-40" />
                </button>
              );
            })}
          </div>

          {/* Quick tip */}
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-start gap-2">
              <Eye className="w-4 h-4 text-emerald-400 mt-0.5" />
              <div className="text-xs text-emerald-300/80">
                <strong>Tip:</strong> Click scenarios in order to walk through the full demo flow.
              </div>
            </div>
          </div>

          {/* Reset Demo Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              resetDemo();
            }}
            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-sm font-medium">Reset Demo</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default DemoControls;
