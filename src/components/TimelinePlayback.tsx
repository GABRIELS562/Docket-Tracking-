import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import {
  usePlaybackAnimation,
  TimelineSlider,
  PlaybackControls,
  TimeDisplay,
  StatusIndicator,
} from './timeline';

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

  const {
    startTime,
    endTime,
    sliderRef,
    currentPosition,
    togglePlay,
    returnToLive,
    handleSliderClick,
    handleSliderDragStart,
  } = usePlaybackAnimation(
    { isPlaying, playbackTime, playbackSpeed },
    { setIsPlaying, setPlaybackTime, setPlaybackMode },
    isPlaybackMode
  );

  const handleClose = useCallback(() => {
    setPlaybackMode(false);
    setIsPlaying(false);
  }, [setPlaybackMode, setIsPlaying]);

  // ESC key to close timeline
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPlaybackMode) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaybackMode, handleClose]);

  return (
    <AnimatePresence>
      {isPlaybackMode && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-32 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl pointer-events-auto z-30"
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

              {/* Live Button & Close */}
              <div className="flex items-center gap-2">
                <button
                  onClick={returnToLive}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                  title="Return to live view"
                >
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  LIVE
                </button>
                <button
                  onClick={handleClose}
                  className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors"
                  title="Close timeline (or click Timeline button)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <TimelineSlider
              sliderRef={sliderRef}
              currentPosition={currentPosition}
              onSliderClick={handleSliderClick}
              onDragStart={handleSliderDragStart}
            />

            {/* Controls */}
            <div className="flex items-center justify-between">
              <PlaybackControls
                isPlaying={isPlaying}
                playbackSpeed={playbackSpeed}
                onTogglePlay={togglePlay}
                onSkipToStart={() => setPlaybackTime(startTime)}
                onSpeedChange={setPlaybackSpeed}
              />
              <TimeDisplay currentTime={playbackTime} />
            </div>

            <StatusIndicator
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              playbackTime={playbackTime}
              endTime={endTime}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
