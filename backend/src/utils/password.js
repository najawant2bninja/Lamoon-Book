const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const [algorithm, salt, key] = String(storedHash).split('$');
  if (algorithm !== 'scrypt' || !salt || !key) return false;
  const derivedKey = await scrypt(password, salt, 64);
  const storedKey = Buffer.from(key, 'hex');
  return storedKey.length === derivedKey.length && crypto.timingSafeEqual(storedKey, derivedKey);
}

module.exports = { hashPassword, verifyPassword };
