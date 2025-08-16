/**
 * Advanced Visualization Dashboard
 * Combines 3D warehouse, heat maps, and flow diagrams
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import Warehouse3D from '../components/Warehouse3D';
import ActivityHeatMap from '../components/ActivityHeatMap';
import DocumentFlowDiagram from '../components/DocumentFlowDiagram';

interface VisualizationData {
  warehouse: {
    boxes: any[];
    rfidTags: any[];
  };
  activity: {
    temporal: any[];
    spatial: any[];
  };
  flow: {
    nodes: any[];
    edges: any[];
  };
}

const AdvancedVisualization: React.FC = () => {
  const { theme } = useTheme();
  const [activeView, setActiveView] = useState<'3d' | 'heatmap' | 'flow' | 'dashboard'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<VisualizationData>({
    warehouse: {
      boxes: [],
      rfidTags: []
    },
    activity: {
      temporal: [],
      spatial: []
    },
    flow: {
      nodes: [],
      edges: []
    }
  });
  
  const [visualizationSettings, setVisualizationSettings] = useState({
    showHeatmap: false,
    showPaths: true,
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
    animationSpeed: 1
  });

  useEffect(() => {
    loadVisualizationData();
  }, []);

  useEffect(() => {
    if (visualizationSettings.autoRefresh) {
      const interval = setInterval(loadVisualizationData, visualizationSettings.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [visualizationSettings.autoRefresh, visualizationSettings.refreshInterval]);

  const loadVisualizationData = async () => {
    setLoading(true);
    try {
      // Generate sample data (in production, fetch from API)
      const warehouseData = generateWarehouseData();
      const activityData = generateActivityData();
      const flowData = generateFlowData();
      
      setData({
        warehouse: warehouseData,
        activity: activityData,
        flow: flowData
      });
    } catch (error) {
      console.error('Failed to load visualization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateWarehouseData = () => {
    const boxes = [];
    const rfidTags = [];
    
    // Generate storage boxes
    for (let rack = 0; rack < 4; rack++) {
      for (let level = 0; level < 5; level++) {
        for (let position = 0; position < 3; position++) {
          boxes.push({
            id: `box-${rack}-${level}-${position}`,
            position: [
              -6 + rack * 4 + (position - 1) * 0.8,
              level * 1 + 0.5,
              -6 + rack * 4
            ] as [number, number, number],
            size: [0.7, 0.4, 0.9] as [number, number, number],
            label: `${String.fromCharCode(65 + rack)}${level}${position}`,
            occupancy: Math.floor(Math.random() * 100),
            items: Math.floor(Math.random() * 50),
            category: ['Legal', 'Financial', 'HR', 'Technical'][Math.floor(Math.random() * 4)],
            lastAccessed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
            temperature: 18 + Math.random() * 4,
            humidity: 40 + Math.random() * 20
          });
        }
      }
    }
    
    // Generate RFID tags
    for (let i = 0; i < 10; i++) {
      rfidTags.push({
        id: `tag-${i}`,
        position: [
          -8 + Math.random() * 16,
          0.5 + Math.random() * 4,
          -8 + Math.random() * 16
        ] as [number, number, number],
        docketCode: `DOC-2025-${String(i + 1).padStart(4, '0')}`,
        status: ['active', 'idle', 'moving'][Math.floor(Math.random() * 3)] as any,
        signalStrength: 0.5 + Math.random() * 0.5
      });
    }
    
    return { boxes, rfidTags };
  };

  const generateActivityData = () => {
    const temporal = [];
    const spatial = [];
    
    // Generate temporal activity data
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const day of days) {
      for (let hour = 0; hour < 24; hour++) {
        temporal.push({
          hour,
          day,
          count: Math.floor(Math.random() * 50),
          type: ['retrieval', 'storage', 'movement'][Math.floor(Math.random() * 3)]
        });
      }
    }
    
    // Generate spatial activity data
    for (let i = 0; i < 20; i++) {
      spatial.push({
        id: `location-${i}`,
        lat: 40.7128 + (Math.random() - 0.5) * 0.1,
        lng: -74.0060 + (Math.random() - 0.5) * 0.1,
        intensity: Math.random(),
        zone: `Zone ${String.fromCharCode(65 + i % 5)}`,
        lastActivity: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        documentCount: Math.floor(Math.random() * 100)
      });
    }
    
    return { temporal, spatial };
  };

  const generateFlowData = () => {
    const nodes = [
      { id: '1', type: 'input', position: { x: 100, y: 100 }, 
        data: { label: 'Document Entry', type: 'entry', status: 'active', count: 45 } },
      { id: '2', type: 'process', position: { x: 250, y: 100 }, 
        data: { label: 'Classification', type: 'process', status: 'active', avgTime: '5 min' } },
      { id: '3', type: 'decision', position: { x: 400, y: 100 }, 
        data: { label: 'Requires Review?', type: 'decision' } },
      { id: '4', type: 'process', position: { x: 400, y: 250 }, 
        data: { label: 'Manual Review', type: 'process', status: 'idle', avgTime: '30 min' } },
      { id: '5', type: 'storage', position: { x: 550, y: 100 }, 
        data: { label: 'Storage', type: 'storage', count: 1234 } },
      { id: '6', type: 'process', position: { x: 700, y: 100 }, 
        data: { label: 'Retrieval', type: 'retrieval', status: 'active', avgTime: '15 min' } },
      { id: '7', type: 'storage', position: { x: 850, y: 100 }, 
        data: { label: 'Archive', type: 'archive', count: 5678 } }
    ];
    
    const edges = [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true },
      { id: 'e3-4', source: '3', target: '4', sourceHandle: 'no' },
      { id: 'e3-5', source: '3', target: '5', sourceHandle: 'yes', animated: true },
      { id: 'e4-5', source: '4', target: '5' },
      { id: 'e5-6', source: '5', target: '6', animated: true },
      { id: 'e6-7', source: '6', target: '7' }
    ];
    
    return { nodes, edges };
  };

  const renderDashboard = () => (
    <div className="dashboard-grid">
      {/* Key Metrics */}
      <div className="metrics-row">
        <div className="metric-card">
          <h3>📦 Storage Utilization</h3>
          <div className="metric-value">78%</div>
          <div className="metric-chart">
            {/* Mini chart would go here */}
          </div>
        </div>
        <div className="metric-card">
          <h3>🔥 Hot Zones</h3>
          <div className="metric-value">5</div>
          <div className="metric-subtitle">Active locations</div>
        </div>
        <div className="metric-card">
          <h3>📊 Document Flow</h3>
          <div className="metric-value">234</div>
          <div className="metric-subtitle">Documents/hour</div>
        </div>
        <div className="metric-card">
          <h3>📡 RFID Activity</h3>
          <div className="metric-value">12</div>
          <div className="metric-subtitle">Active tags</div>
        </div>
      </div>

      {/* Visualization Previews */}
      <div className="preview-grid">
        <div className="preview-card" onClick={() => setActiveView('3d')}>
          <h3>3D Warehouse View</h3>
          <div className="preview-content">
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              height: '200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px'
            }}>
              🏢
            </div>
          </div>
          <button className="view-button">View Full 3D →</button>
        </div>

        <div className="preview-card" onClick={() => setActiveView('heatmap')}>
          <h3>Activity Heat Map</h3>
          <div className="preview-content">
            <div style={{ 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              height: '200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px'
            }}>
              🗺️
            </div>
          </div>
          <button className="view-button">View Heat Map →</button>
        </div>

        <div className="preview-card" onClick={() => setActiveView('flow')}>
          <h3>Document Flow</h3>
          <div className="preview-content">
            <div style={{ 
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              height: '200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px'
            }}>
              🔄
            </div>
          </div>
          <button className="view-button">View Flow Diagram →</button>
        </div>
      </div>

      {/* Real-time Activity Feed */}
      <div className="activity-feed">
        <h3>Real-time Activity</h3>
        <div className="activity-list">
          <div className="activity-item">
            <span className="activity-time">2 min ago</span>
            <span className="activity-text">Document DOC-2025-0123 moved to Zone A</span>
          </div>
          <div className="activity-item">
            <span className="activity-time">5 min ago</span>
            <span className="activity-text">High activity detected in Storage Rack B3</span>
          </div>
          <div className="activity-item">
            <span className="activity-time">12 min ago</span>
            <span className="activity-text">Retrieval request completed for 5 documents</span>
          </div>
        </div>
      </div>
    </div>
  );

  const render3DView = () => (
    <div className="visualization-container">
      <div className="visualization-controls">
        <label>
          <input
            type="checkbox"
            checked={visualizationSettings.showHeatmap}
            onChange={(e) => setVisualizationSettings({
              ...visualizationSettings,
              showHeatmap: e.target.checked
            })}
          />
          Show Heat Map
        </label>
        <label>
          <input
            type="checkbox"
            checked={visualizationSettings.showPaths}
            onChange={(e) => setVisualizationSettings({
              ...visualizationSettings,
              showPaths: e.target.checked
            })}
          />
          Show Movement Paths
        </label>
      </div>
      <Warehouse3D
        boxes={data.warehouse.boxes}
        rfidTags={data.warehouse.rfidTags}
        showHeatmap={visualizationSettings.showHeatmap}
        showPaths={visualizationSettings.showPaths}
        onBoxClick={(boxId) => console.log('Box clicked:', boxId)}
      />
    </div>
  );

  const renderHeatMap = () => (
    <div className="visualization-container">
      <ActivityHeatMap
        activityData={data.activity.temporal}
        locationData={data.activity.spatial}
        mode="combined"
        onCellClick={(data) => console.log('Cell clicked:', data)}
      />
    </div>
  );

  const renderFlowDiagram = () => (
    <div className="visualization-container">
      <DocumentFlowDiagram
        nodes={data.flow.nodes}
        edges={data.flow.edges}
        onNodeClick={(node) => console.log('Node clicked:', node)}
        onEdgeClick={(edge) => console.log('Edge clicked:', edge)}
        interactive={true}
      />
    </div>
  );

  return (
    <div className="advanced-visualization" style={{ background: theme.colors.background }}>
      <div className="visualization-header">
        <h1>Advanced Visualization Center</h1>
        <div className="header-controls">
          <button 
            className={activeView === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveView('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={activeView === '3d' ? 'active' : ''}
            onClick={() => setActiveView('3d')}
          >
            🏢 3D Warehouse
          </button>
          <button 
            className={activeView === 'heatmap' ? 'active' : ''}
            onClick={() => setActiveView('heatmap')}
          >
            🗺️ Heat Map
          </button>
          <button 
            className={activeView === 'flow' ? 'active' : ''}
            onClick={() => setActiveView('flow')}
          >
            🔄 Flow Diagram
          </button>
          <button onClick={loadVisualizationData} disabled={loading}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="visualization-content">
        {loading && <div className="loading">Loading visualization data...</div>}
        {!loading && activeView === 'dashboard' && renderDashboard()}
        {!loading && activeView === '3d' && render3DView()}
        {!loading && activeView === 'heatmap' && renderHeatMap()}
        {!loading && activeView === 'flow' && renderFlowDiagram()}
      </div>

      <style>{`
        .advanced-visualization {
          padding: 2rem;
          min-height: 100vh;
        }

        .visualization-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .header-controls {
          display: flex;
          gap: 1rem;
        }

        .header-controls button {
          padding: 0.5rem 1rem;
          border: none;
          background: ${theme.colors.surface};
          color: ${theme.colors.text};
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .header-controls button.active,
        .header-controls button:hover {
          background: ${theme.colors.primary};
          color: white;
        }

        .dashboard-grid {
          display: grid;
          gap: 2rem;
        }

        .metrics-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .metric-card {
          padding: 1.5rem;
          background: ${theme.colors.surface};
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .metric-card h3 {
          margin: 0 0 1rem 0;
          font-size: 1rem;
        }

        .metric-value {
          font-size: 2rem;
          font-weight: bold;
          color: ${theme.colors.primary};
        }

        .metric-subtitle {
          font-size: 0.875rem;
          color: ${theme.colors.textSecondary};
        }

        .preview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin: 2rem 0;
        }

        .preview-card {
          background: ${theme.colors.surface};
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          cursor: pointer;
          transition: transform 0.3s;
        }

        .preview-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        .preview-card h3 {
          padding: 1rem;
          margin: 0;
          background: ${theme.colors.background};
        }

        .preview-content {
          padding: 1rem;
        }

        .view-button {
          width: 100%;
          padding: 1rem;
          border: none;
          background: ${theme.colors.primary};
          color: white;
          cursor: pointer;
          font-weight: bold;
        }

        .activity-feed {
          background: ${theme.colors.surface};
          padding: 1.5rem;
          border-radius: 8px;
          max-height: 300px;
          overflow-y: auto;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .activity-item {
          display: flex;
          gap: 1rem;
          padding: 0.5rem;
          background: ${theme.colors.background};
          border-radius: 4px;
        }

        .activity-time {
          color: ${theme.colors.textSecondary};
          font-size: 0.875rem;
          min-width: 80px;
        }

        .visualization-container {
          background: ${theme.colors.surface};
          padding: 1.5rem;
          border-radius: 8px;
          min-height: 600px;
        }

        .visualization-controls {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          padding: 1rem;
          background: ${theme.colors.background};
          border-radius: 4px;
        }

        .visualization-controls label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 400px;
          font-size: 1.25rem;
          color: ${theme.colors.textSecondary};
        }
      `}</style>
    </div>
  );
};

export default AdvancedVisualization;