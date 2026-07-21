const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use('/:userId', authenticate, (req, res, next) => {
  if (req.user.role === 'admin' || String(req.user.id) === String(req.params.userId)) return next();
  return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์เข้าถึงตะกร้านี้' });
});

router.get('/:userId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ci.cart_item_id AS id, ci.book_id AS productId, b.title, b.price, ci.quantity
       FROM carts c
       JOIN cart_items ci ON ci.cart_id = c.cart_id
       JOIN books b ON b.book_id = ci.book_id
       WHERE c.user_id = ?`,
      [req.params.userId]
    );

    res.json({ ok: true, items: rows });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to fetch cart', error: error.message });
  }
});

router.post('/:userId/add', async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  try {
    const [cartRows] = await pool.query('SELECT cart_id FROM carts WHERE user_id = ? LIMIT 1', [req.params.userId]);
    let cartId;

    if (!cartRows.length) {
      const [createCart] = await pool.query('INSERT INTO carts (user_id) VALUES (?)', [req.params.userId]);
      cartId = createCart.insertId;
    } else {
      cartId = cartRows[0].cart_id;
    }

    const [existing] = await pool.query(
      'SELECT cart_item_id, quantity FROM cart_items WHERE cart_id = ? AND book_id = ?',
      [cartId, productId]
    );

    if (existing.length) {
      await pool.query(
        'UPDATE cart_items SET quantity = quantity + ? WHERE cart_item_id = ?',
        [quantity, existing[0].cart_item_id]
      );
    } else {
      await pool.query(
        'INSERT INTO cart_items (cart_id, book_id, quantity) VALUES (?, ?, ?)',
        [cartId, productId, quantity]
      );
    }

    res.status(201).json({ ok: true, message: 'Product added to cart' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to add cart item', error: error.message });
  }
});

router.put('/:userId/update', async (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || !Number.isFinite(Number(quantity))) {
    return res.status(400).json({ ok: false, message: 'Invalid cart update payload' });
  }

  try {
    const [cartRows] = await pool.query('SELECT cart_id FROM carts WHERE user_id = ? LIMIT 1', [req.params.userId]);
    if (!cartRows.length) {
      return res.status(404).json({ ok: false, message: 'Cart not found' });
    }

    const [existing] = await pool.query(
      'SELECT cart_item_id FROM cart_items WHERE cart_id = ? AND book_id = ? LIMIT 1',
      [cartRows[0].cart_id, productId]
    );

    if (!existing.length) {
      return res.status(404).json({ ok: false, message: 'Cart item not found' });
    }

    await pool.query(
      'UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?',
      [Math.max(1, Number(quantity)), existing[0].cart_item_id]
    );

    res.json({ ok: true, message: 'Cart updated' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to update cart item', error: error.message });
  }
});

router.delete('/:userId/remove/:productId', async (req, res) => {
  try {
    const [cartRows] = await pool.query('SELECT cart_id FROM carts WHERE user_id = ? LIMIT 1', [req.params.userId]);
    if (!cartRows.length) {
      return res.status(404).json({ ok: false, message: 'Cart not found' });
    }

    await pool.query(
      'DELETE FROM cart_items WHERE cart_id = ? AND book_id = ?',
      [cartRows[0].cart_id, req.params.productId]
    );

    res.json({ ok: true, message: 'Cart item removed' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to remove cart item', error: error.message });
  }
});

module.exports = router;
