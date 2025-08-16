import { Request, Response } from 'express';
import { query } from '../utils/database';
import { asyncHandler } from '../middleware/errorHandler';

export const getObjects = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    search,
    object_type,
    category,
    status,
    location_id,
    assigned_to_id,
    priority_level,
    page = 1,
    limit = 20,
    sort = 'created_at',
    order = 'desc'
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);
  
  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramCount = 0;

  // Build dynamic WHERE clause
  if (search) {
    paramCount++;
    whereClause += ` AND (
      name ILIKE $${paramCount} OR 
      description ILIKE $${paramCount} OR 
      object_code ILIKE $${paramCount}
    )`;
    params.push(`%${search}%`);
  }

  if (object_type) {
    paramCount++;
    whereClause += ` AND object_type = $${paramCount}`;
    params.push(object_type);
  }

  if (category) {
    paramCount++;
    whereClause += ` AND category = $${paramCount}`;
    params.push(category);
  }

  if (status) {
    paramCount++;
    whereClause += ` AND status = $${paramCount}`;
    params.push(status);
  }

  if (location_id) {
    paramCount++;
    whereClause += ` AND current_location_id = $${paramCount}`;
    params.push(location_id);
  }

  if (assigned_to_id) {
    paramCount++;
    whereClause += ` AND assigned_to_id = $${paramCount}`;
    params.push(assigned_to_id);
  }

  if (priority_level) {
    paramCount++;
    whereClause += ` AND priority_level = $${paramCount}`;
    params.push(priority_level);
  }

  // Validate sort column
  const validSortColumns = ['name', 'object_code', 'object_type', 'status', 'created_at', 'updated_at'];
  const sortColumn = validSortColumns.includes(sort as string) ? sort : 'created_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM objects ${whereClause}`;
  const countResult = await query(countQuery, params);
  const total = parseInt(countResult.rows[0].total);

  // Get objects with pagination
  paramCount++;
  params.push(Number(limit));
  paramCount++;
  params.push(offset);

  const objectsQuery = `
    SELECT 
      o.*,
      l.location_name,
      p.first_name || ' ' || p.last_name as assigned_to_name,
      creator.first_name || ' ' || creator.last_name as created_by_name
    FROM objects o
    LEFT JOIN locations l ON o.current_location_id = l.id
    LEFT JOIN personnel p ON o.assigned_to_id = p.id
    LEFT JOIN personnel creator ON o.created_by_id = creator.id
    ${whereClause}
    ORDER BY o.${sortColumn} ${sortOrder}
    LIMIT $${paramCount - 1} OFFSET $${paramCount}
  `;

  const objectsResult = await query(objectsQuery, params);

  res.json({
    success: true,
    data: objectsResult.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
});

export const getObjectById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const result = await query(`
    SELECT 
      o.*,
      l.location_name,
      l.location_code,
      p.first_name || ' ' || p.last_name as assigned_to_name,
      creator.first_name || ' ' || creator.last_name as created_by_name
    FROM objects o
    LEFT JOIN locations l ON o.current_location_id = l.id
    LEFT JOIN personnel p ON o.assigned_to_id = p.id
    LEFT JOIN personnel creator ON o.created_by_id = creator.id
    WHERE o.id = $1
  `, [id]);

  if (result.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Object not found'
    });
    return;
  }

  res.json({
    success: true,
    data: result.rows[0]
  });
});

