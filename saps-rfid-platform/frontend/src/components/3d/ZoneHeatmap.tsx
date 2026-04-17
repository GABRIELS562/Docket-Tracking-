import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useSceneStore } from '../../stores/sceneStore';
import { useZones, useWarehouseStore } from '../../stores';

/**
 * Zone Heatmap Visualization
 *
 * Always-visible zone aggregates showing:
 * - Occupancy levels with color gradients
 * - Real-time item counts
 * - Capacity utilization percentages
 * - Flow indicators (items entering/leaving)
 * - Alert states for over-capacity
 *
 * Architecture reference: "Always Show: Zone aggregates (8-12 zones)"
 * From StartHere.md virtualized on-demand architecture
 */

interface ZoneData {
  id: string;
  name: string;
  position: [number, number, number];
  itemCount: number;
  capacity: number;
  color: string;
  flowIn: number;  // items entering in last minute
  flowOut: number; // items leaving in last minute
  avgDwellTime: number; // average time items spend in zone
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Fallback zone configuration (used when warehouse store is not ready)
const FALLBACK_ZONE_CONFIG: Record<string, Omit<ZoneData, 'itemCount' | 'flowIn' | 'flowOut' | 'avgDwellTime'>> = {
  'receiving': {
    id: 'receiving',
    name: 'Receiving',
    position: [-22.5, 0.1, -27.5],
    capacity: 150,
    color: '#22c55e',
    priority: 'high',
  },
  'shipping': {
    id: 'shipping',
    name: 'Shipping',
    position: [22.5, 0.1, -27.5],
    capacity: 250,
    color: '#8b5cf6',
    priority: 'high',
  },
  'storage-a': {
    id: 'storage-a',
    name: 'Storage A',
    position: [-12.5, 0.1, -5],
    capacity: 500,
    color: '#3b82f6',
    priority: 'medium',
  },
  'storage-b': {
    id: 'storage-b',
    name: 'Storage B',
    position: [12.5, 0.1, -5],
    capacity: 500,
    color: '#3b82f6',
    priority: 'medium',
  },
  'office': {
    id: 'office',
    name: 'Office',
    position: [-37.5, 0.1, -22.5],
    capacity: 50,
    color: '#6366f1',
    priority: 'low',
  },
  'returns': {
    id: 'returns',
    name: 'Returns',
    position: [-37.5, 0.1, -5],
    capacity: 150,
    color: '#f97316',
    priority: 'low',
  },
  'processing': {
    id: 'processing',
    name: 'Processing',
    position: [-30, 0.1, 15],
    capacity: 200,
    color: '#eab308',
    priority: 'high',
  },
  'secure-evidence': {
    id: 'secure-evidence',
    name: 'Secure Evidence',
    position: [-30, 0.1, 28.5],
    capacity: 100,
    color: '#ef4444',
    priority: 'critical',
  },
  'staging': {
    id: 'staging',
    name: 'Staging',
    position: [32.5, 0.1, 10],
    capacity: 200,
    color: '#14b8a6',
    priority: 'medium',
  },
};

const ZoneHeatmap = () => {
  // Use individual selectors to avoid re-renders when unrelated state changes
  const items = useSceneStore(useShallow((s) => s.items));
  const showHeatmap = useSceneStore((s) => s.showHeatmap);
  const hoveredZone = useSceneStore((s) => s.hoveredZone);
  const setHoveredZone = useSceneStore((s) => s.setHoveredZone);
  const flyToZone = useSceneStore((s) => s.flyToZone);

  // NEW: Get zones from unified warehouse store
  const warehouseZones = useZones();
  const getZoneCenter = useWarehouseStore((s) => s.getZoneCenter);

  const [zoneData, setZoneData] = useState<Map<string, ZoneData>>(new Map());

  // Use ref to track items without triggering effect re-runs
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Build zone config from warehouse store or use fallback
  const zoneConfig = useMemo(() => {
    if (!warehouseZones || warehouseZones.length === 0) {
      return FALLBACK_ZONE_CONFIG;
    }

    const config: Record<string, Omit<ZoneData, 'itemCount' | 'flowIn' | 'flowOut' | 'avgDwellTime'>> = {};

    warehouseZones.forEach((zone) => {
      const center = getZoneCenter(zone.id);
      if (center) {
        config[zone.id] = {
          id: zone.id,
          name: zone.name,
          position: [center.x, 0.1, center.z] as [number, number, number],
          capacity: zone.capacity || 200,
          color: zone.color,
          priority: zone.isSecure ? 'critical' : (zone.id.includes('storage') ? 'medium' : 'high'),
        };
      }
    });

    return config;
  }, [warehouseZones, getZoneCenter]);

  // Calculate zone statistics from items
  const calculateZoneStats = useCallback(() => {
    const currentItems = itemsRef.current;
    const zoneCounts = new Map<string, number>();

    currentItems.forEach((item) => {
      const count = zoneCounts.get(item.zone) || 0;
      zoneCounts.set(item.zone, count + 1);
    });

    const newZoneData = new Map<string, ZoneData>();

    Object.entries(zoneConfig).forEach(([zoneId, config]) => {
      const itemCount = zoneCounts.get(zoneId) || 0;

      // Simulate flow data (in production, this would come from backend)
      const flowIn = Math.floor(Math.random() * 5);
      const flowOut = Math.floor(Math.random() * 5);
      const avgDwellTime = Math.floor(Math.random() * 120) + 30;

      newZoneData.set(zoneId, {
        ...config,
        itemCount,
        flowIn,
        flowOut,
        avgDwellTime,
      });
    });

    setZoneData(newZoneData);
  }, [zoneConfig]);

  // Initial calculation and periodic updates
  useEffect(() => {
    calculateZoneStats();
    const interval = setInterval(calculateZoneStats, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, [calculateZoneStats]);

  if (!showHeatmap) return null;

  return (
    <group>
      {Array.from(zoneData.values()).map((zone) => (
        <ZoneHeatmapTile
          key={zone.id}
          zone={zone}
          isHovered={hoveredZone === zone.id}
          onHover={() => setHoveredZone(zone.id)}
          onUnhover={() => setHoveredZone(null)}
          onClick={() => flyToZone(zone.id)}
        />
      ))}

      {/* Legend */}
      <HeatmapLegend />
    </group>
  );
};

/**
 * Individual zone heatmap tile
 */
interface ZoneHeatmapTileProps {
  zone: ZoneData;
  isHovered: boolean;
  onHover: () => void;
  onUnhover: () => void;
  onClick: () => void;
}

const ZoneHeatmapTile = ({ zone, isHovered, onHover, onUnhover, onClick }: ZoneHeatmapTileProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // Calculate utilization and color
  const utilization = zone.itemCount / zone.capacity;
  const utilizationPercent = Math.round(utilization * 100);

  // Color gradient based on utilization
  const heatColor = useMemo(() => {
    if (utilization >= 0.9) return '#ef4444'; // Red - critical
    if (utilization >= 0.7) return '#f59e0b'; // Orange - warning
    if (utilization >= 0.5) return '#eab308'; // Yellow - moderate
    if (utilization >= 0.3) return '#22c55e'; // Green - good
    return '#3b82f6'; // Blue - low
  }, [utilization]);

  // Animation
  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;

      // Pulse effect based on utilization
      const pulseSpeed = utilization >= 0.9 ? 4 : utilization >= 0.7 ? 2 : 1;
      const pulseAmount = utilization >= 0.9 ? 0.3 : 0.1;
      const pulse = 0.3 + Math.sin(state.clock.elapsedTime * pulseSpeed) * pulseAmount;

      material.opacity = isHovered ? 0.6 : pulse;
      material.emissiveIntensity = isHovered ? 1 : 0.5;
    }

    if (glowRef.current && isHovered) {
      glowRef.current.rotation.z = state.clock.elapsedTime;
    }
  });

