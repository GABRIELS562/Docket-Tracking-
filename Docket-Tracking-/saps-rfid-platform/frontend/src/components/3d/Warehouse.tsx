import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Grid, Text, Float, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import RFIDItemsWrapper from './RFIDItemsWrapper';
import RFIDReaders from './RFIDReaders';
import ZoneHeatmap from './ZoneHeatmap';
import PathfindingVisualization from './PathfindingVisualization';
import { useSceneStore } from '../../stores/sceneStore';

/**
 * Professional 3D Warehouse Model - U-Shaped Flow Design
 *
 * Based on industry-standard warehouse layouts:
 * - U-shaped flow: Receiving & Shipping on same wall
 * - Clear aisle system with industrial racking
 * - Dedicated functional zones
 * - Realistic proportions (80m x 60m x 10m)
 *
 * Layout Reference:
 * ┌─────────────────────────────────────────────────────────┐
 * │  OFFICE    │    RECEIVING DOCK    │    SHIPPING DOCK    │
 * │            ├─────────────────────────────────────────────┤
 * │            │                                             │
 * │  RETURNS   │    BULK STORAGE (Pallet Racking)           │
 * │            │    ═══════════════════════════             │
 * │            │    ═══════════════════════════             │
 * │ PROCESSING │    ═══════════════════════════             │
 * │            │                                             │
 * │            │    PICK/PACK AREA     │   STAGING          │
 * │ SECURE     ├───────────────────────┴────────────────────┤
 * │ STORAGE    │            MAIN AISLE                       │
 * └────────────┴─────────────────────────────────────────────┘
 */
const Warehouse = () => {
  // Use individual selectors to avoid re-renders when unrelated state changes
  const showGrid = useSceneStore((s) => s.showGrid);
  const showLabels = useSceneStore((s) => s.showLabels);
  const activePath = useSceneStore((s) => s.activePath);

  // U-shaped warehouse zones configuration
  const zones = useMemo(
    () => [
      // Front wall zones (Dock side)
      { id: 'receiving', color: '#22c55e', name: 'Receiving', x: -20, z: -25, w: 20, h: 12, icon: '📥' },
      { id: 'shipping', color: '#8b5cf6', name: 'Shipping', x: 20, z: -25, w: 20, h: 12, icon: '📤' },

      // Left wall zones
      { id: 'office', color: '#6366f1', name: 'Office', x: -35, z: -20, w: 8, h: 15, icon: '🏢' },
      { id: 'returns', color: '#f97316', name: 'Returns', x: -35, z: 0, w: 8, h: 12, icon: '↩️' },
      { id: 'processing', color: '#eab308', name: 'Processing', x: -35, z: 15, w: 8, h: 14, icon: '⚙️' },

      // Center storage area
      { id: 'storage-a', color: '#3b82f6', name: 'Storage A', x: -12, z: 0, w: 18, h: 30, icon: '📦' },
      { id: 'storage-b', color: '#3b82f6', name: 'Storage B', x: 12, z: 0, w: 18, h: 30, icon: '📦' },

      // Right side
      { id: 'staging', color: '#14b8a6', name: 'Staging', x: 32, z: 5, w: 12, h: 20, icon: '📋' },

      // Secure area (bottom left)
      { id: 'secure-storage', color: '#ef4444', name: 'Secure Evidence', x: -35, z: 25, w: 10, h: 10, icon: '🔒' },
    ],
    []
  );

  return (
    <group>
      {/* Floor Grid */}
      {showGrid && (
        <Grid
          args={[90, 70]}
          cellSize={2}
          cellThickness={0.3}
          cellColor="#1e293b"
          sectionSize={10}
          sectionThickness={0.8}
          sectionColor="#334155"
          fadeDistance={200}
          fadeStrength={1}
          followCamera={false}
          position={[0, 0.02, 0]}
        />
      )}

      {/* Industrial Epoxy Floor */}
      <IndustrialFloor />

      {/* Warehouse Structure */}
      <WarehouseStructure />

      {/* Ceiling with Industrial Lighting */}
      <CeilingSystem />

      {/* Zone Visualizations */}
      {zones.map((zone) => (
        <ZoneVisualization key={zone.id} zone={zone} showLabels={showLabels} />
      ))}

      {/* Loading Docks */}
      <LoadingDocks />

      {/* Pallet Racking System */}
      <PalletRacking />

      {/* Main Aisle Markings */}
      <AisleMarkings />

      {/* RFID Reader Antennas */}
      <RFIDReaders />

      {/* Real-time RFID Items - auto-switches to instanced rendering at 100+ items */}
      <RFIDItemsWrapper />

      {/* Zone Heatmap - shows occupancy levels */}
      <ZoneHeatmap />

      {/* Pathfinding Visualization - shows routes between zones */}
      <PathfindingVisualization showZoneConnections={true} activePath={activePath || undefined} />
    </group>
  );
};

