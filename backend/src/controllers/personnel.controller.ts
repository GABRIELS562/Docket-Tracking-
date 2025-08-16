import { Request, Response, NextFunction } from 'express';
import { PersonnelModel, IPersonnel } from '../models/Personnel';
import { AuditLogModel } from '../models/AuditLog';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';

export class PersonnelController {
  static async createPersonnel(req: Request, res: Response, next: NextFunction) {
    try {
      const personnelData: IPersonnel & { password?: string } = req.body;

      if ((req as any).user?.role !== 'admin' && (req as any).user?.role !== 'supervisor') {
        return res.status(403).json({ 
          error: 'Insufficient permissions to create personnel' 
        });
      }

      const existingEmployee = await PersonnelModel.findByEmployeeId(personnelData.employee_id);
      if (existingEmployee) {
        return res.status(400).json({ 
          error: 'Employee ID already exists' 
        });
      }

      if (personnelData.email) {
        const existingEmail = await PersonnelModel.findByEmail(personnelData.email);
        if (existingEmail) {
          return res.status(400).json({ 
            error: 'Email already registered' 
          });
        }
      }

      if (personnelData.rfid_badge_id) {
        const existingBadge = await PersonnelModel.findByRfidBadge(personnelData.rfid_badge_id);
        if (existingBadge) {
          return res.status(400).json({ 
            error: 'RFID badge already assigned' 
          });
        }
      }

      const newPersonnel = await PersonnelModel.create(personnelData);

      await AuditLogModel.create({
        personnel_id: (req as any).user?.id,
        action: 'PERSONNEL_CREATED',
        notes: `Created personnel: ${newPersonnel.first_name} ${newPersonnel.last_name} (${newPersonnel.employee_id})`,
        session_id: (req as any).sessionId
      });

      logger.info(`Personnel created: ${newPersonnel.employee_id} by user ${(req as any).user?.id}`);

      res.status(201).json({
        success: true,
        data: newPersonnel
      });
    } catch (error) {
      logger.error('Error creating personnel:', error);
      next(error);
    }
  }

