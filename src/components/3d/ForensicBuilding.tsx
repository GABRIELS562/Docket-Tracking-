import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { Zone } from '@/lib/api';
import { getZoneColor } from '@/lib/utils';

// FSL-PAROW First Floor Layout - Based on ACTUAL architectural drawing
const ZONE_POSITIONS: Record<number, [number, number, number]> = {
  // FAR LEFT - Large Office Accommodation
  1: [-32, 0.5, 0], // Office Accommodation (large space)

  // TOP CURVED SECTION - 4 Small Exam Rooms along the curve
  2: [-16, 0.5, 24], // Exam Room 1 (left side of curve)
  3: [-6, 0.5, 26], // Exam Room 2 (left-center of curve)
  4: [6, 0.5, 26], // Exam Room 3 (right-center of curve)
  5: [16, 0.5, 24], // Exam Room 4 (right side of curve)

  // CENTER - Large E.I.M.S Area (Evidence Information Management System)
  6: [0, 0.5, 3], // E.I.M.S Center (large central space)

  // RIGHT SIDE - Offices and Support
  7: [30, 0.5, 12], // Admin Offices
  8: [30, 0.5, 3], // Support Services

  // STAIRWELL - Central Left
  9: [-10, 0.5, 0], // Main Stairwell

  // BOTTOM CURVED SECTION - Auditorium
  10: [0, 0.5, -20], // Auditorium (bottom curved area)

  // BOTTOM CENTER - Entrance
  11: [0, 0.5, -26], // Main Entrance

  // STORAGE - Right Side
  12: [28, 0.5, -8], // Evidence Storage
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
    <>
      {/* Main Corridor Spine */}
      <mesh position={[0, 0.5, 5]} castShadow receiveShadow>
        <boxGeometry args={[6, 0.8, 30]} />
        <meshStandardMaterial
          color="#374151"
          emissive="#fcd34d"
          emissiveIntensity={0.1}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Reception Circle */}
      <mesh position={[0, 0.5, -8]} castShadow>
        <cylinderGeometry args={[4, 4, 1.2, 32]} />
        <meshStandardMaterial color="#fcd34d" emissive="#fcd34d" emissiveIntensity={0.3} />
      </mesh>
      <Text position={[0, 2.5, -8]} fontSize={0.5} color="white">
        RECEPTION
      </Text>

      {/* Curved Section Wall - Distinctive FSL-PAROW Feature */}
      <CurvedWall />
    </>
  );
}

function CurvedWall() {
  return (
    <group position={[0, 1, 22]}>
      {/* Create curved wall effect using multiple segments */}
      {Array.from({ length: 11 }).map((_, i) => {
        const angle = ((i - 5) * Math.PI) / 15;
        const radius = 20;
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius;

        return (
          <mesh key={i} position={[x, 0, z - radius]} rotation={[0, -angle, 0]} castShadow>
            <boxGeometry args={[2, 3, 0.3]} />
            <meshStandardMaterial color="#1e293b" emissive="#3b82f6" emissiveIntensity={0.05} />
          </mesh>
        );
      })}
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

  // Determine size based on zone type
  const getSize = (): [number, number, number] => {
    switch (zone.zoneType) {
      case 'storage':
        return [10, height, 8]; // Larger for storage
      case 'office':
        return [6, height, 6]; // Smaller for offices
      case 'corridor':
        return [8, 0.8, 8]; // Flat for corridors
      case 'entrance':
        return [7, height, 7];
      default:
        return [8, height, 8]; // Labs
    }
  };

  const [width, boxHeight, depth] = getSize();

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <boxGeometry args={[width, boxHeight, depth]} />
        <meshStandardMaterial
          color={isSelected ? '#ffffff' : color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.6 : 0.15}
          transparent
          opacity={zone.zoneType === 'corridor' ? 0.4 : 0.9}
          roughness={0.3}
          metalness={zone.zoneType === 'storage' ? 0.5 : 0.2}
        />
      </mesh>

      {/* Zone name label */}
      <Text
        position={[0, boxHeight / 2 + 1.8, 0]}
        fontSize={0.45}
        color="white"
        anchorX="center"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {zone.zoneName}
      </Text>

      {/* Occupancy info */}
      <Text
        position={[0, boxHeight / 2 + 1.0, 0]}
        fontSize={0.35}
        color={zone.currentOccupancy / zone.capacity > 0.8 ? '#ef4444' : '#10b981'}
        anchorX="center"
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        {zone.currentOccupancy}/{zone.capacity}
      </Text>

      {/* Capacity warning indicator */}
      {zone.currentOccupancy / zone.capacity > 0.9 && (
        <mesh position={[0, boxHeight / 2 + 2.5, 0]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
        </mesh>
      )}
    </group>
  );
}
