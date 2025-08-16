import { Router } from 'express';
import { DatabaseService } from '../services/DatabaseService';

const router = Router();
const db = DatabaseService.getInstance();

router.get('/summary', async (_req, res) => {
  try {
    const objectCount = await db.query('SELECT COUNT(*) as total FROM objects');
    const locationCount = await db.query('SELECT COUNT(*) as total FROM locations WHERE active = true');
    const personnelCount = await db.query('SELECT COUNT(*) as total FROM personnel WHERE active = true');
    const recentEvents = await db.query(
      'SELECT COUNT(*) as total FROM rfid_events WHERE timestamp > NOW() - INTERVAL \'24 hours\''
    );

    res.json({
      success: true,
      data: {
        totalObjects: parseInt(objectCount.rows[0].total),
        totalLocations: parseInt(locationCount.rows[0].total),
        totalPersonnel: parseInt(personnelCount.rows[0].total),
        eventsLast24Hours: parseInt(recentEvents.rows[0].total),
        systemStatus: 'operational',
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch summary' });
  }
});

router.get('/dashboard', async (_req, res) => {
  try {
    const stats = await db.query(`
      WITH object_stats AS (
        SELECT 
          COUNT(*) as total_objects,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_objects,
          COUNT(CASE WHEN object_type = 'docket' THEN 1 END) as total_dockets,
          COUNT(CASE WHEN object_type = 'evidence' THEN 1 END) as total_evidence,
          COUNT(CASE WHEN object_type = 'equipment' THEN 1 END) as total_equipment,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as created_today,
          COUNT(CASE WHEN updated_at > NOW() - INTERVAL '24 hours' THEN 1 END) as updated_today
        FROM objects
      ),
      location_stats AS (
        SELECT COUNT(*) as total_locations FROM locations WHERE active = true
      ),
      personnel_stats AS (
        SELECT COUNT(*) as total_personnel FROM personnel WHERE active = true
      ),
      recent_events AS (
        SELECT COUNT(*) as events_last_hour 
        FROM rfid_events 
        WHERE timestamp > NOW() - INTERVAL '1 hour'
      ),
      active_alerts AS (
        SELECT COUNT(*) as unacknowledged_alerts
        FROM alerts
        WHERE acknowledged = false
      )
      SELECT * FROM object_stats, location_stats, personnel_stats, recent_events, active_alerts
    `);

    const recentMovements = await db.query(`
      SELECT 
        al.timestamp,
        o.object_code,
        o.name as object_name,
        old_loc.location_name as from_location,
        new_loc.location_name as to_location,
        p.first_name || ' ' || p.last_name as moved_by
      FROM audit_logs al
      JOIN objects o ON al.object_id = o.id
      LEFT JOIN locations old_loc ON al.old_location_id = old_loc.id
      LEFT JOIN locations new_loc ON al.new_location_id = new_loc.id
      LEFT JOIN personnel p ON al.personnel_id = p.id
      WHERE al.action = 'location_update'
        AND al.timestamp > NOW() - INTERVAL '24 hours'
      ORDER BY al.timestamp DESC
      LIMIT 10
    `);

    res.json({ 
      success: true, 
      data: {
        stats: stats.rows[0],
        recentMovements: recentMovements.rows
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
});

router.get('/objects', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    const params: any[] = [];

    if (start_date && end_date) {
      dateFilter = 'WHERE o.created_at BETWEEN $1 AND $2';
      params.push(start_date, end_date);
    }

    const byType = await db.query(`
      SELECT object_type, COUNT(*) as count
      FROM objects o
      ${dateFilter}
      GROUP BY object_type
      ORDER BY count DESC
    `, params);

    const byStatus = await db.query(`
      SELECT status, COUNT(*) as count
      FROM objects o
      ${dateFilter}
      GROUP BY status
      ORDER BY count DESC
    `, params);

    const byLocation = await db.query(`
      SELECT l.location_name, COUNT(o.id) as count
      FROM objects o
      JOIN locations l ON o.current_location_id = l.id
      ${dateFilter}
      GROUP BY l.location_name
      ORDER BY count DESC
      LIMIT 10
    `, params);

    res.json({ 
      success: true, 
      data: {
        byType: byType.rows,
        byStatus: byStatus.rows,
        byLocation: byLocation.rows
      }
    });
  } catch (error) {
    console.error('Error fetching object analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch object analytics' });
  }
});

export default router;