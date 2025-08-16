import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  User, 
  RfidObject, 
  Personnel, 
  Location, 
  RfidReader, 
  RfidEvent, 
  AuditLog, 
  DashboardStats,
  ApiResponse,
  SearchFilters 
} from '@/types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || '/api',
      timeout: 10000,
    });

    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const response: AxiosResponse<ApiResponse<{ token: string; user: User }>> = 
      await this.api.post('/personnel/login', { email, password });
    return response.data.data;
  }

  async scanBadge(rfid_badge_id: string): Promise<Personnel> {
    const response: AxiosResponse<ApiResponse<Personnel>> = 
      await this.api.post('/personnel/badge-scan', { rfid_badge_id });
    return response.data.data;
  }

  // Objects
  async getObjects(filters?: SearchFilters): Promise<ApiResponse<RfidObject[]>> {
    const response: AxiosResponse<ApiResponse<RfidObject[]>> = 
      await this.api.get('/objects', { params: filters });
    return response.data;
  }

  async getObject(id: number): Promise<RfidObject> {
    const response: AxiosResponse<ApiResponse<RfidObject>> = 
      await this.api.get(`/objects/${id}`);
    return response.data.data;
  }

  async createObject(object: Partial<RfidObject>): Promise<RfidObject> {
    const response: AxiosResponse<ApiResponse<RfidObject>> = 
      await this.api.post('/objects', object);
    return response.data.data;
  }

  async updateObject(id: number, updates: Partial<RfidObject>): Promise<RfidObject> {
    const response: AxiosResponse<ApiResponse<RfidObject>> = 
      await this.api.put(`/objects/${id}`, updates);
    return response.data.data;
  }

  async deleteObject(id: number): Promise<void> {
    await this.api.delete(`/objects/${id}`);
  }

  async assignObject(id: number, personnel_id: number | null): Promise<RfidObject> {
    const response: AxiosResponse<ApiResponse<RfidObject>> = 
      await this.api.post(`/objects/${id}/assign`, { personnel_id });
    return response.data.data;
  }

  async moveObject(id: number, location_id: number, reader_id?: string): Promise<RfidObject> {
    const response: AxiosResponse<ApiResponse<RfidObject>> = 
      await this.api.post(`/objects/${id}/move`, { location_id, reader_id });
    return response.data.data;
  }

  async searchObjects(filters: SearchFilters): Promise<ApiResponse<RfidObject[]>> {
    const response: AxiosResponse<ApiResponse<RfidObject[]>> = 
      await this.api.get('/objects/search', { params: filters });
    return response.data;
  }

  async getObjectTypes(): Promise<string[]> {
    const response: AxiosResponse<ApiResponse<string[]>> = 
      await this.api.get('/objects/types');
    return response.data.data;
  }

  // Personnel
  async getPersonnel(filters?: SearchFilters): Promise<ApiResponse<Personnel[]>> {
    const response: AxiosResponse<ApiResponse<Personnel[]>> = 
      await this.api.get('/personnel', { params: filters });
    return response.data;
  }

  async getPersonnelMember(id: number): Promise<Personnel> {
    const response: AxiosResponse<ApiResponse<Personnel>> = 
      await this.api.get(`/personnel/${id}`);
    return response.data.data;
  }

  async createPersonnel(personnel: Partial<Personnel & { password?: string }>): Promise<Personnel> {
    const response: AxiosResponse<ApiResponse<Personnel>> = 
      await this.api.post('/personnel', personnel);
    return response.data.data;
  }

  async updatePersonnel(id: number, updates: Partial<Personnel>): Promise<Personnel> {
    const response: AxiosResponse<ApiResponse<Personnel>> = 
      await this.api.put(`/personnel/${id}`, updates);
    return response.data.data;
  }

  async deactivatePersonnel(id: number): Promise<Personnel> {
    const response: AxiosResponse<ApiResponse<Personnel>> = 
      await this.api.post(`/personnel/${id}/deactivate`);
    return response.data.data;
  }

  async getPersonnelObjects(id: number): Promise<RfidObject[]> {
    const response: AxiosResponse<ApiResponse<RfidObject[]>> = 
      await this.api.get(`/personnel/${id}/objects`);
    return response.data.data;
  }

  // Locations
  async getLocations(filters?: SearchFilters): Promise<ApiResponse<Location[]>> {
    const response: AxiosResponse<ApiResponse<Location[]>> = 
      await this.api.get('/locations', { params: filters });
    return response.data;
  }

  async getLocation(id: number): Promise<Location> {
    const response: AxiosResponse<ApiResponse<Location>> = 
      await this.api.get(`/locations/${id}`);
    return response.data.data;
  }

  async createLocation(location: Partial<Location>): Promise<Location> {
    const response: AxiosResponse<ApiResponse<Location>> = 
      await this.api.post('/locations', location);
    return response.data.data;
  }

  async updateLocation(id: number, updates: Partial<Location>): Promise<Location> {
    const response: AxiosResponse<ApiResponse<Location>> = 
      await this.api.put(`/locations/${id}`, updates);
    return response.data.data;
  }

  async deactivateLocation(id: number): Promise<Location> {
    const response: AxiosResponse<ApiResponse<Location>> = 
      await this.api.post(`/locations/${id}/deactivate`);
    return response.data.data;
  }

  async getLocationObjects(id: number): Promise<RfidObject[]> {
    const response: AxiosResponse<ApiResponse<RfidObject[]>> = 
      await this.api.get(`/locations/${id}/objects`);
    return response.data.data;
  }

  async getLocationHierarchy(): Promise<Record<string, any>> {
    const response: AxiosResponse<ApiResponse<Record<string, any>>> = 
      await this.api.get('/locations/hierarchy');
    return response.data.data;
  }

  async searchLocations(filters: SearchFilters): Promise<ApiResponse<Location[]>> {
    const response: AxiosResponse<ApiResponse<Location[]>> = 
      await this.api.get('/locations/search', { params: filters });
    return response.data;
  }

  // RFID
  async getRfidReaders(filters?: SearchFilters): Promise<ApiResponse<RfidReader[]>> {
    const response: AxiosResponse<ApiResponse<RfidReader[]>> = 
      await this.api.get('/rfid/readers', { params: filters });
    return response.data;
  }

  async getRfidReader(id: number): Promise<RfidReader> {
    const response: AxiosResponse<ApiResponse<RfidReader>> = 
      await this.api.get(`/rfid/readers/${id}`);
    return response.data.data;
  }

  async createRfidReader(reader: Partial<RfidReader>): Promise<RfidReader> {
    const response: AxiosResponse<ApiResponse<RfidReader>> = 
      await this.api.post('/rfid/readers', reader);
    return response.data.data;
  }

  async updateRfidReader(id: number, updates: Partial<RfidReader>): Promise<RfidReader> {
    const response: AxiosResponse<ApiResponse<RfidReader>> = 
      await this.api.put(`/rfid/readers/${id}`, updates);
    return response.data.data;
  }

  async getRfidEvents(minutes: number = 5): Promise<RfidEvent[]> {
    const response: AxiosResponse<ApiResponse<RfidEvent[]>> = 
      await this.api.get('/rfid/events', { params: { minutes } });
    return response.data.data;
  }

  async getRfidEventStats(hours: number = 24): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = 
      await this.api.get('/rfid/events/stats', { params: { hours } });
    return response.data.data;
  }

  async getOfflineReaders(minutes: number = 5): Promise<RfidReader[]> {
    const response: AxiosResponse<ApiResponse<RfidReader[]>> = 
      await this.api.get('/rfid/readers/offline', { params: { minutes } });
    return response.data.data;
  }

  async simulateRfidEvent(tag_id: string, reader_id: string, signal_strength?: number): Promise<RfidEvent> {
    const response: AxiosResponse<ApiResponse<RfidEvent>> = 
      await this.api.post('/rfid/simulate', { tag_id, reader_id, signal_strength });
    return response.data.data;
  }

  // Analytics
  async getDashboardStats(): Promise<DashboardStats> {
    const response: AxiosResponse<ApiResponse<DashboardStats>> = 
      await this.api.get('/analytics/dashboard');
    return response.data.data;
  }

  async getObjectAnalytics(days: number = 30, filters?: any): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = 
      await this.api.get('/analytics/objects', { params: { days, ...filters } });
    return response.data.data;
  }

  async getPersonnelAnalytics(days: number = 30): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = 
      await this.api.get('/analytics/personnel', { params: { days } });
    return response.data.data;
  }

  async getLocationAnalytics(days: number = 30): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = 
      await this.api.get('/analytics/locations', { params: { days } });
    return response.data.data;
  }

  async getRfidAnalytics(hours: number = 24): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = 
      await this.api.get('/analytics/rfid', { params: { hours } });
    return response.data.data;
  }

  async generateReport(type: string, start_date: string, end_date: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = 
      await this.api.get('/analytics/reports', { 
        params: { type, start_date, end_date } 
      });
    return response.data.data;
  }

  // Audit Logs (assuming we add this endpoint)
  async getAuditLogs(filters?: SearchFilters): Promise<ApiResponse<AuditLog[]>> {
    const response: AxiosResponse<ApiResponse<AuditLog[]>> = 
      await this.api.get('/audit-logs', { params: filters });
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;