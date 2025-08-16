import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './Pages.css';

interface RFIDReader {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'error';
  lastPing: string;
  readCount: number;
  signalStrength: number;
  battery?: number;
}

interface TrackingEvent {
  id: number;
  timestamp: string;
  docketCode: string;
  rfidTag: string;
  reader: string;
  location: string;
  action: 'entry' | 'exit' | 'pass' | 'scan';
  user?: string;
  signalStrength: number;
}

interface ActiveTracking {
  docketCode: string;
  rfidTag: string;
  currentLocation: string;
  lastSeen: string;
  movementHistory: { location: string; timestamp: string }[];
  status: 'stationary' | 'moving' | 'lost';
}

const RFIDTracking: React.FC = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'live' | 'readers' | 'history' | 'alerts'>('live');
  const [readers, setReaders] = useState<RFIDReader[]>([]);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [activeTrackings, setActiveTrackings] = useState<ActiveTracking[]>([]);
  const [selectedReader, setSelectedReader] = useState<RFIDReader | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterLocation, setFilterLocation] = useState('all');

  useEffect(() => {
    // Load mock data
    setReaders([
      {
        id: 'READER-001',
        name: 'Main Entrance',
        location: 'Building A - Ground Floor',
        status: 'online',
        lastPing: '2 seconds ago',
        readCount: 1543,
        signalStrength: 95
      },
      {
        id: 'READER-002',
        name: 'Evidence Room A',
        location: 'Building A - Level 2',
        status: 'online',
        lastPing: '5 seconds ago',
        readCount: 892,
        signalStrength: 88
      },
      {
        id: 'READER-003',
        name: 'Storage Zone B',
        location: 'Warehouse - Zone B',
        status: 'online',
        lastPing: '1 second ago',
        readCount: 2156,
        signalStrength: 92
      },
      {
        id: 'READER-004',
        name: 'Archive Entry',
        location: 'Building B - Basement',
        status: 'offline',
        lastPing: '15 minutes ago',
        readCount: 0,
        signalStrength: 0
      },
      {
        id: 'HANDHELD-001',
        name: 'Mobile Scanner 1',
        location: 'Field',
        status: 'online',
        lastPing: '10 seconds ago',
        readCount: 234,
        signalStrength: 78,
        battery: 85
      }
    ]);

    setTrackingEvents([
      {
        id: 1,
        timestamp: '14:32:15',
        docketCode: 'DOCKET-2024-0001',
        rfidTag: 'RFID-001-234567',
        reader: 'Evidence Room A',
        location: 'Building A - Level 2',
        action: 'entry',
        user: 'John Smith',
        signalStrength: 92
      },
      {
        id: 2,
        timestamp: '14:30:45',
        docketCode: 'DOCKET-2024-0145',
        rfidTag: 'RFID-145-567890',
        reader: 'Main Entrance',
        location: 'Building A - Ground Floor',
        action: 'exit',
        user: 'Jane Doe',
        signalStrength: 88
      },
      {
        id: 3,
        timestamp: '14:28:12',
        docketCode: 'DOCKET-2024-0234',
        rfidTag: 'RFID-234-345678',
        reader: 'Storage Zone B',
        location: 'Warehouse - Zone B',
        action: 'scan',
        signalStrength: 95
      }
    ]);

    setActiveTrackings([
      {
        docketCode: 'DOCKET-2024-0001',
        rfidTag: 'RFID-001-234567',
        currentLocation: 'Evidence Room A',
        lastSeen: '2 minutes ago',
        movementHistory: [
          { location: 'Evidence Room A', timestamp: '14:32:15' },
          { location: 'Corridor B2', timestamp: '14:30:00' },
          { location: 'Main Entrance', timestamp: '14:25:00' }
        ],
        status: 'stationary'
      },
      {
        docketCode: 'DOCKET-2024-0145',
        rfidTag: 'RFID-145-567890',
        currentLocation: 'In Transit',
        lastSeen: '30 seconds ago',
        movementHistory: [
          { location: 'Main Entrance', timestamp: '14:30:45' },
          { location: 'Evidence Room A', timestamp: '14:15:00' }
        ],
        status: 'moving'
      }
    ]);
  }, []);

  // Auto-refresh simulation
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Update reader statuses
      setReaders(prev => prev.map(reader => ({
        ...reader,
        lastPing: reader.status === 'online' ? `${Math.floor(Math.random() * 10) + 1} seconds ago` : reader.lastPing,
        readCount: reader.status === 'online' ? reader.readCount + Math.floor(Math.random() * 5) : reader.readCount,
        signalStrength: reader.status === 'online' ? 85 + Math.floor(Math.random() * 15) : reader.signalStrength
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return theme.colors.success;
      case 'offline': return theme.colors.error;
      case 'error': return theme.colors.warning;
      case 'moving': return theme.colors.info;
      case 'stationary': return theme.colors.success;
      case 'lost': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'entry': return '→';
      case 'exit': return '←';
      case 'pass': return '↔';
      case 'scan': return '📡';
      default: return '•';
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">RFID Tracking System</h1>
        <p className="page-subtitle">Real-time tracking and monitoring of RFID-enabled dockets</p>
      </div>

      {/* Tab Navigation */}
      <div className="card">
        <div className="card-header" style={{ padding: '0' }}>
          <div style={{ display: 'flex', gap: '0', width: '100%' }}>
            {(['live', 'readers', 'history', 'alerts'] as const).map(tab => (
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
                {tab === 'live' && '📡 '}
                {tab === 'readers' && '📟 '}
                {tab === 'history' && '📜 '}
                {tab === 'alerts' && '🔔 '}
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Tracking Tab */}
      {activeTab === 'live' && (
        <>
          {/* Control Bar */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                  />
                  <span style={{ fontSize: '0.875rem' }}>Auto-refresh</span>
                </label>
                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: `1px solid ${theme.colors.border}`,
                    background: theme.colors.background,
                    color: theme.colors.textPrimary,
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="all">All Locations</option>
                  <option value="building-a">Building A</option>
                  <option value="warehouse">Warehouse</option>
                  <option value="building-b">Building B</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                  {readers.filter(r => r.status === 'online').length}/{readers.length} Readers Online
                </span>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: theme.colors.success, animation: 'pulse 2s infinite' }}></span>
              </div>
            </div>
          </div>

          {/* Live Events Stream */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            <div className="card">
              <div className="card-header">
                <h2>Live Event Stream</h2>
                <span style={{ fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                  Last updated: {new Date().toLocaleTimeString()}
                </span>
              </div>
              <div className="card-body" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {trackingEvents.map(event => (
                  <div
                    key={event.id}
                    style={{
                      padding: '1rem',
                      borderBottom: `1px solid ${theme.colors.border}`,
                      display: 'flex',
                      gap: '1rem',
                      alignItems: 'center',
                      transition: 'background 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = theme.colors.hover}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: theme.colors.backgroundElevated,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      color: event.action === 'entry' ? theme.colors.success : event.action === 'exit' ? theme.colors.error : theme.colors.info
                    }}>
                      {getActionIcon(event.action)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: '600', color: theme.colors.primary }}>{event.docketCode}</span>
                        <span style={{ fontSize: '0.875rem', color: theme.colors.textSecondary }}>{event.timestamp}</span>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                        {event.action.charAt(0).toUpperCase() + event.action.slice(1)} at {event.reader}
                        {event.user && ` by ${event.user}`}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: theme.colors.textDisabled, marginTop: '0.25rem' }}>
                        RFID: {event.rfidTag} | Signal: {event.signalStrength}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Trackings */}
            <div className="card">
              <div className="card-header">
                <h2>Active Tracking</h2>
              </div>
              <div className="card-body">
                {activeTrackings.map(tracking => (
                  <div
                    key={tracking.docketCode}
                    style={{
                      padding: '1rem',
                      background: theme.colors.background,
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      border: `1px solid ${theme.colors.border}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>{tracking.docketCode}</span>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(tracking.status), fontSize: '0.625rem' }}
                      >
                        {tracking.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: theme.colors.textSecondary, marginBottom: '0.5rem' }}>
                      <div>📍 {tracking.currentLocation}</div>
                      <div>⏱ {tracking.lastSeen}</div>
                    </div>
                    <button className="btn btn-sm btn-outline" style={{ width: '100%' }}>
                      View Path
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Readers Tab */}
      {activeTab === 'readers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {readers.map(reader => (
            <div key={reader.id} className="card">
              <div className="card-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>{reader.name}</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: theme.colors.textSecondary, marginTop: '0.25rem' }}>
                    {reader.id}
                  </p>
                </div>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(reader.status) }}
                >
                  {reader.status}
                </span>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ color: theme.colors.textSecondary, fontSize: '0.75rem', marginBottom: '0.25rem' }}>Location</p>
                    <p style={{ fontWeight: '500', margin: 0, fontSize: '0.875rem' }}>{reader.location}</p>
                  </div>
                  <div>
                    <p style={{ color: theme.colors.textSecondary, fontSize: '0.75rem', marginBottom: '0.25rem' }}>Last Ping</p>
                    <p style={{ fontWeight: '500', margin: 0, fontSize: '0.875rem' }}>{reader.lastPing}</p>
                  </div>
                  <div>
                    <p style={{ color: theme.colors.textSecondary, fontSize: '0.75rem', marginBottom: '0.25rem' }}>Read Count</p>
                    <p style={{ fontWeight: '500', margin: 0, fontSize: '0.875rem' }}>{reader.readCount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p style={{ color: theme.colors.textSecondary, fontSize: '0.75rem', marginBottom: '0.25rem' }}>Signal</p>
                    <p style={{ fontWeight: '500', margin: 0, fontSize: '0.875rem' }}>{reader.signalStrength}%</p>
                  </div>
                </div>

                {reader.battery !== undefined && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
                      <span style={{ color: theme.colors.textSecondary }}>Battery</span>
                      <span style={{ fontWeight: '500' }}>{reader.battery}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: theme.colors.backgroundElevated, borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${reader.battery}%`,
                        height: '100%',
                        background: reader.battery > 50 ? theme.colors.success : reader.battery > 20 ? theme.colors.warning : theme.colors.error
                      }}></div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-sm btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => setSelectedReader(reader)}
                  >
                    Details
                  </button>
                  <button className="btn btn-sm btn-outline" style={{ flex: 1 }}>
                    Diagnostics
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="card">
          <div className="card-header">
            <h2>Tracking History</h2>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="date"
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: `1px solid ${theme.colors.border}`,
                  background: theme.colors.background,
                  color: theme.colors.textPrimary,
                  fontSize: '0.875rem'
                }}
              />
              <input
                type="text"
                placeholder="Search by docket or RFID..."
                className="search-input"
                style={{ width: '250px' }}
              />
              <button className="btn btn-primary">Export</button>
            </div>
          </div>
          <div className="card-body">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Timestamp</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Docket Code</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>RFID Tag</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Action</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Location</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>User</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: theme.colors.textSecondary }}>Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {trackingEvents.map(event => (
                    <tr key={event.id} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{event.timestamp}</td>
                      <td style={{ padding: '0.75rem', fontWeight: '500', color: theme.colors.primary }}>{event.docketCode}</td>
                      <td style={{ padding: '0.75rem', fontFamily: theme.fonts.mono, fontSize: '0.75rem' }}>{event.rfidTag}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ color: event.action === 'entry' ? theme.colors.success : event.action === 'exit' ? theme.colors.error : theme.colors.info }}>
                            {getActionIcon(event.action)}
                          </span>
                          {event.action}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{event.location}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{event.user || '-'}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{event.signalStrength}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div className="card">
            <div className="card-body" style={{ background: `linear-gradient(135deg, ${theme.colors.error}20, ${theme.colors.error}10)`, borderLeft: `4px solid ${theme.colors.error}` }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, marginBottom: '0.25rem', fontSize: '1rem' }}>Reader Offline</h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                    Archive Entry reader (READER-004) has been offline for 15 minutes
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: theme.colors.textDisabled, marginTop: '0.5rem' }}>
                    15 minutes ago
                  </p>
                </div>
                <button className="btn btn-sm btn-primary">Investigate</button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body" style={{ background: `linear-gradient(135deg, ${theme.colors.warning}20, ${theme.colors.warning}10)`, borderLeft: `4px solid ${theme.colors.warning}` }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ fontSize: '1.5rem' }}>📡</span>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, marginBottom: '0.25rem', fontSize: '1rem' }}>Weak Signal Detected</h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                    Multiple dockets in Zone C showing weak RFID signals (&lt;50%)
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: theme.colors.textDisabled, marginTop: '0.5rem' }}>
                    1 hour ago
                  </p>
                </div>
                <button className="btn btn-sm btn-outline">View Details</button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body" style={{ background: `linear-gradient(135deg, ${theme.colors.info}20, ${theme.colors.info}10)`, borderLeft: `4px solid ${theme.colors.info}` }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ fontSize: '1.5rem' }}>🔄</span>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, marginBottom: '0.25rem', fontSize: '1rem' }}>System Update Available</h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: theme.colors.textSecondary }}>
                    New firmware update available for handheld readers (v2.4.1)
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: theme.colors.textDisabled, marginTop: '0.5rem' }}>
                    2 hours ago
                  </p>
                </div>
                <button className="btn btn-sm btn-outline">Schedule Update</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reader Details Modal */}
      {selectedReader && (
        <div className="modal-overlay" onClick={() => setSelectedReader(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reader Details: {selectedReader.name}</h2>
              <button className="close-btn" onClick={() => setSelectedReader(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.875rem', color: theme.colors.textSecondary, marginBottom: '0.5rem' }}>Reader Information</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: theme.colors.textSecondary }}>ID:</span>
                      <span style={{ fontFamily: theme.fonts.mono }}>{selectedReader.id}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: theme.colors.textSecondary }}>Location:</span>
                      <span>{selectedReader.location}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: theme.colors.textSecondary }}>Status:</span>
                      <span style={{ color: getStatusColor(selectedReader.status) }}>{selectedReader.status}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '0.875rem', color: theme.colors.textSecondary, marginBottom: '0.5rem' }}>Performance Metrics</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: theme.colors.textSecondary }}>Read Count:</span>
                      <span>{selectedReader.readCount.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: theme.colors.textSecondary }}>Signal Strength:</span>
                      <span>{selectedReader.signalStrength}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: theme.colors.textSecondary }}>Last Ping:</span>
                      <span>{selectedReader.lastPing}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${theme.colors.border}`, paddingTop: '1.5rem' }}>
                <h3 style={{ fontSize: '0.875rem', color: theme.colors.textSecondary, marginBottom: '1rem' }}>Recent Events</h3>
                <div className="timeline">
                  <div className="timeline-item">
                    <span className="time">2 min ago</span>
                    <span className="event">Read DOCKET-2024-0001</span>
                  </div>
                  <div className="timeline-item">
                    <span className="time">5 min ago</span>
                    <span className="event">Read DOCKET-2024-0145</span>
                  </div>
                  <div className="timeline-item">
                    <span className="time">12 min ago</span>
                    <span className="event">System health check passed</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button className="btn btn-primary" style={{ flex: 1 }}>Run Diagnostics</button>
                <button className="btn btn-outline" style={{ flex: 1 }}>View Logs</button>
                <button className="btn btn-outline" style={{ flex: 1 }}>Restart Reader</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RFIDTracking;