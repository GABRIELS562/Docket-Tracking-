import { useState, useRef, useEffect } from 'react';
import {
  Play,
  Radio,
  Package,
  AlertTriangle,
  Clock,
  ChevronRight,
  Sparkles,
  Zap,
  MapPin,
  RotateCcw,
  X,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useSceneStore } from '../../stores/sceneStore';
import { useCameraStore } from '../../stores/cameraStore';
import { useWarehouseStore } from '../../stores/warehouseStore';
import { useAIAnalyticsStore } from '../../stores/aiAnalyticsStore';
import type { TenantId } from '../../pages/TenantSelectPage';

/**
 * Demo Controls Panel - Polished for SPII Funding Presentation
 */

// Demo zones matching SAPS Forensic Lab workflow
const DEMO_ZONES = ['entry', 'extractions', 'qpcr-lab', 'pcr-lab', 'electrophoresis', 'genemapper', 'chain-custody'];

// Generate fallback demo item
const generateDemoItem = (zone?: string) => {
  const labNum = Math.floor(Math.random() * 250) + 1;
  const epc = `LAB-${String(labNum).padStart(4, '0')}`;
  return {
    id: epc,
    epc,
    zone: zone || DEMO_ZONES[Math.floor(Math.random() * DEMO_ZONES.length)],
    position: [0, 0, 0] as [number, number, number],
  };
};

