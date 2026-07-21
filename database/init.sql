CREATE DATABASE IF NOT EXISTS lamoonbook_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE lamoonbook_db;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS auth_sessions;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS payment_methods;
DROP TABLE IF EXISTS order_status_history;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS shipping_addresses;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS shipping_rate_tiers;
DROP TABLE IF EXISTS shipping_methods;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    role ENUM('guest','member','staff','admin') DEFAULT 'member',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deactivated_at DATETIME NULL,
    CONSTRAINT fk_users_created_by
        FOREIGN KEY (created_by) REFERENCES users(user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE TABLE auth_sessions (
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
);

CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL
);

CREATE TABLE books (
    book_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author_name VARCHAR(150),
    isbn VARCHAR(20) UNIQUE,
    category_id INT,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    description TEXT,
    cover_image_url VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_books_category
        FOREIGN KEY (category_id) REFERENCES categories(category_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE TABLE favorites (
    favorite_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_favorites_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_favorites_book
        FOREIGN KEY (book_id) REFERENCES books(book_id)
        ON DELETE CASCADE
);

CREATE TABLE carts (
    cart_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_carts_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE cart_items (
    cart_item_id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id INT NOT NULL,
    book_id INT NOT NULL,
    quantity INT DEFAULT 1,
    CONSTRAINT fk_cart_items_cart
        FOREIGN KEY (cart_id) REFERENCES carts(cart_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_book
        FOREIGN KEY (book_id) REFERENCES books(book_id)
        ON DELETE CASCADE
);

CREATE TABLE shipping_methods (
    shipping_method_id INT AUTO_INCREMENT PRIMARY KEY,
    method_name VARCHAR(50) NOT NULL,
    estimated_days INT
);

CREATE TABLE shipping_rate_tiers (
    tier_id INT AUTO_INCREMENT PRIMARY KEY,
    shipping_method_id INT NOT NULL,
    min_quantity INT NOT NULL,
    max_quantity INT NULL,
    price DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_shipping_rate_tiers_method
        FOREIGN KEY (shipping_method_id) REFERENCES shipping_methods(shipping_method_id)
        ON DELETE CASCADE
);

CREATE TABLE shipping_addresses (
    address_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    recipient_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address_detail VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_shipping_addresses_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    address_id INT NOT NULL,
    shipping_method_id INT NOT NULL,
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_price DECIMAL(10,2) NOT NULL,
    order_status ENUM('pending','paid','shipping','completed','cancelled') DEFAULT 'pending',
    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_orders_address
        FOREIGN KEY (address_id) REFERENCES shipping_addresses(address_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_orders_shipping
        FOREIGN KEY (shipping_method_id) REFERENCES shipping_methods(shipping_method_id)
        ON DELETE RESTRICT
);

CREATE TABLE order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    book_id INT NOT NULL,
    quantity INT NOT NULL,
    price_at_order DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_order_items_book
        FOREIGN KEY (book_id) REFERENCES books(book_id)
        ON DELETE CASCADE
);

CREATE TABLE order_status_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    updated_by INT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_history_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_order_history_user
        FOREIGN KEY (updated_by) REFERENCES users(user_id)
        ON DELETE SET NULL
);

CREATE TABLE payment_methods (
    payment_method_id INT AUTO_INCREMENT PRIMARY KEY,
    method_name VARCHAR(50) NOT NULL
);

CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    payment_method_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    qr_code_ref VARCHAR(255),
    proof_image_url MEDIUMTEXT,
    payment_status ENUM('pending','awaiting_verification','success','failed') DEFAULT 'pending',
    verified_by INT NULL,
    verified_at DATETIME NULL,
    paid_at DATETIME,
    CONSTRAINT fk_payments_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_payments_method
        FOREIGN KEY (payment_method_id) REFERENCES payment_methods(payment_method_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_payments_verified
        FOREIGN KEY (verified_by) REFERENCES users(user_id)
        ON DELETE SET NULL
);

CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_id INT,
    type ENUM('payment','shipping') NOT NULL,
    message VARCHAR(255) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_notifications_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE SET NULL
);

CREATE TABLE support_tickets (
    ticket_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    email VARCHAR(100) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('open','resolved') DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_support_tickets_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE SET NULL
);

ALTER TABLE payments MODIFY COLUMN proof_image_url LONGTEXT;

INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES
('admin', 'admin@lamoonbook.com', 'scrypt$11f41c088f7ea03a47e50a741c3601a2$b99ee44d672a62e511b6d5fa59494ad34ad37e3ffdca5728524a9ef6ca04a395995e4fd2fb3442efdbc3cf91388b03c5879bf747c641705c70d995cbf0cfc82a', 'Administrator', '0812345678', 'admin'),
('member01', 'member01@lamoonbook.com', 'scrypt$11f41c088f7ea03a47e50a741c3601a2$b99ee44d672a62e511b6d5fa59494ad34ad37e3ffdca5728524a9ef6ca04a395995e4fd2fb3442efdbc3cf91388b03c5879bf747c641705c70d995cbf0cfc82a', 'Member One', '0823456789', 'member');

INSERT INTO categories (category_name) VALUES
('นิยายแฟนตาซี'),
('มังงะแอ็กชัน'),
('การ์ตูนความรู้'),
('วรรณกรรมไทย'),
('การลงทุน'),
('จิตวิทยา'),
('โลจิสติกส์'),
('นิยายแปลเกาหลี'),
('การเงินและการลงทุน');

INSERT INTO books (title, author_name, isbn, category_id, price, stock_quantity, description, cover_image_url, created_at) VALUES
('อ่านชะตาวันสิ้นโลก เล่ม 1', 'Sing N song', '978616000001', 1, 285.00, 146, 'เรื่องราวของชายผู้เป็นผู้อ่านนิยายเพียงคนเดียวที่รู้อนาคตของโลก เมื่อเหตุการณ์ในนิยายกลายเป็นความจริง เขาต้องใช้ความรู้ทั้งหมดเพื่อเอาชีวิตรอด', 'assets/cover/b001.jpg', '2026-01-03 09:00:00'),
('อ่านชะตาวันสิ้นโลก เล่ม 2', 'Sing N song', '978616000002', 1, 320.00, 82, 'การเดินทางดำเนินต่อท่ามกลางบททดสอบที่ยากขึ้น พร้อมการเปิดเผยความลับของโลกและการเผชิญหน้ากับศัตรูที่แข็งแกร่งกว่าเดิม', 'assets/cover/b002.jpg', '2026-01-06 09:00:00'),
('อ่านชะตาวันสิ้นโลก เล่ม 3', 'Sing N song', '978616000003', 1, 245.00, 64, 'เรื่องราวเข้าสู่ช่วงเข้มข้น เมื่อการตัดสินใจของตัวเอกส่งผลต่อชะตากรรมของผู้คนและอนาคตของโลกทั้งใบ', 'assets/cover/b003.jpg', '2026-01-10 09:00:00'),
('Hunter × Hunter เล่ม 1', 'โยชิฮิโระ โทงาชิ', '978616000004', 2, 390.00, 190, 'เรื่องราวการออกเดินทางของกอร์น ฟรีคส์ เด็กหนุ่มผู้มุ่งมั่นที่จะเป็นฮันเตอร์และตามหาพ่อของเขา', 'assets/cover/b004.jpg', '2026-01-14 09:00:00'),
('Hunter × Hunter เล่ม 2', 'โยชิฮิโระ โทงาชิ', '978616000005', 2, 210.00, 112, 'การทดสอบฮันเตอร์ดำเนินต่อไป พร้อมมิตรภาพและอุปสรรคที่ผู้เข้าสอบต้องเผชิญ', 'assets/cover/b005.jpg', '2026-01-17 09:00:00'),
('Hunter × Hunter เล่ม 3', 'โยชิฮิโระ โทงาชิ', '978616000006', 2, 430.00, 72, 'การเดินทางของกอร์น คิรัว คุราปิก้า และเลโอริโอ เข้าสู่บททดสอบที่ยากลำบากยิ่งขึ้น', 'assets/cover/b006.jpg', '2026-01-21 09:00:00'),
('Hunter × Hunter เล่ม 4', 'โยชิฮิโระ โทงาชิ', '978616000007', 2, 299.00, 58, 'การผจญภัยดำเนินต่อพร้อมการเผชิญหน้ากับศัตรูและความท้าทายใหม่ในการเป็นฮันเตอร์', 'assets/cover/b007.jpg', '2026-01-25 09:00:00'),
('ไม่ยากถ้าอยากมีมารยาทดี', 'ปัก ฮย็อนจ็อง', '978616000008', 3, 179.00, 128, 'หนังสือการ์ตูนความรู้ที่สอนเรื่องมารยาทในชีวิตประจำวัน ผ่านเรื่องราวสนุก เข้าใจง่าย เหมาะสำหรับผู้อ่านทุกวัย', 'assets/cover/b008.jpg', '2026-01-29 09:00:00'),
('ศรีธนญชัย', 'สุพรรณิการ์', '978616000009', 4, 259.00, 95, 'วรรณกรรมไทยคลาสสิกที่ถ่ายทอดเรื่องราวของศรีธนญชัย ผู้มีไหวพริบและปฏิภาณในการแก้ปัญหาด้วยอุบายและสติปัญญา', 'assets/cover/b009.jpg', '2026-02-02 09:00:00'),
('เทรดแบบกราฟเปล่า ทำกำไรด้วยแท่งเทียน', 'ลภัสรดา เพ็งสุข', '978616000010', 5, 399.00, 68, 'แนะนำการวิเคราะห์กราฟแท่งเทียนเพื่อการลงทุน เหมาะสำหรับผู้เริ่มต้นและผู้ที่ต้องการพัฒนาทักษะการเทรดในตลาดหุ้น คริปโต และฟอเร็กซ์', 'assets/cover/b010.jpg', '2026-02-06 09:00:00'),
('จิตวิทยาสายดาร์ก', 'Dr.Hiro', '978616000011', 6, 295.00, 84, 'หนังสือที่อธิบายหลักจิตวิทยาเกี่ยวกับการสื่อสาร การโน้มน้าวใจ และการทำความเข้าใจพฤติกรรมของผู้คน พร้อมยกตัวอย่างสถานการณ์ที่พบได้ในชีวิตประจำวัน', 'assets/cover/b011.jpg', '2026-02-10 09:00:00'),
('โลจิสติกส์-โซ่อุปทาน : การออกแบบและจัดการเบื้องต้น', 'รศ.ดร. ประจวบ กล่อมจิตร', '978616000012', 7, 349.00, 76, 'หนังสือแนะนำพื้นฐานด้านโลจิสติกส์และการจัดการโซ่อุปทาน ครอบคลุมการออกแบบระบบ การขนส่ง การจัดเก็บสินค้า และการบริหารกระบวนการเพื่อเพิ่มประสิทธิภาพขององค์กร', 'assets/cover/b012.jpg', '2026-02-14 09:00:00'),
('ผมคนนี้อยากหนีจากบทพระรอง', 'Sleepy-C', '978616000013', 8, 430.00, 54, 'นิยายแฟนตาซีโรแมนซ์ที่เล่าเรื่องของตัวละครผู้ตื่นขึ้นมาในโลกนิยายและพบว่าตัวเองได้รับบทเป็นพระรอง เขาจึงพยายามเปลี่ยนชะตากรรมและหลีกเลี่ยงเส้นทางเดิมของเรื่องราว', 'assets/cover/b013.jpg', '2026-02-18 09:00:00'),
('มั่งคั่งทั้งชีวิต (Money Mastery)', 'ภัทรพล ศิลปาจารย์', '978616000014', 9, 395.00, 87, 'หนังสือที่รวบรวมแนวคิดด้านการเงิน การลงทุน และการวางแผนชีวิต เพื่อสร้างความมั่งคั่งทั้งด้านเงิน เวลา และสุขภาพ เหมาะสำหรับผู้ที่ต้องการพัฒนาวินัยทางการเงินและสร้างความมั่นคงในระยะยาว', 'assets/cover/b014.jpg', '2026-02-22 09:00:00'),
('Money 101 เริ่มต้นนับหนึ่งสู่ชีวิตการเงินอุดมสุข', 'จักรพงษ์ เมษพันธุ์ (The Money Coach)', '978616000015', 9, 325.00, 102, 'คู่มือพื้นฐานด้านการเงินส่วนบุคคล ครอบคลุมการวางแผนรายรับรายจ่าย การออม การลงทุน และการบริหารหนี้ เหมาะสำหรับผู้ที่ต้องการเริ่มต้นสร้างความมั่นคงทางการเงิน', 'assets/cover/b015.jpg', '2026-02-26 09:00:00');

INSERT INTO shipping_methods (method_name, estimated_days) VALUES
('Standard', 3),
('Express', 1);

INSERT INTO shipping_rate_tiers (shipping_method_id, min_quantity, max_quantity, price) VALUES
(1, 1, 3, 45.00),
(1, 4, 10, 70.00),
(1, 11, 30, 110.00),
(1, 31, 49, 160.00),
(1, 50, NULL, 0.00),
(2, 1, 3, 90.00),
(2, 4, 10, 120.00),
(2, 11, 30, 180.00),
(2, 31, 49, 250.00),
(2, 50, NULL, 0.00);

INSERT INTO payment_methods (method_name) VALUES
('PromptPay'),
('Bank Transfer'),
('Cash on Delivery');
