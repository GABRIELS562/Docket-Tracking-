import { create } from 'zustand';
import { Zone, Reader, Docket } from '@/lib/api';

interface AppState {
  zones: Zone[];
  readers: Reader[];
  selectedZoneId: number | null;
  selectedDocket: Docket | null;
  isConnected: boolean;
  viewMode: '3d' | 'top' | 'firstPerson';
  isZonePanelOpen: boolean;
  isDocketPanelOpen: boolean;
  isDocketModalOpen: boolean;
  isReaderPanelOpen: boolean;
  heatMapEnabled: boolean;
  floorPlanMode: '3d' | '2d' | 'split';
  isNotificationHistoryOpen: boolean;
  isDemoMode: boolean;
  docketLimit: number;

  // Timeline playback state
  isPlaybackMode: boolean;
  playbackTime: number;
  playbackSpeed: 1 | 2 | 5 | 10;
  isPlaying: boolean;

  setZones: (zones: Zone[]) => void;
  setReaders: (readers: Reader[]) => void;
  setSelectedZone: (zoneId: number | null) => void;
  setSelectedDocket: (docket: Docket | null) => void;
  setIsConnected: (connected: boolean) => void;
  setViewMode: (mode: '3d' | 'top' | 'firstPerson') => void;
  setZonePanelOpen: (open: boolean) => void;
  setDocketPanelOpen: (open: boolean) => void;
  setDocketModalOpen: (open: boolean) => void;
  setReaderPanelOpen: (open: boolean) => void;
  setHeatMapEnabled: (enabled: boolean) => void;
  setFloorPlanMode: (mode: '3d' | '2d' | 'split') => void;
  setNotificationHistoryOpen: (open: boolean) => void;
  setDemoMode: (enabled: boolean) => void;
  setDocketLimit: (limit: number) => void;

  // Timeline playback actions
  setPlaybackMode: (enabled: boolean) => void;
  setPlaybackTime: (time: number) => void;
  setPlaybackSpeed: (speed: 1 | 2 | 5 | 10) => void;
  setIsPlaying: (playing: boolean) => void;

  updateZoneOccupancy: (zoneId: number, occupancy: number) => void;
  updateReaderStatus: (readerId: string, status: 'online' | 'offline' | 'error' | 'connecting') => void;
}

export const useStore = create<AppState>((set) => ({
  zones: [],
  readers: [],
  selectedZoneId: null,
  selectedDocket: null,
  isConnected: false,
  viewMode: '3d',
  isZonePanelOpen: false,
  isDocketPanelOpen: false,
  isDocketModalOpen: false,
  isReaderPanelOpen: false,
  heatMapEnabled: false,
  floorPlanMode: '3d',
  isNotificationHistoryOpen: false,
  isDemoMode: true, // Start in demo mode by default
  docketLimit: 100, // Default to 100 dockets for better performance

  // Timeline playback initial state
  isPlaybackMode: false,
  playbackTime: Date.now(),
  playbackSpeed: 1,
  isPlaying: false,

  setZones: (zones) => set({ zones }),
  setReaders: (readers) => set({ readers }),
  setSelectedZone: (zoneId) => set({ selectedZoneId: zoneId }),
  setSelectedDocket: (docket) => set({
    selectedDocket: docket,
    isDocketModalOpen: !!docket
  }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setZonePanelOpen: (open) => set({ isZonePanelOpen: open }),
  setDocketPanelOpen: (open) => set({ isDocketPanelOpen: open }),
  setDocketModalOpen: (open) => set({ isDocketModalOpen: open }),
  setReaderPanelOpen: (open) => set({ isReaderPanelOpen: open }),
  setHeatMapEnabled: (enabled) => set({ heatMapEnabled: enabled }),
  setFloorPlanMode: (mode) => set({ floorPlanMode: mode }),
  setNotificationHistoryOpen: (open) => set({ isNotificationHistoryOpen: open }),
  setDemoMode: (enabled) => set({ isDemoMode: enabled }),
  setDocketLimit: (limit) => set({ docketLimit: limit }),

  // Timeline playback actions
  setPlaybackMode: (enabled) => set({
    isPlaybackMode: enabled,
    isPlaying: enabled ? false : false,
    playbackTime: enabled ? Date.now() : Date.now()
  }),
  setPlaybackTime: (time) => set({ playbackTime: time }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  updateZoneOccupancy: (zoneId, occupancy) =>
    set((state) => ({
      zones: state.zones.map((zone) =>
        zone.zoneId === zoneId
          ? { ...zone, currentOccupancy: occupancy }
          : zone
      ),
    })),

  updateReaderStatus: (readerId, status) =>
    set((state) => ({
      readers: state.readers.map((reader) =>
        reader.readerId === readerId
          ? { ...reader, status, lastSeenAt: new Date().toISOString() }
          : reader
      ),
    })),
}));
