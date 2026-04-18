interface StatusIndicatorProps {
  isPlaying: boolean;
  playbackSpeed: 1 | 2 | 5 | 10;
  playbackTime: number;
  endTime: number;
}

export function StatusIndicator({
  isPlaying,
  playbackSpeed,
  playbackTime,
  endTime,
}: StatusIndicatorProps) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between text-xs">
      <div className="text-gray-500">Viewing historical data from the past 24 hours</div>
      <div className="flex items-center gap-2">
        {isPlaying && (
          <span className="flex items-center gap-2 text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Playing at {playbackSpeed}x speed
          </span>
        )}
        {!isPlaying && playbackTime < endTime && <span className="text-yellow-400">Paused</span>}
        {playbackTime >= endTime && <span className="text-gray-400">End of timeline</span>}
      </div>
    </div>
  );
}