const DemoControls = () => {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(true); // Start minimized for clean 3D view

  // Scene store
  const showReaders = useSceneStore((s) => s.showReaders);
  const toggleReaders = useSceneStore((s) => s.toggleReaders);
  const showLabels = useSceneStore((s) => s.showLabels);
  const toggleLabels = useSceneStore((s) => s.toggleLabels);
  const items = useSceneStore(useShallow((s) => s.items));

  // Camera store
  const cameraGoToPreset = useCameraStore((s) => s.goToPreset);
  const cameraFlyToZone = useCameraStore((s) => s.flyToZone);
  const cameraReset = useCameraStore((s) => s.reset);
  const startTour = useCameraStore((s) => s.startTour);

  // Warehouse store
  const getZone = useWarehouseStore((s) => s.getZone);
  const getCameraPreset = useWarehouseStore((s) => s.getCameraPreset);

  // Analytics store
  const addAnomaly = useAIAnalyticsStore((s) => s.addAnomaly);
  const addDwellAlert = useAIAnalyticsStore((s) => s.addDwellAlert);
  const clearAllAnomalies = useAIAnalyticsStore((s) => s.clearAllAnomalies);
  const clearDwellAlerts = useAIAnalyticsStore((s) => s.clearDwellAlerts);
  const currentTenant = useAIAnalyticsStore((s) => s.currentTenant);
  const tenantConfig = useAIAnalyticsStore((s) => s.tenantConfig);
  const setTenant = useAIAnalyticsStore((s) => s.setTenant);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Auto-initialize tenant
  useEffect(() => {
    if (!currentTenant) {
      const savedTenant = localStorage.getItem('selectedTenant') as TenantId | null;
      if (savedTenant) {
        setTenant(savedTenant);
      } else {
        setTenant('saps-forensics');
        localStorage.setItem('selectedTenant', 'saps-forensics');
      }
    }
  }, [currentTenant, setTenant]);

  // Navigation helpers
  const goToPreset = (presetId: string) => {
    const preset = getCameraPreset(presetId);
    if (preset) cameraGoToPreset(preset);
  };

  // flyToZone helper - currently using presets instead for more control
  const _flyToZone = (zoneId: string) => {
    const zone = getZone(zoneId);
    if (zone) cameraFlyToZone(zoneId, zone.center, zone.cameraPreset);
  };
  void _flyToZone; // Keep for future use

  // Demo actions - using INTERIOR camera presets!
  const demoRFIDReaders = () => {
    setActiveDemo('readers');
    // Always show readers when this demo is clicked
    if (!showReaders) toggleReaders();
    if (!showLabels) toggleLabels();
    // Go to interior view showing RFID readers clearly
    goToPreset('readers-view');
  };

  const demoInventory = () => {
    setActiveDemo('inventory');
    // Show readers to see the infrastructure
    if (!showReaders) toggleReaders();
    // Interior extractions view - close to items
    goToPreset('extractions-interior');
  };

  const demoDwellAlert = () => {
    setActiveDemo('dwell');
    const randomItem = items.length > 0
      ? items[Math.floor(Math.random() * items.length)]
      : generateDemoItem('extractions');

    const itemTerm = tenantConfig?.itemTerm || 'Evidence Docket';
    const thresholdDays = tenantConfig?.alertThresholds?.dwellWarningDays || 14;
    const tenant = currentTenant || 'saps-forensics';
    const dwellDays = Math.round(thresholdDays * 2.3);

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

    addAnomaly({
      tenantId: tenant,
      itemEpc: randomItem.epc,
      itemName: `${itemTerm} ${randomItem.epc.slice(-6).toUpperCase()}`,
      type: 'dwell_exceeded',
      severity: 'critical',
      confidence: 94,
      message: `CRITICAL: ${itemTerm} in Extractions Lab for ${dwellDays} days`,
      details: { zone: randomItem.zone, dwellDays, expectedDays: thresholdDays },
    });

    // Fly to interior view of the zone
    goToPreset('extractions-interior');
  };

  const demoUnauthorizedMovement = () => {
    setActiveDemo('unauthorized');
    const randomItem = items.length > 0
      ? items[Math.floor(Math.random() * items.length)]
      : generateDemoItem('chain-custody');

    const itemTerm = tenantConfig?.itemTerm || 'Evidence Docket';
    const tenant = currentTenant || 'saps-forensics';

    addAnomaly({
      tenantId: tenant,
      itemEpc: randomItem.epc,
      itemName: `${itemTerm} ${randomItem.epc.slice(-6).toUpperCase()}`,
      type: 'unauthorized_zone',
      severity: 'critical',
      confidence: 97,
      message: `SECURITY: ${itemTerm} exited lab without Chain of Custody confirmation`,
      details: { fromZone: 'pcr-lab', toZone: 'entry' },
    });

    // Interior view of chain of custody zone
    goToPreset('custody-interior');
  };

  const demoUnusualSequence = () => {
    setActiveDemo('sequence');
    const randomItem = items.length > 0
      ? items[Math.floor(Math.random() * items.length)]
      : generateDemoItem('pcr-lab');

    const itemTerm = tenantConfig?.itemTerm || 'Evidence Docket';
    const tenant = currentTenant || 'saps-forensics';

    addAnomaly({
      tenantId: tenant,
      itemEpc: randomItem.epc,
      itemName: `${itemTerm} ${randomItem.epc.slice(-6).toUpperCase()}`,
      type: 'unusual_sequence',
      severity: 'high',
      confidence: 89,
      message: `Unusual pattern: Entry → GeneMapper (skipped Extractions & PCR)`,
      details: { fromZone: 'entry', toZone: 'genemapper' },
    });

    // Interior PCR lab view
    goToPreset('pcr-interior');
  };

  const demoAfterHours = () => {
    setActiveDemo('afterhours');
    const randomItem = items.length > 0
      ? items[Math.floor(Math.random() * items.length)]
      : generateDemoItem('chain-custody');

    const itemTerm = tenantConfig?.itemTerm || 'Evidence Docket';
    const tenant = currentTenant || 'saps-forensics';

    addAnomaly({
      tenantId: tenant,
      itemEpc: randomItem.epc,
      itemName: `${itemTerm} ${randomItem.epc.slice(-6).toUpperCase()}`,
      type: 'unusual_time',
      severity: 'high',
      confidence: 85,
      message: `Movement at 02:47 AM - only 3% activity at this hour`,
      details: { zone: randomItem.zone, timestamp: new Date().toISOString() },
    });

    // Interior chain of custody view
    goToPreset('custody-interior');
  };

  const resetDemo = () => {
    setActiveDemo(null);
    clearAllAnomalies();
    clearDwellAlerts();
    const overviewPreset = getCameraPreset('overview');
    if (overviewPreset) cameraReset(overviewPreset);
    if (showReaders) toggleReaders();
    if (showLabels) toggleLabels();
  };

  const scenarios = [
    { id: 'readers', icon: Radio, label: 'RFID Readers', desc: '11 readers', color: 'cyan', action: demoRFIDReaders },
    { id: 'inventory', icon: Package, label: 'Inventory', desc: `${items.length} items`, color: 'blue', action: demoInventory },
    { id: 'dwell', icon: Clock, label: 'Dwell Alert', desc: 'Too long in zone', color: 'amber', action: demoDwellAlert },
    { id: 'unauthorized', icon: AlertTriangle, label: 'Security Breach', desc: 'Unauthorized exit', color: 'red', action: demoUnauthorizedMovement },
    { id: 'sequence', icon: MapPin, label: 'Route Anomaly', desc: 'Skipped step', color: 'orange', action: demoUnusualSequence },
    { id: 'afterhours', icon: Zap, label: 'After Hours', desc: '2:47 AM activity', color: 'purple', action: demoAfterHours },
  ];

  const colors: Record<string, { bg: string; border: string; text: string; active: string }> = {
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', active: 'bg-cyan-500/30' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', active: 'bg-blue-500/30' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', active: 'bg-amber-500/30' },
    red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', active: 'bg-red-500/30' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', active: 'bg-orange-500/30' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', active: 'bg-purple-500/30' },
  };

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="absolute top-20 right-4 z-40 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 shadow-lg transition-all"
      >
        <Sparkles className="w-4 h-4" />
        Demo
      </button>
    );
  }

  return (
    <div className="absolute top-20 right-4 z-40 w-64">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-white" />
          <span className="text-white font-semibold">Demo Controls</span>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          className="text-white/70 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-b-xl border border-t-0 border-emerald-500/20 p-3">
        {/* Scenario buttons - compact grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {scenarios.map((s) => {
            const Icon = s.icon;
            const isActive = activeDemo === s.id;
            const c = colors[s.color];

            return (
              <button
                key={s.id}
                onClick={s.action}
                className={`flex flex-col items-start p-2.5 rounded-lg border transition-all ${
                  isActive
                    ? `${c.active} ${c.border} ${c.text}`
                    : `bg-white/5 border-white/10 text-gray-300 hover:bg-white/10`
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{s.label}</span>
                </div>
                <span className="text-[10px] opacity-60">{s.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Tour button */}
        <button
          onClick={() => startTour()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-sm transition-all mb-2"
        >
          <Play className="w-4 h-4" />
          Start Cinematic Tour
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Reset button */}
        <button
          onClick={resetDemo}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-sm transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Demo
        </button>
      </div>
    </div>
  );
};

export default DemoControls;
