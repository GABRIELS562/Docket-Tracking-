export interface User {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department?: string;
  role: 'admin' | 'supervisor' | 'technician' | 'viewer';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface RfidObject {
  id: number;
  object_code: string;
  name: string;
  description?: string;
  object_type: string;
  category?: string;
  priority_level: 'low' | 'normal' | 'high' | 'critical';
  status: string;
  rfid_tag_id: string;
  current_location_id?: number;
  assigned_to_id?: number;
  chain_of_custody?: ChainOfCustodyEntry[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by_id?: number;
}

export interface Personnel {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  department?: string;
  role: 'admin' | 'supervisor' | 'technician' | 'viewer';
  security_clearance?: string;
  rfid_badge_id?: string;
  active: boolean;
  created_at: string;
}

export interface Location {
  id: number;
  location_code: string;
  location_name: string;
  description?: string;
  zone?: string;
  building?: string;
  floor?: number;
  room?: string;
  coordinates?: { x: number; y: number };
  rfid_reader_id?: string;
  security_level: string;
  active: boolean;
}

export interface RfidReader {
  id: number;
  reader_id: string;
  reader_type: 'fixed' | 'handheld';
  location_id?: number;
  ip_address?: string;
  status: string;
  last_ping?: string;
  configuration?: Record<string, any>;
  created_at: string;
}

export interface RfidEvent {
  id: number;
  tag_id: string;
  reader_id: string;
  signal_strength?: number;
  event_type: 'detected' | 'lost' | 'moved';
  location_id?: number;
  timestamp: string;
  processed: boolean;
}

export interface AuditLog {
  id: number;
  object_id?: number;
  personnel_id?: number;
  action: string;
  old_location_id?: number;
  new_location_id?: number;
  reader_id?: string;
  notes?: string;
  digital_signature?: string;
  timestamp: string;
  session_id?: string;
  personnel_name?: string;
  object_name?: string;
  old_location_name?: string;
  new_location_name?: string;
}

export interface ChainOfCustodyEntry {
  personnel_id: number;
  action: string;
  location_id?: number;
  notes?: string;
  timestamp: string;
}

export interface DashboardStats {
  summary: {
    total_objects: number;
    active_objects: number;
    total_personnel: number;
    total_locations: number;
    recent_events_count: number;
    offline_readers_count: number;
  };
  objects: {
    by_type: Array<{ object_type: string; count: number }>;
    by_priority: Array<{ priority_level: string; count: number }>;
  };
  locations: {
    utilization: Array<{
      location_name: string;
      location_code: string;
      object_count: number;
      building: string;
      zone: string;
    }>;
  };
  personnel: {
    workload: Array<{
      personnel_name: string;
      employee_id: string;
      assigned_objects: number;
      department: string;
    }>;
  };
  rfid: {
    event_stats: Array<{
      event_type: string;
      count: number;
      unique_tags: number;
      unique_readers: number;
    }>;
    offline_readers: RfidReader[];
  };
  recent_activity: AuditLog[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    pages: number;
  };
  message?: string;
  error?: string;
}

export interface SearchFilters {
  query?: string;
  object_type?: string;
  status?: string;
  priority_level?: string;
  assigned_to_id?: number;
  current_location_id?: number;
  department?: string;
  role?: string;
  active?: boolean;
  limit?: number;
  offset?: number;
}

export interface NotificationState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}