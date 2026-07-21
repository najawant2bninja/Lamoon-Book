const express = require('express');
const pool = require('../config/db');
const { hashPassword } = require('../utils/password');
const { authenticate, allowRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, allowRoles('admin'));

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function staffItem(row) {
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    position: 'พนักงาน',
    status: Number(row.isActive) === 1 ? 'active' : 'inactive',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deactivatedAt: row.deactivatedAt,
  };
}

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
    const [items] = await pool.query(`
      SELECT user_id AS id, full_name AS name, email, phone,
             is_active AS isActive, created_at AS createdAt,
             updated_at AS updatedAt, deactivated_at AS deactivatedAt
      FROM users
      WHERE role = 'staff'
      ORDER BY is_active DESC, user_id DESC
    `);
    res.json({ ok: true, items: items.map(staffItem) });
  } catch (error) { res.status(500).json({ ok: false, message: 'Failed to fetch staff', error: error.message }); }
});

router.post('/staff', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = normalizeEmail(req.body.email);
  const phone = String(req.body.phone || '').trim();
  const password = String(req.body.password || '');
  if (!name || !email || !password) {
    return res.status(400).json({ ok: false, message: 'กรุณากรอกชื่อ อีเมล และรหัสผ่านให้ครบ' });
  }
  if (!validEmail(email)) {
    return res.status(400).json({ ok: false, message: 'รูปแบบอีเมลไม่ถูกต้อง' });
  }
  if (password.length < 8) {
    return res.status(400).json({ ok: false, message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' });
  }
  try {
    const username = email.split('@')[0];
    const passwordHash = await hashPassword(password);
    const [result] = await pool.query(`
      INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, 'staff', 1, ?)
    `, [username, email, passwordHash, name, phone || null, req.user.id]);
    const [rows] = await pool.query(`
      SELECT user_id AS id, full_name AS name, email, phone,
             is_active AS isActive, created_at AS createdAt,
             updated_at AS updatedAt, deactivated_at AS deactivatedAt
      FROM users WHERE user_id = ?
    `, [result.insertId]);
    res.status(201).json({ ok: true, item: staffItem(rows[0]), message: 'เพิ่มพนักงานเรียบร้อยแล้ว' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ ok: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }
    res.status(500).json({ ok: false, message: 'Failed to create staff', error: error.message });
  }
});

router.delete('/staff/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(`
      UPDATE users
      SET is_active = 0, deactivated_at = NOW()
      WHERE user_id = ? AND role = 'staff' AND is_active = 1
    `, [req.params.id]);
    if (!result.affectedRows) {
      await conn.rollback();
      return res.status(404).json({ ok: false, message: 'Staff not found or already inactive' });
    }
    await conn.query('DELETE FROM auth_sessions WHERE user_id = ?', [req.params.id]);
    await conn.commit();
    res.json({ ok: true, message: 'ปิดใช้งานบัญชีพนักงานแล้ว' });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ ok: false, message: 'Failed to deactivate staff', error: error.message });
  } finally {
    conn.release();
  }
});

router.patch('/staff/:id/status', async (req, res) => {
  const isActive = req.body.status === 'active' || req.body.isActive === true;
  try {
    const [result] = await pool.query(`
      UPDATE users
      SET is_active = ?, deactivated_at = CASE WHEN ? = 1 THEN NULL ELSE NOW() END
      WHERE user_id = ? AND role = 'staff'
    `, [isActive ? 1 : 0, isActive ? 1 : 0, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ ok: false, message: 'Staff not found' });
    if (!isActive) await pool.query('DELETE FROM auth_sessions WHERE user_id = ?', [req.params.id]);
    res.json({ ok: true, status: isActive ? 'active' : 'inactive' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to update staff status', error: error.message });
  }
});

router.patch('/staff/:id/password', async (req, res) => {
  const password = String(req.body.password || '');
  if (password.length < 8) {
    return res.status(400).json({ ok: false, message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' });
  }
  try {
    const passwordHash = await hashPassword(password);
    const [result] = await pool.query(`
      UPDATE users SET password_hash = ? WHERE user_id = ? AND role = 'staff'
    `, [passwordHash, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ ok: false, message: 'Staff not found' });
    await pool.query('DELETE FROM auth_sessions WHERE user_id = ?', [req.params.id]);
    res.json({ ok: true, message: 'ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to reset staff password', error: error.message });
  }
});

module.exports = router;
