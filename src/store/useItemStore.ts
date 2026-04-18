import { create } from 'zustand';
import { Item, ItemSummary, PaginatedResponse, ItemSearchParams } from '@/lib/types';

interface ItemState {
  // Current zone's items (paginated)
  currentItems: Item[];
  currentPage: number;
  totalItems: number;
  totalPages: number;
  itemsPerPage: number;

  // Search results
  searchResults: ItemSummary[];
  searchQuery: string;
  searchTotal: number;
  isSearching: boolean;

  // Selected item
  selectedItem: Item | null;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Current zone context for item list
  currentZoneId: number | null;

  // Actions - Items
  setItems: (response: PaginatedResponse<Item>) => void;
  setCurrentZoneId: (zoneId: number | null) => void;
  clearItems: () => void;

  // Actions - Search
  setSearchResults: (results: ItemSummary[], total: number) => void;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  setIsSearching: (searching: boolean) => void;

  // Actions - Selection
  selectItem: (item: Item | null) => void;

  // Actions - Loading
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Actions - Pagination
  setPage: (page: number) => void;
  setItemsPerPage: (limit: number) => void;

  // Real-time updates
  updateItemLocation: (itemId: string, zoneId: number, zoneName: string) => void;
  removeItemFromCurrentList: (itemId: string) => void;

  // Computed
  hasNextPage: () => boolean;
  hasPrevPage: () => boolean;
  getSearchParams: () => ItemSearchParams;
}

export const useItemStore = create<ItemState>((set, get) => ({
  // Initial state
  currentItems: [],
  currentPage: 1,
  totalItems: 0,
  totalPages: 0,
  itemsPerPage: 50,

  searchResults: [],
  searchQuery: '',
  searchTotal: 0,
  isSearching: false,

  selectedItem: null,

  isLoading: false,
  error: null,

  currentZoneId: null,

  // Actions - Items
  setItems: (response) =>
    set({
      currentItems: response.data,
      totalItems: response.total,
      totalPages: response.totalPages,
      currentPage: response.page,
      error: null,
    }),

  setCurrentZoneId: (zoneId) =>
    set({
      currentZoneId: zoneId,
      currentItems: [],
      currentPage: 1,
      totalItems: 0,
      totalPages: 0,
    }),

  clearItems: () =>
    set({
      currentItems: [],
      currentPage: 1,
      totalItems: 0,
      totalPages: 0,
      currentZoneId: null,
    }),

  // Actions - Search
  setSearchResults: (results, total) =>
    set({
      searchResults: results,
      searchTotal: total,
      isSearching: false,
    }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  clearSearch: () =>
    set({
      searchResults: [],
      searchQuery: '',
      searchTotal: 0,
      isSearching: false,
    }),

  setIsSearching: (searching) => set({ isSearching: searching }),

  // Actions - Selection
  selectItem: (item) => set({ selectedItem: item }),

  // Actions - Loading
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),

  // Actions - Pagination
  setPage: (page) => set({ currentPage: page }),
  setItemsPerPage: (limit) => set({ itemsPerPage: limit, currentPage: 1 }),

  // Real-time updates
  updateItemLocation: (itemId, zoneId, zoneName) =>
    set((state) => {
      // If item moved to a different zone, remove from current list
      if (state.currentZoneId !== null && state.currentZoneId !== zoneId) {
        return {
          currentItems: state.currentItems.filter((item) => item.itemId !== itemId),
          totalItems: Math.max(0, state.totalItems - 1),
        };
      }

      // Update item's zone info if it's in current list
      return {
        currentItems: state.currentItems.map((item) =>
          item.itemId === itemId
            ? {
                ...item,
                currentZone: { id: zoneId, name: zoneName },
                lastSeenAt: new Date().toISOString(),
              }
            : item
        ),
      };
    }),

  removeItemFromCurrentList: (itemId) =>
    set((state) => ({
      currentItems: state.currentItems.filter((item) => item.itemId !== itemId),
      totalItems: Math.max(0, state.totalItems - 1),
    })),

  // Computed
  hasNextPage: () => {
    const { currentPage, totalPages } = get();
    return currentPage < totalPages;
  },

  hasPrevPage: () => get().currentPage > 1,

  getSearchParams: () => {
    const { currentPage, itemsPerPage, currentZoneId } = get();
    return {
      page: currentPage,
      limit: itemsPerPage,
      zoneId: currentZoneId ?? undefined,
    };
  },
}));
