const express = require('express');
const pool = require('../config/db');
const { hashPassword } = require('../utils/password');

const router = express.Router();

router.get('/dashboard', async (req, res) => {
  try {
    const [productCount] = await pool.query('SELECT COUNT(*) AS count FROM books');
    const [userCount] = await pool.query('SELECT COUNT(*) AS count FROM users');
    const [orderCount] = await pool.query('SELECT COUNT(*) AS count FROM orders');

    res.json({
      ok: true,
      stats: {
        products: productCount[0].count,
        users: userCount[0].count,
        orders: orderCount[0].count,
      },
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to load admin dashboard', error: error.message });
  }
});

router.get('/staff', async (req, res) => {
  try {
    const [items] = await pool.query("SELECT user_id AS id, full_name AS name, email, phone FROM users WHERE role = 'staff' ORDER BY user_id DESC");
    res.json({ ok: true, items: items.map(item => ({ ...item, id: String(item.id), position: 'พนักงาน', status: 'active' })) });
  } catch (error) { res.status(500).json({ ok: false, message: 'Failed to fetch staff', error: error.message }); }
});

router.post('/staff', async (req, res) => {
  const { name, email, phone, password = '123456' } = req.body;
  if (!name || !email) return res.status(400).json({ ok: false, message: 'name and email are required' });
  try {
    const username = email.split('@')[0];
    const passwordHash = await hashPassword(password);
    const [result] = await pool.query("INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES (?, ?, ?, ?, ?, 'staff')", [username, email, passwordHash, name, phone || null]);
    res.status(201).json({ ok: true, id: String(result.insertId) });
  } catch (error) { res.status(500).json({ ok: false, message: 'Failed to create staff', error: error.message }); }
});

router.delete('/staff/:id', async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM users WHERE user_id = ? AND role = 'staff'", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ ok: false, message: 'Staff not found' });
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ ok: false, message: 'Failed to delete staff', error: error.message }); }
});

module.exports = router;
