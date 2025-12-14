import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { initializeSocket, subscribeToReaders } from './lib/socket';
import { zoneApi, readerApi, docketApi } from './lib/api';
import { useStore } from './store/useStore';
import { useNotifications } from './hooks/useNotifications';
import { mockZones, mockReaders, mockDockets, simulateRealtimeUpdates } from './lib/mockData';
import Navigation from './components/Navigation';
import Scene3D from './components/3d/Scene3D';
import FloorPlan2D from './components/FloorPlan2D';
import Dashboard from './components/Dashboard';
import ControlPanel from './components/ControlPanel';
import ZoneListPanel from './components/ZoneListPanel';
import DocketSearchPanel from './components/DocketSearchPanel';
import DocketDetailModal from './components/DocketDetailModal';
import ReaderMonitorPanel from './components/ReaderMonitorPanel';
import TimelinePlayback from './components/TimelinePlayback';
import NotificationSystem from './components/NotificationSystem';
import NotificationHistory from './components/NotificationHistory';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

export default function App() {
  const {
    setZones,
    setReaders,
    setIsConnected,
    updateZoneOccupancy,
    updateReaderStatus,
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
    isDemoMode,
    docketLimit
  } = useStore();

  const {
    notifications,
    history,
    soundEnabled,
    removeNotification,
    markAsRead,
    clearHistory,
    toggleSound,
    success,
    error,
    warning,
    info,
  } = useNotifications();

  // Use mock data in demo mode, real API otherwise
  const { data: apiZones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: zoneApi.getAll,
    enabled: !isDemoMode,
  });

  const { data: apiReaders = [] } = useQuery({
    queryKey: ['readers'],
    queryFn: readerApi.getAll,
    enabled: !isDemoMode,
  });

  const { data: apiDocketsData } = useQuery({
    queryKey: ['dockets'],
    queryFn: () => docketApi.search({ limit: 100 }),
    enabled: !isDemoMode,
  });

  // Select data source based on mode
  const zones = isDemoMode ? mockZones : apiZones;
  const readers = isDemoMode ? mockReaders : apiReaders;
  const allDockets = isDemoMode ? mockDockets : (apiDocketsData?.data || []);

  // Apply docket limit for 3D view performance
  const dockets = allDockets.slice(0, docketLimit);

  useEffect(() => {
    if (zones.length > 0) setZones(zones);
  }, [zones, setZones]);

  useEffect(() => {
    if (readers.length > 0) setReaders(readers);
  }, [readers, setReaders]);

  useEffect(() => {
    // In demo mode, use simulated updates
    if (isDemoMode) {
      setIsConnected(true);

      const cleanup = simulateRealtimeUpdates({
        onZoneOccupancy: (data) => {
          updateZoneOccupancy(data.zoneId, data.occupancy);
        },
        onReaderStatus: (data) => {
          updateReaderStatus(data.readerId, data.status);
          if (data.status === 'offline') {
            const reader = mockReaders.find((r) => r.readerId === data.readerId);
            if (reader) {
              warning('Reader Offline', `${reader.readerName} has gone offline`, {
                readerId: data.readerId,
              });
            }
          }
        },
        onOverCapacity: (data) => {
          error('Zone Over Capacity', `${data.zoneName} has exceeded capacity`, {
            zoneId: data.zoneId,
            occupancy: data.occupancy,
            capacity: data.capacity,
          });
        },
      });

      return cleanup;
    }

    // Real WebSocket mode
    const socket = initializeSocket();

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('✓ WebSocket connected');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('✗ WebSocket disconnected');
    });

    // Subscribe to zones
    if (zones.length > 0) {
      socket.emit('subscribe:zones', zones.map(z => z.zoneId));
    }

    // Subscribe to readers
    subscribeToReaders();

    // Listen for zone occupancy updates
    socket.on('zone:occupancy', (data: { zoneId: number; occupancy: number }) => {
      updateZoneOccupancy(data.zoneId, data.occupancy);
    });

    // Listen for reader status updates
    socket.on('reader:status', (data: { readerId: string; status: 'online' | 'offline' | 'error' | 'connecting' }) => {
      console.log('Reader status update:', data);
      updateReaderStatus(data.readerId, data.status);
    });

    // Listen for zone overcapacity alerts
    socket.on('zone:overcapacity', (data: { zoneId: number; zoneName: string; occupancy: number; capacity: number }) => {
      error(
        'Zone Over Capacity',
        `${data.zoneName} has exceeded capacity (${data.occupancy}/${data.capacity})`,
        {
          zoneId: data.zoneId,
          occupancy: data.occupancy,
          capacity: data.capacity,
        }
      );
    });

    // Listen for reader offline alerts
    socket.on('reader:offline', (data: { readerId: string; readerName: string; lastSeen: string }) => {
      warning(
        'Reader Offline',
        `${data.readerName} (${data.readerId}) has gone offline`,
        {
          readerId: data.readerId,
          lastSeen: data.lastSeen,
        }
      );
    });

    // Listen for missing docket alerts
    socket.on('docket:missing', (data: { labNumber: string; caseReference: string; lastSeenAt: string; lastZone: string }) => {
      warning(
        'Docket Missing',
        `${data.labNumber} (${data.caseReference}) not seen in 30 minutes`,
        {
          labNumber: data.labNumber,
          lastZone: data.lastZone,
          lastSeenAt: data.lastSeenAt,
        }
      );
    });

    // Listen for new docket registration
    socket.on('docket:registered', (data: { labNumber: string; caseReference: string; rfidEpc: string }) => {
      success(
        'New Docket Registered',
        `${data.labNumber} (${data.caseReference}) has been registered`,
        {
          labNumber: data.labNumber,
          rfidEpc: data.rfidEpc,
        }
      );
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('zone:occupancy');
      socket.off('reader:status');
      socket.off('zone:overcapacity');
      socket.off('reader:offline');
      socket.off('docket:missing');
      socket.off('docket:registered');
    };
  }, [zones, setIsConnected, updateZoneOccupancy, updateReaderStatus, success, error, warning, info, isDemoMode]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Dashboard (3D View) */}
        <Route
          path="/"
          element={
            <div className="w-full h-screen overflow-hidden bg-gray-900">
              {/* 3D Only Mode */}
              {floorPlanMode === '3d' && (
                <>
                  <Scene3D zones={zones} dockets={dockets} />
                  <Dashboard zones={zones} dockets={dockets} readers={readers} />
                </>
              )}

              {/* 2D Only Mode */}
              {floorPlanMode === '2d' && (
                <>
                  <FloorPlan2D zones={zones} dockets={dockets} />
                  <Dashboard zones={zones} dockets={dockets} readers={readers} />
                </>
              )}

              {/* Split Screen Mode */}
              {floorPlanMode === 'split' && (
                <>
                  <div className="absolute inset-0 flex">
                    {/* Left: 3D View */}
                    <div className="w-1/2 h-full relative">
                      <Scene3D zones={zones} dockets={dockets} />
                    </div>
                    {/* Right: 2D View */}
                    <div className="w-1/2 h-full relative border-l-2 border-blue-500/30">
                      <FloorPlan2D zones={zones} dockets={dockets} />
                    </div>
                  </div>
                  <Dashboard zones={zones} dockets={dockets} readers={readers} />
                </>
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

              {/* Reader Monitor Panel */}
              <ReaderMonitorPanel
                readers={readers}
                isOpen={isReaderPanelOpen}
                onToggle={() => setReaderPanelOpen(!isReaderPanelOpen)}
              />

              {/* Timeline Playback */}
              <TimelinePlayback />

              {/* Docket Detail Modal */}
              <DocketDetailModal
                docket={selectedDocket}
                isOpen={isDocketModalOpen}
                onClose={() => setSelectedDocket(null)}
              />

              {/* Navigation Overlay */}
              <div className="absolute top-0 left-0 right-0 z-50">
                <Navigation />
              </div>

              {/* Notification System */}
              <NotificationSystem
                notifications={notifications}
                soundEnabled={soundEnabled}
                onRemove={removeNotification}
                onToggleSound={toggleSound}
                onViewHistory={() => setNotificationHistoryOpen(true)}
              />

              {/* Notification History Panel */}
              <NotificationHistory
                isOpen={isNotificationHistoryOpen}
                history={history}
                onClose={() => setNotificationHistoryOpen(false)}
                onClearHistory={clearHistory}
                onMarkAsRead={markAsRead}
              />
            </div>
          }
        />

        {/* Analytics Page */}
        <Route
          path="/analytics"
          element={
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
              <Navigation />
              <Analytics />
            </div>
          }
        />

        {/* Settings Page */}
        <Route
          path="/settings"
          element={
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
              <Navigation />
              <Settings />
            </div>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
