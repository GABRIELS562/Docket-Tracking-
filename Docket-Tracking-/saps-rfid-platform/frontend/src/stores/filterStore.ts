import { create } from 'zustand';

/**
 * Search and Filter State
 */
interface FilterState {
  // Search
  searchQuery: string;
  searchResults: any[];
  isSearching: boolean;

  // Zone filters
  selectedZones: string[];
  allZones: Array<{ id: string; name: string; color: string }>;

  // Status filters
  selectedStatuses: string[];
  availableStatuses: string[];

  // Date range
  dateRange: {
    start: Date | null;
    end: Date | null;
  };

  // Sorting
  sortBy: 'name' | 'date' | 'zone' | 'status';
  sortOrder: 'asc' | 'desc';

  // Actions
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: any[]) => void;
  setIsSearching: (isSearching: boolean) => void;
  toggleZone: (zoneId: string) => void;
  selectAllZones: () => void;
  clearZones: () => void;
  toggleStatus: (status: string) => void;
  setDateRange: (start: Date | null, end: Date | null) => void;
  setSorting: (sortBy: FilterState['sortBy'], sortOrder: FilterState['sortOrder']) => void;
  clearFilters: () => void;
}

/**
 * Filter Store
 *
 * Manages search queries, zone filters, status filters, and sorting preferences.
 * Used across search page, analytics, and item listings.
 */
export const useFilterStore = create<FilterState>((set, get) => ({
  // Initial state
  searchQuery: '',
  searchResults: [],
  isSearching: false,

  selectedZones: [],
  allZones: [
    { id: 'zone-001', name: 'Zone 1 - Reception', color: '#3B82F6' },
    { id: 'zone-002', name: 'Zone 2 - Storage A', color: '#10B981' },
    { id: 'zone-003', name: 'Zone 3 - Storage B', color: '#F59E0B' },
    { id: 'zone-004', name: 'Zone 4 - Processing', color: '#EF4444' },
    { id: 'zone-005', name: 'Zone 5 - Shipping', color: '#8B5CF6' },
    { id: 'zone-006', name: 'Zone 6 - Archive', color: '#6B7280' },
  ],

  selectedStatuses: [],
  availableStatuses: ['in-storage', 'in-transit', 'checked-out', 'missing'],

  dateRange: {
    start: null,
    end: null,
  },

  sortBy: 'date',
  sortOrder: 'desc',

  // Actions
  setSearchQuery: (query) => set({ searchQuery: query }),

  setSearchResults: (results) => set({ searchResults: results }),

  setIsSearching: (isSearching) => set({ isSearching }),

  toggleZone: (zoneId) =>
    set((state) => {
      const isSelected = state.selectedZones.includes(zoneId);
      return {
        selectedZones: isSelected
          ? state.selectedZones.filter((id) => id !== zoneId)
          : [...state.selectedZones, zoneId],
      };
    }),

  selectAllZones: () =>
    set((state) => ({
      selectedZones: state.allZones.map((z) => z.id),
    })),

  clearZones: () => set({ selectedZones: [] }),

  toggleStatus: (status) =>
    set((state) => {
      const isSelected = state.selectedStatuses.includes(status);
      return {
        selectedStatuses: isSelected
          ? state.selectedStatuses.filter((s) => s !== status)
          : [...state.selectedStatuses, status],
      };
    }),

  setDateRange: (start, end) =>
    set({
      dateRange: { start, end },
    }),

  setSorting: (sortBy, sortOrder) =>
    set({ sortBy, sortOrder }),

  clearFilters: () =>
    set({
      searchQuery: '',
      selectedZones: [],
      selectedStatuses: [],
      dateRange: { start: null, end: null },
      sortBy: 'date',
      sortOrder: 'desc',
    }),
}));
