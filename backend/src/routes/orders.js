const express = require('express');
const pool = require('../config/db');
const router = express.Router();

async function orderList(where = '', params = []) {
  const [orders] = await pool.query(`
    SELECT o.order_id AS id, o.order_date AS createdAt, o.total_price AS total, o.order_status AS orderStatus,
           o.shipping_method_id AS shippingMethodId, u.user_id AS customerId, u.full_name AS customerName,
           u.email AS customerEmail, sm.method_name AS shippingMethodName,
           a.recipient_name AS receiver, a.phone AS addressPhone, a.address_detail AS addressDetail,
           p.payment_status AS paymentStatus, p.proof_image_url AS slipData, p.qr_code_ref AS slipName,
           verifier.full_name AS verifiedByName
    FROM orders o JOIN users u ON u.user_id = o.user_id
      JOIN shipping_methods sm ON sm.shipping_method_id = o.shipping_method_id
      JOIN shipping_addresses a ON a.address_id = o.address_id
      LEFT JOIN payments p ON p.order_id = o.order_id
      LEFT JOIN users verifier ON verifier.user_id = p.verified_by
    ${where} ORDER BY o.order_date DESC`, params);
  if (!orders.length) return [];
  const ids = orders.map(order => order.id);
  const marks = ids.map(() => '?').join(',');
  const [items] = await pool.query(`SELECT oi.order_id, oi.book_id AS id, oi.quantity AS qty, oi.price_at_order AS price, b.title
    FROM order_items oi JOIN books b ON b.book_id = oi.book_id WHERE oi.order_id IN (${marks})`, ids);
  return orders.map(order => {
    const orderItems = items.filter(item => item.order_id === Number(order.id));
    const subtotal = orderItems.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
    const total = Number(order.total);
    return {
      ...order, id: String(order.id), customerId: String(order.customerId), total, subtotal,
      customerName: order.customerName || 'ลูกค้า', items: orderItems,
      shipping: Math.max(total - subtotal, 0), address: { receiver: order.receiver, phone: order.addressPhone, detail: order.addressDetail },
      shippingMethod: { id: String(order.shippingMethodId), name: order.shippingMethodName },
      orderStatus: order.orderStatus === 'paid' ? 'packing' : order.orderStatus === 'shipping' ? 'shipped' : order.orderStatus,
      paymentStatus: order.paymentStatus === 'success' ? 'approved' : order.paymentStatus === 'failed' ? 'rejected' : 'pending',
      deliveryStatus: order.orderStatus === 'shipping' ? 'in_transit' : order.orderStatus === 'completed' ? 'delivered' : order.orderStatus === 'cancelled' ? 'cancelled' : 'not_shipped',
      slipName: order.slipName || 'payment-slip',
      staffName: order.verifiedByName || (['success', 'failed'].includes(order.paymentStatus) ? 'ไม่พบข้อมูลผู้ตรวจ (รายการเดิม)' : '-')
    };
  });
}

router.get('/all', async (req, res) => { try { res.json({ ok: true, items: await orderList() }); } catch (error) { res.status(500).json({ ok: false, message: 'Failed to fetch orders', error: error.message }); } });
router.get('/:userId', async (req, res) => { try { res.json({ ok: true, items: await orderList('WHERE o.user_id = ?', [req.params.userId]) }); } catch (error) { res.status(500).json({ ok: false, message: 'Failed to fetch orders', error: error.message }); } });

