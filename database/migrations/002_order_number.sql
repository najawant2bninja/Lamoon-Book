USE lamoonbook_db;

-- Run once on an existing database. New installations already receive this
-- column and unique key from database/init.sql. The numeric order_id remains
-- the internal PK used by foreign keys.
ALTER TABLE orders
    ADD COLUMN order_number VARCHAR(32)
        CHARACTER SET ascii COLLATE ascii_bin NULL AFTER order_id;

-- Backfill old orders with ORD + date/time + milliseconds placeholder + the
-- internal ID. Every character after ORD is numeric and the ID suffix makes
-- the result unique even when old orders share the same second.
UPDATE orders
SET order_number = CONCAT(
    'ORD',
    DATE_FORMAT(COALESCE(order_date, CURRENT_TIMESTAMP), '%Y%m%d%H%i%s'),
    '000',
    LPAD(order_id, 10, '0')
)
WHERE order_number IS NULL OR order_number = '';

ALTER TABLE orders
    MODIFY COLUMN order_number VARCHAR(32)
        CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    ADD UNIQUE KEY uq_orders_order_number (order_number);
