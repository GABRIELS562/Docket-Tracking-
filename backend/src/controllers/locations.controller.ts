import { Request, Response, NextFunction } from 'express';
import { LocationModel, ILocation } from '../models/Location';
import { AuditLogModel } from '../models/AuditLog';
import { logger } from '../utils/logger';

export class LocationsController {
  static async createLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const locationData: ILocation = req.body;

      if ((req as any).user?.role !== 'admin' && (req as any).user?.role !== 'supervisor') {
        return res.status(403).json({ 
          error: 'Insufficient permissions to create locations' 
        });
      }

      const existingCode = await LocationModel.findByCode(locationData.location_code);
      if (existingCode) {
        return res.status(400).json({ 
          error: 'Location code already exists' 
        });
      }

      if (locationData.rfid_reader_id) {
        const existingReader = await LocationModel.findByReaderId(locationData.rfid_reader_id);
        if (existingReader) {
          return res.status(400).json({ 
            error: 'RFID reader is already assigned to another location' 
          });
        }
      }

      const newLocation = await LocationModel.create(locationData);

      await AuditLogModel.create({
        personnel_id: (req as any).user?.id,
        action: 'LOCATION_CREATED',
        new_location_id: newLocation.id,
        notes: `Created location: ${newLocation.location_name}`,
        session_id: (req as any).sessionId
      });

      logger.info(`Location created: ${newLocation.location_code} by user ${(req as any).user?.id}`);

