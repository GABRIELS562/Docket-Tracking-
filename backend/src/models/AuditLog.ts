import { pool, query } from '../utils/database';
import crypto from 'crypto';

export interface IAuditLog {
  id?: number;
  object_id?: number;
  personnel_id?: number;
  action: string;
  old_location_id?: number;
  new_location_id?: number;
  reader_id?: string;
  notes?: string;
  digital_signature?: string;
  timestamp?: Date;
  session_id?: string;
}

export class AuditLogModel {
  static async create(auditData: IAuditLog): Promise<IAuditLog> {
    const digital_signature = this.generateDigitalSignature(auditData);
    
    const queryText = `
      INSERT INTO audit_logs (
        object_id, personnel_id, action, old_location_id,
        new_location_id, reader_id, notes, digital_signature,
        timestamp, session_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) RETURNING *`;
    
    const values = [
      auditData.object_id,
      auditData.personnel_id,
      auditData.action,
      auditData.old_location_id,
      auditData.new_location_id,
      auditData.reader_id,
      auditData.notes,
      digital_signature,
      auditData.timestamp || new Date(),
      auditData.session_id || crypto.randomBytes(16).toString('hex')
    ];

    const result = await query(queryText, values);
    return result.rows[0];
  }

  static async findById(id: number): Promise<IAuditLog | null> {
    const queryText = 'SELECT * FROM audit_logs WHERE id = $1';
    const result = await query(queryText, [id]);
    return result.rows[0] || null;
  }

  static async findByObjectId(object_id: number, limit: number = 100): Promise<IAuditLog[]> {
    const queryText = `
      SELECT al.*, 
             p.first_name || ' ' || p.last_name as personnel_name,
             o.name as object_name,
             l1.location_name as old_location_name,
             l2.location_name as new_location_name
      FROM audit_logs al
      LEFT JOIN personnel p ON al.personnel_id = p.id
      LEFT JOIN objects o ON al.object_id = o.id
      LEFT JOIN locations l1 ON al.old_location_id = l1.id
      LEFT JOIN locations l2 ON al.new_location_id = l2.id
      WHERE al.object_id = $1
      ORDER BY al.timestamp DESC
      LIMIT $2`;
    
    const result = await query(queryText, [object_id, limit]);
    return result.rows;
  }

  static async findByPersonnelId(personnel_id: number, limit: number = 100): Promise<IAuditLog[]> {
    const queryText = `
      SELECT al.*, 
             o.name as object_name,
             l1.location_name as old_location_name,
             l2.location_name as new_location_name
      FROM audit_logs al
      LEFT JOIN objects o ON al.object_id = o.id
      LEFT JOIN locations l1 ON al.old_location_id = l1.id
      LEFT JOIN locations l2 ON al.new_location_id = l2.id
      WHERE al.personnel_id = $1
      ORDER BY al.timestamp DESC
      LIMIT $2`;
    
    const result = await query(queryText, [personnel_id, limit]);
    return result.rows;
  }

  static async findByDateRange(startDate: Date, endDate: Date): Promise<IAuditLog[]> {
    const queryText = `
      SELECT al.*, 
             p.first_name || ' ' || p.last_name as personnel_name,
             o.name as object_name,
             l1.location_name as old_location_name,
             l2.location_name as new_location_name
      FROM audit_logs al
      LEFT JOIN personnel p ON al.personnel_id = p.id
      LEFT JOIN objects o ON al.object_id = o.id
      LEFT JOIN locations l1 ON al.old_location_id = l1.id
      LEFT JOIN locations l2 ON al.new_location_id = l2.id
      WHERE al.timestamp BETWEEN $1 AND $2
      ORDER BY al.timestamp DESC`;
    
    const result = await query(queryText, [startDate, endDate]);
    return result.rows;
  }

