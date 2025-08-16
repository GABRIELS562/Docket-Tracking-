import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './Pages.css';

interface StorageBox {
  id: number;
  boxCode: string;
  zone: string;
  shelf: string;
  capacity: number;
  occupied: number;
  status: 'active' | 'full' | 'archived' | 'maintenance';
  temperature: number;
  humidity: number;
  lastAccessed: string;
  clientName: string;
  monthlyRate: number;
}

interface RetrievalRequest {
  id: number;
  requestNumber: string;
  clientName: string;
  boxCount: number;
  urgency: 'normal' | 'urgent' | 'scheduled';
  status: 'pending' | 'processing' | 'ready' | 'completed';
  requestedAt: string;
  expectedTime: string;
}

const StorageManagement: React.FC = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'overview' | 'zones' | 'requests' | 'inventory'>('overview');
  const [storageBoxes, setStorageBoxes] = useState<StorageBox[]>([]);
  const [retrievalRequests, setRetrievalRequests] = useState<RetrievalRequest[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [showAddBoxModal, setShowAddBoxModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Load mock data
    setStorageBoxes([
      {
        id: 1,
        boxCode: 'BOX-2024-0001',
        zone: 'Zone A',
        shelf: 'A-01-03',
        capacity: 100,
        occupied: 87,
        status: 'active',
        temperature: 22.5,
        humidity: 45,
        lastAccessed: '2 hours ago',
        clientName: 'Department of Justice',
        monthlyRate: 40
      },
      {
        id: 2,
        boxCode: 'BOX-2024-0002',
        zone: 'Zone B',
        shelf: 'B-02-05',
        capacity: 100,
        occupied: 100,
        status: 'full',
        temperature: 21.8,
        humidity: 48,
        lastAccessed: '1 day ago',
        clientName: 'Metro Police Department',
        monthlyRate: 40
      },
      {
        id: 3,
        boxCode: 'BOX-2024-0003',
        zone: 'Zone C',
        shelf: 'C-03-02',
        capacity: 100,
        occupied: 45,
        status: 'active',
        temperature: 23.1,
        humidity: 42,
        lastAccessed: '3 days ago',
        clientName: 'Provincial Court',
        monthlyRate: 40
      }
    ]);

    setRetrievalRequests([
      {
        id: 1,
        requestNumber: 'REQ-2024-0156',
        clientName: 'Department of Justice',
        boxCount: 3,
        urgency: 'urgent',
        status: 'processing',
        requestedAt: '10:30 AM',
        expectedTime: '11:00 AM'
      },
      {
        id: 2,
        requestNumber: 'REQ-2024-0157',
        clientName: 'Metro Police Department',
        boxCount: 1,
        urgency: 'normal',
        status: 'pending',
        requestedAt: '11:15 AM',
        expectedTime: '2:00 PM'
      }
    ]);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return theme.colors.success;
      case 'full': return theme.colors.warning;
      case 'archived': return theme.colors.info;
      case 'maintenance': return theme.colors.error;
      case 'processing': return theme.colors.warning;
      case 'ready': return theme.colors.success;
      case 'completed': return theme.colors.textSecondary;
      default: return theme.colors.textSecondary;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return theme.colors.error;
      case 'scheduled': return theme.colors.info;
      default: return theme.colors.textSecondary;
    }
  };

  const zones = [
    { name: 'Zone A', utilization: 78, temperature: 22.5, humidity: 45, boxes: 156 },
    { name: 'Zone B', utilization: 92, temperature: 21.8, humidity: 48, boxes: 189 },
    { name: 'Zone C', utilization: 65, temperature: 23.1, humidity: 42, boxes: 134 },
    { name: 'Zone D', utilization: 45, temperature: 22.0, humidity: 44, boxes: 98 }
  ];

  const filteredBoxes = storageBoxes.filter(box => 
    (selectedZone === 'all' || box.zone === selectedZone) &&
    (searchQuery === '' || box.boxCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
     box.clientName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Storage Management</h1>
        <p className="page-subtitle">Manage storage zones, boxes, and retrieval requests</p>
      </div>

      {/* Tab Navigation */}
      <div className="card">
        <div className="card-header" style={{ padding: '0' }}>
          <div style={{ display: 'flex', gap: '0', width: '100%' }}>
            {(['overview', 'zones', 'requests', 'inventory'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: activeTab === tab ? theme.colors.backgroundPaper : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? `2px solid ${theme.colors.primary}` : `2px solid transparent`,
                  color: activeTab === tab ? theme.colors.primary : theme.colors.textSecondary,
                  fontSize: '0.875rem',
                  fontWeight: activeTab === tab ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textTransform: 'capitalize'
                }}
              >
                {tab === 'overview' && '📊 '}
                {tab === 'zones' && '🏢 '}
                {tab === 'requests' && '📤 '}
                {tab === 'inventory' && '📦 '}
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="card">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ color: theme.colors.textSecondary, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Storage Boxes</p>
                    <h2 style={{ fontSize: '2rem', fontWeight: '700', margin: 0 }}>12,456</h2>
                  </div>
                  <span style={{ fontSize: '2rem' }}>📦</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <span style={{ color: theme.colors.success }}>↑ 5.2%</span>
                  <span style={{ color: theme.colors.textSecondary }}>from last month</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ color: theme.colors.textSecondary, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Active Dockets</p>
                    <h2 style={{ fontSize: '2rem', fontWeight: '700', margin: 0 }}>487,234</h2>
                  </div>
                  <span style={{ fontSize: '2rem' }}>📋</span>
                </div>
                <div style={{ fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                  Across 4 storage zones
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ color: theme.colors.textSecondary, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Utilization Rate</p>
                    <h2 style={{ fontSize: '2rem', fontWeight: '700', margin: 0 }}>72.5%</h2>
                  </div>
                  <span style={{ fontSize: '2rem' }}>📊</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: theme.colors.backgroundElevated, borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '72.5%', height: '100%', background: theme.colors.primary }}></div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ color: theme.colors.textSecondary, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Monthly Revenue</p>
                    <h2 style={{ fontSize: '2rem', fontWeight: '700', margin: 0 }}>R498,240</h2>
                  </div>
                  <span style={{ fontSize: '2rem' }}>💰</span>
                </div>
                <div style={{ fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                  R40 per box monthly
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="card-header">
              <h2>Recent Activity</h2>
            </div>
            <div className="card-body">
              <div className="timeline">
                <div className="timeline-item">
                  <span className="time">10 min ago</span>
                  <span className="event">Box BOX-2024-0456 retrieved by Admin User</span>
                </div>
                <div className="timeline-item">
                  <span className="time">45 min ago</span>
                  <span className="event">New storage request: 15 boxes from Department of Justice</span>
                </div>
                <div className="timeline-item">
                  <span className="time">2 hours ago</span>
                  <span className="event">Zone B temperature alert: 24.5°C (above threshold)</span>
                </div>
                <div className="timeline-item">
                  <span className="time">3 hours ago</span>
                  <span className="event">Monthly billing processed: 12,456 boxes</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Zones Tab */}
      {activeTab === 'zones' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {zones.map(zone => (
            <div key={zone.name} className="card">
              <div className="card-header">
                <h2>{zone.name}</h2>
                <span className="status-badge" style={{ 
                  backgroundColor: zone.utilization > 90 ? theme.colors.error : zone.utilization > 75 ? theme.colors.warning : theme.colors.success 
                }}>
                  {zone.utilization}% Full
                </span>
              </div>
              <div className="card-body">
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <span style={{ color: theme.colors.textSecondary }}>Utilization</span>
                    <span style={{ fontWeight: 600 }}>{zone.utilization}%</span>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: theme.colors.backgroundElevated, borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${zone.utilization}%`, 
                      height: '100%', 
                      background: zone.utilization > 90 ? theme.colors.error : zone.utilization > 75 ? theme.colors.warning : theme.colors.success,
                      transition: 'width 0.3s'
                    }}></div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <p style={{ color: theme.colors.textSecondary, fontSize: '0.75rem', marginBottom: '0.25rem' }}>Temperature</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
                      {zone.temperature}°C
                    </p>
                  </div>
                  <div>
                    <p style={{ color: theme.colors.textSecondary, fontSize: '0.75rem', marginBottom: '0.25rem' }}>Humidity</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
                      {zone.humidity}%
                    </p>
                  </div>
                  <div>
                    <p style={{ color: theme.colors.textSecondary, fontSize: '0.75rem', marginBottom: '0.25rem' }}>Total Boxes</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
                      {zone.boxes}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: theme.colors.textSecondary, fontSize: '0.75rem', marginBottom: '0.25rem' }}>Status</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, color: theme.colors.success }}>
                      Active
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-sm btn-primary" style={{ flex: 1 }}>
                    View Details
                  </button>
                  <button className="btn btn-sm btn-outline" style={{ flex: 1 }}>
                    Zone Map
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Retrieval Requests Tab */}
      {activeTab === 'requests' && (
        <>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h2>Active Retrieval Requests</h2>
              <button className="btn btn-primary">
                New Request
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {retrievalRequests.map(request => (
              <div key={request.id} className="card">
                <div className="card-body" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ margin: 0, marginBottom: '0.5rem', color: theme.colors.primary }}>
                        {request.requestNumber}
                      </h3>
                      <p style={{ margin: 0, color: theme.colors.textSecondary, fontSize: '0.875rem' }}>
                        {request.clientName}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span className="status-badge" style={{ backgroundColor: getUrgencyColor(request.urgency) }}>
                        {request.urgency}
                      </span>
                      <span className="status-badge" style={{ backgroundColor: getStatusColor(request.status) }}>
                        {request.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <p style={{ color: theme.colors.textSecondary, fontSize: '0.75rem', marginBottom: '0.25rem' }}>Boxes Requested</p>
                      <p style={{ fontWeight: '600', margin: 0 }}>{request.boxCount} boxes</p>
                    </div>
                    <div>
                      <p style={{ color: theme.colors.textSecondary, fontSize: '0.75rem', marginBottom: '0.25rem' }}>Requested At</p>
                      <p style={{ fontWeight: '600', margin: 0 }}>{request.requestedAt}</p>
                    </div>
                    <div>
                      <p style={{ color: theme.colors.textSecondary, fontSize: '0.75rem', marginBottom: '0.25rem' }}>Expected Time</p>
                      <p style={{ fontWeight: '600', margin: 0 }}>{request.expectedTime}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-sm btn-primary">Process Request</button>
                    <button className="btn btn-sm btn-outline">View Details</button>
                    <button className="btn btn-sm btn-outline">Contact Client</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <>
          <div className="card">
            <div className="card-header">
              <h2>Storage Box Inventory</h2>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: `1px solid ${theme.colors.border}`,
                    background: theme.colors.background,
                    color: theme.colors.textPrimary,
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="all">All Zones</option>
                  <option value="Zone A">Zone A</option>
                  <option value="Zone B">Zone B</option>
                  <option value="Zone C">Zone C</option>
                  <option value="Zone D">Zone D</option>
                </select>
                <input
                  type="text"
                  placeholder="Search boxes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                  style={{ width: '250px' }}
                />
                <button className="btn btn-primary" onClick={() => setShowAddBoxModal(true)}>
                  Add Box
                </button>
              </div>
            </div>
            <div className="card-body">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Box Code</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Location</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Client</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Capacity</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Environment</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBoxes.map(box => (
                      <tr key={box.id} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                        <td style={{ padding: '0.75rem', fontWeight: '600', color: theme.colors.primary }}>
                          {box.boxCode}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: '500' }}>{box.zone}</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: theme.colors.textSecondary }}>Shelf: {box.shelf}</p>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>{box.clientName}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ flex: 1, height: '8px', background: theme.colors.backgroundElevated, borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${(box.occupied / box.capacity) * 100}%`, height: '100%', background: theme.colors.primary }}></div>
                            </div>
                            <span style={{ fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                              {box.occupied}/{box.capacity}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                          {box.temperature}°C / {box.humidity}%
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className="status-badge" style={{ backgroundColor: getStatusColor(box.status) }}>
                            {box.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button className="btn btn-sm btn-outline">View</button>
                            <button className="btn btn-sm btn-outline">Audit</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Box Modal */}
      {showAddBoxModal && (
        <div className="modal-overlay" onClick={() => setShowAddBoxModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Storage Box</h2>
              <button className="close-btn" onClick={() => setShowAddBoxModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                    Box Code
                  </label>
                  <input type="text" className="search-input" style={{ width: '100%' }} placeholder="BOX-2024-XXXX" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                      Zone
                    </label>
                    <select className="search-input" style={{ width: '100%' }}>
                      <option>Zone A</option>
                      <option>Zone B</option>
                      <option>Zone C</option>
                      <option>Zone D</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                      Shelf
                    </label>
                    <input type="text" className="search-input" style={{ width: '100%' }} placeholder="A-01-01" />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                    Client
                  </label>
                  <select className="search-input" style={{ width: '100%' }}>
                    <option>Department of Justice</option>
                    <option>Metro Police Department</option>
                    <option>Provincial Court</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                    Capacity (Number of Dockets)
                  </label>
                  <input type="number" className="search-input" style={{ width: '100%' }} placeholder="100" />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Box</button>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAddBoxModal(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorageManagement;