import { useRef, useState, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Zone } from '@/lib/types';
import { getOccupancyStatus, getOccupancyColor } from '@/lib/types';

interface ZoneBlockProps {
  zone: Zone;
  position: [number, number, number];
  isSelected: boolean;
  onClick: () => void;
  showLabels: boolean;
}

/**
 * Format large numbers with K/M suffix
 */
function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

/**
 * Single zone block in the 3D overview
 * Height represents relative occupancy, color represents capacity status
 * Memoized for performance with many zones
 */
const ZoneBlock = memo(function ZoneBlock({
  zone,
  position,
  isSelected,
  onClick,
  showLabels,
}: ZoneBlockProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Animate selected zone
  useFrame((state) => {
    if (meshRef.current) {
      if (isSelected) {
        meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.3;
      } else {
        meshRef.current.position.y = position[1];
      }
    }
  });

  const status = getOccupancyStatus(zone.occupancyPercentage);
  const color = getOccupancyColor(status);

  // Base dimensions - scale based on capacity
  const capacityScale = Math.log10(Math.max(zone.capacity, 100)) / 5; // Logarithmic scale
  const baseWidth = 4 + capacityScale * 4;
  const baseDepth = 4 + capacityScale * 4;

  // Height represents occupancy percentage (min 0.5, max 6)
  const occupancyRatio = zone.currentOccupancy / Math.max(zone.capacity, 1);
  const height = 0.5 + occupancyRatio * 5.5;

  // Determine glow intensity based on status
  const emissiveIntensity = isSelected
    ? 0.8
    : hovered
      ? 0.5
      : status === 'full'
        ? 0.4
        : status === 'critical'
          ? 0.3
          : 0.15;

  return (
    <group position={position}>
      {/* Main zone block */}
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={[baseWidth, height, baseDepth]} />
        <meshStandardMaterial
          color={isSelected ? '#ffffff' : color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={0.9}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[baseWidth * 0.7, baseWidth * 0.8, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Labels */}
      {showLabels && (
        <>
          {/* Zone name */}
          <Text
            position={[0, height / 2 + 1.5, 0]}
            fontSize={0.5}
            color="white"
            anchorX="center"
            outlineWidth={0.03}
            outlineColor="#000000"
            maxWidth={baseWidth * 1.5}
          >
            {zone.zoneName}
          </Text>

          {/* Item count (prominent) */}
          <Text
            position={[0, height / 2 + 0.8, 0]}
            fontSize={0.6}
            color={status === 'full' || status === 'critical' ? '#fef08a' : '#ffffff'}
            anchorX="center"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {formatCount(zone.currentOccupancy)}
          </Text>

          {/* Percentage indicator */}
          <Text
            position={[0, height / 2 + 0.3, 0]}
            fontSize={0.35}
            color={status === 'normal' ? '#10b981' : status === 'warning' ? '#f59e0b' : '#ef4444'}
            anchorX="center"
            outlineWidth={0.01}
            outlineColor="#000000"
          >
            {zone.occupancyPercentage}%
          </Text>
        </>
      )}

      {/* Hover tooltip */}
      {hovered && !isSelected && (
        <Html position={[0, height / 2 + 2.5, 0]} center distanceFactor={10}>
          <div className="bg-gray-900/95 backdrop-blur px-3 py-2 rounded-lg shadow-xl border border-blue-500/30 whitespace-nowrap">
            <div className="text-white font-bold text-sm">{zone.zoneName}</div>
            <div className="text-gray-300 text-xs">
              {formatCount(zone.currentOccupancy)} / {formatCount(zone.capacity)} items
            </div>
            <div className="text-blue-400 text-xs mt-1">Click to view details</div>
          </div>
        </Html>
      )}

      {/* Critical/Full warning beacon */}
      {(status === 'full' || status === 'critical') && (
        <WarningBeacon position={[0, height / 2 + 2, 0]} color={color} />
      )}
    </group>
  );
});

export default ZoneBlock;

/**
 * Animated warning beacon for critical zones
 */
function WarningBeacon({ position, color }: { position: [number, number, number]; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.25, 16, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
    </mesh>
  );
}
