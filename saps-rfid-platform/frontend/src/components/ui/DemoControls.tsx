import { useState, useRef, useEffect, useCallback } from 'react';
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
  Eye,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useSceneStore } from '../../stores/sceneStore';
import { useCameraStore } from '../../stores/cameraStore';
import { useWarehouseStore } from '../../stores/warehouseStore';
import { useAIAnalyticsStore } from '../../stores/aiAnalyticsStore';
import type { TenantId } from '../../pages/TenantSelectPage';

/**
 * Demo Controls Panel - ENHANCED for SPII Funding Presentation
 *
 * Features:
 * - Cinematic RFID Readers walkthrough
 * - Inventory panoramic tour
 * - Dwell Alert with amber highlighting
 * - Security Breach with red alarm effects
 * - Improved cinematic tour
 */

// Demo zones matching SAPS Forensic Lab workflow
const DEMO_ZONES = ['entry', 'extractions', 'qpcr-lab', 'pcr-lab', 'electrophoresis', 'genemapper', 'chain-custody'];

// Zone positions for flyToItem
const ZONE_POSITIONS: Record<string, [number, number, number]> = {
  'entry': [-22.5, 1.5, -27.5],
  'extractions': [-12.5, 1.5, -5],
  'qpcr-lab': [12.5, 1.5, -5],
  'pcr-lab': [-30, 1.5, 15],
  'electrophoresis': [-34, 1.5, 1.5],
  'genemapper': [-34, 1.5, -11.5],
  'chain-custody': [22.5, 1.5, -27.5],
};

// RFID Reader Tour - Walking through warehouse at eye level (1.7m)
// Like a technician inspecting each reader
const READER_TOUR_WAYPOINTS = [
  // Start at lab entrance, looking at first portal reader
  { position: { x: -30, y: 1.7, z: -28 }, target: { x: -30, y: 3.5, z: -32 }, name: 'Lab Entry Portal 1', duration: 3000 },
  // Walk to second entry portal
  { position: { x: -15, y: 1.7, z: -28 }, target: { x: -15, y: 3.5, z: -32 }, name: 'Lab Entry Portal 2', duration: 3000 },
  // Walk across to chain of custody side
  { position: { x: 15, y: 1.7, z: -28 }, target: { x: 15, y: 3.5, z: -32 }, name: 'Chain Custody Portal 1', duration: 3000 },
  { position: { x: 30, y: 1.7, z: -28 }, target: { x: 30, y: 3.5, z: -32 }, name: 'Chain Custody Portal 2', duration: 3000 },
  // Walk into extractions lab, look up at ceiling reader
  { position: { x: -12.5, y: 1.7, z: -10 }, target: { x: -12.5, y: 3, z: -15 }, name: 'Extractions North Reader', duration: 3000 },
  { position: { x: -12.5, y: 1.7, z: 0 }, target: { x: -12.5, y: 3, z: 5 }, name: 'Extractions South Reader', duration: 3000 },
  // Walk to QPCR lab
  { position: { x: 12.5, y: 1.7, z: -10 }, target: { x: 12.5, y: 3, z: -15 }, name: 'QPCR Lab North Reader', duration: 3000 },
  { position: { x: 12.5, y: 1.7, z: 0 }, target: { x: 12.5, y: 3, z: 5 }, name: 'QPCR Lab South Reader', duration: 3000 },
  // Walk to PCR lab
  { position: { x: -25, y: 1.7, z: 15 }, target: { x: -30, y: 3, z: 15 }, name: 'PCR Lab Reader', duration: 3000 },
  // Walk to electrophoresis
  { position: { x: -30, y: 1.7, z: 1.5 }, target: { x: -34, y: 3, z: 1.5 }, name: 'Electrophoresis Reader', duration: 3000 },
  // Walk to GeneMapper
  { position: { x: -30, y: 1.7, z: -11.5 }, target: { x: -29, y: 3, z: -11.5 }, name: 'GeneMapper ID Reader', duration: 3000 },
];

