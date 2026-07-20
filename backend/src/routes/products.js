const express = require('express');
const pool = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.book_id AS id, b.title, b.author_name AS author, c.category_name AS category,
             b.price, b.stock_quantity AS stock, b.description AS description,
             b.cover_image_url AS cover, b.created_at AS createdAt,
             b.isbn, COALESCE(b.stock_quantity, 0) AS sold
      FROM books b
      LEFT JOIN categories c ON c.category_id = b.category_id
      ORDER BY b.created_at DESC
    `);

    res.json({ ok: true, items: rows.map(row => ({ ...row, desc: row.description })) });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to fetch products', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.book_id AS id, b.title, b.author_name AS author, c.category_name AS category,
             b.price, b.stock_quantity AS stock, b.description AS description,
             b.cover_image_url AS cover, b.created_at AS createdAt,
             b.isbn
      FROM books b
      LEFT JOIN categories c ON c.category_id = b.category_id
      WHERE b.book_id = ?
    `, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ ok: false, message: 'Product not found' });
    }

    res.json({ ok: true, item: { ...rows[0], desc: rows[0].description } });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to fetch product', error: error.message });
  }
});

router.post('/', async (req, res) => {
  const { title, author, isbn, category, price, stock, desc, cover } = req.body;
  if (!title || !Number.isFinite(Number(price))) return res.status(400).json({ ok: false, message: 'title and price are required' });
  try {
    let categoryId = null;
    if (category) {
      const [existing] = await pool.query('SELECT category_id FROM categories WHERE category_name = ? LIMIT 1', [category]);
      if (existing.length) categoryId = existing[0].category_id;
      else { const [created] = await pool.query('INSERT INTO categories (category_name) VALUES (?)', [category]); categoryId = created.insertId; }
    }
    const [result] = await pool.query('INSERT INTO books (title, author_name, isbn, category_id, price, stock_quantity, description, cover_image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [title, author || null, isbn || null, categoryId, Number(price), Number(stock) || 0, desc || null, cover || null]);
    res.status(201).json({ ok: true, id: String(result.insertId) });
  } catch (error) { res.status(500).json({ ok: false, message: 'Failed to create product', error: error.message }); }
});

router.patch('/:id', async (req, res) => {
  const { stock } = req.body;
  if (!Number.isFinite(Number(stock))) return res.status(400).json({ ok: false, message: 'Invalid stock' });
  try {
    const [result] = await pool.query('UPDATE books SET stock_quantity = ? WHERE book_id = ?', [Math.max(0, Number(stock)), req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ ok: false, message: 'Product not found' });
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ ok: false, message: 'Failed to update product', error: error.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM books WHERE book_id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ ok: false, message: 'Product not found' });
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ ok: false, message: 'Failed to delete product', error: error.message }); }
});

module.exports = router;
