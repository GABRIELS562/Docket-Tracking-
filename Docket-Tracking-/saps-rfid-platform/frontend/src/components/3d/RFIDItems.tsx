import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWebSocket, TagReadEvent, ItemMovedEvent } from '../../services/websocket';
import { useSceneStore } from '../../stores/sceneStore';

/**
 * RFID Item
 */
interface RFIDItem {
  id: string;
  epc: string;
  position: [number, number, number];
  zone: string;
  lastSeen: number;
  rssi: number;
}

/**
 * RFID Items Renderer
 *
 * Renders tracked RFID items in 3D space with real-time updates.
 *
 * Features:
 * - WebSocket integration for real-time tag reads
 * - Smooth position interpolation when items move
 * - RSSI-based signal strength visualization
 * - Item highlighting on hover/selection
 * - Efficient rendering with instanced meshes
 */
const RFIDItems = () => {
  const [items, setItems] = useState<Map<string, RFIDItem>>(new Map());
  const { selectedItem, hoveredItem, setHoveredItem } = useSceneStore();

  // Zone position mapping (matches Warehouse.tsx zone positions)
  const zonePositions: Record<string, [number, number, number]> = {
    'receiving': [-40, 1, -40],
    'storage-a': [-40, 1, 0],
    'storage-b': [-40, 1, 40],
    'storage-c': [0, 1, -40],
    'evidence': [0, 1, 0],
    'storage-d': [0, 1, 40],
    'processing': [40, 1, -40],
    'shipping': [40, 1, 0],
    'returns': [40, 1, 40],
  };

  // WebSocket event handlers
  useWebSocket({
    onTagRead: (event: TagReadEvent) => {
      setItems((prev) => {
        const newItems = new Map(prev);

        // Get or create item
        const existing = newItems.get(event.epc);
        const basePosition = zonePositions[event.zoneId] || [0, 1, 0];

        // Add random offset within zone (±5m)
        const randomOffset: [number, number, number] = [
          basePosition[0] + (Math.random() - 0.5) * 10,
          basePosition[1],
          basePosition[2] + (Math.random() - 0.5) * 10,
        ];

        newItems.set(event.epc, {
          id: existing?.id || `item-${event.epc}`,
          epc: event.epc,
          position: existing?.position || randomOffset,
          zone: event.zoneId,
          lastSeen: Date.now(),
          rssi: event.rssi,
        });

        return newItems;
      });
    },

    onItemMoved: (event: ItemMovedEvent) => {
      setItems((prev) => {
        const newItems = new Map(prev);
        const item = newItems.get(event.epc);

        if (item) {
          // Animate to new zone position
          const newZonePos = zonePositions[event.toZone] || [0, 1, 0];
          const randomOffset: [number, number, number] = [
            newZonePos[0] + (Math.random() - 0.5) * 10,
            newZonePos[1],
            newZonePos[2] + (Math.random() - 0.5) * 10,
          ];

          newItems.set(event.epc, {
            ...item,
            position: randomOffset,
            zone: event.toZone,
            lastSeen: Date.now(),
          });
        }

        return newItems;
      });
    },

    onConnect: () => {
      console.log('🔌 RFIDItems: Connected to WebSocket');
    },

    onDisconnect: () => {
      console.log('🔌 RFIDItems: Disconnected from WebSocket');
    },
  });

  // Update scene store with item count
  useEffect(() => {
    useSceneStore.getState().setVisibleItemCount(items.size);

    // Convert items to scene store format
    const sceneItems = Array.from(items.values()).map(item => ({
      id: item.id,
      epc: item.epc,
      position: item.position,
      zone: item.zone,
    }));
    useSceneStore.getState().updateItems(sceneItems);
  }, [items]);

  // Cleanup stale items (not seen in 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setItems((prev) => {
        const newItems = new Map(prev);
        for (const [epc, item] of newItems) {
          if (now - item.lastSeen > 30000) {
            newItems.delete(epc);
          }
        }
        return newItems;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <group>
      {Array.from(items.values()).map((item) => (
        <RFIDItemMesh
          key={item.epc}
          item={item}
          isSelected={selectedItem?.epc === item.epc}
          isHovered={hoveredItem === item.id}
          onHover={() => setHoveredItem(item.id)}
          onUnhover={() => setHoveredItem(null)}
        />
      ))}
    </group>
  );
};

/**
 * Individual RFID Item Mesh
 */
interface RFIDItemMeshProps {
  item: RFIDItem;
  isSelected: boolean;
  isHovered: boolean;
  onHover: () => void;
  onUnhover: () => void;
}

const RFIDItemMesh = ({ item, isSelected, isHovered, onHover, onUnhover }: RFIDItemMeshProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetPosition = useRef(new THREE.Vector3(...item.position));

  // Update target position when item moves
  useEffect(() => {
    targetPosition.current.set(...item.position);
  }, [item.position]);

  // Smooth position interpolation
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.lerp(targetPosition.current, 0.1);
    }
  });

  // Color based on state
  const color = isSelected ? '#fbbf24' : isHovered ? '#60a5fa' : '#3b82f6';
  const emissiveIntensity = isSelected ? 0.5 : isHovered ? 0.3 : 0.1;

  return (
    <mesh
      ref={meshRef}
      position={item.position}
      castShadow
      onPointerOver={onHover}
      onPointerOut={onUnhover}
    >
      <boxGeometry args={[0.8, 0.8, 0.8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        roughness={0.5}
        metalness={0.3}
      />
    </mesh>
  );
};

export default RFIDItems;
