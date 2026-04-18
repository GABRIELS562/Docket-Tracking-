import { motion } from 'framer-motion';
import { RefObject } from 'react';

interface TimelineSliderProps {
  sliderRef: RefObject<HTMLDivElement>;
  currentPosition: number;
  onSliderClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDragStart: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function TimelineSlider({
  sliderRef,
  currentPosition,
  onSliderClick,
  onDragStart,
}: TimelineSliderProps) {
  return (
    <div className="mb-4">
      <div
        ref={sliderRef}
        className="relative h-12 bg-gray-800 rounded-lg cursor-pointer overflow-hidden"
        onClick={onSliderClick}
        onMouseDown={onDragStart}
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
  );
}
