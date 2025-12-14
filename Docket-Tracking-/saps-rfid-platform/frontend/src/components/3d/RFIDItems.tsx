import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useWebSocket, getWebSocketService } from '../../services/websocket';
import type { TagReadEvent, ItemMovedEvent } from '../../services/websocket';
import { useSceneStore } from '../../stores/sceneStore';
import { useAIAnalyticsStore } from '../../stores/aiAnalyticsStore';
import { useDemoSimulator, HERO_DEMO_ITEMS } from '../../hooks/useDemoSimulator';

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
  const selectedItem = useSceneStore((s) => s.selectedItem);
  const setVisibleItemCount = useSceneStore((s) => s.setVisibleItemCount);
  const updateItems = useSceneStore((s) => s.updateItems);
  const alertMode = useSceneStore((s) => s.alertMode);

  // Tenant config for terminology
  const tenantConfig = useAIAnalyticsStore((s) => s.tenantConfig);
  const itemTerm = tenantConfig?.itemTerm || 'Item';

  const itemsRef = useRef(items);

  // Keep ref in sync with state
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // CRITICAL: Initialize hero items IMMEDIATELY on mount
  // This ensures they exist when user navigates from Search page
  useEffect(() => {
    console.log('📦 RFIDItems: Initializing hero items immediately');

    setItems(prev => {
      const newItems = new Map(prev);

      for (const hero of HERO_DEMO_ITEMS) {
        if (!newItems.has(hero.epc)) {
          const position = getRandomPositionInZone(hero.zone);

          newItems.set(hero.epc, {
            id: `item-${hero.epc}`,
            epc: hero.epc,
            position: position.clone(),
            targetPosition: position,
            zone: hero.zone,
            lastSeen: Date.now(),
            rssi: -45 + Math.floor(Math.random() * 15), // Good signal
            isMoving: false,
            priority: hero.priority,
          });
        }
      }

      return newItems;
    });
  }, []); // Run once on mount

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
          isSelected={selectedItem?.epc === item.epc}
          onSelect={() => handleSelectItem(item)}
          alertMode={alertMode}
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
 * - Selection highlighting (pulsing beacon effect)
 * - Alert mode colors (amber for dwell, red for security)
 */
interface TrackedItemProps {
  item: RFIDItem;
  isSelected: boolean;
  onSelect: () => void;
  alertMode?: 'dwell' | 'security' | null;
}

