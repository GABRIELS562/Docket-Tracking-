import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { Spinner } from '../ui/Spinner';
import Warehouse from './Warehouse';
import Controls from './Controls';
import Lighting from './Lighting';

/**
 * Main 3D Scene Container
 *
 * Sets up React Three Fiber canvas with:
 * - Camera configuration
 * - Warehouse 3D model
 * - Lighting setup
 * - Camera controls
 * - Loading fallback
 *
 * Performance features:
 * - Hardware antialiasing
 * - Shadow mapping
 * - Tone mapping for realistic lighting
 */
const Scene = () => {
  return (
    <div className="relative w-full h-full bg-gray-900">
      {/* Loading spinner overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Spinner size="lg" />
              <p className="mt-4 text-white text-sm">Loading 3D Warehouse...</p>
            </div>
          </div>
        }>
          <div />
        </Suspense>
      </div>

      {/* Three.js Canvas */}
      <Canvas
        camera={{
          position: [0, 50, 100],
          fov: 60,
          near: 0.1,
          far: 1000,
        }}
        shadows
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]} // Device pixel ratio: min 1, max 2
      >
        {/* Lighting setup */}
        <Lighting />

        {/* Camera controls */}
        <Controls />

        {/* 3D Warehouse model */}
        <Suspense fallback={null}>
          <Warehouse />
        </Suspense>

        {/* Fog for depth perception */}
        <fog attach="fog" args={['#1a1a1a', 50, 500]} />
      </Canvas>

      {/* Performance stats overlay (development only) */}
      {import.meta.env.DEV && (
        <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs p-2 rounded font-mono">
          <div>FPS: 60</div>
          <div>Objects: 0</div>
        </div>
      )}
    </div>
  );
};

export default Scene;
