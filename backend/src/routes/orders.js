const express = require('express');
const pool = require('../config/db');
const { authenticate, allowRoles } = require('../middleware/auth');

const router = express.Router();

const STAFF_ROLES = new Set(['staff', 'admin']);
const MAX_PAYMENT_PROOF_DATA_URL_LENGTH = 8 * 1024 * 1024;
const PAYMENT_PROOF_DATA_URL_HEADER = /^data:(?:image\/(?:jpeg|png|webp|gif)|application\/pdf);base64$/i;
const CLIENT_ORDER_STATUSES = {
  pending: 'pending_review',
  paid: 'packing',
  shipping: 'shipped',
  completed: 'completed',
  cancelled: 'cancelled',
};

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function clientOrderStatus(status) {
  return CLIENT_ORDER_STATUSES[status] || status;
}

function clientPaymentStatus(status, hasPayment = true) {
  if (!hasPayment) return 'missing';
  if (status === 'success') return 'approved';
  if (status === 'failed') return 'rejected';
  return 'pending';
}

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function isStaff(user) {
  return Boolean(user && STAFF_ROLES.has(user.role));
}

function isSupportedPaymentProof(value) {
  if (typeof value !== 'string' || !value || value.length > MAX_PAYMENT_PROOF_DATA_URL_LENGTH) {
    return false;
  }

  const separatorIndex = value.indexOf(',');
  if (separatorIndex < 1 || !PAYMENT_PROOF_DATA_URL_HEADER.test(value.slice(0, separatorIndex))) {
    return false;
  }

  const encoded = value.slice(separatorIndex + 1);
  return encoded.length > 0
    && encoded.length % 4 === 0
    && /^[A-Za-z0-9+/]+={0,2}$/.test(encoded);
}

function historyText(status, actorName) {
  const actor = actorName || (status === 'pending' || status === 'completed' ? 'ลูกค้า' : 'พนักงาน');
  if (status === 'pending') return `${actor} ส่งหลักฐานการชำระเงินเพื่อรอตรวจสอบ`;
  if (status === 'paid') return `${actor} อนุมัติการชำระเงิน`;
  if (status === 'shipping') return `${actor} จัดส่งสินค้าและตัดสต็อก`;
  if (status === 'completed') return `${actor} ยืนยันว่าได้รับสินค้าแล้ว`;
  if (status === 'cancelled') return `${actor} ยกเลิกคำสั่งซื้อ`;
  return `${actor} อัปเดตสถานะเป็น ${clientOrderStatus(status)}`;
}

function sendRouteError(res, error, fallbackMessage) {
  if (error instanceof RequestError) {
    return res.status(error.status).json({ ok: false, message: error.message });
  }
  console.error(error);
  return res.status(500).json({ ok: false, message: fallbackMessage });
}

async function rollbackQuietly(conn) {
  if (!conn) return;
  try {
    await conn.rollback();
  } catch (rollbackError) {
    console.error('Failed to roll back order transaction', rollbackError);
  }
}

