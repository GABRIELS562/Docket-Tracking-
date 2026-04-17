/**
 * Stores Index - Central Export
 *
 * All stores should be imported from here for consistency.
 */

// ============================================================================
// NEW UNIFIED STORES (Use these for new development)
// ============================================================================

// Warehouse Store - Configuration and runtime data
export {
  useWarehouseStore,
  useCurrentWarehouse,
  useWarehouseLoading,
  useWarehouseReady,
  useZones,
  useReaders,
  useCameraPresets,
  useRenderingConfig,
  useWalkBoundaries,
  initializeWarehouseStore,
} from './warehouseStore';

// Camera Store - Camera position, mode, animations
export {
  useCameraStore,
  useCameraPosition,
  useCameraTarget,
  useCameraMode,
  useCameraAnimating,
  useWalkLocked,
  useTourRunning,
} from './cameraStore';

// Items Store - Virtualized 3D items
export {
  useItemsStore,
  useVisibleCount,
  useTotalItemCount,
  useSelectedItemId,
  useTrackedCount,
} from './itemsStore';

// ============================================================================
// LEGACY STORES (For backward compatibility - will migrate away from these)
// ============================================================================

// Scene Store - Legacy 3D state (migrate to warehouseStore + cameraStore)
export { useSceneStore } from './sceneStore';

// Auth Store - User authentication
export { useAuthStore } from './authStore';
export type { User, Tenant } from './authStore';

// Filter Store - Search filters
export { useFilterStore } from './filterStore';

// AI Analytics Store - AI alerts and analytics
export { useAIAnalyticsStore } from './aiAnalyticsStore';

// Virtualized App Store - Legacy virtualization (migrate to itemsStore)
export { useVirtualizedAppStore, useTotalItemCount as useLegacyTotalItemCount } from './virtualizedAppStore';
