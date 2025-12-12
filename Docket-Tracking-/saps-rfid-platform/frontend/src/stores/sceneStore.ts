import { create } from 'zustand';

/**
 * Camera Preset Definition
 */
export interface CameraPreset {
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
}

/**
 * Predefined camera presets for U-shaped warehouse layout
 * Warehouse: 90m x 70m, ceiling at 10m
 * X: -45 to 45, Z: -35 to 35
 */
export const CAMERA_PRESETS: Record<string, CameraPreset> = {
  overview: {
    name: 'Overview',
    position: [70, 55, 50],
    target: [0, 0, 0],
    fov: 50,
  },
  topDown: {
    name: 'Top Down',
    // True bird's eye view - positioned above the warehouse looking straight down
    // Ceiling is hidden in this view so we can see the entire warehouse interior
    position: [0, 80, 0.1],
    target: [0, 0, 0],
    fov: 60,
  },
  docks: {
    name: 'Loading Docks',
    position: [0, 25, -65],
    target: [0, 5, -30],
    fov: 50,
  },
  receiving: {
    name: 'Receiving',
    position: [-40, 20, -50],
    target: [-20, 0, -25],
    fov: 45,
  },
  shipping: {
    name: 'Shipping',
    position: [40, 20, -50],
    target: [20, 0, -25],
    fov: 45,
  },
  storage: {
    name: 'Storage Area',
    position: [50, 35, 15],
    target: [0, 0, 0],
    fov: 50,
  },
  secureEvidence: {
    name: 'Secure Vault',
    // Dramatic angle showing the security cage from outside looking in
    // Lower angle emphasizes the secure perimeter and corner posts
    position: [-52, 8, 38],
    target: [-35, 2, 25],
    fov: 38,
  },
  processing: {
    name: 'Processing',
    position: [-55, 20, 20],
    target: [-35, 0, 15],
    fov: 45,
  },
  cinematic: {
    name: 'Cinematic',
    // Low sweeping angle that emphasizes warehouse scale
    // Golden hour style dramatic perspective
    position: [65, 12, -45],
    target: [-10, 3, 10],
    fov: 32,
  },
  isometric: {
    name: 'Isometric',
    position: [60, 60, 50],
    target: [0, 0, 0],
    fov: 45,
  },
  // Additional dramatic presets
  vaultSecurity: {
    name: 'Vault Security',
    // Inside-looking-out view of the secure storage cage
    position: [-35, 3, 25],
    target: [-20, 2, 10],
    fov: 55,
  },
  heroShot: {
    name: 'Hero Shot',
    // Low angle dramatic warehouse entrance view
    position: [0, 6, -55],
    target: [0, 5, 0],
    fov: 40,
  },
  surveillance: {
    name: 'Surveillance',
    // High corner security camera angle
    position: [-42, 9, -32],
    target: [10, 0, 5],
    fov: 70,
  },
  walkMode: {
    name: 'Walk Mode',
    // First-person walk through at eye level (1.7m)
    // Use WASD/Arrow keys to navigate, mouse to look around
    position: [0, 1.7, -30],
    target: [0, 1.7, 0],
    fov: 75,
  },
};

/**
 * 3D Scene Camera Position
 */
interface CameraPosition {
  x: number;
  y: number;
  z: number;
}

/**
 * Selected Item in 3D Scene
 */
interface SelectedItem {
  id: string;
  epc: string;
  name: string;
  zone: string;
  position: [number, number, number];
}

/**
 * Zone statistics for heatmap
 */
interface ZoneStats {
  zoneId: string;
  itemCount: number;
  capacity: number;
  utilizationPercent: number;
  avgDwellTime: number;
}

/**
 * Path data for visualization
 */
interface PathSegment {
  from: { x: number; y: number };
  to: { x: number; y: number };
  zoneId?: string;
  zoneName?: string;
  distance: number;
  estimatedTimeSeconds: number;
}

interface ActivePath {
  segments: PathSegment[];
  totalDistance: number;
  totalTimeSeconds: number;
  zonesTraversed: string[];
  smoothPath: Array<{ x: number; y: number }>;
  isOptimal: boolean;
}

/**
 * Camera mode type
 */
export type CameraMode = 'orbit' | 'walk';

/**
 * 3D Scene State
 */
interface SceneState {
  // Camera
  cameraPosition: CameraPosition;
  cameraTarget: CameraPosition;
  isAnimatingCamera: boolean;
  currentPreset: string;
  cameraMode: CameraMode;

  // Selected item
  selectedItem: SelectedItem | null;
  hoveredItem: string | null;
  hoveredZone: string | null;

  // Visualization settings
  showGrid: boolean;
  showLabels: boolean;
  showPaths: boolean;
  showHeatmap: boolean;
  showReaders: boolean;
  renderQuality: 'low' | 'medium' | 'high';

  // Performance
  visibleItemCount: number;
  maxVisibleItems: number;
  fps: number;