/**
 * Industrial epoxy-coated concrete floor
 */
const IndustrialFloor = () => {
  return (
    <group>
      {/* Main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[90, 70]} />
        <meshStandardMaterial
          color="#1c2333"
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Floor safety markings - main aisle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -10]}>
        <planeGeometry args={[70, 0.15]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} />
      </mesh>

      {/* Cross aisle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 15]}>
        <planeGeometry args={[60, 0.15]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
};

/**
 * Warehouse walls with dock openings
 */
const WarehouseStructure = () => {
  const wallHeight = 10;
  const wallColor = '#1e2838';

  return (
    <group>
      {/* Front wall (dock side) with openings */}
      <group position={[0, wallHeight / 2, -35]}>
        {/* Left section */}
        <mesh position={[-37, 0, 0]} castShadow>
          <boxGeometry args={[16, wallHeight, 0.3]} />
          <meshStandardMaterial color={wallColor} roughness={0.8} />
        </mesh>
        {/* Center section (above docks) */}
        <mesh position={[0, wallHeight / 2 - 2, 0]} castShadow>
          <boxGeometry args={[50, 3, 0.3]} />
          <meshStandardMaterial color={wallColor} roughness={0.8} />
        </mesh>
        {/* Right section */}
        <mesh position={[37, 0, 0]} castShadow>
          <boxGeometry args={[16, wallHeight, 0.3]} />
          <meshStandardMaterial color={wallColor} roughness={0.8} />
        </mesh>
      </group>

      {/* Back wall */}
      <mesh position={[0, wallHeight / 2, 35]} castShadow>
        <boxGeometry args={[90, wallHeight, 0.3]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-45, wallHeight / 2, 0]} castShadow>
        <boxGeometry args={[0.3, wallHeight, 70]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} />
      </mesh>

      {/* Right wall */}
      <mesh position={[45, wallHeight / 2, 0]} castShadow>
        <boxGeometry args={[0.3, wallHeight, 70]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} />
      </mesh>
    </group>
  );
};

/**
 * Industrial ceiling with lighting
 */
const CeilingSystem = () => {
  const lights = useMemo(() => {
    const positions = [];
    for (let x = -35; x <= 35; x += 14) {
      for (let z = -25; z <= 25; z += 12) {
        positions.push({ x, z });
      }
    }
    return positions;
  }, []);

  return (
    <group>
      {/* Ceiling - only visible from inside (looking up), invisible from top-down view */}
      <mesh position={[0, 9.9, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[90, 70]} />
        <meshStandardMaterial color="#0d1117" side={THREE.BackSide} />
      </mesh>

      {/* Steel beam grid */}
      {[-30, -15, 0, 15, 30].map((x) => (
        <mesh key={`beam-x-${x}`} position={[x, 9.5, 0]} castShadow>
          <boxGeometry args={[0.3, 0.5, 70]} />
          <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.4} />
        </mesh>
      ))}
      {[-25, -10, 5, 20].map((z) => (
        <mesh key={`beam-z-${z}`} position={[0, 9.5, z]} castShadow>
          <boxGeometry args={[90, 0.5, 0.3]} />
          <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.4} />
        </mesh>
      ))}

      {/* High-bay LED lights */}
      {lights.map((light, i) => (
        <group key={i} position={[light.x, 9, light.z]}>
          <mesh>
            <boxGeometry args={[2, 0.15, 0.8]} />
            <meshStandardMaterial color="#1f2937" metalness={0.6} />
          </mesh>
          <mesh position={[0, -0.1, 0]}>
            <planeGeometry args={[1.8, 0.6]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#fff8e7"
              emissiveIntensity={2}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/**
 * Loading dock doors
 */
const LoadingDocks = () => {
  const docks = [
    { x: -25, label: 'R1', isReceiving: true },
    { x: -15, label: 'R2', isReceiving: true },
    { x: 15, label: 'S1', isReceiving: false },
    { x: 25, label: 'S2', isReceiving: false },
  ];

  return (
    <group position={[0, 0, -35]}>
      {docks.map((dock, i) => (
        <group key={i} position={[dock.x, 0, 0.5]}>
          {/* Dock door */}
          <mesh position={[0, 3.5, 0]}>
            <boxGeometry args={[8, 7, 0.2]} />
            <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.3} />
          </mesh>

          {/* Door segments */}
          {[1, 2.5, 4, 5.5].map((y) => (
            <mesh key={y} position={[0, y, 0.15]}>
              <boxGeometry args={[7.8, 0.08, 0.05]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          ))}

          {/* Dock leveler */}
          <mesh position={[0, 0.1, 2]} rotation={[-0.05, 0, 0]}>
            <boxGeometry args={[7, 0.15, 4]} />
            <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.6} />
          </mesh>

          {/* Dock bumpers */}
          <mesh position={[-3.5, 1.5, -0.3]}>
            <boxGeometry args={[0.4, 3, 0.6]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
          <mesh position={[3.5, 1.5, -0.3]}>
            <boxGeometry args={[0.4, 3, 0.6]} />
            <meshStandardMaterial color="#111827" />
          </mesh>

          {/* Status light */}
          <mesh position={[4.5, 6.5, 0.2]}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial
              color={dock.isReceiving ? '#22c55e' : '#8b5cf6'}
              emissive={dock.isReceiving ? '#22c55e' : '#8b5cf6'}
              emissiveIntensity={2}
            />
          </mesh>

          {/* Dock label */}
          <Text
            position={[0, 7.5, 0.2]}
            fontSize={0.8}
            color="#94a3b8"
            anchorX="center"
          >
            {dock.label}
          </Text>
        </group>
      ))}

      {/* Zone divider between receiving and shipping */}
      <mesh position={[0, 0.5, 3]}>
        <boxGeometry args={[0.1, 1, 10]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
};

/**
 * Industrial pallet racking system
 */
const PalletRacking = () => {
  const racks = useMemo(() => {
    const result = [];
    // Storage A racks
    for (let z = -8; z <= 12; z += 5) {
      result.push({ x: -18, z, length: 12 });
      result.push({ x: -8, z, length: 12 });
    }
    // Storage B racks
    for (let z = -8; z <= 12; z += 5) {
      result.push({ x: 8, z, length: 12 });
      result.push({ x: 18, z, length: 12 });
    }
    return result;
  }, []);

  return (
    <group>
      {racks.map((rack, i) => (
        <RackUnit key={i} position={[rack.x, 0, rack.z]} length={rack.length} />
      ))}
    </group>
  );
};

/**
 * Single pallet rack unit
 */
const RackUnit = ({ position, length }: { position: [number, number, number]; length: number }) => {
  const levels = 4;
  const levelHeight = 1.5;

  return (
    <group position={position}>
      {/* Uprights */}
      {[-length / 2 + 0.5, length / 2 - 0.5].map((z) => (
        <group key={z}>
          <mesh position={[-0.5, levels * levelHeight / 2, z]} castShadow>
            <boxGeometry args={[0.1, levels * levelHeight, 0.1]} />
            <meshStandardMaterial color="#f97316" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0.5, levels * levelHeight / 2, z]} castShadow>
            <boxGeometry args={[0.1, levels * levelHeight, 0.1]} />
            <meshStandardMaterial color="#f97316" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* Beams */}
      {Array.from({ length: levels }).map((_, level) => (
        <group key={level} position={[0, (level + 1) * levelHeight, 0]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.2, 0.1, length]} />
            <meshStandardMaterial color="#f97316" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* Wire decking */}
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[1, 0.02, length - 0.2]} />
            <meshStandardMaterial color="#4b5563" metalness={0.3} wireframe />
          </mesh>
        </group>
      ))}

      {/* Some pallets on racks */}
      {[0, 1, 2].map((level) =>
        [-3, 0, 3].map((z, zi) =>
          Math.random() > 0.3 ? (
            <mesh key={`${level}-${zi}`} position={[0, level * levelHeight + 1.1, z]}>
              <boxGeometry args={[0.9, 0.15, 2.5]} />
              <meshStandardMaterial color="#78716c" />
            </mesh>
          ) : null
        )
      )}
    </group>
  );
};

/**
 * Floor aisle markings
 */
const AisleMarkings = () => {
  return (
    <group>
      {/* Main aisle arrows */}
      {[-25, 0, 25].map((x) => (
        <group key={x} position={[x, 0.015, -10]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.5, 3]} />
            <meshStandardMaterial color="#3b82f6" transparent opacity={0.6} />
          </mesh>
        </group>
      ))}

      {/* Pedestrian walkway */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-40, 0.012, 0]}>
        <planeGeometry args={[3, 50]} />
        <meshStandardMaterial color="#22c55e" transparent opacity={0.15} />
      </mesh>

      {/* Forklift lane markers */}
      {[-5, 5].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.012, 0]}>
          <planeGeometry args={[0.1, 40]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2} />
        </mesh>
      ))}
    </group>
  );
};

