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
import { useAIAnalyticsStore } from '../../stores/aiAnalyticsStore';

/**
 * Auto-Play Demo Mode
 *
 * Hands-free presentation mode that runs through all demo scenarios
 * with perfect timing. Ideal for funding pitches and client demos.
 */

interface DemoStep {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  duration: number; // milliseconds
  color: string;
  action: () => void;
  narration: string;
}

const DEMO_ZONES = ['receiving', 'shipping', 'storage-a', 'storage-b', 'processing', 'staging', 'secure-storage', 'returns'];

const AutoPlayDemo = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Scene store actions
  const goToPreset = useSceneStore((s) => s.goToPreset);
  const flyToZone = useSceneStore((s) => s.flyToZone);
  const toggleReaders = useSceneStore((s) => s.toggleReaders);
  const toggleLabels = useSceneStore((s) => s.toggleLabels);
  const showReaders = useSceneStore((s) => s.showReaders);
  const showLabels = useSceneStore((s) => s.showLabels);
  const items = useSceneStore(useShallow((s) => s.items));

  // AI Analytics store actions
  const addAnomaly = useAIAnalyticsStore((s) => s.addAnomaly);
  const addDwellAlert = useAIAnalyticsStore((s) => s.addDwellAlert);
  const clearAllAnomalies = useAIAnalyticsStore((s) => s.clearAllAnomalies);
  const tenantConfig = useAIAnalyticsStore((s) => s.tenantConfig);
  const currentTenant = useAIAnalyticsStore((s) => s.currentTenant);

  // Generate demo item helper - uses LAB-XXXX format
  const getRandomItem = useCallback(() => {
    if (items.length > 0) {
      return items[Math.floor(Math.random() * items.length)];
    }
    const labNum = Math.floor(Math.random() * 250) + 1; // LAB-0001 to LAB-0250
    const epc = `LAB-${String(labNum).padStart(4, '0')}`;
    return {
      id: epc,
      epc,
      zone: DEMO_ZONES[Math.floor(Math.random() * DEMO_ZONES.length)],
      position: [0, 0, 0] as [number, number, number],
    };
  }, [items]);

  // Define demo steps
  const demoSteps: DemoStep[] = [
    {
      id: 'overview',
      title: 'Platform Overview',
      subtitle: 'Multi-tenant RFID spatial intelligence',
      icon: Presentation,
      duration: 6000,
      color: '#3b82f6',
      narration: 'Welcome to the RFID Spatial Intelligence Platform - a real-time 3D digital twin for asset tracking.',
      action: () => {
        goToPreset('overview');
      },
    },
    {
      id: 'readers',
      title: 'RFID Infrastructure',
      subtitle: '14 strategically placed readers',
      icon: Radio,
      duration: 5000,
      color: '#06b6d4',
      narration: '14 RFID readers provide complete coverage across all warehouse zones.',
      action: () => {
        if (!showReaders) toggleReaders();
        if (!showLabels) toggleLabels();
        goToPreset('overview');
      },
    },
    {
      id: 'inventory',
      title: 'Live Inventory',
      subtitle: `${items.length || 250}+ items tracked in real-time`,
      icon: Package,
      duration: 5000,
      color: '#22c55e',
      narration: `Over ${items.length || 250} items are tracked in real-time with sub-meter accuracy.`,
      action: () => {
        goToPreset('storage');
      },
    },
    {
      id: 'secure',
      title: 'Secure Storage',
      subtitle: 'High-security evidence vault',
      icon: MapPin,
      duration: 5000,
      color: '#ef4444',
      narration: 'The secure vault provides enhanced monitoring for critical assets with dual-reader verification.',
      action: () => {
        goToPreset('secureEvidence');
      },
    },
    {
      id: 'dwell',
      title: 'AI Alert: Dwell Time',
      subtitle: 'Item exceeding time threshold',
      icon: Clock,
      duration: 6000,
      color: '#f59e0b',
      narration: 'AI detects items that have been stationary too long - critical for evidence processing SLAs.',
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
          message: `SECURITY ALERT: ${itemTerm} removed from Secure Storage without authorization`,
          details: {
            fromZone: 'secure-storage',
            toZone: 'shipping',
            reason: 'No matching authorization record found in access control system',
          },
        });

        flyToZone('secure-storage');
      },
    },
    {
      id: 'sequence',
      title: 'AI Alert: Process Violation',
      subtitle: 'Unusual movement sequence',
      icon: Zap,
      duration: 5000,
      color: '#8b5cf6',
      narration: 'Machine learning identifies unusual patterns - items skipping required processing steps.',
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
          message: `Unusual movement: Secure Storage → Shipping (skipped Processing)`,
          details: {
            fromZone: 'secure-storage',
            toZone: 'shipping',
            reason: 'This sequence occurs in only 2.1% of cases - possible protocol violation',
          },
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
      narration: 'This concludes the automated demo. The platform is ready for your questions.',
      action: () => {
        goToPreset('cinematic');
      },
    },
  ];

  const totalDuration = demoSteps.reduce((sum, step) => sum + step.duration, 0);

  // Start/stop demo
  const toggleDemo = useCallback(() => {
    if (isPlaying) {
      // Pause
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      setIsPlaying(false);
    } else {
      // Play
      setIsPlaying(true);

      // Execute current step action
      demoSteps[currentStep].action();

      // Progress within current step
      let stepProgress = 0;
      const stepDuration = demoSteps[currentStep].duration;
      progressRef.current = setInterval(() => {
        stepProgress += 100;
        setProgress((stepProgress / stepDuration) * 100);
        setElapsedTime(prev => prev + 100);
      }, 100);

      // Move to next step
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          const next = prev + 1;
          if (next >= demoSteps.length) {
            // Demo complete
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (progressRef.current) clearInterval(progressRef.current);
            setIsPlaying(false);
            return prev;
          }

          // Reset progress for new step
          setProgress(0);
          demoSteps[next].action();

          // Restart progress timer for new step
          if (progressRef.current) clearInterval(progressRef.current);
          let newStepProgress = 0;
          const newStepDuration = demoSteps[next].duration;
          progressRef.current = setInterval(() => {
            newStepProgress += 100;
            setProgress((newStepProgress / newStepDuration) * 100);
            setElapsedTime(prev => prev + 100);
          }, 100);

          return next;
        });
      }, demoSteps[currentStep].duration);
    }
  }, [isPlaying, currentStep, demoSteps]);

  // Skip to next step
  const skipStep = useCallback(() => {
    if (progressRef.current) clearInterval(progressRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    setCurrentStep(prev => {
      const next = Math.min(prev + 1, demoSteps.length - 1);
      demoSteps[next].action();

      if (isPlaying && next < demoSteps.length - 1) {
        // Continue playing from new step
        setProgress(0);
        let stepProgress = 0;
        const stepDuration = demoSteps[next].duration;
        progressRef.current = setInterval(() => {
          stepProgress += 100;
          setProgress((stepProgress / stepDuration) * 100);
        }, 100);

        intervalRef.current = setInterval(() => {
          setCurrentStep(p => {
            const n = p + 1;
            if (n >= demoSteps.length) {
              if (intervalRef.current) clearInterval(intervalRef.current);
              if (progressRef.current) clearInterval(progressRef.current);
              setIsPlaying(false);
              return p;
            }
            setProgress(0);
            demoSteps[n].action();
            return n;
          });
        }, demoSteps[next].duration);
      }

      return next;
    });
  }, [isPlaying, demoSteps]);

  // Reset demo
  const resetDemo = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    setIsPlaying(false);
    setCurrentStep(0);
    setProgress(0);
    setElapsedTime(0);
    clearAllAnomalies();
    goToPreset('overview');
  }, [clearAllAnomalies, goToPreset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  // Keyboard shortcut to open (P for Presentation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p' && !isOpen) {
        if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
          e.preventDefault();
          setIsOpen(true);
        }
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        resetDemo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, resetDemo]);

  const currentStepData = demoSteps[currentStep];
  const Icon = currentStepData.icon;

  if (!isOpen) {
    // Floating button to open
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 left-4 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl shadow-lg shadow-violet-500/25 transition-all hover:scale-105"
        title="Press P for Presentation Mode"
      >
        <Presentation className="w-5 h-5" />
        <span className="font-medium">Auto Demo</span>
        <span className="text-xs text-violet-200 ml-1">(P)</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 left-4 z-50 w-96">
      {/* Main Panel */}
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-violet-500/30 shadow-2xl shadow-violet-500/20 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Presentation className="w-5 h-5 text-white" />
            <div>
              <h3 className="text-white font-semibold text-sm">Presentation Mode</h3>
              <p className="text-violet-200 text-xs">
                {Math.floor(elapsedTime / 1000)}s / {Math.floor(totalDuration / 1000)}s
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              resetDemo();
            }}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Current Step Display */}
        <div className="p-4">
          {/* Step indicator */}
          <div className="flex items-center gap-1 mb-4">
            {demoSteps.map((step, i) => (
              <div
                key={step.id}
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  i < currentStep
                    ? 'bg-violet-500'
                    : i === currentStep
                    ? 'bg-violet-400'
                    : 'bg-white/10'
                }`}
              >
                {i === currentStep && (
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Current step card */}
          <div
            className="p-4 rounded-xl border transition-all"
            style={{
              backgroundColor: `${currentStepData.color}15`,
              borderColor: `${currentStepData.color}40`,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${currentStepData.color}30` }}
              >
                <span style={{ color: currentStepData.color }}>
                  <Icon className="w-6 h-6" />
                </span>
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-400 mb-0.5">
                  Step {currentStep + 1} of {demoSteps.length}
                </div>
                <h4 className="text-white font-semibold">{currentStepData.title}</h4>
                <p className="text-gray-400 text-sm">{currentStepData.subtitle}</p>
              </div>
            </div>

            {/* Narration text */}
            <div className="mt-3 p-3 bg-black/30 rounded-lg">
              <p className="text-gray-300 text-sm italic">
                "{currentStepData.narration}"
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={resetDemo}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
              title="Reset Demo"
            >
              <RotateCcw className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={toggleDemo}
              className={`px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-white'
                  : 'bg-violet-600 hover:bg-violet-500 text-white'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  {currentStep > 0 ? 'Resume' : 'Start Demo'}
                </>
              )}
            </button>

            <button
              onClick={skipStep}
              disabled={currentStep >= demoSteps.length - 1}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Skip to Next"
            >
              <SkipForward className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Keyboard hint */}
          <p className="text-center text-xs text-gray-600 mt-3">
            Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded">ESC</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
};

export default AutoPlayDemo;
