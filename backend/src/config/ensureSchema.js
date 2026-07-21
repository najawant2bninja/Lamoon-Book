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

async function hasIndex(connection, databaseName, tableName, indexName) {
  const [rows] = await connection.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?
     LIMIT 1`,
    [databaseName, tableName, indexName]
  );

  return rows.length > 0;
}

async function isNullableColumn(connection, databaseName, tableName, columnName) {
  const [rows] = await connection.query(
    `SELECT IS_NULLABLE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [databaseName, tableName, columnName]
  );

  return rows[0]?.IS_NULLABLE === 'YES';
}

function quoteIdentifier(value) {
  return `\`${String(value).replace(/`/g, '``')}\``;
}

async function getForeignKeysForColumn(connection, databaseName, tableName, columnName) {
  const [rows] = await connection.query(
    `SELECT k.CONSTRAINT_NAME AS constraint_name,
            k.REFERENCED_TABLE_NAME AS referenced_table,
            k.REFERENCED_COLUMN_NAME AS referenced_column,
            r.DELETE_RULE AS delete_rule
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
     JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS r
       ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
      AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
      AND r.TABLE_NAME = k.TABLE_NAME
     WHERE k.TABLE_SCHEMA = ?
       AND k.TABLE_NAME = ?
       AND k.COLUMN_NAME = ?
       AND k.REFERENCED_TABLE_NAME IS NOT NULL`,
    [databaseName, tableName, columnName]
  );
  return rows;
}

async function ensureRestrictForeignKey(
  connection,
  databaseName,
  { tableName, columnName, referencedTable, referencedColumn, constraintName }
) {
  const rows = await getForeignKeysForColumn(connection, databaseName, tableName, columnName);
  const matching = rows.find(row =>
    row.referenced_table === referencedTable
    && row.referenced_column === referencedColumn
    && row.delete_rule === 'RESTRICT'
  );
  if (matching) return;

  for (const row of rows) {
    await connection.query(
      `ALTER TABLE ${quoteIdentifier(tableName)} DROP FOREIGN KEY ${quoteIdentifier(row.constraint_name)}`
    );
  }

  await connection.query(
    `ALTER TABLE ${quoteIdentifier(tableName)}
     ADD CONSTRAINT ${quoteIdentifier(constraintName)}
     FOREIGN KEY (${quoteIdentifier(columnName)})
     REFERENCES ${quoteIdentifier(referencedTable)} (${quoteIdentifier(referencedColumn)})
     ON DELETE RESTRICT
     ON UPDATE CASCADE`
  );
}

async function hasConstraint(connection, databaseName, tableName, constraintName) {
  const [rows] = await connection.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = ?
       AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ?
     LIMIT 1`,
    [databaseName, tableName, constraintName]
  );
  return rows.length > 0;
}

/**
 * Applies backward-compatible schema upgrades required by the application.
 * This lets an existing development database start without
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

    const bookColumns = await getColumnNames(connection, databaseName, 'books');
    if (bookColumns.size === 0) {
      throw new Error('The books table is missing; run database/init.sql first');
    }

    // Existing books remain visible. New deletions are soft deletes so order
    // items and sales history never disappear with a catalogue item.
    if (!bookColumns.has('is_active')) {
      await connection.query(
        'ALTER TABLE books ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER stock_quantity'
      );
    }

    if (!(await hasConstraint(connection, databaseName, 'books', 'chk_books_price_positive'))) {
      await connection.query(
        'ALTER TABLE books ADD CONSTRAINT chk_books_price_positive CHECK (price > 0)'
      );
    }

    if (await hasConstraint(connection, databaseName, 'books', 'chk_books_price_nonnegative')) {
      await connection.query(
        'ALTER TABLE books DROP CHECK chk_books_price_nonnegative'
      );
    }

    if (!(await hasConstraint(connection, databaseName, 'books', 'chk_books_stock_nonnegative'))) {
      await connection.query(
        'ALTER TABLE books ADD CONSTRAINT chk_books_stock_nonnegative CHECK (stock_quantity >= 0)'
      );
    }

    const orderColumns = await getColumnNames(connection, databaseName, 'orders');
    if (orderColumns.size === 0) {
      throw new Error('The orders table is missing; run database/init.sql first');
    }

    // Keep order_id as the internal numeric PK/FK and expose a separate,
    // immutable public number such as ORD1784700123456123456.
    if (!orderColumns.has('order_number')) {
      await connection.query(
        `ALTER TABLE orders
         ADD COLUMN order_number VARCHAR(32)
         CHARACTER SET ascii COLLATE ascii_bin NULL AFTER order_id`
      );
    }

    // Existing rows predate public order numbers. The timestamp portion is
    // followed by the internal ID, so the backfill is deterministic and unique.
    await connection.query(
      `UPDATE orders
       SET order_number = CONCAT(
         'ORD',
         DATE_FORMAT(COALESCE(order_date, CURRENT_TIMESTAMP), '%Y%m%d%H%i%s'),
         '000',
         LPAD(order_id, 10, '0')
       )
       WHERE order_number IS NULL OR order_number = ''`
    );

    if (!(await hasIndex(connection, databaseName, 'orders', 'uq_orders_order_number'))) {
      await connection.query(
        'ALTER TABLE orders ADD UNIQUE KEY uq_orders_order_number (order_number)'
      );
    }

    if (await isNullableColumn(connection, databaseName, 'orders', 'order_number')) {
      await connection.query(
        `ALTER TABLE orders
         MODIFY COLUMN order_number VARCHAR(32)
         CHARACTER SET ascii COLLATE ascii_bin NOT NULL`
      );
    }

    const orderItemColumns = await getColumnNames(connection, databaseName, 'order_items');
    if (orderItemColumns.size === 0) {
      throw new Error('The order_items table is missing; run database/init.sql first');
    }

    await ensureRestrictForeignKey(connection, databaseName, {
      tableName: 'orders',
      columnName: 'address_id',
      referencedTable: 'shipping_addresses',
      referencedColumn: 'address_id',
      constraintName: 'fk_orders_address',
    });
    await ensureRestrictForeignKey(connection, databaseName, {
      tableName: 'order_items',
      columnName: 'book_id',
      referencedTable: 'books',
      referencedColumn: 'book_id',
      constraintName: 'fk_order_items_book',
    });
  } finally {
    connection.release();
  }
}

module.exports = ensureSchema;
