import { Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface TimeDisplayProps {
  currentTime: number;
}

export function TimeDisplay({ currentTime }: TimeDisplayProps) {
  const currentDate = new Date(currentTime);

  return (
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
  );
}
