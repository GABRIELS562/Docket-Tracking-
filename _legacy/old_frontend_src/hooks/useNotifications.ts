import { useState, useCallback, useRef, useEffect } from 'react';

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  metadata?: Record<string, any>;
}

const MAX_HISTORY = 50;

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [history, setHistory] = useState<Notification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = 0.3;
  }, []);

  const playSound = useCallback((type: NotificationType) => {
    if (!soundEnabled || !audioRef.current) return;

    // Use different frequencies for different notification types
    const frequencies: Record<NotificationType, number> = {
      success: 800,
      info: 600,
      warning: 500,
      error: 400,
    };

    const frequency = frequencies[type];

    // Generate beep using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  }, [soundEnabled]);

  const addNotification = useCallback(
    (
      type: NotificationType,
      title: string,
      message: string,
      metadata?: Record<string, any>
    ) => {
      const notification: Notification = {
        id: `${Date.now()}-${Math.random()}`,
        type,
        title,
        message,
        timestamp: new Date(),
        read: false,
        metadata,
      };

      // Add to active notifications
      setNotifications((prev) => [...prev, notification]);

      // Add to history (keep last 50)
      setHistory((prev) => {
        const newHistory = [notification, ...prev];
        return newHistory.slice(0, MAX_HISTORY);
      });

      // Play sound
      playSound(type);

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        removeNotification(notification.id);
      }, 5000);

      return notification.id;
    },
    [playSound]
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setHistory((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev);
  }, []);

  // Notification shortcuts
  const success = useCallback(
    (title: string, message: string, metadata?: Record<string, any>) =>
      addNotification('success', title, message, metadata),
    [addNotification]
  );

  const error = useCallback(
    (title: string, message: string, metadata?: Record<string, any>) =>
      addNotification('error', title, message, metadata),
    [addNotification]
  );

  const warning = useCallback(
    (title: string, message: string, metadata?: Record<string, any>) =>
      addNotification('warning', title, message, metadata),
    [addNotification]
  );

  const info = useCallback(
    (title: string, message: string, metadata?: Record<string, any>) =>
      addNotification('info', title, message, metadata),
    [addNotification]
  );

  return {
    notifications,
    history,
    soundEnabled,
    addNotification,
    removeNotification,
    markAsRead,
    clearHistory,
    toggleSound,
    success,
    error,
    warning,
    info,
  };
}