// Inventory Tour - Walking through each zone at eye level, looking at inventory
const INVENTORY_TOUR_WAYPOINTS = [
  // Start at entrance looking into the lab
  { position: { x: -22.5, y: 1.7, z: -30 }, target: { x: -22.5, y: 1.5, z: -20 }, name: 'Entry - Incoming Evidence', duration: 3500 },
  // Walk into extractions, look around at inventory
  { position: { x: -12.5, y: 1.7, z: -8 }, target: { x: -18, y: 1.5, z: 0 }, name: 'Extractions Lab - DNA Samples', duration: 3500 },
  // Pan around extractions
  { position: { x: -8, y: 1.7, z: -5 }, target: { x: -5, y: 1.5, z: -5 }, name: 'Extractions - Workstations', duration: 3000 },
  // Walk to QPCR lab
  { position: { x: 12.5, y: 1.7, z: -8 }, target: { x: 18, y: 1.5, z: 0 }, name: 'QPCR Lab - Analysis Station', duration: 3500 },
  // Walk to PCR lab
  { position: { x: -30, y: 1.7, z: 12 }, target: { x: -30, y: 1.5, z: 18 }, name: 'PCR Lab - Amplification', duration: 3500 },
  // Walk to electrophoresis
  { position: { x: -32, y: 1.7, z: 1.5 }, target: { x: -36, y: 1.5, z: 1.5 }, name: 'Electrophoresis - Separation', duration: 3500 },
  // Walk to GeneMapper
  { position: { x: -32, y: 1.7, z: -11.5 }, target: { x: -36, y: 1.5, z: -11.5 }, name: 'GeneMapper - ID Analysis', duration: 3500 },
  // Walk to chain of custody
  { position: { x: 22.5, y: 1.7, z: -30 }, target: { x: 22.5, y: 1.5, z: -20 }, name: 'Chain of Custody - Release', duration: 3500 },
];

// Cinematic Tour - Dramatic walkthrough with some elevated angles but staying INSIDE
const CINEMATIC_TOUR_WAYPOINTS = [
  // Start walking in from entrance at eye level
  { position: { x: 0, y: 1.7, z: -32 }, target: { x: 0, y: 2, z: -15 }, name: 'Entering the Lab', duration: 4000 },
  // Walk to center, look at entry zone
  { position: { x: -15, y: 1.7, z: -25 }, target: { x: -22.5, y: 2, z: -27.5 }, name: 'Evidence Intake Area', duration: 3500 },
  // Turn to see chain of custody
  { position: { x: 15, y: 1.7, z: -25 }, target: { x: 22.5, y: 2, z: -27.5 }, name: 'Chain of Custody Station', duration: 3500 },
  // Walk into main processing area - slightly elevated for overview (but still inside, below ceiling)
  { position: { x: 0, y: 4, z: -5 }, target: { x: 0, y: 1.5, z: 5 }, name: 'Processing Floor Overview', duration: 4000 },
  // Walk through extractions
  { position: { x: -15, y: 1.7, z: -5 }, target: { x: -12.5, y: 1.5, z: -5 }, name: 'Extractions Lab', duration: 3500 },
  // Walk to analysis wing
  { position: { x: -32, y: 1.7, z: -5 }, target: { x: -34, y: 2, z: 0 }, name: 'Analysis Wing', duration: 3500 },
  // Walk through PCR lab
  { position: { x: -28, y: 1.7, z: 15 }, target: { x: -32, y: 2, z: 15 }, name: 'PCR Amplification Lab', duration: 3500 },
  // Final dramatic shot - elevated but inside (below 8m ceiling)
  { position: { x: 0, y: 6, z: 0 }, target: { x: -10, y: 1, z: -10 }, name: 'Lab Floor - Aerial View', duration: 4000 },
  // End with a nice interior overview
  { position: { x: 20, y: 3, z: -15 }, target: { x: -10, y: 2, z: 0 }, name: 'Complete Lab Overview', duration: 3500 },
];

