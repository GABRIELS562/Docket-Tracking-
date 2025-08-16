import { useEffect, useCallback } from 'react';
import { webSocketService } from '@/services/websocket';

export function useWebSocket() {
  useEffect(() => {
    webSocketService.connect();
    
    return () => {
      webSocketService.disconnect();
    };
  }, []);

  const subscribeToRfidEvents = useCallback((callback: (event: any) => void) => {
    webSocketService.onRfidEvent(callback);
    return () => webSocketService.offRfidEvent(callback);
  }, []);

  const subscribeToObjectUpdates = useCallback((callback: (object: any) => void) => {
    webSocketService.onObjectUpdate(callback);
    return () => webSocketService.offObjectUpdate(callback);
  }, []);

  const subscribeToLocationUpdates = useCallback((callback: (location: any) => void) => {
    webSocketService.onLocationUpdate(callback);
    return () => webSocketService.offLocationUpdate(callback);
  }, []);

  const subscribeToPersonnelUpdates = useCallback((callback: (personnel: any) => void) => {
    webSocketService.onPersonnelUpdate(callback);
    return () => webSocketService.offPersonnelUpdate(callback);
  }, []);

  const subscribeToReaderStatus = useCallback((callback: (reader: any) => void) => {
    webSocketService.onReaderStatus(callback);
    return () => webSocketService.offReaderStatus(callback);
  }, []);

  const subscribeToDashboardUpdates = useCallback((callback: (stats: any) => void) => {
    webSocketService.onDashboardUpdate(callback);
    return () => webSocketService.offDashboardUpdate(callback);
  }, []);

  const subscribeToAuditLogs = useCallback((callback: (log: any) => void) => {
    webSocketService.onAuditLogUpdate(callback);
    return () => webSocketService.offAuditLogUpdate(callback);
  }, []);

  const subscribeToNotifications = useCallback((callback: (notification: any) => void) => {
    webSocketService.onNotification(callback);
    return () => webSocketService.offNotification(callback);
  }, []);

  const joinRoom = useCallback((room: string) => {
    webSocketService.joinRoom(room);
  }, []);

  const leaveRoom = useCallback((room: string) => {
    webSocketService.leaveRoom(room);
  }, []);

  const isConnected = useCallback(() => {
    return webSocketService.isConnected();
  }, []);

  return {
    subscribeToRfidEvents,
    subscribeToObjectUpdates,
    subscribeToLocationUpdates,
    subscribeToPersonnelUpdates,
    subscribeToReaderStatus,
    subscribeToDashboardUpdates,
    subscribeToAuditLogs,
    subscribeToNotifications,
    joinRoom,
    leaveRoom,
    isConnected,
  };
}