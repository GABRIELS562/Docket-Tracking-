/**
 * Storage Management API Service
 * Handles all storage-related API calls
 */

export interface StorageBox {
  id: number;
  box_code: string;
  zone_id: number;
  zone_name?: string;
  client_id: number;
  client_name?: string;
  shelf_code: string;
  capacity: number;
  occupied: number;
  status: 'active' | 'full' | 'inactive' | 'maintenance';
  temperature?: number;
  humidity?: number;
  last_accessed?: string;
  monthly_rate: number;
  created_at?: string;
  updated_at?: string;
  utilization_percent?: number;
  docket_count?: number;
}

export interface StorageZone {
  id: number;
  zone_code: string;
  zone_name: string;
  zone_type: string;
  total_capacity: number;
  used_capacity: number;
  temperature?: number;
  humidity?: number;
  is_active: boolean;
  box_count?: number;
  docket_count?: number;
  utilization_percentage?: number;
}

export interface RetrievalRequest {
  id: number;
  request_number: string;
  client_id: number;
  client_name?: string;
  requested_by: number;
  requested_by_name?: string;
  urgency: 'normal' | 'urgent' | 'scheduled';
  status: 'pending' | 'processing' | 'ready' | 'completed' | 'cancelled';
  total_items: number;
  retrieval_fee: number;
  scheduled_date?: string;
  completion_deadline?: string;
  actual_completion?: string;
  notes?: string;
  created_at: string;
  item_count?: number;
}

export interface StorageStatistics {
  summary: {
    total_boxes: number;
    active_boxes: number;
    full_boxes: number;
    total_dockets: number;
    total_clients: number;
    monthly_revenue: number;
  };
  zones: Array<{
    zone_name: string;
    utilization: number;
  }>;
  recentActivity: Array<{
    movement_timestamp: string;
    movement_type: string;
    docket_code: string;
    performed_by: string;
  }>;
}

export interface BillingInvoice {
  id?: number;
  invoice_number: string;
  client_id: number;
  client_name?: string;
  billing_period_start: string;
  billing_period_end: string;
  storage_box_count: number;
  storage_fees: number;
  retrieval_fees: number;
  other_fees: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'pending' | 'paid' | 'overdue';
  due_date: string;
  line_items?: any[];
}

