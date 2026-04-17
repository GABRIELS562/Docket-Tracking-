import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useSceneStore } from '../../stores/sceneStore';
import { useReaders } from '../../stores';

/**
 * RFID Reader Configuration (runtime format for rendering)
 */
interface RFIDReaderConfig {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: number;
  zone: string;
  status: 'online' | 'offline' | 'warning' | 'error';
}

/**
 * Fallback readers positioned for U-shaped warehouse layout
 * Used when warehouse store is not yet initialized
 */
const FALLBACK_READERS: RFIDReaderConfig[] = [
  // Receiving docks
  { id: 'RDR-001', name: 'R1', position: [-30, 3.5, -33], rotation: 0, zone: 'receiving', status: 'online' },
  { id: 'RDR-002', name: 'R2', position: [-15, 3.5, -33], rotation: 0, zone: 'receiving', status: 'online' },
  // Shipping docks
  { id: 'RDR-003', name: 'S1', position: [15, 3.5, -33], rotation: 0, zone: 'shipping', status: 'online' },
  { id: 'RDR-004', name: 'S2', position: [30, 3.5, -33], rotation: 0, zone: 'shipping', status: 'online' },
  // Storage A
  { id: 'RDR-005', name: 'A-N', position: [-12.5, 3, -20], rotation: 0, zone: 'storage-a', status: 'online' },
  { id: 'RDR-006', name: 'A-S', position: [-12.5, 3, 10], rotation: Math.PI, zone: 'storage-a', status: 'online' },
  // Storage B
  { id: 'RDR-007', name: 'B-N', position: [12.5, 3, -20], rotation: 0, zone: 'storage-b', status: 'online' },
  { id: 'RDR-008', name: 'B-S', position: [12.5, 3, 10], rotation: Math.PI, zone: 'storage-b', status: 'warning' },
  // Other zones
  { id: 'RDR-009', name: 'PROC', position: [-30, 3, 15], rotation: Math.PI / 2, zone: 'processing', status: 'online' },
  { id: 'RDR-010', name: 'RET', position: [-37.5, 3, -5], rotation: Math.PI / 2, zone: 'returns', status: 'online' },
  { id: 'RDR-011', name: 'STG', position: [32.5, 3, 10], rotation: Math.PI / 2, zone: 'staging', status: 'online' },
  // Secure storage
  { id: 'RDR-012', name: 'SEC1', position: [-30, 3, 28.5], rotation: Math.PI / 2, zone: 'secure-evidence', status: 'online' },
  { id: 'RDR-013', name: 'SEC2', position: [-38, 3.5, 28.5], rotation: 0, zone: 'secure-evidence', status: 'online' },
  { id: 'RDR-014', name: 'OFF', position: [-37.5, 3, -22.5], rotation: Math.PI / 2, zone: 'office', status: 'online' },
];

/**
 * Status colors
 */
const STATUS_COLORS: Record<RFIDReaderConfig['status'], string> = {
  online: '#22c55e',
  offline: '#ef4444',
  warning: '#f59e0b',
  error: '#dc2626',
};

/**
 * RFID Readers Component - Stable Version
 *
 * Now uses unified warehouse store for reader configuration
 */
const RFIDReaders = () => {
  // Use individual selector to avoid re-renders
  const showReaders = useSceneStore((s) => s.showReaders);

  // NEW: Get readers from unified warehouse store
  const warehouseReaders = useReaders();

  // Transform warehouse readers to rendering format
  const readers = useMemo<RFIDReaderConfig[]>(() => {
    if (!warehouseReaders || warehouseReaders.length === 0) {
      return FALLBACK_READERS;
    }

    return warehouseReaders.map((reader) => ({
      id: reader.id,
      name: reader.name,
      position: [reader.position.x, reader.position.y, reader.position.z] as [number, number, number],
      rotation: reader.rotation,
      zone: reader.zoneId,
      status: reader.status || 'online',
    }));
  }, [warehouseReaders]);

  if (!showReaders) return null;

  return (
    <group>
      {readers.map((reader) => (
        <RFIDReader key={reader.id} config={reader} />
      ))}
    </group>
  );
};

/**
 * Individual RFID Reader - Enhanced visibility version
 * Much larger and more visible for demos
 */
