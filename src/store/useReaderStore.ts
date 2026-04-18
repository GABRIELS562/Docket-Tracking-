import { create } from 'zustand';
import { Reader, ReaderStatus } from '@/lib/types';

interface ReaderState {
  readers: Reader[];
  selectedReaderId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setReaders: (readers: Reader[]) => void;
  selectReader: (readerId: string | null) => void;
  updateReaderStatus: (readerId: string, status: ReaderStatus, errorMessage?: string) => void;
  updateReaderStats: (readerId: string, totalReads: number, successRate: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed getters
  getReaderById: (readerId: string) => Reader | undefined;
  getSelectedReader: () => Reader | undefined;
  getReadersByZone: (zoneId: number) => Reader[];
  getReadersByStatus: (status: ReaderStatus) => Reader[];
  getOnlineReaderCount: () => number;
  getOfflineReaderCount: () => number;
}

export const useReaderStore = create<ReaderState>((set, get) => ({
  readers: [],
  selectedReaderId: null,
  isLoading: false,
  error: null,

  setReaders: (readers) => set({ readers, error: null }),

  selectReader: (readerId) => set({ selectedReaderId: readerId }),

  updateReaderStatus: (readerId, status, errorMessage) =>
    set((state) => ({
      readers: state.readers.map((reader) =>
        reader.readerId === readerId
          ? {
              ...reader,
              status,
              errorMessage: errorMessage ?? (status === 'online' ? undefined : reader.errorMessage),
              lastSeenAt: status === 'online' ? new Date().toISOString() : reader.lastSeenAt,
            }
          : reader
      ),
    })),

  updateReaderStats: (readerId, totalReads, successRate) =>
    set((state) => ({
      readers: state.readers.map((reader) =>
        reader.readerId === readerId ? { ...reader, totalReads, successRate } : reader
      ),
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  // Computed getters
  getReaderById: (readerId) => get().readers.find((r) => r.readerId === readerId),

  getSelectedReader: () => {
    const { readers, selectedReaderId } = get();
    return selectedReaderId !== null
      ? readers.find((r) => r.readerId === selectedReaderId)
      : undefined;
  },

  getReadersByZone: (zoneId) => get().readers.filter((r) => r.zoneId === zoneId),

  getReadersByStatus: (status) => get().readers.filter((r) => r.status === status),

  getOnlineReaderCount: () => get().readers.filter((r) => r.status === 'online').length,

  getOfflineReaderCount: () =>
    get().readers.filter((r) => r.status === 'offline' || r.status === 'error').length,
}));
