import { pool, query } from '../utils/database';

export interface ILocation {
  id?: number;
  location_code: string;
  location_name: string;
  description?: string;
  zone?: string;
  building?: string;
  floor?: number;
  room?: string;
  coordinates?: { x: number; y: number };
  rfid_reader_id?: string;
  security_level?: string;
  active?: boolean;
}

export class LocationModel {
  static async create(locationData: ILocation): Promise<ILocation> {
    const queryText = `
      INSERT INTO locations (
        location_code, location_name, description, zone,
        building, floor, room, coordinates, rfid_reader_id,
        security_level, active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      ) RETURNING *`;
    
    const values = [
      locationData.location_code,
      locationData.location_name,
      locationData.description,
      locationData.zone,
      locationData.building,
      locationData.floor,
      locationData.room,
      locationData.coordinates ? `(${locationData.coordinates.x},${locationData.coordinates.y})` : null,
      locationData.rfid_reader_id,
      locationData.security_level || 'normal',
      locationData.active !== false
    ];

    const result = await query(queryText, values);
    return this.formatLocation(result.rows[0]);
  }

  static async findById(id: number): Promise<ILocation | null> {
    const queryText = 'SELECT * FROM locations WHERE id = $1';
    const result = await query(queryText, [id]);
    return result.rows[0] ? this.formatLocation(result.rows[0]) : null;
  }

  static async findByCode(location_code: string): Promise<ILocation | null> {
    const queryText = 'SELECT * FROM locations WHERE location_code = $1';
    const result = await query(queryText, [location_code]);
    return result.rows[0] ? this.formatLocation(result.rows[0]) : null;
  }

  static async findByReaderId(rfid_reader_id: string): Promise<ILocation | null> {
    const queryText = 'SELECT * FROM locations WHERE rfid_reader_id = $1';
    const result = await query(queryText, [rfid_reader_id]);
    return result.rows[0] ? this.formatLocation(result.rows[0]) : null;
  }

  static async findAll(filters?: {
    zone?: string;
    building?: string;
    floor?: number;
    security_level?: string;
    active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ILocation[]> {
    let queryText = 'SELECT * FROM locations WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.zone) {
      queryText += ` AND zone = $${paramIndex++}`;
      values.push(filters.zone);
    }

    if (filters?.building) {
      queryText += ` AND building = $${paramIndex++}`;
      values.push(filters.building);
    }

    if (filters?.floor !== undefined) {
      queryText += ` AND floor = $${paramIndex++}`;
      values.push(filters.floor);
    }

    if (filters?.security_level) {
      queryText += ` AND security_level = $${paramIndex++}`;
      values.push(filters.security_level);
    }

    if (filters?.active !== undefined) {
      queryText += ` AND active = $${paramIndex++}`;
      values.push(filters.active);
    }

    queryText += ' ORDER BY building, floor, zone, location_name';

    if (filters?.limit) {
      queryText += ` LIMIT $${paramIndex++}`;
      values.push(filters.limit);
    }

    if (filters?.offset) {
      queryText += ` OFFSET $${paramIndex++}`;
      values.push(filters.offset);
    }

    const result = await query(queryText, values);
    return result.rows.map(row => this.formatLocation(row));
  }

  static async update(id: number, updates: Partial<ILocation>): Promise<ILocation | null> {
    const allowedFields = [
      'location_name', 'description', 'zone', 'building',
      'floor', 'room', 'coordinates', 'rfid_reader_id',
      'security_level', 'active'
    ];

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field as keyof ILocation] !== undefined) {
        updateFields.push(`${field} = $${paramIndex++}`);
        if (field === 'coordinates' && updates.coordinates) {
          values.push(`(${updates.coordinates.x},${updates.coordinates.y})`);
        } else {
          values.push(updates[field as keyof ILocation]);
        }
      }
    }

    if (updateFields.length === 0) {
      return await this.findById(id);
    }

    values.push(id);

    const queryText = `
      UPDATE locations 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *`;

    const result = await query(queryText, values);
    return result.rows[0] ? this.formatLocation(result.rows[0]) : null;
  }

  static async delete(id: number): Promise<boolean> {
    const queryText = 'DELETE FROM locations WHERE id = $1';
    const result = await query(queryText, [id]);
    return result.rowCount > 0;
  }

  static async deactivate(id: number): Promise<ILocation | null> {
    const queryText = `
      UPDATE locations 
      SET active = false
      WHERE id = $1
      RETURNING *`;
    
    const result = await query(queryText, [id]);
    return result.rows[0] ? this.formatLocation(result.rows[0]) : null;
  }

  static async getObjectsInLocation(locationId: number): Promise<any[]> {
    const queryText = `
      SELECT * FROM objects 
      WHERE current_location_id = $1 
      ORDER BY updated_at DESC`;
    
    const result = await query(queryText, [locationId]);
    return result.rows;
  }

  static async getLocationHierarchy(): Promise<any> {
    const queryText = `
      SELECT DISTINCT building, zone, floor 
      FROM locations 
      WHERE active = true 
      ORDER BY building, floor, zone`;
    
    const result = await query(queryText);
    
    const hierarchy: any = {};
    
    result.rows.forEach((row: any) => {
      if (!hierarchy[row.building]) {
        hierarchy[row.building] = {};
      }
      
      const floorKey = row.floor ? `Floor ${row.floor}` : 'Ground';
      if (!hierarchy[row.building][floorKey]) {
        hierarchy[row.building][floorKey] = [];
      }
      
      if (row.zone && !hierarchy[row.building][floorKey].includes(row.zone)) {
        hierarchy[row.building][floorKey].push(row.zone);
      }
    });
    
    return hierarchy;
  }

  static async count(filters?: {
    zone?: string;
    building?: string;
    active?: boolean;
  }): Promise<number> {
    let queryText = 'SELECT COUNT(*) FROM locations WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.zone) {
      queryText += ` AND zone = $${paramIndex++}`;
      values.push(filters.zone);
    }

    if (filters?.building) {
      queryText += ` AND building = $${paramIndex++}`;
      values.push(filters.building);
    }

    if (filters?.active !== undefined) {
      queryText += ` AND active = $${paramIndex++}`;
      values.push(filters.active);
    }

    const result = await query(queryText, values);
    return parseInt(result.rows[0].count);
  }

  private static formatLocation(row: any): ILocation {
    if (row.coordinates) {
      const match = row.coordinates.match(/\(([^,]+),([^)]+)\)/);
      if (match) {
        row.coordinates = {
          x: parseFloat(match[1]),
          y: parseFloat(match[2])
        };
      }
    }
    return row;
  }
}