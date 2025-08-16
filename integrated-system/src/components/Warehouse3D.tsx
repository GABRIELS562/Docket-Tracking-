/**
 * 3D Warehouse Visualization Component
 * Interactive 3D view of storage facility with real-time tracking
 */

import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  Box, 
  Text, 
  Plane, 
  Line,
  Html,
  PerspectiveCamera,
  Environment,
  ContactShadows,
  Float
} from '@react-three/drei';
import * as THREE from 'three';

interface StorageBox {
  id: string;
  position: [number, number, number];
  size: [number, number, number];
  label: string;
  occupancy: number;
  items: number;
  category: string;
  lastAccessed: Date;
  temperature?: number;
  humidity?: number;
}

interface RFIDTag {
  id: string;
  position: [number, number, number];
  docketCode: string;
  status: 'active' | 'idle' | 'moving';
  signalStrength: number;
}

interface WarehouseProps {
  boxes: StorageBox[];
  rfidTags: RFIDTag[];
  selectedBox?: string;
  onBoxClick?: (boxId: string) => void;
  showHeatmap?: boolean;
  showPaths?: boolean;
}

// Storage Rack Component
const StorageRack: React.FC<{
  position: [number, number, number];
  boxes: StorageBox[];
  onBoxClick?: (boxId: string) => void;
  showHeatmap?: boolean;
}> = ({ position, boxes, onBoxClick, showHeatmap }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const getBoxColor = (box: StorageBox): string => {
    if (showHeatmap) {
      // Heat map based on activity
      const hoursSinceAccess = (Date.now() - new Date(box.lastAccessed).getTime()) / (1000 * 60 * 60);
      if (hoursSinceAccess < 1) return '#ff0000'; // Hot - recently accessed
      if (hoursSinceAccess < 24) return '#ff9900'; // Warm
      if (hoursSinceAccess < 168) return '#ffff00'; // Cool
      return '#0099ff'; // Cold - not accessed recently
    }
    
    // Color by occupancy
    const occupancyPercent = box.occupancy;
    if (occupancyPercent > 90) return '#ff3333';
    if (occupancyPercent > 70) return '#ff9933';
    if (occupancyPercent > 50) return '#ffcc33';
    return '#33cc33';
  };

  return (
    <group position={position}>
      {/* Rack Frame */}
      <Box args={[0.1, 5, 3]} position={[-1.5, 2.5, 0]}>
        <meshStandardMaterial color="#666666" />
      </Box>
      <Box args={[0.1, 5, 3]} position={[1.5, 2.5, 0]}>
        <meshStandardMaterial color="#666666" />
      </Box>
      
      {/* Shelves */}
      {[0, 1, 2, 3, 4].map((level) => (
        <Box key={level} args={[3, 0.05, 3]} position={[0, level * 1 + 0.5, 0]}>
          <meshStandardMaterial color="#999999" />
        </Box>
      ))}
      
      {/* Storage Boxes */}
      {boxes.map((box, index) => (
        <Float
          key={box.id}
          speed={1}
          rotationIntensity={0.1}
          floatIntensity={0.1}
        >
          <Box
            args={box.size}
            position={box.position}
            onClick={() => onBoxClick?.(box.id)}
          >
            <meshStandardMaterial 
              color={getBoxColor(box)}
              opacity={0.8}
              transparent
            />
          </Box>
          <Text
            position={[box.position[0], box.position[1], box.position[2] + 0.6]}
            fontSize={0.15}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {box.label}
          </Text>
          {box.occupancy > 80 && (
            <Html position={[box.position[0], box.position[1] + 0.5, box.position[2]]}>
              <div style={{
                background: 'rgba(255, 0, 0, 0.8)',
                color: 'white',
                padding: '2px 4px',
                borderRadius: '3px',
                fontSize: '10px'
              }}>
                {box.occupancy}% Full
              </div>
            </Html>
          )}
        </Float>
      ))}
    </group>
  );
};