async function orderList(where = '', params = []) {
  const [orders] = await pool.query(`
    SELECT o.order_id AS id, o.order_date AS createdAt, o.total_price AS total,
           o.order_status AS databaseOrderStatus, o.shipping_method_id AS shippingMethodId,
           u.user_id AS customerId, COALESCE(u.full_name, u.username) AS customerName,
           u.email AS customerEmail,
           sm.method_name AS shippingMethodName, a.recipient_name AS receiver,
           a.phone AS addressPhone, a.address_detail AS addressDetail,
           p.payment_id AS paymentId, p.payment_status AS databasePaymentStatus,
           p.proof_image_url AS slipData, p.qr_code_ref AS slipName,
           (SELECT COUNT(*) FROM payments payment_attempt WHERE payment_attempt.order_id = o.order_id) AS paymentAttemptCount,
           COALESCE(verifier.full_name, verifier.username) AS verifiedByName
    FROM orders o
      JOIN users u ON u.user_id = o.user_id
      JOIN shipping_methods sm ON sm.shipping_method_id = o.shipping_method_id
      JOIN shipping_addresses a ON a.address_id = o.address_id
      LEFT JOIN payments p ON p.payment_id = (
        SELECT latest_payment.payment_id
        FROM payments latest_payment
        WHERE latest_payment.order_id = o.order_id
        ORDER BY latest_payment.payment_id DESC
        LIMIT 1
      )
      LEFT JOIN users verifier ON verifier.user_id = p.verified_by
    ${where}
    ORDER BY o.order_date DESC`, params);

  if (!orders.length) return [];

  const ids = orders.map(order => Number(order.id));
  const marks = ids.map(() => '?').join(',');
  const [items] = await pool.query(`
    SELECT oi.order_id, oi.book_id AS id, oi.quantity AS qty,
           oi.price_at_order AS price, b.title
    FROM order_items oi
      JOIN books b ON b.book_id = oi.book_id
    WHERE oi.order_id IN (${marks})
    ORDER BY oi.order_item_id`, ids);
  const [historyRows] = await pool.query(`
    SELECT h.history_id AS id, h.order_id, h.status,
           h.updated_by AS actorId, h.updated_at AS updatedAt,
           COALESCE(actor.full_name, actor.username) AS actorName
    FROM order_status_history h
      LEFT JOIN users actor ON actor.user_id = h.updated_by
    WHERE h.order_id IN (${marks})
    ORDER BY h.updated_at, h.history_id`, ids);

  const itemsByOrder = new Map();
  for (const item of items) {
    const orderId = Number(item.order_id);
    if (!itemsByOrder.has(orderId)) itemsByOrder.set(orderId, []);
    itemsByOrder.get(orderId).push(item);
  }

  const historyByOrder = new Map();
  for (const entry of historyRows) {
    const orderId = Number(entry.order_id);
    if (!historyByOrder.has(orderId)) historyByOrder.set(orderId, []);
    historyByOrder.get(orderId).push({
      id: String(entry.id),
      status: clientOrderStatus(entry.status),
      databaseStatus: entry.status,
      actorId: entry.actorId === null ? null : String(entry.actorId),
      actorName: entry.actorName || null,
      updatedAt: entry.updatedAt,
    });
  }

  return orders.map(order => {
    const orderId = Number(order.id);
    const orderItems = itemsByOrder.get(orderId) || [];
    const history = historyByOrder.get(orderId) || [];
    const subtotal = orderItems.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.qty),
      0
    );
    const total = Number(order.total);
    const hasPayment = order.paymentId !== null && order.paymentId !== undefined;
    const paymentProofIsSafe = hasPayment && isSupportedPaymentProof(order.slipData);

    return {
      ...order,
      id: String(order.id),
      customerId: String(order.customerId),
      total,
      subtotal,
      customerName: order.customerName || 'ลูกค้า',
      customerPhone: order.addressPhone,
      items: orderItems,
      shipping: Math.max(total - subtotal, 0),
      address: {
        receiver: order.receiver,
        phone: order.addressPhone,
        detail: order.addressDetail,
      },
      shippingMethod: {
        id: String(order.shippingMethodId),
        name: order.shippingMethodName,
      },
      orderStatus: clientOrderStatus(order.databaseOrderStatus),
      paymentStatus: clientPaymentStatus(order.databasePaymentStatus, hasPayment),
      hasPayment,
      resubmitCount: Math.max(Number(order.paymentAttemptCount || 0) - 1, 0),
      slipData: paymentProofIsSafe ? order.slipData : null,
      paymentProofInvalid: hasPayment && !paymentProofIsSafe,
      deliveryStatus: order.databaseOrderStatus === 'shipping'
        ? 'in_transit'
        : order.databaseOrderStatus === 'completed'
          ? 'delivered'
          : order.databaseOrderStatus === 'cancelled'
            ? 'cancelled'
            : 'not_shipped',
      slipName: hasPayment ? (order.slipName || 'payment-slip') : '',
      staffName: order.verifiedByName
        || (hasPayment && ['success', 'failed'].includes(order.databasePaymentStatus)
          ? 'ไม่พบข้อมูลผู้ตรวจ (รายการเดิม)'
          : '-'),
      history,
      timeline: history.map(entry => ({
        time: entry.updatedAt,
        text: historyText(entry.databaseStatus, entry.actorName),
        status: entry.status,
        actorId: entry.actorId,
        actorName: entry.actorName,
      })),
    };
  });
}

