const express = require('express');
const crypto = require('crypto');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { hashPassword, verifyPassword } = require('../utils/password');

const router = express.Router();
const DEFAULT_SESSION_TTL_HOURS = 24;

function safeUser(user) {
  return {
    id: user.user_id,
    username: user.username,
    email: user.email,
    fullName: user.full_name,
    phone: user.phone,
    role: user.role,
  };
}

function createSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function getSessionTtlHours() {
  const configuredTtl = Number(process.env.AUTH_SESSION_TTL_HOURS);
  if (!Number.isFinite(configuredTtl) || configuredTtl <= 0) {
    return DEFAULT_SESSION_TTL_HOURS;
  }
  return Math.min(configuredTtl, 24 * 365);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post('/login', async (req, res) => {
  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const password = body.password;

  if (!email || typeof password !== 'string' || !password) {
    return res.status(400).json({ ok: false, message: 'email and password are required' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT user_id, username, email, password_hash, full_name, phone, role, is_active
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

    if (!user.is_active) {
      return res.status(403).json({ ok: false, message: 'This account is inactive' });
    }

    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    const expiresAt = new Date(Date.now() + getSessionTtlHours() * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO auth_sessions (user_id, token_hash, expires_at)
       VALUES (?, ?, ?)`,
      [user.user_id, tokenHash, expiresAt]
    );

    res.set('Cache-Control', 'no-store');
    return res.json({
      ok: true,
      token,
      tokenType: 'Bearer',
      expiresAt: expiresAt.toISOString(),
      user: safeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Login failed', error: error.message });
  }
});

router.get('/me', authenticate, (req, res) => {
  res.set('Cache-Control', 'no-store');
  return res.json({ ok: true, user: req.user });
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE auth_sessions
       SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
       WHERE session_id = ?`,
      [req.auth.sessionId]
    );
    return res.json({ ok: true, message: 'Logged out successfully' });
  } catch (error) {
    return next(error);
  }
});

router.post('/register', async (req, res) => {
  const body = req.body || {};
  const username = String(body.username || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const { password, fullName, phone } = body;

  if (!username || !email || !password) {
    return res.status(400).json({ ok: false, message: 'username, email, and password are required' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, message: 'Invalid email format' });
  }

  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ ok: false, message: 'Password must be at least 8 characters' });
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

    return res.status(201).json({
      ok: true,
      userId: result.insertId,
      user: { id: result.insertId, username, email, fullName: fullName || username, phone: phone || '', role: 'member' },
      message: 'User registered successfully',
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ ok: false, message: 'Email already exists' });
    }
    return res.status(500).json({ ok: false, message: 'Registration failed', error: error.message });
  }
});

module.exports = router;
