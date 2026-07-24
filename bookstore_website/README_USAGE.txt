Lamoon Book - คู่มือเปิดระบบและทดสอบ

ส่วนประกอบของระบบ
- Frontend: HTML/CSS/JavaScript ในโฟลเดอร์ bookstore_website
- Backend: Node.js/Express ที่พอร์ต 3000
- Database: MySQL 8 ผ่าน Docker Compose
- รูปปกที่อัปโหลด: bookstore_website/assets/cover

เปิดระบบบนเครื่อง Server
1. เปิด Terminal ที่โฟลเดอร์หลักของโปรเจกต์
2. รัน: docker compose up -d --build
3. เปิดโฟลเดอร์โปรเจกต์ด้วย Live Server โดยตั้ง Host เป็น 0.0.0.0 และ Port เป็น 5501
4. เปิดหน้าเว็บ:
   http://localhost:5501/bookstore_website/index.html
5. ตรวจ Backend และ Database:
   http://localhost:3000/api/health
   ต้องได้ ok=true และ db=true

เปิดจากเครื่องอื่นในวง LAN
- หา IPv4 ของเครื่อง Server ด้วยคำสั่ง ipconfig
- เปิด http://<SERVER-IP>:5501/bookstore_website/index.html
- Frontend จะเรียก API ที่ http://<SERVER-IP>:3000/api อัตโนมัติ จึงไม่ต้องแก้ไฟล์เมื่อเปลี่ยนเครื่อง Server
- อนุญาตพอร์ต 5501 และ 3000 ใน Windows Firewall หากเครื่องอื่นเข้าไม่ได้

หมายเหตุสำคัญ
- ห้ามเปิดด้วย file:// หากต้องการทดสอบการบันทึกฐานข้อมูลครบทุกขั้นตอน
- ข้อมูลผู้ใช้ ตะกร้า รายการโปรด ออเดอร์ พนักงาน และสินค้าเก็บใน MySQL จริง
- หากย้ายเครื่องด้วย Git ต้อง add/commit ไฟล์ปกที่อัปโหลดด้วย หรือสำรองโฟลเดอร์ assets/cover แยกต่างหาก
- GitHub Pages เพียงอย่างเดียวไม่สามารถรัน Node.js/MySQL ของระบบนี้ได้ ต้องมี Backend ที่เข้าถึงได้ผ่านเครือข่ายด้วย

หน้าหลักสำหรับทดสอบ
- index.html: หน้าแรกและค้นหาหนังสือ
- products.html: รายการหนังสือและตัวกรอง
- favorites.html: รายการโปรด
- cart.html: ตะกร้าและจำนวนสินค้า
- checkout.html / payment.html: ที่อยู่ การจัดส่ง และชำระเงิน
- tracking.html: ประวัติและสถานะคำสั่งซื้อ
- staff.html: ตรวจชำระเงินและจัดส่ง
- admin.html: สินค้า พนักงาน และรายงาน
