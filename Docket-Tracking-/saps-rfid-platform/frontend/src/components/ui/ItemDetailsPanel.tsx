import { useState, useEffect, useRef } from 'react';
import { X, Navigation, MapPin, Radio, Eye, EyeOff, History, AlertTriangle } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useSceneStore } from '../../stores/sceneStore';

/**
 * Zone colors mapping
 */
const ZONE_COLORS: Record<string, { bg: string; text: string; name: string }> = {
  'receiving': { bg: 'bg-green-500/20', text: 'text-green-400', name: 'Receiving Dock' },
  'shipping': { bg: 'bg-purple-500/20', text: 'text-purple-400', name: 'Shipping Dock' },
  'storage-a': { bg: 'bg-blue-500/20', text: 'text-blue-400', name: 'Storage Area A' },
  'storage-b': { bg: 'bg-blue-500/20', text: 'text-blue-400', name: 'Storage Area B' },
  'processing': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', name: 'Processing' },
  'staging': { bg: 'bg-teal-500/20', text: 'text-teal-400', name: 'Staging Area' },
  'secure-storage': { bg: 'bg-red-500/20', text: 'text-red-400', name: 'Secure Storage' },
  'returns': { bg: 'bg-orange-500/20', text: 'text-orange-400', name: 'Returns' },
  'office': { bg: 'bg-indigo-500/20', text: 'text-indigo-400', name: 'Office' },
};

/**
 * Item Details Panel
 *
 * Shows detailed information about a selected item and allows tracking
 */
const ItemDetailsPanel = () => {
  // Use individual selectors to avoid re-renders when unrelated state changes
  const selectedItem = useSceneStore((s) => s.selectedItem);
  const selectItem = useSceneStore((s) => s.selectItem);
  const flyToItem = useSceneStore((s) => s.flyToItem);
  const items = useSceneStore(useShallow((s) => s.items));

  const [isTracking, setIsTracking] = useState(false);
  const [movementHistory, setMovementHistory] = useState<{ zone: string; time: Date }[]>([]);

  // Use refs to avoid useEffect dependency issues
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const flyToItemRef = useRef(flyToItem);
  flyToItemRef.current = flyToItem;
  const selectedItemRef = useRef(selectedItem);
  selectedItemRef.current = selectedItem;

  // Get zone styling
  const zoneStyle = selectedItem ? ZONE_COLORS[selectedItem.zone] || ZONE_COLORS['storage-a'] : null;

  // Update movement history when zone changes
  useEffect(() => {
    if (selectedItem) {
      setMovementHistory(prev => {
        const lastEntry = prev[prev.length - 1];
        if (!lastEntry || lastEntry.zone !== selectedItem.zone) {
          return [...prev.slice(-4), { zone: selectedItem.zone, time: new Date() }];
        }
        return prev;
      });
    }
  }, [selectedItem?.zone]);

  // Continuous tracking - follow the item as it moves
  useEffect(() => {
    if (!isTracking || !selectedItem) return;

    const interval = setInterval(() => {
      const currentItems = itemsRef.current;
      const currentSelected = selectedItemRef.current;
      if (!currentSelected) return;

      // Find updated item position from scene items
      const updatedItem = currentItems.find(i => i.epc === currentSelected.epc);
      if (updatedItem) {
        flyToItemRef.current({
          ...currentSelected,
          position: updatedItem.position,
          zone: updatedItem.zone,
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isTracking, selectedItem?.epc]); // Only depend on tracking state and item EPC

  // Clear tracking when item is deselected
  useEffect(() => {
    if (!selectedItem) {
      setIsTracking(false);
      setMovementHistory([]);
    }
  }, [selectedItem]);

  if (!selectedItem) return null;

  const handleClose = () => {
    setIsTracking(false);
    selectItem(null);
  };

  const handleFlyTo = () => {
    flyToItem(selectedItem);
  };

  const toggleTracking = () => {
    setIsTracking(!isTracking);
  };

  return (
    <div className="absolute bottom-24 left-4 z-30 w-80">
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isTracking ? 'bg-cyan-400 animate-pulse' : 'bg-green-400'}`} />
            <span className="text-white font-semibold text-sm">
              {isTracking ? 'Tracking Active' : 'Item Selected'}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Item Info */}
        <div className="p-4 space-y-4">
          {/* EPC Code */}
          <div>
            <div className="text-xs text-gray-500 uppercase mb-1">EPC Tag ID</div>
            <div className="font-mono text-lg text-white tracking-wider">
              {selectedItem.epc.slice(-12).toUpperCase()}
            </div>
          </div>

          {/* Current Zone */}
          <div>
            <div className="text-xs text-gray-500 uppercase mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Current Location
            </div>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${zoneStyle?.bg}`}>
              <span className={`font-medium ${zoneStyle?.text}`}>
                {zoneStyle?.name || selectedItem.zone}
              </span>
            </div>
          </div>

          {/* Position Coordinates */}
          <div>
            <div className="text-xs text-gray-500 uppercase mb-1">3D Position</div>
            <div className="font-mono text-sm text-gray-300 bg-black/30 rounded-lg px-3 py-2">
              X: {selectedItem.position[0].toFixed(1)} |
              Y: {selectedItem.position[1].toFixed(1)} |
              Z: {selectedItem.position[2].toFixed(1)}
            </div>
          </div>

          {/* Movement History */}
          {movementHistory.length > 1 && (
            <div>
              <div className="text-xs text-gray-500 uppercase mb-2 flex items-center gap-1">
                <History className="w-3 h-3" />
                Movement History
              </div>
              <div className="space-y-1">
                {movementHistory.slice(-3).map((entry, idx) => {
                  const style = ZONE_COLORS[entry.zone] || ZONE_COLORS['storage-a'];
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className={style.text}>{style.name}</span>
                      <span className="text-gray-500">
                        {entry.time.toLocaleTimeString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Secure Storage Warning */}
          {selectedItem.zone === 'secure-storage' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-xs">High-security item</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 grid grid-cols-2 gap-2">
          <button
            onClick={handleFlyTo}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-xl text-cyan-400 text-sm font-medium transition-all"
          >
            <Navigation className="w-4 h-4" />
            Fly To Item
          </button>
          <button
            onClick={toggleTracking}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isTracking
                ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400'
                : 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400'
            }`}
          >
            {isTracking ? (
              <>
                <EyeOff className="w-4 h-4" />
                Stop Track
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Track Item
              </>
            )}
          </button>
        </div>

        {/* Tracking Status Bar */}
        {isTracking && (
          <div className="px-4 py-2 bg-cyan-500/10 border-t border-cyan-500/20">
            <div className="flex items-center gap-2 text-xs text-cyan-400">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>Camera following item in real-time</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemDetailsPanel;
