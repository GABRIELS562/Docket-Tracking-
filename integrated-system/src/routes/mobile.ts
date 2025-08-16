/**
 * Mobile API Routes
 * Endpoints for mobile field operations
 */

import { Router, Request, Response } from 'express';
import { query } from '../database/connection';
import { authMiddleware } from '../middleware/auth';
import { auditMiddleware } from '../middleware/auditMiddleware';
import { logger } from '../utils/logger';

const router = Router();

// Apply authentication to all mobile routes
router.use(authMiddleware);

/**
 * Get pending tasks for mobile user
 */
router.get('/tasks/pending', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    const result = await query(`
      SELECT 
        rr.id,
        rr.request_number as taskId,
        'retrieval' as type,
        CONCAT('Retrieve: ', d.title) as title,
        rr.priority,
        rr.needed_by as dueTime,
        rr.reason as description,
        d.docket_code,
        d.rfid_tag,
        d.location,
        rr.status
      FROM retrieval_requests rr
      JOIN dockets d ON rr.docket_id = d.id
      WHERE rr.status = 'pending'
        AND (rr.requested_by = $1 OR rr.department_id IN (
          SELECT department_id FROM user_departments WHERE user_id = $1
        ))
      ORDER BY 
        CASE rr.priority 
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
        END,
        rr.needed_by ASC
      LIMIT 20
    `, [userId]);

    res.json({
      success: true,
      data: result.rows.map(task => ({
        ...task,
        status: task.status === 'pending' ? 'pending' : 
                 task.status === 'in_progress' ? 'in_progress' : 
                 'completed'
      }))
    });
  } catch (error) {
    logger.error('Failed to fetch mobile tasks:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch tasks' 
    });
  }
});

/**
 * Update task status
 */
router.put('/tasks/:taskId/status', auditMiddleware, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { status, notes } = req.body;
    const userId = (req as any).user?.id;

    await query(`
      UPDATE retrieval_requests
      SET 
        status = $1,
        fulfilled_by = CASE WHEN $1 = 'completed' THEN $2 ELSE fulfilled_by END,
        fulfilled_date = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE fulfilled_date END
      WHERE request_number = $3
    `, [status, userId, taskId]);

    res.json({
      success: true,
      message: 'Task status updated'
    });
  } catch (error) {
    logger.error('Failed to update task status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update task' 
    });
  }
});

/**
 * Quick scan endpoint for mobile devices
 */