const TrackedItem = ({ item, isSelected, onSelect, alertMode }: TrackedItemProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const beaconRef = useRef<THREE.Mesh>(null);
  const radarRef1 = useRef<THREE.Mesh>(null);
  const radarRef2 = useRef<THREE.Mesh>(null);
  const radarRef3 = useRef<THREE.Mesh>(null);
  const spotlightRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Get zone config for colors
  const config = ZONE_CONFIG[item.zone] || ZONE_CONFIG['entry'];

  // Alert mode colors: amber (#f59e0b) for dwell, red (#ef4444) for security
  const alertColor = alertMode === 'security' ? '#ef4444' :
                     alertMode === 'dwell' ? '#f59e0b' : null;

  // Use alert color if selected AND alert mode is active, otherwise use zone color
  const baseColor = (isSelected && alertColor) ? alertColor : config.color;

  // Size based on priority - MUCH LARGER if selected for visibility
  const baseSize = item.priority === 'critical' ? 1.0 :
                   item.priority === 'high' ? 0.8 : 0.6;
  const size = isSelected ? baseSize * 2.5 : baseSize; // 2.5x bigger when selected!

  // Alert mode affects the selection highlight color
  const highlightColor = alertMode === 'security' ? '#ff0000' :
                         alertMode === 'dwell' ? '#ffaa00' : '#00ffff';

  // Animate position and effects
  useFrame((state) => {
    if (!groupRef.current) return;

    // Smooth position interpolation
    groupRef.current.position.lerp(item.targetPosition, 0.08);

    // Copy back to item.position for consistency
    item.position.copy(groupRef.current.position);

    // Floating animation - MORE DRAMATIC if selected
    const floatAmplitude = isSelected ? 0.3 : 0.15;
    const floatSpeed = isSelected ? 3 : 2;
    const floatY = Math.sin(state.clock.elapsedTime * floatSpeed + item.epc.charCodeAt(0) * 0.1) * floatAmplitude;
    groupRef.current.position.y = item.targetPosition.y + floatY;

    // Slow rotation - FASTER if selected
    groupRef.current.rotation.y += isSelected ? 0.02 : 0.005;

    // Glow pulse - STRONGER if selected
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      const baseOpacity = isSelected ? 0.6 : hovered ? 0.4 : item.priority === 'critical' ? 0.3 : 0.15;
      const pulseIntensity = isSelected ? 0.3 : 0.1;
      mat.opacity = baseOpacity + Math.sin(state.clock.elapsedTime * 3) * pulseIntensity;
    }

    // Emissive pulse for main mesh - BRIGHTER if selected
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      const baseEmissive = isSelected ? 2.5 : hovered ? 1.5 : 0.8;
      mat.emissiveIntensity = baseEmissive + Math.sin(state.clock.elapsedTime * (isSelected ? 4 : 2)) * 0.5;
    }

    // Beacon pulse for selected items - dramatic expanding ring
    if (beaconRef.current && isSelected) {
      const pulseTime = state.clock.elapsedTime * 2;
      const scale = 1 + Math.sin(pulseTime) * 0.3 + Math.abs(Math.sin(pulseTime * 0.5)) * 0.5;
      beaconRef.current.scale.setScalar(scale);
      const mat = beaconRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.7 - Math.abs(Math.sin(pulseTime)) * 0.3;
    }

    // RADAR SWEEP - Three expanding rings at different phases
    if (isSelected) {
      const radarSpeed = 1.5;
      const maxScale = 3;

      // Ring 1 - fastest
      if (radarRef1.current) {
        const phase1 = (state.clock.elapsedTime * radarSpeed) % 1;
        radarRef1.current.scale.setScalar(1 + phase1 * maxScale);
        const mat = radarRef1.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.6 * (1 - phase1); // Fade out as it expands
      }

      // Ring 2 - offset by 0.33
      if (radarRef2.current) {
        const phase2 = (state.clock.elapsedTime * radarSpeed + 0.33) % 1;
        radarRef2.current.scale.setScalar(1 + phase2 * maxScale);
        const mat = radarRef2.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.6 * (1 - phase2);
      }

      // Ring 3 - offset by 0.66
      if (radarRef3.current) {
        const phase3 = (state.clock.elapsedTime * radarSpeed + 0.66) % 1;
        radarRef3.current.scale.setScalar(1 + phase3 * maxScale);
        const mat = radarRef3.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.6 * (1 - phase3);
      }
    }

    // SPOTLIGHT pulse - breathing effect
    if (spotlightRef.current && isSelected) {
      const breathe = 0.3 + Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
      const mat = spotlightRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = breathe;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[item.position.x, item.position.y, item.position.z]}
    >
      {/* LARGE floor marker - very visible from above */}
      {isSelected && (
        <>
          {/* Outer pulsing ring on floor */}
          <mesh ref={beaconRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[4, 6, 64]} />
            <meshBasicMaterial
              color={highlightColor}
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          {/* Inner solid circle on floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
            <circleGeometry args={[4, 64]} />
            <meshBasicMaterial
              color={highlightColor}
              transparent
              opacity={0.25}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          {/* Second ring for emphasis */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
            <ringGeometry args={[7, 8, 64]} />
            <meshBasicMaterial
              color={highlightColor}
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </>
      )}

      {/* TALL vertical beam - visible from far away */}
      {isSelected && (
        <>
          {/* Main beam - tall and bright */}
          <mesh position={[0, 20, 0]}>
            <cylinderGeometry args={[0.3, 1.5, 40, 16]} />
            <meshBasicMaterial
              color={highlightColor}
              transparent
              opacity={0.4}
              depthWrite={false}
            />
          </mesh>
          {/* Inner bright core */}
          <mesh position={[0, 20, 0]}>
            <cylinderGeometry args={[0.1, 0.5, 40, 8]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.6}
              depthWrite={false}
            />
          </mesh>
          {/* Glow around beam */}
          <mesh position={[0, 20, 0]}>
            <cylinderGeometry args={[0.8, 2.5, 40, 16]} />
            <meshBasicMaterial
              color={highlightColor}
              transparent
              opacity={0.15}
              depthWrite={false}
            />
          </mesh>
        </>
      )}

      {/* SPOTLIGHT CONE from ceiling - dramatic stage lighting */}
      {isSelected && (
        <mesh ref={spotlightRef} position={[0, 15, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[12, 30, 32, 1, true]} />
          <meshBasicMaterial
            color={highlightColor}
            transparent
            opacity={0.25}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* RADAR SWEEP RINGS - expanding sonar effect */}
      {isSelected && (
        <>
          <mesh ref={radarRef1} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
            <ringGeometry args={[2, 2.3, 64]} />
            <meshBasicMaterial
              color={highlightColor}
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh ref={radarRef2} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
            <ringGeometry args={[2, 2.3, 64]} />
            <meshBasicMaterial
              color={highlightColor}
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh ref={radarRef3} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
            <ringGeometry args={[2, 2.3, 64]} />
            <meshBasicMaterial
              color={highlightColor}
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </>
      )}

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
          color={isSelected ? highlightColor : hovered ? '#ffffff' : baseColor}
          emissive={isSelected ? highlightColor : baseColor}
          emissiveIntensity={isSelected ? 2.0 : 0.8}
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
          color={isSelected ? highlightColor : baseColor}
          transparent
          opacity={isSelected ? 0.8 : 0.6}
        />
      </mesh>

      {/* Outer glow */}
      <mesh ref={glowRef} scale={isSelected ? 2.0 : 1.6}>
        <boxGeometry args={[size, size, size]} />
        <meshBasicMaterial
          color={isSelected ? highlightColor : baseColor}
          transparent
          opacity={isSelected ? 0.3 : 0.15}
          depthWrite={false}
        />
      </mesh>

      {/* Wireframe */}
      <mesh scale={isSelected ? 1.5 : 1.2}>
        <boxGeometry args={[size, size, size]} />
        <meshBasicMaterial
          color={isSelected ? highlightColor : baseColor}
          wireframe
          transparent
          opacity={isSelected ? 0.5 : 0.3}
        />
      </mesh>

      {/* Priority ring for critical items */}
      {item.priority === 'critical' && (
        <CriticalRing color={baseColor} size={size} />
      )}

      {/* Label shown on hover OR when selected */}
      {(hovered || isSelected) && (
        <ItemLabel
          epc={item.epc}
          zone={item.zone}
          rssi={item.rssi}
          color={isSelected ? highlightColor : baseColor}
          isSelected={isSelected}
          alertMode={isSelected ? alertMode : null}
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
  color,
  isSelected,
  alertMode
}: {
  epc: string;
  zone: string;
  rssi: number;
  color: string;
  isSelected?: boolean;
  alertMode?: 'dwell' | 'security' | null;
}) => {
  // Alert mode colors and text
  const borderColor = alertMode === 'security' ? '#ff0000' :
                      alertMode === 'dwell' ? '#ffaa00' : '#00ffff';
  const bgColor = alertMode === 'security' ? '#4a0000' :
                  alertMode === 'dwell' ? '#4a3500' : '#0c4a6e';
  const statusText = alertMode === 'security' ? '🚨 SECURITY BREACH' :
                     alertMode === 'dwell' ? '⚠️ DWELL ALERT' : '● TRACKING LIVE';

  return (
    <group position={[0, isSelected ? 3.0 : 2.2, 0]}>
      {/* Background plane - larger when selected */}
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[isSelected ? 3.2 : 2.5, isSelected ? 1.4 : 1]} />
        <meshBasicMaterial
          color={isSelected ? bgColor : '#0f172a'}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Border when selected */}
      {isSelected && (
        <mesh position={[0, 0, -0.04]}>
          <planeGeometry args={[3.4, 1.6]} />
          <meshBasicMaterial
            color={borderColor}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {/* SELECTED indicator */}
      {isSelected && (
        <Text
          position={[0, 0.5, 0]}
          fontSize={0.18}
          color={borderColor}
          anchorX="center"
          anchorY="middle"
        >
          {statusText}
        </Text>
      )}

      {/* EPC ID */}
      <Text
        position={[0, isSelected ? 0.15 : 0.25, 0]}
        fontSize={isSelected ? 0.32 : 0.25}
        color={color}
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {epc.slice(-8).toUpperCase()}
      </Text>

      {/* Zone info */}
      <Text
        position={[0, isSelected ? -0.2 : -0.1, 0]}
        fontSize={0.15}
        color={isSelected ? '#7dd3fc' : '#94a3b8'}
        anchorX="center"
        anchorY="middle"
      >
        {zone.replace(/-/g, ' ').toUpperCase()}
      </Text>

      {/* RSSI */}
      <Text
        position={[0, isSelected ? -0.5 : -0.35, 0]}
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
