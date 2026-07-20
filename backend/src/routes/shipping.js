const express = require('express');
const pool = require('../config/db');

const router = express.Router();

router.get('/methods', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT shipping_method_id AS id, method_name AS name, estimated_days AS estimatedDays FROM shipping_methods');
    res.json({ ok: true, items: rows });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to load shipping methods', error: error.message });
  }
});

router.get('/rates', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT shipping_method_id AS shippingMethodId, min_quantity AS minQty, max_quantity AS maxQty, price
      FROM shipping_rate_tiers
      ORDER BY shipping_method_id, min_quantity
    `);
    res.json({ ok: true, items: rows });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to load shipping rates', error: error.message });
  }
});

module.exports = router;
