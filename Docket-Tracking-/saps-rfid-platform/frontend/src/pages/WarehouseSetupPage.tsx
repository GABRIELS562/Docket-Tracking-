import { useState } from 'react';
import {
  Upload,
  Plus,
  Trash2,
  Save,
  Grid3X3,
  Box,
  Radio,
  MapPin,
  FileImage,
  FileCode,
  CheckCircle,
  ArrowRight,
  Building2,
  Layers,
  Move,
  ChevronDown,
  Copy,
  Square,
  RectangleHorizontal,
  CornerDownRight,
  ArrowUpDown,
  DoorOpen,
  DoorClosed,
  Warehouse,
  ShieldCheck,
  Truck,
  Package,
  Settings,
  Palette,
} from 'lucide-react';

/**
 * Zone shape type
 */
type ZoneShape = 'rectangle' | 'square' | 'l-shape' | 'u-shape' | 't-shape' | 'corridor-h' | 'corridor-v' | 'corner' | 'triangle' | 'circle' | 'hexagon' | 'octagon';

/**
 * Zone configuration
 */
interface ZoneConfig {
  id: string;
  name: string;
  type: string;
  color: string;
  floor: number;
  x: number;
  z: number;
  width: number;
  depth: number;
  shape: ZoneShape;
  hasReader: boolean;
}

/**
 * Floor configuration
 */
interface FloorConfig {
  id: number;
  name: string;
  height: number;
}

/**
 * Zone types with colors and icons
 */
const ZONE_TYPES = [
  { id: 'entrance', name: 'Entrance', color: '#10b981', icon: DoorOpen },
  { id: 'exit', name: 'Exit', color: '#f59e0b', icon: DoorClosed },
  { id: 'receiving', name: 'Receiving', color: '#22c55e', icon: Truck },
  { id: 'shipping', name: 'Shipping', color: '#8b5cf6', icon: Package },
  { id: 'storage', name: 'Storage', color: '#3b82f6', icon: Warehouse },
  { id: 'processing', name: 'Processing', color: '#eab308', icon: Settings },
  { id: 'secure', name: 'Secure Vault', color: '#ef4444', icon: ShieldCheck },
  { id: 'staging', name: 'Staging', color: '#14b8a6', icon: Box },
  { id: 'office', name: 'Office', color: '#6366f1', icon: Building2 },
  { id: 'hallway', name: 'Hallway', color: '#94a3b8', icon: ArrowUpDown },
  { id: 'returns', name: 'Returns', color: '#f97316', icon: CornerDownRight },
  { id: 'quarantine', name: 'Quarantine', color: '#dc2626', icon: ShieldCheck },
  { id: 'loading-dock', name: 'Loading Dock', color: '#059669', icon: Truck },
  { id: 'custom', name: 'Custom', color: '#64748b', icon: Square },
];

/**
 * Shape templates
 */
const SHAPE_TEMPLATES: { id: ZoneShape; name: string; icon: typeof Square; preview: string }[] = [
  { id: 'rectangle', name: 'Rectangle', icon: RectangleHorizontal, preview: '▬' },
  { id: 'square', name: 'Square', icon: Square, preview: '■' },
  { id: 'l-shape', name: 'L-Shape', icon: CornerDownRight, preview: '⌐' },
  { id: 'u-shape', name: 'U-Shape', icon: Square, preview: '∪' },
  { id: 't-shape', name: 'T-Shape', icon: Square, preview: '⊥' },
  { id: 'corridor-h', name: 'Corridor (H)', icon: ArrowUpDown, preview: '═' },
  { id: 'corridor-v', name: 'Corridor (V)', icon: ArrowUpDown, preview: '║' },
  { id: 'corner', name: 'Corner', icon: CornerDownRight, preview: '⌞' },
  { id: 'triangle', name: 'Triangle', icon: Square, preview: '△' },
  { id: 'circle', name: 'Circle', icon: Square, preview: '○' },
  { id: 'hexagon', name: 'Hexagon', icon: Square, preview: '⬡' },
  { id: 'octagon', name: 'Octagon', icon: Square, preview: '⯃' },
];

/**
 * Predefined colors for quick selection
 */
const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#64748b', '#475569', '#1e293b',
];

/**
 * Warehouse Setup Page
 *
 * Allows customers to configure their warehouse layout with:
 * - Multi-floor support
 * - Zone shape templates
 * - Customizable zone types and colors
 * - RFID reader placement
 */
