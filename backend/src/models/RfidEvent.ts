import { pool, query } from '../utils/database';

export interface IRfidEvent {
  id?: number;
  tag_id: string;
  reader_id: string;
  signal_strength?: number;
  event_type?: 'detected' | 'lost' | 'moved';
  location_id?: number;
  timestamp?: Date;
  processed?: boolean;
}

export class RfidEventModel {
  static async create(eventData: IRfidEvent): Promise<IRfidEvent> {
    const queryText = `
      INSERT INTO rfid_events (
        tag_id, reader_id, signal_strength, event_type,
        location_id, timestamp, processed
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING *`;
    
    const values = [
      eventData.tag_id,
      eventData.reader_id,
      eventData.signal_strength,
      eventData.event_type || 'detected',
      eventData.location_id,
      eventData.timestamp || new Date(),
      eventData.processed || false
    ];

    const result = await query(queryText, values);
    return result.rows[0];
  }

  static async createBatch(events: IRfidEvent[]): Promise<IRfidEvent[]> {
    if (events.length === 0) return [];

    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    events.forEach(event => {
      const rowPlaceholders: string[] = [];
      values.push(event.tag_id);
      rowPlaceholders.push(`$${paramIndex++}`);
      
      values.push(event.reader_id);
      rowPlaceholders.push(`$${paramIndex++}`);
      
      values.push(event.signal_strength);
      rowPlaceholders.push(`$${paramIndex++}`);
      
      values.push(event.event_type || 'detected');
      rowPlaceholders.push(`$${paramIndex++}`);
      
      values.push(event.location_id);
      rowPlaceholders.push(`$${paramIndex++}`);
      
      values.push(event.timestamp || new Date());
      rowPlaceholders.push(`$${paramIndex++}`);
      
      values.push(event.processed || false);
      rowPlaceholders.push(`$${paramIndex++}`);
      
      placeholders.push(`(${rowPlaceholders.join(', ')})`);
    });

    const queryText = `
      INSERT INTO rfid_events (
        tag_id, reader_id, signal_strength, event_type,
        location_id, timestamp, processed
      ) VALUES ${placeholders.join(', ')}
      RETURNING *`;

    const result = await query(queryText, values);
    return result.rows;
  }

  static async findById(id: number): Promise<IRfidEvent | null> {
    const queryText = 'SELECT * FROM rfid_events WHERE id = $1';
    const result = await query(queryText, [id]);
    return result.rows[0] || null;
  }

  static async findByTagId(tag_id: string, limit: number = 100): Promise<IRfidEvent[]> {
    const queryText = `
      SELECT * FROM rfid_events 
      WHERE tag_id = $1 
      ORDER BY timestamp DESC 
      LIMIT $2`;
    
    const result = await query(queryText, [tag_id, limit]);
    return result.rows;
  }

  static async findUnprocessed(limit: number = 1000): Promise<IRfidEvent[]> {
    const queryText = `
      SELECT * FROM rfid_events 
      WHERE processed = false 
      ORDER BY timestamp 
      LIMIT $1`;
    
    const result = await query(queryText, [limit]);
    return result.rows;
  }

  static async findRecent(minutes: number = 5): Promise<IRfidEvent[]> {
    const queryText = `
      SELECT * FROM rfid_events 
      WHERE timestamp > NOW() - INTERVAL '${minutes} minutes'
      ORDER BY timestamp DESC`;
    
    const result = await query(queryText);
    return result.rows;
  }

  static async markAsProcessed(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const queryText = `
      UPDATE rfid_events 
      SET processed = true 
      WHERE id IN (${placeholders})`;
    
    const result = await query(queryText, ids);
    return result.rowCount;
  }

  static async getLastLocation(tag_id: string): Promise<{location_id: number, timestamp: Date} | null> {
    const queryText = `
      SELECT location_id, timestamp 
      FROM rfid_events 
      WHERE tag_id = $1 
        AND location_id IS NOT NULL
      ORDER BY timestamp DESC 
      LIMIT 1`;
    
    const result = await query(queryText, [tag_id]);
    return result.rows[0] || null;
  }

  static async getEventStats(hours: number = 24): Promise<any> {
    const queryText = `
      SELECT 
        event_type,
        COUNT(*) as count,
        COUNT(DISTINCT tag_id) as unique_tags,
        COUNT(DISTINCT reader_id) as unique_readers
      FROM rfid_events
      WHERE timestamp > NOW() - INTERVAL '${hours} hours'
      GROUP BY event_type`;
    
    const result = await query(queryText);
    return result.rows;
  }

  static async cleanup(daysToKeep: number = 30): Promise<number> {
    const queryText = `
      DELETE FROM rfid_events 
      WHERE timestamp < NOW() - INTERVAL '${daysToKeep} days'
        AND processed = true`;
    
    const result = await query(queryText);
    return result.rowCount;
  }
}