import { Suspense, lazy, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import Canvas3DErrorBoundary from './Canvas3DErrorBoundary';
import ZoneOverview3D from './ZoneOverview3D';
import HeatMapOverlay from './HeatMapOverlay';
import FloorPlanOverlay from './FloorPlanOverlay';
import CameraController from './CameraController';
import type { Zone } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { useUIStore } from '@/store/useUIStore';

// Legacy imports for backwards compatibility (lazy loaded for bundle optimization)
const ForensicBuilding = lazy(() => import('./ForensicBuilding'));
const RfidParticles = lazy(() => import('./RfidParticles'));
import type { Docket } from '@/lib/api';

/**
 * Calculate grid layout for zones based on count
 */
function calculateGridLayout(count: number): { cols: number } {
  const cols = Math.ceil(Math.sqrt(count));
  return { cols };
}

/**
 * Calculate zone position in grid (matches ZoneOverview3D logic)
 */
function getZonePosition(index: number, cols: number, spacing: number): [number, number, number] {
  const row = Math.floor(index / cols);
  const col = index % cols;
  const offsetX = ((cols - 1) * spacing) / 2;
  const offsetZ = ((Math.ceil(index / cols) - 1) * spacing) / 2;
  return [col * spacing - offsetX, 0.5, row * spacing - offsetZ];
}

interface Scene3DProps {
  zones: Zone[];
  dockets?: Docket[]; // Optional - only used in legacy mode
  useZoneCentricView?: boolean; // New flag to enable zone-centric mode
  onZoneClick?: (zoneId: number) => void; // Optional custom zone click handler
}

export default function Scene3D({
  zones,
  dockets = [],
  useZoneCentricView = true, // Default to new zone-centric view
  onZoneClick,
}: Scene3DProps) {
  const { selectedZoneId, setSelectedZone, viewMode, heatMapEnabled, floorPlanMode } = useStore();
  const showLabels = useUIStore((state) => state.showLabels);

  // Use custom click handler if provided, otherwise use store action
  const handleZoneClick = onZoneClick || setSelectedZone;

  // Calculate zone positions for camera controller (must match ZoneOverview3D logic)
  const zonePositions = useMemo(() => {
    const positions = new Map<number, [number, number, number]>();
    if (!useZoneCentricView || zones.length === 0) return positions;

    // Sort zones by occupancy (same as ZoneOverview3D)
    const sortedZones = [...zones].sort((a, b) => b.currentOccupancy - a.currentOccupancy);
    const { cols } = calculateGridLayout(zones.length);
    const spacing = 12;

    sortedZones.forEach((zone, index) => {
      positions.set(zone.zoneId, getZonePosition(index, cols, spacing));
    });

    return positions;
  }, [zones, useZoneCentricView]);

  return (
    <div className="absolute inset-0">
      <Canvas3DErrorBoundary>
        <Canvas shadows>
          {/* Camera setup based on view mode */}
          {viewMode === 'top' && (
            <PerspectiveCamera
              makeDefault
              position={[0, 80, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              fov={50}
            />
          )}
          {viewMode === '3d' && <PerspectiveCamera makeDefault position={[50, 40, 50]} fov={50} />}
          {viewMode === 'firstPerson' && (
            <PerspectiveCamera makeDefault position={[0, 2, 50]} fov={60} />
          )}

          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minDistance={20}
            maxDistance={150}
            maxPolarAngle={Math.PI / 2.1}
            target={[0, 0, 0]}
          />

          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[30, 50, 20]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <pointLight position={[0, 20, 0]} intensity={0.5} color="#3b82f6" />

          {/* Environment */}
          <Stars radius={200} depth={80} count={5000} factor={4} fade speed={0.5} />
          <Environment preset="night" />

          <Suspense fallback={null}>
            {/* Floor plan overlay */}
            {(floorPlanMode === '3d' || floorPlanMode === 'split') && (
              <FloorPlanOverlay opacity={0.5} />
            )}

            {/* Main visualization */}
            {useZoneCentricView ? (
              // New zone-centric view (scales to 500K items)
              <ZoneOverview3D
                zones={zones}
                selectedZoneId={selectedZoneId}
                onZoneClick={handleZoneClick}
                showLabels={showLabels}
              />
            ) : (
              // Legacy view with individual particles
              <>
                <ForensicBuilding
                  zones={zones}
                  selectedZoneId={selectedZoneId}
                  onZoneClick={handleZoneClick}
                />
                <RfidParticles dockets={dockets} selectedZoneId={selectedZoneId} />
              </>
            )}

            {/* Heat map overlay */}
            {heatMapEnabled && <HeatMapOverlay zones={zones} />}
          </Suspense>

          {/* Camera controller for search fly-to animations */}
          {useZoneCentricView && (
            <CameraController
              zonePositions={zonePositions}
              defaultPosition={[50, 40, 50]}
              flyDuration={1.5}
            />
          )}

          {/* Post-processing */}
          <EffectComposer>
            <Bloom luminanceThreshold={0.3} intensity={1.2} levels={9} mipmapBlur />
          </EffectComposer>
        </Canvas>
      </Canvas3DErrorBoundary>
    </div>
  );
}