  // Items in scene
  items: Array<{
    id: string;
    epc: string;
    position: [number, number, number];
    zone: string;
    isMoving?: boolean;
  }>;

  // Zone statistics
  zoneStats: ZoneStats[];

  // Active pathfinding route
  activePath: ActivePath | null;

  // Actions
  setCameraPosition: (position: CameraPosition) => void;
  setCameraTarget: (target: CameraPosition) => void;
  setIsAnimatingCamera: (isAnimating: boolean) => void;
  goToPreset: (presetName: string) => void;
  flyToItem: (item: SelectedItem) => void;
  flyToZone: (zoneId: string) => void;
  selectItem: (item: SelectedItem | null) => void;
  setHoveredItem: (itemId: string | null) => void;
  setHoveredZone: (zoneId: string | null) => void;
  toggleGrid: () => void;
  toggleLabels: () => void;
  togglePaths: () => void;
  toggleHeatmap: () => void;
  toggleReaders: () => void;
  setRenderQuality: (quality: SceneState['renderQuality']) => void;
  setVisibleItemCount: (count: number) => void;
  setFps: (fps: number) => void;
  updateItems: (items: SceneState['items']) => void;
  updateZoneStats: (stats: ZoneStats[]) => void;
  resetCamera: () => void;
  setActivePath: (path: ActivePath | null) => void;
  clearActivePath: () => void;
  calculatePathToItem: (targetZone: string) => void;
  setCameraMode: (mode: CameraMode) => void;
  toggleWalkMode: () => void;
}

/**
 * Zone positions for flyToZone - SAPS Forensic Lab layout
 */
const ZONE_POSITIONS: Record<string, { position: [number, number, number]; target: [number, number, number] }> = {
  'entry': { position: [-30, 15, -35], target: [-22.5, 0, -27.5] },
  'extractions': { position: [-20, 15, -15], target: [-12.5, 0, -5] },
  'qpcr-lab': { position: [20, 15, -15], target: [12.5, 0, -5] },
  'pcr-lab': { position: [-38, 15, 25], target: [-30, 0, 15] },
  'electrophoresis': { position: [-42, 15, 10], target: [-34, 0, 1.5] },
  'genemapper': { position: [-42, 15, -20], target: [-34, 0, -11.5] },
  'chain-custody': { position: [30, 15, -35], target: [22.5, 0, -27.5] },
};

/**
 * Scene Store
 *
 * Manages 3D scene state including camera position, selected items,
 * visualization settings, and performance metrics.
 */
