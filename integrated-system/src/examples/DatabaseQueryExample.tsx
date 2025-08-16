/**
 * Example Component: How to Query the Database from Frontend
 * 
 * This file demonstrates various ways to interact with the database
 * through the API endpoints from React components.
 */

import React, { useState, useEffect } from 'react';

// ============================================
// EXAMPLE 1: Basic Query with Authentication
// ============================================
export const BasicDatabaseQuery: React.FC = () => {
  const [dockets, setDockets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDockets = async () => {
    setLoading(true);
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      
      // Make API call to search endpoint
      const response = await fetch('/api/search/docket?query=DOCKET-2024', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDockets(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching dockets:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Basic Database Query</h2>
      <button onClick={fetchDockets}>Fetch Dockets</button>
      {loading && <p>Loading...</p>}
      <ul>
        {dockets.map(d => (
          <li key={d.id}>{d.docket_code} - {d.client_name}</li>
        ))}
      </ul>
    </div>
  );
};

// ============================================
// EXAMPLE 2: Create New Record
// ============================================
export const CreateStorageBox: React.FC = () => {
  const [message, setMessage] = useState('');

  const createBox = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/api/storage-db/boxes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: 1,
          zone_id: 1,
          capacity: 100,
          box_type: 'standard'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(`Created box: ${data.data.box_code}`);
      }
    } catch (error) {
      console.error('Error creating box:', error);
    }
  };

  return (
    <div>
      <h2>Create Storage Box</h2>
      <button onClick={createBox}>Create New Box</button>
      {message && <p>{message}</p>}
    </div>
  );
};

// ============================================
// EXAMPLE 3: Real-time Updates with Polling
// ============================================
export const RealtimeStorageStats: React.FC = () => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/storage-db/statistics', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setStats(data.data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    // Initial fetch
    fetchStats();

    // Poll every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2>Storage Statistics (Live)</h2>
      {stats && (
        <div>
          <p>Total Boxes: {stats.summary.total_boxes}</p>
          <p>Active Boxes: {stats.summary.active_boxes}</p>
          <p>Total Dockets: {stats.summary.total_dockets}</p>
          <p>Monthly Revenue: R{stats.summary.monthly_revenue}</p>
          
          <h3>Zone Utilization:</h3>
          {stats.zones.map((zone: any) => (
            <div key={zone.zone_name}>
              {zone.zone_name}: {zone.utilization}%
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// EXAMPLE 4: Complex Query with Filters
// ============================================
export const FilteredSearch: React.FC = () => {
  const [boxes, setBoxes] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    zone_id: '',
    client_id: '',
    status: 'active'
  });

  const searchBoxes = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Build query string from filters
      const params = new URLSearchParams();
      if (filters.zone_id) params.append('zone_id', filters.zone_id);
      if (filters.client_id) params.append('client_id', filters.client_id);
      if (filters.status) params.append('status', filters.status);
      
      const response = await fetch(`/api/storage-db/boxes?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBoxes(data.data || []);
      }
    } catch (error) {
      console.error('Error searching boxes:', error);
    }
  };

  return (
    <div>
      <h2>Filtered Box Search</h2>
      <input
        placeholder="Zone ID"
        value={filters.zone_id}
        onChange={(e) => setFilters({...filters, zone_id: e.target.value})}
      />
      <input
        placeholder="Client ID"
        value={filters.client_id}
        onChange={(e) => setFilters({...filters, client_id: e.target.value})}
      />
      <select
        value={filters.status}
        onChange={(e) => setFilters({...filters, status: e.target.value})}
      >
        <option value="active">Active</option>
        <option value="full">Full</option>
        <option value="inactive">Inactive</option>
      </select>
      <button onClick={searchBoxes}>Search</button>
      
      <ul>
        {boxes.map(box => (
          <li key={box.id}>
            {box.box_code} - {box.client_name} - {box.zone_name} ({box.docket_count} dockets)
          </li>
        ))}
      </ul>
    </div>
  );
};

// ============================================
// EXAMPLE 5: Transaction (Retrieval Request)
// ============================================
export const CreateRetrievalRequest: React.FC = () => {
  const [requestId, setRequestId] = useState<string>('');

  const createRequest = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/api/storage-db/requests/retrieval', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: 1,
          docket_ids: [1, 2, 3],
          urgency: 'urgent',
          notes: 'Needed for court hearing'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setRequestId(data.data.request_number);
      }
    } catch (error) {
      console.error('Error creating request:', error);
    }
  };

  return (
    <div>
      <h2>Create Retrieval Request</h2>
      <button onClick={createRequest}>Create Urgent Request</button>
      {requestId && <p>Created request: {requestId}</p>}
    </div>
  );
};

// ============================================
// Custom Hook for Database Queries
// ============================================
export const useDatabase = () => {
  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json'
  });

  const query = async (endpoint: string, options?: RequestInit) => {
    try {
      const response = await fetch(`/api${endpoint}`, {
        ...options,
        headers: {
          ...getAuthHeaders(),
          ...options?.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  };

  return {
    // Search operations
    searchDockets: (query: string) => 
      query(`/search/docket?query=${encodeURIComponent(query)}`),
    
    // Storage operations
    getStorageZones: () => query('/storage-db/zones'),
    getStorageBoxes: (filters?: any) => {
      const params = new URLSearchParams(filters).toString();
      return query(`/storage-db/boxes${params ? '?' + params : ''}`);
    },
    createStorageBox: (data: any) =>
      query('/storage-db/boxes', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    // Statistics
    getStatistics: () => query('/storage-db/statistics'),
    
    // Retrieval requests
    createRetrievalRequest: (data: any) =>
      query('/storage-db/requests/retrieval', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    getRetrievalRequests: (filters?: any) => {
      const params = new URLSearchParams(filters).toString();
      return query(`/storage-db/requests/retrieval${params ? '?' + params : ''}`);
    }
  };
};

// ============================================
// Usage Example with Custom Hook
// ============================================
export const ComponentWithCustomHook: React.FC = () => {
  const db = useDatabase();
  const [zones, setZones] = useState<any[]>([]);

  useEffect(() => {
    db.getStorageZones()
      .then(setZones)
      .catch(console.error);
  }, []);

  return (
    <div>
      <h2>Storage Zones (using custom hook)</h2>
      {zones.map(zone => (
        <div key={zone.id}>
          {zone.zone_name}: {zone.utilization_percentage}% utilized
        </div>
      ))}
    </div>
  );
};

// ============================================
// MAIN EXAMPLE COMPONENT
// ============================================
const DatabaseQueryExamples: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Database Query Examples</h1>
      <p>These examples show how to interact with the PostgreSQL database from React components.</p>
      
      <hr />
      
      <BasicDatabaseQuery />
      
      <hr />
      
      <CreateStorageBox />
      
      <hr />
      
      <RealtimeStorageStats />
      
      <hr />
      
      <FilteredSearch />
      
      <hr />
      
      <CreateRetrievalRequest />
      
      <hr />
      
      <ComponentWithCustomHook />
    </div>
  );
};

export default DatabaseQueryExamples;