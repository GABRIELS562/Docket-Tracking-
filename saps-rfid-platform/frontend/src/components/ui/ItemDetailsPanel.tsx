import { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Navigation,
  MapPin,
  Radio,
  Eye,
  EyeOff,
  History,
  Clock,
  ArrowRight,
  Shield,
  FileText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useSceneStore } from '../../stores/sceneStore';
import { useAIAnalyticsStore } from '../../stores/aiAnalyticsStore';

/**
 * SAPS Forensic Lab zone colors mapping
 */
const ZONE_COLORS: Record<string, { bg: string; text: string; name: string; border: string }> = {
  'entry': { bg: 'bg-blue-500/20', text: 'text-blue-400', name: 'Entry into Lab', border: 'border-blue-500/30' },
  'extractions': { bg: 'bg-green-500/20', text: 'text-green-400', name: 'Extractions - Sgt Pillay', border: 'border-green-500/30' },
  'qpcr-lab': { bg: 'bg-purple-500/20', text: 'text-purple-400', name: 'QPCR Lab - Sgt Mulder', border: 'border-purple-500/30' },
  'pcr-lab': { bg: 'bg-amber-500/20', text: 'text-amber-400', name: 'PCR Lab - WO Jacobs', border: 'border-amber-500/30' },
  'electrophoresis': { bg: 'bg-cyan-500/20', text: 'text-cyan-400', name: 'Electrophoresis Lab', border: 'border-cyan-500/30' },
  'genemapper': { bg: 'bg-pink-500/20', text: 'text-pink-400', name: 'GeneMapper ID - WO Daniels', border: 'border-pink-500/30' },
  'chain-custody': { bg: 'bg-red-500/20', text: 'text-red-400', name: 'Chain of Custody', border: 'border-red-500/30' },
};

/**
 * Chain of custody event types
 */
interface CustodyEvent {
  id: string;
  zone: string;
  action: 'entered' | 'exited' | 'scanned' | 'verified';
  timestamp: Date;
  durationMinutes?: number;
  operator?: string;
  notes?: string;
}

/**
 * Generate realistic chain of custody history for SAPS Forensic Lab demo
 */
const generateCustodyHistory = (currentZone: string): CustodyEvent[] => {
  // SAPS Forensic Lab personnel
  const operators: Record<string, string> = {
    'entry': 'Evidence Clerk',
    'extractions': 'Sgt Pillay',
    'qpcr-lab': 'Sgt Mulder',
    'pcr-lab': 'WO Jacobs',
    'electrophoresis': 'Lab Technician',
    'genemapper': 'WO Daniels',
    'chain-custody': 'Evidence Officer',
  };

  const history: CustodyEvent[] = [];
  let currentTime = new Date();
  currentTime.setHours(currentTime.getHours() - Math.floor(Math.random() * 72) - 24); // 1-4 days ago

  // Entry into Lab (intake)
  history.push({
    id: '1',
    zone: 'entry',
    action: 'entered',
    timestamp: new Date(currentTime),
    operator: operators['entry'],
    notes: 'Evidence docket registered at lab entry',
  });

  // Extractions Lab
  currentTime.setMinutes(currentTime.getMinutes() + Math.floor(Math.random() * 60) + 30);
  history.push({
    id: '2',
    zone: 'extractions',
    action: 'entered',
    timestamp: new Date(currentTime),
    durationMinutes: Math.floor(Math.random() * 180) + 60,
    operator: operators['extractions'],
    notes: 'DNA extraction processing',
  });

  history.push({
    id: '3',
    zone: 'extractions',
    action: 'verified',
    timestamp: new Date(currentTime.getTime() + 30 * 60000),
    operator: operators['extractions'],
    notes: 'Sample integrity verified',
  });

  // QPCR or PCR Lab
  currentTime.setMinutes(currentTime.getMinutes() + Math.floor(Math.random() * 120) + 60);
  const labZone = Math.random() > 0.5 ? 'qpcr-lab' : 'pcr-lab';
  history.push({
    id: '4',
    zone: labZone,
    action: 'entered',
    timestamp: new Date(currentTime),
    durationMinutes: Math.floor(Math.random() * 240) + 120,
    operator: operators[labZone],
    notes: labZone === 'qpcr-lab' ? 'Quantitative PCR analysis' : 'PCR amplification',
  });

  // If not in current zone, add movement through workflow
  if (currentZone !== labZone && currentZone !== 'extractions' && currentZone !== 'entry') {
    currentTime.setMinutes(currentTime.getMinutes() + Math.floor(Math.random() * 60) + 30);
    history.push({
      id: '5',
      zone: currentZone,
      action: 'entered',
      timestamp: new Date(currentTime),
      operator: operators[currentZone] || 'Lab Technician',
      notes: currentZone === 'chain-custody' ? 'Final custody confirmation' : 'Processing continued',
    });
  }

  // Most recent scan
  history.push({
    id: '6',
    zone: currentZone,
    action: 'scanned',
    timestamp: new Date(),
    operator: 'RFID System',
    notes: 'Automated location update',
  });

  return history;
};

/**
 * Item Details Panel
 *
 * Shows detailed information about a selected item including:
 * - Full chain of custody timeline
 * - Movement tracking
 * - Evidence verification status
 */