export const useSceneStore = create<SceneState>((set, _get) => ({
  // Initial state - angled view of the warehouse
  cameraPosition: { x: 70, y: 55, z: 50 },
  cameraTarget: { x: 0, y: 0, z: 0 },
  isAnimatingCamera: false,
  currentPreset: 'overview',
  cameraMode: 'orbit',

  selectedItem: null,
  hoveredItem: null,
  hoveredZone: null,

  showGrid: true,
  showLabels: true,
  showPaths: false,
  showHeatmap: false,
  showReaders: true,
  renderQuality: 'high',

  visibleItemCount: 0,
  maxVisibleItems: 500,
  fps: 60,

  items: [],
  zoneStats: [],
  activePath: null,

  // Actions
  setCameraPosition: (position) => set({ cameraPosition: position }),

  setCameraTarget: (target) => set({ cameraTarget: target }),

  setIsAnimatingCamera: (isAnimating) => set({ isAnimatingCamera: isAnimating }),

  goToPreset: (presetName) => {
    const preset = CAMERA_PRESETS[presetName];
    if (!preset) return;

    set({
      cameraPosition: { x: preset.position[0], y: preset.position[1], z: preset.position[2] },
      cameraTarget: { x: preset.target[0], y: preset.target[1], z: preset.target[2] },
      isAnimatingCamera: true,
      currentPreset: presetName,
    });
  },

  flyToItem: (item) => {
    const [x, y, z] = item.position;
    const offset = 12;

    set({
      isAnimatingCamera: true,
      selectedItem: item,
      cameraTarget: { x, y, z },
      cameraPosition: { x: x + offset, y: y + offset + 5, z: z + offset },
    });

    // Reset animation flag after animation completes
    setTimeout(() => {
      set({ isAnimatingCamera: false });
    }, 1500);
  },

  flyToZone: (zoneId) => {
    const zonePos = ZONE_POSITIONS[zoneId];
    if (!zonePos) return;

    set({
      isAnimatingCamera: true,
      cameraPosition: { x: zonePos.position[0], y: zonePos.position[1], z: zonePos.position[2] },
      cameraTarget: { x: zonePos.target[0], y: zonePos.target[1], z: zonePos.target[2] },
    });

    setTimeout(() => {
      set({ isAnimatingCamera: false });
    }, 1500);
  },

  selectItem: (item) => set({ selectedItem: item }),

  setHoveredItem: (itemId) => set({ hoveredItem: itemId }),

  setHoveredZone: (zoneId) => set({ hoveredZone: zoneId }),

  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

  toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),

  togglePaths: () => set((state) => ({ showPaths: !state.showPaths })),

  toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),

  toggleReaders: () => set((state) => ({ showReaders: !state.showReaders })),

  setRenderQuality: (quality) => {
    const maxItemsByQuality = {
      low: 200,
      medium: 350,
      high: 500,
    };

    set({
      renderQuality: quality,
      maxVisibleItems: maxItemsByQuality[quality],
    });
  },

  setVisibleItemCount: (count) => set({ visibleItemCount: count }),

  setFps: (fps) => set({ fps }),

  updateItems: (items) => set({ items }),

  updateZoneStats: (stats) => set({ zoneStats: stats }),

  resetCamera: () =>
    set({
      cameraPosition: { x: 70, y: 55, z: 50 },
      cameraTarget: { x: 0, y: 0, z: 0 },
      isAnimatingCamera: true,
      currentPreset: 'overview',
      selectedItem: null,
      hoveredItem: null,
      activePath: null,
    }),

  setActivePath: (path) => set({ activePath: path }),

  clearActivePath: () => set({ activePath: null }),

  calculatePathToItem: (targetZone) => {
    // SAPS Forensic Lab zone centers
    // Coordinates are in 0-100 range, transformed by -50 in PathfindingVisualization
    // Formula: x = warehouseX + 50, y = warehouseZ + 50
    const zoneCenters: Record<string, { x: number; y: number }> = {
      'entry': { x: 27.5, y: 22.5 },           // warehouse: x=-22.5, z=-27.5
      'extractions': { x: 37.5, y: 45 },       // warehouse: x=-12.5, z=-5
      'qpcr-lab': { x: 62.5, y: 45 },          // warehouse: x=12.5, z=-5
      'pcr-lab': { x: 20, y: 65 },             // warehouse: x=-30, z=15
      'electrophoresis': { x: 16, y: 51.5 },   // warehouse: x=-34, z=1.5
      'genemapper': { x: 16, y: 38.5 },        // warehouse: x=-34, z=-11.5
      'chain-custody': { x: 72.5, y: 22.5 },   // warehouse: x=22.5, z=-27.5
    };

    // SAPS Forensic Lab zone connections (following lab workflow)
    const zoneConnections: Record<string, string[]> = {
      'entry': ['extractions', 'chain-custody'],
      'extractions': ['entry', 'qpcr-lab', 'electrophoresis'],
      'qpcr-lab': ['extractions', 'pcr-lab', 'chain-custody'],
      'pcr-lab': ['qpcr-lab', 'electrophoresis'],
      'electrophoresis': ['extractions', 'pcr-lab', 'genemapper'],
      'genemapper': ['electrophoresis', 'chain-custody'],
      'chain-custody': ['entry', 'qpcr-lab', 'genemapper'],
    };

    // BFS to find shortest path from entrance (entry) to target
    const startZone = 'entry';
    if (!zoneCenters[targetZone]) {
      set({ activePath: null });
      return;
    }

    // BFS
    const queue: string[][] = [[startZone]];
    const visited = new Set<string>([startZone]);

    let pathZones: string[] = [];

    while (queue.length > 0) {
      const path = queue.shift()!;
      const current = path[path.length - 1];

      if (current === targetZone) {
        pathZones = path;
        break;
      }

      const neighbors = zoneConnections[current] || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }

    if (pathZones.length === 0) {
      set({ activePath: null });
      return;
    }

    // Build path segments
    const segments: PathSegment[] = [];
    const smoothPath: Array<{ x: number; y: number }> = [];
    let totalDistance = 0;

    for (let i = 0; i < pathZones.length; i++) {
      const zone = pathZones[i];
      const center = zoneCenters[zone];
      smoothPath.push(center);

      if (i > 0) {
        const prevZone = pathZones[i - 1];
        const prevCenter = zoneCenters[prevZone];
        const distance = Math.sqrt(
          Math.pow(center.x - prevCenter.x, 2) + Math.pow(center.y - prevCenter.y, 2)
        );
        totalDistance += distance;

        segments.push({
          from: prevCenter,
          to: center,
          zoneId: zone,
          zoneName: zone.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          distance,
          estimatedTimeSeconds: distance * 0.5, // ~2m/s walking speed
        });
      }
    }

    const activePath: ActivePath = {
      segments,
      totalDistance,
      totalTimeSeconds: totalDistance * 0.5,
      zonesTraversed: pathZones,
      smoothPath,
      isOptimal: true,
    };

    set({ activePath });
  },

  setCameraMode: (mode) => set({ cameraMode: mode }),

  toggleWalkMode: () =>
    set((state) => ({
      cameraMode: state.cameraMode === 'walk' ? 'orbit' : 'walk',
      // Reset camera when exiting walk mode
      ...(state.cameraMode === 'walk' ? {
        currentPreset: 'overview',
      } : {}),
    })),
}));
