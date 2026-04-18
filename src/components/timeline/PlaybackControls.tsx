import { Play, Pause, SkipBack } from 'lucide-react';

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
      {/* Skip to start */}
      <button
        onClick={onSkipToStart}
        className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        title="Skip to start"
      >
        <SkipBack className="w-5 h-5 text-gray-400" />
      </button>

      {/* Play/Pause */}
      <button
        onClick={onTogglePlay}
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
            onClick={() => onSpeedChange(speed)}
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
  );
}
