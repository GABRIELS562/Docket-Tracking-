import { useState, useCallback, useEffect } from 'react';
import Navigation from '../components/Navigation';
import Scene3D from '../components/3d/Scene3D';
import FloorPlan2D from '../components/FloorPlan2D';
import Dashboard from '../components/Dashboard';
import ControlPanel from '../components/ControlPanel';
import ZoneListPanel from '../components/ZoneListPanel';
import DocketSearchPanel from '../components/DocketSearchPanel';
import DocketDetailModal from '../components/DocketDetailModal';
import ReaderMonitorPanel from '../components/ReaderMonitorPanel';
import TimelinePlayback from '../components/TimelinePlayback';
import NotificationSystem from '../components/NotificationSystem';
import NotificationHistory from '../components/NotificationHistory';
import { ZoneDetailView } from '../components/detail';
import { GlobalSearch } from '../components/shared';
import { HeroSearch } from '../components/search';
import { SimulationEngine } from '../components/simulation';
import { AlertToast } from '../components/alerts';
import MetricsPanel from '../components/dashboard/MetricsPanel';
import { useZoneStore } from '../store/useZoneStore';
import { useStore } from '../store/useStore';
import { useGlobalSearch } from '../hooks/useGlobalSearch';
import type { Docket } from '../lib/mockData';
import type { Zone, Reader } from '../lib/types';
import type { AppData } from '../hooks/useAppData';

interface MainLayoutProps {
  zones: Zone[];
  readers: Reader[];
  dockets: Docket[];
  notifications: AppData['notifications'];
}

