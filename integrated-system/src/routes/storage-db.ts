import { Router } from 'express';
import { query, withTransaction } from '../database/connection';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All storage routes require authentication
router.use(authMiddleware);

// Get all storage zones with utilization
router.get('/zones', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        sz.*,
        COUNT(DISTINCT sb.id) as box_count,
        COUNT(DISTINCT d.id) as docket_count,
        ROUND((sz.used_capacity::numeric / sz.total_capacity::numeric * 100), 2) as utilization_percentage
      FROM storage_zones sz
      LEFT JOIN storage_boxes sb ON sz.id = sb.zone_id
      LEFT JOIN dockets d ON sb.id = d.storage_box_id
      WHERE sz.is_active = true
      GROUP BY sz.id
      ORDER BY sz.zone_code
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Error fetching storage zones:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch storage zones',
      message: error.message 
    });
  }
});

// Get storage boxes with filters
router.get('/boxes', async (req, res) => {
  try {
    const { zone_id, client_id, status } = req.query;
    let conditions = ['1=1'];
    let params: any[] = [];
    let paramIndex = 1;

    if (zone_id) {
      conditions.push(`sb.zone_id = $${paramIndex++}`);
      params.push(zone_id);
    }
    if (client_id) {
      conditions.push(`sb.client_id = $${paramIndex++}`);
      params.push(client_id);
    }
    if (status) {
      conditions.push(`sb.status = $${paramIndex++}`);
      params.push(status);
    }

    const result = await query(`
      SELECT 
        sb.*,
        c.name as client_name,
        sz.zone_name,
        sz.zone_code,
        COUNT(d.id) as docket_count
      FROM storage_boxes sb
      LEFT JOIN clients c ON sb.client_id = c.id
      LEFT JOIN storage_zones sz ON sb.zone_id = sz.id
      LEFT JOIN dockets d ON sb.id = d.storage_box_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY sb.id, c.name, sz.zone_name, sz.zone_code
      ORDER BY sb.box_code
    `, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Error fetching storage boxes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch storage boxes',
      message: error.message 
    });
  }
});

// Create new storage box
router.post('/boxes', async (req, res) => {
  try {
    const { client_id, zone_id, capacity, box_type } = req.body;

    // Generate box code
    const countResult = await query('SELECT COUNT(*) as count FROM storage_boxes');
    const boxNumber = (parseInt(countResult.rows[0].count) + 1).toString().padStart(4, '0');
    const boxCode = `BOX-${new Date().getFullYear()}-${boxNumber}`;

    const result = await query(`
      INSERT INTO storage_boxes (
        box_code, zone_id, client_id, capacity, box_type, status, monthly_rate
      ) VALUES ($1, $2, $3, $4, $5, 'active', 40.00)
      RETURNING *
    `, [boxCode, zone_id, client_id, capacity || 100, box_type || 'standard']);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error creating storage box:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create storage box',
      message: error.message 
    });
  }
});

// Get retrieval requests
router.get('/requests/retrieval', async (req, res) => {
  try {
    const { status, client_id } = req.query;
    let conditions = ['1=1'];
    let params: any[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`rr.status = $${paramIndex++}`);
      params.push(status);
    }
    if (client_id) {
      conditions.push(`rr.client_id = $${paramIndex++}`);
      params.push(client_id);
    }

    const result = await query(`
      SELECT 
        rr.*,
        c.name as client_name,
        u.full_name as requested_by_name,
        COUNT(rri.id) as item_count
      FROM retrieval_requests rr
      LEFT JOIN clients c ON rr.client_id = c.id
      LEFT JOIN users u ON rr.requested_by = u.id
      LEFT JOIN retrieval_request_items rri ON rr.id = rri.request_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY rr.id, c.name, u.full_name
      ORDER BY rr.created_at DESC
    `, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Error fetching retrieval requests:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch retrieval requests',
      message: error.message 
    });
  }
});

