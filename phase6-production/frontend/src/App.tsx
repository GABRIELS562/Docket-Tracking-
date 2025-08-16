import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'http://localhost:3000/api';

interface User {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  department?: string;
}

interface ObjectItem {
  id: number;
  object_code: string;
  name: string;
  description: string;
  object_type: string;
  category: string;
  status: string;
  created_at: string;
  created_by_name: string;
}

interface LoginForm {
  email: string;
  password: string;
}

interface ObjectForm {
  object_code: string;
  name: string;
  description: string;
  object_type: string;
  category: string;
}

function App() {
  const [token, setToken] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [loginForm, setLoginForm] = useState<LoginForm>({ email: '', password: '' });
  const [objectForm, setObjectForm] = useState<ObjectForm>({
    object_code: '',
    name: '',
    description: '',
    object_type: 'docket',
    category: ''
  });
  const [message, setMessage] = useState<string>('');

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, loginForm);
      const data: any = response.data;
      if (data.success) {
        setToken(data.data.token);
        setUser(data.data.user);
        showMessage('Login successful!');
        setLoginForm({ email: '', password: '' });
        // Fetch objects after login
        fetchObjects(data.data.token);
      }
    } catch (error: any) {
      showMessage('Login failed: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const fetchObjects = async (authToken: string = token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/objects`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data: any = response.data;
      if (data.success) {
        setObjects(data.data);
      }
    } catch (error: any) {
      showMessage('Failed to fetch objects: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const handleCreateObject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE_URL}/objects`, objectForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data: any = response.data;
      if (data.success) {
        showMessage('Object created successfully!');
        setObjectForm({
          object_code: '',
          name: '',
          description: '',
          object_type: 'docket',
          category: ''
        });
        fetchObjects();
      }
    } catch (error: any) {
      showMessage('Failed to create object: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    setObjects([]);
    showMessage('Logged out successfully');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎯 RFID Docket Tracking System</h1>
        <h2>Phase 1 Foundation</h2>
        
        {message && (
          <div className="message" style={{
            padding: '10px',
            margin: '10px 0',
            backgroundColor: '#e3f2fd',
            border: '1px solid #2196f3',
            borderRadius: '4px',
            color: '#1976d2'
          }}>
            {message}
          </div>
        )}

        {!user ? (
          <div className="login-section">
            <h3>Login</h3>
            <form onSubmit={handleLogin} style={{ marginBottom: '20px' }}>
              <input
                type="email"
                placeholder="Email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                required
                style={{ margin: '5px', padding: '10px', fontSize: '16px' }}
              />
              <input
                type="password"
                placeholder="Password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                required
                style={{ margin: '5px', padding: '10px', fontSize: '16px' }}
              />
              <button type="submit" style={{ margin: '5px', padding: '10px 20px', fontSize: '16px' }}>
                Login
              </button>
            </form>
            <p>Use: admin@dockettrack.gov / admin123</p>
          </div>
        ) : (
          <div className="main-content">
            <div className="user-info" style={{ marginBottom: '20px' }}>
              <h3>Welcome, {user.first_name} {user.last_name}!</h3>
              <p>Role: {user.role} | Department: {user.department || 'N/A'}</p>
              <button onClick={handleLogout} style={{ padding: '5px 10px' }}>Logout</button>
            </div>

            <div className="create-object-section" style={{ marginBottom: '30px' }}>
              <h3>Create New Object</h3>
              <form onSubmit={handleCreateObject} style={{ display: 'flex', flexDirection: 'column', maxWidth: '400px', margin: '0 auto' }}>
                <input
                  type="text"
                  placeholder="Object Code (e.g., DOC-2025-001)"
                  value={objectForm.object_code}
                  onChange={(e) => setObjectForm({...objectForm, object_code: e.target.value})}
                  required
                  style={{ margin: '5px', padding: '8px' }}
                />
                <input
                  type="text"
                  placeholder="Name"
                  value={objectForm.name}
                  onChange={(e) => setObjectForm({...objectForm, name: e.target.value})}
                  required
                  style={{ margin: '5px', padding: '8px' }}
                />
                <textarea
                  placeholder="Description"
                  value={objectForm.description}
                  onChange={(e) => setObjectForm({...objectForm, description: e.target.value})}
                  style={{ margin: '5px', padding: '8px', minHeight: '60px' }}
                />
                <select
                  value={objectForm.object_type}
                  onChange={(e) => setObjectForm({...objectForm, object_type: e.target.value})}
                  style={{ margin: '5px', padding: '8px' }}
                >
                  <option value="docket">Docket</option>
                  <option value="evidence">Evidence</option>
                  <option value="equipment">Equipment</option>
                  <option value="file">File</option>
                  <option value="tool">Tool</option>
                </select>
                <input
                  type="text"
                  placeholder="Category"
                  value={objectForm.category}
                  onChange={(e) => setObjectForm({...objectForm, category: e.target.value})}
                  style={{ margin: '5px', padding: '8px' }}
                />
                <button type="submit" style={{ margin: '5px', padding: '10px' }}>
                  Create Object
                </button>
              </form>
            </div>

            <div className="objects-list">
              <h3>Objects ({objects.length})</h3>
              {objects.length === 0 ? (
                <p>No objects found. Create one above!</p>
              ) : (
                <div style={{ display: 'grid', gap: '10px', maxWidth: '800px', margin: '0 auto' }}>
                  {objects.map(obj => (
                    <div key={obj.id} style={{
                      border: '1px solid #ccc',
                      padding: '15px',
                      borderRadius: '8px',
                      backgroundColor: '#f9f9f9',
                      textAlign: 'left'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: '0 0 5px 0' }}>{obj.name}</h4>
                        <span style={{ 
                          padding: '4px 8px', 
                          backgroundColor: obj.object_type === 'docket' ? '#4caf50' : '#2196f3',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {obj.object_type.toUpperCase()}
                        </span>
                      </div>
                      <p><strong>Code:</strong> {obj.object_code}</p>
                      <p><strong>Category:</strong> {obj.category}</p>
                      <p><strong>Description:</strong> {obj.description}</p>
                      <p><strong>Status:</strong> {obj.status}</p>
                      <p><strong>Created:</strong> {new Date(obj.created_at).toLocaleDateString()}</p>
                      <p><strong>Created by:</strong> {obj.created_by_name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;