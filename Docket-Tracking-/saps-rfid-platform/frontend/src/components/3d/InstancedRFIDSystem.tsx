import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useVirtualizedAppStore } from '../../stores/virtualizedAppStore';
import type { VirtualizedItem } from '../../stores/virtualizedAppStore';
import { useLODItems, usePerformanceMonitor } from '../../hooks/useVirtualizedData';

/**
 * Instanced RFID System (Phase 3.2)
 *
 * High-performance 3D visualization using GPU instancing:
 * - Single draw call for thousands of items
 * - Spatial indexing with Octree for efficient culling
 * - Level of Detail (LOD) system
 * - Frustum culling
 * - Object pooling
 *
 * Performance targets:
 * - 60 FPS with 500+ visible objects
 * - <1GB memory usage
 * - Smooth camera transitions
 *
 * Reference: StartHere.md Phase 3.2
 * Source: https://discourse.threejs.org/t/instancedmesh2-easy-handling-and-frustum-culling/58622
 */

// ============================================================================
// Types
// ============================================================================

interface InstanceData {
  id: string;
  position: THREE.Vector3;
  scale: THREE.Vector3;
  color: THREE.Color;
  opacity: number;
  isTracked: boolean;
  lodLevel: VirtualizedItem['lodLevel'];
}

interface OctreeNode {
  bounds: THREE.Box3;
  items: InstanceData[];
  children: OctreeNode[] | null;
  depth: number;
}

// ============================================================================
// Constants
// ============================================================================

const ZONE_COLORS: Record<string, string> = {
  'receiving': '#3b82f6',
  'storage-a': '#10b981',
  'storage-b': '#10b981',
  'storage-c': '#10b981',
  'secure-storage': '#ef4444',
  'storage-d': '#10b981',
  'processing': '#f59e0b',
  'shipping': '#8b5cf6',
  'returns': '#ec4899',
};

const LOD_SCALES = {
  detailed: 1.0,
  individual: 0.8,
  cluster: 0.5,
  aggregate: 0.3,
};

const MAX_INSTANCES = 2000;
const OCTREE_MAX_DEPTH = 5;
const OCTREE_MAX_ITEMS_PER_NODE = 50;

// ============================================================================
// Octree Implementation
// ============================================================================

class Octree {
  root: OctreeNode;
  private tempBox = new THREE.Box3();
  private tempVec = new THREE.Vector3();

  constructor(bounds: THREE.Box3) {
    this.root = {
      bounds: bounds.clone(),
      items: [],
      children: null,
      depth: 0,
    };
  }

  /**
   * Insert an item into the octree
   */
  insert(item: InstanceData): void {
    this.insertNode(this.root, item);
  }

  private insertNode(node: OctreeNode, item: InstanceData): void {
    // If this node has children, insert into appropriate child
    if (node.children) {
      for (const child of node.children) {
        if (child.bounds.containsPoint(item.position)) {
          this.insertNode(child, item);
          return;
        }
      }
      // If no child contains the point, add to this node
      node.items.push(item);
      return;
    }

    // Add to this node
    node.items.push(item);

    // Check if we need to subdivide
    if (
      node.items.length > OCTREE_MAX_ITEMS_PER_NODE &&
      node.depth < OCTREE_MAX_DEPTH
    ) {
      this.subdivide(node);
    }
  }

