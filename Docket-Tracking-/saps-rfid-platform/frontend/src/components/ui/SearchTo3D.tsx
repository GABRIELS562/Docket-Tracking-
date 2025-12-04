import { useCallback, useEffect, useRef } from 'react';
import { useSceneStore } from '../../stores/sceneStore';
import { useVirtualizedAppStore } from '../../stores/virtualizedAppStore';
import type { SearchResultItem } from './VirtualizedSearchResults';

/**
 * SearchTo3D Pipeline (Phase 3.3)
 *
 * Manages the connection between search results and 3D visualization:
 * - Fly camera to selected items
 * - Highlight items in 3D scene
 * - Track items for persistent visualization
 * - Handle zone transitions
 * - Manage selection state
 *
 * This is a headless component that provides the pipeline logic.
 * Reference: StartHere.md Phase 3.3
 */

// ============================================================================
// Types
// ============================================================================

export interface SearchTo3DState {
  selectedItem: SearchResultItem | null;
  highlightedItems: string[];
  trackedItems: string[];
  hoveredItem: SearchResultItem | null;
  isFlying: boolean;
}

export interface SearchTo3DActions {
  flyToItem: (item: SearchResultItem) => void;
  flyToZone: (zoneId: string) => void;
  highlightItem: (itemId: string) => void;
  unhighlightItem: (itemId: string) => void;
  highlightMultiple: (itemIds: string[]) => void;
  clearHighlights: () => void;
  trackItem: (item: SearchResultItem) => void;
  untrackItem: (itemId: string) => void;
  setHoveredItem: (item: SearchResultItem | null) => void;
  focusOnResults: (results: SearchResultItem[]) => void;
}

export interface UseSearchTo3DReturn extends SearchTo3DState, SearchTo3DActions {}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useSearchTo3D(): UseSearchTo3DReturn {
  // Scene store for camera control - use individual selectors
  const sceneFlyToItem = useSceneStore((s) => s.flyToItem);
  const sceneFlyToZone = useSceneStore((s) => s.flyToZone);
  const selectedItem = useSceneStore((s) => s.selectedItem);
  const setSceneHoveredItem = useSceneStore((s) => s.setHoveredItem);

  // Virtualized store for tracking - use individual selectors
  const virtualizedTrackItem = useVirtualizedAppStore((s) => s.trackItem);
  const virtualizedUntrackItem = useVirtualizedAppStore((s) => s.untrackItem);
  const trackedItems = useVirtualizedAppStore((s) => s.trackedItems);
  const addVisibleItems = useVirtualizedAppStore((s) => s.addVisibleItems);

  // Local state refs
  const highlightedItemsRef = useRef<Set<string>>(new Set());
  const isFlyingRef = useRef(false);

  // Fly to item with camera animation
  const flyToItem = useCallback((item: SearchResultItem) => {
    isFlyingRef.current = true;

    sceneFlyToItem({
      id: item.id,
      epc: item.epc,
      name: item.name,
      zone: item.zoneId,
      position: item.position,
    });

    // Add to visible items for 3D rendering
    addVisibleItems([{
      id: item.id,
      epc: item.epc,
      zoneId: item.zoneId,
      position: item.position,
      lastSeen: Date.now(),
      rssi: item.rssi || -50,
      isTracked: false,
      isVisible: true,
      lodLevel: 'detailed',
    }]);

    // Reset flying state after animation
    setTimeout(() => {
      isFlyingRef.current = false;
    }, 2000);
  }, [sceneFlyToItem, addVisibleItems]);

  // Fly to zone
  const flyToZone = useCallback((zoneId: string) => {
    isFlyingRef.current = true;
    sceneFlyToZone(zoneId);

    setTimeout(() => {
      isFlyingRef.current = false;
    }, 2000);
  }, [sceneFlyToZone]);

  // Highlight a single item
  const highlightItem = useCallback((itemId: string) => {
    highlightedItemsRef.current.add(itemId);
    // Emit event for 3D scene
    window.dispatchEvent(new CustomEvent('searchTo3D:highlight', {
      detail: { itemId, action: 'add' }
    }));
  }, []);

  // Unhighlight a single item
  const unhighlightItem = useCallback((itemId: string) => {
    highlightedItemsRef.current.delete(itemId);
    window.dispatchEvent(new CustomEvent('searchTo3D:highlight', {
      detail: { itemId, action: 'remove' }
    }));
  }, []);

  // Highlight multiple items
  const highlightMultiple = useCallback((itemIds: string[]) => {
    itemIds.forEach(id => highlightedItemsRef.current.add(id));
    window.dispatchEvent(new CustomEvent('searchTo3D:highlight', {
      detail: { itemIds, action: 'addMultiple' }
    }));
  }, []);

