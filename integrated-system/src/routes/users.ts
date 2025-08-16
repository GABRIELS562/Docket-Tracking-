/**
 * User Management Routes
 * Handles user CRUD operations, roles, and permissions
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../database/connection';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// =====================================================
// USERS
// =====================================================

// Get all users with filters
router.get('/', async (req, res) => {
  try {
    const { department, role, status, search } = req.query;
    let conditions = ['1=1'];
    let params: any[] = [];
    let paramIndex = 1;

    if (department) {
      conditions.push(`u.department = $${paramIndex++}`);
      params.push(department);
    }
    if (status) {
      conditions.push(`u.is_active = $${paramIndex++}`);
      params.push(status === 'active');
    }
    if (search) {
      conditions.push(`(u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const result = await query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.full_name,
        u.department,
        u.position,
        u.is_active,
        u.is_admin,
        u.created_at,
        u.last_login,
        ARRAY_AGG(DISTINCT r.name) as roles,
        COUNT(DISTINCT us.id) as active_sessions
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN user_sessions us ON u.id = us.user_id AND us.expires_at > NOW()
      WHERE ${conditions.join(' AND ')}
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch users',
      message: error.message 
    });
  }
});

// Get single user details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const userResult = await query(`
      SELECT 
        u.*,
        ARRAY_AGG(DISTINCT r.name) as roles,
        ARRAY_AGG(DISTINCT r.id) as role_ids
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1
      GROUP BY u.id
    `, [id]);

    if (userResult.rows.length === 0) {
      res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
      return;
    }

    // Get user's permissions
    const permissionsResult = await query(`
      SELECT DISTINCT p.* 
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = $1
    `, [id]);

    const user = userResult.rows[0];
    user.permissions = permissionsResult.rows;

    res.json({
      success: true,
      data: user
    });
  } catch (error: any) {
    logger.error('Error fetching user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user',
      message: error.message 
    });
  }
});

// Create new user
router.post('/', async (req, res) => {
  try {
    const { 
      username, 
      email, 
      password, 
      full_name, 
      department, 
      position,
      roles = [],
      is_admin = false 
    } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      res.status(400).json({ 
        success: false, 
        error: 'Username, email, and password are required' 
      });
      return;
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      res.status(400).json({ 
        success: false, 
        error: 'Username or email already exists' 
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with transaction
    const userId = await withTransaction(async (client: any) => {
      // Insert user
      const userResult = await client.query(`
        INSERT INTO users (
          username, 
          email, 
          password, 
          full_name, 
          department, 
          position,
          is_admin,
          is_active,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, CURRENT_TIMESTAMP)
        RETURNING id
      `, [username, email, hashedPassword, full_name, department, position, is_admin]);

      const newUserId = userResult.rows[0].id;

      // Assign roles
      for (const roleId of roles) {
        await client.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
          [newUserId, roleId]
        );
      }

      return newUserId;
    });

    logger.info(`User created: ${username} (ID: ${userId})`);

    res.status(201).json({
      success: true,
      data: { id: userId, username, email }
    });
  } catch (error: any) {
    logger.error('Error creating user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create user',
      message: error.message 
    });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      username, 
      email, 
      full_name, 
      department, 
      position,
      is_active,
      is_admin,
      roles 
    } = req.body;

    await withTransaction(async (client: any) => {
      // Update user details
      await client.query(`
        UPDATE users 
        SET 
          username = COALESCE($1, username),
          email = COALESCE($2, email),
          full_name = COALESCE($3, full_name),
          department = COALESCE($4, department),
          position = COALESCE($5, position),
          is_active = COALESCE($6, is_active),
          is_admin = COALESCE($7, is_admin),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
      `, [username, email, full_name, department, position, is_active, is_admin, id]);

      // Update roles if provided
      if (roles && Array.isArray(roles)) {
        // Remove existing roles
        await client.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
        
        // Add new roles
        for (const roleId of roles) {
          await client.query(
            'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
            [id, roleId]
          );
        }
      }
    });

    logger.info(`User updated: ID ${id}`);

    res.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error: any) {
    logger.error('Error updating user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update user',
      message: error.message 
    });
  }
});

// Reset user password
router.post('/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 6 characters' 
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, id]
    );

    logger.info(`Password reset for user ID: ${id}`);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error: any) {
    logger.error('Error resetting password:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reset password',
      message: error.message 
    });
  }
});

// Delete user (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Don't allow deleting the last admin
    const adminCount = await query(
      'SELECT COUNT(*) as count FROM users WHERE is_admin = true AND is_active = true AND id != $1',
      [id]
    );

    if (adminCount.rows[0].count === 0) {
      res.status(400).json({ 
        success: false, 
        error: 'Cannot delete the last admin user' 
      });
      return;
    }

    // Soft delete by deactivating
    await query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    // Expire all sessions
    await query(
      'UPDATE user_sessions SET expires_at = CURRENT_TIMESTAMP WHERE user_id = $1',
      [id]
    );

    logger.info(`User deactivated: ID ${id}`);

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete user',
      message: error.message 
    });
  }
});

// =====================================================
// ROLES
// =====================================================

// Get all roles
router.get('/roles/list', async (_req, res) => {
  try {
    const result = await query(`
      SELECT 
        r.*,
        COUNT(DISTINCT ur.user_id) as user_count,
        ARRAY_AGG(DISTINCT p.name) as permissions
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      GROUP BY r.id
      ORDER BY r.name
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    logger.error('Error fetching roles:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch roles',
      message: error.message 
    });
  }
});

// Create new role
router.post('/roles', async (req, res) => {
  try {
    const { name, description, permissions = [] } = req.body;

    if (!name) {
      res.status(400).json({ 
        success: false, 
        error: 'Role name is required' 
      });
      return;
    }

    const roleId = await withTransaction(async (client: any) => {
      // Create role
      const roleResult = await client.query(`
        INSERT INTO roles (name, description, created_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        RETURNING id
      `, [name, description]);

      const newRoleId = roleResult.rows[0].id;

      // Assign permissions
      for (const permissionId of permissions) {
        await client.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
          [newRoleId, permissionId]
        );
      }

      return newRoleId;
    });

    logger.info(`Role created: ${name} (ID: ${roleId})`);

    res.status(201).json({
      success: true,
      data: { id: roleId, name }
    });
  } catch (error: any) {
    logger.error('Error creating role:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create role',
      message: error.message 
    });
  }
});

// Update role
router.put('/roles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    await withTransaction(async (client: any) => {
      // Update role
      await client.query(`
        UPDATE roles 
        SET 
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [name, description, id]);

      // Update permissions if provided
      if (permissions && Array.isArray(permissions)) {
        // Remove existing permissions
        await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
        
        // Add new permissions
        for (const permissionId of permissions) {
          await client.query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
            [id, permissionId]
          );
        }
      }
    });

    logger.info(`Role updated: ID ${id}`);

    res.json({
      success: true,
      message: 'Role updated successfully'
    });
  } catch (error: any) {
    logger.error('Error updating role:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update role',
      message: error.message 
    });
  }
});

// Delete role
router.delete('/roles/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if role is in use
    const usageCheck = await query(
      'SELECT COUNT(*) as count FROM user_roles WHERE role_id = $1',
      [id]
    );

    if (usageCheck.rows[0].count > 0) {
      res.status(400).json({ 
        success: false, 
        error: 'Cannot delete role that is assigned to users' 
      });
      return;
    }

    await withTransaction(async (client: any) => {
      // Remove permissions
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
      // Delete role
      await client.query('DELETE FROM roles WHERE id = $1', [id]);
    });

    logger.info(`Role deleted: ID ${id}`);

    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting role:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete role',
      message: error.message 
    });
  }
});

// =====================================================
// DEPARTMENTS
// =====================================================

// Get all departments
router.get('/departments/list', async (_req, res) => {
  try {
    const result = await query(`
      SELECT 
        department,
        COUNT(*) as user_count,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
      FROM users
      WHERE department IS NOT NULL
      GROUP BY department
      ORDER BY department
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    logger.error('Error fetching departments:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch departments',
      message: error.message 
    });
  }
});

// =====================================================
// PERMISSIONS
// =====================================================

// Get all permissions
router.get('/permissions/list', async (_req, res) => {
  try {
    const result = await query(`
      SELECT 
        p.*,
        COUNT(DISTINCT rp.role_id) as role_count
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      GROUP BY p.id
      ORDER BY p.resource, p.action
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    logger.error('Error fetching permissions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch permissions',
      message: error.message 
    });
  }
});

// Get permission matrix
router.get('/permissions/matrix', async (_req, res) => {
  try {
    const result = await query(`
      SELECT 
        r.id as role_id,
        r.name as role_name,
        p.id as permission_id,
        p.name as permission_name,
        p.resource,
        p.action,
        CASE WHEN rp.role_id IS NOT NULL THEN true ELSE false END as granted
      FROM roles r
      CROSS JOIN permissions p
      LEFT JOIN role_permissions rp ON r.id = rp.role_id AND p.id = rp.permission_id
      ORDER BY r.name, p.resource, p.action
    `);

    // Transform into matrix format
    const matrix: any = {};
    const permissions: any[] = [];
    const roles: any[] = [];

    result.rows.forEach(row => {
      if (!matrix[row.role_id]) {
        matrix[row.role_id] = {};
        roles.push({ id: row.role_id, name: row.role_name });
      }
      
      if (!permissions.find(p => p.id === row.permission_id)) {
        permissions.push({
          id: row.permission_id,
          name: row.permission_name,
          resource: row.resource,
          action: row.action
        });
      }
      
      matrix[row.role_id][row.permission_id] = row.granted;
    });

    res.json({
      success: true,
      data: {
        roles: [...new Map(roles.map(r => [r.id, r])).values()],
        permissions,
        matrix
      }
    });
  } catch (error: any) {
    logger.error('Error fetching permission matrix:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch permission matrix',
      message: error.message 
    });
  }
});

export default router;