const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

class CartError extends Error {
  constructor(status, message, details = {}) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

async function availableStockForCart(connection, productId) {
  const [books] = await connection.query(
    `SELECT stock_quantity
     FROM books
     WHERE book_id = ? AND is_active = TRUE
     LIMIT 1
     FOR UPDATE`,
    [productId]
  );
  if (!books.length) throw new CartError(404, 'ไม่พบสินค้านี้หรือสินค้าถูกปิดใช้งานแล้ว');

  const [reservationRows] = await connection.query(`
    SELECT COALESCE(SUM(oi.quantity), 0) AS reserved_quantity
    FROM order_items oi
      JOIN orders o ON o.order_id = oi.order_id
    WHERE oi.book_id = ?
      AND o.order_status IN ('pending', 'paid')`, [productId]);

  return Math.max(
    0,
    Number(books[0].stock_quantity) - Number(reservationRows[0]?.reserved_quantity || 0)
  );
}

async function rollbackQuietly(connection) {
  if (!connection) return;
  try {
    await connection.rollback();
  } catch (error) {
    console.error('Failed to roll back cart transaction', error);
  }
}

function sendCartError(res, error, fallbackMessage) {
  if (error instanceof CartError) {
    return res.status(error.status).json({ ok: false, message: error.message, ...error.details });
  }
  console.error(error);
  return res.status(500).json({ ok: false, message: fallbackMessage });
}

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
       JOIN books b ON b.book_id = ci.book_id AND b.is_active = TRUE
       WHERE c.user_id = ?`,
      [req.params.userId]
    );

    res.json({ ok: true, items: rows });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to fetch cart', error: error.message });
  }
});

router.post('/:userId/add', async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const productId = positiveInteger(body.productId);
  const quantity = positiveInteger(body.quantity === undefined ? 1 : body.quantity);
  if (!productId || !quantity) {
    return res.status(400).json({ ok: false, message: 'รหัสสินค้าและจำนวนต้องเป็นจำนวนเต็มมากกว่า 0' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const availableStock = await availableStockForCart(connection, productId);
    const [cartRows] = await connection.query('SELECT cart_id FROM carts WHERE user_id = ? LIMIT 1', [req.params.userId]);
    let cartId;

    if (!cartRows.length) {
      const [createCart] = await connection.query('INSERT INTO carts (user_id) VALUES (?)', [req.params.userId]);
      cartId = createCart.insertId;
    } else {
      cartId = cartRows[0].cart_id;
    }

    const [existing] = await connection.query(
      'SELECT cart_item_id, quantity FROM cart_items WHERE cart_id = ? AND book_id = ?',
      [cartId, productId]
    );
    const nextQuantity = Number(existing[0]?.quantity || 0) + quantity;
    if (nextQuantity > availableStock) {
      throw new CartError(409, `จำนวนสินค้าสูงสุดคือ ${availableStock} เล่ม`, { availableStock });
    }

    if (existing.length) {
      await connection.query(
        'UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?',
        [nextQuantity, existing[0].cart_item_id]
      );
    } else {
      await connection.query(
        'INSERT INTO cart_items (cart_id, book_id, quantity) VALUES (?, ?, ?)',
        [cartId, productId, quantity]
      );
    }

    await connection.commit();
    return res.status(201).json({
      ok: true,
      message: 'เพิ่มสินค้าลงตะกร้าแล้ว',
      quantity: nextQuantity,
      availableStock,
    });
  } catch (error) {
    await rollbackQuietly(connection);
    return sendCartError(res, error, 'ไม่สามารถเพิ่มสินค้าลงตะกร้าได้');
  } finally {
    if (connection) connection.release();
  }
});

router.put('/:userId/update', async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const productId = positiveInteger(body.productId);
  const quantity = positiveInteger(body.quantity);

  if (!productId || !quantity) {
    return res.status(400).json({ ok: false, message: 'รหัสสินค้าและจำนวนต้องเป็นจำนวนเต็มมากกว่า 0' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const availableStock = await availableStockForCart(connection, productId);
    if (quantity > availableStock) {
      throw new CartError(409, `จำนวนสินค้าสูงสุดคือ ${availableStock} เล่ม`, { availableStock });
    }

    const [cartRows] = await connection.query('SELECT cart_id FROM carts WHERE user_id = ? LIMIT 1', [req.params.userId]);
    if (!cartRows.length) {
      throw new CartError(404, 'ไม่พบตะกร้าสินค้า');
    }

    const [existing] = await connection.query(
      'SELECT cart_item_id FROM cart_items WHERE cart_id = ? AND book_id = ? LIMIT 1',
      [cartRows[0].cart_id, productId]
    );

    if (!existing.length) {
      throw new CartError(404, 'ไม่พบสินค้านี้ในตะกร้า');
    }

    await connection.query(
      'UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?',
      [quantity, existing[0].cart_item_id]
    );

    await connection.commit();
    return res.json({
      ok: true,
      message: 'อัปเดตจำนวนสินค้าแล้ว',
      quantity,
      availableStock,
    });
  } catch (error) {
    await rollbackQuietly(connection);
    return sendCartError(res, error, 'ไม่สามารถอัปเดตจำนวนสินค้าได้');
  } finally {
    if (connection) connection.release();
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
