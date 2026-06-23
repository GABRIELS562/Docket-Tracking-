import { Play, Pause, SkipBack } from 'lucide-react';

/**
 * UI POLISH - PlaybackControls
 *
 * ECC make-interfaces-feel-better principles applied:
 * 1. Hit Areas: all buttons have minimum 44px touch targets
 * 2. Transition Scope: specific properties (transform, background-color, box-shadow)
 * 3. Motion: scale(0.96) press state
 * 4. Optical Alignment: Play icon shifted slightly right (triangle shape)
 * 5. Tabular Numbers: speed indicators use tabular-nums
 */

interface PlaybackControlsProps {
  isPlaying: boolean;
  playbackSpeed: 1 | 2 | 5 | 10;
  onTogglePlay: () => void;
  onSkipToStart: () => void;
  onSpeedChange: (speed: 1 | 2 | 5 | 10) => void;
}

export function PlaybackControls({
  isPlaying,
  playbackSpeed,
  onTogglePlay,
  onSkipToStart,
  onSpeedChange,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Skip to start - 44px hit area */}
      <button
        onClick={onSkipToStart}
        className="
          p-2 min-w-[44px] min-h-[44px]
          flex items-center justify-center
          bg-gray-800 hover:bg-gray-700 rounded-lg
          focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
          transition-[background-color,transform] duration-150 ease-out
          active:scale-[0.96]
        "
        title="Skip to start"
        aria-label="Skip to start"
      >
        <SkipBack className="w-5 h-5 text-gray-400" />
      </button>

      {/* Play/Pause - larger primary action, 48px */}
      <button
        onClick={onTogglePlay}
        className="
          p-3 min-w-[48px] min-h-[48px]
          flex items-center justify-center
          bg-blue-600 hover:bg-blue-700 rounded-lg
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
          transition-[background-color,transform,box-shadow] duration-150 ease-out
          active:scale-[0.96]
          shadow-[0_2px_8px_0_rgba(59,130,246,0.3)]
          hover:shadow-[0_4px_12px_0_rgba(59,130,246,0.4)]
        "
        title={isPlaying ? 'Pause' : 'Play'}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 text-white" />
        ) : (
          // Optical alignment: Play icon (triangle) needs slight right shift
          <Play className="w-5 h-5 text-white translate-x-[1px]" />
        )}
      </button>

      {/* Speed controls - tabular-nums for consistent width */}
      <div className="flex items-center gap-1 ml-2">
        {([1, 2, 5, 10] as const).map((speed) => (
          <button
            key={speed}
            onClick={() => onSpeedChange(speed)}
            className={`
              px-3 py-1.5 min-h-[44px] rounded-lg
              text-sm font-medium tabular-nums
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
              transition-[background-color,transform,color] duration-150 ease-out
              active:scale-[0.96]
              ${
                playbackSpeed === speed
                  ? 'bg-blue-600 text-white focus-visible:ring-blue-500'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white focus-visible:ring-gray-500'
              }
            `}
            aria-pressed={playbackSpeed === speed}
          >
            {speed}x
          </button>
        ))}
      </div>
    </div>
  );
}
