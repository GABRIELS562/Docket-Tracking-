import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8080';

let socket: Socket | null = null;

export const initializeSocket = () => {
  if (socket) return socket;

  socket = io(WS_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  socket.on('connect', () => console.log('✓ WebSocket connected'));
  socket.on('disconnect', () => console.log('✗ WebSocket disconnected'));

  return socket;
};

export const getSocket = () => socket || initializeSocket();

export const subscribeToZones = (zoneIds: number[]) => {
  const socket = getSocket();
  socket.emit('subscribe:zones', zoneIds);
};

export const subscribeToDocket = (labNumber: string) => {
  const socket = getSocket();
  socket.emit('subscribe:docket', labNumber);
};

export const subscribeToReaders = () => {
  const socket = getSocket();
  socket.emit('subscribe:readers');
};
