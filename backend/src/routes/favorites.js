const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use('/:userId', authenticate, (req, res, next) => {
  if (req.user.role === 'admin' || String(req.user.id) === String(req.params.userId)) return next();
  return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์เข้าถึงรายการโปรดนี้' });
});

router.get('/:userId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT f.favorite_id AS id, f.book_id AS productId, b.title, b.price, b.cover_image_url AS cover
       FROM favorites f
       JOIN books b ON b.book_id = f.book_id
       WHERE f.user_id = ?`,
      [req.params.userId]
    );

    res.json({ ok: true, items: rows });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to fetch favorites', error: error.message });
  }
});

router.post('/:userId/toggle', async (req, res) => {
  const { productId } = req.body;

  try {
    const [existing] = await pool.query(
      'SELECT favorite_id FROM favorites WHERE user_id = ? AND book_id = ?',
      [req.params.userId, productId]
    );

    if (existing.length) {
      await pool.query('DELETE FROM favorites WHERE favorite_id = ?', [existing[0].favorite_id]);
      return res.json({ ok: true, message: 'Removed from favorites', favorited: false });
    }

    await pool.query('INSERT INTO favorites (user_id, book_id) VALUES (?, ?)', [req.params.userId, productId]);
    res.status(201).json({ ok: true, message: 'Added to favorites', favorited: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to toggle favorite', error: error.message });
  }
});

module.exports = router;