const ItemDetailsPanel = () => {
  // Use individual selectors to avoid re-renders when unrelated state changes
  const selectedItem = useSceneStore((s) => s.selectedItem);
  const selectItem = useSceneStore((s) => s.selectItem);
  const flyToItem = useSceneStore((s) => s.flyToItem);
  const items = useSceneStore(useShallow((s) => s.items));

  // Tenant config
  const tenantConfig = useAIAnalyticsStore((s) => s.tenantConfig);
  const itemTerm = tenantConfig?.itemTerm || 'Item';

  const [isTracking, setIsTracking] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [custodyHistory, setCustodyHistory] = useState<CustodyEvent[]>([]);

  // Use refs to avoid useEffect dependency issues
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const flyToItemRef = useRef(flyToItem);
  flyToItemRef.current = flyToItem;
  const selectedItemRef = useRef(selectedItem);
  selectedItemRef.current = selectedItem;

  // Get zone styling
  const zoneStyle = selectedItem ? ZONE_COLORS[selectedItem.zone] || ZONE_COLORS['entry'] : null;

  // Generate custody history when item changes
  useEffect(() => {
    if (selectedItem) {
      setCustodyHistory(generateCustodyHistory(selectedItem.zone));
    }
  }, [selectedItem?.epc]);

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
  }, [isTracking, selectedItem?.epc]);

  // Clear tracking when item is deselected
  useEffect(() => {
    if (!selectedItem) {
      setIsTracking(false);
      setCustodyHistory([]);
    }
  }, [selectedItem]);

  // Calculate total time in custody
  const totalCustodyTime = useMemo(() => {
    if (custodyHistory.length === 0) return null;
    const firstEvent = custodyHistory[0];
    const diffMs = Date.now() - firstEvent.timestamp.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return { days, hours };
  }, [custodyHistory]);

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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getActionIcon = (action: CustodyEvent['action']) => {
    switch (action) {
      case 'entered': return <ArrowRight className="w-3 h-3" />;
      case 'exited': return <ArrowRight className="w-3 h-3 rotate-180" />;
      case 'scanned': return <Radio className="w-3 h-3" />;
      case 'verified': return <CheckCircle2 className="w-3 h-3" />;
    }
  };

  const getActionLabel = (action: CustodyEvent['action']) => {
    switch (action) {
      case 'entered': return 'Entered';
      case 'exited': return 'Exited';
      case 'scanned': return 'Scanned';
      case 'verified': return 'Verified';
    }
  };

  return (
    <div className="absolute bottom-24 left-4 z-30 w-96">
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isTracking ? 'bg-cyan-400 animate-pulse' : 'bg-green-400'}`} />
            <span className="text-white font-semibold text-sm">
              {itemTerm} Details
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1">
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
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${zoneStyle?.bg} border ${zoneStyle?.border}`}>
                <span className={`font-medium ${zoneStyle?.text}`}>
                  {zoneStyle?.name || selectedItem.zone}
                </span>
              </div>
            </div>

            {/* Custody Time */}
            {totalCustodyTime && (
              <div>
                <div className="text-xs text-gray-500 uppercase mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Time in Custody
                </div>
                <div className="text-white font-medium">
                  {totalCustodyTime.days > 0 && `${totalCustodyTime.days}d `}
                  {totalCustodyTime.hours}h
                </div>
              </div>
            )}

            {/* Chain of Custody Timeline */}
            <div>
              <button
                onClick={() => setShowFullHistory(!showFullHistory)}
                className="w-full flex items-center justify-between text-xs text-gray-500 uppercase mb-2"
              >
                <span className="flex items-center gap-1">
                  <History className="w-3 h-3" />
                  Chain of Custody ({custodyHistory.length} events)
                </span>
                {showFullHistory ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              <div className="space-y-0">
                {(showFullHistory ? custodyHistory : custodyHistory.slice(-4)).map((event, idx) => {
                  const style = ZONE_COLORS[event.zone] || ZONE_COLORS['entry'];
                  const isLast = idx === (showFullHistory ? custodyHistory.length - 1 : Math.min(custodyHistory.length - 1, 3));

                  return (
                    <div key={event.id} className="relative flex gap-3">
                      {/* Timeline line */}
                      {!isLast && (
                        <div className="absolute left-[11px] top-6 w-0.5 h-full bg-white/10" />
                      )}

                      {/* Timeline dot */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${style.bg} border ${style.border}`}>
                        <span className={style.text}>{getActionIcon(event.action)}</span>
                      </div>

                      {/* Event content */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-sm font-medium ${style.text}`}>
                            {getActionLabel(event.action)} {style.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{formatDate(event.timestamp)}</span>
                          <span>•</span>
                          <span>{formatTime(event.timestamp)}</span>
                          {event.operator && (
                            <>
                              <span>•</span>
                              <span>{event.operator}</span>
                            </>
                          )}
                        </div>
                        {event.notes && (
                          <div className="text-xs text-gray-400 mt-1 flex items-start gap-1">
                            <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {event.notes}
                          </div>
                        )}
                        {event.durationMinutes && event.durationMinutes > 60 && (
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {Math.floor(event.durationMinutes / 60)}h {event.durationMinutes % 60}m in zone
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!showFullHistory && custodyHistory.length > 4 && (
                <button
                  onClick={() => setShowFullHistory(true)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 mt-1"
                >
                  Show {custodyHistory.length - 4} more events...
                </button>
              )}
            </div>

            {/* Chain of Custody Zone Warning */}
            {selectedItem.zone === 'chain-custody' && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                <Shield className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-xs font-medium">Final Chain of Custody verification required</span>
              </div>
            )}

            {/* Verification Status */}
            <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-xs font-medium">Chain of custody verified</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t border-white/10 flex-shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleFlyTo}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-xl text-cyan-400 text-sm font-medium transition-all"
            >
              <Navigation className="w-4 h-4" />
              Fly To
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
                  Stop
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Track
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tracking Status Bar */}
        {isTracking && (
          <div className="px-4 py-2 bg-cyan-500/10 border-t border-cyan-500/20 flex-shrink-0">
            <div className="flex items-center gap-2 text-xs text-cyan-400">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>Camera following {itemTerm.toLowerCase()} in real-time</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemDetailsPanel;
