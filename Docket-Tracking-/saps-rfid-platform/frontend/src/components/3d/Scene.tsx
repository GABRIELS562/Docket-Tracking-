import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useEffect, useRef, useState } from 'react';
// useMemo used in effectSettings
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import Warehouse from './Warehouse';
import { CameraController } from './Camera';
import { Stats, BakeShadows, AdaptiveDpr, AdaptiveEvents, PerformanceMonitor } from '@react-three/drei';
import { useSceneStore } from '../../stores/sceneStore';
import {
  initializeWarehouseStore,
  useCameraMode,
} from '../../stores';
import { useTenantConfig } from '../../stores/aiAnalyticsStore';
import { useAIAnomalyGenerator } from '../../hooks/useAIAnomalyGenerator';
import SearchInterface from '../ui/SearchInterface';
import ItemDetailsPanel from '../ui/ItemDetailsPanel';
import TourNarration from '../ui/TourNarration';
import DemoControls from '../ui/DemoControls';
import AutoPlayDemo from '../ui/AutoPlayDemo';
// QuickTenantSwitcher moved to sidebar
import AIAlertsPanel from '../ui/AIAlertsPanel';
import KeyboardShortcuts from '../ui/KeyboardShortcuts';
import RFIDItems from './RFIDItems';

/**
 * Enhanced 3D Scene Container
 *
 * Professional-grade React Three Fiber canvas with:
 * - Post-processing effects (Bloom, SSAO, Vignette)
 * - HDR environment mapping
 * - Adaptive performance scaling
 * - Professional tone mapping
 * - Shadow baking for performance
 *
 * Performance optimizations:
 * - Adaptive DPR (Device Pixel Ratio)
 * - Performance monitoring with auto-degradation
 * - Lazy loading with Suspense
 * - Preloading critical assets
 */
