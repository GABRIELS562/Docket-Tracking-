import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, AlertTriangle } from 'lucide-react';
import { Zone } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { getZoneColor } from '@/lib/utils';

interface Props {
  zones: Zone[];
  isOpen: boolean;
  onClose: () => void;
}

export default function ZoneListPanel({ zones, isOpen, onClose }: Props) {
  const { selectedZoneId, setSelectedZone } = useStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: -320 }}
          animate={{ x: 0 }}
          exit={{ x: -320 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed left-0 top-0 h-full w-80 bg-gray-900/95 backdrop-blur-md border-r border-blue-500/30 z-40 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">Zones</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Zone List */}
          <div className="overflow-y-auto h-[calc(100vh-80px)] p-4 space-y-2">
            {zones.map((zone) => {
              const isSelected = selectedZoneId === zone.zoneId;
              const occupancyPercent = (zone.currentOccupancy / zone.capacity) * 100;
              const isOverCapacity = occupancyPercent >= 80;
              const color = getZoneColor(zone.zoneType);

              return (
                <motion.button
                  key={zone.zoneId}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedZone(zone.zoneId)}
                  className={`w-full p-4 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-blue-500/20 border-blue-500'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {/* Zone Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-medium text-white text-sm">
                        {zone.zoneName}
                      </span>
                    </div>
                    {isOverCapacity && (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                  </div>

                  {/* Zone Type */}
                  <div className="text-xs text-gray-400 mb-2 text-left">
                    {zone.zoneType.charAt(0).toUpperCase() + zone.zoneType.slice(1)}
                  </div>

                  {/* Occupancy Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Occupancy</span>
                      <span
                        className={`font-medium ${
                          isOverCapacity ? 'text-red-400' : 'text-green-400'
                        }`}
                      >
                        {zone.currentOccupancy}/{zone.capacity}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${occupancyPercent}%` }}
                        transition={{ duration: 0.5 }}
                        className={`h-full ${
                          isOverCapacity
                            ? 'bg-gradient-to-r from-red-500 to-red-600'
                            : 'bg-gradient-to-r from-green-500 to-green-600'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Readers Count */}
                  <div className="mt-2 text-xs text-gray-500">
                    {zone.readers.length} reader{zone.readers.length !== 1 ? 's' : ''}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
