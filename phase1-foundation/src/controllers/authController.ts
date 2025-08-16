import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../utils/database';
import { AuthRequest, AuthResponse } from '../types';
import { asyncHandler } from '../middleware/errorHandler';

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password }: AuthRequest = req.body;

  // Validate input
  if (!email || !password) {
    res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
    return;
  }

  // Find user by email
  const userResult = await query(
    'SELECT * FROM personnel WHERE email = $1 AND active = true',
    [email]
  );

  if (userResult.rows.length === 0) {
    res.status(401).json({
      success: false,
      error: 'Invalid email or password'
    });
    return;
  }

  const user = userResult.rows[0];

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    res.status(401).json({
      success: false,
      error: 'Invalid email or password'
    });
    return;
  }

  // Update last login
  await query(
    'UPDATE personnel SET last_login = NOW() WHERE id = $1',
    [user.id]
  );

  // Generate JWT token
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  const tokenPayload = {
    id: user.id,
    employee_id: user.employee_id,
    email: user.email,
    role: user.role,
    security_clearance: user.security_clearance
  };

  const token = jwt.sign(tokenPayload, secret, { 
    expiresIn: process.env.JWT_EXPIRY || '24h' 
  } as jwt.SignOptions);

  // Remove password hash from response
  const { password_hash, ...userWithoutPassword } = user;

  const response: AuthResponse = {
    token,
    user: userWithoutPassword
  };

  res.json({
    success: true,
    data: response,
    message: 'Login successful'
  });
});

export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
      error: 'All required fields must be provided'
    });
    return;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({
      success: false,
      error: 'Invalid email format'
    });
    return;
  }

  // Validate password strength
  if (password.length < 6) {
    res.status(400).json({
      success: false,
      error: 'Password must be at least 6 characters long'
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
      error: 'User with this email or employee ID already exists'
    });
    return;
  }

  // Hash password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
  const password_hash = await bcrypt.hash(password, saltRounds);

  // Insert new user
  const newUserResult = await query(`
    INSERT INTO personnel (
      employee_id, first_name, last_name, email, password_hash, 
      department, role, security_clearance
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, employee_id, first_name, last_name, email, department, 
             role, security_clearance, active, created_at
  `, [
    employee_id, first_name, last_name, email, password_hash,
    department, role, security_clearance
  ]);

  const newUser = newUserResult.rows[0];

  res.status(201).json({
    success: true,
    data: newUser,
    message: 'User registered successfully'
  });
});

export const getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }

  // Get fresh user data from database
  const userResult = await query(
    'SELECT id, employee_id, first_name, last_name, email, department, role, security_clearance, rfid_badge_id, active, last_login, created_at, updated_at FROM personnel WHERE id = $1',
    [req.user.id]
  );

  if (userResult.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'User not found'
    });
    return;
  }

  res.json({
    success: true,
    data: userResult.rows[0]
  });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }

  const {
    first_name,
    last_name,
    department,
    rfid_badge_id
  } = req.body;

  // Update user profile (excluding sensitive fields like role, email, password)
  const updateResult = await query(`
    UPDATE personnel 
    SET first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        department = COALESCE($3, department),
        rfid_badge_id = COALESCE($4, rfid_badge_id),
        updated_at = NOW()
    WHERE id = $5
    RETURNING id, employee_id, first_name, last_name, email, department, 
             role, security_clearance, rfid_badge_id, active, updated_at
  `, [first_name, last_name, department, rfid_badge_id, req.user.id]);

  res.json({
    success: true,
    data: updateResult.rows[0],
    message: 'Profile updated successfully'
  });
});