  private subdivide(node: OctreeNode): void {
    const { min, max } = node.bounds;
    const center = new THREE.Vector3()
      .addVectors(min, max)
      .multiplyScalar(0.5);

    node.children = [];

    // Create 8 children
    for (let x = 0; x < 2; x++) {
      for (let y = 0; y < 2; y++) {
        for (let z = 0; z < 2; z++) {
          const childMin = new THREE.Vector3(
            x === 0 ? min.x : center.x,
            y === 0 ? min.y : center.y,
            z === 0 ? min.z : center.z
          );
          const childMax = new THREE.Vector3(
            x === 0 ? center.x : max.x,
            y === 0 ? center.y : max.y,
            z === 0 ? center.z : max.z
          );

          node.children.push({
            bounds: new THREE.Box3(childMin, childMax),
            items: [],
            children: null,
            depth: node.depth + 1,
          });
        }
      }
    }

    // Redistribute items to children
    const itemsToRedistribute = node.items;
    node.items = [];

    for (const item of itemsToRedistribute) {
      let inserted = false;
      for (const child of node.children) {
        if (child.bounds.containsPoint(item.position)) {
          this.insertNode(child, item);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        node.items.push(item);
      }
    }
  }

  /**
   * Query items within a frustum
   */
  queryFrustum(frustum: THREE.Frustum): InstanceData[] {
    const results: InstanceData[] = [];
    this.queryFrustumNode(this.root, frustum, results);
    return results;
  }

  private queryFrustumNode(
    node: OctreeNode,
    frustum: THREE.Frustum,
    results: InstanceData[]
  ): void {
    // Check if this node intersects the frustum
    if (!frustum.intersectsBox(node.bounds)) {
      return;
    }

    // Add items from this node
    for (const item of node.items) {
      // More precise check for individual items
      this.tempBox.setFromCenterAndSize(item.position, item.scale);
      if (frustum.intersectsBox(this.tempBox)) {
        results.push(item);
      }
    }

    // Recurse into children
    if (node.children) {
      for (const child of node.children) {
        this.queryFrustumNode(child, frustum, results);
      }
    }
  }

  /**
   * Query items within a sphere (for distance-based LOD)
   */
  querySphere(center: THREE.Vector3, radius: number): InstanceData[] {
    const results: InstanceData[] = [];
    this.querySphereNode(this.root, center, radius, results);
    return results;
  }

  private querySphereNode(
    node: OctreeNode,
    center: THREE.Vector3,
    radius: number,
    results: InstanceData[]
  ): void {
    // Check if sphere intersects this node's bounds
    const closestPoint = this.tempVec.copy(center).clamp(node.bounds.min, node.bounds.max);
    const distSq = center.distanceToSquared(closestPoint);

    if (distSq > radius * radius) {
      return;
    }

    // Add items from this node within radius
    for (const item of node.items) {
      if (center.distanceToSquared(item.position) <= radius * radius) {
        results.push(item);
      }
    }

    // Recurse into children
    if (node.children) {
      for (const child of node.children) {
        this.querySphereNode(child, center, radius, results);
      }
    }
  }

  /**
   * Clear the octree
   */
  clear(): void {
    this.clearNode(this.root);
  }

  private clearNode(node: OctreeNode): void {
    node.items = [];
    if (node.children) {
      for (const child of node.children) {
        this.clearNode(child);
      }
      node.children = null;
    }
  }
}

// ============================================================================
// Main Component
// ============================================================================

const InstancedRFIDSystem = () => {
  const { camera } = useThree();
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const octreeRef = useRef<Octree | null>(null);
  const frustumRef = useRef(new THREE.Frustum());
  const projScreenMatrix = useRef(new THREE.Matrix4());

  // State from stores - use useShallow to prevent new array reference on every render
  const visibleItems = useVirtualizedAppStore(
    useShallow((s) => Array.from(s.visibleItems.values()))
  );
  const trackedItems = useVirtualizedAppStore(
    useShallow((s) => Array.from(s.trackedItems.values()))
  );

  // LOD data
  const { grouped: lodGroups, counts: lodCounts } = useLODItems();

  // Performance monitoring
  const { updatePerformance } = usePerformanceMonitor();

  // Initialize octree
  useEffect(() => {
    const bounds = new THREE.Box3(
      new THREE.Vector3(-60, -5, -60),
      new THREE.Vector3(60, 20, 60)
    );
    octreeRef.current = new Octree(bounds);
  }, []);

  // Convert items to instance data
  const instanceData = useMemo((): InstanceData[] => {
    const data: InstanceData[] = [];

    const processItem = (item: VirtualizedItem) => {
      const zoneColor = ZONE_COLORS[item.zoneId] || '#60a5fa';
      const scale = LOD_SCALES[item.lodLevel];
      const isTracked = trackedItems.some((t) => t.id === item.id);

      data.push({
        id: item.id,
        position: new THREE.Vector3(...item.position),
        scale: new THREE.Vector3(scale, scale, scale),
        color: new THREE.Color(isTracked ? '#fbbf24' : zoneColor),
        opacity: item.lodLevel === 'aggregate' ? 0.5 : 1.0,
        isTracked,
        lodLevel: item.lodLevel,
      });
    };

    // Process all visible items
    visibleItems.forEach(processItem);

    return data.slice(0, MAX_INSTANCES);
  }, [visibleItems, trackedItems]);

  // Update octree when instance data changes
  useEffect(() => {
    if (!octreeRef.current) return;

    octreeRef.current.clear();
    instanceData.forEach((item) => {
      octreeRef.current!.insert(item);
    });
  }, [instanceData]);

  // Temp objects for matrix calculations
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempPosition = useMemo(() => new THREE.Vector3(), []);
  const tempQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const tempScale = useMemo(() => new THREE.Vector3(), []);

  // Update instance matrices and colors
  useFrame((state) => {
    if (!instancedMeshRef.current || !octreeRef.current) return;

    const mesh = instancedMeshRef.current;
    const time = state.clock.elapsedTime;

    // Update frustum for culling
    projScreenMatrix.current.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustumRef.current.setFromProjectionMatrix(projScreenMatrix.current);

    // Query octree for visible items
    const visibleInFrustum = octreeRef.current.queryFrustum(frustumRef.current);

    // Update performance metrics
    updatePerformance({ visibleItemCount: visibleInFrustum.length });

    // Update instance matrices
    visibleInFrustum.forEach((item, index) => {
      if (index >= MAX_INSTANCES) return;

      // Floating animation
      const floatOffset = Math.sin(time * 2 + index * 0.1) * 0.1;

      // Rotation animation
      const rotation = time * 0.3 + index * 0.01;

      tempPosition.copy(item.position);
      tempPosition.y += floatOffset;

      tempQuaternion.setFromEuler(new THREE.Euler(0, rotation, 0));
      tempScale.copy(item.scale);

      // Pulse effect for tracked items
      if (item.isTracked) {
        const pulse = 1 + Math.sin(time * 4) * 0.1;
        tempScale.multiplyScalar(pulse);
      }

      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      mesh.setMatrixAt(index, tempMatrix);

      // Update color
      mesh.setColorAt(index, item.color);
    });

    // Hide unused instances
    for (let i = visibleInFrustum.length; i < MAX_INSTANCES; i++) {
      tempScale.set(0, 0, 0);
      tempMatrix.compose(tempPosition.set(0, -1000, 0), tempQuaternion, tempScale);
      mesh.setMatrixAt(i, tempMatrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }

    mesh.count = Math.min(visibleInFrustum.length, MAX_INSTANCES);
  });

  return (
    <group>
      {/* Main instanced mesh */}
      <instancedMesh
        ref={instancedMeshRef}
        args={[undefined, undefined, MAX_INSTANCES]}
        frustumCulled={false} // We do our own culling
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial
          vertexColors
          roughness={0.3}
          metalness={0.7}
          transparent
          opacity={0.9}
          emissive="#ffffff"
          emissiveIntensity={0.2}
        />
      </instancedMesh>

      {/* Glow layer for instanced items */}
      <instancedMesh
        args={[undefined, undefined, MAX_INSTANCES]}
        frustumCulled={false}
      >
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </instancedMesh>

      {/* Detailed items (close to camera) */}
      <DetailedItems items={lodGroups.detailed} />

      {/* LOD Stats Display */}
      <LODStatsDisplay counts={lodCounts} />
    </group>
  );
};

// ============================================================================
// Detailed Items Component (for close-up items with extra detail)
// ============================================================================

interface DetailedItemsProps {
  items: VirtualizedItem[];
}

const DetailedItems = ({ items }: DetailedItemsProps) => {
  const selectedItem = useVirtualizedAppStore((s) => s.search.results[0]);
  const trackedItems = useVirtualizedAppStore(
    useShallow((s) => Array.from(s.trackedItems.keys()))
  );

  // Only render extra details for first 10 closest items
  const detailedItems = items.slice(0, 10);

  return (
    <group>
      {detailedItems.map((item) => {
        const isTracked = trackedItems.includes(item.id);
        const isSelected = selectedItem?.id === item.id;
        const zoneColor = ZONE_COLORS[item.zoneId] || '#60a5fa';

        return (
          <group key={item.id} position={item.position}>
            {/* Wireframe overlay */}
            <mesh scale={1.1}>
              <boxGeometry args={[0.8, 0.8, 0.8]} />
              <meshBasicMaterial
                color={zoneColor}
                wireframe
                transparent
                opacity={0.4}
              />
            </mesh>

            {/* Selection ring for tracked items */}
            {isTracked && (
              <SelectionRing color="#fbbf24" />
            )}

            {/* Info label */}
            {(isTracked || isSelected) && (
              <Billboard position={[0, 1.5, 0]}>
                <Text
                  fontSize={0.4}
                  color="#ffffff"
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.03}
                  outlineColor="#000000"
                >
                  {item.epc.slice(-6).toUpperCase()}
                </Text>
              </Billboard>
            )}
          </group>
        );
      })}
    </group>
  );
};

// ============================================================================
// Selection Ring Component
// ============================================================================

const SelectionRing = ({ color }: { color: string }) => {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 2;
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.1;
      ringRef.current.scale.setScalar(scale);
    }
  });

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <ringGeometry args={[1, 1.2, 6]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// ============================================================================
// LOD Stats Display (Development)
// ============================================================================

interface LODStatsDisplayProps {
  counts: {
    detailed: number;
    individual: number;
    cluster: number;
    aggregate: number;
  };
}

const LODStatsDisplay = ({ counts }: LODStatsDisplayProps) => {
  // Only show in development
  if (import.meta.env.PROD) return null;

  const total = counts.detailed + counts.individual + counts.cluster + counts.aggregate;

  return (
    <Billboard position={[-45, 12, -45]}>
      <group>
        <mesh>
          <planeGeometry args={[6, 3]} />
          <meshBasicMaterial color="#0f172a" transparent opacity={0.8} />
        </mesh>

        <Text
          position={[0, 1, 0.01]}
          fontSize={0.35}
          color="#22d3ee"
          anchorX="center"
          anchorY="middle"
        >
          LOD Distribution
        </Text>

        <Text
          position={[-2, 0.3, 0.01]}
          fontSize={0.25}
          color="#22c55e"
          anchorX="left"
          anchorY="middle"
        >
          {`Detailed: ${counts.detailed}`}
        </Text>

        <Text
          position={[-2, -0.1, 0.01]}
          fontSize={0.25}
          color="#3b82f6"
          anchorX="left"
          anchorY="middle"
        >
          {`Individual: ${counts.individual}`}
        </Text>

        <Text
          position={[-2, -0.5, 0.01]}
          fontSize={0.25}
          color="#f59e0b"
          anchorX="left"
          anchorY="middle"
        >
          {`Cluster: ${counts.cluster}`}
        </Text>

        <Text
          position={[-2, -0.9, 0.01]}
          fontSize={0.25}
          color="#6b7280"
          anchorX="left"
          anchorY="middle"
        >
          {`Aggregate: ${counts.aggregate}`}
        </Text>

        <Text
          position={[0, -1.2, 0.01]}
          fontSize={0.3}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {`Total: ${total}`}
        </Text>
      </group>
    </Billboard>
  );
};

export default InstancedRFIDSystem;