const RFIDReader = ({ config }: { config: RFIDReaderConfig }) => {
  const groupRef = useRef<THREE.Group>(null);
  const ledRef = useRef<THREE.Mesh>(null);
  const scanRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const beaconRef = useRef<THREE.Mesh>(null);

  const statusColor = STATUS_COLORS[config.status];
  // Support both old and new zone IDs for secure storage
  const isSecure = config.zone === 'secure-storage' || config.zone === 'secure-evidence';

  // Animate LED, scan beam, and beacon
  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // LED pulse
    if (ledRef.current) {
      const ledMat = ledRef.current.material as THREE.MeshStandardMaterial;
      if (config.status === 'online') {
        ledMat.emissiveIntensity = 2 + Math.sin(time * 3) * 1;
      } else if (config.status === 'warning') {
        ledMat.emissiveIntensity = Math.sin(time * 5) > 0 ? 3 : 0.5;
      }
    }

    // Scan beam pulse - much more visible
    if (scanRef.current && config.status === 'online') {
      const scanMat = scanRef.current.material as THREE.MeshBasicMaterial;
      scanMat.opacity = 0.15 + Math.sin(time * 2) * 0.08;
    }

    // Rotating ring animation
    if (ringRef.current) {
      ringRef.current.rotation.z = time * 1.5;
    }

    // Beacon pulse
    if (beaconRef.current) {
      const scale = 1 + Math.sin(time * 4) * 0.2;
      beaconRef.current.scale.set(scale, scale, scale);
      const beaconMat = beaconRef.current.material as THREE.MeshBasicMaterial;
      beaconMat.opacity = 0.6 + Math.sin(time * 4) * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={config.position} rotation={[0, config.rotation, 0]}>
      {/* Large glowing base ring on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.45, 0]}>
        <ringGeometry args={[0.8, 1.2, 32]} />
        <meshBasicMaterial
          color={statusColor}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Animated rotating ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.4, 0]}>
        <ringGeometry args={[1.0, 1.1, 32]} />
        <meshBasicMaterial
          color={statusColor}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Reader body - LARGER */}
      <mesh castShadow>
        <boxGeometry args={[0.8, 1.5, 0.2]} />
        <meshStandardMaterial
          color={isSecure ? '#1a1a1a' : '#1e293b'}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Glowing edge outline */}
      <mesh>
        <boxGeometry args={[0.85, 1.55, 0.15]} />
        <meshBasicMaterial
          color={statusColor}
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Antenna panel with glow */}
      <mesh position={[0, 0, 0.11]}>
        <boxGeometry args={[0.6, 1.2, 0.02]} />
        <meshStandardMaterial
          color="#0f172a"
          emissive={statusColor}
          emissiveIntensity={0.3}
          metalness={0.9}
        />
      </mesh>

      {/* Antenna stripes - more visible */}
      {[-0.35, -0.15, 0.05, 0.25, 0.45].map((y, i) => (
        <mesh key={i} position={[0, y, 0.13]}>
          <boxGeometry args={[0.5, 0.06, 0.01]} />
          <meshBasicMaterial color={statusColor} transparent opacity={0.5} />
        </mesh>
      ))}

      {/* Large Status LED beacon */}
      <mesh ref={ledRef} position={[0, 0.9, 0.12]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={2}
        />
      </mesh>

      {/* LED glow sphere */}
      <mesh ref={beaconRef} position={[0, 0.9, 0.12]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial
          color={statusColor}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Mounting pole - thicker */}
      <mesh position={[0, -1.7, -0.1]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 2.2, 12]} />
        <meshStandardMaterial color="#475569" metalness={0.7} />
      </mesh>

      {/* Base - larger */}
      <mesh position={[0, -2.8, -0.1]}>
        <cylinderGeometry args={[0.25, 0.3, 0.15, 12]} />
        <meshStandardMaterial color="#64748b" metalness={0.6} />
      </mesh>

      {/* LARGE Scan field cone - VERY visible */}
      {config.status === 'online' && (
        <group position={[0, 0, 2.5]} rotation={[Math.PI / 2, 0, 0]}>
          {/* Main scan cone */}
          <mesh ref={scanRef}>
            <coneGeometry args={[2.5, 5, 24, 1, true]} />
            <meshBasicMaterial
              color={isSecure ? '#ef4444' : statusColor}
              transparent
              opacity={0.15}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          {/* Inner bright cone */}
          <mesh>
            <coneGeometry args={[1.5, 4, 24, 1, true]} />
            <meshBasicMaterial
              color={isSecure ? '#ef4444' : statusColor}
              transparent
              opacity={0.08}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* Zone label - MUCH larger and floating above */}
      <Text
        position={[0, 2.5, 0]}
        fontSize={0.5}
        color={statusColor}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {config.name}
      </Text>

      {/* Zone name below */}
      <Text
        position={[0, 2.0, 0]}
        fontSize={0.25}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        {config.zone.replace('-', ' ').toUpperCase()}
      </Text>

      {/* Status indicator text */}
      <Text
        position={[0, -0.9, 0.12]}
        fontSize={0.15}
        color={statusColor}
        anchorX="center"
        anchorY="middle"
      >
        {config.status.toUpperCase()}
      </Text>
    </group>
  );
};

export default RFIDReaders;