  // Clear all highlights
  const clearHighlights = useCallback(() => {
    highlightedItemsRef.current.clear();
    window.dispatchEvent(new CustomEvent('searchTo3D:highlight', {
      detail: { action: 'clear' }
    }));
  }, []);

  // Track item for persistent visualization
  const trackItem = useCallback((item: SearchResultItem) => {
    virtualizedTrackItem({
      id: item.id,
      epc: item.epc,
      zoneId: item.zoneId,
      position: item.position,
      lastSeen: Date.now(),
      rssi: item.rssi || -50,
      isTracked: true,
      isVisible: true,
      lodLevel: 'detailed',
      name: item.name,
      status: item.status,
      history: [],
      metadata: {},
    });
  }, [virtualizedTrackItem]);

  // Untrack item
  const untrackItem = useCallback((itemId: string) => {
    virtualizedUntrackItem(itemId);
  }, [virtualizedUntrackItem]);

  // Set hovered item
  const setHoveredItem = useCallback((item: SearchResultItem | null) => {
    if (item) {
      setSceneHoveredItem(item.id);
    } else {
      setSceneHoveredItem(null);
    }
  }, [setSceneHoveredItem]);

  // Focus camera to show all results
  const focusOnResults = useCallback((results: SearchResultItem[]) => {
    if (results.length === 0) return;

    if (results.length === 1) {
      flyToItem(results[0]);
      return;
    }

    // Calculate bounding box of all results
    const positions = results.map(r => r.position);
    const minX = Math.min(...positions.map(p => p[0]));
    const maxX = Math.max(...positions.map(p => p[0]));
    const minZ = Math.min(...positions.map(p => p[2]));
    const maxZ = Math.max(...positions.map(p => p[2]));

    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const width = maxX - minX;
    const depth = maxZ - minZ;
    const size = Math.max(width, depth);

    // Emit focus event for camera
    window.dispatchEvent(new CustomEvent('searchTo3D:focus', {
      detail: {
        center: [centerX, 0, centerZ],
        size,
        itemCount: results.length,
      }
    }));

    // Highlight all results
    highlightMultiple(results.map(r => r.id));

    // Add to visible items
    addVisibleItems(results.map(item => ({
      id: item.id,
      epc: item.epc,
      zoneId: item.zoneId,
      position: item.position,
      lastSeen: Date.now(),
      rssi: item.rssi || -50,
      isTracked: false,
      isVisible: true,
      lodLevel: 'individual',
    })));
  }, [flyToItem, highlightMultiple, addVisibleItems]);

  return {
    // State
    selectedItem: selectedItem ? {
      id: selectedItem.id,
      epc: selectedItem.epc,
      name: selectedItem.name,
      zone: selectedItem.zone,
      zoneId: selectedItem.zone,
      status: 'active',
      lastSeen: new Date().toISOString(),
      position: selectedItem.position,
      priority: 'medium',
    } : null,
    highlightedItems: Array.from(highlightedItemsRef.current),
    trackedItems: Array.from(trackedItems.keys()),
    hoveredItem: null,
    isFlying: isFlyingRef.current,

    // Actions
    flyToItem,
    flyToZone,
    highlightItem,
    unhighlightItem,
    highlightMultiple,
    clearHighlights,
    trackItem,
    untrackItem,
    setHoveredItem,
    focusOnResults,
  };
}

// ============================================================================
// SearchTo3D Provider Component (Optional)
// ============================================================================

interface SearchTo3DProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that sets up 3D event listeners
 */
export const SearchTo3DProvider = ({ children }: SearchTo3DProviderProps) => {
  // Set up global event listeners for 3D integration
  useEffect(() => {
    const handleHighlight = (e: CustomEvent) => {
      // Handle highlight events in 3D scene
      // This would be picked up by InstancedRFIDSystem
      console.log('[SearchTo3D] Highlight event:', e.detail);
    };

    const handleFocus = (e: CustomEvent) => {
      // Handle focus events for camera
      console.log('[SearchTo3D] Focus event:', e.detail);
    };

    window.addEventListener('searchTo3D:highlight', handleHighlight as EventListener);
    window.addEventListener('searchTo3D:focus', handleFocus as EventListener);

    return () => {
      window.removeEventListener('searchTo3D:highlight', handleHighlight as EventListener);
      window.removeEventListener('searchTo3D:focus', handleFocus as EventListener);
    };
  }, []);

  return <>{children}</>;
};

export default useSearchTo3D;
