import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Enhanced 3D Scene Lighting Setup
 *
 * Professional industrial warehouse lighting with:
 * - Soft ambient fill for base illumination
 * - Key directional light for primary shadows
 * - Industrial spot lights for zone accents
 * - Rim lighting for depth separation
 * - Animated accent lights for visual interest
 */
const Lighting = () => {
  return (
    <>
      {/* Base ambient light - soft fill */}
      <ambientLight intensity={0.2} color="#a3bffa" />

      {/* Primary directional light - key light with soft shadows */}
      <directionalLight
        position={[60, 80, 40]}
        intensity={0.8}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={200}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
      />

      {/* Secondary directional light - fill from opposite side */}
      <directionalLight
        position={[-40, 60, -30]}
        intensity={0.3}
        color="#e2e8f0"
      />

      {/* Hemisphere light - sky/ground gradient */}
      <hemisphereLight
        args={['#87ceeb', '#1e293b', 0.4]}
        position={[0, 50, 0]}
      />

      {/* Industrial overhead lights - zone accents */}
      <IndustrialOverheadLights />

      {/* Animated accent lights */}
      <AccentLights />

      {/* Subtle rim light for depth */}
      <pointLight
        position={[-80, 30, 0]}
        intensity={0.3}
        color="#60a5fa"
        distance={200}
        decay={2}
      />

      <pointLight
        position={[80, 30, 0]}
        intensity={0.3}
        color="#a78bfa"
        distance={200}
        decay={2}
      />
    </>
  );
};

/**
 * Industrial overhead spot lights for each zone
 */
const IndustrialOverheadLights = () => {
  const zones = [
    { position: [-33, 11, -33] as [number, number, number], color: '#3b82f6', intensity: 0.5 },
    { position: [-33, 11, 0] as [number, number, number], color: '#10b981', intensity: 0.4 },
    { position: [-33, 11, 33] as [number, number, number], color: '#10b981', intensity: 0.4 },
    { position: [0, 11, -33] as [number, number, number], color: '#10b981', intensity: 0.4 },
    { position: [0, 11, 0] as [number, number, number], color: '#ef4444', intensity: 0.6 },
    { position: [0, 11, 33] as [number, number, number], color: '#10b981', intensity: 0.4 },
    { position: [33, 11, -33] as [number, number, number], color: '#f59e0b', intensity: 0.5 },
    { position: [33, 11, 0] as [number, number, number], color: '#8b5cf6', intensity: 0.5 },
    { position: [33, 11, 33] as [number, number, number], color: '#ec4899', intensity: 0.4 },
  ];

  return (
    <group>
      {zones.map((zone, i) => (
        <ZoneSpotLight key={i} position={zone.position} color={zone.color} intensity={zone.intensity} />
      ))}
    </group>
  );
};

/**
 * Individual zone spot light
 */
const ZoneSpotLight = ({
  position,
  color,
  intensity,
}: {
  position: [number, number, number];
  color: string;
  intensity: number;
}) => {
  return (
    <spotLight
      position={position}
      angle={0.5}
      penumbra={0.8}
      intensity={intensity}
      color={color}
      distance={25}
      decay={2}
      castShadow={false}
    />
  );
};

/**
 * Animated accent lights for visual atmosphere
 */
const AccentLights = () => {
  const light1Ref = useRef<THREE.PointLight>(null);
  const light2Ref = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    if (light1Ref.current) {
      light1Ref.current.position.x = Math.sin(time * 0.3) * 40;
      light1Ref.current.position.z = Math.cos(time * 0.3) * 40;
      light1Ref.current.intensity = 0.3 + Math.sin(time * 2) * 0.1;
    }

    if (light2Ref.current) {
      light2Ref.current.position.x = Math.cos(time * 0.2) * 35;
      light2Ref.current.position.z = Math.sin(time * 0.2) * 35;
      light2Ref.current.intensity = 0.3 + Math.cos(time * 2) * 0.1;
    }
  });

  return (
    <>
      <pointLight
        ref={light1Ref}
        position={[40, 8, 0]}
        color="#60a5fa"
        intensity={0.3}
        distance={60}
        decay={2}
      />
      <pointLight
        ref={light2Ref}
        position={[-40, 8, 0]}
        color="#a78bfa"
        intensity={0.3}
        distance={60}
        decay={2}
      />
    </>
  );
};

export default Lighting;
