import express from 'express';
import { query } from '../utils/database';
import { logger } from '../utils/logger';

const router = express.Router();

// Get all evidence (with pagination and filtering)
router.get('/', async (req, res, next): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      type, 
      status = 'active',
      location_id,
      assigned_to_id 
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Build dynamic query
    let whereConditions = ['e.status = $1'];
    let params: any[] = [status];
    let paramCount = 1;

    if (search) {
      paramCount++;
      whereConditions.push(`(e.name ILIKE $${paramCount} OR e.evidence_code ILIKE $${paramCount} OR e.description ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }

    if (type) {
      paramCount++;
      whereConditions.push(`e.evidence_type = $${paramCount}`);
      params.push(type);
    }

    if (location_id) {
      paramCount++;
      whereConditions.push(`e.current_location_id = $${paramCount}`);
      params.push(location_id);
    }

    if (assigned_to_id) {
      paramCount++;
      whereConditions.push(`e.assigned_to_id = $${paramCount}`);
      params.push(assigned_to_id);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM evidence e
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Get evidence data
    const evidenceQuery = `
      SELECT 
        e.*,
        l.location_name,
        l.location_code,
        p.first_name || ' ' || p.last_name as assigned_to_name,
        p.employee_id as assigned_to_employee_id,
        c.first_name || ' ' || c.last_name as created_by_name
      FROM evidence e
      LEFT JOIN locations l ON e.current_location_id = l.id
      LEFT JOIN personnel p ON e.assigned_to_id = p.id
      LEFT JOIN personnel c ON e.created_by_id = c.id
      ${whereClause}
      ORDER BY e.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(Number(limit), offset);
    const evidenceResult = await query(evidenceQuery, params);

    res.json({
      success: true,
      data: {
        evidence: evidenceResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Get single evidence by ID
router.get('/:id', async (req, res, next): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        e.*,
        l.location_name,
        l.location_code,
        l.zone,
        l.building,
        l.floor,
        l.room,
        p.first_name || ' ' || p.last_name as assigned_to_name,
        p.employee_id as assigned_to_employee_id,
        p.email as assigned_to_email,
        c.first_name || ' ' || c.last_name as created_by_name,
        c.employee_id as created_by_employee_id
      FROM evidence e
      LEFT JOIN locations l ON e.current_location_id = l.id
      LEFT JOIN personnel p ON e.assigned_to_id = p.id
      LEFT JOIN personnel c ON e.created_by_id = c.id
      WHERE e.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'Evidence not found' }
      });
      return;
    }

    res.json({
      success: true,
      data: { evidence: result.rows[0] }
    });

  } catch (error) {
    next(error);
  }
});

// Create new evidence
router.post('/', async (req, res, next): Promise<void> => {
  try {
    const {
      evidence_code,
      name,
      description,
      evidence_type,
      priority_level = 'normal',
      rfid_tag_id,
      current_location_id,
      assigned_to_id,
      metadata = {}
    } = req.body;

    // Validate required fields
    if (!evidence_code || !name) {
      res.status(400).json({
        success: false,
        error: { message: 'Evidence code and name are required' }
      });
      return;
    }

    // For now, we'll use a placeholder for created_by_id
    // In a real app, this would come from the authenticated user
    const created_by_id = 1; // This should be req.user.id when auth is implemented

    const result = await query(`
      INSERT INTO evidence (
        evidence_code, name, description, evidence_type, priority_level,
        rfid_tag_id, current_location_id, assigned_to_id, metadata,
        created_by_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `, [
      evidence_code, name, description, evidence_type, priority_level,
      rfid_tag_id, current_location_id, assigned_to_id, JSON.stringify(metadata),
      created_by_id
    ]);

    logger.info(`New evidence created: ${evidence_code} - ${name}`);

    res.status(201).json({
      success: true,
      data: { evidence: result.rows[0] },
      message: 'Evidence created successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Update evidence
router.put('/:id', async (req, res, next): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      evidence_type,
      priority_level,
      status,
      rfid_tag_id,
      current_location_id,
      assigned_to_id,
      metadata
    } = req.body;

    // Check if evidence exists
    const existingEvidence = await query('SELECT id FROM evidence WHERE id = $1', [id]);
    
    if (existingEvidence.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'Evidence not found' }
      });
      return;
    }

    // Build dynamic update query
    const updates = [];
    const params = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      params.push(name);
    }

    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      params.push(description);
    }

    if (evidence_type !== undefined) {
      paramCount++;
      updates.push(`evidence_type = $${paramCount}`);
      params.push(evidence_type);
    }

    if (priority_level !== undefined) {
      paramCount++;
      updates.push(`priority_level = $${paramCount}`);
      params.push(priority_level);
    }

    if (status !== undefined) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      params.push(status);
    }

    if (rfid_tag_id !== undefined) {
      paramCount++;
      updates.push(`rfid_tag_id = $${paramCount}`);
      params.push(rfid_tag_id);
    }

    if (current_location_id !== undefined) {
      paramCount++;
      updates.push(`current_location_id = $${paramCount}`);
      params.push(current_location_id);
    }

    if (assigned_to_id !== undefined) {
      paramCount++;
      updates.push(`assigned_to_id = $${paramCount}`);
      params.push(assigned_to_id);
    }

    if (metadata !== undefined) {
      paramCount++;
      updates.push(`metadata = $${paramCount}`);
      params.push(JSON.stringify(metadata));
    }

    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        error: { message: 'No valid fields to update' }
      });
      return;
    }

    // Add updated_at
    paramCount++;
    updates.push(`updated_at = NOW()`);

    // Add WHERE clause parameter
    paramCount++;
    params.push(id);

    const updateQuery = `
      UPDATE evidence 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, params);

    logger.info(`Evidence updated: ${id}`);

    res.json({
      success: true,
      data: { evidence: result.rows[0] },
      message: 'Evidence updated successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Delete evidence (soft delete)
router.delete('/:id', async (req, res, next): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query(`
      UPDATE evidence 
      SET status = 'deleted', updated_at = NOW()
      WHERE id = $1 AND status != 'deleted'
      RETURNING id, evidence_code, name
    `, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'Evidence not found or already deleted' }
      });
      return;
    }

    logger.info(`Evidence deleted: ${result.rows[0].evidence_code} - ${result.rows[0].name}`);

    res.json({
      success: true,
      message: 'Evidence deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

export default router;