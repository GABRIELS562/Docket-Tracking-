import { Request, Response, NextFunction } from 'express';
import { ObjectModel, IObject } from '../models/Object';
import { AuditLogModel } from '../models/AuditLog';
import { logger } from '../utils/logger';

export class ObjectsController {
  static async createObject(req: Request, res: Response, next: NextFunction) {
    try {
      const objectData: IObject = req.body;
      objectData.created_by_id = (req as any).user?.id;

      const existingCode = await ObjectModel.findByCode(objectData.object_code);
      if (existingCode) {
        return res.status(400).json({ 
          error: 'Object with this code already exists' 
        });
      }

      const existingTag = await ObjectModel.findByRfidTag(objectData.rfid_tag_id);
      if (existingTag) {
        return res.status(400).json({ 
          error: 'RFID tag is already assigned to another object' 
        });
      }

      const newObject = await ObjectModel.create(objectData);

      await AuditLogModel.create({
        object_id: newObject.id,
        personnel_id: (req as any).user?.id,
        action: 'CREATED',
        notes: `Created ${newObject.object_type}: ${newObject.name}`,
        session_id: (req as any).sessionId
      });

      logger.info(`Object created: ${newObject.object_code} by user ${(req as any).user?.id}`);

      res.status(201).json({
        success: true,
        data: newObject
      });
    } catch (error) {
      logger.error('Error creating object:', error);
      next(error);
    }
  }

  static async getObject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const object = await ObjectModel.findById(parseInt(id));

      if (!object) {
        return res.status(404).json({ 
          error: 'Object not found' 
        });
      }

      const auditLogs = await AuditLogModel.findByObjectId(object.id!, 10);

