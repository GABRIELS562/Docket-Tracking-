import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import ZoneBlock from './ZoneBlock';
import type { Zone } from '@/lib/types';

interface ZoneOverview3DProps {
  zones: Zone[];
  selectedZoneId: number | null;
  onZoneClick: (zoneId: number) => void;
  showLabels?: boolean;
}

/**
 * Calculate grid layout for zones based on count
 */
function calculateGridLayout(count: number): { cols: number; rows: number } {
  // Aim for roughly square layout
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  return { cols, rows };
}

/**
 * Calculate zone position in grid
 */
function getZonePosition(index: number, cols: number, spacing: number): [number, number, number] {
  const row = Math.floor(index / cols);
  const col = index % cols;

  // Center the grid
  const offsetX = ((cols - 1) * spacing) / 2;
  const offsetZ = ((Math.ceil(index / cols) - 1) * spacing) / 2;

  return [
    col * spacing - offsetX,
    0.5, // Base Y position
    row * spacing - offsetZ,
  ];
}

/**
 * 3D Zone Overview - Data-driven visualization
 * Automatically lays out zones in a grid, colored by occupancy
 */
export default function ZoneOverview3D({
  zones,
  selectedZoneId,
  onZoneClick,
  showLabels = true,
}: ZoneOverview3DProps) {
  // Sort zones by occupancy for visual emphasis (highest occupancy in center)
  const sortedZones = useMemo(() => {
    return [...zones].sort((a, b) => b.currentOccupancy - a.currentOccupancy);
  }, [zones]);

  // Calculate grid layout
  const { cols } = useMemo(() => calculateGridLayout(zones.length), [zones.length]);
  const spacing = 12; // Space between zone blocks

  // Calculate total items for summary
  const totalItems = useMemo(() => zones.reduce((sum, z) => sum + z.currentOccupancy, 0), [zones]);

  const totalCapacity = useMemo(() => zones.reduce((sum, z) => sum + z.capacity, 0), [zones]);

  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>

      {/* Grid helper */}
      <gridHelper args={[150, 30, '#1e3a5f', '#0f172a']} position={[0, 0.01, 0]} />

      {/* Zone blocks */}
      {sortedZones.map((zone, index) => (
        <ZoneBlock
          key={zone.zoneId}
          zone={zone}
          position={getZonePosition(index, cols, spacing)}
          isSelected={selectedZoneId === zone.zoneId}
          onClick={() => onZoneClick(zone.zoneId)}
          showLabels={showLabels}
        />
      ))}

      {/* Summary stats floating above */}
      {showLabels && (
        <group position={[0, 15, -20]}>
          <Text
            fontSize={1.2}
            color="#ffffff"
            anchorX="center"
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            {formatLargeNumber(totalItems)} Items Tracked
          </Text>
          <Text
            position={[0, -1.5, 0]}
            fontSize={0.6}
            color="#94a3b8"
            anchorX="center"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            across {zones.length} zones • {Math.round((totalItems / totalCapacity) * 100)}% capacity
          </Text>
        </group>
      )}

      {/* Legend */}
      <Legend position={[-50, 0.5, 0]} />
    </group>
  );
}

/**
 * Format large numbers with K/M suffix
 */
function formatLargeNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${Math.round(num / 1000)}K`;
  return num.toLocaleString();
}

/**
 * Color legend for occupancy status
 */
function Legend({ position }: { position: [number, number, number] }) {
  const items = [
    { label: 'Normal (<75%)', color: '#16a34a' },
    { label: 'Warning (75-90%)', color: '#ca8a04' },
    { label: 'Critical (90-100%)', color: '#ea580c' },
    { label: 'Full (100%+)', color: '#dc2626' },
  ];

  return (
    <group position={position}>
      {items.map((item, i) => (
        <group key={item.label} position={[0, 0, i * 2]}>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={item.color}
              emissive={item.color}
              emissiveIntensity={0.2}
            />
          </mesh>
          <Text
            position={[1.5, 0.5, 0]}
            fontSize={0.35}
            color="#94a3b8"
            anchorX="left"
            outlineWidth={0.01}
            outlineColor="#000000"
          >
            {item.label}
          </Text>
        </group>
      ))}
    </group>
  );
}