  const zoneSize = 26;
  const height = Math.max(0.5, utilization * 3); // Height based on utilization

  return (
    <group position={zone.position}>
      {/* Base heatmap plane */}
      <mesh
        ref={meshRef}
        position={[0, 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          onUnhover();
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <planeGeometry args={[zoneSize, zoneSize]} />
        <meshStandardMaterial
          color={heatColor}
          transparent
          opacity={0.3}
          emissive={heatColor}
          emissiveIntensity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3D bar showing utilization */}
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[zoneSize * 0.8, height, zoneSize * 0.8]} />
        <meshStandardMaterial
          color={heatColor}
          transparent
          opacity={0.15}
          emissive={heatColor}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Glow ring on hover */}
      {isHovered && (
        <mesh ref={glowRef} position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[zoneSize / 2 - 1, zoneSize / 2, 32]} />
          <meshBasicMaterial
            color={heatColor}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Zone stats overlay */}
      <ZoneStatsOverlay
        zone={zone}
        utilization={utilizationPercent}
        heatColor={heatColor}
        isHovered={isHovered}
      />

      {/* Flow indicators */}
      {(zone.flowIn > 0 || zone.flowOut > 0) && (
        <FlowIndicators
          position={[0, 3, 0]}
          flowIn={zone.flowIn}
          flowOut={zone.flowOut}
        />
      )}

