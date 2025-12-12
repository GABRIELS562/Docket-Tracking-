import Scene from '../components/3d/Scene';
import ErrorBoundary from '../components/ErrorBoundary';
import ItemDetailsPanel from '../components/ui/ItemDetailsPanel';
import DemoControls from '../components/ui/DemoControls';

const DashboardPage = () => {
  return (
    <div className="h-full relative">
      {/* 3D Scene - Full Height, The Star of the Show */}
      <div className="bg-slate-900 h-full overflow-hidden">
        <ErrorBoundary>
          <Scene />
        </ErrorBoundary>
      </div>

      {/* Floating Header - Top Left Corner */}
      <div className="absolute top-4 left-4 z-30">
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
          <h1 className="text-lg font-semibold text-white">3D Facility View</h1>
          <p className="text-xs text-gray-400">Real-time docket tracking</p>
        </div>
      </div>

      {/* Demo Controls - Top Right */}
      <DemoControls />

      {/* Item Details Panel - Shows when item is selected (from search or 3D click) */}
      <ItemDetailsPanel />
    </div>
  );
};

export default DashboardPage;