  static async getPersonnel(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const personnel = await PersonnelModel.findById(parseInt(id));

      if (!personnel) {
        return res.status(404).json({ 
          error: 'Personnel not found' 
        });
      }

      const assignedObjects = await PersonnelModel.getAssignedObjects(personnel.id!);
      const recentActivity = await AuditLogModel.findByPersonnelId(personnel.id!, 10);

      res.json({
        success: true,
        data: {
          ...personnel,
          assigned_objects_count: assignedObjects.length,
          assigned_objects: assignedObjects.slice(0, 10),
          recent_activity: recentActivity
        }
      });
    } catch (error) {
      logger.error('Error fetching personnel:', error);
      next(error);
    }
  }

  static async listPersonnel(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        department,
        role,
        active,
        limit = 50,
        offset = 0
      } = req.query;

      const filters = {
        department: department as string,
        role: role as string,
        active: active === 'true' ? true : active === 'false' ? false : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      const personnel = await PersonnelModel.findAll(filters);
      const total = await PersonnelModel.count({
        department: filters.department,
        role: filters.role,
        active: filters.active
      });

      res.json({
        success: true,
        data: personnel,
        pagination: {
          total,
          limit: filters.limit,
          offset: filters.offset,
          pages: Math.ceil(total / filters.limit)
        }
      });
    } catch (error) {
      logger.error('Error listing personnel:', error);
      next(error);
    }
  }

  static async updatePersonnel(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updates = req.body;

      if ((req as any).user?.role !== 'admin' && (req as any).user?.role !== 'supervisor') {
        if ((req as any).user?.id !== parseInt(id)) {
          return res.status(403).json({ 
            error: 'Insufficient permissions to update personnel' 
          });
        }
        delete updates.role;
        delete updates.security_clearance;
      }

      const personnel = await PersonnelModel.findById(parseInt(id));
      if (!personnel) {
        return res.status(404).json({ 
          error: 'Personnel not found' 
        });
      }

      if (updates.email && updates.email !== personnel.email) {
        const existingEmail = await PersonnelModel.findByEmail(updates.email);
        if (existingEmail) {
          return res.status(400).json({ 
            error: 'Email already registered' 
          });
        }
      }

      if (updates.rfid_badge_id && updates.rfid_badge_id !== personnel.rfid_badge_id) {
        const existingBadge = await PersonnelModel.findByRfidBadge(updates.rfid_badge_id);
        if (existingBadge) {
          return res.status(400).json({ 
            error: 'RFID badge already assigned' 
          });
        }
      }

      const updatedPersonnel = await PersonnelModel.update(parseInt(id), updates);

      await AuditLogModel.create({
        personnel_id: (req as any).user?.id,
        action: 'PERSONNEL_UPDATED',
        notes: `Updated personnel: ${personnel.employee_id}`,
        session_id: (req as any).sessionId
      });

      logger.info(`Personnel updated: ${personnel.employee_id} by user ${(req as any).user?.id}`);

      res.json({
        success: true,
        data: updatedPersonnel
      });
    } catch (error) {
      logger.error('Error updating personnel:', error);
      next(error);
    }
  }

  static async deactivatePersonnel(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if ((req as any).user?.role !== 'admin' && (req as any).user?.role !== 'supervisor') {
        return res.status(403).json({ 
          error: 'Insufficient permissions to deactivate personnel' 
        });
      }

      const personnel = await PersonnelModel.findById(parseInt(id));
      if (!personnel) {
        return res.status(404).json({ 
          error: 'Personnel not found' 
        });
      }

      const deactivated = await PersonnelModel.deactivate(parseInt(id));

      await AuditLogModel.create({
        personnel_id: (req as any).user?.id,
        action: 'PERSONNEL_DEACTIVATED',
        notes: `Deactivated personnel: ${personnel.employee_id}`,
        session_id: (req as any).sessionId
      });

      logger.info(`Personnel deactivated: ${personnel.employee_id} by user ${(req as any).user?.id}`);

      res.json({
        success: true,
        data: deactivated
      });
    } catch (error) {
      logger.error('Error deactivating personnel:', error);
      next(error);
    }
  }

  static async getPersonnelObjects(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const personnel = await PersonnelModel.findById(parseInt(id));
      if (!personnel) {
        return res.status(404).json({ 
          error: 'Personnel not found' 
        });
      }

      const objects = await PersonnelModel.getAssignedObjects(parseInt(id));

      res.json({
        success: true,
        data: objects
      });
    } catch (error) {
      logger.error('Error fetching personnel objects:', error);
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Email and password are required' 
        });
      }

      const personnel = await PersonnelModel.verifyPassword(email, password);

      if (!personnel) {
        await AuditLogModel.create({
          action: 'LOGIN_FAILED',
          notes: `Failed login attempt for email: ${email}`,
          session_id: (req as any).sessionId
        });

        return res.status(401).json({ 
          error: 'Invalid credentials' 
        });
      }

      if (!personnel.active) {
        return res.status(403).json({ 
          error: 'Account is deactivated' 
        });
      }

      const token = jwt.sign(
        { 
          id: personnel.id,
          employee_id: personnel.employee_id,
          email: personnel.email,
          role: personnel.role 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '8h' }
      );

      await AuditLogModel.create({
        personnel_id: personnel.id,
        action: 'LOGIN',
        notes: `Successful login`,
        session_id: (req as any).sessionId
      });

      logger.info(`Successful login for: ${personnel.employee_id}`);

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: personnel.id,
            employee_id: personnel.employee_id,
            first_name: personnel.first_name,
            last_name: personnel.last_name,
            email: personnel.email,
            department: personnel.department,
            role: personnel.role
          }
        }
      });
    } catch (error) {
      logger.error('Error during login:', error);
      next(error);
    }
  }

  static async scanBadge(req: Request, res: Response, next: NextFunction) {
    try {
      const { rfid_badge_id } = req.body;

      if (!rfid_badge_id) {
        return res.status(400).json({ 
          error: 'RFID badge ID is required' 
        });
      }

      const personnel = await PersonnelModel.findByRfidBadge(rfid_badge_id);

      if (!personnel) {
        await AuditLogModel.create({
          action: 'BADGE_SCAN_FAILED',
          notes: `Unknown badge scanned: ${rfid_badge_id}`,
          session_id: (req as any).sessionId
        });

        return res.status(404).json({ 
          error: 'Badge not recognized' 
        });
      }

      if (!personnel.active) {
        await AuditLogModel.create({
          personnel_id: personnel.id,
          action: 'BADGE_SCAN_INACTIVE',
          notes: `Inactive personnel badge scanned`,
          session_id: (req as any).sessionId
        });

        return res.status(403).json({ 
          error: 'Personnel account is inactive' 
        });
      }

      await AuditLogModel.create({
        personnel_id: personnel.id,
        action: 'BADGE_SCANNED',
        notes: `Badge scanned successfully`,
        session_id: (req as any).sessionId
      });

      logger.info(`Badge scanned for: ${personnel.employee_id}`);

      res.json({
        success: true,
        data: {
          id: personnel.id,
          employee_id: personnel.employee_id,
          first_name: personnel.first_name,
          last_name: personnel.last_name,
          department: personnel.department,
          role: personnel.role,
          security_clearance: personnel.security_clearance
        }
      });
    } catch (error) {
      logger.error('Error scanning badge:', error);
      next(error);
    }
  }
}