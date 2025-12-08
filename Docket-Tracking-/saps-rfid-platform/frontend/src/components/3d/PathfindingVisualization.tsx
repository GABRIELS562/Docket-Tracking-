import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, QuadraticBezierLine, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { useSceneStore } from '../../stores/sceneStore';
import { useZones, useWarehouseStore } from '../../stores';

/**
 * Animated Pathfinding Visualization
 *
 * Stunning path visualization with:
 * - Animated flowing particles along paths
 * - Bezier curve smoothing
 * - Pulsing waypoint markers
 * - Distance/time labels
 * - Gradient color paths based on distance
 * - Zone connection highlighting
 */

interface PathSegment {
  from: { x: number; y: number };
  to: { x: number; y: number };
  zoneId?: string;
  zoneName?: string;
  distance: number;
  estimatedTimeSeconds: number;
}

interface PathData {
  segments: PathSegment[];
  totalDistance: number;
  totalTimeSeconds: number;
  zonesTraversed: string[];
  smoothPath: Array<{ x: number; y: number }>;
  isOptimal: boolean;
}

// Fallback zone center positions (used when warehouse store is not ready)
const FALLBACK_ZONE_CENTERS: Record<string, [number, number, number]> = {
  'receiving': [-22.5, 0.5, -27.5],
  'shipping': [22.5, 0.5, -27.5],
  'office': [-37.5, 0.5, -22.5],
  'returns': [-37.5, 0.5, -5],
  'processing': [-30, 0.5, 15],
  'storage-a': [-12.5, 0.5, -5],
  'storage-b': [12.5, 0.5, -5],
  'staging': [32.5, 0.5, 10],
  'secure-evidence': [-30, 0.5, 28.5],
};

// Fallback zone colors
const FALLBACK_ZONE_COLORS: Record<string, string> = {
  'receiving': '#22c55e',
  'shipping': '#8b5cf6',
  'office': '#6366f1',
  'returns': '#f97316',
  'processing': '#eab308',
  'storage-a': '#3b82f6',
  'storage-b': '#3b82f6',
  'staging': '#14b8a6',
  'secure-evidence': '#ef4444',
};

interface PathfindingVisualizationProps {
  activePath?: PathData;
  showZoneConnections?: boolean;
}

const PathfindingVisualization = ({
  activePath,
  showZoneConnections = true,
}: PathfindingVisualizationProps) => {
  // Use individual selector to avoid re-renders
  const showPaths = useSceneStore((s) => s.showPaths);

  if (!showPaths) return null;

  return (
    <group>
      {/* Zone connection graph */}
      {showZoneConnections && <ZoneConnectionGraph />}

      {/* Active path visualization */}
      {activePath && <ActivePathVisualization path={activePath} />}
    </group>
  );
};

/**
 * Zone connection graph showing all possible routes
 */
const ZoneConnectionGraph = () => {
  // NEW: Get zones from unified warehouse store
  const warehouseZones = useZones();
  const getZoneCenter = useWarehouseStore((s) => s.getZoneCenter);

  // Build dynamic zone centers and colors
  const { zoneCenters, zoneColors } = useMemo(() => {
    if (!warehouseZones || warehouseZones.length === 0) {
      return { zoneCenters: FALLBACK_ZONE_CENTERS, zoneColors: FALLBACK_ZONE_COLORS };
    }

    const centers: Record<string, [number, number, number]> = {};
    const colors: Record<string, string> = {};

    warehouseZones.forEach((zone) => {
      const center = getZoneCenter(zone.id);
      if (center) {
        centers[zone.id] = [center.x, 0.5, center.z];
        colors[zone.id] = zone.color;
      }
    });

    return { zoneCenters: centers, zoneColors: colors };
  }, [warehouseZones, getZoneCenter]);

  // Define zone connections (matching U-shaped warehouse layout)
  const connections = useMemo(
    () => [
      // Dock connections
      ['receiving', 'storage-a'],
      ['shipping', 'storage-b'],
      ['shipping', 'staging'],
      // Left wall flow
      ['office', 'receiving'],
      ['office', 'returns'],
      ['returns', 'processing'],
      ['processing', 'secure-evidence'],
      // Storage connections
      ['storage-a', 'returns'],
      ['storage-a', 'storage-b'],
      ['storage-b', 'staging'],
    ],
    []
  );

  return (
    <group>
      {connections.map(([from, to], index) => (
        <ZoneConnection
          key={`${from}-${to}`}
          from={from}
          to={to}
          index={index}
          zoneCenters={zoneCenters}
          zoneColors={zoneColors}
        />
      ))}

      {/* Zone node markers */}
      {Object.entries(zoneCenters).map(([zoneId, position]) => (
        <ZoneNode key={zoneId} zoneId={zoneId} position={position} color={zoneColors[zoneId]} />
      ))}
    </group>
  );
};