  static async getChainOfCustody(object_id: number): Promise<IAuditLog[]> {
    const queryText = `
      SELECT al.*, 
             p.first_name || ' ' || p.last_name as personnel_name,
             p.employee_id,
             l1.location_name as old_location_name,
             l2.location_name as new_location_name
      FROM audit_logs al
      LEFT JOIN personnel p ON al.personnel_id = p.id
      LEFT JOIN locations l1 ON al.old_location_id = l1.id
      LEFT JOIN locations l2 ON al.new_location_id = l2.id
      WHERE al.object_id = $1
      ORDER BY al.timestamp ASC`;
    
    const result = await query(queryText, [object_id]);
    return result.rows;
  }

  static async verifyIntegrity(id: number): Promise<boolean> {
    const audit = await this.findById(id);
    if (!audit) return false;

    const expectedSignature = this.generateDigitalSignature(audit);
    return audit.digital_signature === expectedSignature;
  }

  static async getActionStatistics(days: number = 30): Promise<any> {
    const queryText = `
      SELECT 
        action,
        COUNT(*) as count,
        COUNT(DISTINCT object_id) as unique_objects,
        COUNT(DISTINCT personnel_id) as unique_personnel
      FROM audit_logs
      WHERE timestamp > NOW() - INTERVAL '${days} days'
      GROUP BY action
      ORDER BY count DESC`;
    
    const result = await query(queryText);
    return result.rows;
  }

  static async getLocationMovements(location_id: number, days: number = 7): Promise<IAuditLog[]> {
    const queryText = `
      SELECT al.*, 
             p.first_name || ' ' || p.last_name as personnel_name,
             o.name as object_name
      FROM audit_logs al
      LEFT JOIN personnel p ON al.personnel_id = p.id
      LEFT JOIN objects o ON al.object_id = o.id
      WHERE (al.old_location_id = $1 OR al.new_location_id = $1)
        AND al.timestamp > NOW() - INTERVAL '${days} days'
      ORDER BY al.timestamp DESC`;
    
    const result = await query(queryText, [location_id]);
    return result.rows;
  }

  static async searchAuditLogs(filters: {
    action?: string;
    object_id?: number;
    personnel_id?: number;
    location_id?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<IAuditLog[]> {
    let queryText = `
      SELECT al.*, 
             p.first_name || ' ' || p.last_name as personnel_name,
             o.name as object_name,
             l1.location_name as old_location_name,
             l2.location_name as new_location_name
      FROM audit_logs al
      LEFT JOIN personnel p ON al.personnel_id = p.id
      LEFT JOIN objects o ON al.object_id = o.id
      LEFT JOIN locations l1 ON al.old_location_id = l1.id
      LEFT JOIN locations l2 ON al.new_location_id = l2.id
      WHERE 1=1`;
    
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.action) {
      queryText += ` AND al.action = $${paramIndex++}`;
      values.push(filters.action);
    }

    if (filters.object_id) {
      queryText += ` AND al.object_id = $${paramIndex++}`;
      values.push(filters.object_id);
    }

    if (filters.personnel_id) {
      queryText += ` AND al.personnel_id = $${paramIndex++}`;
      values.push(filters.personnel_id);
    }

    if (filters.location_id) {
      queryText += ` AND (al.old_location_id = $${paramIndex} OR al.new_location_id = $${paramIndex})`;
      values.push(filters.location_id);
      paramIndex++;
    }

    if (filters.startDate) {
      queryText += ` AND al.timestamp >= $${paramIndex++}`;
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      queryText += ` AND al.timestamp <= $${paramIndex++}`;
      values.push(filters.endDate);
    }

    queryText += ' ORDER BY al.timestamp DESC';

    if (filters.limit) {
      queryText += ` LIMIT $${paramIndex++}`;
      values.push(filters.limit);
    }

    if (filters.offset) {
      queryText += ` OFFSET $${paramIndex++}`;
      values.push(filters.offset);
    }

    const result = await query(queryText, values);
    return result.rows;
  }

  private static generateDigitalSignature(data: IAuditLog): string {
    const content = `${data.object_id}|${data.personnel_id}|${data.action}|${data.old_location_id}|${data.new_location_id}|${data.timestamp}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}