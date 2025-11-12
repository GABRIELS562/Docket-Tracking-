import { create } from 'zustand';

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
 * 3D Scene State
 */
interface SceneState {
  // Camera
  cameraPosition: CameraPosition;
  cameraTarget: CameraPosition;
  isAnimatingCamera: boolean;

  // Selected item
  selectedItem: SelectedItem | null;
  hoveredItem: string | null;

  // Visualization settings
  showGrid: boolean;
  showLabels: boolean;
  showPaths: boolean;
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
  }>;

  // Actions
  setCameraPosition: (position: CameraPosition) => void;
  setCameraTarget: (target: CameraPosition) => void;
  setIsAnimatingCamera: (isAnimating: boolean) => void;
  flyToItem: (item: SelectedItem) => void;
  selectItem: (item: SelectedItem | null) => void;
  setHoveredItem: (itemId: string | null) => void;
  toggleGrid: () => void;
  toggleLabels: () => void;
  togglePaths: () => void;
  setRenderQuality: (quality: SceneState['renderQuality']) => void;
  setVisibleItemCount: (count: number) => void;
  setFps: (fps: number) => void;
  updateItems: (items: SceneState['items']) => void;
  resetCamera: () => void;
}

/**
 * Scene Store
 *
 * Manages 3D scene state including camera position, selected items,
 * visualization settings, and performance metrics.
 */
export const useSceneStore = create<SceneState>((set, get) => ({
  // Initial state
  cameraPosition: { x: 0, y: 50, z: 100 },
  cameraTarget: { x: 0, y: 0, z: 0 },
  isAnimatingCamera: false,

  selectedItem: null,
  hoveredItem: null,

  showGrid: true,
  showLabels: true,
  showPaths: false,
  renderQuality: 'high',

  visibleItemCount: 0,
  maxVisibleItems: 500,
  fps: 60,

  items: [],

  // Actions
  setCameraPosition: (position) => set({ cameraPosition: position }),

  setCameraTarget: (target) => set({ cameraTarget: target }),

  setIsAnimatingCamera: (isAnimating) => set({ isAnimatingCamera: isAnimating }),

  flyToItem: (item) => {
    set({ isAnimatingCamera: true, selectedItem: item });

    // Calculate camera position (offset from item)
    const [x, y, z] = item.position;
    const offset = 10;

    set({
      cameraTarget: { x, y, z },
      cameraPosition: { x: x + offset, y: y + offset, z: z + offset },
    });

    // Reset animation flag after animation completes (1.5s default)
    setTimeout(() => {
      set({ isAnimatingCamera: false });
    }, 1500);
  },

  selectItem: (item) => set({ selectedItem: item }),

  setHoveredItem: (itemId) => set({ hoveredItem: itemId }),

  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

  toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),

  togglePaths: () => set((state) => ({ showPaths: !state.showPaths })),

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

  resetCamera: () =>
    set({
      cameraPosition: { x: 0, y: 50, z: 100 },
      cameraTarget: { x: 0, y: 0, z: 0 },
      selectedItem: null,
      hoveredItem: null,
    }),
}));