      res.status(201).json({
        success: true,
        data: newLocation
      });
    } catch (error) {
      logger.error('Error creating location:', error);
      next(error);
    }
  }

  static async getLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const location = await LocationModel.findById(parseInt(id));

      if (!location) {
        return res.status(404).json({ 
          error: 'Location not found' 
        });
      }

      const objectsInLocation = await LocationModel.getObjectsInLocation(location.id!);
      const recentMovements = await AuditLogModel.getLocationMovements(location.id!, 7);

      res.json({
        success: true,
        data: {
          ...location,
          objects_count: objectsInLocation.length,
          objects: objectsInLocation.slice(0, 10),
          recent_movements: recentMovements
        }
      });
    } catch (error) {
      logger.error('Error fetching location:', error);
      next(error);
    }
  }

  static async listLocations(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        zone,
        building,
        floor,
        security_level,
        active,
        limit = 50,
        offset = 0
      } = req.query;

      const filters = {
        zone: zone as string,
        building: building as string,
        floor: floor ? parseInt(floor as string) : undefined,
        security_level: security_level as string,
        active: active === 'true' ? true : active === 'false' ? false : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      const locations = await LocationModel.findAll(filters);
      const total = await LocationModel.count({
        zone: filters.zone,
        building: filters.building,
        active: filters.active
      });

      res.json({
        success: true,
        data: locations,
        pagination: {
          total,
          limit: filters.limit,
          offset: filters.offset,
          pages: Math.ceil(total / filters.limit)
        }
      });
    } catch (error) {
      logger.error('Error listing locations:', error);
      next(error);
    }
  }

  static async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updates = req.body;

      if ((req as any).user?.role !== 'admin' && (req as any).user?.role !== 'supervisor') {
        return res.status(403).json({ 
          error: 'Insufficient permissions to update locations' 
        });
      }

      const location = await LocationModel.findById(parseInt(id));
      if (!location) {
        return res.status(404).json({ 
          error: 'Location not found' 
        });
      }

      if (updates.rfid_reader_id && updates.rfid_reader_id !== location.rfid_reader_id) {
        const existingReader = await LocationModel.findByReaderId(updates.rfid_reader_id);
        if (existingReader) {
          return res.status(400).json({ 
            error: 'RFID reader is already assigned to another location' 
          });
        }
      }

      const updatedLocation = await LocationModel.update(parseInt(id), updates);

      await AuditLogModel.create({
        personnel_id: (req as any).user?.id,
        action: 'LOCATION_UPDATED',
        new_location_id: parseInt(id),
        notes: `Updated location: ${location.location_code}`,
        session_id: (req as any).sessionId
      });

      logger.info(`Location updated: ${location.location_code} by user ${(req as any).user?.id}`);

      res.json({
        success: true,
        data: updatedLocation
      });
    } catch (error) {
      logger.error('Error updating location:', error);
      next(error);
    }
  }

  static async deactivateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if ((req as any).user?.role !== 'admin') {
        return res.status(403).json({ 
          error: 'Only administrators can deactivate locations' 
        });
      }

      const location = await LocationModel.findById(parseInt(id));
      if (!location) {
        return res.status(404).json({ 
          error: 'Location not found' 
        });
      }

      const objectsInLocation = await LocationModel.getObjectsInLocation(parseInt(id));
      if (objectsInLocation.length > 0) {
        return res.status(400).json({ 
          error: `Cannot deactivate location with ${objectsInLocation.length} objects present` 
        });
      }

      const deactivated = await LocationModel.deactivate(parseInt(id));

      await AuditLogModel.create({
        personnel_id: (req as any).user?.id,
        action: 'LOCATION_DEACTIVATED',
        old_location_id: parseInt(id),
        notes: `Deactivated location: ${location.location_code}`,
        session_id: (req as any).sessionId
      });

      logger.info(`Location deactivated: ${location.location_code} by user ${(req as any).user?.id}`);

      res.json({
        success: true,
        data: deactivated
      });
    } catch (error) {
      logger.error('Error deactivating location:', error);
      next(error);
    }
  }

  static async getLocationObjects(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const location = await LocationModel.findById(parseInt(id));
      if (!location) {
        return res.status(404).json({ 
          error: 'Location not found' 
        });
      }

      const objects = await LocationModel.getObjectsInLocation(parseInt(id));

      res.json({
        success: true,
        data: objects
      });
    } catch (error) {
      logger.error('Error fetching location objects:', error);
      next(error);
    }
  }

  static async getLocationHierarchy(req: Request, res: Response, next: NextFunction) {
    try {
      const hierarchy = await LocationModel.getLocationHierarchy();

      res.json({
        success: true,
        data: hierarchy
      });
    } catch (error) {
      logger.error('Error fetching location hierarchy:', error);
      next(error);
    }
  }

  static async searchLocations(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        query: searchQuery,
        building,
        zone,
        floor,
        with_readers,
        limit = 50,
        offset = 0
      } = req.query;

      const { query } = await import('../utils/database');
      
      let whereClause = 'WHERE active = true';
      const values: any[] = [];
      let paramIndex = 1;

      if (searchQuery) {
        whereClause += ` AND (
          location_name ILIKE $${paramIndex} OR 
          description ILIKE $${paramIndex} OR 
          location_code ILIKE $${paramIndex} OR
          room ILIKE $${paramIndex}
        )`;
        values.push(`%${searchQuery}%`);
        paramIndex++;
      }

      if (building) {
        whereClause += ` AND building = $${paramIndex++}`;
        values.push(building);
      }

      if (zone) {
        whereClause += ` AND zone = $${paramIndex++}`;
        values.push(zone);
      }

      if (floor) {
        whereClause += ` AND floor = $${paramIndex++}`;
        values.push(parseInt(floor as string));
      }

      if (with_readers === 'true') {
        whereClause += ` AND rfid_reader_id IS NOT NULL`;
      } else if (with_readers === 'false') {
        whereClause += ` AND rfid_reader_id IS NULL`;
      }

      values.push(parseInt(limit as string));
      values.push(parseInt(offset as string));

      const queryText = `
        SELECT l.*, 
               COUNT(DISTINCT o.id) as object_count
        FROM locations l
        LEFT JOIN objects o ON l.id = o.current_location_id
        ${whereClause}
        GROUP BY l.id
        ORDER BY l.building, l.floor, l.zone, l.location_name
        LIMIT $${paramIndex++} OFFSET $${paramIndex}`;

      const result = await query(queryText, values);

      const countQuery = `
        SELECT COUNT(DISTINCT l.id) 
        FROM locations l
        ${whereClause}`;
      
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
      logger.error('Error searching locations:', error);
      next(error);
    }
  }
}