const Scene = () => {
  // Use individual selectors to avoid subscribing to all store changes
  const renderQuality = useSceneStore((s) => s.renderQuality);
  const setFps = useSceneStore((s) => s.setFps);
  const tenantConfig = useTenantConfig();

  // Panel visibility state - Demo shown by default for presentation
  const [showROI, setShowROI] = useState(false);
  const [showDemo, setShowDemo] = useState(true);

  // NEW: Warehouse initialization - loads SAPS Forensics config by default
  useEffect(() => {
    // Initialize warehouse store with default SAPS warehouse
    console.log('[Scene] Initializing warehouse store...');
    initializeWarehouseStore().then(() => {
      console.log('[Scene] Warehouse store initialized');
    });
  }, []);

  // Initialize AI anomaly generator (generates demo anomalies)
  useAIAnomalyGenerator({
    enabled: !!tenantConfig,
    anomalyIntervalMs: 20000, // Generate anomaly every 20 seconds
    dwellAlertIntervalMs: 45000, // Generate dwell alerts every 45 seconds
  });

  // Quality-based effect settings
  const effectSettings = useMemo(() => {
    const settings = {
      low: {
        bloomIntensity: 0.3,
        bloomLuminanceThreshold: 0.9,
        aoSamples: 8,
        aoRadius: 2,
        enableVignette: false,
      },
      medium: {
        bloomIntensity: 0.5,
        bloomLuminanceThreshold: 0.7,
        aoSamples: 16,
        aoRadius: 3,
        enableVignette: true,
      },
      high: {
        bloomIntensity: 0.8,
        bloomLuminanceThreshold: 0.5,
        aoSamples: 32,
        aoRadius: 4,
        enableVignette: true,
      },
    };
    return settings[renderQuality];
  }, [renderQuality]);

  return (
    <div className="relative w-full h-full" style={{ minHeight: '100vh' }}>
      {/* Three.js Canvas - explicit sizing */}
      <Canvas
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        camera={{
          position: [60, 45, 60],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        shadows
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
      >
        {/* Sky blue background */}
        <color attach="background" args={['#b8d4e8']} />

        {/* Bright ambient light for visibility */}
        <ambientLight intensity={1.8} color="#ffffff" />

        {/* Main sun light - high position for natural shadows */}
        <directionalLight
          position={[50, 100, 50]}
          intensity={2.2}
          color="#fffbf0"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={200}
          shadow-camera-left={-80}
          shadow-camera-right={80}
          shadow-camera-top={80}
          shadow-camera-bottom={-80}
        />

        {/* Fill light from opposite side */}
        <directionalLight
          position={[-40, 60, -30]}
          intensity={1.0}
          color="#e8f4ff"
        />

        {/* Sky/ground hemisphere light */}
        <hemisphereLight args={['#87ceeb', '#e8e4d8', 1.0]} />

        {/* Camera controller */}
        <CameraController />

        {/* Performance monitoring */}
        <PerformanceMonitor
          onIncline={() => setFps(60)}
          onDecline={() => setFps(30)}
          flipflops={3}
        >
          <AdaptiveDpr pixelated />
          <AdaptiveEvents />

          {/* 3D Warehouse model and RFID items */}
          <Suspense fallback={<LoadingPlaceholder />}>
            <Warehouse />
            <RFIDItems />
            <BakeShadows />
          </Suspense>

          {/* Post-processing effects */}
          {renderQuality !== 'low' && (
            <EffectComposer multisampling={4}>
              <Bloom
                intensity={effectSettings.bloomIntensity}
                luminanceThreshold={effectSettings.bloomLuminanceThreshold}
                luminanceSmoothing={0.9}
                mipmapBlur
                radius={0.6}
              />
              <Vignette
                offset={0.3}
                darkness={effectSettings.enableVignette ? 0.4 : 0}
                blendFunction={BlendFunction.NORMAL}
              />
            </EffectComposer>
          )}

          {/* Light fog for depth */}
          <fog attach="fog" args={['#b8d4e8', 180, 450]} />
        </PerformanceMonitor>

        {/* Real-time FPS monitoring - updates store for UI display */}
        <FPSMonitor />

        {/* Development stats - only in dev mode */}
        {import.meta.env.DEV && <Stats showPanel={0} className="stats" />}
      </Canvas>

      {/* Search Interface - Primary interaction */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-4">
        <SearchInterface />
      </div>

      {/* Demo Controls Panel - RIGHT SIDE - Main demo interface */}
      {showDemo && <DemoControls />}

      {/* Auto-Play Demo - hands-free presentation mode (press P) */}
      <AutoPlayDemo />

      {/* Item Details Panel - shows when item is selected */}
      <ItemDetailsPanel />

      {/* Tour Narration - shows during automated tour */}
      <TourNarration />

      {/* AI Alerts Panel - shows anomalies on LEFT side */}
      <AIAlertsPanel />

      {/* Keyboard Shortcuts help */}
      <KeyboardShortcuts />

      {/* Simplified Scene overlay UI - minimal for clean demo */}
      <SceneOverlayMinimal
        showDemo={showDemo}
        setShowDemo={setShowDemo}
        showROI={showROI}
        setShowROI={setShowROI}
      />
    </div>
  );
};

/**
 * Loading placeholder while warehouse loads
 */
const LoadingPlaceholder = () => {
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[10, 10, 10]} />
      <meshStandardMaterial color="#1e40af" wireframe />
    </mesh>
  );
};

/**
 * Real-time FPS Monitor - measures actual frame rate
 * Uses circular buffer for O(1) frame time tracking (no array shift)
 */
const FPSMonitor = () => {
  const setFps = useSceneStore((s) => s.setFps);
  // Circular buffer - pre-allocated for 60 frames
  const frameTimesRef = useRef<Float32Array>(new Float32Array(60));
  const frameIndexRef = useRef(0);
  const frameSumRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const updateIntervalRef = useRef(0);

  useFrame(() => {
    const now = performance.now();
    const delta = now - lastTimeRef.current;
    lastTimeRef.current = now;

    // Circular buffer update - O(1) operation
    const index = frameIndexRef.current % 60;
    frameSumRef.current -= frameTimesRef.current[index]; // Remove old value
    frameSumRef.current += delta; // Add new value
    frameTimesRef.current[index] = delta;
    frameIndexRef.current++;

    // Update FPS every ~500ms (not every frame)
    updateIntervalRef.current += delta;
    if (updateIntervalRef.current >= 500) {
      updateIntervalRef.current = 0;

      // Calculate average FPS from circular buffer
      const frameCount = Math.min(frameIndexRef.current, 60);
      const avgFrameTime = frameSumRef.current / frameCount;
      const fps = Math.round(1000 / avgFrameTime);

      // Clamp to reasonable range
      setFps(Math.min(Math.max(fps, 1), 120));
    }
  });

  return null;
};

/**
 * Simplified Scene overlay for clean demo presentation
 * Removes clutter, keeps only essential controls
 */
interface SceneOverlayMinimalProps {
  showDemo: boolean;
  setShowDemo: (show: boolean) => void;
  showROI: boolean;
  setShowROI: (show: boolean) => void;
}

const SceneOverlayMinimal = ({ }: SceneOverlayMinimalProps) => {
  const cameraMode = useCameraMode();

  // Only show minimal hints - keep the 3D view clean
  return (
    <>
      {/* Bottom center - Minimal navigation hints */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        {cameraMode === 'walk' ? (
          <div className="bg-emerald-900/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-emerald-500/30">
            <div className="flex items-center gap-3 text-emerald-300 text-xs">
              <span className="text-emerald-400 font-medium">🚶 Walk Mode</span>
              <span className="text-emerald-600">|</span>
              <span>Arrows: Move/Turn</span>
              <span className="text-emerald-600">|</span>
              <span className="text-white font-medium">G: Exit</span>
            </div>
          </div>
        ) : (
          <div className="bg-black/50 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/10">
            <div className="flex items-center gap-4 text-gray-500 text-[11px]">
              <span>Drag: Rotate</span>
              <span>Scroll: Zoom</span>
              <span className="text-cyan-400">T: Tour</span>
              <span className="text-cyan-400">G: Walk</span>
              <span>?: Help</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Scene;
