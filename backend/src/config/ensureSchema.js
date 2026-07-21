const pool = require('./db');

async function getColumnNames(connection, databaseName, tableName) {
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [databaseName, tableName]
  );

  return new Set(rows.map(row => row.COLUMN_NAME));
}

async function hasCreatedByForeignKey(connection, databaseName) {
  const [rows] = await connection.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'created_by'
       AND REFERENCED_TABLE_NAME = 'users'
       AND REFERENCED_COLUMN_NAME = 'user_id'
     LIMIT 1`,
    [databaseName]
  );

  return rows.length > 0;
}

/**
 * Applies the small, backward-compatible auth schema upgrade required by the
 * application. This lets an existing development database start without
 * having to re-run the destructive database/init.sql seed script.
 */
async function ensureSchema() {
  const connection = await pool.getConnection();

  try {
    const [databaseRows] = await connection.query('SELECT DATABASE() AS database_name');
    const databaseName = databaseRows[0]?.database_name;
    if (!databaseName) {
      throw new Error('No MySQL database is selected');
    }

    const columns = await getColumnNames(connection, databaseName, 'users');
    if (columns.size === 0) {
      throw new Error('The users table is missing; run database/init.sql first');
    }

    if (!columns.has('is_active')) {
      await connection.query(
        'ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER role'
      );
    }

    if (!columns.has('created_by')) {
      await connection.query(
        'ALTER TABLE users ADD COLUMN created_by INT NULL AFTER is_active'
      );
    }

    if (!columns.has('updated_at')) {
      await connection.query(
        `ALTER TABLE users
         ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
         ON UPDATE CURRENT_TIMESTAMP AFTER created_at`
      );
    }

    if (!columns.has('deactivated_at')) {
      await connection.query(
        'ALTER TABLE users ADD COLUMN deactivated_at DATETIME NULL AFTER updated_at'
      );
    }

    if (!(await hasCreatedByForeignKey(connection, databaseName))) {
      await connection.query(
        `ALTER TABLE users
         ADD CONSTRAINT fk_users_created_by
         FOREIGN KEY (created_by) REFERENCES users(user_id)
         ON DELETE SET NULL
         ON UPDATE CASCADE`
      );
    }

    await connection.query(
      `CREATE TABLE IF NOT EXISTS auth_sessions (
        session_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        last_used_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        revoked_at DATETIME NULL,
        UNIQUE KEY uq_auth_sessions_token_hash (token_hash),
        KEY idx_auth_sessions_user (user_id),
        KEY idx_auth_sessions_expiry (expires_at),
        CONSTRAINT fk_auth_sessions_user
          FOREIGN KEY (user_id) REFERENCES users(user_id)
          ON DELETE CASCADE
          ON UPDATE CASCADE
      ) ENGINE=InnoDB`
    );
  } finally {
    connection.release();
  }
}

module.exports = ensureSchema;
