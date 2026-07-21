const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pool = require('../config/db');

const router = express.Router();

const coverDir = path.join(__dirname, '..', '..', '..', 'bookstore_website', 'assets', 'cover');
if (!fs.existsSync(coverDir)) {
  fs.mkdirSync(coverDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, coverDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const base = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    cb(null, `${base}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    cb(null, allowed.includes(file.mimetype));
  }
});

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.book_id AS id, b.title, b.author_name AS author, c.category_name AS category,
             b.price, b.stock_quantity AS stock, b.description AS description,
             b.cover_image_url AS cover, b.created_at AS createdAt,
             b.isbn, COALESCE(s.sold_qty, 0) AS sold,
             COALESCE(r.reserved_qty, 0) AS reserved
      FROM books b
      LEFT JOIN categories c ON c.category_id = b.category_id
      LEFT JOIN (
        SELECT oi.book_id, SUM(oi.quantity) AS reserved_qty
        FROM order_items oi
        JOIN orders o ON o.order_id = oi.order_id
        WHERE o.order_status IN ('pending', 'paid')
        GROUP BY oi.book_id
      ) r ON r.book_id = b.book_id
      LEFT JOIN (
        SELECT oi.book_id, SUM(oi.quantity) AS sold_qty
        FROM order_items oi
        JOIN orders o ON o.order_id = oi.order_id
        WHERE o.order_status IN ('shipping', 'completed')
        GROUP BY oi.book_id
      ) s ON s.book_id = b.book_id
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
             b.isbn, COALESCE(r.reserved_qty, 0) AS reserved,
             COALESCE(s.sold_qty, 0) AS sold
      FROM books b
      LEFT JOIN categories c ON c.category_id = b.category_id
      LEFT JOIN (
        SELECT oi.book_id, SUM(oi.quantity) AS reserved_qty
        FROM order_items oi
        JOIN orders o ON o.order_id = oi.order_id
        WHERE o.order_status IN ('pending', 'paid')
        GROUP BY oi.book_id
      ) r ON r.book_id = b.book_id
      LEFT JOIN (
        SELECT oi.book_id, SUM(oi.quantity) AS sold_qty
        FROM order_items oi
        JOIN orders o ON o.order_id = oi.order_id
        WHERE o.order_status IN ('shipping', 'completed')
        GROUP BY oi.book_id
      ) s ON s.book_id = b.book_id
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

router.post('/', upload.single('coverFile'), async (req, res) => {
  const { title, author, isbn, category, price, stock, desc } = req.body;
  const file = req.file;
  const coverPath = file ? `assets/cover/${file.filename}` : null;
  if (!title || !Number.isFinite(Number(price))) return res.status(400).json({ ok: false, message: 'title and price are required' });
  try {
    let categoryId = null;
    if (category) {
      const [existing] = await pool.query('SELECT category_id FROM categories WHERE category_name = ? LIMIT 1', [category]);
      if (existing.length) categoryId = existing[0].category_id;
      else { const [created] = await pool.query('INSERT INTO categories (category_name) VALUES (?)', [category]); categoryId = created.insertId; }
    }
    const [result] = await pool.query('INSERT INTO books (title, author_name, isbn, category_id, price, stock_quantity, description, cover_image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [title, author || null, isbn || null, categoryId, Number(price), Number(stock) || 0, desc || null, coverPath]);
    res.status(201).json({ ok: true, id: String(result.insertId), cover: coverPath });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ ok: false, message: 'ไม่สามารถเพิ่มสินค้าได้', error: 'ISBN นี้มีอยู่แล้ว' });
    }
    res.status(500).json({ ok: false, message: 'Failed to create product', error: error.message });
  }
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