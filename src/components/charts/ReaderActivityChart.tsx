import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ReaderActivity {
  readerId: string;
  reads: number;
  status: 'online' | 'offline' | 'error' | 'connecting';
}

interface Props {
  data: ReaderActivity[];
}

export default function ReaderActivityChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  const getBarColor = (status: string) => {
    switch (status) {
      case 'online':
        return '#10b981'; // Green
      case 'offline':
        return '#6b7280'; // Gray
      case 'error':
        return '#ef4444'; // Red
      case 'connecting':
        return '#f59e0b'; // Amber
      default:
        return '#3b82f6'; // Blue
    }
  };

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis type="number" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
        <YAxis
          dataKey="readerId"
          type="category"
          stroke="#9ca3af"
          tick={{ fill: '#9ca3af' }}
          width={100}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '0.5rem',
            color: '#fff',
          }}
          formatter={(value: number) => [`${value} reads`, 'Activity']}
        />
        <Bar dataKey="reads" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
