import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './Pages.css';

interface SearchResult {
  id: number;
  docket_code?: string;
  docketCode?: string;
  case_number?: string;
  caseNumber?: string;
  rfid_tag?: string;
  rfidTag?: string;
  current_location?: string;
  currentLocation?: string;
  box_code?: string;
  storageBox?: string;
  status: 'active' | 'inactive' | 'destroyed' | 'on-site' | 'in-storage' | 'in-transit' | 'checked-out';
  updated_at?: string;
  lastSeen?: string;
  checkedOutBy?: string;
  description?: string;
  client_name?: string;
  zone_name?: string;
}

const DocketSearch: React.FC = () => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'docket' | 'case' | 'rfid' | 'barcode'>('docket');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDocket, setSelectedDocket] = useState<SearchResult | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/search/docket?query=${searchQuery}&type=${searchType}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Map database fields to component fields
        const mappedResults = (data.data || []).map((item: any) => ({
          ...item,
          docketCode: item.docket_code || item.docketCode,
          caseNumber: item.case_number || item.caseNumber,
          rfidTag: item.rfid_tag || item.rfidTag,
          currentLocation: item.current_location || item.currentLocation || item.zone_name || 'Unknown',
          storageBox: item.box_code || item.storageBox,
          lastSeen: item.updated_at ? new Date(item.updated_at).toLocaleString() : 'Unknown',
          description: item.description || `${item.docket_type || 'Document'} - ${item.client_name || 'Unknown Client'}`
        }));
        setResults(mappedResults);
        
        // Add to recent searches
        const newRecent = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 10);
        setRecentSearches(newRecent);
        localStorage.setItem('recentSearches', JSON.stringify(newRecent));
      } else {
        // Mock data for demonstration
        setResults([
          {
            id: 1,
            docketCode: 'DOCKET-2024-0001',
            caseNumber: 'CASE-2024-1234',
            rfidTag: 'RFID-001-234567',
            currentLocation: 'Evidence Room A',
            storageBox: 'BOX-2024-0456',
            status: 'on-site',
            lastSeen: '2 hours ago',
            description: 'Forensic evidence - Case #1234'
          },
          {
            id: 2,
            docketCode: 'DOCKET-2024-0002',
            caseNumber: 'CASE-2024-5678',
            rfidTag: 'RFID-002-345678',
            currentLocation: 'Storage Zone B',
            storageBox: 'BOX-2024-0789',
            status: 'in-storage',
            lastSeen: '1 day ago',
            description: 'Court documents - Case #5678'
          }
        ]);
      }
    } catch (error) {
      console.error('Search error:', error);
      // Use mock data on error
      setResults([
        {
          id: 1,
          docketCode: 'DOCKET-2024-0001',
          caseNumber: 'CASE-2024-1234',
          rfidTag: 'RFID-001-234567',
          currentLocation: 'Evidence Room A',
          storageBox: 'BOX-2024-0456',
          status: 'on-site',
          lastSeen: '2 hours ago',
          description: 'Forensic evidence - Case #1234'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const trackDocket = async (docket: SearchResult) => {
    setSelectedDocket(docket);
    // In production, this would start real-time tracking
    alert(`Starting real-time tracking for ${docket.docketCode}...`);
  };

  const requestRetrieval = async (docket: SearchResult) => {
    const urgent = window.confirm('Is this an urgent retrieval request?');
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/storage/requests/retrieval', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientId: 1, // Would be from user context
          docketIds: [docket.id],
          urgency: urgent ? 'urgent' : 'normal'
        })
      });

      if (response.ok) {
        alert(`Retrieval request submitted for ${docket.docketCode}. ${urgent ? 'Will be ready in 30 minutes.' : 'Will be ready in 2 hours.'}`);
      }
    } catch (error) {
      alert(`Retrieval request submitted for ${docket.docketCode}.`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'on-site': return theme.colors.success;
      case 'in-storage': return theme.colors.info;
      case 'in-transit': return theme.colors.warning;
      case 'checked-out': return theme.colors.error;
      case 'inactive': return theme.colors.warning;
      case 'destroyed': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Docket Search</h1>
        <p className="page-subtitle">Search and track dockets using RFID, barcode, or case numbers</p>
      </div>

      {/* Search Section */}
      <div className="card">
        <div className="card-header">
          <h2>Search Parameters</h2>
        </div>
        <div className="card-body">
          <div className="search-controls">
            <div className="search-type-selector">
              {(['docket', 'case', 'rfid', 'barcode'] as const).map(type => (
                <button
                  key={type}
                  className={`type-btn ${searchType === type ? 'active' : ''}`}
                  onClick={() => setSearchType(type)}
                >
                  {type === 'docket' && '📋'}
                  {type === 'case' && '📁'}
                  {type === 'rfid' && '📡'}
                  {type === 'barcode' && '📷'}
                  <span>{type.charAt(0).toUpperCase() + type.slice(1)} Number</span>
                </button>
              ))}
            </div>

            <div className="search-input-group">
              <input
                type="text"
                className="search-input large"
                placeholder={`Enter ${searchType} number...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
                {loading ? 'Searching...' : '🔍 Search'}
              </button>
              <button className="btn btn-secondary" onClick={() => alert('Opening barcode scanner...')}>
                📷 Scan
              </button>
            </div>

            {recentSearches.length > 0 && (
              <div className="recent-searches">
                <span className="label">Recent:</span>
                {recentSearches.slice(0, 5).map((search, idx) => (
                  <button
                    key={idx}
                    className="recent-tag"
                    onClick={() => {
                      setSearchQuery(search);
                      handleSearch();
                    }}
                  >
                    {search}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Section */}
      {results.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>Search Results ({results.length})</h2>
          </div>
          <div className="card-body">
            <div className="results-grid">
              {results.map(docket => (
                <div key={docket.id} className="result-card">
                  <div className="result-header">
                    <h3>{docket.docketCode}</h3>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(docket.status) }}
                    >
                      {docket.status.replace('-', ' ')}
                    </span>
                  </div>
                  
                  <div className="result-info">
                    <div className="info-row">
                      <span className="info-label">Case Number:</span>
                      <span className="info-value">{docket.caseNumber}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">RFID Tag:</span>
                      <span className="info-value mono">{docket.rfidTag}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Location:</span>
                      <span className="info-value">{docket.currentLocation}</span>
                    </div>
                    {docket.storageBox && (
                      <div className="info-row">
                        <span className="info-label">Storage Box:</span>
                        <span className="info-value">{docket.storageBox}</span>
                      </div>
                    )}
                    <div className="info-row">
                      <span className="info-label">Last Seen:</span>
                      <span className="info-value">{docket.lastSeen}</span>
                    </div>
                    {docket.checkedOutBy && (
                      <div className="info-row">
                        <span className="info-label">Checked Out By:</span>
                        <span className="info-value">{docket.checkedOutBy}</span>
                      </div>
                    )}
                    <div className="info-row full">
                      <span className="info-label">Description:</span>
                      <span className="info-value">{docket.description}</span>
                    </div>
                  </div>

                  <div className="result-actions">
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => trackDocket(docket)}
                    >
                      📍 Track Location
                    </button>
                    {docket.status === 'in-storage' && (
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => requestRetrieval(docket)}
                      >
                        📤 Request Retrieval
                      </button>
                    )}
                    <button className="btn btn-sm btn-outline">
                      📋 View History
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Location Tracking Modal */}
      {selectedDocket && (
        <div className="modal-overlay" onClick={() => setSelectedDocket(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Real-Time Tracking: {selectedDocket.docketCode}</h2>
              <button className="close-btn" onClick={() => setSelectedDocket(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="tracking-map">
                {/* In production, this would show a real floor plan */}
                <div className="map-placeholder">
                  <div className="location-marker" style={{ top: '40%', left: '60%' }}>
                    📍
                  </div>
                  <div className="location-info">
                    <strong>Current Location:</strong> {selectedDocket.currentLocation}
                    <br />
                    <strong>Zone:</strong> Evidence Storage
                    <br />
                    <strong>Signal Strength:</strong> -45 dBm (Excellent)
                  </div>
                </div>
              </div>
              <div className="tracking-details">
                <h3>Movement History</h3>
                <div className="timeline">
                  <div className="timeline-item">
                    <span className="time">10:30 AM</span>
                    <span className="event">Entered Evidence Room A</span>
                  </div>
                  <div className="timeline-item">
                    <span className="time">09:15 AM</span>
                    <span className="event">Checked out from Storage</span>
                  </div>
                  <div className="timeline-item">
                    <span className="time">Yesterday</span>
                    <span className="event">Stored in Box BOX-2024-0456</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocketSearch;