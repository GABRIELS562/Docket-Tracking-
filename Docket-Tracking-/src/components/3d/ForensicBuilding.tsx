import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { Zone } from '@/lib/api';
import { getZoneColor } from '@/lib/utils';

const ZONE_POSITIONS: Record<number, [number, number, number]> = {
  1: [-18, 0.5, 10],
  2: [-10, 0.5, 18],
  3: [0, 0.5, 20],
  4: [10, 0.5, 18],
  5: [18, 0.5, 10],
  6: [0, 0.5, 5],
  7: [0, 0.5, 0],
  8: [0, 0.5, -12],
};

interface Props {
  zones: Zone[];
  selectedZoneId: number | null;
  onZoneClick: (zoneId: number) => void;
}

export default function ForensicBuilding({ zones, selectedZoneId, onZoneClick }: Props) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      <CentralCore />

      {zones.map((zone) => {
        const position = ZONE_POSITIONS[zone.zoneId] || [0, 0.5, 0];
        const color = getZoneColor(zone.zoneType);
        const isSelected = selectedZoneId === zone.zoneId;

        return (
          <LabBlock
            key={zone.zoneId}
            zone={zone}
            position={position}
            color={color}
            isSelected={isSelected}
            onClick={() => onZoneClick(zone.zoneId)}
          />
        );
      })}

      <gridHelper args={[100, 50, '#1e293b', '#0f172a']} position={[0, 0.01, 0]} />
    </group>
  );
}

function CentralCore() {
  return (
    <group position={[0, 0.5, 5]}>
      <mesh castShadow>
        <cylinderGeometry args={[5, 5, 1.5, 32]} />
        <meshStandardMaterial color="#fcd34d" emissive="#fcd34d" emissiveIntensity={0.3} />
      </mesh>
      <Text position={[0, 2, 0]} fontSize={0.6} color="white">
        RECEPTION
      </Text>
    </group>
  );
}

interface LabBlockProps {
  zone: Zone;
  position: [number, number, number];
  color: string;
  isSelected: boolean;
  onClick: () => void;
}

function LabBlock({ zone, position, color, isSelected, onClick }: LabBlockProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && isSelected) {
      meshRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
    }
  });

  const height = 1.5 + (zone.currentOccupancy / zone.capacity) * 3;

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <boxGeometry args={[7, height, 7]} />
        <meshStandardMaterial
          color={isSelected ? '#ffffff' : color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.6 : 0.15}
          transparent
          opacity={0.9}
        />
      </mesh>

      <Text
        position={[0, height / 2 + 2, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
      >
        {zone.zoneName}
      </Text>

      <Text
        position={[0, height / 2 + 1.2, 0]}
        fontSize={0.35}
        color={zone.currentOccupancy / zone.capacity > 0.8 ? '#ef4444' : '#10b981'}
        anchorX="center"
      >
        {zone.currentOccupancy}/{zone.capacity}
      </Text>
    </group>
  );
}