      res.json({
        success: true,
        data: {
          ...object,
          recent_history: auditLogs
        }
      });
    } catch (error) {
      logger.error('Error fetching object:', error);
      next(error);
    }
  }

  static async listObjects(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        object_type,
        status,
        assigned_to_id,
        current_location_id,
        limit = 50,
        offset = 0
      } = req.query;

      const filters = {
        object_type: object_type as string,
        status: status as string,
        assigned_to_id: assigned_to_id ? parseInt(assigned_to_id as string) : undefined,
        current_location_id: current_location_id ? parseInt(current_location_id as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      const objects = await ObjectModel.findAll(filters);
      const total = await ObjectModel.count({
        object_type: filters.object_type,
        status: filters.status
      });

      res.json({
        success: true,
        data: objects,
        pagination: {
          total,
          limit: filters.limit,
          offset: filters.offset,
          pages: Math.ceil(total / filters.limit)
        }
      });
    } catch (error) {
      logger.error('Error listing objects:', error);
      next(error);
    }
  }

  static async updateObject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const object = await ObjectModel.findById(parseInt(id));
      if (!object) {
        return res.status(404).json({ 
          error: 'Object not found' 
        });
      }

      const updatedObject = await ObjectModel.update(parseInt(id), updates);

      await AuditLogModel.create({
        object_id: parseInt(id),
        personnel_id: (req as any).user?.id,
        action: 'UPDATED',
        notes: `Updated object: ${JSON.stringify(updates)}`,
        session_id: (req as any).sessionId
      });

      logger.info(`Object updated: ${object.object_code} by user ${(req as any).user?.id}`);

      res.json({
        success: true,
        data: updatedObject
      });
    } catch (error) {
      logger.error('Error updating object:', error);
      next(error);
    }
  }

  static async deleteObject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const object = await ObjectModel.findById(parseInt(id));
      if (!object) {
        return res.status(404).json({ 
          error: 'Object not found' 
        });
      }

      await AuditLogModel.create({
        object_id: parseInt(id),
        personnel_id: (req as any).user?.id,
        action: 'DELETED',
        notes: `Deleted ${object.object_type}: ${object.name}`,
        session_id: (req as any).sessionId
      });

      const deleted = await ObjectModel.delete(parseInt(id));

      logger.info(`Object deleted: ${object.object_code} by user ${(req as any).user?.id}`);

      res.json({
        success: true,
        message: 'Object deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting object:', error);
      next(error);
    }
  }

  static async assignObject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { personnel_id } = req.body;

      const object = await ObjectModel.findById(parseInt(id));
      if (!object) {
        return res.status(404).json({ 
          error: 'Object not found' 
        });
      }

      const oldAssignee = object.assigned_to_id;
      const updatedObject = await ObjectModel.assignToPersonnel(
        parseInt(id), 
        personnel_id ? parseInt(personnel_id) : null
      );

      await AuditLogModel.create({
        object_id: parseInt(id),
        personnel_id: (req as any).user?.id,
        action: personnel_id ? 'ASSIGNED' : 'UNASSIGNED',
        notes: personnel_id 
          ? `Assigned to personnel ID: ${personnel_id}`
          : `Unassigned from personnel ID: ${oldAssignee}`,
        session_id: (req as any).sessionId
      });

      logger.info(`Object ${object.object_code} ${personnel_id ? 'assigned to' : 'unassigned from'} personnel by user ${(req as any).user?.id}`);

      res.json({
        success: true,
        data: updatedObject
      });
    } catch (error) {
      logger.error('Error assigning object:', error);
      next(error);
    }
  }

  static async moveObject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { location_id, reader_id } = req.body;

      const object = await ObjectModel.findById(parseInt(id));
      if (!object) {
        return res.status(404).json({ 
          error: 'Object not found' 
        });
      }

      const oldLocation = object.current_location_id;
      const updatedObject = await ObjectModel.moveToLocation(
        parseInt(id), 
        parseInt(location_id)
      );

      await ObjectModel.addToChainOfCustody(parseInt(id), {
        personnel_id: (req as any).user?.id,
        action: 'MOVED',
        location_id: parseInt(location_id),
        notes: `Moved from location ${oldLocation} to ${location_id}`
      });

      await AuditLogModel.create({
        object_id: parseInt(id),
        personnel_id: (req as any).user?.id,
        action: 'MOVED',
        old_location_id: oldLocation || undefined,
        new_location_id: parseInt(location_id),
        reader_id: reader_id,
        notes: `Moved object to new location`,
        session_id: (req as any).sessionId
      });

      logger.info(`Object ${object.object_code} moved from location ${oldLocation} to ${location_id} by user ${(req as any).user?.id}`);

      res.json({
        success: true,
        data: updatedObject
      });
    } catch (error) {
      logger.error('Error moving object:', error);
      next(error);
    }
  }

  static async getObjectTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const types = await ObjectModel.getObjectTypes();

      res.json({
        success: true,
        data: types
      });
    } catch (error) {
      logger.error('Error fetching object types:', error);
      next(error);
    }
  }

  static async searchObjects(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        query: searchQuery,
        object_type,
        status,
        priority_level,
        limit = 50,
        offset = 0
      } = req.query;

      let whereClause = 'WHERE 1=1';
      const values: any[] = [];
      let paramIndex = 1;

      if (searchQuery) {
        whereClause += ` AND (
          name ILIKE $${paramIndex} OR 
          description ILIKE $${paramIndex} OR 
          object_code ILIKE $${paramIndex} OR
          rfid_tag_id = $${paramIndex + 1}
        )`;
        values.push(`%${searchQuery}%`);
        values.push(searchQuery);
        paramIndex += 2;
      }

      if (object_type) {
        whereClause += ` AND object_type = $${paramIndex++}`;
        values.push(object_type);
      }

      if (status) {
        whereClause += ` AND status = $${paramIndex++}`;
        values.push(status);
      }

      if (priority_level) {
        whereClause += ` AND priority_level = $${paramIndex++}`;
        values.push(priority_level);
      }

      values.push(parseInt(limit as string));
      values.push(parseInt(offset as string));

      const queryText = `
        SELECT * FROM objects 
        ${whereClause}
        ORDER BY 
          CASE priority_level 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'normal' THEN 3 
            WHEN 'low' THEN 4 
          END,
          updated_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}`;

      const { query } = await import('../utils/database');
      const result = await query(queryText, values);

      const countQuery = `SELECT COUNT(*) FROM objects ${whereClause}`;
      const countResult = await query(countQuery, values.slice(0, -2));
      const total = parseInt(countResult.rows[0].count);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          pages: Math.ceil(total / parseInt(limit as string))
        }
      });
    } catch (error) {
      logger.error('Error searching objects:', error);
      next(error);
    }
  }
}