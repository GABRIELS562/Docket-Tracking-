import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ZoneDistribution {
  name: string;
  value: number;
  color: string;
}

interface Props {
  data: ZoneDistribution[];
}

const COLORS = [
  '#3b82f6',
  '#a78bfa',
  '#fcd34d',
  '#fb923c',
  '#ef4444',
  '#10b981',
  '#8b5cf6',
  '#6b7280',
];

export default function DistributionChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">No data available</div>
    );
  }

  const chartData = data.map((item, index) => ({
    ...item,
    color: item.color || COLORS[index % COLORS.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '0.5rem',
            color: '#fff',
          }}
        />
        <Legend wrapperStyle={{ color: '#9ca3af' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
