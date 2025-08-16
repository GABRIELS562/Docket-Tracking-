"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DatabaseService_1 = require("../services/DatabaseService");
const router = (0, express_1.Router)();
const db = DatabaseService_1.DatabaseService.getInstance();
router.get('/objects', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            res.status(400).json({
                success: false,
                error: 'Search query must be at least 2 characters'
            });
            return;
        }
        const result = await db.query(`
      SELECT o.*, 
             l.location_name,
             p.first_name || ' ' || p.last_name as assigned_to_name,
             ts_rank(to_tsvector('english', o.name || ' ' || COALESCE(o.description, '')), 
                    plainto_tsquery('english', $1)) as rank
      FROM objects o
      LEFT JOIN locations l ON o.current_location_id = l.id
      LEFT JOIN personnel p ON o.assigned_to_id = p.id
      WHERE to_tsvector('english', o.name || ' ' || COALESCE(o.description, '')) 
            @@ plainto_tsquery('english', $1)
         OR o.object_code ILIKE $2
         OR o.rfid_tag_id ILIKE $2
      ORDER BY rank DESC, o.created_at DESC
      LIMIT 50
    `, [q, `%${q}%`]);
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        console.error('Error searching objects:', error);
        res.status(500).json({ success: false, error: 'Failed to search objects' });
    }
});
exports.default = router;
//# sourceMappingURL=search.js.map