class StorageAPIService {
  private baseURL = '/api';
  
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || error.message || 'Request failed');
    }
    const data = await response.json();
    return data.data || data;
  }

  // =====================================================
  // STORAGE ZONES
  // =====================================================

  async getStorageZones(): Promise<StorageZone[]> {
    const response = await fetch(`${this.baseURL}/storage-db/zones`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<StorageZone[]>(response);
  }

  async getZoneDetails(zoneId: number): Promise<StorageZone> {
    const response = await fetch(`${this.baseURL}/storage-db/zones/${zoneId}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<StorageZone>(response);
  }

  // =====================================================
  // STORAGE BOXES
  // =====================================================

  async getStorageBoxes(filters?: {
    zone_id?: number;
    client_id?: number;
    status?: string;
  }): Promise<StorageBox[]> {
    const params = new URLSearchParams();
    if (filters?.zone_id) params.append('zone_id', filters.zone_id.toString());
    if (filters?.client_id) params.append('client_id', filters.client_id.toString());
    if (filters?.status) params.append('status', filters.status);

    const response = await fetch(`${this.baseURL}/storage-db/boxes?${params}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<StorageBox[]>(response);
  }

  async createStorageBox(data: {
    client_id: number;
    zone_id: number;
    capacity?: number;
    box_type?: string;
  }): Promise<StorageBox> {
    const response = await fetch(`${this.baseURL}/storage-db/boxes`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse<StorageBox>(response);
  }

  async updateStorageBox(boxId: number, data: Partial<StorageBox>): Promise<StorageBox> {
    const response = await fetch(`${this.baseURL}/storage-db/boxes/${boxId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse<StorageBox>(response);
  }

  async addDocketToBox(boxId: number, docketId: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/storage-db/boxes/${boxId}/dockets`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ docket_id: docketId })
    });
    await this.handleResponse<void>(response);
  }

  // =====================================================
  // RETRIEVAL REQUESTS
  // =====================================================

  async getRetrievalRequests(filters?: {
    status?: string;
    client_id?: number;
  }): Promise<RetrievalRequest[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.client_id) params.append('client_id', filters.client_id.toString());

    const response = await fetch(`${this.baseURL}/storage-db/requests/retrieval?${params}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<RetrievalRequest[]>(response);
  }

  async createRetrievalRequest(data: {
    client_id: number;
    docket_ids: number[];
    urgency?: 'normal' | 'urgent';
    notes?: string;
  }): Promise<RetrievalRequest> {
    const response = await fetch(`${this.baseURL}/storage-db/requests/retrieval`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse<RetrievalRequest>(response);
  }

  async updateRetrievalRequest(requestId: number, status: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/storage-db/requests/retrieval/${requestId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    await this.handleResponse<void>(response);
  }

  async completeRetrieval(requestId: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/storage/requests/${requestId}/complete`, {
      method: 'PUT',
      headers: this.getAuthHeaders()
    });
    await this.handleResponse<void>(response);
  }

  // =====================================================
  // STATISTICS & ANALYTICS
  // =====================================================

  async getStorageStatistics(): Promise<StorageStatistics> {
    const response = await fetch(`${this.baseURL}/storage-db/statistics`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<StorageStatistics>(response);
  }

  async getBoxUtilization(clientId?: number): Promise<any[]> {
    const params = clientId ? `?client_id=${clientId}` : '';
    const response = await fetch(`${this.baseURL}/storage/boxes/utilization${params}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<any[]>(response);
  }

  async getStorageAnalytics(clientId?: number): Promise<any> {
    const params = clientId ? `?client_id=${clientId}` : '';
    const response = await fetch(`${this.baseURL}/storage/analytics${params}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<any>(response);
  }

  // =====================================================
  // BILLING & INVOICES
  // =====================================================

  async generateInvoice(clientId: number, billingMonth: string): Promise<BillingInvoice> {
    const response = await fetch(`${this.baseURL}/storage/billing/generate-invoice`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ clientId, billingMonth })
    });
    return this.handleResponse<BillingInvoice>(response);
  }

  async getInvoices(clientId?: number): Promise<BillingInvoice[]> {
    const params = clientId ? `?client_id=${clientId}` : '';
    const response = await fetch(`${this.baseURL}/storage-db/invoices${params}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<BillingInvoice[]>(response);
  }

  async getInvoiceDetails(invoiceId: number): Promise<BillingInvoice> {
    const response = await fetch(`${this.baseURL}/storage-db/invoices/${invoiceId}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<BillingInvoice>(response);
  }

  async updateInvoiceStatus(invoiceId: number, status: string, paymentDetails?: any): Promise<void> {
    const response = await fetch(`${this.baseURL}/storage-db/invoices/${invoiceId}/status`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status, ...paymentDetails })
    });
    await this.handleResponse<void>(response);
  }

  // =====================================================
  // DASHBOARD DATA
  // =====================================================

  async getDashboardData(clientId?: number): Promise<any> {
    const params = clientId ? `?client_id=${clientId}` : '';
    const response = await fetch(`${this.baseURL}/storage/dashboard${params}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<any>(response);
  }

  // =====================================================
  // SEARCH & FILTERS
  // =====================================================

  async searchBoxes(query: string): Promise<StorageBox[]> {
    const response = await fetch(`${this.baseURL}/storage-db/boxes/search?q=${encodeURIComponent(query)}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<StorageBox[]>(response);
  }

  async getAvailableBoxes(capacity: number = 50): Promise<StorageBox[]> {
    const response = await fetch(`${this.baseURL}/storage/boxes/available?capacity=${capacity}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<StorageBox[]>(response);
  }

  // =====================================================
  // CLIENTS
  // =====================================================

  async getClients(): Promise<any[]> {
    const response = await fetch(`${this.baseURL}/storage-db/clients`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<any[]>(response);
  }
}

// Export singleton instance
export const storageAPI = new StorageAPIService();

// Export types for convenience
export type { StorageAPIService };