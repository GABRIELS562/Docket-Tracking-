import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { storageAPI, StorageBox, StorageZone, RetrievalRequest, StorageStatistics } from '../services/StorageAPIService';
import './Pages.css';

const StorageManagementV2: React.FC = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'overview' | 'zones' | 'boxes' | 'requests' | 'billing'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [statistics, setStatistics] = useState<StorageStatistics | null>(null);
  const [zones, setZones] = useState<StorageZone[]>([]);
  const [boxes, setBoxes] = useState<StorageBox[]>([]);
  const [requests, setRequests] = useState<RetrievalRequest[]>([]);
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  
  // Modal states
  const [showAddBoxModal, setShowAddBoxModal] = useState(false);
  const [showRetrievalModal, setShowRetrievalModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  
  // Form states
  const [newBoxForm, setNewBoxForm] = useState({
    client_id: 1,
    zone_id: 1,
    capacity: 100,
    box_type: 'standard'
  });
  
  const [retrievalForm, setRetrievalForm] = useState({
    client_id: 1,
    docket_ids: [] as number[],
    urgency: 'normal' as 'normal' | 'urgent',
    notes: ''
  });

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, zonesData, boxesData, requestsData] = await Promise.all([
        storageAPI.getStorageStatistics(),
        storageAPI.getStorageZones(),
        storageAPI.getStorageBoxes(),
        storageAPI.getRetrievalRequests({ status: 'pending' })
      ]);
      
      setStatistics(statsData);
      setZones(zonesData);
      setBoxes(boxesData);
      setRequests(requestsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load storage data');
      console.error('Error loading storage data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBoxes = async (filters?: any) => {
    try {
      const data = await storageAPI.getStorageBoxes(filters);
      setBoxes(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateBox = async () => {
    try {
      await storageAPI.createStorageBox(newBoxForm);
      setShowAddBoxModal(false);
      loadBoxes();
      alert('Storage box created successfully!');
    } catch (err: any) {
      alert(`Error creating box: ${err.message}`);
    }
  };

  const handleCreateRetrieval = async () => {
    try {
      await storageAPI.createRetrievalRequest(retrievalForm);
      setShowRetrievalModal(false);
      loadDashboardData();
      alert(`Retrieval request created. ${retrievalForm.urgency === 'urgent' ? 'Will be ready in 30 minutes.' : 'Will be ready in 2 hours.'}`);
    } catch (err: any) {
      alert(`Error creating retrieval request: ${err.message}`);
    }
  };

  const handleCompleteRetrieval = async (requestId: number) => {
    try {
      await storageAPI.completeRetrieval(requestId);
      loadDashboardData();
      alert('Retrieval completed successfully!');
    } catch (err: any) {
      alert(`Error completing retrieval: ${err.message}`);
    }
  };

  const getUtilizationColor = (percent: number) => {
    if (percent >= 90) return theme.colors.error;
    if (percent >= 70) return theme.colors.warning;
    return theme.colors.success;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return theme.colors.success;
      case 'full': return theme.colors.error;
      case 'pending': return theme.colors.warning;
      case 'processing': return theme.colors.info;
      case 'completed': return theme.colors.success;
      default: return theme.colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">Loading storage data...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Storage Management</h1>
        <p className="page-subtitle">Manage storage zones, boxes, and retrieval requests</p>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={loadDashboardData}>Retry</button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'zones' ? 'active' : ''}`}
          onClick={() => setActiveTab('zones')}
        >
          🏢 Zones
        </button>
        <button
          className={`tab-btn ${activeTab === 'boxes' ? 'active' : ''}`}
          onClick={() => setActiveTab('boxes')}
        >
          📦 Boxes
        </button>
        <button
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          📤 Requests
        </button>
        <button
          className={`tab-btn ${activeTab === 'billing' ? 'active' : ''}`}
          onClick={() => setActiveTab('billing')}
        >
          💰 Billing
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && statistics && (
        <div className="tab-content">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-details">
                <div className="stat-value">{statistics.summary.total_boxes}</div>
                <div className="stat-label">Total Boxes</div>
                <div className="stat-sub">{statistics.summary.active_boxes} active</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">📄</div>
              <div className="stat-details">
                <div className="stat-value">{statistics.summary.total_dockets}</div>
                <div className="stat-label">Stored Dockets</div>
                <div className="stat-sub">{statistics.summary.full_boxes} boxes full</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🏢</div>
              <div className="stat-details">
                <div className="stat-value">{statistics.summary.total_clients}</div>
                <div className="stat-label">Active Clients</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-details">
                <div className="stat-value">R{statistics.summary.monthly_revenue?.toFixed(2) || '0.00'}</div>
                <div className="stat-label">Monthly Revenue</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Zone Utilization</h2>
            </div>
            <div className="card-body">
              {statistics.zones.map((zone, idx) => (
                <div key={idx} className="utilization-bar">
                  <div className="utilization-label">
                    <span>{zone.zone_name}</span>
                    <span>{zone.utilization}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${zone.utilization}%`,
                        backgroundColor: getUtilizationColor(zone.utilization)
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Recent Activity</h2>
            </div>
            <div className="card-body">
              <div className="activity-list">
                {statistics.recentActivity?.slice(0, 5).map((activity, idx) => (
                  <div key={idx} className="activity-item">
                    <div className="activity-icon">
                      {activity.movement_type === 'check-in' ? '📥' : '📤'}
                    </div>
                    <div className="activity-details">
                      <div className="activity-main">
                        {activity.docket_code} - {activity.movement_type}
                      </div>
                      <div className="activity-meta">
                        By {activity.performed_by} • {new Date(activity.movement_timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zones Tab */}
      {activeTab === 'zones' && (
        <div className="tab-content">
          <div className="zones-grid">
            {zones.map(zone => (
              <div key={zone.id} className="zone-card">
                <div className="zone-header">
                  <h3>{zone.zone_name}</h3>
                  <span className={`zone-status ${zone.is_active ? 'active' : 'inactive'}`}>
                    {zone.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="zone-stats">
                  <div className="zone-stat">
                    <span className="label">Type:</span>
                    <span className="value">{zone.zone_type}</span>
                  </div>
                  <div className="zone-stat">
                    <span className="label">Boxes:</span>
                    <span className="value">{zone.box_count || 0}</span>
                  </div>
                  <div className="zone-stat">
                    <span className="label">Capacity:</span>
                    <span className="value">{zone.used_capacity}/{zone.total_capacity}</span>
                  </div>
                  <div className="zone-stat">
                    <span className="label">Utilization:</span>
                    <span className="value">{zone.utilization_percentage?.toFixed(1) || 0}%</span>
                  </div>
                  {zone.temperature && (
                    <div className="zone-stat">
                      <span className="label">Temp:</span>
                      <span className="value">{zone.temperature}°C</span>
                    </div>
                  )}
                  {zone.humidity && (
                    <div className="zone-stat">
                      <span className="label">Humidity:</span>
                      <span className="value">{zone.humidity}%</span>
                    </div>
                  )}
                </div>
                <div className="zone-actions">
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      setSelectedZone(zone.id);
                      setActiveTab('boxes');
                      loadBoxes({ zone_id: zone.id });
                    }}
                  >
                    View Boxes
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Boxes Tab */}
      {activeTab === 'boxes' && (
        <div className="tab-content">
          <div className="controls-bar">
            <div className="filters">
              <select 
                value={selectedZone || ''} 
                onChange={(e) => {
                  const zoneId = e.target.value ? parseInt(e.target.value) : null;
                  setSelectedZone(zoneId);
                  loadBoxes(zoneId ? { zone_id: zoneId } : {});
                }}
              >
                <option value="">All Zones</option>
                {zones.map(zone => (
                  <option key={zone.id} value={zone.id}>{zone.zone_name}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={() => setShowAddBoxModal(true)}>
              ➕ Add Box
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Box Code</th>
                  <th>Zone</th>
                  <th>Client</th>
                  <th>Shelf</th>
                  <th>Capacity</th>
                  <th>Utilization</th>
                  <th>Status</th>
                  <th>Monthly Rate</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {boxes.map(box => (
                  <tr key={box.id}>
                    <td className="mono">{box.box_code}</td>
                    <td>{box.zone_name || `Zone ${box.zone_id}`}</td>
                    <td>{box.client_name || `Client ${box.client_id}`}</td>
                    <td>{box.shelf_code}</td>
                    <td>{box.occupied}/{box.capacity}</td>
                    <td>
                      <div className="mini-progress">
                        <div 
                          className="mini-progress-fill"
                          style={{ 
                            width: `${(box.occupied / box.capacity) * 100}%`,
                            backgroundColor: getUtilizationColor((box.occupied / box.capacity) * 100)
                          }}
                        />
                        <span>{((box.occupied / box.capacity) * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(box.status) }}
                      >
                        {box.status}
                      </span>
                    </td>
                    <td>R{box.monthly_rate.toFixed(2)}</td>
                    <td>
                      <button className="btn btn-xs">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Retrieval Requests Tab */}
      {activeTab === 'requests' && (
        <div className="tab-content">
          <div className="controls-bar">
            <div className="filters">
              <select onChange={(e) => loadDashboardData()}>
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="ready">Ready</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={() => setShowRetrievalModal(true)}>
              ➕ New Request
            </button>
          </div>

          <div className="requests-grid">
            {requests.map(request => (
              <div key={request.id} className="request-card">
                <div className="request-header">
                  <h3>{request.request_number}</h3>
                  <span 
                    className={`urgency-badge ${request.urgency}`}
                    style={{ 
                      backgroundColor: request.urgency === 'urgent' ? theme.colors.error : theme.colors.warning 
                    }}
                  >
                    {request.urgency}
                  </span>
                </div>
                <div className="request-details">
                  <div className="detail-row">
                    <span className="label">Client:</span>
                    <span className="value">{request.client_name || `Client ${request.client_id}`}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Items:</span>
                    <span className="value">{request.total_items}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Status:</span>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(request.status) }}
                    >
                      {request.status}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Deadline:</span>
                    <span className="value">
                      {request.completion_deadline ? new Date(request.completion_deadline).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  {request.retrieval_fee > 0 && (
                    <div className="detail-row">
                      <span className="label">Fee:</span>
                      <span className="value">R{request.retrieval_fee.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="request-actions">
                  {request.status === 'pending' && (
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => handleCompleteRetrieval(request.id)}
                    >
                      Process
                    </button>
                  )}
                  {request.status === 'processing' && (
                    <button 
                      className="btn btn-sm btn-success"
                      onClick={() => handleCompleteRetrieval(request.id)}
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="tab-content">
          <div className="card">
            <div className="card-header">
              <h2>Monthly Billing Summary</h2>
              <button className="btn btn-primary" onClick={() => setShowBillingModal(true)}>
                Generate Invoice
              </button>
            </div>
            <div className="card-body">
              <div className="billing-summary">
                <div className="billing-item">
                  <span className="label">Active Storage Boxes:</span>
                  <span className="value">{statistics?.summary.active_boxes || 0}</span>
                  <span className="amount">R{((statistics?.summary.active_boxes || 0) * 40).toFixed(2)}</span>
                </div>
                <div className="billing-item">
                  <span className="label">Retrieval Requests (This Month):</span>
                  <span className="value">{requests.filter(r => r.status === 'completed').length}</span>
                  <span className="amount">R{requests.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.retrieval_fee, 0).toFixed(2)}</span>
                </div>
                <div className="billing-item total">
                  <span className="label">Total Monthly Revenue:</span>
                  <span className="amount">R{statistics?.summary.monthly_revenue?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Box Modal */}
      {showAddBoxModal && (
        <div className="modal-overlay" onClick={() => setShowAddBoxModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Storage Box</h2>
              <button className="close-btn" onClick={() => setShowAddBoxModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Client ID</label>
                <input
                  type="number"
                  value={newBoxForm.client_id}
                  onChange={(e) => setNewBoxForm({...newBoxForm, client_id: parseInt(e.target.value)})}
                />
              </div>
              <div className="form-group">
                <label>Zone</label>
                <select
                  value={newBoxForm.zone_id}
                  onChange={(e) => setNewBoxForm({...newBoxForm, zone_id: parseInt(e.target.value)})}
                >
                  {zones.map(zone => (
                    <option key={zone.id} value={zone.id}>{zone.zone_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Capacity</label>
                <input
                  type="number"
                  value={newBoxForm.capacity}
                  onChange={(e) => setNewBoxForm({...newBoxForm, capacity: parseInt(e.target.value)})}
                />
              </div>
              <div className="form-group">
                <label>Box Type</label>
                <select
                  value={newBoxForm.box_type}
                  onChange={(e) => setNewBoxForm({...newBoxForm, box_type: e.target.value})}
                >
                  <option value="standard">Standard</option>
                  <option value="fireproof">Fireproof</option>
                  <option value="climate_controlled">Climate Controlled</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddBoxModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateBox}>
                Create Box
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retrieval Request Modal */}
      {showRetrievalModal && (
        <div className="modal-overlay" onClick={() => setShowRetrievalModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Retrieval Request</h2>
              <button className="close-btn" onClick={() => setShowRetrievalModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Client ID</label>
                <input
                  type="number"
                  value={retrievalForm.client_id}
                  onChange={(e) => setRetrievalForm({...retrievalForm, client_id: parseInt(e.target.value)})}
                />
              </div>
              <div className="form-group">
                <label>Docket IDs (comma separated)</label>
                <input
                  type="text"
                  placeholder="1, 2, 3"
                  onChange={(e) => setRetrievalForm({
                    ...retrievalForm, 
                    docket_ids: e.target.value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
                  })}
                />
              </div>
              <div className="form-group">
                <label>Urgency</label>
                <select
                  value={retrievalForm.urgency}
                  onChange={(e) => setRetrievalForm({...retrievalForm, urgency: e.target.value as 'normal' | 'urgent'})}
                >
                  <option value="normal">Normal (2 hours)</option>
                  <option value="urgent">Urgent (30 minutes) - R50/item fee</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={retrievalForm.notes}
                  onChange={(e) => setRetrievalForm({...retrievalForm, notes: e.target.value})}
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRetrievalModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateRetrieval}>
                Create Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorageManagementV2;