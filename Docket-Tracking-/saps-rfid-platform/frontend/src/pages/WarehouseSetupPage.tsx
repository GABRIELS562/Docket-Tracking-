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
} from 'lucide-react';

/**
 * Zone configuration
 */
interface ZoneConfig {
  id: string;
  name: string;
  type: 'receiving' | 'storage' | 'processing' | 'shipping' | 'secure' | 'staging' | 'office';
  color: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  hasReader: boolean;
}

/**
 * Default zone types with colors
 */
const ZONE_TYPES = [
  { id: 'receiving', name: 'Receiving', color: '#22c55e' },
  { id: 'storage', name: 'Storage', color: '#3b82f6' },
  { id: 'processing', name: 'Processing', color: '#eab308' },
  { id: 'shipping', name: 'Shipping', color: '#8b5cf6' },
  { id: 'secure', name: 'Secure Storage', color: '#ef4444' },
  { id: 'staging', name: 'Staging', color: '#14b8a6' },
  { id: 'office', name: 'Office', color: '#6366f1' },
];

/**
 * Warehouse Setup Page
 *
 * Allows customers to configure their warehouse layout without CAD software.
 * Supports multiple input methods from simple forms to CAD import.
 */
const WarehouseSetupPage = () => {
  const [activeTab, setActiveTab] = useState<'manual' | 'floorplan' | 'cad'>('manual');
  const [zones, setZones] = useState<ZoneConfig[]>([
    { id: '1', name: 'Receiving Dock', type: 'receiving', color: '#22c55e', x: -20, z: -25, width: 20, depth: 12, hasReader: true },
    { id: '2', name: 'Main Storage', type: 'storage', color: '#3b82f6', x: 0, z: 0, width: 30, depth: 25, hasReader: true },
    { id: '3', name: 'Processing Area', type: 'processing', color: '#eab308', x: -30, z: 15, width: 12, depth: 15, hasReader: true },
  ]);
  const [warehouseSize, setWarehouseSize] = useState({ width: 80, depth: 60, height: 10 });
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const addZone = () => {
    const newZone: ZoneConfig = {
      id: Date.now().toString(),
      name: `Zone ${zones.length + 1}`,
      type: 'storage',
      color: '#3b82f6',
      x: 0,
      z: 0,
      width: 15,
      depth: 15,
      hasReader: true,
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Warehouse Setup</h1>
            <p className="text-sm text-gray-500 mt-1">Configure your facility layout and RFID reader positions</p>
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
              <p className="text-sm text-gray-500 mt-1">Define zones using simple forms</p>
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
          <div className="grid grid-cols-3 gap-6">
            {/* Warehouse Dimensions */}
            <div className="col-span-1 space-y-6">
              {/* Building Size */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  <h3 className="font-semibold text-gray-900">Building Dimensions</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Width (meters)</label>
                    <input
                      type="number"
                      value={warehouseSize.width}
                      onChange={(e) => setWarehouseSize({ ...warehouseSize, width: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Depth (meters)</label>
                    <input
                      type="number"
                      value={warehouseSize.depth}
                      onChange={(e) => setWarehouseSize({ ...warehouseSize, depth: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Height (meters)</label>
                    <input
                      type="number"
                      value={warehouseSize.height}
                      onChange={(e) => setWarehouseSize({ ...warehouseSize, height: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Zones List */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-gray-400" />
                    <h3 className="font-semibold text-gray-900">Zones ({zones.length})</h3>
                  </div>
                  <button
                    onClick={addZone}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Zone
                  </button>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {zones.map((zone) => (
                    <button
                      key={zone.id}
                      onClick={() => setSelectedZone(zone.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        selectedZone === zone.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: zone.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{zone.name}</div>
                        <div className="text-xs text-gray-500">{zone.width}m x {zone.depth}m</div>
                      </div>
                      {zone.hasReader && (
                        <Radio className="w-4 h-4 text-green-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2D Preview */}
            <div className="col-span-1 bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-gray-400" />
                <h3 className="font-semibold text-gray-900">Layout Preview</h3>
              </div>
              <div
                className="relative bg-gray-100 rounded-lg border-2 border-dashed border-gray-300"
                style={{ height: '400px' }}
              >
                {/* Warehouse outline */}
                <div className="absolute inset-4 border-2 border-gray-400 rounded-lg">
                  {/* Zones */}
                  {zones.map((zone) => {
                    // Convert warehouse coords to percentage
                    const left = ((zone.x + warehouseSize.width / 2) / warehouseSize.width) * 100;
                    const top = ((zone.z + warehouseSize.depth / 2) / warehouseSize.depth) * 100;
                    const width = (zone.width / warehouseSize.width) * 100;
                    const height = (zone.depth / warehouseSize.depth) * 100;

                    return (
                      <div
                        key={zone.id}
                        onClick={() => setSelectedZone(zone.id)}
                        className={`absolute cursor-pointer transition-all ${
                          selectedZone === zone.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                        }`}
                        style={{
                          left: `${left}%`,
                          top: `${top}%`,
                          width: `${width}%`,
                          height: `${height}%`,
                          backgroundColor: `${zone.color}40`,
                          border: `2px solid ${zone.color}`,
                          borderRadius: '4px',
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-800 bg-white/80 px-1 rounded">
                            {zone.name}
                          </span>
                        </div>
                        {zone.hasReader && (
                          <div className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Scale indicator */}
                <div className="absolute bottom-2 left-2 text-xs text-gray-500">
                  {warehouseSize.width}m x {warehouseSize.depth}m
                </div>
              </div>
            </div>

            {/* Zone Editor */}
            <div className="col-span-1 bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Move className="w-5 h-5 text-gray-400" />
                <h3 className="font-semibold text-gray-900">
                  {selectedZoneData ? `Edit: ${selectedZoneData.name}` : 'Select a Zone'}
                </h3>
              </div>

              {selectedZoneData ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Zone Name</label>
                    <input
                      type="text"
                      value={selectedZoneData.name}
                      onChange={(e) => updateZone(selectedZoneData.id, { name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Zone Type</label>
                    <select
                      value={selectedZoneData.type}
                      onChange={(e) => {
                        const type = e.target.value as ZoneConfig['type'];
                        const zoneType = ZONE_TYPES.find(z => z.id === type);
                        updateZone(selectedZoneData.id, { type, color: zoneType?.color || '#3b82f6' });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {ZONE_TYPES.map((type) => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">X Position</label>
                      <input
                        type="number"
                        value={selectedZoneData.x}
                        onChange={(e) => updateZone(selectedZoneData.id, { x: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">Z Position</label>
                      <input
                        type="number"
                        value={selectedZoneData.z}
                        onChange={(e) => updateZone(selectedZoneData.id, { z: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">RFID Reader</span>
                    </div>
                    <button
                      onClick={() => updateZone(selectedZoneData.id, { hasReader: !selectedZoneData.hasReader })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        selectedZoneData.hasReader ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          selectedZoneData.hasReader ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  <button
                    onClick={() => deleteZone(selectedZoneData.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Zone
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
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
