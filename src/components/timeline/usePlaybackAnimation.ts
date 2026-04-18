import { useEffect, useRef, useState } from 'react';
import { subHours } from 'date-fns';

interface PlaybackState {
  isPlaying: boolean;
  playbackTime: number;
  playbackSpeed: 1 | 2 | 5 | 10;
}

interface PlaybackActions {
  setIsPlaying: (playing: boolean) => void;
  setPlaybackTime: (time: number) => void;
  setPlaybackMode: (mode: boolean) => void;
}

interface UsePlaybackAnimationReturn {
  startTime: number;
  endTime: number;
  isDragging: boolean;
  sliderRef: React.RefObject<HTMLDivElement>;
  currentPosition: number;
  togglePlay: () => void;
  returnToLive: () => void;
  handleSliderClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleSliderDragStart: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function usePlaybackAnimation(
  state: PlaybackState,
  actions: PlaybackActions,
  isPlaybackMode: boolean
): UsePlaybackAnimationReturn {
  const { isPlaying, playbackTime, playbackSpeed } = state;
  const { setIsPlaying, setPlaybackTime, setPlaybackMode } = actions;

  const [isDragging, setIsDragging] = useState(false);
  const animationFrameRef = useRef<number>();
  const sliderRef = useRef<HTMLDivElement>(null);

  // Time range: Last 24 hours
  const now = Date.now();
  const startTime = subHours(now, 24).getTime();
  const endTime = now;

  // Calculate slider position (0-100%)
  const getSliderPosition = (time: number): number => {
    return ((time - startTime) / (endTime - startTime)) * 100;
  };

  // Calculate time from slider position (0-100%)
  const getTimeFromPosition = (position: number): number => {
    return startTime + (position / 100) * (endTime - startTime);
  };

  const currentPosition = getSliderPosition(playbackTime);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const returnToLive = () => {
    setPlaybackMode(false);
    setIsPlaying(false);
    setPlaybackTime(Date.now());
  };

  // Animation loop for playback
  useEffect(() => {
    if (!isPlaying || !isPlaybackMode) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    let lastTimestamp = performance.now();

    const animate = (timestamp: number) => {
      const deltaTime = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      const timeAdvance = deltaTime * playbackSpeed;
      const newTime = playbackTime + timeAdvance;

      if (newTime >= endTime) {
        setPlaybackTime(endTime);
        setIsPlaying(false);
      } else {
        setPlaybackTime(newTime);
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    isPlaying,
    playbackTime,
    playbackSpeed,
    endTime,
    setPlaybackTime,
    setIsPlaying,
    isPlaybackMode,
  ]);

  // Handle slider interactions
  const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = (x / rect.width) * 100;
    const newTime = getTimeFromPosition(Math.max(0, Math.min(100, position)));

    setPlaybackTime(newTime);
    setPlaybackMode(true);
  };

  const handleSliderDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleSliderClick(e);
  };

  const handleSliderDrag = (e: MouseEvent) => {
    if (!isDragging || !sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = (x / rect.width) * 100;
    const newTime = getTimeFromPosition(Math.max(0, Math.min(100, position)));

    setPlaybackTime(newTime);
  };

  const handleSliderDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleSliderDrag);
      window.addEventListener('mouseup', handleSliderDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleSliderDrag);
        window.removeEventListener('mouseup', handleSliderDragEnd);
      };
    }
  }, [isDragging]);

  return {
    startTime,
    endTime,
    isDragging,
    sliderRef,
    currentPosition,
    togglePlay,
    returnToLive,
    handleSliderClick,
    handleSliderDragStart,
  };
}