/**
 * Zone visualization with floor marking and labels
 */
interface ZoneConfig {
  id: string;
  color: string;
  name: string;
  x: number;
  z: number;
  w: number;
  h: number;
  icon: string;
}

const ZoneVisualization = ({ zone, showLabels }: { zone: ZoneConfig; showLabels: boolean }) => {
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.12 + Math.sin(state.clock.elapsedTime * 1.5) * 0.04;
    }
  });

  const isSecure = zone.id === 'secure-storage';

  return (
    <group position={[zone.x, 0, zone.z]}>
      {/* Zone floor */}
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[zone.w, zone.h]} />
        <meshStandardMaterial
          color={zone.color}
          transparent
          opacity={0.12}
        />
      </mesh>

      {/* Zone border glow */}
      <mesh ref={glowRef} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.min(zone.w, zone.h) / 2 - 0.5, Math.min(zone.w, zone.h) / 2, 4]} />
        <meshBasicMaterial color={zone.color} transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>

      {/* Corner posts for secure area */}
      {isSecure && (
        <>
          {/* Corner posts with warning lights */}
          {[
            [-zone.w / 2 + 0.3, -zone.h / 2 + 0.3],
            [zone.w / 2 - 0.3, -zone.h / 2 + 0.3],
            [zone.w / 2 - 0.3, zone.h / 2 - 0.3],
            [-zone.w / 2 + 0.3, zone.h / 2 - 0.3],
          ].map(([x, z], i) => (
            <group key={i} position={[x, 0, z]}>
              {/* Post */}
              <mesh position={[0, 1.5, 0]} castShadow>
                <cylinderGeometry args={[0.15, 0.15, 3, 8]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
              </mesh>
              {/* Warning light on top */}
              <mesh position={[0, 3.1, 0]}>
                <sphereGeometry args={[0.2, 16, 16]} />
                <meshStandardMaterial
                  color="#ff0000"
                  emissive="#ff0000"
                  emissiveIntensity={2}
                />
              </mesh>
            </group>
          ))}

          {/* Horizontal cage bars - cleaner than RoundedBox wireframe */}
          {/* Bottom bars */}
          {[
            { start: [-zone.w / 2 + 0.3, 0.5, -zone.h / 2 + 0.3], end: [zone.w / 2 - 0.3, 0.5, -zone.h / 2 + 0.3] },
            { start: [-zone.w / 2 + 0.3, 0.5, zone.h / 2 - 0.3], end: [zone.w / 2 - 0.3, 0.5, zone.h / 2 - 0.3] },
            { start: [-zone.w / 2 + 0.3, 0.5, -zone.h / 2 + 0.3], end: [-zone.w / 2 + 0.3, 0.5, zone.h / 2 - 0.3] },
            { start: [zone.w / 2 - 0.3, 0.5, -zone.h / 2 + 0.3], end: [zone.w / 2 - 0.3, 0.5, zone.h / 2 - 0.3] },
          ].map((bar, i) => {
            const length = Math.sqrt(
              Math.pow(bar.end[0] - bar.start[0], 2) + Math.pow(bar.end[2] - bar.start[2], 2)
            );
            const midX = (bar.start[0] + bar.end[0]) / 2;
            const midZ = (bar.start[2] + bar.end[2]) / 2;
            const isHorizontal = bar.start[2] === bar.end[2];
            return (
              <mesh key={`bar-bottom-${i}`} position={[midX, bar.start[1], midZ]} rotation={[0, isHorizontal ? 0 : Math.PI / 2, 0]}>
                <boxGeometry args={[length, 0.05, 0.05]} />
                <meshStandardMaterial color="#dc2626" metalness={0.8} roughness={0.2} />
              </mesh>
            );
          })}

          {/* Top bars */}
          {[
            { start: [-zone.w / 2 + 0.3, 3, -zone.h / 2 + 0.3], end: [zone.w / 2 - 0.3, 3, -zone.h / 2 + 0.3] },
            { start: [-zone.w / 2 + 0.3, 3, zone.h / 2 - 0.3], end: [zone.w / 2 - 0.3, 3, zone.h / 2 - 0.3] },
            { start: [-zone.w / 2 + 0.3, 3, -zone.h / 2 + 0.3], end: [-zone.w / 2 + 0.3, 3, zone.h / 2 - 0.3] },
            { start: [zone.w / 2 - 0.3, 3, -zone.h / 2 + 0.3], end: [zone.w / 2 - 0.3, 3, zone.h / 2 - 0.3] },
          ].map((bar, i) => {
            const length = Math.sqrt(
              Math.pow(bar.end[0] - bar.start[0], 2) + Math.pow(bar.end[2] - bar.start[2], 2)
            );
            const midX = (bar.start[0] + bar.end[0]) / 2;
            const midZ = (bar.start[2] + bar.end[2]) / 2;
            const isHorizontal = bar.start[2] === bar.end[2];
            return (
              <mesh key={`bar-top-${i}`} position={[midX, bar.start[1], midZ]} rotation={[0, isHorizontal ? 0 : Math.PI / 2, 0]}>
                <boxGeometry args={[length, 0.05, 0.05]} />
                <meshStandardMaterial color="#dc2626" metalness={0.8} roughness={0.2} />
              </mesh>
            );
          })}

          {/* Vertical cage bars on walls */}
          {[-zone.w / 2 + 0.3, zone.w / 2 - 0.3].map((x) =>
            Array.from({ length: 5 }).map((_, i) => {
              const zPos = -zone.h / 2 + 0.3 + ((zone.h - 0.6) / 4) * i;
              return (
                <mesh key={`vert-${x}-${i}`} position={[x, 1.75, zPos]}>
                  <boxGeometry args={[0.03, 2.5, 0.03]} />
                  <meshStandardMaterial color="#b91c1c" metalness={0.7} roughness={0.3} />
                </mesh>
              );
            })
          )}
          {[-zone.h / 2 + 0.3, zone.h / 2 - 0.3].map((z) =>
            Array.from({ length: 5 }).map((_, i) => {
              const xPos = -zone.w / 2 + 0.3 + ((zone.w - 0.6) / 4) * i;
              return (
                <mesh key={`vert-z-${z}-${i}`} position={[xPos, 1.75, z]}>
                  <boxGeometry args={[0.03, 2.5, 0.03]} />
                  <meshStandardMaterial color="#b91c1c" metalness={0.7} roughness={0.3} />
                </mesh>
              );
            })
          )}

          {/* Security sign */}
          <group position={[0, 3.5, -zone.h / 2 + 0.5]}>
            <mesh>
              <planeGeometry args={[3, 0.6]} />
              <meshStandardMaterial color="#1f2937" />
            </mesh>
            <Text
              position={[0, 0, 0.01]}
              fontSize={0.25}
              color="#ef4444"
              anchorX="center"
              anchorY="middle"
            >
              SECURE STORAGE
            </Text>
          </group>
        </>
      )}

      {/* Zone label */}
      {showLabels && (
        <Float speed={1.5} rotationIntensity={0} floatIntensity={0.15}>
          <group position={[0, 0.8, 0]}>
            {/* Background panel */}
            <mesh position={[0, 0, -0.05]}>
              <planeGeometry args={[zone.name.length * 0.35 + 1, 1]} />
              <meshStandardMaterial color="#0f172a" transparent opacity={0.85} />
            </mesh>
            <Text
              fontSize={0.5}
              color={zone.color}
              anchorX="center"
              anchorY="middle"
            >
              {zone.name}
            </Text>
          </group>
        </Float>
      )}

      {/* Zone-specific equipment */}
      {zone.id === 'office' && <OfficeArea width={zone.w} depth={zone.h} />}
      {zone.id === 'processing' && <ProcessingStation width={zone.w} depth={zone.h} />}
      {zone.id === 'staging' && <StagingArea width={zone.w} depth={zone.h} />}
    </group>
  );
};

