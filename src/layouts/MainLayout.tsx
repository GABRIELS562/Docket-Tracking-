import { useState, useCallback } from 'react';
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
  } = notifications;

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
      </>
    );
  }

  if (mode === '2d') {
    return (
      <>
        <FloorPlan2D zones={zones} dockets={dockets} />
        <Dashboard zones={zones} dockets={dockets} readers={readers} />
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
    </>
  );
}
