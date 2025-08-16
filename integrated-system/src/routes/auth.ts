import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../database/connection';
import { strictRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/login', strictRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Query the database for the user
    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    // Get user roles
    const rolesResult = await query(
      `SELECT r.name, r.permissions 
       FROM roles r 
       JOIN user_roles ur ON r.id = ur.role_id 
       WHERE ur.user_id = $1`,
      [user.id]
    );

    const roles = rolesResult.rows.map(r => r.name);
    const permissions = rolesResult.rows.reduce((acc, r) => ({...acc, ...r.permissions}), {});

    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        username: user.username,
        roles: roles,
        permissions: permissions
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as jwt.SignOptions
    );

    // Store session
    await query(
      'INSERT INTO user_sessions (user_id, token, ip_address, user_agent, expires_at) VALUES ($1, $2, $3, $4, NOW() + INTERVAL \'24 hours\')',
      [user.id, token, req.ip, req.headers['user-agent']]
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          department: user.department,
          roles: roles,
          isAdmin: user.is_admin
        }
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed', message: error.message });
  }
});

router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    
    // Check if session is still valid
    const sessionResult = await query(
      'SELECT * FROM user_sessions WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (sessionResult.rows.length === 0) {
      res.status(401).json({ success: false, error: 'Session expired' });
      return;
    }

    // Check if user still exists and is active
    const result = await query(
      'SELECT id, email, username, full_name, department, is_admin FROM users WHERE id = $1 AND is_active = true',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ success: false, error: 'Invalid token' });
      return;
    }

    res.json({
      success: true,
      data: {
        user: result.rows[0]
      }
    });
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      // Remove session from database
      await query(
        'DELETE FROM user_sessions WHERE token = $1',
        [token]
      );
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, error: 'Logout failed', message: error.message });
  }
});

router.post('/register', strictRateLimiter, async (req, res) => {
  try {
    const { email, password, username, fullName, department, phone } = req.body;

    // Check if user exists
    const existing = await query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existing.rows.length > 0) {
      res.status(400).json({ success: false, error: 'User already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (email, username, password_hash, full_name, department, phone, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, true) 
       RETURNING id, email, username, full_name`,
      [email, username, hashedPassword, fullName, department, phone]
    );

    // Assign default role (client)
    await query(
      'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, 4, 1)',
      [result.rows[0].id]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Registration failed', message: error.message });
  }
});

// Change password
router.post('/change-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    const { currentPassword, newPassword } = req.body;

    // Get current user
    const userResult = await query(
      'SELECT * FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const user = userResult.rows[0];
    
    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
      res.status(401).json({ success: false, error: 'Current password is incorrect' });
      return;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, decoded.id]
    );

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Password change error:', error);
    res.status(500).json({ success: false, error: 'Failed to change password', message: error.message });
  }
});

export default router;