/**
 * Office area with desks and equipment
 */
const OfficeArea = ({ width, depth }: { width: number; depth: number }) => {
  return (
    <group>
      {/* Partition walls */}
      <mesh position={[width / 2 - 0.1, 1.5, 0]} castShadow>
        <boxGeometry args={[0.1, 3, depth - 1]} />
        <meshStandardMaterial color="#374151" />
      </mesh>

      {/* Desks */}
      {[-3, 3].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[2.5, 0.05, 1.2]} />
            <meshStandardMaterial color="#4b5563" />
          </mesh>
          <mesh position={[0, 1.2, -0.5]}>
            <boxGeometry args={[0.8, 0.5, 0.05]} />
            <meshStandardMaterial color="#1e293b" emissive="#3b82f6" emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/**
 * Processing/examination station
 */
const ProcessingStation = ({ width, depth: _depth }: { width: number; depth: number }) => {
  return (
    <group>
      {/* Work tables */}
      {[-4, 0, 4].map((z) => (
        <mesh key={z} position={[0, 0.9, z]}>
          <boxGeometry args={[width - 2, 0.05, 2]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      {/* Equipment */}
      <mesh position={[0, 1.3, -4]}>
        <boxGeometry args={[1, 0.8, 0.8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </group>
  );
};

/**
 * Staging area with pallet positions
 */
const StagingArea = (_props: { width: number; depth: number }) => {
  const positions = [
    [-2, -6],
    [2, -6],
    [-2, 0],
    [2, 0],
    [-2, 6],
    [2, 6],
  ];

  return (
    <group>
      {positions.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {/* Pallet marker */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <planeGeometry args={[3, 3]} />
            <meshStandardMaterial color="#14b8a6" transparent opacity={0.2} />
          </mesh>
          {/* Marker lines */}
          {[[-1.4, 0], [1.4, 0], [0, -1.4], [0, 1.4]].map(([lx, lz], li) => (
            <mesh key={li} rotation={[-Math.PI / 2, 0, 0]} position={[lx, 0.025, lz]}>
              <planeGeometry args={[lx === 0 ? 2.8 : 0.1, lz === 0 ? 2.8 : 0.1]} />
              <meshStandardMaterial color="#14b8a6" emissive="#14b8a6" emissiveIntensity={0.3} />
            </mesh>
          ))}
          {/* Position label */}
          <Text
            position={[0, 0.1, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.4}
            color="#14b8a6"
            anchorX="center"
            anchorY="middle"
          >
            {`S${i + 1}`}
          </Text>
        </group>
      ))}
    </group>
  );
};

export default Warehouse;
