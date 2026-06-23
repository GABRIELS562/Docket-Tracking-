import { create } from 'zustand';

interface SearchState {
  // The zone currently highlighted from search
  highlightedZoneId: number | null;

  // Target zone for camera fly-to animation
  targetZoneId: number | null;

  // Whether camera is currently flying to target
  isCameraFlying: boolean;

  // Animation state for the highlight pulse
  highlightIntensity: number;

  // Actions
  setHighlightedZone: (zoneId: number | null) => void;
  setTargetZone: (zoneId: number | null) => void;
  setCameraFlying: (flying: boolean) => void;
  setHighlightIntensity: (intensity: number) => void;

  // Reset all search visual state
  clearSearchState: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  highlightedZoneId: null,
  targetZoneId: null,
  isCameraFlying: false,
  highlightIntensity: 1,

  setHighlightedZone: (zoneId) => set({ highlightedZoneId: zoneId }),

  setTargetZone: (zoneId) => set({ targetZoneId: zoneId }),

  setCameraFlying: (flying) => set({ isCameraFlying: flying }),

  setHighlightIntensity: (intensity) => set({ highlightIntensity: intensity }),

  clearSearchState: () =>
    set({
      highlightedZoneId: null,
      targetZoneId: null,
      isCameraFlying: false,
      highlightIntensity: 1,
    }),
}));
