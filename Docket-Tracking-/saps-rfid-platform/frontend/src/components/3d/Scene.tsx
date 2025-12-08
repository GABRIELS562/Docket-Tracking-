import { Canvas } from '@react-three/fiber';
import { Suspense, useMemo, useEffect } from 'react';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Spinner } from '../ui/Spinner';
import Warehouse from './Warehouse';
import { CameraController } from './Camera';
import { Stats, BakeShadows, AdaptiveDpr, AdaptiveEvents, PerformanceMonitor } from '@react-three/drei';
import { useSceneStore } from '../../stores/sceneStore';
import {
  useWarehouseStore,
  initializeWarehouseStore,
  useCameraStore,
  useCameraMode,
  useVisibleCount,
  useTotalItemCount,
} from '../../stores';
import { usePerformance, useTotalItemCount as useLegacyTotalItemCount } from '../../stores/virtualizedAppStore';
import { useTenantConfig } from '../../stores/aiAnalyticsStore';
import { useAIAnomalyGenerator } from '../../hooks/useAIAnomalyGenerator';
import SearchInterface from '../ui/SearchInterface';
import RealTimeAnalytics from '../ui/RealTimeAnalytics';
import ItemDetailsPanel from '../ui/ItemDetailsPanel';
import HelpGuide from '../ui/HelpGuide';
import TourNarration from '../ui/TourNarration';
import AIAlertsPanel from '../ui/AIAlertsPanel';
import DemoControls from '../ui/DemoControls';

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

  // NEW: Warehouse initialization - loads SAPS Forensics config by default
  useEffect(() => {
    // Initialize warehouse store with default SAPS warehouse
    initializeWarehouseStore();
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
    <div className="relative w-full h-full bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Loading overlay with animated spinner */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Spinner size="lg" />
                <p className="mt-4 text-blue-400 text-sm font-medium animate-pulse">
                  Loading 3D Warehouse...
                </p>
                <p className="mt-2 text-gray-500 text-xs">
                  Preparing visualization engine
                </p>
              </div>
            </div>
          }
        >
          <div />
        </Suspense>
      </div>

      {/* Three.js Canvas */}
      <Canvas
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
        {/* Performance monitoring - auto-adjusts quality */}
        <PerformanceMonitor
          onIncline={() => setFps(60)}
          onDecline={() => setFps(30)}
          flipflops={3}
        >
          {/* Adaptive DPR for smooth scaling */}
          <AdaptiveDpr pixelated />
          <AdaptiveEvents />

          {/* Background color - lighter sky blue gradient feel */}
          <color attach="background" args={['#e8f4fc']} />

          {/* HDR Environment - disabled for stability */}
          {/* <Suspense fallback={null}>
            <Environment preset="warehouse" background={false} />
          </Suspense> */}

          {/* Bright ambient light */}
          <ambientLight intensity={1.5} color="#ffffff" />

          {/* Main sun light */}
          <directionalLight
            position={[50, 100, 50]}
            intensity={2.5}
            color="#fffaf0"
            castShadow
          />

          {/* Fill light */}
          <directionalLight
            position={[-40, 60, -30]}
            intensity={1.2}
            color="#f0f8ff"
          />

          {/* Sky/ground gradient */}
          <hemisphereLight args={['#87ceeb', '#f5f5dc', 1.2]} />

          {/* NEW: Unified Camera Controller - handles all modes */}
          <CameraController />

          {/* 3D Warehouse model */}
          <Suspense fallback={<LoadingPlaceholder />}>
            <Warehouse />
            <BakeShadows />
          </Suspense>

          {/* Post-processing effects for professional visual quality */}
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

          {/* Light fog matching background */}
          <fog attach="fog" args={['#e8f4fc', 150, 400]} />

          {/* Ground plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
            <planeGeometry args={[500, 500]} />
            <meshStandardMaterial
              color="#d4d4d4"
              roughness={0.9}
              metalness={0.1}
            />
          </mesh>
        </PerformanceMonitor>

        {/* Development stats */}
        {import.meta.env.DEV && <Stats showPanel={0} className="stats" />}
      </Canvas>

      {/* Search Interface - Primary interaction */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4">
        <SearchInterface />
      </div>

      {/* Real-Time Analytics Panel */}
      <RealTimeAnalytics />

      {/* AI Alerts Panel - shows anomalies and dwell alerts */}
      {tenantConfig && <AIAlertsPanel />}

      {/* Demo Controls - presentation helper (always render - it auto-initializes tenant) */}
      <DemoControls />

      {/* Item Details Panel - shows when item is selected */}
      <ItemDetailsPanel />

      {/* Help Guide */}
      <HelpGuide />

      {/* Tour Narration - shows during automated tour */}
      <TourNarration />

      {/* Scene overlay UI */}
      <SceneOverlay />
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
 * Scene overlay with controls and info
 */
const SceneOverlay = () => {
  // NEW: Use unified stores for camera and warehouse
  const cameraStore = useCameraStore();
  const cameraPresets = useWarehouseStore((s) => s.currentWarehouse?.cameraPresets);

  // Camera state from new store
  const cameraMode = useCameraMode();
  const toggleWalkMode = cameraStore.toggleWalkMode;
  const resetCamera = cameraStore.reset;

  // Legacy scene store for display toggles (will migrate later)
  const sceneVisibleCount = useSceneStore((s) => s.visibleItemCount);
  const sceneFps = useSceneStore((s) => s.fps);
  const renderQuality = useSceneStore((s) => s.renderQuality);
  const setRenderQuality = useSceneStore((s) => s.setRenderQuality);
  const showGrid = useSceneStore((s) => s.showGrid);
  const showLabels = useSceneStore((s) => s.showLabels);
  const showPaths = useSceneStore((s) => s.showPaths);
  const showReaders = useSceneStore((s) => s.showReaders);
  const showHeatmap = useSceneStore((s) => s.showHeatmap);
  const toggleGrid = useSceneStore((s) => s.toggleGrid);
  const toggleLabels = useSceneStore((s) => s.toggleLabels);
  const togglePaths = useSceneStore((s) => s.togglePaths);
  const toggleReaders = useSceneStore((s) => s.toggleReaders);
  const toggleHeatmap = useSceneStore((s) => s.toggleHeatmap);

  // NEW: Items count from unified store
  const newVisibleCount = useVisibleCount();
  const newTotalItemCount = useTotalItemCount();

  // Get performance metrics from virtualized store
  const virtualizedPerf = usePerformance();
  // Use dedicated hook that returns a stable primitive
  const legacyTotalItemCount = useLegacyTotalItemCount();

  // Use new store count if available, fallback to legacy
  const visibleItemCount = newVisibleCount || virtualizedPerf.visibleItemCount || sceneVisibleCount;
  const totalItemCount = newTotalItemCount || legacyTotalItemCount;
  const fps = virtualizedPerf.fps || sceneFps;

  // NEW: Build presets from warehouse config
  const presets = useMemo(() => {
    if (!cameraPresets) {
      return [
        { id: 'overview', name: 'Overview', key: '1' },
        { id: 'topDown', name: 'Top', key: '2' },
        { id: 'secureEvidence', name: 'Vault', key: '7' },
        { id: 'cinematic', name: 'Cinematic', key: '9' },
      ];
    }
    // Return first 4 presets with keyboard shortcuts
    return cameraPresets
      .filter((p) => p.keyboardShortcut)
      .slice(0, 4)
      .map((p) => ({
        id: p.id,
        name: p.name,
        key: p.keyboardShortcut || '',
      }));
  }, [cameraPresets]);

  const toggles = useMemo(() => [
    { id: 'grid', label: 'Grid', active: showGrid, toggle: toggleGrid },
    { id: 'labels', label: 'Labels', active: showLabels, toggle: toggleLabels },
    { id: 'paths', label: 'Paths', active: showPaths, toggle: togglePaths },
    { id: 'readers', label: 'Readers', active: showReaders, toggle: toggleReaders },
    { id: 'heatmap', label: 'Heatmap', active: showHeatmap, toggle: toggleHeatmap },
  ], [showGrid, showLabels, showPaths, showReaders, showHeatmap, toggleGrid, toggleLabels, togglePaths, toggleReaders, toggleHeatmap]);

  return (
    <>
      {/* Top left - Title and status */}
      <div className="absolute top-4 left-4 z-20">
        <div className="bg-black/60 backdrop-blur-md rounded-xl px-4 py-3 border border-white/10">
          <h2 className="text-white font-semibold text-sm">Multi-Tenant RFID Platform</h2>
          <p className="text-gray-400 text-[10px] mt-0.5">Digital Twin Visualization</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-cyan-400 text-xs font-medium">Demo Mode</span>
          </div>
        </div>
      </div>

      {/* Top right - Stats */}
      <div className="absolute top-4 right-4 z-20">
        <div className="bg-black/60 backdrop-blur-md rounded-xl px-4 py-3 border border-white/10 space-y-1">
          <div className="flex items-center justify-between gap-8">
            <span className="text-gray-400 text-xs">Visible Items</span>
            <span className="text-white font-mono text-sm">{visibleItemCount.toLocaleString()}</span>
          </div>
          {totalItemCount > 0 && (
            <div className="flex items-center justify-between gap-8">
              <span className="text-gray-400 text-xs">Total Items</span>
              <span className="text-cyan-400 font-mono text-sm">{totalItemCount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-8">
            <span className="text-gray-400 text-xs">FPS</span>
            <span className={`font-mono text-sm ${fps >= 50 ? 'text-emerald-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
              {fps}
            </span>
          </div>
          {/* Performance mode indicator */}
          <div className="flex items-center justify-between gap-8 pt-1 border-t border-white/5">
            <span className="text-gray-500 text-[10px]">Render Mode</span>
            <span className={`text-[10px] font-medium ${renderQuality === 'high' ? 'text-emerald-400' : renderQuality === 'medium' ? 'text-yellow-400' : 'text-gray-400'}`}>
              {renderQuality === 'low' ? 'Legacy' : 'Instanced'}
            </span>
          </div>
        </div>
      </div>

      {/* Left side - Camera presets */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
        <div className="bg-black/60 backdrop-blur-md rounded-xl p-2 border border-white/10">
          <div className="text-gray-500 text-xs mb-2 px-2">Views</div>
          <div className="flex flex-col gap-1">
            {presets.map((preset) => {
              // Find the preset config from warehouse
              const presetConfig = cameraPresets?.find((p) => p.id === preset.id);
              return (
                <button
                  key={preset.id}
                  onClick={() => presetConfig && cameraStore.goToPreset(presetConfig)}
                  className="px-3 py-2 rounded-lg text-xs font-medium transition-all text-left bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                >
                  <span>{preset.name}</span>
                  <span className="ml-2 text-gray-600 text-[10px]">{preset.key}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right side - Visualization toggles */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20">
        <div className="bg-black/60 backdrop-blur-md rounded-xl p-2 border border-white/10">
          <div className="text-gray-500 text-xs mb-2 px-2">Display</div>
          <div className="flex flex-col gap-1">
            {toggles.map((toggle) => (
              <button
                key={toggle.id}
                onClick={toggle.toggle}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all text-left flex items-center gap-2 ${
                  toggle.active
                    ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${toggle.active ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                {toggle.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom left - Quality controls */}
      <div className="absolute bottom-4 left-4 z-20">
        <div className="bg-black/60 backdrop-blur-md rounded-xl p-3 border border-white/10">
          <div className="text-gray-400 text-xs mb-2">Render Quality</div>
          <div className="flex gap-1">
            {(['low', 'medium', 'high'] as const).map((quality) => (
              <button
                key={quality}
                onClick={() => setRenderQuality(quality)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  renderQuality === quality
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
                }`}
              >
                {quality.charAt(0).toUpperCase() + quality.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom right - Camera controls */}
      <div className="absolute bottom-4 right-4 z-20">
        <div className="bg-black/60 backdrop-blur-md rounded-xl p-3 border border-white/10">
          <button
            onClick={() => resetCamera()}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-medium transition-all flex items-center gap-2"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset View
          </button>
        </div>
      </div>

      {/* Bottom center - Navigation hints / Walk mode controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        {cameraMode === 'walk' ? (
          // Walk mode instructions
          <div className="bg-emerald-900/80 backdrop-blur-sm rounded-xl px-6 py-3 border border-emerald-500/30">
            <div className="text-center mb-2">
              <span className="text-emerald-400 font-medium">Walk Mode Active</span>
            </div>
            <div className="flex items-center gap-4 text-emerald-300 text-xs">
              <span>Click to lock mouse</span>
              <span className="text-emerald-600">|</span>
              <span>WASD: Move</span>
              <span className="text-emerald-600">|</span>
              <span>Shift: Sprint</span>
              <span className="text-emerald-600">|</span>
              <span>Mouse: Look</span>
              <span className="text-emerald-600">|</span>
              <span className="text-white">ESC: Exit</span>
            </div>
          </div>
        ) : (
          // Normal mode instructions
          <div className="bg-black/40 backdrop-blur-sm rounded-full px-4 py-2 border border-white/5">
            <div className="flex items-center gap-4 text-gray-500 text-xs">
              <span>Drag: Rotate</span>
              <span className="text-gray-700">|</span>
              <span>Scroll: Zoom</span>
              <span className="text-gray-700">|</span>
              <button
                onClick={toggleWalkMode}
                className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
              >
                Walk Mode
              </button>
              <span className="text-gray-700">|</span>
              <span className="text-cyan-400">T: Tour</span>
              <span className="text-gray-700">|</span>
              <span>1-8: Views</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Scene;
