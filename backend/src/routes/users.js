const express = require('express');
const pool = require('../config/db');
const { hashPassword, verifyPassword } = require('../utils/password');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

function requireSelfOrAdmin(req, res, next) {
  if (req.user.role === 'admin' || String(req.user.id) === String(req.params.userId)) return next();
  return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์จัดการบัญชีผู้ใช้นี้' });
}

router.put('/:userId', authenticate, requireSelfOrAdmin, async (req, res) => {
  const { name, phone } = req.body;
  try {
    const fields = ['full_name = ?', 'phone = ?'];
    const values = [name || null, phone || null];
    values.push(req.params.userId);
    const [result] = await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`, values);
    if (!result.affectedRows) return res.status(404).json({ ok: false, message: 'User not found' });
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ ok: false, message: 'Failed to update profile', error: error.message }); }
});

router.post('/:userId/password', authenticate, requireSelfOrAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ ok: false, message: 'currentPassword and newPassword are required' });
  }

  if (String(newPassword).length < 8) {
    return res.status(400).json({ ok: false, message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' });
  }

  try {
    const [rows] = await pool.query('SELECT password_hash FROM users WHERE user_id = ? LIMIT 1', [req.params.userId]);
    const user = rows[0];

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    const validPassword = await verifyPassword(currentPassword, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ ok: false, message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
    }

    const passwordHash = await hashPassword(newPassword);
    await pool.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [passwordHash, req.params.userId]);

    res.json({ ok: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to change password', error: error.message });
  }
});

module.exports = router;
