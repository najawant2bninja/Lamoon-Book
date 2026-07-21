const crypto = require('crypto');
const pool = require('../config/db');

function hashToken(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function readBearerToken(req) {
  const authorization = req.get('authorization');
  if (!authorization) return null;

  const match = authorization.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}

async function authenticate(req, res, next) {
  const token = readBearerToken(req);
  if (!token) {
    return res.status(401).json({ ok: false, message: 'Authentication required' });
  }

  try {
    const tokenHash = hashToken(token);
    const [rows] = await pool.query(
      `SELECT
         s.session_id,
         s.expires_at,
         u.user_id,
         u.username,
         u.email,
         u.full_name,
         u.phone,
         u.role
       FROM auth_sessions AS s
       INNER JOIN users AS u ON u.user_id = s.user_id
       WHERE s.token_hash = ?
         AND s.revoked_at IS NULL
         AND s.expires_at > CURRENT_TIMESTAMP
         AND u.is_active = TRUE
       LIMIT 1`,
      [tokenHash]
    );

    const session = rows[0];
    if (!session) {
      return res.status(401).json({ ok: false, message: 'Invalid or expired session' });
    }

    req.user = {
      id: session.user_id,
      username: session.username,
      email: session.email,
      fullName: session.full_name,
      phone: session.phone,
      role: session.role,
    };
    req.auth = {
      sessionId: session.session_id,
      expiresAt: session.expires_at,
    };

    // This timestamp is informational and must not prevent an otherwise valid
    // authenticated request from completing.
    pool.query(
      'UPDATE auth_sessions SET last_used_at = CURRENT_TIMESTAMP WHERE session_id = ?',
      [session.session_id]
    ).catch(() => {});

    return next();
  } catch (error) {
    return next(error);
  }
}

function allowRoles(...roles) {
  const allowedRoles = new Set(roles.flat());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, message: 'Authentication required' });
    }

    if (!allowedRoles.has(req.user.role)) {
      return res.status(403).json({ ok: false, message: 'You do not have permission to perform this action' });
    }

    return next();
  };
}

module.exports = { authenticate, allowRoles };
