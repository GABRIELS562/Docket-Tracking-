import { useRef, useState, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Zone } from '@/lib/types';
import { getOccupancyStatus, getOccupancyColor } from '@/lib/types';
import { useSearchStore } from '@/store/useSearchStore';

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
  const ringRef = useRef<THREE.Mesh>(null);
  const pulseRingRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Get search highlight state
  const highlightedZoneId = useSearchStore((state) => state.highlightedZoneId);
  const isHighlighted = highlightedZoneId === zone.zoneId;

  // Animate selected/highlighted zone
  useFrame((state) => {
    if (meshRef.current) {
      // Float animation for selected or highlighted zones
      if (isSelected || isHighlighted) {
        const floatSpeed = isHighlighted ? 3 : 2;
        const floatAmount = isHighlighted ? 0.5 : 0.3;
        meshRef.current.position.y =
          position[1] + Math.sin(state.clock.elapsedTime * floatSpeed) * floatAmount;
      } else {
        meshRef.current.position.y = position[1];
      }
    }

    // Pulse ring animation for highlighted zones
    if (pulseRingRef.current && isHighlighted) {
      const pulse = (Math.sin(state.clock.elapsedTime * 4) + 1) / 2; // 0 to 1
      pulseRingRef.current.scale.set(1 + pulse * 0.3, 1 + pulse * 0.3, 1);
      const material = pulseRingRef.current.material as THREE.MeshBasicMaterial;
      if (material) {
        material.opacity = 0.8 - pulse * 0.5;
      }
    }

    // Rotating ring for highlighted zones
    if (ringRef.current && isHighlighted) {
      ringRef.current.rotation.z += 0.02;
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

  // Determine glow intensity based on status and highlight
  const emissiveIntensity = isHighlighted
    ? 1.2 // Brightest for search highlight
    : isSelected
      ? 0.8
      : hovered
        ? 0.5
        : status === 'full'
          ? 0.4
          : status === 'critical'
            ? 0.3
            : 0.15;

  // Color override for highlighted zones
  const displayColor = isHighlighted ? '#3b82f6' : color;
  const blockColor = isHighlighted || isSelected ? '#ffffff' : displayColor;

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
          color={blockColor}
          emissive={displayColor}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={isHighlighted ? 0.95 : 0.9}
          roughness={0.3}
          metalness={isHighlighted ? 0.4 : 0.2}
        />
      </mesh>

      {/* Selection ring */}
      {isSelected && !isHighlighted && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[baseWidth * 0.7, baseWidth * 0.8, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Search highlight effects */}
      {isHighlighted && (
        <>
          {/* Rotating inner ring */}
          <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
            <ringGeometry args={[baseWidth * 0.6, baseWidth * 0.7, 64]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.8} />
          </mesh>

          {/* Pulsing outer ring */}
          <mesh ref={pulseRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
            <ringGeometry args={[baseWidth * 0.8, baseWidth * 0.95, 64]} />
            <meshBasicMaterial color="#60a5fa" transparent opacity={0.6} />
          </mesh>

          {/* Vertical light beams */}
          <mesh position={[0, height / 2 + 3, 0]}>
            <cylinderGeometry args={[0.1, baseWidth * 0.5, 6, 16, 1, true]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>

          {/* "LOCATED" label */}
          <Html position={[0, height / 2 + 4, 0]} center distanceFactor={8}>
            <div className="bg-blue-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg shadow-blue-500/50 animate-bounce whitespace-nowrap">
              DOCKET LOCATED
            </div>
          </Html>
        </>
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