router.post('/create', async (req, res) => {
  const { userId, addressId, shippingMethodId, items, slipName, slipData } = req.body;
  const itemQuantitiesAreValid = Array.isArray(items) && items.every(item => Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0);
  if (!userId || !addressId || !shippingMethodId || !Array.isArray(items) || !items.length || !itemQuantitiesAreValid) {
    return res.status(400).json({ ok: false, message: 'Invalid order payload' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const bookIds = items.map(item => Number(item.bookId));
    const [books] = await conn.query(`SELECT book_id, price, stock_quantity FROM books WHERE book_id IN (${bookIds.map(() => '?').join(',')}) FOR UPDATE`, bookIds);
    if (books.length !== items.length) throw new Error('A product no longer exists');
    let subtotal = 0;
    for (const item of items) {
      const book = books.find(row => row.book_id === Number(item.bookId));
      if (!book || book.stock_quantity < Number(item.quantity)) throw new Error('Insufficient stock');
      subtotal += Number(book.price) * Number(item.quantity);
    }
    const bookCount = items.reduce((sum, item) => sum + Number(item.quantity), 0);
    const [shippingRates] = await conn.query(`
      SELECT price FROM shipping_rate_tiers
      WHERE shipping_method_id = ? AND min_quantity <= ? AND (max_quantity IS NULL OR max_quantity >= ?)
      ORDER BY min_quantity DESC LIMIT 1
    `, [shippingMethodId, bookCount, bookCount]);
    if (!shippingRates.length) throw new Error('Shipping rate is unavailable');
    const shipping = Number(shippingRates[0].price);
    const total = subtotal + shipping;
    const [order] = await conn.query(`INSERT INTO orders (user_id, address_id, shipping_method_id, total_price, order_status) VALUES (?, ?, ?, ?, 'pending')`, [userId, addressId, shippingMethodId, total]);
    for (const item of items) {
      const book = books.find(row => row.book_id === Number(item.bookId));
      await conn.query('INSERT INTO order_items (order_id, book_id, quantity, price_at_order) VALUES (?, ?, ?, ?)', [order.insertId, item.bookId, item.quantity, book.price]);
    }
    const [methods] = await conn.query('SELECT payment_method_id FROM payment_methods LIMIT 1');
    if (methods.length) await conn.query(`INSERT INTO payments (order_id, payment_method_id, amount, qr_code_ref, proof_image_url, payment_status, paid_at) VALUES (?, ?, ?, ?, ?, 'awaiting_verification', NOW())`, [order.insertId, methods[0].payment_method_id, total, slipName || null, slipData || null]);
    await conn.query('DELETE ci FROM cart_items ci JOIN carts c ON c.cart_id = ci.cart_id WHERE c.user_id = ?', [userId]);
    await conn.commit();
    res.status(201).json({ ok: true, orderId: String(order.insertId), subtotal, shipping, total });
  } catch (error) { await conn.rollback(); res.status(400).json({ ok: false, message: error.message || 'Failed to create order' }); }
  finally { conn.release(); }
});

router.patch('/:id/status', async (req, res) => {
  const { action, actorId } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT order_status FROM orders WHERE order_id = ? FOR UPDATE', [req.params.id]);
    if (!rows.length) throw new Error('Order not found');
    let updatedBy = null;
    if (actorId !== undefined && actorId !== null) {
      const normalizedActorId = Number(actorId);
      if (!Number.isInteger(normalizedActorId) || normalizedActorId <= 0) throw new Error('Invalid staff user');
      const [actors] = await conn.query("SELECT user_id FROM users WHERE user_id = ? AND role IN ('staff', 'admin') LIMIT 1", [normalizedActorId]);
      if (!actors.length) throw new Error('Invalid staff user');
      updatedBy = normalizedActorId;
    }
    let status;
    if (action === 'approve') {
      if (!updatedBy) throw new Error('Approver is required');
      status = 'paid';
      await conn.query("UPDATE payments SET payment_status = 'success', verified_by = ?, verified_at = NOW() WHERE order_id = ?", [updatedBy, req.params.id]);
    }
    else if (action === 'reject') {
      if (!updatedBy) throw new Error('Reviewer is required');
      status = 'cancelled';
      await conn.query("UPDATE payments SET payment_status = 'failed', verified_by = ?, verified_at = NOW() WHERE order_id = ?", [updatedBy, req.params.id]);
    }
    else if (action === 'ship') {
      const [items] = await conn.query('SELECT book_id, quantity FROM order_items WHERE order_id = ?', [req.params.id]);
      for (const item of items) {
        const [result] = await conn.query('UPDATE books SET stock_quantity = stock_quantity - ? WHERE book_id = ? AND stock_quantity >= ?', [item.quantity, item.book_id, item.quantity]);
        if (!result.affectedRows) throw new Error('Insufficient stock');
      }
      status = 'shipping';
    } else if (action === 'receive') status = 'completed';
    else if (action === 'packing') status = 'paid';
    else throw new Error('Unknown status action');
    await conn.query('UPDATE orders SET order_status = ? WHERE order_id = ?', [status, req.params.id]);
    await conn.query('INSERT INTO order_status_history (order_id, status, updated_by) VALUES (?, ?, ?)', [req.params.id, status, updatedBy]);
    await conn.commit(); res.json({ ok: true, orderStatus: status });
  } catch (error) { await conn.rollback(); res.status(400).json({ ok: false, message: error.message || 'Failed to update order' }); }
  finally { conn.release(); }
});

module.exports = router;
