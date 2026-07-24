const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pool = require('../config/db');
const { authenticate, allowRoles } = require('../middleware/auth');

const router = express.Router();

const coverDir = path.join(__dirname, '..', '..', '..', 'bookstore_website', 'assets', 'cover');
const MAX_COVER_FILE_SIZE = 5 * 1024 * 1024;
const COVER_EXTENSIONS = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

if (!fs.existsSync(coverDir)) {
  fs.mkdirSync(coverDir, { recursive: true });
}

class ProductError extends Error {
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

function validStock(value) {
  return Number.isSafeInteger(value) && value >= 0 && value <= 2_147_483_647;
}

function validPrice(value) {
  return Number.isFinite(value) && value > 0 && value <= 99_999_999.99;
}

async function rollbackQuietly(conn) {
  if (!conn) return;
  try {
    await conn.rollback();
  } catch (error) {
    console.error('Failed to roll back product transaction', error);
  }
}

async function removeUploadedCover(file) {
  if (!file?.path) return;
  try {
    await fs.promises.unlink(file.path);
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Failed to remove unused cover image', error);
  }
}

async function hasValidCoverSignature(file) {
  if (!file?.path) return true;
  let handle;
  try {
    handle = await fs.promises.open(file.path, 'r');
    const header = Buffer.alloc(12);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    if (file.mimetype === 'image/jpeg') {
      return bytesRead >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    }
    if (file.mimetype === 'image/png') {
      return bytesRead >= 8 && header.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      );
    }
    if (file.mimetype === 'image/gif') {
      const signature = header.subarray(0, 6).toString('ascii');
      return bytesRead >= 6 && (signature === 'GIF87a' || signature === 'GIF89a');
    }
    if (file.mimetype === 'image/webp') {
      return bytesRead >= 12
        && header.subarray(0, 4).toString('ascii') === 'RIFF'
        && header.subarray(8, 12).toString('ascii') === 'WEBP';
    }
    return false;
  } catch (error) {
    console.error('Failed to inspect uploaded cover image', error);
    return false;
  } finally {
    if (handle) {
      try { await handle.close(); } catch (error) { console.error('Failed to close cover image', error); }
    }
  }
}

function sendProductError(res, error, fallbackMessage) {
  if (error instanceof ProductError) {
    return res.status(error.status).json({ ok: false, message: error.message, ...error.details });
  }
  console.error(error);
  return res.status(500).json({ ok: false, message: fallbackMessage });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, coverDir),
  filename: (req, file, cb) => {
    const ext = COVER_EXTENSIONS.get(file.mimetype) || '.jpg';
    const base = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_COVER_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!COVER_EXTENSIONS.has(file.mimetype)) {
      const error = new Error('Cover image must be a JPEG, PNG, WebP, or GIF file');
      error.status = 400;
      return cb(error);
    }
    return cb(null, true);
  },
});

function uploadCover(req, res, next) {
  upload.single('coverFile')(req, res, error => {
    if (!error) return next();
    const tooLarge = error.code === 'LIMIT_FILE_SIZE';
    const message = tooLarge
      ? 'Cover image must not exceed 5 MB'
      : error.message || 'Invalid cover image';
    return res.status(tooLarge ? 413 : (error.status || 400)).json({ ok: false, message });
  });
}

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
      WHERE b.is_active = TRUE
      ORDER BY b.created_at DESC
    `);

    return res.json({ ok: true, items: rows.map(row => ({ ...row, desc: row.description })) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Failed to fetch products', error: error.message });
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
      WHERE b.book_id = ? AND b.is_active = TRUE
    `, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ ok: false, message: 'Product not found' });
    }

    return res.json({ ok: true, item: { ...rows[0], desc: rows[0].description } });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Failed to fetch product', error: error.message });
  }
});