export default function MainLayout({ zones, readers, dockets, notifications }: MainLayoutProps) {
  const [detailZone, setDetailZone] = useState<Zone | null>(null);
  const { isSearchOpen, closeSearch } = useGlobalSearch();
  const { setZones } = useZoneStore();

  // Sync zones to the zone store for search functionality
  useEffect(() => {
    setZones(zones);
  }, [zones, setZones]);

  const {
    isZonePanelOpen,
    isDocketPanelOpen,
    isReaderPanelOpen,
    setZonePanelOpen,
    setDocketPanelOpen,
    setReaderPanelOpen,
    selectedDocket,
    isDocketModalOpen,
    setSelectedDocket,
    floorPlanMode,
    isNotificationHistoryOpen,
    setNotificationHistoryOpen,
    setSelectedZone,
  } = useStore();

  const {
    notifications: activeNotifications,
    history,
    soundEnabled,
    removeNotification,
    markAsRead,
    clearHistory,
    toggleSound,
    warning,
    error,
    info,
  } = notifications;

  // Simulation notification handler
  const handleSimulationNotification = useCallback(
    (
      type: 'success' | 'warning' | 'error' | 'info',
      title: string,
      message: string,
      metadata?: Record<string, unknown>
    ) => {
      switch (type) {
        case 'warning':
          warning(title, message, metadata);
          break;
        case 'error':
          error(title, message, metadata);
          break;
        case 'info':
          info(title, message, metadata);
          break;
        default:
          info(title, message, metadata);
      }
    },
    [warning, error, info]
  );

  const handleZoneClick = useCallback(
    (zoneId: number) => {
      const zone = zones.find((z) => z.zoneId === zoneId);
      if (zone) {
        setDetailZone(zone);
      }
      setSelectedZone(zoneId);
    },
    [zones, setSelectedZone]
  );

  const handleCloseDetailView = useCallback(() => {
    setDetailZone(null);
  }, []);

  const handleSearchZoneNavigate = useCallback(
    (zoneName: string) => {
      const zone = zones.find((z) => z.zoneName === zoneName);
      if (zone) {
        setDetailZone(zone);
      }
    },
    [zones]
  );

  return (
    <div className="w-full h-screen overflow-hidden bg-gray-900">
      {/* Simulation Engine - runs background simulation */}
      <SimulationEngine onNotification={handleSimulationNotification} />

      {/* Zone Detail View (overlay) */}
      {detailZone && <ZoneDetailView zone={detailZone} onBack={handleCloseDetailView} />}

      {/* View Modes */}
      {!detailZone && (
        <ViewModes
          mode={floorPlanMode}
          zones={zones}
          dockets={dockets}
          readers={readers}
          onZoneClick={handleZoneClick}
        />
      )}

      <ControlPanel />

      {/* Live Metrics Panel - positioned at bottom left */}
      {!detailZone && (
        <div className="absolute bottom-4 left-4 z-40 pointer-events-auto">
          <MetricsPanel compact={false} className="w-72" />
        </div>
      )}

      {/* Sidebar Panels */}
      <ZoneListPanel
        zones={zones}
        isOpen={isZonePanelOpen}
        onClose={() => setZonePanelOpen(false)}
      />
      <DocketSearchPanel
        dockets={dockets}
        isOpen={isDocketPanelOpen}
        onClose={() => setDocketPanelOpen(false)}
      />
      <ReaderMonitorPanel
        readers={readers}
        isOpen={isReaderPanelOpen}
        onToggle={() => setReaderPanelOpen(!isReaderPanelOpen)}
      />

      <TimelinePlayback />

      <DocketDetailModal
        docket={selectedDocket}
        isOpen={isDocketModalOpen}
        onClose={() => setSelectedDocket(null)}
      />

      {/* Navigation Overlay */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <Navigation />
      </div>

      <NotificationSystem
        notifications={activeNotifications}
        soundEnabled={soundEnabled}
        onRemove={removeNotification}
        onToggleSound={toggleSound}
        onViewHistory={() => setNotificationHistoryOpen(true)}
      />

      <NotificationHistory
        isOpen={isNotificationHistoryOpen}
        history={history}
        onClose={() => setNotificationHistoryOpen(false)}
        onClearHistory={clearHistory}
        onMarkAsRead={markAsRead}
      />

      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={closeSearch}
        onZoneNavigate={handleSearchZoneNavigate}
      />

      {/* Simulation Alert Toasts - positioned at bottom right */}
      <AlertToast position="bottom-right" maxVisible={4} autoDismissMs={8000} />
    </div>
  );
}

interface ViewModesProps {
  mode: '3d' | '2d' | 'split';
  zones: Zone[];
  dockets: Docket[];
  readers: Reader[];
  onZoneClick: (zoneId: number) => void;
}

function ViewModes({ mode, zones, dockets, readers, onZoneClick }: ViewModesProps) {
  // Common HeroSearch component for all modes - the core "find any docket" experience
  const heroSearch = (
    <div className="absolute top-20 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
      <HeroSearch onLocate={(_item, zoneId) => onZoneClick(zoneId)} />
    </div>
  );

  if (mode === '3d') {
    return (
      <>
        <Scene3D
          zones={zones}
          dockets={dockets}
          useZoneCentricView={true}
          onZoneClick={onZoneClick}
        />
        <Dashboard zones={zones} dockets={dockets} readers={readers} />
        {heroSearch}
      </>
    );
  }

  if (mode === '2d') {
    return (
      <>
        <FloorPlan2D zones={zones} dockets={dockets} />
        <Dashboard zones={zones} dockets={dockets} readers={readers} />
        {heroSearch}
      </>
    );
  }

  // Split mode
  return (
    <>
      <div className="absolute inset-0 flex">
        <div className="w-1/2 h-full relative">
          <Scene3D
            zones={zones}
            dockets={dockets}
            useZoneCentricView={true}
            onZoneClick={onZoneClick}
          />
        </div>
        <div className="w-1/2 h-full relative border-l-2 border-blue-500/30">
          <FloorPlan2D zones={zones} dockets={dockets} />
        </div>
      </div>
      <Dashboard zones={zones} dockets={dockets} readers={readers} />
      {heroSearch}
    </>
  );
}