// Generate fallback demo item
const generateDemoItem = (zone?: string) => {
  const labNum = Math.floor(Math.random() * 250) + 1;
  const epc = `LAB-${String(labNum).padStart(4, '0')}`;
  const zoneId = zone || DEMO_ZONES[Math.floor(Math.random() * DEMO_ZONES.length)];
  const pos = ZONE_POSITIONS[zoneId] || ZONE_POSITIONS['entry'];
  return {
    id: epc,
    epc,
    zone: zoneId,
    position: [pos[0] + (Math.random() - 0.5) * 8, pos[1], pos[2] + (Math.random() - 0.5) * 6] as [number, number, number],
  };
};

const DemoControls = () => {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(true); // Start minimized for clean 3D view
  const [tourWaypointIndex, setTourWaypointIndex] = useState(0);
  const [tourLabel, setTourLabel] = useState<string | null>(null);
  const tourTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scene store
  const showReaders = useSceneStore((s) => s.showReaders);
  const toggleReaders = useSceneStore((s) => s.toggleReaders);
  const showLabels = useSceneStore((s) => s.showLabels);
  const toggleLabels = useSceneStore((s) => s.toggleLabels);
  const items = useSceneStore(useShallow((s) => s.items));
  const flyToItem = useSceneStore((s) => s.flyToItem);
  const selectItem = useSceneStore((s) => s.selectItem);
  const setAlertMode = useSceneStore((s) => s.setAlertMode);

  // Camera store
  const cameraGoToPreset = useCameraStore((s) => s.goToPreset);
  const cameraFlyToZone = useCameraStore((s) => s.flyToZone);
  const cameraReset = useCameraStore((s) => s.reset);
  const startAnimation = useCameraStore((s) => s.startAnimation);

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

  // Cleanup tour on unmount
  useEffect(() => {
    return () => {
      if (tourTimeoutRef.current) {
        clearTimeout(tourTimeoutRef.current);
      }
    };
  }, []);

  // Generic cinematic tour runner
  const runCinematicTour = useCallback((waypoints: typeof READER_TOUR_WAYPOINTS, tourName: string) => {
    setActiveDemo(tourName);
    setTourWaypointIndex(0);

    // Ensure readers and labels are visible
    if (!showReaders) toggleReaders();
    if (!showLabels) toggleLabels();

    let currentIndex = 0;

    const advanceToNextWaypoint = () => {
      if (currentIndex >= waypoints.length) {
        // Tour complete
        setTourLabel(null);
        setActiveDemo(null);
        return;
      }

      const waypoint = waypoints[currentIndex];
      setTourLabel(waypoint.name);
      setTourWaypointIndex(currentIndex + 1);

      // Animate camera to waypoint
      startAnimation(
        { position: waypoint.position, target: waypoint.target },
        waypoint.duration / 1000
      );

      currentIndex++;

      // Schedule next waypoint
      tourTimeoutRef.current = setTimeout(advanceToNextWaypoint, waypoint.duration);
    };

    // Start the tour
    advanceToNextWaypoint();
  }, [showReaders, showLabels, toggleReaders, toggleLabels, startAnimation]);

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

  // Navigation helpers - kept for future use
  const goToPreset = (presetId: string) => {
    const preset = getCameraPreset(presetId);
    if (preset) cameraGoToPreset(preset);
  };
  void goToPreset; // Keep for future use

  const _flyToZone = (zoneId: string) => {
    const zone = getZone(zoneId);
    if (zone) cameraFlyToZone(zoneId, zone.center, zone.cameraPreset);
  };
  void _flyToZone; // Keep for future use

  // Stop any running tour
  const stopTour = useCallback(() => {
    if (tourTimeoutRef.current) {
      clearTimeout(tourTimeoutRef.current);
      tourTimeoutRef.current = null;
    }
    setTourLabel(null);
    setTourWaypointIndex(0);
  }, []);

  // Demo actions - ENHANCED with cinematic tours!

  // RFID Readers - Cinematic walkthrough of all 11 readers
  const demoRFIDReaders = () => {
    stopTour();
    runCinematicTour(READER_TOUR_WAYPOINTS, 'readers');
  };

  // Inventory - Panoramic tour over all zones
  const demoInventory = () => {
    stopTour();
    runCinematicTour(INVENTORY_TOUR_WAYPOINTS, 'inventory');
  };

  // Dwell Alert - Fly to item with AMBER highlighting
  const demoDwellAlert = () => {
    stopTour();
    setActiveDemo('dwell');

    // Find or create an item in extractions (typical dwell zone)
    const extractionItems = items.filter(i => i.zone === 'extractions');
    const targetItem = extractionItems.length > 0
      ? extractionItems[Math.floor(Math.random() * extractionItems.length)]
      : generateDemoItem('extractions');

    const itemTerm = tenantConfig?.itemTerm || 'Evidence Docket';
    const thresholdDays = tenantConfig?.alertThresholds?.dwellWarningDays || 14;
    const tenant = currentTenant || 'saps-forensics';
    const dwellDays = Math.round(thresholdDays * 2.3);

    // Set alert mode to DWELL (amber/yellow highlighting)
    if (setAlertMode) setAlertMode('dwell');

    addDwellAlert({
      itemEpc: targetItem.epc,
      itemName: `${itemTerm} ${targetItem.epc.slice(-6).toUpperCase()}`,
      zone: targetItem.zone,
      zoneName: targetItem.zone.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()),
      dwellMinutes: dwellDays * 1440,
      dwellDays,
      thresholdDays,
      severity: 'critical',
      enteredAt: new Date(Date.now() - dwellDays * 24 * 60 * 60 * 1000),
    });

    addAnomaly({
      tenantId: tenant,
      itemEpc: targetItem.epc,
      itemName: `${itemTerm} ${targetItem.epc.slice(-6).toUpperCase()}`,
      type: 'dwell_exceeded',
      severity: 'critical',
      confidence: 94,
      message: `CRITICAL: ${itemTerm} in Extractions Lab for ${dwellDays} days`,
      details: { zone: targetItem.zone, dwellDays, expectedDays: thresholdDays },
    });

    // Fly to the item with cinematic effect
    const pos = targetItem.position || ZONE_POSITIONS[targetItem.zone] || ZONE_POSITIONS['extractions'];
    flyToItem({
      id: targetItem.id || targetItem.epc,
      epc: targetItem.epc,
      name: `${itemTerm} ${targetItem.epc.slice(-6).toUpperCase()}`,
      zone: targetItem.zone,
      position: pos as [number, number, number],
    });

    setTourLabel(`DWELL ALERT: ${targetItem.epc} - ${dwellDays} days in zone`);

    // Clear label after 5 seconds
    setTimeout(() => setTourLabel(null), 5000);
  };

  // Security Breach - Fly to item with RED alarm effects
  const demoUnauthorizedMovement = () => {
    stopTour();
    setActiveDemo('unauthorized');

    // Find or create an item near exit (entry zone simulates exit breach)
    const exitItems = items.filter(i => i.zone === 'entry' || i.zone === 'chain-custody');
    const targetItem = exitItems.length > 0
      ? exitItems[Math.floor(Math.random() * exitItems.length)]
      : generateDemoItem('entry');

    const itemTerm = tenantConfig?.itemTerm || 'Evidence Docket';
    const tenant = currentTenant || 'saps-forensics';

    // Set alert mode to SECURITY (red highlighting)
    if (setAlertMode) setAlertMode('security');

    addAnomaly({
      tenantId: tenant,
      itemEpc: targetItem.epc,
      itemName: `${itemTerm} ${targetItem.epc.slice(-6).toUpperCase()}`,
      type: 'unauthorized_zone',
      severity: 'critical',
      confidence: 97,
      message: `SECURITY BREACH: ${itemTerm} exited lab without Chain of Custody confirmation`,
      details: { fromZone: 'pcr-lab', toZone: 'entry' },
    });

    // Fly to the breached item
    const pos = targetItem.position || ZONE_POSITIONS[targetItem.zone] || ZONE_POSITIONS['entry'];
    flyToItem({
      id: targetItem.id || targetItem.epc,
      epc: targetItem.epc,
      name: `${itemTerm} ${targetItem.epc.slice(-6).toUpperCase()}`,
      zone: targetItem.zone,
      position: pos as [number, number, number],
    });

    setTourLabel(`🚨 SECURITY BREACH: ${targetItem.epc} - Unauthorized Exit!`);

    // Clear label after 5 seconds
    setTimeout(() => setTourLabel(null), 5000);
  };

  const demoUnusualSequence = () => {
    stopTour();
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

    // Fly to the item
    const pos = randomItem.position || ZONE_POSITIONS[randomItem.zone] || ZONE_POSITIONS['pcr-lab'];
    flyToItem({
      id: randomItem.id || randomItem.epc,
      epc: randomItem.epc,
      name: `${itemTerm} ${randomItem.epc.slice(-6).toUpperCase()}`,
      zone: randomItem.zone,
      position: pos as [number, number, number],
    });

    setTourLabel(`Route Anomaly: ${randomItem.epc} - Skipped processing steps`);
    setTimeout(() => setTourLabel(null), 5000);
  };

  const demoAfterHours = () => {
    stopTour();
    setActiveDemo('afterhours');
    const randomItem = items.length > 0
      ? items[Math.floor(Math.random() * items.length)]
      : generateDemoItem('chain-custody');

    const itemTerm = tenantConfig?.itemTerm || 'Evidence Docket';
    const tenant = currentTenant || 'saps-forensics';

    // Set alert mode to SECURITY (red highlighting)
    if (setAlertMode) setAlertMode('security');

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

    // Fly to the item
    const pos = randomItem.position || ZONE_POSITIONS[randomItem.zone] || ZONE_POSITIONS['chain-custody'];
    flyToItem({
      id: randomItem.id || randomItem.epc,
      epc: randomItem.epc,
      name: `${itemTerm} ${randomItem.epc.slice(-6).toUpperCase()}`,
      zone: randomItem.zone,
      position: pos as [number, number, number],
    });

    setTourLabel(`⚠️ After Hours: ${randomItem.epc} - Movement at 02:47 AM`);
    setTimeout(() => setTourLabel(null), 5000);
  };

  // Enhanced Cinematic Tour
  const demoStartCinematicTour = () => {
    stopTour();
    runCinematicTour(CINEMATIC_TOUR_WAYPOINTS, 'cinematic');
  };

  const resetDemo = () => {
    stopTour();
    setActiveDemo(null);
    if (setAlertMode) setAlertMode(null);
    clearAllAnomalies();
    clearDwellAlerts();
    selectItem(null);
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

        {/* Tour Label Overlay */}
        {tourLabel && (
          <div className="mb-3 px-3 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-500/50 text-center">
            <div className="flex items-center justify-center gap-2">
              <Eye className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-cyan-300 font-medium text-sm">{tourLabel}</span>
            </div>
            {tourWaypointIndex > 0 && activeDemo && (
              <div className="text-xs text-cyan-400/70 mt-1">
                {activeDemo === 'readers' && `Reader ${tourWaypointIndex} of ${READER_TOUR_WAYPOINTS.length}`}
                {activeDemo === 'inventory' && `Zone ${tourWaypointIndex} of ${INVENTORY_TOUR_WAYPOINTS.length}`}
                {activeDemo === 'cinematic' && `Scene ${tourWaypointIndex} of ${CINEMATIC_TOUR_WAYPOINTS.length}`}
              </div>
            )}
          </div>
        )}

        {/* Tour button */}
        <button
          onClick={demoStartCinematicTour}
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
