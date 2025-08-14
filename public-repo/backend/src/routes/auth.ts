import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../utils/database';
import { logger } from '../utils/logger';

const router = express.Router();

// Register new user
router.post('/register', async (req, res, next): Promise<void> => {
  try {
    const { 
      employee_id, 
      first_name, 
      last_name, 
      email, 
      password, 
      department, 
      role = 'viewer',
      security_clearance = 'normal'
    } = req.body;

    // Validate required fields
    if (!employee_id || !first_name || !last_name || !email || !password) {
      res.status(400).json({
        success: false,
        error: { message: 'All required fields must be provided' }
      });
      return;
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM personnel WHERE email = $1 OR employee_id = $2',
      [email, employee_id]
    );

    if (existingUser.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: { message: 'User with this email or employee ID already exists' }
      });
      return;
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await query(`
      INSERT INTO personnel (
        employee_id, first_name, last_name, email, password_hash,
        department, role, security_clearance, active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
      RETURNING id, employee_id, first_name, last_name, email, department, role, security_clearance, created_at
    `, [
      employee_id, first_name, last_name, email, hashedPassword,
      department, role, security_clearance
    ]);

    const user = result.rows[0];
    
    logger.info(`New user registered: ${email} (${employee_id})`);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          employee_id: user.employee_id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          department: user.department,
          role: user.role,
          security_clearance: user.security_clearance,
          created_at: user.created_at
        }
      },
      message: 'User registered successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Login user
router.post('/login', async (req, res, next): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: { message: 'Email and password are required' }
      });
      return;
    }

    // Find user by email
    const result = await query(`
      SELECT id, employee_id, first_name, last_name, email, password_hash,
             department, role, security_clearance, active
      FROM personnel 
      WHERE email = $1 AND active = true
    `, [email]);

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid credentials' }
      });
      return;
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid credentials' }
      });
      return;
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        employee_id: user.employee_id
      },
      jwtSecret as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as jwt.SignOptions
    );

    // Update last login
    await query(
      'UPDATE personnel SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    logger.info(`User logged in: ${email} (${user.employee_id})`);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          employee_id: user.employee_id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          department: user.department,
          role: user.role,
          security_clearance: user.security_clearance
        }
      },
      message: 'Login successful'
    });

  } catch (error) {
    next(error);
  }
});

// Get current user profile
router.get('/profile', async (req, res, next): Promise<void> => {
  // This will need the auth middleware when implemented
  res.json({
    success: true,
    message: 'Profile endpoint - requires authentication middleware'
  });
});

// Logout (client-side token removal, but we can log it)
router.post('/logout', async (req, res, next): Promise<void> => {
  try {
    // In a real app, you might want to blacklist the token
    logger.info('User logged out');
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
});

export default router;