/**
 * Single zone connection line with animation
 */
const ZoneConnection = ({
  from,
  to,
  index: _index,
  zoneCenters,
  zoneColors,
}: {
  from: string;
  to: string;
  index: number;
  zoneCenters: Record<string, [number, number, number]>;
  zoneColors: Record<string, string>;
}) => {
  const lineRef = useRef<any>(null);
  const particleRef = useRef<THREE.Mesh>(null);
  const [particleProgress, setParticleProgress] = useState(0);

  const fromPos = zoneCenters[from];
  const toPos = zoneCenters[to];

  if (!fromPos || !toPos) return null;

  // Calculate midpoint for bezier curve
  const midY = Math.max(fromPos[1], toPos[1]) + 3;
  const midPoint: [number, number, number] = [
    (fromPos[0] + toPos[0]) / 2,
    midY,
    (fromPos[2] + toPos[2]) / 2,
  ];

  // Color based on zone types
  const fromColor = zoneColors[from] || '#60a5fa';

  // Animate particles along path
  useFrame((_state, delta) => {
    const newProgress = (particleProgress + delta * 0.3) % 1;
    setParticleProgress(newProgress);

    if (particleRef.current) {
      // Bezier interpolation
      const t = newProgress;
      const mt = 1 - t;

      const x =
        mt * mt * fromPos[0] +
        2 * mt * t * midPoint[0] +
        t * t * toPos[0];
      const y =
        mt * mt * fromPos[1] +
        2 * mt * t * midPoint[1] +
        t * t * toPos[1];
      const z =
        mt * mt * fromPos[2] +
        2 * mt * t * midPoint[2] +
        t * t * toPos[2];

      particleRef.current.position.set(x, y, z);
    }
  });

  return (
    <group>
      {/* Connection line */}
      <QuadraticBezierLine
        ref={lineRef}
        start={fromPos}
        end={toPos}
        mid={midPoint}
        color="#334155"
        lineWidth={1}
        transparent
        opacity={0.4}
        dashed
        dashScale={10}
        dashSize={0.5}
        dashOffset={0}
      />

      {/* Traveling particle */}
      <mesh ref={particleRef}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial color={fromColor} transparent opacity={0.8} />
      </mesh>
    </group>
  );
};

/**
 * Zone node marker
 */
const ZoneNode = ({
  zoneId,
  position,
  color: propColor,
}: {
  zoneId: string;
  position: [number, number, number];
  color?: string;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = propColor || FALLBACK_ZONE_COLORS[zoneId] || '#60a5fa';

  // Pulsing animation
  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={position}>
      {/* Outer glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <ringGeometry args={[2, 2.5, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Center node */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Inner core */}
      <mesh>
        <sphereGeometry args={[0.4, 12, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>
    </group>
  );
};

/**
 * Active path visualization with flowing animation
 */
const ActivePathVisualization = ({ path }: { path: PathData }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const [pathPoints, setPathPoints] = useState<THREE.Vector3[]>([]);

  // Convert path to 3D points
  useEffect(() => {
    if (path.smoothPath.length > 0) {
      const points = path.smoothPath.map(
        (p) => new THREE.Vector3(p.x - 50, 1.5, p.y - 50)
      );
      setPathPoints(points);
    }
  }, [path]);

  // Generate particle positions along path
  const particleData = useMemo(() => {
    if (pathPoints.length < 2) return { positions: new Float32Array(0), count: 0 };

    const particleCount = 50;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount;
      const index = Math.floor(t * (pathPoints.length - 1));
      const nextIndex = Math.min(index + 1, pathPoints.length - 1);
      const localT = (t * (pathPoints.length - 1)) - index;

      const point = pathPoints[index].clone().lerp(pathPoints[nextIndex], localT);
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
    }

    return { positions, count: particleCount };
  }, [pathPoints]);

  // Animate particles
  useFrame((state) => {
    if (particlesRef.current && pathPoints.length > 1) {
      const positions = particlesRef.current.geometry.attributes.position;
      if (!positions) return;

      const time = state.clock.elapsedTime;
      const particleCount = particleData.count;

      for (let i = 0; i < particleCount; i++) {
        const t = ((i / particleCount) + time * 0.2) % 1;
        const index = Math.floor(t * (pathPoints.length - 1));
        const nextIndex = Math.min(index + 1, pathPoints.length - 1);
        const localT = (t * (pathPoints.length - 1)) - index;

        const point = pathPoints[index].clone().lerp(pathPoints[nextIndex], localT);
        positions.setXYZ(i, point.x, point.y + Math.sin(time * 3 + i) * 0.2, point.z);
      }

      positions.needsUpdate = true;
    }
  });

  if (pathPoints.length < 2) return null;

  return (
    <group>
      {/* Main path line */}
      <Line
        points={pathPoints}
        color="#22d3ee"
        lineWidth={3}
        transparent
        opacity={0.8}
      />

      {/* Glow effect */}
      <Line
        points={pathPoints}
        color="#22d3ee"
        lineWidth={8}
        transparent
        opacity={0.2}
      />

{/* Flowing particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particleData.positions, 3]}
            count={particleData.count}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.5}
          color="#22d3ee"
          transparent
          opacity={0.9}
          sizeAttenuation
        />
      </points>

      {/* Waypoint markers */}
      {path.segments.map((segment, index) => (
        <PathWaypoint
          key={index}
          position={[segment.to.x - 50, 1.5, segment.to.y - 50]}
          zoneName={segment.zoneName || ''}
          distance={segment.distance}
          time={segment.estimatedTimeSeconds}
          isLast={index === path.segments.length - 1}
        />
      ))}

      {/* Path info overlay */}
      <PathInfoOverlay path={path} />
    </group>
  );
};

/**
 * Path waypoint marker
 */
const PathWaypoint = ({
  position,
  zoneName,
  distance,
  time,
  isLast,
}: {
  position: [number, number, number];
  zoneName: string;
  distance: number;
  time: number;
  isLast: boolean;
}) => {
  const ringRef = useRef<THREE.Mesh>(null);

  // Pulsing animation
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 2;
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
      ringRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={position}>
      {/* Waypoint ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1, 1.3, 6]} />
        <meshBasicMaterial
          color={isLast ? '#22c55e' : '#22d3ee'}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Center point */}
      <mesh>
        <sphereGeometry args={[0.4, 12, 12]} />
        <meshStandardMaterial
          color={isLast ? '#22c55e' : '#22d3ee'}
          emissive={isLast ? '#22c55e' : '#22d3ee'}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Info label */}
      <Billboard position={[0, 2.5, 0]}>
        <Text
          fontSize={0.8}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          {zoneName}
        </Text>
        <Text
          position={[0, -0.6, 0]}
          fontSize={0.5}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
        >
          {`${distance.toFixed(1)}m | ${Math.round(time)}s`}
        </Text>
      </Billboard>
    </group>
  );
};

