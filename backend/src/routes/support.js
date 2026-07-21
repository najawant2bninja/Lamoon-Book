const express = require('express');
const pool = require('../config/db');
const { authenticate, allowRoles } = require('../middleware/auth');
const router = express.Router();

router.post('/', async (req, res) => {
  const { userId, email, topic, message } = req.body;
  if (!email || !topic || !message) return res.status(400).json({ ok: false, message: 'email, topic, and message are required' });
  try {
    const [result] = await pool.query(
      'INSERT INTO support_tickets (user_id, email, topic, message) VALUES (?, ?, ?, ?)',
      [userId || null, email, topic, message]
    );
    res.status(201).json({ ok: true, ticketId: String(result.insertId), message: 'Support request received' });
  } catch (error) { res.status(500).json({ ok: false, message: 'Failed to submit support request', error: error.message }); }
});

router.get('/', authenticate, allowRoles('staff', 'admin'), async (req, res) => {
  try {
    const [items] = await pool.query('SELECT ticket_id AS id, user_id AS userId, email, topic, message, status, created_at AS createdAt FROM support_tickets ORDER BY created_at DESC');
    res.json({ ok: true, items });
  } catch (error) { res.status(500).json({ ok: false, message: 'Failed to fetch support requests', error: error.message }); }
});

module.exports = router;
