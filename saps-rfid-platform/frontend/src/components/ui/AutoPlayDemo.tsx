import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Radio,
  Package,
  AlertTriangle,
  Clock,
  MapPin,
  Zap,
  CheckCircle2,
  Presentation,
  X,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useSceneStore } from '../../stores/sceneStore';
import { useCameraStore } from '../../stores/cameraStore';
import { useWarehouseStore } from '../../stores/warehouseStore';
import { useAIAnalyticsStore } from '../../stores/aiAnalyticsStore';

/**
 * Auto-Play Demo Mode - SPII Funding Presentation
 *
 * Hands-free presentation that showcases all platform features
 * with smooth camera animations and AI alerts.
 */

interface DemoStep {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  duration: number;
  color: string;
  action: () => void;
  narration: string;
}

const DEMO_ZONES = ['receiving', 'shipping', 'storage-a', 'storage-b', 'processing', 'staging', 'secure-evidence', 'returns'];

const AutoPlayDemo = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepStartRef = useRef<number>(0);

  // Scene store for items and toggles
  const toggleReaders = useSceneStore((s) => s.toggleReaders);
  const toggleLabels = useSceneStore((s) => s.toggleLabels);
  const showReaders = useSceneStore((s) => s.showReaders);
  const showLabels = useSceneStore((s) => s.showLabels);
  const items = useSceneStore(useShallow((s) => s.items));

  // Camera store for actual camera control
  const cameraGoToPreset = useCameraStore((s) => s.goToPreset);
  const cameraFlyToZone = useCameraStore((s) => s.flyToZone);
  const cameraReset = useCameraStore((s) => s.reset);

  // Warehouse store for presets and zones
  const getCameraPreset = useWarehouseStore((s) => s.getCameraPreset);
  const getZone = useWarehouseStore((s) => s.getZone);

  // AI Analytics
  const addAnomaly = useAIAnalyticsStore((s) => s.addAnomaly);
  const addDwellAlert = useAIAnalyticsStore((s) => s.addDwellAlert);
  const clearAllAnomalies = useAIAnalyticsStore((s) => s.clearAllAnomalies);
  const clearDwellAlerts = useAIAnalyticsStore((s) => s.clearDwellAlerts);
  const tenantConfig = useAIAnalyticsStore((s) => s.tenantConfig);
  const currentTenant = useAIAnalyticsStore((s) => s.currentTenant);

  // Helper to go to preset using camera store
  const goToPreset = useCallback((presetId: string) => {
    const preset = getCameraPreset(presetId);
    if (preset) {
      cameraGoToPreset(preset);
    }
  }, [getCameraPreset, cameraGoToPreset]);

  // Helper to fly to zone using camera store
  const flyToZone = useCallback((zoneId: string) => {
    const zone = getZone(zoneId);
    if (zone) {
      cameraFlyToZone(zoneId, zone.center, zone.cameraPreset);
    }
  }, [getZone, cameraFlyToZone]);

  // Generate demo item
  const getRandomItem = useCallback(() => {
    if (items.length > 0) {
      return items[Math.floor(Math.random() * items.length)];
    }
    const labNum = Math.floor(Math.random() * 250) + 1;
    const epc = `LAB-${String(labNum).padStart(4, '0')}`;
    return {
      id: epc,
      epc,
      zone: DEMO_ZONES[Math.floor(Math.random() * DEMO_ZONES.length)],
      position: [0, 0, 0] as [number, number, number],
    };
  }, [items]);

  // Demo steps definition
  const demoSteps: DemoStep[] = [
    {
      id: 'overview',
      title: 'Platform Overview',
      subtitle: '3D Digital Twin for Asset Tracking',
      icon: Presentation,
      duration: 5000,
      color: '#3b82f6',
      narration: 'Welcome to the RFID Spatial Intelligence Platform - real-time 3D visualization of your entire facility.',
      action: () => goToPreset('overview'),
    },
    {
      id: 'readers',
      title: 'RFID Infrastructure',
      subtitle: '14 readers with complete coverage',
      icon: Radio,
      duration: 5000,
      color: '#06b6d4',
      narration: '14 strategically placed RFID readers provide complete zone coverage with sub-meter accuracy.',
      action: () => {
        if (!showReaders) toggleReaders();
        if (!showLabels) toggleLabels();
        goToPreset('overview');
      },
    },
    {
      id: 'inventory',
      title: 'Live Inventory Tracking',
      subtitle: `${items.length || 250}+ items in real-time`,
      icon: Package,
      duration: 5000,
      color: '#22c55e',
      narration: 'Every tagged item is tracked in real-time with full chain of custody and movement history.',
      action: () => goToPreset('storage'),
    },
    {
      id: 'secure',
      title: 'Secure Evidence Vault',
      subtitle: 'High-security restricted zone',
      icon: MapPin,
      duration: 5000,
      color: '#ef4444',
      narration: 'The secure vault features dual-reader verification and enhanced monitoring for critical evidence.',
      action: () => goToPreset('secureEvidence'),
    },
    {
      id: 'dwell',
      title: 'AI Alert: Dwell Time',
      subtitle: 'Item exceeding SLA threshold',
      icon: Clock,
      duration: 6000,
      color: '#f59e0b',
      narration: 'AI detects items stationary too long - critical for evidence processing SLA compliance.',
      action: () => {
        const item = getRandomItem();
        const itemTerm = tenantConfig?.itemTerm || 'Evidence Docket';
        const thresholdDays = tenantConfig?.alertThresholds?.dwellWarningDays || 14;
        const dwellDays = Math.round(thresholdDays * 2.3);

        addDwellAlert({
          itemEpc: item.epc,
          itemName: `${itemTerm} ${item.epc.slice(-6).toUpperCase()}`,
          zone: item.zone,
          zoneName: item.zone.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()),
          dwellMinutes: dwellDays * 1440,
          dwellDays,
          thresholdDays,
          severity: 'critical',
          enteredAt: new Date(Date.now() - dwellDays * 24 * 60 * 60 * 1000),
        });

        flyToZone(item.zone);
      },
    },
    {
      id: 'unauthorized',
      title: 'AI Alert: Security Breach',
      subtitle: 'Unauthorized zone exit detected',
      icon: AlertTriangle,
      duration: 6000,
      color: '#dc2626',
      narration: 'Real-time security alerts when items leave secure zones without proper authorization.',
      action: () => {
        const item = getRandomItem();
        const itemTerm = tenantConfig?.itemTerm || 'Evidence Docket';
        const tenant = currentTenant || 'saps-forensics';

        addAnomaly({
          tenantId: tenant,
          itemEpc: item.epc,
          itemName: `${itemTerm} ${item.epc.slice(-6).toUpperCase()}`,
          type: 'unauthorized_zone',
          severity: 'critical',
          confidence: 97,
          message: `SECURITY: ${itemTerm} removed from Secure Vault without authorization`,
          details: { fromZone: 'secure-evidence', toZone: 'shipping' },
        });

        flyToZone('secure-evidence');
      },
    },
    {
      id: 'sequence',
      title: 'AI Alert: Process Violation',
      subtitle: 'Unusual movement pattern',
      icon: Zap,
      duration: 5000,
      color: '#8b5cf6',
      narration: 'Machine learning identifies items skipping required processing steps - potential protocol violation.',
      action: () => {
        const item = getRandomItem();
        const itemTerm = tenantConfig?.itemTerm || 'Evidence Docket';
        const tenant = currentTenant || 'saps-forensics';

        addAnomaly({
          tenantId: tenant,
          itemEpc: item.epc,
          itemName: `${itemTerm} ${item.epc.slice(-6).toUpperCase()}`,
          type: 'unusual_sequence',
          severity: 'high',
          confidence: 89,
          message: `Unusual pattern: Vault to Shipping (skipped Processing)`,
          details: { fromZone: 'secure-evidence', toZone: 'shipping' },
        });

        goToPreset('processing');
      },
    },
    {
      id: 'complete',
      title: 'Demo Complete',
      subtitle: 'Ready for questions',
      icon: CheckCircle2,
      duration: 4000,
      color: '#10b981',
      narration: 'This concludes the automated demonstration. The platform is ready for your questions.',
      action: () => goToPreset('cinematic'),
    },
  ];

  // Clear timers
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
  }, []);

  // Execute a step and schedule next
  const executeStep = useCallback((stepIndex: number) => {
    if (stepIndex >= demoSteps.length) {
      setIsPlaying(false);
      clearTimers();
      return;
    }

    const step = demoSteps[stepIndex];
    setCurrentStep(stepIndex);
    setProgress(0);
    stepStartRef.current = Date.now();

    // Execute step action
    step.action();

    // Progress animation
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - stepStartRef.current;
      const pct = Math.min((elapsed / step.duration) * 100, 100);
      setProgress(pct);
    }, 50);

    // Schedule next step
    timerRef.current = setTimeout(() => {
      clearInterval(progressRef.current!);
      progressRef.current = null;
      executeStep(stepIndex + 1);
    }, step.duration);
  }, [demoSteps, clearTimers]);

  // Toggle play/pause
  const toggleDemo = useCallback(() => {
    if (isPlaying) {
      clearTimers();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      executeStep(currentStep);
    }
  }, [isPlaying, currentStep, executeStep, clearTimers]);

  // Skip to next step
  const skipStep = useCallback(() => {
    clearTimers();
    const next = Math.min(currentStep + 1, demoSteps.length - 1);
    if (isPlaying) {
      executeStep(next);
    } else {
      setCurrentStep(next);
      setProgress(0);
      demoSteps[next].action();
    }
  }, [currentStep, isPlaying, executeStep, clearTimers, demoSteps]);

  // Reset demo
  const resetDemo = useCallback(() => {
    clearTimers();
    setIsPlaying(false);
    setCurrentStep(0);
    setProgress(0);
    clearAllAnomalies();
    clearDwellAlerts();

    const overviewPreset = getCameraPreset('overview');
    if (overviewPreset) {
      cameraReset(overviewPreset);
    }
  }, [clearTimers, clearAllAnomalies, clearDwellAlerts, getCameraPreset, cameraReset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  // Keyboard shortcut (P for Presentation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key.toLowerCase() === 'p' && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        resetDemo();
      }
      // Space to toggle play/pause when open
      if (e.code === 'Space' && isOpen) {
        e.preventDefault();
        toggleDemo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, resetDemo, toggleDemo]);

  const currentStepData = demoSteps[currentStep];
  const Icon = currentStepData.icon;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl shadow-lg shadow-violet-500/25 transition-all hover:scale-105"
        title="Press P for Presentation Mode"
      >
        <Presentation className="w-5 h-5" />
        <span className="font-medium">Auto Demo</span>
        <kbd className="text-xs bg-white/20 px-1.5 py-0.5 rounded">P</kbd>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-80">
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-violet-500/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Presentation className="w-5 h-5 text-white" />
            <span className="text-white font-semibold">Presentation Mode</span>
          </div>
          <button
            onClick={() => { setIsOpen(false); resetDemo(); }}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-4">
          {/* Step indicators */}
          <div className="flex gap-1 mb-4">
            {demoSteps.map((step, i) => (
              <div
                key={step.id}
                className={`flex-1 h-1.5 rounded-full overflow-hidden ${
                  i < currentStep ? 'bg-violet-500' : 'bg-white/10'
                }`}
              >
                {i === currentStep && (
                  <div
                    className="h-full bg-violet-400 transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Current step */}
          <div
            className="p-3 rounded-xl border mb-4"
            style={{ backgroundColor: `${currentStepData.color}15`, borderColor: `${currentStepData.color}40` }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${currentStepData.color}30` }}
              >
                <span style={{ color: currentStepData.color }}><Icon className="w-5 h-5" /></span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-400">Step {currentStep + 1}/{demoSteps.length}</div>
                <h4 className="text-white font-semibold text-sm">{currentStepData.title}</h4>
                <p className="text-gray-400 text-xs truncate">{currentStepData.subtitle}</p>
              </div>
            </div>
            <p className="mt-2 text-gray-300 text-xs italic bg-black/20 rounded-lg p-2">
              "{currentStepData.narration}"
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={resetDemo}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4 text-gray-400" />
            </button>

            <button
              onClick={toggleDemo}
              className={`flex-1 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-white'
                  : 'bg-violet-600 hover:bg-violet-500 text-white'
              }`}
            >
              {isPlaying ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> {currentStep > 0 ? 'Resume' : 'Start'}</>}
            </button>

            <button
              onClick={skipStep}
              disabled={currentStep >= demoSteps.length - 1}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-30"
              title="Skip"
            >
              <SkipForward className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <p className="text-center text-xs text-gray-600 mt-3">
            <kbd className="px-1 bg-white/10 rounded">Space</kbd> play/pause &middot; <kbd className="px-1 bg-white/10 rounded">Esc</kbd> close
          </p>
        </div>
      </div>
    </div>
  );
};

export default AutoPlayDemo;
