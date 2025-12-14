import { Package, MapPin, Radio } from 'lucide-react';
import { Zone, Docket, Reader } from '@/lib/api';
import { useStore } from '@/store/useStore';

interface Props {
  zones: Zone[];
  dockets: Docket[];
  readers: Reader[];
}

export default function Dashboard({ zones, dockets, readers }: Props) {
  const { isConnected, isDemoMode, docketLimit } = useStore();

  const totalOccupancy = zones.reduce((sum, z) => sum + z.currentOccupancy, 0);
  const totalCapacity = zones.reduce((sum, z) => sum + z.capacity, 0);
  const onlineReaders = readers.filter(r => r.status === 'online').length;
  const totalDockets = isDemoMode ? 670 : dockets.length;

  return (
    <div className="absolute top-4 left-4 right-4 pointer-events-none">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="bg-gray-900/90 backdrop-blur-sm px-6 py-3 rounded-xl border border-blue-500/30 pointer-events-auto">
            <h1 className="text-2xl font-bold text-white">SAPS Forensic 3D Dashboard</h1>
            <p className="text-blue-400 text-sm">Real-time Evidence Tracking</p>
          </div>

          <div className="flex gap-2">
            {isDemoMode && (
              <div className="px-4 py-2 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-400 pointer-events-auto">
                🎮 Demo Mode
              </div>
            )}
            <div className={`px-4 py-2 rounded-full text-sm font-medium pointer-events-auto ${
              isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {isConnected ? '● Connected' : '○ Disconnected'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pointer-events-auto">
          <StatCard
            icon={<Package className="w-6 h-6" />}
            title="Total Dockets"
            value={totalDockets.toString()}
            subtitle={`Showing ${dockets.length} in 3D view`}
            color="blue"
          />
          <StatCard
            icon={<MapPin className="w-6 h-6" />}
            title="Active Zones"
            value={zones.length.toString()}
            subtitle={`${zones.filter(z => z.currentOccupancy > 0).length} zones with evidence`}
            color="purple"
          />
          <StatCard
            icon={<Radio className="w-6 h-6" />}
            title="RFID Readers"
            value={readers.length.toString()}
            subtitle={`${onlineReaders} online`}
            color="green"
          />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  color: 'blue' | 'purple' | 'green';
}

function StatCard({ icon, title, value, subtitle, color }: StatCardProps) {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} backdrop-blur-sm p-6 rounded-xl border`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="text-white">{icon}</div>
        <span className="text-gray-400 text-sm font-medium">{title}</span>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-gray-400 text-sm">{subtitle}</div>
    </div>
  );
}
