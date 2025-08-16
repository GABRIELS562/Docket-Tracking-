import { Router } from 'express';
import { DatabaseService } from '../services/DatabaseService';

const router = Router();
const db = DatabaseService.getInstance();

router.get('/', async (_req, res) => {
  try {
    const result = await db.query(`
      SELECT l.*, 
             COUNT(DISTINCT o.id) as object_count,
             r.status as reader_status
      FROM locations l
      LEFT JOIN objects o ON o.current_location_id = l.id AND o.status = 'active'
      LEFT JOIN rfid_readers r ON r.location_id = l.id
      WHERE l.active = true
      GROUP BY l.id, r.status
      ORDER BY l.zone, l.location_name
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch locations' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT l.*, 
             COUNT(DISTINCT o.id) as object_count,
             r.status as reader_status,
             r.reader_id
      FROM locations l
      LEFT JOIN objects o ON o.current_location_id = l.id AND o.status = 'active'
      LEFT JOIN rfid_readers r ON r.location_id = l.id
      WHERE l.id = $1
      GROUP BY l.id, r.status, r.reader_id
    `, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Location not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch location' });
  }
});

router.get('/:id/objects', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT o.*, 
             p.first_name || ' ' || p.last_name as assigned_to_name
      FROM objects o
      LEFT JOIN personnel p ON o.assigned_to_id = p.id
      WHERE o.current_location_id = $1 AND o.status = 'active'
      ORDER BY o.created_at DESC
    `, [id]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching location objects:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch location objects' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      location_code,
      location_name,
      description,
      zone,
      building,
      floor,
      room,
      security_level,
      capacity
    } = req.body;

    const result = await db.query(`
      INSERT INTO locations (
        location_code, location_name, description, zone,
        building, floor, room, security_level, capacity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      location_code, location_name, description, zone,
      building, floor, room, security_level, capacity
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({ success: false, error: 'Failed to create location' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const values = [id, ...Object.values(updates)];

    const result = await db.query(`
      UPDATE locations 
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Location not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ success: false, error: 'Failed to update location' });
  }
});

export default router;