router.get('/all', authenticate, allowRoles('staff', 'admin'), async (req, res) => {
  try {
    res.json({ ok: true, items: await orderList() });
  } catch (error) {
    sendRouteError(res, error, 'Failed to fetch orders');
  }
});

router.get('/:userId', authenticate, async (req, res) => {
  const requestedUserId = positiveInteger(req.params.userId);
  if (!requestedUserId) {
    return res.status(400).json({ ok: false, message: 'Invalid user ID' });
  }
  if (!isStaff(req.user) && requestedUserId !== Number(req.user.id)) {
    return res.status(403).json({ ok: false, message: 'You may only view your own orders' });
  }

  try {
    return res.json({
      ok: true,
      items: await orderList('WHERE o.user_id = ?', [requestedUserId]),
    });
  } catch (error) {
    return sendRouteError(res, error, 'Failed to fetch orders');
  }
});

router.post('/create', authenticate, async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const userId = positiveInteger(req.user.id);
  const addressId = positiveInteger(body.addressId);
  const shippingMethodId = positiveInteger(body.shippingMethodId);
  const paymentMethodId = body.paymentMethodId === undefined
    ? null
    : positiveInteger(body.paymentMethodId);
  const { items, slipName, slipData } = body;

  if (!userId || !addressId || !shippingMethodId || (body.paymentMethodId !== undefined && !paymentMethodId)) {
    return res.status(400).json({ ok: false, message: 'Invalid order payload' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, message: 'At least one order item is required' });
  }
  if (!isSupportedPaymentProof(slipData)) {
    return res.status(400).json({
      ok: false,
      message: 'Payment proof must be a JPEG, PNG, WebP, GIF, or PDF data URL no larger than 8 MB',
    });
  }
  if (slipName !== undefined && (typeof slipName !== 'string' || slipName.length > 255)) {
    return res.status(400).json({ ok: false, message: 'Invalid payment proof name' });
  }

  const normalizedItems = [];
  const seenBookIds = new Set();
  for (const item of items) {
    const bookId = positiveInteger(item && item.bookId);
    const quantity = positiveInteger(item && item.quantity);
    if (!bookId || !quantity || seenBookIds.has(bookId)) {
      return res.status(400).json({ ok: false, message: 'Invalid or duplicate order item' });
    }
    seenBookIds.add(bookId);
    normalizedItems.push({ bookId, quantity });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [addresses] = await conn.query(
      'SELECT address_id FROM shipping_addresses WHERE address_id = ? AND user_id = ? LIMIT 1 FOR UPDATE',
      [addressId, userId]
    );
    if (!addresses.length) {
      throw new RequestError(403, 'Shipping address does not belong to the authenticated user');
    }

    const bookIds = normalizedItems.map(item => item.bookId);
    const [books] = await conn.query(`
      SELECT book_id, price, stock_quantity
      FROM books
      WHERE book_id IN (${bookIds.map(() => '?').join(',')})
      FOR UPDATE`, bookIds);
    if (books.length !== normalizedItems.length) {
      throw new RequestError(409, 'A product no longer exists');
    }

    // Pending and paid orders reserve units. Holding the book rows above makes
    // this check serialize with other creates and shipments for the same books.
    const [reservationRows] = await conn.query(`
      SELECT oi.book_id, COALESCE(SUM(oi.quantity), 0) AS reserved_quantity
      FROM order_items oi
        JOIN orders reserved_order ON reserved_order.order_id = oi.order_id
      WHERE oi.book_id IN (${bookIds.map(() => '?').join(',')})
        AND reserved_order.order_status IN ('pending', 'paid')
      GROUP BY oi.book_id`, bookIds);
    const reservations = new Map(
      reservationRows.map(row => [Number(row.book_id), Number(row.reserved_quantity)])
    );

    let subtotal = 0;
    for (const item of normalizedItems) {
      const book = books.find(row => Number(row.book_id) === item.bookId);
      const availableStock = Number(book && book.stock_quantity) - (reservations.get(item.bookId) || 0);
      if (!book || availableStock < item.quantity) {
        throw new RequestError(409, 'Insufficient stock');
      }
      subtotal += Number(book.price) * item.quantity;
    }
    subtotal = Number(subtotal.toFixed(2));

    const bookCount = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
    const [shippingRates] = await conn.query(`
      SELECT price
      FROM shipping_rate_tiers
      WHERE shipping_method_id = ?
        AND min_quantity <= ?
        AND (max_quantity IS NULL OR max_quantity >= ?)
      ORDER BY min_quantity DESC
      LIMIT 1`, [shippingMethodId, bookCount, bookCount]);
    if (!shippingRates.length) {
      throw new RequestError(409, 'Shipping rate is unavailable');
    }

    const [methods] = paymentMethodId
      ? await conn.query(
        'SELECT payment_method_id FROM payment_methods WHERE payment_method_id = ? LIMIT 1',
        [paymentMethodId]
      )
      : await conn.query(
        'SELECT payment_method_id FROM payment_methods ORDER BY payment_method_id LIMIT 1'
      );
    if (!methods.length) {
      throw new RequestError(409, 'Payment method is unavailable');
    }

    const shipping = Number(Number(shippingRates[0].price).toFixed(2));
    const total = Number((subtotal + shipping).toFixed(2));
    const [order] = await conn.query(`
      INSERT INTO orders
        (user_id, address_id, shipping_method_id, total_price, order_status)
      VALUES (?, ?, ?, ?, 'pending')`, [userId, addressId, shippingMethodId, total]);

    for (const item of normalizedItems) {
      const book = books.find(row => Number(row.book_id) === item.bookId);
      await conn.query(`
        INSERT INTO order_items (order_id, book_id, quantity, price_at_order)
        VALUES (?, ?, ?, ?)`, [order.insertId, item.bookId, item.quantity, book.price]);
    }

    await conn.query(`
      INSERT INTO payments
        (order_id, payment_method_id, amount, qr_code_ref, proof_image_url,
         payment_status, paid_at)
      VALUES (?, ?, ?, ?, ?, 'awaiting_verification', NOW())`, [
      order.insertId,
      methods[0].payment_method_id,
      total,
      slipName ? slipName.trim() : null,
      slipData,
    ]);
    await conn.query(`
      INSERT INTO order_status_history (order_id, status, updated_by)
      VALUES (?, 'pending', ?)`, [order.insertId, userId]);
    await conn.query(`
      DELETE ci
      FROM cart_items ci
        JOIN carts c ON c.cart_id = ci.cart_id
      WHERE c.user_id = ?`, [userId]);

    await conn.commit();
    return res.status(201).json({
      ok: true,
      orderId: String(order.insertId),
      subtotal,
      shipping,
      total,
      orderStatus: 'pending_review',
      paymentStatus: 'pending',
    });
  } catch (error) {
    await rollbackQuietly(conn);
    return sendRouteError(res, error, 'Failed to create order');
  } finally {
    if (conn) conn.release();
  }
});

