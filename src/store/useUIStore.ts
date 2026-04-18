import { create } from 'zustand';
import { ViewMode, FloorPlanMode } from '@/lib/types';

interface UIState {
  // Connection state
  isConnected: boolean;
  isDemoMode: boolean;

  // View state
  viewMode: ViewMode;
  floorPlanMode: FloorPlanMode;

  // Panel visibility
  isZonePanelOpen: boolean;
  isItemPanelOpen: boolean;
  isItemModalOpen: boolean;
  isReaderPanelOpen: boolean;
  isNotificationHistoryOpen: boolean;
  isSearchOpen: boolean;

  // Visualization options
  heatMapEnabled: boolean;
  showReaders: boolean;
  showLabels: boolean;

  // Timeline playback (for historical view)
  isPlaybackMode: boolean;
  playbackTime: number;
  playbackSpeed: 1 | 2 | 5 | 10;
  isPlaying: boolean;

  // Actions - Connection
  setConnected: (connected: boolean) => void;
  setDemoMode: (enabled: boolean) => void;

  // Actions - View
  setViewMode: (mode: ViewMode) => void;
  setFloorPlanMode: (mode: FloorPlanMode) => void;

  // Actions - Panels
  setZonePanelOpen: (open: boolean) => void;
  setItemPanelOpen: (open: boolean) => void;
  setItemModalOpen: (open: boolean) => void;
  setReaderPanelOpen: (open: boolean) => void;
  setNotificationHistoryOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  closeAllPanels: () => void;

  // Actions - Visualization
  setHeatMapEnabled: (enabled: boolean) => void;
  setShowReaders: (show: boolean) => void;
  setShowLabels: (show: boolean) => void;

  // Actions - Playback
  setPlaybackMode: (enabled: boolean) => void;
  setPlaybackTime: (time: number) => void;
  setPlaybackSpeed: (speed: 1 | 2 | 5 | 10) => void;
  setIsPlaying: (playing: boolean) => void;

  // Utility
  togglePanel: (panel: 'zone' | 'item' | 'reader' | 'notifications' | 'search') => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  isConnected: false,
  isDemoMode: true, // Start in demo mode by default

  viewMode: '3d',
  floorPlanMode: 'overview',

  isZonePanelOpen: false,
  isItemPanelOpen: false,
  isItemModalOpen: false,
  isReaderPanelOpen: false,
  isNotificationHistoryOpen: false,
  isSearchOpen: false,

  heatMapEnabled: true,
  showReaders: true,
  showLabels: true,

  isPlaybackMode: false,
  playbackTime: Date.now(),
  playbackSpeed: 1,
  isPlaying: false,

  // Actions - Connection
  setConnected: (connected) => set({ isConnected: connected }),
  setDemoMode: (enabled) => set({ isDemoMode: enabled }),

  // Actions - View
  setViewMode: (mode) => set({ viewMode: mode }),
  setFloorPlanMode: (mode) => set({ floorPlanMode: mode }),

  // Actions - Panels
  setZonePanelOpen: (open) => set({ isZonePanelOpen: open }),
  setItemPanelOpen: (open) => set({ isItemPanelOpen: open }),
  setItemModalOpen: (open) => set({ isItemModalOpen: open }),
  setReaderPanelOpen: (open) => set({ isReaderPanelOpen: open }),
  setNotificationHistoryOpen: (open) => set({ isNotificationHistoryOpen: open }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),

  closeAllPanels: () =>
    set({
      isZonePanelOpen: false,
      isItemPanelOpen: false,
      isItemModalOpen: false,
      isReaderPanelOpen: false,
      isNotificationHistoryOpen: false,
      isSearchOpen: false,
    }),

  // Actions - Visualization
  setHeatMapEnabled: (enabled) => set({ heatMapEnabled: enabled }),
  setShowReaders: (show) => set({ showReaders: show }),
  setShowLabels: (show) => set({ showLabels: show }),

  // Actions - Playback
  setPlaybackMode: (enabled) =>
    set({
      isPlaybackMode: enabled,
      isPlaying: false,
      playbackTime: Date.now(),
    }),
  setPlaybackTime: (time) => set({ playbackTime: time }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  // Utility
  togglePanel: (panel) => {
    const state = get();
    switch (panel) {
      case 'zone':
        set({ isZonePanelOpen: !state.isZonePanelOpen });
        break;
      case 'item':
        set({ isItemPanelOpen: !state.isItemPanelOpen });
        break;
      case 'reader':
        set({ isReaderPanelOpen: !state.isReaderPanelOpen });
        break;
      case 'notifications':
        set({ isNotificationHistoryOpen: !state.isNotificationHistoryOpen });
        break;
      case 'search':
        set({ isSearchOpen: !state.isSearchOpen });
        break;
    }
  },
}));
