// User and Authentication Types
export interface User {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department?: string;
  role: 'admin' | 'supervisor' | 'technician' | 'viewer';
  security_clearance: string;
  rfid_badge_id?: string;
  active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'password_hash'>;
}

// Universal Object Types
export interface ObjectBase {
  id: number;
  object_code: string;
  name: string;
  description?: string;
  object_type: 'docket' | 'evidence' | 'equipment' | 'file' | 'tool';
  category?: string;
  priority_level: 'low' | 'normal' | 'high' | 'critical';
  status: 'active' | 'inactive' | 'archived' | 'missing';
  rfid_tag_id?: string;
  current_location_id?: number;
  assigned_to_id?: number;
  chain_of_custody: ChainOfCustodyEntry[];
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  created_by_id?: number;
}

// Docket-specific interface
export interface Docket extends ObjectBase {
  object_type: 'docket';
  case_number?: string;
  court_date?: Date;
  metadata: {
    case_number?: string;
    court_date?: string;
    prosecutor?: string;
    defendant?: string;
    case_type?: string;
    [key: string]: any;
  };
}

// Evidence-specific interface
export interface Evidence extends ObjectBase {
  object_type: 'evidence';
  metadata: {
    evidence_type?: string;
    collected_date?: string;
    collector?: string;
    [key: string]: any;
  };
}

// Equipment-specific interface
export interface Equipment extends ObjectBase {
  object_type: 'equipment';
  serial_number?: string;
  metadata: {
    serial_number?: string;
    manufacturer?: string;
    model?: string;
    purchase_date?: string;
    warranty_expires?: string;
    maintenance_due?: string;
    [key: string]: any;
  };
}

// Location Types
export interface Location {
  id: number;
  location_code: string;
  location_name: string;
  description?: string;
  zone?: string;
  building?: string;
  floor?: number;
  room?: string;
  coordinates?: string;
  rfid_reader_id?: string;
  security_level: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

// RFID Types
export interface RFIDReader {
  id: number;
  reader_id: string;
  reader_type: 'fixed';
  reader_model?: string;
  location_id?: number;
  ip_address?: string;
  status: 'active' | 'inactive' | 'error';
  last_ping?: Date;
  configuration: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface RFIDEvent {
  id: number;
  tag_id: string;
  reader_id?: string;
  signal_strength?: number;
  event_type: 'detected' | 'lost' | 'moved';
  location_id?: number;
  object_id?: number;
  timestamp: Date;
  processed: boolean;
}

// Chain of Custody
export interface ChainOfCustodyEntry {
  timestamp: Date;
  personnel_id: number;
  action: string;
  location_id?: number;
  notes?: string;
  digital_signature?: string;
}

// Audit Log
export interface AuditLog {
  id: number;
  object_id?: number;
  personnel_id?: number;
  action: string;
  old_location_id?: number;
  new_location_id?: number;
  old_assigned_to_id?: number;
  new_assigned_to_id?: number;
  reader_id?: string;
  notes?: string;
  digital_signature?: string;
  timestamp: Date;
  session_id?: string;
  ip_address?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Search and Filter Types
export interface SearchFilters {
  search?: string;
  object_type?: string;
  category?: string;
  status?: string;
  location_id?: number;
  assigned_to_id?: number;
  priority_level?: string;
  date_from?: string;
  date_to?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Import Job Types
export interface ImportJob {
  id: number;
  filename: string;
  object_type?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_records: number;
  processed_records: number;
  success_records: number;
  error_records: number;
  error_log?: string;
  started_at?: Date;
  completed_at?: Date;
  created_at: Date;
  created_by_id?: number;
}

// Alert Types
export interface Alert {
  id: number;
  alert_type: 'missing_object' | 'unauthorized_access' | 'reader_offline' | 'maintenance_due';
  object_id?: number;
  location_id?: number;
  personnel_id?: number;
  reader_id?: number;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
  acknowledged_by_id?: number;
  acknowledged_at?: Date;
  created_at: Date;
}