import { pool, query } from '../utils/database';
import bcrypt from 'bcrypt';

export interface IPersonnel {
  id?: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  password_hash?: string;
  department?: string;
  role?: 'admin' | 'supervisor' | 'technician' | 'viewer';
  security_clearance?: string;
  rfid_badge_id?: string;
  active?: boolean;
  created_at?: Date;
}

export class PersonnelModel {
  static async create(personnelData: IPersonnel & { password?: string }): Promise<IPersonnel> {
    let password_hash = null;
    if (personnelData.password) {
      password_hash = await bcrypt.hash(personnelData.password, 10);
    }

    const queryText = `
      INSERT INTO personnel (
        employee_id, first_name, last_name, email, password_hash,
        department, role, security_clearance, rfid_badge_id, active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) RETURNING id, employee_id, first_name, last_name, email, 
                 department, role, security_clearance, rfid_badge_id, 
                 active, created_at`;
    
    const values = [
      personnelData.employee_id,
      personnelData.first_name,
      personnelData.last_name,
      personnelData.email,
      password_hash,
      personnelData.department,
      personnelData.role || 'viewer',
      personnelData.security_clearance,
      personnelData.rfid_badge_id,
      personnelData.active !== false
    ];

    const result = await query(queryText, values);
    return result.rows[0];
  }

  static async findById(id: number): Promise<IPersonnel | null> {
    const queryText = `
      SELECT id, employee_id, first_name, last_name, email, 
             department, role, security_clearance, rfid_badge_id, 
             active, created_at
      FROM personnel WHERE id = $1`;
    const result = await query(queryText, [id]);
    return result.rows[0] || null;
  }

  static async findByEmployeeId(employee_id: string): Promise<IPersonnel | null> {
    const queryText = `
      SELECT id, employee_id, first_name, last_name, email, 
             department, role, security_clearance, rfid_badge_id, 
             active, created_at
      FROM personnel WHERE employee_id = $1`;
    const result = await query(queryText, [employee_id]);
    return result.rows[0] || null;
  }

  static async findByEmail(email: string): Promise<IPersonnel | null> {
    const queryText = `
      SELECT id, employee_id, first_name, last_name, email, password_hash,
             department, role, security_clearance, rfid_badge_id, 
             active, created_at
      FROM personnel WHERE email = $1`;
    const result = await query(queryText, [email]);
    return result.rows[0] || null;
  }

  static async findByRfidBadge(rfid_badge_id: string): Promise<IPersonnel | null> {
    const queryText = `
      SELECT id, employee_id, first_name, last_name, email, 
             department, role, security_clearance, rfid_badge_id, 
             active, created_at
      FROM personnel WHERE rfid_badge_id = $1`;
    const result = await query(queryText, [rfid_badge_id]);
    return result.rows[0] || null;
  }

  static async findAll(filters?: {
    department?: string;
    role?: string;
    active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<IPersonnel[]> {
    let queryText = `
      SELECT id, employee_id, first_name, last_name, email, 
             department, role, security_clearance, rfid_badge_id, 
             active, created_at
      FROM personnel WHERE 1=1`;
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.department) {
      queryText += ` AND department = $${paramIndex++}`;
      values.push(filters.department);
    }

    if (filters?.role) {
      queryText += ` AND role = $${paramIndex++}`;
      values.push(filters.role);
    }

    if (filters?.active !== undefined) {
      queryText += ` AND active = $${paramIndex++}`;
      values.push(filters.active);
    }

    queryText += ' ORDER BY last_name, first_name';

    if (filters?.limit) {
      queryText += ` LIMIT $${paramIndex++}`;
      values.push(filters.limit);
    }

    if (filters?.offset) {
      queryText += ` OFFSET $${paramIndex++}`;
      values.push(filters.offset);
    }

    const result = await query(queryText, values);
    return result.rows;
  }

  static async update(id: number, updates: Partial<IPersonnel> & { password?: string }): Promise<IPersonnel | null> {
    const allowedFields = [
      'first_name', 'last_name', 'email', 'department', 
      'role', 'security_clearance', 'rfid_badge_id', 'active'
    ];

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.password) {
      const password_hash = await bcrypt.hash(updates.password, 10);
      updateFields.push(`password_hash = $${paramIndex++}`);
      values.push(password_hash);
    }

    for (const field of allowedFields) {
      if (updates[field as keyof IPersonnel] !== undefined) {
        updateFields.push(`${field} = $${paramIndex++}`);
        values.push(updates[field as keyof IPersonnel]);
      }
    }

    if (updateFields.length === 0) {
      return await this.findById(id);
    }

    values.push(id);

    const queryText = `
      UPDATE personnel 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, employee_id, first_name, last_name, email, 
                department, role, security_clearance, rfid_badge_id, 
                active, created_at`;

    const result = await query(queryText, values);
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const queryText = 'DELETE FROM personnel WHERE id = $1';
    const result = await query(queryText, [id]);
    return result.rowCount > 0;
  }

  static async deactivate(id: number): Promise<IPersonnel | null> {
    const queryText = `
      UPDATE personnel 
      SET active = false
      WHERE id = $1
      RETURNING id, employee_id, first_name, last_name, email, 
                department, role, security_clearance, rfid_badge_id, 
                active, created_at`;
    
    const result = await query(queryText, [id]);
    return result.rows[0] || null;
  }

  static async getAssignedObjects(personnelId: number): Promise<any[]> {
    const queryText = `
      SELECT * FROM objects 
      WHERE assigned_to_id = $1 
      ORDER BY updated_at DESC`;
    
    const result = await query(queryText, [personnelId]);
    return result.rows;
  }

  static async verifyPassword(email: string, password: string): Promise<IPersonnel | null> {
    const personnel = await this.findByEmail(email);
    
    if (!personnel || !personnel.password_hash) {
      return null;
    }

    const isValid = await bcrypt.compare(password, personnel.password_hash);
    
    if (!isValid) {
      return null;
    }

    delete personnel.password_hash;
    return personnel;
  }

  static async count(filters?: {
    department?: string;
    role?: string;
    active?: boolean;
  }): Promise<number> {
    let queryText = 'SELECT COUNT(*) FROM personnel WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.department) {
      queryText += ` AND department = $${paramIndex++}`;
      values.push(filters.department);
    }

    if (filters?.role) {
      queryText += ` AND role = $${paramIndex++}`;
      values.push(filters.role);
    }

    if (filters?.active !== undefined) {
      queryText += ` AND active = $${paramIndex++}`;
      values.push(filters.active);
    }

    const result = await query(queryText, values);
    return parseInt(result.rows[0].count);
  }
}