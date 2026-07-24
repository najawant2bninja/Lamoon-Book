const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use('/:userId', authenticate, (req, res, next) => {
  if (req.user.role === 'admin' || String(req.user.id) === String(req.params.userId)) return next();
  return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์เข้าถึงที่อยู่นี้' });
});

router.get('/:userId', async (req, res) => {
  try {
    const [items] = await pool.query(
      `SELECT address_id AS id, recipient_name AS receiver, phone, address_detail AS detail,
              is_default AS isDefault
       FROM shipping_addresses WHERE user_id = ? ORDER BY is_default DESC, address_id DESC`,
      [req.params.userId]
    );
    res.json({ ok: true, items: items.map(item => ({ ...item, id: String(item.id), name: item.isDefault ? 'ที่อยู่หลัก' : 'ที่อยู่จัดส่ง' })) });
  } catch (error) { res.status(500).json({ ok: false, message: 'Failed to fetch addresses', error: error.message }); }
});

router.post('/:userId', async (req, res) => {
  const { receiver, phone, detail, isDefault = false } = req.body;
  if (!receiver || !phone || !detail) return res.status(400).json({ ok: false, message: 'receiver, phone, and detail are required' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (isDefault) await conn.query('UPDATE shipping_addresses SET is_default = FALSE WHERE user_id = ?', [req.params.userId]);
    const [result] = await conn.query(
      'INSERT INTO shipping_addresses (user_id, recipient_name, phone, address_detail, is_default) VALUES (?, ?, ?, ?, ?)',
      [req.params.userId, receiver, phone, detail, Boolean(isDefault)]
    );
    await conn.commit();
    res.status(201).json({ ok: true, item: { id: String(result.insertId), name: isDefault ? 'ที่อยู่หลัก' : 'ที่อยู่จัดส่ง', receiver, phone, detail, isDefault: Boolean(isDefault) } });
  } catch (error) { await conn.rollback(); res.status(500).json({ ok: false, message: 'Failed to create address', error: error.message }); }
  finally { conn.release(); }
});

router.delete('/:userId/:addressId', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [addresses] = await conn.query(
      `SELECT address_id
       FROM shipping_addresses
       WHERE address_id = ? AND user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [req.params.addressId, req.params.userId]
    );
    if (!addresses.length) {
      await conn.rollback();
      return res.status(404).json({ ok: false, message: 'Address not found' });
    }

    const [orders] = await conn.query(
      'SELECT order_id FROM orders WHERE address_id = ? LIMIT 1',
      [req.params.addressId]
    );
    if (orders.length) {
      await conn.rollback();
      return res.status(409).json({
        ok: false,
        message: 'This address is used by an order and must be kept in order history',
      });
    }

    await conn.query(
      'DELETE FROM shipping_addresses WHERE address_id = ? AND user_id = ?',
      [req.params.addressId, req.params.userId]
    );
    await conn.commit();
    return res.json({ ok: true });
  } catch (error) {
    if (conn) {
      try { await conn.rollback(); } catch (rollbackError) { console.error(rollbackError); }
    }
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || Number(error.errno) === 1451) {
      return res.status(409).json({
        ok: false,
        message: 'This address is used by an order and must be kept in order history',
      });
    }
    return res.status(500).json({ ok: false, message: 'Failed to delete address', error: error.message });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
