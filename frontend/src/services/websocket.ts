import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token found for WebSocket connection');
      return;
    }

    this.socket = io(process.env.REACT_APP_WS_URL || 'http://localhost:3001', {
      auth: {
        token
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      
      this.socket?.emit('join-room', 'dashboard');
      this.socket?.emit('join-room', 'rfid-events');
      this.socket?.emit('join-room', 'object-updates');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.handleReconnect();
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  // Event listeners
  onRfidEvent(callback: (event: any) => void): void {
    this.socket?.on('rfid-event', callback);
  }

  onObjectUpdate(callback: (object: any) => void): void {
    this.socket?.on('object-update', callback);
  }

  onLocationUpdate(callback: (location: any) => void): void {
    this.socket?.on('location-update', callback);
  }

  onPersonnelUpdate(callback: (personnel: any) => void): void {
    this.socket?.on('personnel-update', callback);
  }

  onReaderStatus(callback: (reader: any) => void): void {
    this.socket?.on('reader-status', callback);
  }

  onDashboardUpdate(callback: (stats: any) => void): void {
    this.socket?.on('dashboard-update', callback);
  }

  onAuditLogUpdate(callback: (log: any) => void): void {
    this.socket?.on('audit-log', callback);
  }

  onNotification(callback: (notification: any) => void): void {
    this.socket?.on('notification', callback);
  }

  // Remove event listeners
  offRfidEvent(callback?: (event: any) => void): void {
    this.socket?.off('rfid-event', callback);
  }

  offObjectUpdate(callback?: (object: any) => void): void {
    this.socket?.off('object-update', callback);
  }

  offLocationUpdate(callback?: (location: any) => void): void {
    this.socket?.off('location-update', callback);
  }

  offPersonnelUpdate(callback?: (personnel: any) => void): void {
    this.socket?.off('personnel-update', callback);
  }

  offReaderStatus(callback?: (reader: any) => void): void {
    this.socket?.off('reader-status', callback);
  }

  offDashboardUpdate(callback?: (stats: any) => void): void {
    this.socket?.off('dashboard-update', callback);
  }

  offAuditLogUpdate(callback?: (log: any) => void): void {
    this.socket?.off('audit-log', callback);
  }

  offNotification(callback?: (notification: any) => void): void {
    this.socket?.off('notification', callback);
  }

  // Emit events
  joinRoom(room: string): void {
    this.socket?.emit('join-room', room);
  }

  leaveRoom(room: string): void {
    this.socket?.emit('leave-room', room);
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const webSocketService = new WebSocketService();
export default webSocketService;