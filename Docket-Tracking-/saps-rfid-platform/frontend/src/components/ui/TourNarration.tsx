import { useState, useEffect } from 'react';
import { Radio, MapPin, Package, Shield, Truck, Box, Settings, Clipboard } from 'lucide-react';

/**
 * Tour stop information
 */
interface TourStop {
  id: number;
  title: string;
  description: string;
  readers: string[];
  icon: React.ReactNode;
  color: string;
}

const TOUR_STOPS: TourStop[] = [
  {
    id: 0,
    title: 'Warehouse Overview',
    description: 'Multi-tenant RFID tracking platform with 14 strategically placed readers',
    readers: ['All 14 readers'],
    icon: <Package className="w-6 h-6" />,
    color: '#3b82f6',
  },
  {
    id: 1,
    title: 'Receiving Dock',
    description: 'Inbound items are scanned automatically as they enter the facility',
    readers: ['R1', 'R2'],
    icon: <Truck className="w-6 h-6" />,
    color: '#22c55e',
  },
  {
    id: 2,
    title: 'Shipping Dock',
    description: 'Outbound verification ensures correct items leave the facility',
    readers: ['S1', 'S2'],
    icon: <Truck className="w-6 h-6" />,
    color: '#8b5cf6',
  },
  {
    id: 3,
    title: 'Storage Area A',
    description: 'Primary storage with north and south reader coverage',
    readers: ['A-N', 'A-S'],
    icon: <Box className="w-6 h-6" />,
    color: '#3b82f6',
  },
  {
    id: 4,
    title: 'Storage Area B',
    description: 'Secondary storage zone with full RFID coverage',
    readers: ['B-N', 'B-S'],
    icon: <Box className="w-6 h-6" />,
    color: '#3b82f6',
  },
  {
    id: 5,
    title: 'Processing Zone',
    description: 'Items are processed, inspected, and prepared for storage or shipping',
    readers: ['PROC'],
    icon: <Settings className="w-6 h-6" />,
    color: '#eab308',
  },
  {
    id: 6,
    title: 'Secure Storage',
    description: 'High-security zone with dual-reader verification for critical items',
    readers: ['SEC1', 'SEC2'],
    icon: <Shield className="w-6 h-6" />,
    color: '#ef4444',
  },
  {
    id: 7,
    title: 'Staging Area',
    description: 'Items awaiting shipment are staged and verified',
    readers: ['STG'],
    icon: <Clipboard className="w-6 h-6" />,
    color: '#14b8a6',
  },
  {
    id: 8,
    title: 'Complete Coverage',
    description: 'Real-time visibility across all zones - 100% inventory accuracy',
    readers: ['14 total readers'],
    icon: <Radio className="w-6 h-6" />,
    color: '#06b6d4',
  },
];

/**
 * Tour Narration Component
 *
 * Shows tour progress and current zone information during the automated tour
 */
const TourNarration = () => {
  const [isTouring, setIsTouring] = useState(false);
  const [currentStop, setCurrentStop] = useState(0);

  // Listen for tour start/stop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 't' && !isTouring) {
        if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
          startTour();
        }
      }
      if (e.key === 'Escape' && isTouring) {
        stopTour();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTouring]);

  const startTour = () => {
    setIsTouring(true);
    setCurrentStop(0);

    // Progress through stops (4 seconds per stop = 2.5s animation + 1.5s pause)
    let stop = 0;
    const interval = setInterval(() => {
      stop++;
      if (stop >= TOUR_STOPS.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsTouring(false);
        }, 2000);
      } else {
        setCurrentStop(stop);
      }
    }, 4000);

    // Store interval for cleanup
    (window as any).__tourInterval = interval;
  };

  const stopTour = () => {
    setIsTouring(false);
    if ((window as any).__tourInterval) {
      clearInterval((window as any).__tourInterval);
    }
  };

  if (!isTouring) return null;

  const stop = TOUR_STOPS[currentStop];

  return (
    <div className="fixed top-32 left-1/2 -translate-x-1/2 z-50">
      {/* Main card */}
      <div
        className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border-2 shadow-2xl overflow-hidden min-w-[400px] animate-fade-in"
        style={{ borderColor: `${stop.color}50` }}
      >
        {/* Progress bar */}
        <div className="h-1 bg-slate-800">
          <div
            className="h-full transition-all duration-300 ease-out"
            style={{
              width: `${((currentStop + 1) / TOUR_STOPS.length) * 100}%`,
              backgroundColor: stop.color,
            }}
          />
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center gap-4 mb-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${stop.color}20`, color: stop.color }}
            >
              {stop.icon}
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">
                Stop {currentStop + 1} of {TOUR_STOPS.length}
              </div>
              <h3 className="text-xl font-bold text-white">{stop.title}</h3>
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-300 text-sm mb-4">{stop.description}</p>

          {/* Readers */}
          <div className="flex items-center gap-2 flex-wrap">
            <Radio className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">Readers:</span>
            {stop.readers.map((reader, i) => (
              <span
                key={i}
                className="px-2 py-1 rounded text-xs font-mono"
                style={{ backgroundColor: `${stop.color}20`, color: stop.color }}
              >
                {reader}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-black/20 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MapPin className="w-3 h-3" />
            <span>Automated tour in progress</span>
          </div>
          <button
            onClick={stopTour}
            className="px-3 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            Press ESC to stop
          </button>
        </div>
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default TourNarration;
