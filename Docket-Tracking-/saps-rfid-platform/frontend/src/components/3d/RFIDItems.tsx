import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useWebSocket, getWebSocketService } from '../../services/websocket';
import type { TagReadEvent, ItemMovedEvent } from '../../services/websocket';
import { useSceneStore } from '../../stores/sceneStore';
import { useAIAnalyticsStore } from '../../stores/aiAnalyticsStore';
import { useDemoSimulator } from '../../hooks/useDemoSimulator';

/**
 * RFID Item Data Structure
 */
interface RFIDItem {
  id: string;
  epc: string;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  zone: string;
  lastSeen: number;
  rssi: number;
  isMoving: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Zone configuration matching SAPS Forensic Laboratory layout
 */
const ZONE_CONFIG: Record<string, {
  position: [number, number, number];
  color: string;
  priority: RFIDItem['priority'];
}> = {
  'entry': { position: [-22.5, 1.5, -27.5], color: '#3b82f6', priority: 'high' },
  'extractions': { position: [-12.5, 1.5, -5], color: '#10b981', priority: 'high' },
  'qpcr-lab': { position: [12.5, 1.5, -5], color: '#8b5cf6', priority: 'high' },
  'pcr-lab': { position: [-30, 1.5, 15], color: '#f59e0b', priority: 'high' },
  'electrophoresis': { position: [-34, 1.5, 1.5], color: '#06b6d4', priority: 'high' },
  'genemapper': { position: [-34, 1.5, -11.5], color: '#ec4899', priority: 'high' },
  'chain-custody': { position: [22.5, 1.5, -27.5], color: '#ef4444', priority: 'critical' },
};

/**
 * Get random position within a zone
 */
const getRandomPositionInZone = (zoneId: string): THREE.Vector3 => {
  const config = ZONE_CONFIG[zoneId] || ZONE_CONFIG['entry'];
  const [x, y, z] = config.position;
  return new THREE.Vector3(
    x + (Math.random() - 0.5) * 12,
    y + Math.random() * 0.3,
    z + (Math.random() - 0.5) * 8
  );
};

/**
 * RFID Items Component - Production Stable Version
 *
 * Features:
 * - Real-time WebSocket item tracking
 * - Demo mode for presentations (auto-fallback)
 * - Smooth position interpolation
 * - Zone-based coloring
 * - Priority-based sizing
 * - Animated glow effects
 * - Click to select
 * - No Html/Billboard (crash-prone)
 */
const RFIDItems = () => {
  const [items, setItems] = useState<Map<string, RFIDItem>>(new Map());
  const [useDemoMode, setUseDemoMode] = useState(true); // Start with demo mode

  // Use individual selectors to avoid re-renders when unrelated state changes
  const selectItem = useSceneStore((s) => s.selectItem);
  const setVisibleItemCount = useSceneStore((s) => s.setVisibleItemCount);
  const updateItems = useSceneStore((s) => s.updateItems);

  // Tenant config for terminology
  const tenantConfig = useAIAnalyticsStore((s) => s.tenantConfig);
  const itemTerm = tenantConfig?.itemTerm || 'Item';

  const itemsRef = useRef(items);

  // Keep ref in sync with state
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Check WebSocket connection status periodically
  useEffect(() => {
    const checkConnection = () => {
      const ws = getWebSocketService();
      const connected = ws.isConnected();
      // Only use demo mode if WebSocket is not connected
      setUseDemoMode(!connected);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle tag read events
  const handleTagRead = useCallback((event: TagReadEvent) => {
    setItems(prev => {
      const newItems = new Map(prev);
      const existing = newItems.get(event.epc);
      const zoneId = event.zoneId || 'entry';
      const config = ZONE_CONFIG[zoneId] || ZONE_CONFIG['entry'];

      const newPosition = getRandomPositionInZone(zoneId);

      if (existing) {
        // Update existing item
        existing.targetPosition.copy(newPosition);
        existing.zone = zoneId;
        existing.lastSeen = Date.now();
        existing.rssi = event.rssi;
        existing.isMoving = existing.zone !== zoneId;
        existing.priority = config.priority;
      } else {
        // Create new item
        newItems.set(event.epc, {
          id: `item-${event.epc}`,
          epc: event.epc,
          position: newPosition.clone(),
          targetPosition: newPosition,
          zone: zoneId,
          lastSeen: Date.now(),
          rssi: event.rssi,
          isMoving: false,
          priority: config.priority,
        });
      }

      return newItems;
    });
  }, []);

  // Handle item moved events
  const handleItemMoved = useCallback((event: ItemMovedEvent) => {
    const toZone = event.toZone ?? (event.toZoneId ? String(event.toZoneId) : 'entry');
    const epc = event.epc;

    if (!epc) return;

    setItems(prev => {
      const newItems = new Map(prev);
      const existing = newItems.get(epc);

      if (existing) {
        const config = ZONE_CONFIG[toZone] || ZONE_CONFIG['entry'];
        const newPosition = getRandomPositionInZone(toZone);

        existing.targetPosition.copy(newPosition);
        existing.zone = toZone;
        existing.lastSeen = Date.now();
        existing.isMoving = true;
        existing.priority = config.priority;
      }

      return newItems;
    });
  }, []);

  // WebSocket connection (when backend is available)
  useWebSocket({
    onTagRead: handleTagRead,
    onItemMoved: handleItemMoved,
    onConnect: () => {
      console.log('📦 RFIDItems: WebSocket connected');
      setUseDemoMode(false);
    },
    onDisconnect: () => {
      console.log('📦 RFIDItems: WebSocket disconnected');
      setUseDemoMode(true);
    },
  });

  // Demo simulator (when WebSocket is not available)
  useDemoSimulator({
    onTagRead: handleTagRead,
    onItemMoved: handleItemMoved,
    onConnect: () => console.log('📦 RFIDItems: Demo mode active'),
    onDisconnect: () => console.log('📦 RFIDItems: Demo mode stopped'),
  }, {
    enabled: useDemoMode,
    itemCount: 250,
    readIntervalMs: 1800,
    movementProbability: 0.15,
    itemsPerCycle: 12,
  });

  // Update scene store with item data
  useEffect(() => {
    setVisibleItemCount(items.size);

    const sceneItems = Array.from(items.values()).map(item => ({
      id: item.id,
      epc: item.epc,
      position: [item.position.x, item.position.y, item.position.z] as [number, number, number],
      zone: item.zone,
      isMoving: item.isMoving,
    }));
    updateItems(sceneItems);
  }, [items, setVisibleItemCount, updateItems]);

  // Cleanup stale items (not seen in 60 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setItems(prev => {
        const newItems = new Map(prev);
        let changed = false;

        for (const [epc, item] of newItems) {
          if (now - item.lastSeen > 60000) {
            newItems.delete(epc);
            changed = true;
          }
        }

        return changed ? newItems : prev;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Convert Map to array for rendering, sorted by priority
  const itemsArray = useMemo(() => {
    const arr = Array.from(items.values());
    const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    return arr.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [items]);

  // Handle item selection
  const handleSelectItem = useCallback((item: RFIDItem) => {
    selectItem({
      id: item.id,
      epc: item.epc,
      name: `${itemTerm} ${item.epc.slice(-6).toUpperCase()}`,
      zone: item.zone,
      position: [item.position.x, item.position.y, item.position.z],
    });
  }, [selectItem, itemTerm]);

  return (
    <group>
      {itemsArray.map(item => (
        <TrackedItem
          key={item.epc}
          item={item}
          onSelect={() => handleSelectItem(item)}
        />
      ))}
    </group>
  );
};

/**
 * Individual Tracked Item Component
 *
 * Renders a single RFID-tracked item with:
 * - Smooth position interpolation
 * - Floating animation
 * - Glow effect based on priority
 * - Click interaction
 */
interface TrackedItemProps {
  item: RFIDItem;
  onSelect: () => void;
}

const TrackedItem = ({ item, onSelect }: TrackedItemProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Get zone config for colors
  const config = ZONE_CONFIG[item.zone] || ZONE_CONFIG['entry'];
  const baseColor = config.color;

  // Size based on priority
  const size = item.priority === 'critical' ? 1.0 :
               item.priority === 'high' ? 0.8 : 0.6;

  // Animate position and effects
  useFrame((state) => {
    if (!groupRef.current) return;

    // Smooth position interpolation
    groupRef.current.position.lerp(item.targetPosition, 0.08);

    // Copy back to item.position for consistency
    item.position.copy(groupRef.current.position);

    // Floating animation
    const floatY = Math.sin(state.clock.elapsedTime * 2 + item.epc.charCodeAt(0) * 0.1) * 0.15;
    groupRef.current.position.y = item.targetPosition.y + floatY;

    // Slow rotation
    groupRef.current.rotation.y += 0.005;

    // Glow pulse
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      const baseOpacity = hovered ? 0.4 : item.priority === 'critical' ? 0.3 : 0.15;
      mat.opacity = baseOpacity + Math.sin(state.clock.elapsedTime * 3) * 0.1;
    }

    // Emissive pulse for main mesh
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = hovered ? 1.5 : 0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[item.position.x, item.position.y, item.position.z]}
    >
      {/* Main box */}
      <mesh
        ref={meshRef}
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
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
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial
          color={hovered ? '#ffffff' : baseColor}
          emissive={baseColor}
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Inner glow */}
      <mesh scale={0.7}>
        <boxGeometry args={[size, size, size]} />
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Outer glow */}
      <mesh ref={glowRef} scale={1.6}>
        <boxGeometry args={[size, size, size]} />
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </mesh>

      {/* Wireframe */}
      <mesh scale={1.2}>
        <boxGeometry args={[size, size, size]} />
        <meshBasicMaterial
          color={baseColor}
          wireframe
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Priority ring for critical items */}
      {item.priority === 'critical' && (
        <CriticalRing color={baseColor} size={size} />
      )}

      {/* Label shown on hover */}
      {hovered && (
        <ItemLabel
          epc={item.epc}
          zone={item.zone}
          rssi={item.rssi}
          color={baseColor}
        />
      )}

      {/* RSSI indicator */}
      <RSSIIndicator rssi={item.rssi} color={baseColor} />
    </group>
  );
};

/**
 * Critical item rotating ring
 */
const CriticalRing = ({ color, size }: { color: string; size: number }) => {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 2;
    }
  });

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -size * 0.6, 0]}>
      <ringGeometry args={[size * 1.2, size * 1.5, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.4}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

/**
 * RSSI Signal strength bars
 */
const RSSIIndicator = ({ rssi, color }: { rssi: number; color: string }) => {
  // Normalize RSSI (-100 to -30 dBm typical range)
  const strength = Math.max(0, Math.min(1, (rssi + 100) / 70));
  const bars = Math.ceil(strength * 4);

  return (
    <group position={[0, 1.2, 0]}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[(i - 1.5) * 0.12, 0, 0]}>
          <boxGeometry args={[0.08, 0.08 + i * 0.08, 0.04]} />
          <meshBasicMaterial
            color={i < bars ? color : '#374151'}
            transparent
            opacity={i < bars ? 0.9 : 0.3}
          />
        </mesh>
      ))}
    </group>
  );
};

/**
 * Item label using drei Text (stable, no Html)
 */
const ItemLabel = ({
  epc,
  zone,
  rssi,
  color
}: {
  epc: string;
  zone: string;
  rssi: number;
  color: string;
}) => {
  return (
    <group position={[0, 2.2, 0]}>
      {/* Background plane */}
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[2.5, 1]} />
        <meshBasicMaterial
          color="#0f172a"
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* EPC ID */}
      <Text
        position={[0, 0.25, 0]}
        fontSize={0.25}
        color={color}
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {epc.slice(-8).toUpperCase()}
      </Text>

      {/* Zone info */}
      <Text
        position={[0, -0.1, 0]}
        fontSize={0.15}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        {zone.replace(/-/g, ' ').toUpperCase()}
      </Text>

      {/* RSSI */}
      <Text
        position={[0, -0.35, 0]}
        fontSize={0.12}
        color="#64748b"
        anchorX="center"
        anchorY="middle"
      >
        {`${rssi} dBm`}
      </Text>
    </group>
  );
};

export default RFIDItems;
