import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface OccupancyData {
  timestamp: string;
  zones: Record<string, number>;
}

interface Props {
  data: OccupancyData[];
}

const ZONE_COLORS: Record<string, string> = {
  'Explosives Lab': '#3b82f6',
  'Chemistry Lab': '#a78bfa',
  'Fraud Lab': '#fcd34d',
  'Biology Lab': '#fb923c',
  'Ballistics Lab': '#ef4444',
  'Security Hub': '#10b981',
  'Main Entrance': '#8b5cf6',
  Auditorium: '#6b7280',
};

export default function OccupancyChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">No data available</div>
    );
  }

  // Get zone names from first data point
  const zoneNames = Object.keys(data[0]?.zones || {});

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="timestamp"
          stroke="#9ca3af"
          tick={{ fill: '#9ca3af' }}
          tickFormatter={(value) => {
            const date = new Date(value);
            return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
          }}
        />
        <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '0.5rem',
            color: '#fff',
          }}
          labelFormatter={(value) => new Date(value).toLocaleString()}
        />
        <Legend wrapperStyle={{ color: '#9ca3af' }} />
        {zoneNames.map((zoneName) => (
          <Line
            key={zoneName}
            type="monotone"
            dataKey={`zones.${zoneName}`}
            stroke={ZONE_COLORS[zoneName] || '#6b7280'}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            name={zoneName}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
