import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, Radio, Calendar, Clock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { format, subHours } from 'date-fns';

export default function TimelinePlayback() {
  const {
    isPlaybackMode,
    playbackTime,
    playbackSpeed,
    isPlaying,
    setPlaybackMode,
    setPlaybackTime,
    setPlaybackSpeed,
    setIsPlaying,
  } = useStore();

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

  // Handle play/pause
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  // Handle speed change
  const changeSpeed = (speed: 1 | 2 | 5 | 10) => {
    setPlaybackSpeed(speed);
  };

  // Return to live mode
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

      // Advance time based on speed (deltaTime is in ms, speed is multiplier)
      const timeAdvance = deltaTime * playbackSpeed;
      const newTime = playbackTime + timeAdvance;

      if (newTime >= endTime) {
        // Reached end of timeline
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

  // Handle slider drag
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

  // Don't show if not in playback mode
  if (!isPlaybackMode) return null;

  const currentPosition = getSliderPosition(playbackTime);
  const currentDate = new Date(playbackTime);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-32 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl pointer-events-auto z-40"
      >
        <div className="bg-gray-900/95 backdrop-blur-md rounded-2xl border border-blue-500/30 shadow-2xl p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Radio className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Timeline Playback</h3>
                <p className="text-xs text-gray-400">4D Historical Visualization</p>
              </div>
            </div>

            {/* Live Button */}
            <button
              onClick={returnToLive}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </button>
          </div>

          {/* Timeline Slider */}
          <div className="mb-4">
            <div
              ref={sliderRef}
              className="relative h-12 bg-gray-800 rounded-lg cursor-pointer overflow-hidden"
              onClick={handleSliderClick}
              onMouseDown={handleSliderDragStart}
            >
              {/* Progress bar */}
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all"
                style={{ width: `${currentPosition}%` }}
              />

              {/* Scrubber handle */}
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-8 bg-white rounded-lg shadow-lg cursor-grab active:cursor-grabbing"
                style={{ left: `${currentPosition}%`, transform: 'translate(-50%, -50%)' }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-blue-400 to-purple-400 rounded-lg" />
              </motion.div>

              {/* Time markers */}
              <div className="absolute inset-0 flex justify-between items-end px-2 pb-1 pointer-events-none">
                {[0, 6, 12, 18, 24].map((hour) => (
                  <div key={hour} className="text-xs text-gray-500">
                    -{24 - hour}h
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            {/* Left: Playback controls */}
            <div className="flex items-center gap-2">
              {/* Skip to start */}
              <button
                onClick={() => setPlaybackTime(startTime)}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                title="Skip to start"
              >
                <SkipBack className="w-5 h-5 text-gray-400" />
              </button>

              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </button>

              {/* Speed controls */}
              <div className="flex items-center gap-1 ml-2">
                {([1, 2, 5, 10] as const).map((speed) => (
                  <button
                    key={speed}
                    onClick={() => changeSpeed(speed)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      playbackSpeed === speed
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Current time display */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>{format(currentDate, 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-white font-mono">
                <Clock className="w-4 h-4" />
                <span>{format(currentDate, 'HH:mm:ss')}</span>
              </div>
            </div>
          </div>

          {/* Status indicators */}
          <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between text-xs">
            <div className="text-gray-500">Viewing historical data from the past 24 hours</div>
            <div className="flex items-center gap-2">
              {isPlaying && (
                <span className="flex items-center gap-2 text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Playing at {playbackSpeed}x speed
                </span>
              )}
              {!isPlaying && playbackTime < endTime && (
                <span className="text-yellow-400">Paused</span>
              )}
              {playbackTime >= endTime && <span className="text-gray-400">End of timeline</span>}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