router.post('/scan', auditMiddleware, async (req: Request, res: Response) => {
  try {
    const { tagId, location, action } = req.body;
    const userId = (req as any).user?.id;

    // Find docket by RFID tag
    const docketResult = await query(`
      SELECT id, docket_code, title, status, location as current_location
      FROM dockets
      WHERE rfid_tag = $1
    `, [tagId]);

    if (docketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Docket not found'
      });
    }

    const docket = docketResult.rows[0];

    // Update docket location if provided
    if (location && action === 'update_location') {
      await query(`
        UPDATE dockets
        SET location = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [location, docket.id]);
    }

    // Log RFID event
    await query(`
      INSERT INTO rfid_events (
        tag_id, event_type, location, data
      ) VALUES ($1, $2, $3, $4)
    `, [
      tagId,
      action || 'mobile_scan',
      typeof location === 'object' ? JSON.stringify(location) : location,
      JSON.stringify({ 
        docket_id: docket.id, 
        user_id: userId,
        mobile: true,
        timestamp: new Date()
      })
    ]);

    res.json({
      success: true,
      data: {
        docket,
        message: 'Scan recorded successfully'
      }
    });
  } catch (error) {
    logger.error('Mobile scan failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Scan failed' 
    });
  }
});

/**
 * Batch scan for multiple items
 */
router.post('/scan/batch', auditMiddleware, async (req: Request, res: Response) => {
  try {
    const { scans } = req.body;
    const userId = (req as any).user?.id;
    const results = [];

    for (const scan of scans) {
      try {
        // Find docket
        const docketResult = await query(`
          SELECT id, docket_code, title
          FROM dockets
          WHERE rfid_tag = $1
        `, [scan.tagId]);

        if (docketResult.rows.length > 0) {
          const docket = docketResult.rows[0];
          
          // Update location if provided
          if (scan.location) {
            await query(`
              UPDATE dockets
              SET location = $1, updated_at = CURRENT_TIMESTAMP
              WHERE id = $2
            `, [scan.location, docket.id]);
          }

          // Log event
          await query(`
            INSERT INTO rfid_events (
              tag_id, event_type, location, data
            ) VALUES ($1, $2, $3, $4)
          `, [
            scan.tagId,
            'batch_scan',
            scan.location,
            JSON.stringify({ 
              docket_id: docket.id,
              batch: true,
              mobile: true,
              user_id: userId
            })
          ]);

          results.push({
            tagId: scan.tagId,
            success: true,
            docket: docket
          });
        } else {
          results.push({
            tagId: scan.tagId,
            success: false,
            error: 'Docket not found'
          });
        }
      } catch (error) {
        results.push({
          tagId: scan.tagId,
          success: false,
          error: 'Processing failed'
        });
      }
    }

    res.json({
      success: true,
      data: {
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      }
    });
  } catch (error) {
    logger.error('Batch scan failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Batch scan failed' 
    });
  }
});

/**
 * Sync offline data
 */
router.post('/sync', auditMiddleware, async (req: Request, res: Response) => {
  try {
    const { scans, tasks, lastSync } = req.body;
    const userId = (req as any).user?.id;
    const syncResults = {
      scans: { processed: 0, successful: 0, failed: 0 },
      tasks: { processed: 0, successful: 0, failed: 0 },
      newData: []
    };

    // Process offline scans
    if (scans && scans.length > 0) {
      for (const scan of scans) {
        syncResults.scans.processed++;
        try {
          // Check if scan already exists (avoid duplicates)
          const existing = await query(`
            SELECT id FROM rfid_events
            WHERE tag_id = $1 
              AND timestamp = $2
              AND data->>'user_id' = $3
          `, [scan.tagId, scan.timestamp, userId.toString()]);

          if (existing.rows.length === 0) {
            await query(`
              INSERT INTO rfid_events (
                tag_id, event_type, location, timestamp, data
              ) VALUES ($1, $2, $3, $4, $5)
            `, [
              scan.tagId,
              scan.action || 'offline_scan',
              typeof scan.location === 'object' ? JSON.stringify(scan.location) : scan.location,
              scan.timestamp,
              JSON.stringify({ 
                offline_sync: true,
                user_id: userId,
                synced_at: new Date()
              })
            ]);
            syncResults.scans.successful++;
          } else {
            syncResults.scans.successful++; // Already synced
          }
        } catch (error) {
          syncResults.scans.failed++;
          logger.error('Failed to sync scan:', error);
        }
      }
    }

    // Process offline task updates
    if (tasks && tasks.length > 0) {
      for (const task of tasks) {
        syncResults.tasks.processed++;
        try {
          await query(`
            UPDATE retrieval_requests
            SET 
              status = $1,
              fulfilled_by = CASE WHEN $1 = 'completed' THEN $2 ELSE fulfilled_by END,
              fulfilled_date = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE fulfilled_date END
            WHERE request_number = $3
          `, [task.status, userId, task.id]);
          syncResults.tasks.successful++;
        } catch (error) {
          syncResults.tasks.failed++;
          logger.error('Failed to sync task:', error);
        }
      }
    }

    // Get new data since last sync
    if (lastSync) {
      const newTasks = await query(`
        SELECT * FROM retrieval_requests
        WHERE created_at > $1
          AND (requested_by = $2 OR department_id IN (
            SELECT department_id FROM user_departments WHERE user_id = $2
          ))
        ORDER BY created_at DESC
        LIMIT 50
      `, [lastSync, userId]);

      syncResults.newData = newTasks.rows;
    }

    res.json({
      success: true,
      data: {
        syncResults,
        syncTime: new Date(),
        message: 'Sync completed successfully'
      }
    });
  } catch (error) {
    logger.error('Sync failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Sync failed' 
    });
  }
});

/**
 * Get docket details by barcode
 */
router.get('/docket/barcode/:barcode', async (req: Request, res: Response) => {
  try {
    const { barcode } = req.params;

    const result = await query(`
      SELECT 
        d.*,
        dept.name as department_name,
        u.full_name as created_by_name,
        sb.box_code as storage_box_code
      FROM dockets d
      LEFT JOIN departments dept ON d.department_id = dept.id
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN storage_boxes sb ON d.location = sb.code
      WHERE d.barcode = $1
    `, [barcode]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Docket not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to fetch docket by barcode:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch docket' 
    });
  }
});

/**
 * Get location suggestions for autocomplete
 */
router.get('/locations/suggestions', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    let sql = `
      SELECT DISTINCT 
        code as value,
        name as label,
        'zone' as type
      FROM storage_zones
    `;
    
    const params = [];
    if (q) {
      sql += ` WHERE name ILIKE $1 OR code ILIKE $1`;
      params.push(`%${q}%`);
    }
    
    sql += ` 
      UNION
      SELECT DISTINCT
        box_code as value,
        CONCAT('Box ', box_code) as label,
        'box' as type
      FROM storage_boxes
    `;
    
    if (q) {
      sql += ` WHERE box_code ILIKE $${params.length + 1}`;
      params.push(`%${q}%`);
    }
    
    sql += ` LIMIT 20`;

    const result = await query(sql, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Failed to fetch location suggestions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch locations' 
    });
  }
});

/**
 * Get user's recent activity
 */
router.get('/activity/recent', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const result = await query(`
      SELECT 
        al.timestamp,
        al.action_type,
        al.resource_type,
        al.description,
        d.docket_code,
        d.title
      FROM audit_logs al
      LEFT JOIN dockets d ON al.resource_id::integer = d.id AND al.resource_type = 'docket'
      WHERE al.user_id = $1
      ORDER BY al.timestamp DESC
      LIMIT 20
    `, [userId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Failed to fetch recent activity:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch activity' 
    });
  }
});

/**
 * Mobile device registration
 */
router.post('/device/register', async (req: Request, res: Response) => {
  try {
    const { deviceId, deviceInfo, pushToken } = req.body;
    const userId = (req as any).user?.id;

    // Store device registration
    await query(`
      INSERT INTO mobile_devices (
        user_id, device_id, device_info, push_token, registered_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (device_id) 
      DO UPDATE SET 
        user_id = $1,
        device_info = $3,
        push_token = $4,
        last_seen = CURRENT_TIMESTAMP
    `, [userId, deviceId, JSON.stringify(deviceInfo), pushToken]);

    res.json({
      success: true,
      message: 'Device registered successfully'
    });
  } catch (error) {
    logger.error('Device registration failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Registration failed' 
    });
  }
});

/**
 * Get mobile app configuration
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = {
      syncInterval: 300000, // 5 minutes
      offlineLimit: 100, // Max offline records
      scanTimeout: 10000, // 10 seconds
      locationTracking: true,
      features: {
        batchScan: true,
        offlineMode: true,
        barcodeScan: true,
        locationUpdate: true,
        photoCapture: false
      },
      api: {
        version: '1.0.0',
        minVersion: '1.0.0'
      }
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Failed to fetch config:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch configuration' 
    });
  }
});

export default router;