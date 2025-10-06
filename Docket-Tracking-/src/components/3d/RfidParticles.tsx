import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Docket } from '@/lib/api';
import { useStore } from '@/store/useStore';

const ZONE_POSITIONS: Record<number, [number, number, number]> = {
  1: [-18, 3, 10],
  2: [-10, 3, 18],
  3: [0, 3, 20],
  4: [10, 3, 18],
  5: [18, 3, 10],
  6: [0, 3, 5],
  7: [0, 3, 0],
  8: [0, 3, -12],
};

interface Props {
  dockets: Docket[];
  selectedZoneId: number | null;
}

export default function RfidParticles({ dockets, selectedZoneId }: Props) {
  const pointsRef = useRef<THREE.Points>(null);
  const { camera, raycaster, pointer } = useThree();
  const { setSelectedDocket } = useStore();

  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(dockets.length * 3);
    const colors = new Float32Array(dockets.length * 3);
    const sizes = new Float32Array(dockets.length);

    dockets.forEach((docket, i) => {
      const zoneId = docket.currentZone?.id || 7;
      const pos = ZONE_POSITIONS[zoneId] || [0, 3, 0];

      positions[i * 3] = pos[0] + (Math.random() - 0.5) * 5;
      positions[i * 3 + 1] = pos[1] + Math.random() * 3;
      positions[i * 3 + 2] = pos[2] + (Math.random() - 0.5) * 5;

      const isVisible = selectedZoneId === null || selectedZoneId === zoneId;
      colors[i * 3] = isVisible ? 0.2 : 0.5;
      colors[i * 3 + 1] = isVisible ? 1 : 0.5;
      colors[i * 3 + 2] = isVisible ? 0.6 : 0.5;

      sizes[i] = isVisible ? 0.4 : 0.15;
    });

    return { positions, colors, sizes };
  }, [dockets, selectedZoneId]);

  useFrame((state) => {
    if (pointsRef.current) {
      const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] += Math.sin(state.clock.elapsedTime + i) * 0.015;
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  // Handle particle clicks
  const handleClick = (event: any) => {
    event.stopPropagation();

    if (!pointsRef.current) return;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(pointsRef.current);

    if (intersects.length > 0) {
      const index = intersects[0].index;
      if (index !== undefined && dockets[index]) {
        setSelectedDocket(dockets[index]);
      }
    }
  };

  return (
    <points
      ref={pointsRef}
      onClick={handleClick}
      onPointerOver={() => document.body.style.cursor = 'pointer'}
      onPointerOut={() => document.body.style.cursor = 'default'}
    >
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.4}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