/**
 * Path information overlay
 */
const PathInfoOverlay = ({ path }: { path: PathData }) => {
  // Position overlay at start of path
  const startPoint = path.smoothPath[0];
  if (!startPoint) return null;

  const position: [number, number, number] = [startPoint.x - 50, 5, startPoint.y - 50];

  return (
    <Billboard position={position}>
      <group>
        {/* Background panel */}
        <mesh>
          <planeGeometry args={[8, 3]} />
          <meshBasicMaterial color="#0f172a" transparent opacity={0.9} />
        </mesh>

        {/* Border */}
        <Line
          points={[
            [-4, -1.5, 0.01],
            [4, -1.5, 0.01],
            [4, 1.5, 0.01],
            [-4, 1.5, 0.01],
            [-4, -1.5, 0.01],
          ]}
          color="#22d3ee"
          lineWidth={2}
        />

        {/* Title */}
        <Text
          position={[0, 0.9, 0.02]}
          fontSize={0.5}
          color="#22d3ee"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          OPTIMAL ROUTE
        </Text>

        {/* Stats */}
        <Text
          position={[-2.5, 0.2, 0.02]}
          fontSize={0.4}
          color="#94a3b8"
          anchorX="left"
          anchorY="middle"
        >
          Distance:
        </Text>
        <Text
          position={[2.5, 0.2, 0.02]}
          fontSize={0.5}
          color="#ffffff"
          anchorX="right"
          anchorY="middle"
        >
          {`${path.totalDistance.toFixed(1)} m`}
        </Text>

        <Text
          position={[-2.5, -0.4, 0.02]}
          fontSize={0.4}
          color="#94a3b8"
          anchorX="left"
          anchorY="middle"
        >
          Est. Time:
        </Text>
        <Text
          position={[2.5, -0.4, 0.02]}
          fontSize={0.5}
          color="#ffffff"
          anchorX="right"
          anchorY="middle"
        >
          {formatTime(path.totalTimeSeconds)}
        </Text>

        <Text
          position={[-2.5, -1, 0.02]}
          fontSize={0.4}
          color="#94a3b8"
          anchorX="left"
          anchorY="middle"
        >
          Zones:
        </Text>
        <Text
          position={[2.5, -1, 0.02]}
          fontSize={0.4}
          color="#22c55e"
          anchorX="right"
          anchorY="middle"
        >
          {path.zonesTraversed.length}
        </Text>
      </group>
    </Billboard>
  );
};

/**
 * Format time in mm:ss
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export default PathfindingVisualization;