// RFID Tag Visualization
const RFIDTagMarker: React.FC<{ tag: RFIDTag }> = ({ tag }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current && tag.status === 'moving') {
      meshRef.current.rotation.y += 0.02;
      meshRef.current.position.y = tag.position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  const getTagColor = () => {
    if (tag.status === 'moving') return '#00ff00';
    if (tag.status === 'active') return '#ffff00';
    return '#999999';
  };

  return (
    <group position={tag.position}>
      <Box
        ref={meshRef}
        args={[0.2, 0.1, 0.3]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial 
          color={getTagColor()}
          emissive={getTagColor()}
          emissiveIntensity={tag.status === 'moving' ? 0.5 : 0.2}
        />
      </Box>
      
      {/* Signal strength indicator */}
      <Line
        points={[[0, 0, 0], [0, tag.signalStrength * 0.5, 0]]}
        color={getTagColor()}
        lineWidth={2}
      />
      
      {hovered && (
        <Html>
          <div style={{
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap'
          }}>
            <div>📦 {tag.docketCode}</div>
            <div>Signal: {Math.round(tag.signalStrength * 100)}%</div>
            <div>Status: {tag.status}</div>
          </div>
        </Html>
      )}
    </group>
  );
};

// Movement Path Visualization
const MovementPaths: React.FC<{ paths: Array<[number, number, number][]> }> = ({ paths }) => {
  return (
    <>
      {paths.map((path, index) => (
        <Line
          key={index}
          points={path}
          color="#00ffff"
          lineWidth={2}
          dashed
          dashScale={2}
          dashSize={0.1}
          gapSize={0.1}
        />
      ))}
    </>
  );
};

// Main Warehouse Component
const Warehouse3D: React.FC<WarehouseProps> = ({
  boxes,
  rfidTags,
  selectedBox,
  onBoxClick,
  showHeatmap = false,
  showPaths = false
}) => {
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([10, 10, 10]);
  const [movementPaths] = useState<Array<[number, number, number][]>>([
    [[0, 0.5, 0], [2, 0.5, 0], [2, 0.5, 2], [4, 0.5, 2]],
    [[-2, 0.5, -2], [0, 0.5, -2], [0, 0.5, 0], [2, 0.5, 0]]
  ]);

  // Generate rack positions
  const generateRacks = () => {
    const racks = [];
    for (let x = -6; x <= 6; x += 4) {
      for (let z = -6; z <= 6; z += 4) {
        const rackBoxes = boxes.filter(box => 
          Math.abs(box.position[0] - x) < 2 && 
          Math.abs(box.position[2] - z) < 2
        );
        racks.push({ position: [x, 0, z] as [number, number, number], boxes: rackBoxes });
      }
    }
    return racks;
  };

  return (
    <div style={{ width: '100%', height: '600px', background: '#1a1a1a' }}>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={cameraPosition} />
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2.5}
          minDistance={5}
          maxDistance={30}
        />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, 0, -20]} intensity={0.5} />
        <pointLight position={[0, -10, 0]} intensity={1.5} />
        
        {/* Environment */}
        <Environment preset="warehouse" />
        
        {/* Floor */}
        <Plane 
          args={[30, 30]} 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, 0, 0]}
          receiveShadow
        >
          <meshStandardMaterial 
            color="#2a2a2a"
            roughness={0.8}
            metalness={0.2}
          />
        </Plane>
        
        {/* Grid */}
        <gridHelper args={[30, 30, '#444444', '#222222']} />
        
        {/* Warehouse Walls */}
        <Plane args={[30, 10]} position={[0, 5, -15]}>
          <meshStandardMaterial color="#333333" side={THREE.DoubleSide} />
        </Plane>
        <Plane args={[30, 10]} position={[15, 5, 0]} rotation={[0, Math.PI / 2, 0]}>
          <meshStandardMaterial color="#333333" side={THREE.DoubleSide} />
        </Plane>
        <Plane args={[30, 10]} position={[-15, 5, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <meshStandardMaterial color="#333333" side={THREE.DoubleSide} />
        </Plane>
        
        {/* Storage Racks */}
        <Suspense fallback={null}>
          {generateRacks().map((rack, index) => (
            <StorageRack
              key={index}
              position={rack.position}
              boxes={rack.boxes}
              onBoxClick={onBoxClick}
              showHeatmap={showHeatmap}
            />
          ))}
        </Suspense>
        
        {/* RFID Tags */}
        {rfidTags.map(tag => (
          <RFIDTagMarker key={tag.id} tag={tag} />
        ))}
        
        {/* Movement Paths */}
        {showPaths && <MovementPaths paths={movementPaths} />}
        
        {/* Contact Shadows */}
        <ContactShadows
          opacity={0.4}
          scale={30}
          blur={1}
          far={10}
          position={[0, 0, 0]}
        />
        
        {/* Warehouse Info */}
        <Html position={[-14, 8, -14]}>
          <div style={{
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            minWidth: '200px'
          }}>
            <h3 style={{ margin: '0 0 10px 0' }}>Warehouse Status</h3>
            <div>Total Boxes: {boxes.length}</div>
            <div>Active RFID Tags: {rfidTags.filter(t => t.status === 'active').length}</div>
            <div>Moving Items: {rfidTags.filter(t => t.status === 'moving').length}</div>
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '12px' }}>
                {showHeatmap ? '🔥 Heat Map Mode' : '📦 Occupancy Mode'}
              </div>
            </div>
          </div>
        </Html>
      </Canvas>
    </div>
  );
};

export default Warehouse3D;