router.patch('/:id/payment-proof', authenticate, async (req, res) => {
  const orderId = positiveInteger(req.params.id);
  const userId = positiveInteger(req.user.id);
  const slipName = req.body.slipName;
  const slipData = req.body.slipData;

  if (!orderId || !userId) {
    return res.status(400).json({ ok: false, message: 'Invalid order or authenticated user ID' });
  }
  if (!isSupportedPaymentProof(slipData)) {
    return res.status(400).json({
      ok: false,
      message: 'Payment proof must be a JPEG, PNG, WebP, GIF, or PDF data URL no larger than 8 MB',
    });
  }
  if (slipName !== undefined && (typeof slipName !== 'string' || slipName.length > 255)) {
    return res.status(400).json({ ok: false, message: 'Invalid payment proof name' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [orders] = await conn.query(`
      SELECT order_id, user_id, order_status, total_price
      FROM orders
      WHERE order_id = ?
      LIMIT 1
      FOR UPDATE`, [orderId]);
    if (!orders.length) throw new RequestError(404, 'Order not found');
    const order = orders[0];
    if (Number(order.user_id) !== userId) {
      throw new RequestError(403, 'You may only submit payment proof for your own order');
    }
    if (order.order_status !== 'cancelled') {
      throw new RequestError(409, 'Only an order rejected for payment can receive a new proof');
    }

    const [payments] = await conn.query(`
      SELECT payment_id, payment_method_id, payment_status
      FROM payments
      WHERE order_id = ?
      ORDER BY payment_id DESC
      FOR UPDATE`, [orderId]);
    if (!payments.length || payments[0].payment_status !== 'failed') {
      throw new RequestError(409, 'The latest payment was not rejected');
    }
    if (payments.length >= 3) {
      throw new RequestError(409, 'Payment proof can only be resubmitted twice');
    }

    const [orderItems] = await conn.query(
      'SELECT book_id, quantity FROM order_items WHERE order_id = ? ORDER BY order_item_id',
      [orderId]
    );
    if (!orderItems.length) throw new RequestError(409, 'Order has no items');
    const bookIds = orderItems.map(item => Number(item.book_id));
    const [books] = await conn.query(`
      SELECT book_id, stock_quantity
      FROM books
      WHERE book_id IN (${bookIds.map(() => '?').join(',')})
      FOR UPDATE`, bookIds);
    if (books.length !== bookIds.length) throw new RequestError(409, 'A product no longer exists');
    const [reservationRows] = await conn.query(`
      SELECT oi.book_id, COALESCE(SUM(oi.quantity), 0) AS reserved_quantity
      FROM order_items oi
        JOIN orders reserved_order ON reserved_order.order_id = oi.order_id
      WHERE oi.book_id IN (${bookIds.map(() => '?').join(',')})
        AND reserved_order.order_status IN ('pending', 'paid')
      GROUP BY oi.book_id`, bookIds);
    const reservations = new Map(
      reservationRows.map(row => [Number(row.book_id), Number(row.reserved_quantity)])
    );
    for (const item of orderItems) {
      const book = books.find(row => Number(row.book_id) === Number(item.book_id));
      const available = Number(book.stock_quantity) - (reservations.get(Number(item.book_id)) || 0);
      if (available < Number(item.quantity)) throw new RequestError(409, 'Insufficient stock');
    }

    await conn.query(`
      INSERT INTO payments
        (order_id, payment_method_id, amount, qr_code_ref, proof_image_url, payment_status, paid_at)
      VALUES (?, ?, ?, ?, ?, 'awaiting_verification', NOW())`, [
      orderId,
      payments[0].payment_method_id,
      order.total_price,
      slipName ? slipName.trim() : null,
      slipData,
    ]);
    const [statusUpdate] = await conn.query(`
      UPDATE orders SET order_status = 'pending'
      WHERE order_id = ? AND order_status = 'cancelled'`, [orderId]);
    if (statusUpdate.affectedRows !== 1) {
      throw new RequestError(409, 'Order status changed; please refresh and try again');
    }
    await conn.query(`
      INSERT INTO order_status_history (order_id, status, updated_by)
      VALUES (?, 'pending', ?)`, [orderId, userId]);

    await conn.commit();
    return res.json({
      ok: true,
      message: 'ส่งหลักฐานการชำระเงินใหม่แล้ว',
      orderStatus: 'pending_review',
      paymentStatus: 'pending',
      resubmitCount: payments.length,
    });
  } catch (error) {
    await rollbackQuietly(conn);
    return sendRouteError(res, error, 'Failed to resubmit payment proof');
  } finally {
    if (conn) conn.release();
  }
});

router.patch('/:id/status', authenticate, async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const orderId = positiveInteger(req.params.id);
  const action = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';
  const actorId = positiveInteger(req.user.id);

  if (!orderId || !actorId) {
    return res.status(400).json({ ok: false, message: 'Invalid order or authenticated user ID' });
  }
  if (!['approve', 'reject', 'packing', 'ship', 'receive'].includes(action)) {
    return res.status(400).json({ ok: false, message: 'Unknown status action' });
  }
  if (action !== 'receive' && !isStaff(req.user)) {
    return res.status(403).json({ ok: false, message: 'Staff access is required for this action' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.query(`
      SELECT order_id, user_id, order_status, total_price
      FROM orders
      WHERE order_id = ?
      LIMIT 1
      FOR UPDATE`, [orderId]);
    if (!rows.length) throw new RequestError(404, 'Order not found');

    const order = rows[0];
    if (action === 'receive' && !isStaff(req.user) && Number(order.user_id) !== actorId) {
      throw new RequestError(403, 'You may only confirm receipt of your own order');
    }

    let nextStatus;
    const [payments] = await conn.query(`
      SELECT payment_id, payment_status, amount, proof_image_url
      FROM payments
      WHERE order_id = ?
      ORDER BY payment_id DESC
      LIMIT 1
      FOR UPDATE`, [orderId]);
    if (!payments.length) {
      throw new RequestError(409, 'This order has no payment record');
    }
    const payment = payments[0];

    if (action === 'approve') {
      if (order.order_status !== 'pending' || payment.payment_status !== 'awaiting_verification') {
        throw new RequestError(409, 'Only a pending payment can be approved');
      }
      if (!isSupportedPaymentProof(payment.proof_image_url)) {
        throw new RequestError(409, 'Payment proof is missing or invalid');
      }
      if (Number(payment.amount) !== Number(order.total_price)) {
        throw new RequestError(409, 'Payment amount does not match the order total');
      }
      nextStatus = 'paid';
      await conn.query(`
        UPDATE payments
        SET payment_status = 'success', verified_by = ?, verified_at = NOW()
        WHERE payment_id = ?`, [actorId, payment.payment_id]);
    } else if (action === 'reject') {
      if (order.order_status !== 'pending' || payment.payment_status !== 'awaiting_verification') {
        throw new RequestError(409, 'Only a pending payment can be rejected');
      }
      nextStatus = 'cancelled';
      await conn.query(`
        UPDATE payments
        SET payment_status = 'failed', verified_by = ?, verified_at = NOW()
        WHERE payment_id = ?`, [actorId, payment.payment_id]);
    } else if (action === 'packing') {
      if (order.order_status !== 'paid' || payment.payment_status !== 'success') {
        throw new RequestError(409, 'Payment must be approved before packing');
      }

      // In the current schema `paid` is the persisted packing state. Keep this
      // compatibility action successful without creating a duplicate transition.
      await conn.commit();
      return res.json({
        ok: true,
        orderStatus: 'packing',
        databaseOrderStatus: 'paid',
        unchanged: true,
      });
    } else if (action === 'ship') {
      if (order.order_status !== 'paid' || payment.payment_status !== 'success') {
        throw new RequestError(409, 'Only a paid order can be shipped');
      }

      const [orderItems] = await conn.query(
        'SELECT book_id, quantity FROM order_items WHERE order_id = ? ORDER BY order_item_id',
        [orderId]
      );
      if (!orderItems.length) throw new RequestError(409, 'Order has no items');

      for (const item of orderItems) {
        const [result] = await conn.query(`
          UPDATE books
          SET stock_quantity = stock_quantity - ?
          WHERE book_id = ? AND stock_quantity >= ?`, [
          item.quantity,
          item.book_id,
          item.quantity,
        ]);
        if (result.affectedRows !== 1) {
          throw new RequestError(409, 'Insufficient stock');
        }
      }
      nextStatus = 'shipping';
    } else {
      if (order.order_status !== 'shipping' || payment.payment_status !== 'success') {
        throw new RequestError(409, 'Only a shipped order can be marked as received');
      }
      nextStatus = 'completed';
    }

    const [statusUpdate] = await conn.query(`
      UPDATE orders
      SET order_status = ?
      WHERE order_id = ? AND order_status = ?`, [nextStatus, orderId, order.order_status]);
    if (statusUpdate.affectedRows !== 1) {
      throw new RequestError(409, 'Order status changed; please refresh and try again');
    }
    await conn.query(`
      INSERT INTO order_status_history (order_id, status, updated_by)
      VALUES (?, ?, ?)`, [orderId, nextStatus, actorId]);

    await conn.commit();
    return res.json({
      ok: true,
      orderStatus: clientOrderStatus(nextStatus),
      databaseOrderStatus: nextStatus,
    });
  } catch (error) {
    await rollbackQuietly(conn);
    return sendRouteError(res, error, 'Failed to update order');
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
