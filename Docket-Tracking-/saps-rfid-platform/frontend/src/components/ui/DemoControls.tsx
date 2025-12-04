import { useState, useRef } from 'react';
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
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useSceneStore } from '../../stores/sceneStore';
import { useAIAnalyticsStore } from '../../stores/aiAnalyticsStore';

/**
 * Demo Controls Panel
 *
 * Presentation helper for funding pitch demos.
 * Allows presenter to trigger specific scenarios and highlight features.
 */
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
  const currentTenant = useAIAnalyticsStore((s) => s.currentTenant);
  const tenantConfig = useAIAnalyticsStore((s) => s.tenantConfig);

  // Use ref for items in callbacks
  const itemsRef = useRef(items);
  itemsRef.current = items;

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

    if (!tenantConfig || items.length === 0) return;

    const randomItem = items[Math.floor(Math.random() * items.length)];
    const dwellDays = 32; // Over threshold

    // Add critical dwell alert
    addDwellAlert({
      itemEpc: randomItem.epc,
      itemName: `${tenantConfig.itemTerm} ${randomItem.epc.slice(-6).toUpperCase()}`,
      zone: randomItem.zone,
      zoneName: randomItem.zone.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()),
      dwellMinutes: dwellDays * 1440,
      dwellDays,
      thresholdDays: tenantConfig.alertThresholds.dwellWarningDays,
      severity: 'critical',
      enteredAt: new Date(Date.now() - dwellDays * 24 * 60 * 60 * 1000),
    });

    // Also add anomaly
    addAnomaly({
      tenantId: currentTenant!,
      itemEpc: randomItem.epc,
      itemName: `${tenantConfig.itemTerm} ${randomItem.epc.slice(-6).toUpperCase()}`,
      type: 'dwell_exceeded',
      severity: 'critical',
      confidence: 94,
      message: `CRITICAL: ${tenantConfig.itemTerm} has been in ${randomItem.zone.replace('-', ' ')} for ${dwellDays} days (threshold: ${tenantConfig.alertThresholds.dwellWarningDays} days)`,
      details: {
        zone: randomItem.zone,
        dwellDays,
        expectedDays: tenantConfig.alertThresholds.dwellWarningDays,
        reason: 'AI detected item exceeding maximum allowed dwell time',
      },
    });

    // Fly to the zone
    flyToZone(randomItem.zone);

    console.log(`🎯 Demo: Triggered dwell time alert for item in ${randomItem.zone}`);
  };

  // Demo: Trigger Unauthorized Movement
  const demoUnauthorizedMovement = () => {
    setActiveDemo('unauthorized');

    if (!tenantConfig || items.length === 0) return;

    const randomItem = items[Math.floor(Math.random() * items.length)];

    addAnomaly({
      tenantId: currentTenant!,
      itemEpc: randomItem.epc,
      itemName: `${tenantConfig.itemTerm} ${randomItem.epc.slice(-6).toUpperCase()}`,
      type: 'unauthorized_zone',
      severity: 'critical',
      confidence: 97,
      message: `SECURITY ALERT: ${tenantConfig.itemTerm} removed from Secure Storage without authorization`,
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

    if (!tenantConfig || items.length === 0) return;

    const randomItem = items[Math.floor(Math.random() * items.length)];

    addAnomaly({
      tenantId: currentTenant!,
      itemEpc: randomItem.epc,
      itemName: `${tenantConfig.itemTerm} ${randomItem.epc.slice(-6).toUpperCase()}`,
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

    console.log('🎯 Demo: Triggered unusual sequence alert');
  };

  // Demo: After-hours Activity
  const demoAfterHours = () => {
    setActiveDemo('afterhours');

    if (!tenantConfig || items.length === 0) return;

    const randomItem = items[Math.floor(Math.random() * items.length)];

    addAnomaly({
      tenantId: currentTenant!,
      itemEpc: randomItem.epc,
      itemName: `${tenantConfig.itemTerm} ${randomItem.epc.slice(-6).toUpperCase()}`,
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

    console.log('🎯 Demo: Triggered after-hours activity alert');
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
        </div>
      )}
    </div>
  );
};

export default DemoControls;
