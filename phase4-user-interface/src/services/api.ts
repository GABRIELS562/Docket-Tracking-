import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = (token: string) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any request modifications here
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API service functions
export const objectsAPI = {
  list: (params?: any) => api.get('/objects', { params }),
  get: (id: number) => api.get(`/objects/${id}`),
  create: (data: any) => api.post('/objects', data),
  update: (id: number, data: any) => api.put(`/objects/${id}`, data),
  delete: (id: number) => api.delete(`/objects/${id}`),
  search: (query: string) => api.get('/search/objects', { params: { q: query } }),
  assign: (id: number, personnelId: number, notes?: string) => 
    api.post(`/objects/${id}/assign`, { personnel_id: personnelId, notes }),
  move: (id: number, locationId: number, notes?: string) => 
    api.post(`/objects/${id}/move`, { location_id: locationId, notes }),
  getHistory: (id: number) => api.get(`/objects/${id}/history`),
  getChainOfCustody: (id: number) => api.get(`/objects/${id}/chain-of-custody`),
};

export const personnelAPI = {
  list: () => api.get('/personnel'),
  get: (id: number) => api.get(`/personnel/${id}`),
  create: (data: any) => api.post('/personnel', data),
  update: (id: number, data: any) => api.put(`/personnel/${id}`, data),
  getObjects: (id: number) => api.get(`/personnel/${id}/objects`),
};

export const locationsAPI = {
  list: () => api.get('/locations'),
  get: (id: number) => api.get(`/locations/${id}`),
  create: (data: any) => api.post('/locations', data),
  update: (id: number, data: any) => api.put(`/locations/${id}`, data),
  getObjects: (id: number) => api.get(`/locations/${id}/objects`),
};

export const rfidAPI = {
  getReaders: () => api.get('/rfid/readers'),
  registerReader: (data: any) => api.post('/rfid/readers', data),
  getEvents: (params?: any) => api.get('/rfid/events', { params }),
  simulate: (data: any) => api.post('/rfid/simulate', data),
};

export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getObjectAnalytics: (params?: any) => api.get('/analytics/objects', { params }),
};

export default api;