      {/* Alert indicator for critical zones */}
      {utilization >= 0.9 && (
        <AlertIndicator position={[zoneSize / 2 - 2, 4, -zoneSize / 2 + 2]} />
      )}
    </group>
  );
};

/**
 * Zone statistics overlay
 */
const ZoneStatsOverlay = ({
  zone,
  utilization,
  heatColor,
  isHovered,
}: {
  zone: ZoneData;
  utilization: number;
  heatColor: string;
  isHovered: boolean;
}) => {
  return (
    <Billboard position={[0, isHovered ? 6 : 4, 0]}>
      <group>
        {/* Zone name */}
        <Text
          position={[0, 0.8, 0]}
          fontSize={isHovered ? 2 : 1.5}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.08}
          outlineColor="#000000"
        >
          {zone.name}
        </Text>

        {/* Item count */}
        <Text
          position={[0, -0.2, 0]}
          fontSize={isHovered ? 2.5 : 1.8}
          color={heatColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.08}
          outlineColor="#000000"
        >
          {zone.itemCount}
        </Text>

        {/* Utilization badge */}
        <Text
          position={[0, -1.2, 0]}
          fontSize={isHovered ? 1.2 : 0.9}
          color={utilization >= 90 ? '#ef4444' : utilization >= 70 ? '#f59e0b' : '#22c55e'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          {`${utilization}%`}
        </Text>

        {/* Expanded info on hover */}
        {isHovered && (
          <>
            <Text
              position={[0, -2.2, 0]}
              fontSize={0.8}
              color="#94a3b8"
              anchorX="center"
              anchorY="middle"
            >
              {`Capacity: ${zone.capacity}`}
            </Text>
            <Text
              position={[0, -3, 0]}
              fontSize={0.8}
              color="#94a3b8"
              anchorX="center"
              anchorY="middle"
            >
              {`Avg Dwell: ${Math.floor(zone.avgDwellTime / 60)}m ${zone.avgDwellTime % 60}s`}
            </Text>
          </>
        )}
      </group>
    </Billboard>
  );
};

/**
 * Flow indicators showing items entering/leaving
 */
const FlowIndicators = ({
  position,
  flowIn,
  flowOut,
}: {
  position: [number, number, number];
  flowIn: number;
  flowOut: number;
}) => {
  const arrowRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (arrowRef.current) {
      // Animate arrows
      const bounce = Math.sin(state.clock.elapsedTime * 3) * 0.2;
      arrowRef.current.position.y = position[1] + bounce;
    }
  });

  return (
    <group ref={arrowRef} position={position}>
      {/* Incoming arrow */}
      {flowIn > 0 && (
        <group position={[-3, 0, 0]}>
          <Text
            fontSize={0.8}
            color="#22c55e"
            anchorX="center"
            anchorY="middle"
          >
            {`↓${flowIn}`}
          </Text>
        </group>
      )}

      {/* Outgoing arrow */}
      {flowOut > 0 && (
        <group position={[3, 0, 0]}>
          <Text
            fontSize={0.8}
            color="#f59e0b"
            anchorX="center"
            anchorY="middle"
          >
            {`↑${flowOut}`}
          </Text>
        </group>
      )}
    </group>
  );
};

/**
 * Alert indicator for over-capacity zones
 */
const AlertIndicator = ({ position }: { position: [number, number, number] }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Pulsing animation
      const scale = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.3;
      meshRef.current.scale.setScalar(scale);

      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.5;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={1.5}
        />
      </mesh>

      <Text
        position={[0, -1.5, 0]}
        fontSize={0.6}
        color="#ef4444"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        ALERT
      </Text>
    </group>
  );
};

/**
 * Heatmap legend
 */
const HeatmapLegend = () => {
  return (
    <Billboard position={[-48, 8, -48]}>
      <group>
        <Text
          position={[0, 2, 0]}
          fontSize={1}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          Zone Utilization
        </Text>

        {/* Legend items */}
        {[
          { color: '#3b82f6', label: '0-30%' },
          { color: '#22c55e', label: '30-50%' },
          { color: '#eab308', label: '50-70%' },
          { color: '#f59e0b', label: '70-90%' },
          { color: '#ef4444', label: '90%+' },
        ].map((item, index) => (
          <group key={item.label} position={[0, 0.5 - index * 1, 0]}>
            <mesh position={[-2, 0, 0]}>
              <boxGeometry args={[0.8, 0.5, 0.1]} />
              <meshBasicMaterial color={item.color} />
            </mesh>
            <Text
              position={[0, 0, 0]}
              fontSize={0.6}
              color="#94a3b8"
              anchorX="left"
              anchorY="middle"
            >
              {item.label}
            </Text>
          </group>
        ))}
      </group>
    </Billboard>
  );
};

export default ZoneHeatmap;
