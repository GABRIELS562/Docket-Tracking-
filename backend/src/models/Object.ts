import { pool, query, transaction } from '../utils/database';
import { PoolClient } from 'pg';

export interface IObject {
  id?: number;
  object_code: string;
  name: string;
  description?: string;
  object_type: string;
  category?: string;
  priority_level?: 'low' | 'normal' | 'high' | 'critical';
  status?: string;
  rfid_tag_id: string;
  current_location_id?: number;
  assigned_to_id?: number;
  chain_of_custody?: any;
  metadata?: any;
  created_at?: Date;
  updated_at?: Date;
  created_by_id?: number;
}

export class ObjectModel {
  static async create(objectData: IObject): Promise<IObject> {
    const queryText = `
      INSERT INTO objects (
        object_code, name, description, object_type, category,
        priority_level, status, rfid_tag_id, current_location_id,
        assigned_to_id, chain_of_custody, metadata, created_by_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *`;
    
    const values = [
      objectData.object_code,
      objectData.name,
      objectData.description,
      objectData.object_type,
      objectData.category,
      objectData.priority_level || 'normal',
      objectData.status || 'active',
      objectData.rfid_tag_id,
      objectData.current_location_id,
      objectData.assigned_to_id,
      JSON.stringify(objectData.chain_of_custody || []),
      JSON.stringify(objectData.metadata || {}),
      objectData.created_by_id
    ];

    const result = await query(queryText, values);
    return result.rows[0];
  }

  static async findById(id: number): Promise<IObject | null> {
    const queryText = 'SELECT * FROM objects WHERE id = $1';
    const result = await query(queryText, [id]);
    return result.rows[0] || null;
  }

  static async findByCode(object_code: string): Promise<IObject | null> {
    const queryText = 'SELECT * FROM objects WHERE object_code = $1';
    const result = await query(queryText, [object_code]);
    return result.rows[0] || null;
  }

  static async findByRfidTag(rfid_tag_id: string): Promise<IObject | null> {
    const queryText = 'SELECT * FROM objects WHERE rfid_tag_id = $1';
    const result = await query(queryText, [rfid_tag_id]);
    return result.rows[0] || null;
  }

  static async findAll(filters?: {
    object_type?: string;
    status?: string;
    assigned_to_id?: number;
    current_location_id?: number;
    limit?: number;
    offset?: number;
  }): Promise<IObject[]> {
    let queryText = 'SELECT * FROM objects WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.object_type) {
      queryText += ` AND object_type = $${paramIndex++}`;
      values.push(filters.object_type);
    }

    if (filters?.status) {
      queryText += ` AND status = $${paramIndex++}`;
      values.push(filters.status);
    }

    if (filters?.assigned_to_id) {
      queryText += ` AND assigned_to_id = $${paramIndex++}`;
      values.push(filters.assigned_to_id);
    }

    if (filters?.current_location_id) {
      queryText += ` AND current_location_id = $${paramIndex++}`;
      values.push(filters.current_location_id);
    }

    queryText += ' ORDER BY created_at DESC';

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

  static async update(id: number, updates: Partial<IObject>): Promise<IObject | null> {
    const allowedFields = [
      'name', 'description', 'category', 'priority_level', 'status',
      'current_location_id', 'assigned_to_id', 'chain_of_custody', 'metadata'
    ];

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field as keyof IObject] !== undefined) {
        updateFields.push(`${field} = $${paramIndex++}`);
        if (field === 'chain_of_custody' || field === 'metadata') {
          values.push(JSON.stringify(updates[field as keyof IObject]));
        } else {
          values.push(updates[field as keyof IObject]);
        }
      }
    }

    if (updateFields.length === 0) {
      return await this.findById(id);
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    const queryText = `
      UPDATE objects 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *`;

    const result = await query(queryText, values);
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const queryText = 'DELETE FROM objects WHERE id = $1';
    const result = await query(queryText, [id]);
    return result.rowCount > 0;
  }

  static async assignToPersonnel(objectId: number, personnelId: number | null): Promise<IObject | null> {
    const queryText = `
      UPDATE objects 
      SET assigned_to_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *`;
    
    const result = await query(queryText, [personnelId, objectId]);
    return result.rows[0] || null;
  }

  static async moveToLocation(objectId: number, locationId: number): Promise<IObject | null> {
    const queryText = `
      UPDATE objects 
      SET current_location_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *`;
    
    const result = await query(queryText, [locationId, objectId]);
    return result.rows[0] || null;
  }

  static async addToChainOfCustody(
    objectId: number, 
    custodyEntry: {
      personnel_id: number;
      action: string;
      location_id?: number;
      notes?: string;
      timestamp?: Date;
    }
  ): Promise<IObject | null> {
    return await transaction(async (client: PoolClient) => {
      const getQuery = 'SELECT chain_of_custody FROM objects WHERE id = $1';
      const getResult = await client.query(getQuery, [objectId]);
      
      if (getResult.rows.length === 0) {
        return null;
      }

      const currentChain = getResult.rows[0].chain_of_custody || [];
      const newEntry = {
        ...custodyEntry,
        timestamp: custodyEntry.timestamp || new Date()
      };
      
      currentChain.push(newEntry);

      const updateQuery = `
        UPDATE objects 
        SET chain_of_custody = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *`;
      
      const updateResult = await client.query(updateQuery, [JSON.stringify(currentChain), objectId]);
      return updateResult.rows[0];
    });
  }

  static async getObjectTypes(): Promise<string[]> {
    const queryText = 'SELECT DISTINCT object_type FROM objects ORDER BY object_type';
    const result = await query(queryText);
    return result.rows.map((row: any) => row.object_type);
  }

  static async count(filters?: {
    object_type?: string;
    status?: string;
  }): Promise<number> {
    let queryText = 'SELECT COUNT(*) FROM objects WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.object_type) {
      queryText += ` AND object_type = $${paramIndex++}`;
      values.push(filters.object_type);
    }

    if (filters?.status) {
      queryText += ` AND status = $${paramIndex++}`;
      values.push(filters.status);
    }

    const result = await query(queryText, values);
    return parseInt(result.rows[0].count);
  }
}