export const createObject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    object_code,
    name,
    description,
    object_type,
    category,
    priority_level = 'normal',
    status = 'active',
    rfid_tag_id,
    current_location_id,
    assigned_to_id,
    metadata = {}
  } = req.body;

  // Validate required fields
  if (!object_code || !name || !object_type) {
    res.status(400).json({
      success: false,
      error: 'object_code, name, and object_type are required'
    });
    return;
  }

  // Validate object_type
  const validTypes = ['docket', 'evidence', 'equipment', 'file', 'tool'];
  if (!validTypes.includes(object_type)) {
    res.status(400).json({
      success: false,
      error: `object_type must be one of: ${validTypes.join(', ')}`
    });
    return;
  }

  const result = await query(`
    INSERT INTO objects (
      object_code, name, description, object_type, category, priority_level,
      status, rfid_tag_id, current_location_id, assigned_to_id, metadata, created_by_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `, [
    object_code, name, description, object_type, category, priority_level,
    status, rfid_tag_id, current_location_id, assigned_to_id, 
    JSON.stringify(metadata), req.user?.id
  ]);

  // Log audit trail
  if (req.user) {
    await query(`
      INSERT INTO audit_logs (object_id, personnel_id, action, notes, session_id)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      result.rows[0].id,
      req.user.id,
      'object_created',
      `Created ${object_type}: ${name}`,
      req.headers['x-session-id'] || null
    ]);
  }

  res.status(201).json({
    success: true,
    data: result.rows[0],
    message: 'Object created successfully'
  });
});

export const updateObject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const {
    name,
    description,
    category,
    priority_level,
    status,
    rfid_tag_id,
    current_location_id,
    assigned_to_id,
    metadata
  } = req.body;

  // Get current object for audit trail
  const currentResult = await query('SELECT * FROM objects WHERE id = $1', [id]);
  if (currentResult.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Object not found'
    });
    return;
  }

  const currentObject = currentResult.rows[0];

  const result = await query(`
    UPDATE objects SET
      name = COALESCE($1, name),
      description = COALESCE($2, description),
      category = COALESCE($3, category),
      priority_level = COALESCE($4, priority_level),
      status = COALESCE($5, status),
      rfid_tag_id = COALESCE($6, rfid_tag_id),
      current_location_id = COALESCE($7, current_location_id),
      assigned_to_id = COALESCE($8, assigned_to_id),
      metadata = COALESCE($9, metadata),
      updated_at = NOW()
    WHERE id = $10
    RETURNING *
  `, [
    name, description, category, priority_level, status,
    rfid_tag_id, current_location_id, assigned_to_id,
    metadata ? JSON.stringify(metadata) : undefined, id
  ]);

  // Log audit trail for location changes
  if (current_location_id && current_location_id !== currentObject.current_location_id) {
    await query(`
      INSERT INTO audit_logs (
        object_id, personnel_id, action, old_location_id, new_location_id,
        notes, session_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      id, req.user?.id, 'location_changed',
      currentObject.current_location_id, current_location_id,
      `Object moved from location ${currentObject.current_location_id} to ${current_location_id}`,
      req.headers['x-session-id'] || null
    ]);
  }

  // Log assignment changes
  if (assigned_to_id && assigned_to_id !== currentObject.assigned_to_id) {
    await query(`
      INSERT INTO audit_logs (
        object_id, personnel_id, action, old_assigned_to_id, new_assigned_to_id,
        notes, session_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      id, req.user?.id, 'assignment_changed',
      currentObject.assigned_to_id, assigned_to_id,
      `Object reassigned from ${currentObject.assigned_to_id} to ${assigned_to_id}`,
      req.headers['x-session-id'] || null
    ]);
  }

  res.json({
    success: true,
    data: result.rows[0],
    message: 'Object updated successfully'
  });
});

export const deleteObject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  // Check if object exists
  const existingResult = await query('SELECT * FROM objects WHERE id = $1', [id]);
  if (existingResult.rows.length === 0) {
    res.status(404).json({
      success: false,
      error: 'Object not found'
    });
    return;
  }

  const object = existingResult.rows[0];

  // Archive instead of delete for audit purposes
  await query(`
    UPDATE objects SET 
      status = 'archived',
      updated_at = NOW()
    WHERE id = $1
  `, [id]);

  // Log audit trail
  if (req.user) {
    await query(`
      INSERT INTO audit_logs (object_id, personnel_id, action, notes, session_id)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      id, req.user.id, 'object_archived',
      `Archived ${object.object_type}: ${object.name}`,
      req.headers['x-session-id'] || null
    ]);
  }

  res.json({
    success: true,
    message: 'Object archived successfully'
  });
});

export const getObjectHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const result = await query(`
    SELECT 
      al.*,
      p.first_name || ' ' || p.last_name as personnel_name,
      old_loc.location_name as old_location_name,
      new_loc.location_name as new_location_name,
      old_person.first_name || ' ' || old_person.last_name as old_assigned_name,
      new_person.first_name || ' ' || new_person.last_name as new_assigned_name
    FROM audit_logs al
    LEFT JOIN personnel p ON al.personnel_id = p.id
    LEFT JOIN locations old_loc ON al.old_location_id = old_loc.id
    LEFT JOIN locations new_loc ON al.new_location_id = new_loc.id
    LEFT JOIN personnel old_person ON al.old_assigned_to_id = old_person.id
    LEFT JOIN personnel new_person ON al.new_assigned_to_id = new_person.id
    WHERE al.object_id = $1
    ORDER BY al.timestamp DESC
  `, [id]);

  res.json({
    success: true,
    data: result.rows
  });
});