const express = require('express');
const pool = require('../config/db');
const { hashPassword, verifyPassword } = require('../utils/password');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ ok: false, message: 'email and password are required' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT user_id, username, email, password_hash, full_name, phone, role
       FROM users
       WHERE email = ? LIMIT 1`,
      [email]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ ok: false, message: 'Invalid email or password' });
    }

    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ ok: false, message: 'Invalid email or password' });
    }

    res.json({
      ok: true,
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Login failed', error: error.message });
  }
});

router.post('/register', async (req, res) => {
  const { username, email, password, fullName, phone } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ ok: false, message: 'username, email, and password are required' });
  }

  try {
    const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ ok: false, message: 'Email already exists' });
    }

    const passwordHash = await hashPassword(password);
    const [result] = await pool.query(
      `INSERT INTO users (username, email, password_hash, full_name, phone, role)
       VALUES (?, ?, ?, ?, ?, 'member')`,
      [username, email, passwordHash, fullName || null, phone || null]
    );

    res.status(201).json({
      ok: true,
      userId: result.insertId,
      user: { id: result.insertId, username, email, fullName: fullName || username, phone: phone || '', role: 'member' },
      message: 'User registered successfully',
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Registration failed', error: error.message });
  }
});

module.exports = router;
