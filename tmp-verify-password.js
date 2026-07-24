const http = require('http');
const mysql = require('mysql2/promise');
const { verifyPassword } = require('./backend/src/utils/password');

(async () => {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'lamoonbook',
    password: 'lamoonbook123',
    database: 'lamoonbook_db'
  });

  const [rows] = await pool.query('SELECT user_id, email, password_hash FROM users WHERE email = ? LIMIT 1', ['admin@lamoonbook.com']);
  const user = rows[0];
  console.log('user', user?.user_id, user?.email);

  for (const candidate of ['123456', '1234567', 'admin123', 'lamoonbook123', 'password', '123123']) {
    const ok = await verifyPassword(candidate, user?.password_hash);
    if (ok) {
      console.log('matched password', candidate);
      break;
    }
  }

  const payload = JSON.stringify({ currentPassword: '123456', newPassword: 'newpass123' });
  const res = await new Promise((resolve, reject) => {
    const req = http.request({ host: 'localhost', port: 3000, path: '/api/users/1/password', method: 'POST', headers: { 'Content-Type': 'application/json' } }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve({ statusCode: response.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  console.log('response', res);
  const [updatedRows] = await pool.query('SELECT password_hash FROM users WHERE user_id = 1 LIMIT 1');
  const newHash = updatedRows[0].password_hash;
  const oldOk = await verifyPassword('123456', newHash);
  const newOk = await verifyPassword('newpass123', newHash);
  console.log('verify after change', { oldOk, newOk });

  await pool.query('UPDATE users SET password_hash = ? WHERE user_id = 1', [user.password_hash]);
  await pool.end();
})();
