const express = require('express');
const pool = require('../config/db');
const { hashPassword } = require('../utils/password');
const router = express.Router();

router.put('/:userId', async (req, res) => {
  const { name, phone, password } = req.body;
  try {
    const fields = ['full_name = ?', 'phone = ?'];
    const values = [name || null, phone || null];
    if (password) { fields.push('password_hash = ?'); values.push(await hashPassword(password)); }
    values.push(req.params.userId);
    const [result] = await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`, values);
    if (!result.affectedRows) return res.status(404).json({ ok: false, message: 'User not found' });
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ ok: false, message: 'Failed to update profile', error: error.message }); }
});

module.exports = router;
