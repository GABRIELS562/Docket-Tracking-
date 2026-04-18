import { create } from 'zustand';
import { Zone, OccupancyStatus, getOccupancyStatus } from '@/lib/types';

interface ZoneState {
  zones: Zone[];
  selectedZoneId: number | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setZones: (zones: Zone[]) => void;
  selectZone: (zoneId: number | null) => void;
  updateZoneOccupancy: (zoneId: number, currentOccupancy: number) => void;
  updateZoneOccupancyBatch: (updates: Array<{ zoneId: number; currentOccupancy: number }>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed getters
  getZoneById: (zoneId: number) => Zone | undefined;
  getSelectedZone: () => Zone | undefined;
  getZoneOccupancyStatus: (zoneId: number) => OccupancyStatus | undefined;
  getTotalItemCount: () => number;
  getZonesByStatus: (status: OccupancyStatus) => Zone[];
}

export const useZoneStore = create<ZoneState>((set, get) => ({
  zones: [],
  selectedZoneId: null,
  isLoading: false,
  error: null,

  setZones: (zones) => set({ zones, error: null }),

  selectZone: (zoneId) => set({ selectedZoneId: zoneId }),

  updateZoneOccupancy: (zoneId, currentOccupancy) =>
    set((state) => ({
      zones: state.zones.map((zone) =>
        zone.zoneId === zoneId
          ? {
              ...zone,
              currentOccupancy,
              occupancyPercentage:
                zone.capacity > 0 ? Math.round((currentOccupancy / zone.capacity) * 100) : 0,
            }
          : zone
      ),
    })),

  updateZoneOccupancyBatch: (updates) =>
    set((state) => {
      const updateMap = new Map(updates.map((u) => [u.zoneId, u.currentOccupancy]));
      return {
        zones: state.zones.map((zone) => {
          const newOccupancy = updateMap.get(zone.zoneId);
          if (newOccupancy !== undefined) {
            return {
              ...zone,
              currentOccupancy: newOccupancy,
              occupancyPercentage:
                zone.capacity > 0 ? Math.round((newOccupancy / zone.capacity) * 100) : 0,
            };
          }
          return zone;
        }),
      };
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  // Computed getters
  getZoneById: (zoneId) => get().zones.find((z) => z.zoneId === zoneId),

  getSelectedZone: () => {
    const { zones, selectedZoneId } = get();
    return selectedZoneId !== null ? zones.find((z) => z.zoneId === selectedZoneId) : undefined;
  },

  getZoneOccupancyStatus: (zoneId) => {
    const zone = get().zones.find((z) => z.zoneId === zoneId);
    return zone ? getOccupancyStatus(zone.occupancyPercentage) : undefined;
  },

  getTotalItemCount: () => get().zones.reduce((sum, zone) => sum + zone.currentOccupancy, 0),

  getZonesByStatus: (status) =>
    get().zones.filter((zone) => getOccupancyStatus(zone.occupancyPercentage) === status),
}));
