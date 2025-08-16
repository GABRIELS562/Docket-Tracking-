import { Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { CacheService } from '../services/CacheService';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export class ObjectController {
  private db: DatabaseService;
  private cache: CacheService;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.cache = CacheService.getInstance();
    
    // Bind methods
    this.listObjects = this.listObjects.bind(this);
    this.getObject = this.getObject.bind(this);
    this.createObject = this.createObject.bind(this);
    this.updateObject = this.updateObject.bind(this);
    this.deleteObject = this.deleteObject.bind(this);
    this.searchObjects = this.searchObjects.bind(this);
    this.assignObject = this.assignObject.bind(this);
    this.moveObject = this.moveObject.bind(this);
    this.tagObject = this.tagObject.bind(this);
    this.getObjectHistory = this.getObjectHistory.bind(this);
    this.getChainOfCustody = this.getChainOfCustody.bind(this);
    this.getObjectTypes = this.getObjectTypes.bind(this);
    this.getObjectStats = this.getObjectStats.bind(this);
  }

  async listObjects(req: Request, res: Response): Promise<void> {
    try {
      const { 
        page = 1, 
        limit = 50, 
        type, 
        status = 'active',
        location_id,
        assigned_to_id 
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      
      let query = `
        SELECT o.*, 
               l.location_name,
               p.first_name || ' ' || p.last_name as assigned_to_name
        FROM objects o
        LEFT JOIN locations l ON o.current_location_id = l.id
        LEFT JOIN personnel p ON o.assigned_to_id = p.id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramCount = 0;

      if (type) {
        query += ` AND o.object_type = $${++paramCount}`;
        params.push(type);
      }

      if (status) {
        query += ` AND o.status = $${++paramCount}`;
        params.push(status);
      }

      if (location_id) {
        query += ` AND o.current_location_id = $${++paramCount}`;
        params.push(location_id);
      }

      if (assigned_to_id) {
        query += ` AND o.assigned_to_id = $${++paramCount}`;
        params.push(assigned_to_id);
      }

      query += ` ORDER BY o.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
      params.push(limit, offset);

      const result = await this.db.query(query, params);
      
      // Get total count
      let countQuery = `SELECT COUNT(*) FROM objects o WHERE 1=1`;
      const countParams: any[] = [];
      paramCount = 0;

      if (type) {
        countQuery += ` AND o.object_type = $${++paramCount}`;
        countParams.push(type);
      }

      if (status) {
        countQuery += ` AND o.status = $${++paramCount}`;
        countParams.push(status);
      }

      const countResult = await this.db.query(countQuery, countParams);
      
      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit))
        }
      });
    } catch (error) {
      logger.error('Error listing objects:', error);
      res.status(500).json({ success: false, error: 'Failed to list objects' });
    }
  }

  async getObject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Check cache first
      const cacheKey = `object:${id}`;
      const cached = await this.cache.get(cacheKey);
      
      if (cached) {
        res.json({ success: true, data: JSON.parse(cached) });
        return;
      }

      const result = await this.db.query(`
        SELECT o.*, 
               l.location_name,
               p.first_name || ' ' || p.last_name as assigned_to_name
        FROM objects o
        LEFT JOIN locations l ON o.current_location_id = l.id
        LEFT JOIN personnel p ON o.assigned_to_id = p.id
        WHERE o.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Object not found' });
        return;
      }

      // Cache the result
      await this.cache.set(cacheKey, JSON.stringify(result.rows[0]), 300);

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      logger.error('Error getting object:', error);
      res.status(500).json({ success: false, error: 'Failed to get object' });
    }
  }

  async createObject(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 1;
      const rfidTagId = req.body.rfid_tag_id || `TAG-${uuidv4().substring(0, 8)}`;

      const result = await this.db.query(`
        INSERT INTO objects (
          object_code, name, description, object_type, category,
          priority_level, rfid_tag_id, current_location_id,
          assigned_to_id, metadata, created_by_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        req.body.object_code,
        req.body.name,
        req.body.description,
        req.body.object_type,
        req.body.category,
        req.body.priority_level || 'normal',
        rfidTagId,
        req.body.current_location_id || 1,
        req.body.assigned_to_id,
        JSON.stringify(req.body.metadata || {}),
        userId
      ]);

      // Add audit log
      await this.db.query(`
        INSERT INTO audit_logs (object_id, personnel_id, action, new_value)
        VALUES ($1, $2, 'created', $3)
      `, [result.rows[0].id, userId, JSON.stringify(result.rows[0])]);

      // Invalidate cache
      await this.cache.invalidatePattern('objects:*');

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      logger.error('Error creating object:', error);
      res.status(500).json({ success: false, error: 'Failed to create object' });
    }
  }

  async updateObject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || 1;

      // Get current object for audit
      const currentResult = await this.db.query('SELECT * FROM objects WHERE id = $1', [id]);
      
      if (currentResult.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Object not found' });
        return;
      }

      const updateFields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(req.body).forEach(key => {
        if (req.body[key] !== undefined) {
          updateFields.push(`${key} = $${paramCount++}`);
          values.push(key === 'metadata' ? JSON.stringify(req.body[key]) : req.body[key]);
        }
      });

      updateFields.push(`last_modified_by_id = $${paramCount++}`);
      values.push(userId);

      values.push(id);

      const result = await this.db.query(`
        UPDATE objects 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `, values);

      // Add audit log
      await this.db.query(`
        INSERT INTO audit_logs (object_id, personnel_id, action, old_value, new_value)
        VALUES ($1, $2, 'updated', $3, $4)
      `, [id, userId, JSON.stringify(currentResult.rows[0]), JSON.stringify(result.rows[0])]);

      // Invalidate cache
      await this.cache.del(`object:${id}`);
      await this.cache.invalidatePattern('objects:*');

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      logger.error('Error updating object:', error);
      res.status(500).json({ success: false, error: 'Failed to update object' });
    }
  }

  async deleteObject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || 1;

      const result = await this.db.query(`
        UPDATE objects 
        SET status = 'deleted', last_modified_by_id = $1
        WHERE id = $2
        RETURNING *
      `, [userId, id]);

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Object not found' });
        return;
      }

      // Add audit log
      await this.db.query(`
        INSERT INTO audit_logs (object_id, personnel_id, action)
        VALUES ($1, $2, 'deleted')
      `, [id, userId]);

      // Invalidate cache
      await this.cache.del(`object:${id}`);
      await this.cache.invalidatePattern('objects:*');

      res.json({ success: true, message: 'Object deleted successfully' });
    } catch (error) {
      logger.error('Error deleting object:', error);
      res.status(500).json({ success: false, error: 'Failed to delete object' });
    }
  }

  async searchObjects(req: Request, res: Response): Promise<void> {
    try {
      const { q, type, status, tags } = req.query;

      if (!q) {
        res.status(400).json({ success: false, error: 'Search query required' });
        return;
      }

      let query = `
        SELECT o.*, 
               l.location_name,
               p.first_name || ' ' || p.last_name as assigned_to_name
        FROM objects o
        LEFT JOIN locations l ON o.current_location_id = l.id
        LEFT JOIN personnel p ON o.assigned_to_id = p.id
        WHERE (
          o.name ILIKE $1 OR 
          o.description ILIKE $1 OR 
          o.object_code ILIKE $1 OR
          o.rfid_tag_id ILIKE $1
        )
      `;

      const params: any[] = [`%${q}%`];
      let paramCount = 2;

      if (type) {
        query += ` AND o.object_type = $${paramCount++}`;
        params.push(type);
      }

      if (status) {
        query += ` AND o.status = $${paramCount++}`;
        params.push(status);
      }

      if (tags) {
        query += ` AND o.tags && $${paramCount++}`;
        params.push(tags.toString().split(','));
      }

      query += ' ORDER BY o.created_at DESC LIMIT 100';

      const result = await this.db.query(query, params);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      logger.error('Error searching objects:', error);
      res.status(500).json({ success: false, error: 'Failed to search objects' });
    }
  }

  async assignObject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { personnel_id, notes } = req.body;
      const userId = (req as any).user?.id || 1;

      const result = await this.db.transaction(async (client) => {
        // Get current assignment
        const current = await client.query(
          'SELECT assigned_to_id FROM objects WHERE id = $1',
          [id]
        );

        if (current.rows.length === 0) {
          throw new Error('Object not found');
        }

        // Update assignment
        const updated = await client.query(`
          UPDATE objects 
          SET assigned_to_id = $1, last_modified_by_id = $2
          WHERE id = $3
          RETURNING *
        `, [personnel_id, userId, id]);

        // Add to chain of custody
        await client.query(`
          UPDATE objects 
          SET chain_of_custody = chain_of_custody || $1::jsonb
          WHERE id = $2
        `, [
          JSON.stringify({
            timestamp: new Date().toISOString(),
            from_personnel_id: current.rows[0].assigned_to_id,
            to_personnel_id: personnel_id,
            action: 'assigned',
            notes: notes,
            by_personnel_id: userId
          }),
          id
        ]);

        // Add audit log
        await client.query(`
          INSERT INTO audit_logs (object_id, personnel_id, action, notes)
          VALUES ($1, $2, 'assigned', $3)
        `, [id, userId, notes]);

        return updated.rows[0];
      });

      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Error assigning object:', error);
      res.status(500).json({ success: false, error: 'Failed to assign object' });
    }
  }

  async moveObject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { location_id, notes } = req.body;
      const userId = (req as any).user?.id || 1;

      const result = await this.db.transaction(async (client) => {
        // Get current location
        const current = await client.query(
          'SELECT current_location_id FROM objects WHERE id = $1',
          [id]
        );

        if (current.rows.length === 0) {
          throw new Error('Object not found');
        }

        // Update location
        const updated = await client.query(`
          UPDATE objects 
          SET current_location_id = $1, last_modified_by_id = $2
          WHERE id = $3
          RETURNING *
        `, [location_id, userId, id]);

        // Add to chain of custody
        await client.query(`
          UPDATE objects 
          SET chain_of_custody = chain_of_custody || $1::jsonb
          WHERE id = $2
        `, [
          JSON.stringify({
            timestamp: new Date().toISOString(),
            from_location_id: current.rows[0].current_location_id,
            to_location_id: location_id,
            action: 'moved',
            notes: notes,
            by_personnel_id: userId
          }),
          id
        ]);

        // Add audit log
        await client.query(`
          INSERT INTO audit_logs (
            object_id, personnel_id, action, 
            old_location_id, new_location_id, notes
          )
          VALUES ($1, $2, 'location_update', $3, $4, $5)
        `, [id, userId, current.rows[0].current_location_id, location_id, notes]);

        return updated.rows[0];
      });

      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Error moving object:', error);
      res.status(500).json({ success: false, error: 'Failed to move object' });
    }
  }

  async tagObject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { tags } = req.body;

      const result = await this.db.query(`
        UPDATE objects 
        SET tags = $1
        WHERE id = $2
        RETURNING *
      `, [tags, id]);

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Object not found' });
        return;
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      logger.error('Error tagging object:', error);
      res.status(500).json({ success: false, error: 'Failed to tag object' });
    }
  }

  async getObjectHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await this.db.query(`
        SELECT al.*, 
               p.first_name || ' ' || p.last_name as performed_by,
               old_loc.location_name as old_location,
               new_loc.location_name as new_location
        FROM audit_logs al
        LEFT JOIN personnel p ON al.personnel_id = p.id
        LEFT JOIN locations old_loc ON al.old_location_id = old_loc.id
        LEFT JOIN locations new_loc ON al.new_location_id = new_loc.id
        WHERE al.object_id = $1
        ORDER BY al.timestamp DESC
      `, [id]);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      logger.error('Error getting object history:', error);
      res.status(500).json({ success: false, error: 'Failed to get object history' });
    }
  }

  async getChainOfCustody(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await this.db.query(`
        SELECT chain_of_custody 
        FROM objects 
        WHERE id = $1
      `, [id]);

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Object not found' });
        return;
      }

      res.json({ success: true, data: result.rows[0].chain_of_custody });
    } catch (error) {
      logger.error('Error getting chain of custody:', error);
      res.status(500).json({ success: false, error: 'Failed to get chain of custody' });
    }
  }

  async getObjectTypes(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.db.query(`
        SELECT DISTINCT object_type, COUNT(*) as count
        FROM objects
        GROUP BY object_type
        ORDER BY count DESC
      `);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      logger.error('Error getting object types:', error);
      res.status(500).json({ success: false, error: 'Failed to get object types' });
    }
  }

  async getObjectStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.db.query(`
        SELECT 
          COUNT(*) as total_objects,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_objects,
          COUNT(CASE WHEN object_type = 'docket' THEN 1 END) as total_dockets,
          COUNT(CASE WHEN object_type = 'evidence' THEN 1 END) as total_evidence,
          COUNT(CASE WHEN object_type = 'equipment' THEN 1 END) as total_equipment,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as created_today,
          COUNT(CASE WHEN updated_at > NOW() - INTERVAL '24 hours' THEN 1 END) as updated_today
        FROM objects
      `);

      res.json({ success: true, data: stats.rows[0] });
    } catch (error) {
      logger.error('Error getting object stats:', error);
      res.status(500).json({ success: false, error: 'Failed to get object stats' });
    }
  }
}