const WarehouseSetupPage = () => {
  const [activeTab, setActiveTab] = useState<'manual' | 'floorplan' | 'cad'>('manual');

  // Floors state
  const [floors, setFloors] = useState<FloorConfig[]>([
    { id: 0, name: 'Ground Floor', height: 0 },
  ]);
  const [activeFloor, setActiveFloor] = useState(0);

  // Zones state
  const [zones, setZones] = useState<ZoneConfig[]>([
    { id: '1', name: 'Main Entrance', type: 'entrance', color: '#10b981', floor: 0, x: 0, z: -28, width: 12, depth: 6, shape: 'rectangle', hasReader: true },
    { id: '2', name: 'Receiving Dock', type: 'receiving', color: '#22c55e', floor: 0, x: -20, z: -20, width: 18, depth: 12, shape: 'rectangle', hasReader: true },
    { id: '3', name: 'Main Storage A', type: 'storage', color: '#3b82f6', floor: 0, x: -12, z: 0, width: 20, depth: 20, shape: 'rectangle', hasReader: true },
    { id: '4', name: 'Main Storage B', type: 'storage', color: '#3b82f6', floor: 0, x: 12, z: 0, width: 20, depth: 20, shape: 'rectangle', hasReader: true },
    { id: '5', name: 'Processing', type: 'processing', color: '#eab308', floor: 0, x: -30, z: 15, width: 12, depth: 15, shape: 'rectangle', hasReader: true },
    { id: '6', name: 'Secure Vault', type: 'secure', color: '#ef4444', floor: 0, x: -30, z: -5, width: 10, depth: 12, shape: 'rectangle', hasReader: true },
    { id: '7', name: 'Shipping Exit', type: 'exit', color: '#f59e0b', floor: 0, x: 25, z: -20, width: 12, depth: 8, shape: 'rectangle', hasReader: true },
  ]);

  const [warehouseSize, setWarehouseSize] = useState({ width: 80, depth: 60, height: 10 });
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [showShapeTemplates, setShowShapeTemplates] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Floor management
  const addFloor = () => {
    const newFloorId = Math.max(...floors.map(f => f.id)) + 1;
    const newFloor: FloorConfig = {
      id: newFloorId,
      name: `Floor ${newFloorId + 1}`,
      height: newFloorId * warehouseSize.height,
    };
    setFloors([...floors, newFloor]);
    setActiveFloor(newFloorId);
  };

  const updateFloor = (id: number, updates: Partial<FloorConfig>) => {
    setFloors(floors.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const deleteFloor = (id: number) => {
    if (floors.length <= 1) return;
    setFloors(floors.filter(f => f.id !== id));
    setZones(zones.filter(z => z.floor !== id));
    if (activeFloor === id) {
      setActiveFloor(floors.find(f => f.id !== id)?.id || 0);
    }
  };

  // Zone management
  const addZone = (shape: ZoneShape = 'rectangle') => {
    // Default sizes based on shape
    const shapeSizes: Record<ZoneShape, { width: number; depth: number }> = {
      'rectangle': { width: 20, depth: 12 },
      'square': { width: 15, depth: 15 },
      'l-shape': { width: 18, depth: 18 },
      'u-shape': { width: 20, depth: 15 },
      't-shape': { width: 20, depth: 15 },
      'corridor-h': { width: 30, depth: 6 },
      'corridor-v': { width: 6, depth: 30 },
      'corner': { width: 12, depth: 12 },
      'triangle': { width: 15, depth: 15 },
      'circle': { width: 12, depth: 12 },
      'hexagon': { width: 14, depth: 14 },
      'octagon': { width: 14, depth: 14 },
    };

    const size = shapeSizes[shape] || { width: 15, depth: 15 };

    const newZone: ZoneConfig = {
      id: Date.now().toString(),
      name: `Zone ${zones.length + 1}`,
      type: 'storage',
      color: '#3b82f6',
      floor: activeFloor,
      x: 0,
      z: 0,
      width: size.width,
      depth: size.depth,
      shape,
      hasReader: true,
    };
    setZones([...zones, newZone]);
    setSelectedZone(newZone.id);
    setShowShapeTemplates(false);
  };

  const duplicateZone = (zone: ZoneConfig) => {
    const newZone: ZoneConfig = {
      ...zone,
      id: Date.now().toString(),
      name: `${zone.name} (Copy)`,
      x: zone.x + 5,
      z: zone.z + 5,
    };
    setZones([...zones, newZone]);
    setSelectedZone(newZone.id);
  };

  const updateZone = (id: string, updates: Partial<ZoneConfig>) => {
    setZones(zones.map(z => z.id === id ? { ...z, ...updates } : z));
  };

  const deleteZone = (id: string) => {
    setZones(zones.filter(z => z.id !== id));
    if (selectedZone === id) setSelectedZone(null);
  };

  const selectedZoneData = zones.find(z => z.id === selectedZone);
  const currentFloorZones = zones.filter(z => z.floor === activeFloor);
  const currentFloor = floors.find(f => f.id === activeFloor);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Warehouse Setup</h1>
            <p className="text-sm text-gray-500 mt-1">Configure your facility layout, floors, and RFID reader positions</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Save className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Input Method Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose Setup Method</h2>
          <div className="grid grid-cols-3 gap-4">
            {/* Manual Configuration */}
            <button
              onClick={() => setActiveTab('manual')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                activeTab === 'manual'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                activeTab === 'manual' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                <Grid3X3 className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900">Manual Configuration</h3>
              <p className="text-sm text-gray-500 mt-1">Define zones using templates & forms</p>
              <div className="flex items-center gap-1 mt-3 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" />
                <span>Available Now</span>
              </div>
            </button>

            {/* Floor Plan Upload */}
            <button
              onClick={() => setActiveTab('floorplan')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                activeTab === 'floorplan'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                activeTab === 'floorplan' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                <FileImage className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900">Floor Plan Upload</h3>
              <p className="text-sm text-gray-500 mt-1">Upload image, draw zones over it</p>
              <div className="flex items-center gap-1 mt-3 text-xs text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Coming Soon</span>
              </div>
            </button>

            {/* CAD Import */}
            <button
              onClick={() => setActiveTab('cad')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                activeTab === 'cad'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                activeTab === 'cad' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                <FileCode className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900">CAD/BIM Import</h3>
              <p className="text-sm text-gray-500 mt-1">Import DXF, DWG, or IFC files</p>
              <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span>Enterprise Feature</span>
              </div>
            </button>
          </div>
        </div>

        {/* Manual Configuration Panel */}
        {activeTab === 'manual' && (
          <div className="grid grid-cols-12 gap-6">
            {/* Left Panel - Floors & Zones List */}
            <div className="col-span-3 space-y-6">
              {/* Floor Management */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-gray-400" />
                    <h3 className="font-semibold text-gray-900">Floors ({floors.length})</h3>
                  </div>
                  <button
                    onClick={addFloor}
                    className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors text-xs"
                  >
                    <Plus className="w-3 h-3" />
                    Add Floor
                  </button>
                </div>
                <div className="space-y-1">
                  {floors.map((floor) => (
                    <div
                      key={floor.id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                        activeFloor === floor.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                      onClick={() => setActiveFloor(floor.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className={`w-4 h-4 ${activeFloor === floor.id ? 'text-blue-500' : 'text-gray-400'}`} />
                        <input
                          type="text"
                          value={floor.name}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateFloor(floor.id, { name: e.target.value })}
                          className="text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 w-28"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">
                          {zones.filter(z => z.floor === floor.id).length} zones
                        </span>
                        {floors.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFloor(floor.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Building Size */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  <h3 className="font-semibold text-gray-900">Building Size</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">W (m)</label>
                    <input
                      type="number"
                      value={warehouseSize.width}
                      onChange={(e) => setWarehouseSize({ ...warehouseSize, width: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">D (m)</label>
                    <input
                      type="number"
                      value={warehouseSize.depth}
                      onChange={(e) => setWarehouseSize({ ...warehouseSize, depth: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">H (m)</label>
                    <input
                      type="number"
                      value={warehouseSize.height}
                      onChange={(e) => setWarehouseSize({ ...warehouseSize, height: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Zones List */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <h3 className="font-semibold text-gray-900">
                      Zones ({currentFloorZones.length})
                    </h3>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowShapeTemplates(!showShapeTemplates)}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs"
                    >
                      <Plus className="w-3 h-3" />
                      Add Zone
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    {/* Shape Templates Dropdown */}
                    {showShapeTemplates && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 p-2 z-10">
                        <p className="text-xs text-gray-500 px-2 mb-2">Choose shape:</p>
                        {SHAPE_TEMPLATES.map((shape) => {
                          const Icon = shape.icon;
                          return (
                            <button
                              key={shape.id}
                              onClick={() => addZone(shape.id)}
                              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 text-left transition-colors"
                            >
                              <Icon className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-700">{shape.name}</span>
                              <span className="ml-auto text-lg text-gray-400">{shape.preview}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {currentFloorZones.length === 0 ? (
                    <div className="text-center py-6 text-gray-400">
                      <Box className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">No zones on this floor</p>
                      <p className="text-xs">Click "Add Zone" to create one</p>
                    </div>
                  ) : (
                    currentFloorZones.map((zone) => {
                      const zoneType = ZONE_TYPES.find(t => t.id === zone.type);
                      const Icon = zoneType?.icon || Square;
                      return (
                        <button
                          key={zone.id}
                          onClick={() => setSelectedZone(zone.id)}
                          className={`w-full flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                            selectedZone === zone.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div
                            className="w-6 h-6 rounded flex items-center justify-center"
                            style={{ backgroundColor: `${zone.color}20` }}
                          >
                            <Icon className="w-3.5 h-3.5" style={{ color: zone.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{zone.name}</div>
                            <div className="text-xs text-gray-500">{zone.width}m x {zone.depth}m</div>
                          </div>
                          {zone.hasReader && (
                            <Radio className="w-3.5 h-3.5 text-green-500" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Center - 2D Preview */}
            <div className="col-span-5 bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <h3 className="font-semibold text-gray-900">
                    Layout Preview - {currentFloor?.name || 'Ground Floor'}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {warehouseSize.width}m x {warehouseSize.depth}m
                  </span>
                </div>
              </div>

              <div
                className="relative bg-slate-100 rounded-xl border-2 border-slate-300"
                style={{ height: '450px' }}
              >
                {/* Grid lines */}
                <div className="absolute inset-0 opacity-30">
                  <svg width="100%" height="100%">
                    <defs>
                      <pattern id="grid" width="10%" height="10%" patternUnits="userSpaceOnUse">
                        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#94a3b8" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                </div>

                {/* Warehouse outline */}
                <div className="absolute inset-3 border-2 border-slate-400 rounded-lg bg-white/50">
                  {/* Zones */}
                  {currentFloorZones.map((zone) => {
                    // Convert warehouse coords to percentage
                    const left = ((zone.x + warehouseSize.width / 2) / warehouseSize.width) * 100;
                    const top = ((zone.z + warehouseSize.depth / 2) / warehouseSize.depth) * 100;
                    const width = (zone.width / warehouseSize.width) * 100;
                    const height = (zone.depth / warehouseSize.depth) * 100;

                    return (
                      <div
                        key={zone.id}
                        onClick={() => setSelectedZone(zone.id)}
                        className={`absolute cursor-pointer transition-all hover:scale-[1.02] ${
                          selectedZone === zone.id ? 'ring-2 ring-blue-500 ring-offset-2 z-10' : ''
                        }`}
                        style={{
                          left: `${left}%`,
                          top: `${top}%`,
                          width: `${width}%`,
                          height: `${height}%`,
                          backgroundColor: `${zone.color}30`,
                          border: `2px solid ${zone.color}`,
                          borderRadius: '6px',
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center p-1">
                          <span className="text-xs font-medium text-center leading-tight" style={{ color: zone.color }}>
                            {zone.name}
                          </span>
                        </div>
                        {zone.hasReader && (
                          <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Compass */}
                <div className="absolute bottom-3 right-3 w-10 h-10 bg-white/80 rounded-full border border-gray-300 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-600">N</span>
                </div>
              </div>
            </div>

            {/* Right Panel - Zone Editor */}
            <div className="col-span-4 bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Move className="w-5 h-5 text-gray-400" />
                <h3 className="font-semibold text-gray-900">
                  {selectedZoneData ? 'Edit Zone' : 'Select a Zone'}
                </h3>
              </div>

              {selectedZoneData ? (
                <div className="space-y-4">
                  {/* Zone Name */}
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Zone Name</label>
                    <input
                      type="text"
                      value={selectedZoneData.name}
                      onChange={(e) => updateZone(selectedZoneData.id, { name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Main Entrance, Secure Vault"
                    />
                  </div>

                  {/* Zone Type */}
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Zone Type</label>
                    <select
                      value={selectedZoneData.type}
                      onChange={(e) => {
                        const type = e.target.value;
                        const zoneType = ZONE_TYPES.find(z => z.id === type);
                        updateZone(selectedZoneData.id, {
                          type,
                          color: type !== 'custom' ? zoneType?.color || '#64748b' : selectedZoneData.color
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {ZONE_TYPES.map((type) => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Zone Shape */}
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Shape</label>
                    <div className="grid grid-cols-6 gap-1">
                      {SHAPE_TEMPLATES.map((shape) => (
                        <button
                          key={shape.id}
                          onClick={() => updateZone(selectedZoneData.id, { shape: shape.id })}
                          className={`p-1.5 rounded-lg border transition-all ${
                            selectedZoneData.shape === shape.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                          title={shape.name}
                        >
                          <span className="text-lg block text-center text-gray-600">{shape.preview}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Picker */}
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Color</label>
                    <div className="relative">
                      <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="w-full flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <div
                          className="w-6 h-6 rounded-md border border-gray-300"
                          style={{ backgroundColor: selectedZoneData.color }}
                        />
                        <span className="text-sm text-gray-700">{selectedZoneData.color}</span>
                        <Palette className="w-4 h-4 text-gray-400 ml-auto" />
                      </button>

                      {showColorPicker && (
                        <div className="absolute left-0 top-full mt-1 p-2 bg-white rounded-xl shadow-lg border border-gray-200 z-20">
                          <div className="grid grid-cols-5 gap-1 mb-2">
                            {PRESET_COLORS.map((color) => (
                              <button
                                key={color}
                                onClick={() => {
                                  updateZone(selectedZoneData.id, { color });
                                  setShowColorPicker(false);
                                }}
                                className={`w-7 h-7 rounded-md border-2 transition-all ${
                                  selectedZoneData.color === color ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105'
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <input
                            type="color"
                            value={selectedZoneData.color}
                            onChange={(e) => updateZone(selectedZoneData.id, { color: e.target.value })}
                            className="w-full h-8 cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Position */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">X Position (m)</label>
                      <input
                        type="number"
                        value={selectedZoneData.x}
                        onChange={(e) => updateZone(selectedZoneData.id, { x: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">Z Position (m)</label>
                      <input
                        type="number"
                        value={selectedZoneData.z}
                        onChange={(e) => updateZone(selectedZoneData.id, { z: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Size */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">Width (m)</label>
                      <input
                        type="number"
                        value={selectedZoneData.width}
                        onChange={(e) => updateZone(selectedZoneData.id, { width: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">Depth (m)</label>
                      <input
                        type="number"
                        value={selectedZoneData.depth}
                        onChange={(e) => updateZone(selectedZoneData.id, { depth: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* RFID Reader Toggle */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">RFID Reader</span>
                    </div>
                    <button
                      onClick={() => updateZone(selectedZoneData.id, { hasReader: !selectedZoneData.hasReader })}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        selectedZoneData.hasReader ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${
                          selectedZoneData.hasReader ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => duplicateZone(selectedZoneData)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      Duplicate
                    </button>
                    <button
                      onClick={() => deleteZone(selectedZoneData.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-80 text-gray-400">
                  <Box className="w-12 h-12 mb-3" />
                  <p className="text-sm">Select a zone to edit</p>
                  <p className="text-xs mt-1">or click "Add Zone" to create one</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floor Plan Upload Panel */}
        {activeTab === 'floorplan' && (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="max-w-xl mx-auto text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Floor Plan</h3>
              <p className="text-gray-500 mb-6">
                Upload a PNG, JPG, or PDF of your floor plan. We'll help you draw zones over it.
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-blue-400 transition-colors cursor-pointer">
                <FileImage className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600">
                  Drag and drop your floor plan here, or <span className="text-blue-600">browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-2">Supports PNG, JPG, PDF up to 10MB</p>
              </div>
              <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800">
                  This feature is coming soon. For now, use Manual Configuration.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CAD Import Panel */}
        {activeTab === 'cad' && (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="max-w-xl mx-auto text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileCode className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">CAD/BIM Import</h3>
              <p className="text-gray-500 mb-6">
                Import professional CAD drawings to automatically generate your 3D warehouse.
              </p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-semibold text-gray-900">DXF</p>
                  <p className="text-xs text-gray-500">AutoCAD Exchange</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-semibold text-gray-900">DWG</p>
                  <p className="text-xs text-gray-500">AutoCAD Native</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-semibold text-gray-900">IFC</p>
                  <p className="text-xs text-gray-500">Building Info Model</p>
                </div>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-800">
                  <strong>Enterprise Feature:</strong> CAD import is available on Enterprise plans.
                  Contact sales for a demo.
                </p>
              </div>

              <button className="mt-6 flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors mx-auto">
                Contact Sales
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WarehouseSetupPage;
