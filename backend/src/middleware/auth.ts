import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    employee_id: string;
  };
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ 
      success: false, 
      error: { message: 'Access token required' } 
    });
    return;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      employee_id: decoded.employee_id
    };

    logger.debug(`User authenticated: ${req.user.email} (${req.user.role})`);
    next();
  } catch (error) {
    logger.warn(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(403).json({ 
      success: false, 
      error: { message: 'Invalid or expired token' } 
    });
  }
};

export const requireRole = (roles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: { message: 'Authentication required' } 
      });
      return;
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.email} with role ${req.user.role}. Required: ${allowedRoles.join(', ')}`);
      res.status(403).json({ 
        success: false, 
        error: { message: 'Insufficient permissions' } 
      });
      return;
    }

    next();
  };
};

// Role hierarchy for convenience
export const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor', 
  TECHNICIAN: 'technician',
  VIEWER: 'viewer'
} as const;

// Helper functions for common role checks
export const requireAdmin = requireRole(ROLES.ADMIN);
export const requireSupervisorOrAdmin = requireRole([ROLES.SUPERVISOR, ROLES.ADMIN]);
export const requireTechnicianOrHigher = requireRole([ROLES.TECHNICIAN, ROLES.SUPERVISOR, ROLES.ADMIN]);