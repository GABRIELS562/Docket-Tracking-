import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Package, MapPin, Clock } from 'lucide-react';
import { Docket } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { formatRelativeTime } from '@/lib/utils';

interface Props {
  dockets: Docket[];
  isOpen: boolean;
  onClose: () => void;
}

export default function DocketSearchPanel({ dockets, isOpen, onClose }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const { setSelectedZone } = useStore();

  // Filter dockets based on search query
  const filteredDockets = useMemo(() => {
    if (!searchQuery.trim()) {
      return dockets.slice(0, 10); // Show only recent 10 if no search
    }

    const query = searchQuery.toLowerCase();
    return dockets.filter(
      (d) =>
        d.labNumber.toLowerCase().includes(query) ||
        d.caseReference.toLowerCase().includes(query) ||
        d.rfidEpc.toLowerCase().includes(query)
    );
  }, [dockets, searchQuery]);

  const handleDocketClick = (docket: Docket) => {
    if (docket.currentZone) {
      setSelectedZone(docket.currentZone.id);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          exit={{ x: 400 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-[400px] bg-gray-900/95 backdrop-blur-md border-l border-blue-500/30 z-40 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">Dockets</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search lab number, case ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Total Dockets</span>
              <span className="font-bold text-white">{dockets.length}</span>
            </div>
            {searchQuery && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-400">Search Results</span>
                <span className="font-bold text-blue-400">{filteredDockets.length}</span>
              </div>
            )}
          </div>

          {/* Docket List */}
          <div className="overflow-y-auto h-[calc(100vh-220px)] p-4 space-y-2">
            {filteredDockets.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No dockets found</p>
              </div>
            ) : (
              filteredDockets.map((docket) => (
                <DocketCard
                  key={docket.labNumber}
                  docket={docket}
                  onClick={() => handleDocketClick(docket)}
                />
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface DocketCardProps {
  docket: Docket;
  onClick: () => void;
}

function DocketCard({ docket, onClick }: DocketCardProps) {
  const statusColors = {
    active: 'text-green-400 bg-green-500/10 border-green-500/30',
    archived: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
    missing: 'text-red-400 bg-red-500/10 border-red-500/30',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full p-3 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-gray-600 transition-all text-left"
    >
      {/* Lab Number */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono font-bold text-white text-sm">
          {docket.labNumber}
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
            statusColors[docket.status]
          }`}
        >
          {docket.status}
        </span>
      </div>

      {/* Case Reference */}
      <div className="text-xs text-gray-400 mb-2">
        Case: {docket.caseReference}
      </div>

      {/* Current Zone */}
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-3 h-3 text-blue-400" />
        <span className="text-xs text-blue-400">
          {docket.currentZone?.name || 'Unknown Location'}
        </span>
      </div>

      {/* Last Seen */}
      {docket.lastSeenAt && (
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-gray-500" />
          <span className="text-xs text-gray-500">
            {formatRelativeTime(docket.lastSeenAt)}
          </span>
        </div>
      )}

      {/* RFID EPC */}
      <div className="mt-2 pt-2 border-t border-gray-700">
        <span className="text-xs font-mono text-gray-600">
          {docket.rfidEpc}
        </span>
      </div>
    </motion.button>
  );
}
