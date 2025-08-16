import { pool, query } from '../utils/database';

export interface IRfidReader {
  id?: number;
  reader_id: string;
  reader_type?: 'fixed' | 'handheld';
  location_id?: number;
  ip_address?: string;
  status?: string;
  last_ping?: Date;
  configuration?: any;
  created_at?: Date;
}

export class RfidReaderModel {
  static async create(readerData: IRfidReader): Promise<IRfidReader> {
    const queryText = `
      INSERT INTO rfid_readers (
        reader_id, reader_type, location_id, ip_address,
        status, last_ping, configuration
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING *`;
    
    const values = [
      readerData.reader_id,
      readerData.reader_type || 'fixed',
      readerData.location_id,
      readerData.ip_address,
      readerData.status || 'active',
      readerData.last_ping || new Date(),
      JSON.stringify(readerData.configuration || {})
    ];

    const result = await query(queryText, values);
    return result.rows[0];
  }

  static async findById(id: number): Promise<IRfidReader | null> {
    const queryText = 'SELECT * FROM rfid_readers WHERE id = $1';
    const result = await query(queryText, [id]);
    return result.rows[0] || null;
  }

  static async findByReaderId(reader_id: string): Promise<IRfidReader | null> {
    const queryText = 'SELECT * FROM rfid_readers WHERE reader_id = $1';
    const result = await query(queryText, [reader_id]);
    return result.rows[0] || null;
  }

  static async findAll(filters?: {
    reader_type?: string;
    status?: string;
    location_id?: number;
  }): Promise<IRfidReader[]> {
    let queryText = 'SELECT * FROM rfid_readers WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.reader_type) {
      queryText += ` AND reader_type = $${paramIndex++}`;
      values.push(filters.reader_type);
    }

    if (filters?.status) {
      queryText += ` AND status = $${paramIndex++}`;
      values.push(filters.status);
    }

    if (filters?.location_id) {
      queryText += ` AND location_id = $${paramIndex++}`;
      values.push(filters.location_id);
    }

    queryText += ' ORDER BY reader_id';

    const result = await query(queryText, values);
    return result.rows;
  }

  static async update(id: number, updates: Partial<IRfidReader>): Promise<IRfidReader | null> {
    const allowedFields = [
      'reader_type', 'location_id', 'ip_address',
      'status', 'last_ping', 'configuration'
    ];

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field as keyof IRfidReader] !== undefined) {
        updateFields.push(`${field} = $${paramIndex++}`);
        if (field === 'configuration') {
          values.push(JSON.stringify(updates.configuration));
        } else {
          values.push(updates[field as keyof IRfidReader]);
        }
      }
    }

    if (updateFields.length === 0) {
      return await this.findById(id);
    }

    values.push(id);

    const queryText = `
      UPDATE rfid_readers 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *`;

    const result = await query(queryText, values);
    return result.rows[0] || null;
  }

  static async updatePing(reader_id: string): Promise<IRfidReader | null> {
    const queryText = `
      UPDATE rfid_readers 
      SET last_ping = NOW(), status = 'active'
      WHERE reader_id = $1
      RETURNING *`;
    
    const result = await query(queryText, [reader_id]);
    return result.rows[0] || null;
  }

  static async setStatus(reader_id: string, status: string): Promise<IRfidReader | null> {
    const queryText = `
      UPDATE rfid_readers 
      SET status = $1
      WHERE reader_id = $2
      RETURNING *`;
    
    const result = await query(queryText, [status, reader_id]);
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const queryText = 'DELETE FROM rfid_readers WHERE id = $1';
    const result = await query(queryText, [id]);
    return result.rowCount > 0;
  }

  static async getOfflineReaders(minutesThreshold: number = 5): Promise<IRfidReader[]> {
    const queryText = `
      SELECT * FROM rfid_readers 
      WHERE last_ping < NOW() - INTERVAL '${minutesThreshold} minutes'
      AND status = 'active'
      ORDER BY reader_id`;
    
    const result = await query(queryText);
    return result.rows;
  }
}