// Create retrieval request
router.post('/requests/retrieval', async (req, res) => {
  try {
    const { client_id, docket_ids, urgency, notes } = req.body;
    const user = (req as any).user; // From auth middleware

    const result = await withTransaction(async (client) => {
      // Generate request number
      const countResult = await client.query('SELECT COUNT(*) as count FROM retrieval_requests');
      const requestNumber = `REQ-${new Date().getFullYear()}-${(parseInt(countResult.rows[0].count) + 1).toString().padStart(4, '0')}`;

      // Calculate fee
      const fee = urgency === 'urgent' ? 50.00 * docket_ids.length : 0;

      // Create request
      const requestResult = await client.query(`
        INSERT INTO retrieval_requests (
          request_number, client_id, requested_by, urgency, status, 
          total_items, retrieval_fee, notes, completion_deadline
        ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, NOW() + INTERVAL '${urgency === 'urgent' ? '30 minutes' : '2 hours'}')
        RETURNING *
      `, [requestNumber, client_id, user?.id || 1, urgency || 'normal', docket_ids.length, fee, notes]);

      const request = requestResult.rows[0];

      // Add request items
      for (const docket_id of docket_ids) {
        await client.query(`
          INSERT INTO retrieval_request_items (request_id, docket_id, status)
          VALUES ($1, $2, 'pending')
        `, [request.id, docket_id]);
      }

      return request;
    });

    res.status(201).json({
      success: true,
      data: result,
      message: `Retrieval request created. ${urgency === 'urgent' ? 'Will be ready in 30 minutes.' : 'Will be ready in 2 hours.'}`
    });
  } catch (error: any) {
    console.error('Error creating retrieval request:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create retrieval request',
      message: error.message 
    });
  }
});

// Get storage statistics
router.get('/statistics', async (req, res) => {
  try {
    // Get overall statistics
    const stats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM storage_boxes) as total_boxes,
        (SELECT COUNT(*) FROM storage_boxes WHERE status = 'active') as active_boxes,
        (SELECT COUNT(*) FROM storage_boxes WHERE status = 'full') as full_boxes,
        (SELECT COUNT(*) FROM dockets WHERE status = 'active') as total_dockets,
        (SELECT COUNT(DISTINCT client_id) FROM storage_boxes) as total_clients,
        (SELECT SUM(monthly_rate) FROM storage_boxes WHERE status = 'active') as monthly_revenue
    `);

    // Get zone utilization
    const zones = await query(`
      SELECT 
        zone_name,
        ROUND((used_capacity::numeric / total_capacity::numeric * 100), 2) as utilization
      FROM storage_zones
      WHERE is_active = true
      ORDER BY zone_code
    `);

    // Get recent activity
    const activity = await query(`
      SELECT 
        dm.movement_timestamp,
        dm.movement_type,
        d.docket_code,
        u.full_name as performed_by
      FROM docket_movements dm
      JOIN dockets d ON dm.docket_id = d.id
      LEFT JOIN users u ON dm.performed_by = u.id
      ORDER BY dm.movement_timestamp DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        summary: stats.rows[0],
        zones: zones.rows,
        recentActivity: activity.rows
      }
    });
  } catch (error: any) {
    console.error('Error fetching storage statistics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch storage statistics',
      message: error.message 
    });
  }
});

// Add docket to box
router.post('/boxes/:boxId/dockets', async (req, res) => {
  try {
    const { boxId } = req.params;
    const { docket_id } = req.body;
    const user = (req as any).user;

    const result = await withTransaction(async (client) => {
      // Get box details
      const boxResult = await client.query('SELECT * FROM storage_boxes WHERE id = $1', [boxId]);
      if (boxResult.rows.length === 0) {
        throw new Error('Storage box not found');
      }
      const box = boxResult.rows[0];

      // Check capacity
      if (box.occupied >= box.capacity) {
        throw new Error('Storage box is full');
      }

      // Update docket
      await client.query(`
        UPDATE dockets 
        SET storage_box_id = $1, current_location = $2, updated_at = NOW()
        WHERE id = $3
      `, [boxId, `Box ${box.box_code}`, docket_id]);

      // Update box occupied count
      await client.query(`
        UPDATE storage_boxes 
        SET occupied = occupied + 1, updated_at = NOW()
        WHERE id = $1
      `, [boxId]);

      // Record movement
      await client.query(`
        INSERT INTO docket_movements (
          docket_id, to_location, to_box_id, movement_type, 
          movement_reason, performed_by
        ) VALUES ($1, $2, $3, 'check-in', 'Added to storage box', $4)
      `, [docket_id, `Box ${box.box_code}`, boxId, user?.id || 1]);

      return { success: true };
    });

    res.json({
      success: true,
      message: 'Docket added to storage box successfully'
    });
  } catch (error: any) {
    console.error('Error adding docket to box:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to add docket to box'
    });
  }
});

export default router;