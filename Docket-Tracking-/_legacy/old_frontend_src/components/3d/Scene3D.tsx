import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import ForensicBuilding from './ForensicBuilding';
import RfidParticles from './RfidParticles';
import HeatMapOverlay from './HeatMapOverlay';
import FloorPlanOverlay from './FloorPlanOverlay';
import { Zone, Docket } from '@/lib/api';
import { useStore } from '@/store/useStore';

interface Scene3DProps {
  zones: Zone[];
  dockets: Docket[];
}

export default function Scene3D({ zones, dockets }: Scene3DProps) {
  const { selectedZoneId, setSelectedZone, viewMode, heatMapEnabled, floorPlanMode } = useStore();

  return (
    <div className="absolute inset-0">
      <Canvas shadows>
        {viewMode === 'top' && (
          <PerspectiveCamera makeDefault position={[0, 60, 0]} rotation={[-Math.PI / 2, 0, 0]} />
        )}
        {viewMode === '3d' && (
          <PerspectiveCamera makeDefault position={[40, 30, 40]} />
        )}
        {viewMode === 'firstPerson' && (
          <PerspectiveCamera makeDefault position={[0, 1.7, 35]} />
        )}

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={15}
          maxDistance={100}
          maxPolarAngle={Math.PI / 2}
        />

        <ambientLight intensity={0.4} />
        <directionalLight position={[20, 30, 10]} intensity={1} castShadow />
        <pointLight position={[0, 15, 0]} intensity={0.5} color="#3b82f6" />

        <Stars radius={150} depth={60} count={7000} factor={5} fade speed={1} />
        <Environment preset="night" />

        <Suspense fallback={null}>
          {/* Floor Plan Overlay */}
          {(floorPlanMode === '3d' || floorPlanMode === 'split') && (
            <FloorPlanOverlay zones={zones} opacity={0.7} />
          )}

          <ForensicBuilding
            zones={zones}
            selectedZoneId={selectedZoneId}
            onZoneClick={setSelectedZone}
          />
          <RfidParticles dockets={dockets} selectedZoneId={selectedZoneId} />

          {/* Heat Map Overlay */}
          {heatMapEnabled && <HeatMapOverlay zones={zones} />}
        </Suspense>

        <EffectComposer>
          <Bloom luminanceThreshold={0.2} intensity={1.5} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
