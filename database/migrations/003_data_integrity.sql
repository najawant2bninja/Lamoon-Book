USE lamoonbook_db;

-- Safe, repeatable upgrade for databases created before catalogue soft-delete
-- and historical-order protection were introduced. No business rows are
-- deleted or rewritten by this migration.
DELIMITER $$

DROP PROCEDURE IF EXISTS migrate_003_data_integrity$$
CREATE PROCEDURE migrate_003_data_integrity()
BEGIN
    DECLARE fk_name VARCHAR(64) DEFAULT NULL;
    DECLARE fk_rule VARCHAR(30) DEFAULT NULL;
    DECLARE fk_ref_table VARCHAR(64) DEFAULT NULL;
    DECLARE fk_ref_column VARCHAR(64) DEFAULT NULL;

    IF NOT EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'books'
          AND COLUMN_NAME = 'is_active'
    ) THEN
        ALTER TABLE books
            ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER stock_quantity;
    END IF;

    IF EXISTS (SELECT 1 FROM books WHERE price <= 0 LIMIT 1) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot add price constraint: books contains a non-positive price';
    END IF;

    IF EXISTS (SELECT 1 FROM books WHERE stock_quantity < 0 LIMIT 1) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot add stock constraint: books contains negative stock';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
          AND TABLE_NAME = 'books'
          AND CONSTRAINT_NAME = 'chk_books_price_positive'
    ) THEN
        ALTER TABLE books
            ADD CONSTRAINT chk_books_price_positive CHECK (price > 0);
    END IF;

    IF EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
          AND TABLE_NAME = 'books'
          AND CONSTRAINT_NAME = 'chk_books_price_nonnegative'
    ) THEN
        ALTER TABLE books DROP CHECK chk_books_price_nonnegative;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
          AND TABLE_NAME = 'books'
          AND CONSTRAINT_NAME = 'chk_books_stock_nonnegative'
    ) THEN
        ALTER TABLE books
            ADD CONSTRAINT chk_books_stock_nonnegative CHECK (stock_quantity >= 0);
    END IF;

    SELECT MAX(k.CONSTRAINT_NAME), MAX(r.DELETE_RULE),
           MAX(k.REFERENCED_TABLE_NAME), MAX(k.REFERENCED_COLUMN_NAME)
      INTO fk_name, fk_rule, fk_ref_table, fk_ref_column
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
    JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS r
      ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
     AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
     AND r.TABLE_NAME = k.TABLE_NAME
    WHERE k.TABLE_SCHEMA = DATABASE()
      AND k.TABLE_NAME = 'orders'
      AND k.COLUMN_NAME = 'address_id'
      AND k.REFERENCED_TABLE_NAME IS NOT NULL;

    IF fk_name IS NOT NULL AND (
        fk_rule <> 'RESTRICT'
        OR fk_ref_table <> 'shipping_addresses'
        OR fk_ref_column <> 'address_id'
    ) THEN
        SET @ddl = CONCAT(
            'ALTER TABLE `orders` DROP FOREIGN KEY `',
            REPLACE(fk_name, '`', '``'),
            '`'
        );
        PREPARE migration_statement FROM @ddl;
        EXECUTE migration_statement;
        DEALLOCATE PREPARE migration_statement;
        SET fk_name = NULL;
    END IF;

    IF fk_name IS NULL THEN
        ALTER TABLE orders
            ADD CONSTRAINT fk_orders_address
            FOREIGN KEY (address_id) REFERENCES shipping_addresses(address_id)
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;

    SET fk_name = NULL;
    SET fk_rule = NULL;
    SET fk_ref_table = NULL;
    SET fk_ref_column = NULL;

    SELECT MAX(k.CONSTRAINT_NAME), MAX(r.DELETE_RULE),
           MAX(k.REFERENCED_TABLE_NAME), MAX(k.REFERENCED_COLUMN_NAME)
      INTO fk_name, fk_rule, fk_ref_table, fk_ref_column
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
    JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS r
      ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
     AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
     AND r.TABLE_NAME = k.TABLE_NAME
    WHERE k.TABLE_SCHEMA = DATABASE()
      AND k.TABLE_NAME = 'order_items'
      AND k.COLUMN_NAME = 'book_id'
      AND k.REFERENCED_TABLE_NAME IS NOT NULL;

    IF fk_name IS NOT NULL AND (
        fk_rule <> 'RESTRICT'
        OR fk_ref_table <> 'books'
        OR fk_ref_column <> 'book_id'
    ) THEN
        SET @ddl = CONCAT(
            'ALTER TABLE `order_items` DROP FOREIGN KEY `',
            REPLACE(fk_name, '`', '``'),
            '`'
        );
        PREPARE migration_statement FROM @ddl;
        EXECUTE migration_statement;
        DEALLOCATE PREPARE migration_statement;
        SET fk_name = NULL;
    END IF;

    IF fk_name IS NULL THEN
        ALTER TABLE order_items
            ADD CONSTRAINT fk_order_items_book
            FOREIGN KEY (book_id) REFERENCES books(book_id)
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;
END$$

CALL migrate_003_data_integrity()$$
DROP PROCEDURE migrate_003_data_integrity$$

DELIMITER ;
