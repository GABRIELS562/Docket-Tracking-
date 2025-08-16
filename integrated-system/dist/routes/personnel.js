"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DatabaseService_1 = require("../services/DatabaseService");
const router = (0, express_1.Router)();
const db = DatabaseService_1.DatabaseService.getInstance();
router.get('/', async (_req, res) => {
    try {
        const result = await db.query(`
      SELECT p.*, u.email as user_email, u.role as user_role
      FROM personnel p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.active = true
      ORDER BY p.last_name, p.first_name
    `);
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        console.error('Error fetching personnel:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch personnel' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(`
      SELECT p.*, u.email as user_email, u.role as user_role
      FROM personnel p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `, [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Personnel not found' });
            return;
        }
        res.json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        console.error('Error fetching personnel:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch personnel' });
    }
});
router.get('/:id/objects', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(`
      SELECT o.*, l.location_name
      FROM objects o
      LEFT JOIN locations l ON o.current_location_id = l.id
      WHERE o.assigned_to_id = $1 AND o.status = 'active'
      ORDER BY o.created_at DESC
    `, [id]);
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        console.error('Error fetching personnel objects:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch personnel objects' });
    }
});
router.post('/', async (req, res) => {
    try {
        const { user_id, employee_id, first_name, last_name, email, department, role, security_clearance, rfid_badge_id, phone } = req.body;
        const result = await db.query(`
      INSERT INTO personnel (
        user_id, employee_id, first_name, last_name, email,
        department, role, security_clearance, rfid_badge_id, phone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
            user_id, employee_id, first_name, last_name, email,
            department, role, security_clearance, rfid_badge_id, phone
        ]);
        res.status(201).json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        console.error('Error creating personnel:', error);
        res.status(500).json({ success: false, error: 'Failed to create personnel' });
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
      UPDATE personnel 
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `, values);
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Personnel not found' });
            return;
        }
        res.json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        console.error('Error updating personnel:', error);
        res.status(500).json({ success: false, error: 'Failed to update personnel' });
    }
});
exports.default = router;
//# sourceMappingURL=personnel.js.map