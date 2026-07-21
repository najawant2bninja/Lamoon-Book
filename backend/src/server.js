require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const allowedOrigins = String(process.env.CORS_ORIGIN || '*')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
}));
app.use(express.json({ limit: '10mb' }));
app.use('/assets', express.static(path.join(__dirname, '../..', 'bookstore_website', 'assets')));

app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 as ok');
    res.json({ ok: true, db: rows[0]?.ok === 1, message: 'Lamoonbook backend is running' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Database connection failed', error: error.message });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/shipping', require('./routes/shipping'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/addresses', require('./routes/addresses'));
app.use('/api/users', require('./routes/users'));
app.use('/api/support', require('./routes/support'));

app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'API endpoint not found' });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ ok: false, message: 'Unexpected server error', error: error.message });
});

app.listen(PORT, () => {
  console.log(`Lamoonbook backend listening on http://localhost:${PORT}`);
});
