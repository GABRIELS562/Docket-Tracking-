import { useMemo } from 'react';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';
import RFIDItems from './RFIDItems';

/**
 * Procedural 3D Warehouse Model
 *
 * Generates a realistic warehouse facility with:
 * - Floor grid (100x100m)
 * - Walls and boundaries
 * - Zone divisions with color coding
 * - Shelving units (simplified boxes)
 *
 * Dimensions:
 * - Total: 100m x 100m
 * - Height: 10m
 * - Zones: 5x5 grid (20m x 20m each)
 */
const Warehouse = () => {
  // Zone configuration
  const zones = useMemo(() => {
    const zoneConfig = [
      { id: 'receiving', color: '#3b82f6', name: 'Receiving', x: -40, z: -40 },
      { id: 'storage-a', color: '#10b981', name: 'Storage A', x: -40, z: 0 },
      { id: 'storage-b', color: '#10b981', name: 'Storage B', x: -40, z: 40 },
      { id: 'storage-c', color: '#10b981', name: 'Storage C', x: 0, z: -40 },
      { id: 'evidence', color: '#ef4444', name: 'Evidence', x: 0, z: 0 },
      { id: 'storage-d', color: '#10b981', name: 'Storage D', x: 0, z: 40 },
      { id: 'processing', color: '#f59e0b', name: 'Processing', x: 40, z: -40 },
      { id: 'shipping', color: '#8b5cf6', name: 'Shipping', x: 40, z: 0 },
      { id: 'returns', color: '#ec4899', name: 'Returns', x: 40, z: 40 },
    ];
    return zoneConfig;
  }, []);

  return (
    <group>
      {/* Floor Grid */}
      <Grid
        args={[100, 100]}
        cellSize={5}
        cellThickness={0.5}
        cellColor="#6b7280"
        sectionSize={20}
        sectionThickness={1}
        sectionColor="#4b5563"
        fadeDistance={200}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />

      {/* Floor plane (solid surface) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.1, 0]}
        receiveShadow
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial
          color="#1f2937"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* Warehouse walls */}
      {/* North wall */}
      <mesh position={[0, 5, -50]} castShadow receiveShadow>
        <boxGeometry args={[100, 10, 0.5]} />
        <meshStandardMaterial color="#374151" />
      </mesh>

      {/* South wall */}
      <mesh position={[0, 5, 50]} castShadow receiveShadow>
        <boxGeometry args={[100, 10, 0.5]} />
        <meshStandardMaterial color="#374151" />
      </mesh>

      {/* East wall */}
      <mesh position={[50, 5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 10, 100]} />
        <meshStandardMaterial color="#374151" />
      </mesh>

      {/* West wall */}
      <mesh position={[-50, 5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 10, 100]} />
        <meshStandardMaterial color="#374151" />
      </mesh>

      {/* Zone floor markers */}
      {zones.map((zone) => (
        <group key={zone.id} position={[zone.x, 0, zone.z]}>
          {/* Zone floor plate */}
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[18, 18]} />
            <meshStandardMaterial
              color={zone.color}
              transparent
              opacity={0.2}
              roughness={0.9}
            />
          </mesh>

          {/* Zone boundary lines */}
          <lineSegments>
            <edgesGeometry
              attach="geometry"
              args={[new THREE.PlaneGeometry(18, 18)]}
            />
            <lineBasicMaterial
              attach="material"
              color={zone.color}
              linewidth={2}
            />
          </lineSegments>

          {/* Simplified shelving units (boxes) */}
          {zone.id.includes('storage') && (
            <>
              <mesh position={[-6, 2, 0]} castShadow>
                <boxGeometry args={[2, 4, 16]} />
                <meshStandardMaterial color="#4b5563" />
              </mesh>
              <mesh position={[6, 2, 0]} castShadow>
                <boxGeometry args={[2, 4, 16]} />
                <meshStandardMaterial color="#4b5563" />
              </mesh>
            </>
          )}

          {/* Evidence vault (higher security visualization) */}
          {zone.id === 'evidence' && (
            <>
              <mesh position={[0, 3, 0]} castShadow>
                <boxGeometry args={[14, 6, 14]} />
                <meshStandardMaterial
                  color="#dc2626"
                  wireframe
                  opacity={0.3}
                  transparent
                />
              </mesh>
            </>
          )}
        </group>
      ))}

      {/* Real-time RFID items from WebSocket */}
      <RFIDItems />
    </group>
  );
};

export default Warehouse;