router.post('/', authenticate, allowRoles('admin'), uploadCover, async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const title = String(body.title || '').trim();
  const author = String(body.author || '').trim();
  const isbn = String(body.isbn || '').trim();
  const category = String(body.category || '').trim();
  const desc = String(body.desc || '').trim();
  const price = Number(body.price);
  const stock = body.stock === undefined || String(body.stock).trim() === ''
    ? 0
    : Number(body.stock);
  const file = req.file;
  const coverPath = file ? `assets/cover/${file.filename}` : null;

  if (!(await hasValidCoverSignature(file))) {
    await removeUploadedCover(file);
    return res.status(400).json({
      ok: false,
      message: 'The uploaded cover content does not match its image type',
    });
  }

  let validationMessage = '';
  if (!title || body.price === undefined || String(body.price).trim() === '') {
    validationMessage = 'title and price are required';
  } else if (!validPrice(price)) {
    validationMessage = 'Price must be greater than 0 and no more than 99,999,999.99';
  } else if (!validStock(stock)) {
    validationMessage = 'Stock must be a whole number between 0 and 2,147,483,647';
  } else if (title.length > 255 || author.length > 150 || isbn.length > 20 || category.length > 100) {
    validationMessage = 'One or more product fields exceed the allowed length';
  } else if (Buffer.byteLength(desc, 'utf8') > 65_535) {
    validationMessage = 'Description is too long';
  }

  if (validationMessage) {
    await removeUploadedCover(file);
    return res.status(400).json({ ok: false, message: validationMessage });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    let categoryId = null;
    if (category) {
      const [existing] = await conn.query(
        'SELECT category_id FROM categories WHERE category_name = ? LIMIT 1',
        [category]
      );
      if (existing.length) {
        categoryId = existing[0].category_id;
      } else {
        const [created] = await conn.query(
          'INSERT INTO categories (category_name) VALUES (?)',
          [category]
        );
        categoryId = created.insertId;
      }
    }

    const [result] = await conn.query(
      `INSERT INTO books
        (title, author_name, isbn, category_id, price, stock_quantity, description, cover_image_url, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [title, author || null, isbn || null, categoryId, price, stock, desc || null, coverPath]
    );
    await conn.commit();
    return res.status(201).json({ ok: true, id: String(result.insertId), cover: coverPath });
  } catch (error) {
    await rollbackQuietly(conn);
    await removeUploadedCover(file);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        ok: false,
        message: 'Unable to create product',
        error: 'This ISBN already exists',
      });
    }
    return sendProductError(res, error, 'Failed to create product');
  } finally {
    if (conn) conn.release();
  }
});

router.patch('/:id', authenticate, allowRoles('admin'), async (req, res) => {
  const productId = positiveInteger(req.params.id);
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const stock = Number(body.stock);
  if (!productId || body.stock === undefined || String(body.stock).trim() === '' || !validStock(stock)) {
    return res.status(400).json({
      ok: false,
      message: 'Stock must be a whole number between 0 and 2,147,483,647',
    });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [books] = await conn.query(
      `SELECT book_id
       FROM books
       WHERE book_id = ? AND is_active = TRUE
       LIMIT 1
       FOR UPDATE`,
      [productId]
    );
    if (!books.length) throw new ProductError(404, 'Product not found');

    const [reservationRows] = await conn.query(`
      SELECT COALESCE(SUM(oi.quantity), 0) AS reserved_quantity
      FROM order_items oi
        JOIN orders o ON o.order_id = oi.order_id
      WHERE oi.book_id = ?
        AND o.order_status IN ('pending', 'paid')`, [productId]);
    const reserved = Number(reservationRows[0]?.reserved_quantity || 0);
    if (stock < reserved) {
      throw new ProductError(
        409,
        `Stock cannot be lower than the ${reserved} units reserved by active orders`,
        { reserved, minimumStock: reserved }
      );
    }

    await conn.query(
      'UPDATE books SET stock_quantity = ? WHERE book_id = ?',
      [stock, productId]
    );
    await conn.commit();
    return res.json({ ok: true, stock, reserved, availableStock: stock - reserved });
  } catch (error) {
    await rollbackQuietly(conn);
    return sendProductError(res, error, 'Failed to update product');
  } finally {
    if (conn) conn.release();
  }
});

router.delete('/:id', authenticate, allowRoles('admin'), async (req, res) => {
  const productId = positiveInteger(req.params.id);
  if (!productId) return res.status(400).json({ ok: false, message: 'Invalid product ID' });

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [books] = await conn.query(
      `SELECT book_id
       FROM books
       WHERE book_id = ? AND is_active = TRUE
       LIMIT 1
       FOR UPDATE`,
      [productId]
    );
    if (!books.length) throw new ProductError(404, 'Product not found');

    await conn.query('UPDATE books SET is_active = FALSE WHERE book_id = ?', [productId]);
    await conn.query('DELETE FROM cart_items WHERE book_id = ?', [productId]);
    await conn.query('DELETE FROM favorites WHERE book_id = ?', [productId]);
    await conn.commit();
    return res.json({
      ok: true,
      message: 'Product was deactivated; historical order items were preserved',
    });
  } catch (error) {
    await rollbackQuietly(conn);
    return sendProductError(res, error, 'Failed to deactivate product');
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
