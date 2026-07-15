(function () {
  const STORAGE = {
    products: 'bookStore_products_v2',
    users: 'bookStore_users_v2',
    current: 'bookStore_currentUser_v2',
    cart: 'bookStore_cart_v2',
    fav: 'bookStore_favorites_v2',
    orders: 'bookStore_orders_v2',
    staff: 'bookStore_staff_v2',
    addresses: 'bookStore_addresses_v2',
    checkoutDraft: 'bookStore_checkoutDraft_v2',
    selectedShipping: 'bookStore_selectedShipping_v2'
  };

  const icons = {
    book: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/></svg>',
    books: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5z"/><path d="M8 3v18"/><path d="M20 7v14"/></svg>',
    cart: '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>',
    search: '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    heart: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    heartFill: '<svg class="svg-icon fill" viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    user: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>',
    users: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
    truck: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M10 17h4V5H2v12h3"/><path d="M14 8h4l4 4v5h-3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/></svg>',
    package: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="m21 16-9 5-9-5V8l9-5 9 5z"/><path d="M3.3 7.5 12 12l8.7-4.5"/><path d="M12 22V12"/></svg>',
    card: '<svg class="svg-icon" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
    upload: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>',
    file: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>',
    check: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
    close: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    alert: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    chart: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 15v2"/><path d="M12 9v8"/><path d="M17 5v12"/></svg>',
    lineChart: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="m7 14 4-4 4 3 5-7"/></svg>',
    settings: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    mail: '<svg class="svg-icon" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    menu: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>',
    login: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/></svg>',
    bank: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="m3 10 9-7 9 7"/><path d="M5 10h14"/><path d="M6 10v8"/><path d="M10 10v8"/><path d="M14 10v8"/><path d="M18 10v8"/><path d="M4 18h16"/><path d="M3 22h18"/></svg>',
    filter: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M4 4h16l-6 7v6l-4 3v-9z"/></svg>',
    plus: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
    trash: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
    home: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="m3 10 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>'
  };
  function icon(name) { return icons[name] || icons.book; }


  const seedProducts = [
{ id: 'b001', title: 'อ่านชะตาวันสิ้นโลก เล่ม 1', author: 'Sing N song', category: 'นิยายแฟนตาซี', price: 285, stock: 146, status: 'available', cover: 'assets/cover/b001.jpg', createdAt: '2026-01-03T09:00:00.000Z', rating: 4.8, sold: 221, desc: 'เรื่องราวของชายผู้เป็นผู้อ่านนิยายเพียงคนเดียวที่รู้อนาคตของโลก เมื่อเหตุการณ์ในนิยายกลายเป็นความจริง เขาต้องใช้ความรู้ทั้งหมดเพื่อเอาชีวิตรอด' },
    { id: 'b002', title: 'อ่านชะตาวันสิ้นโลก เล่ม 2', author: 'Sing N song', category: 'นิยายแฟนตาซี', price: 320, stock: 82, status: 'available', cover: 'assets/cover/b002.jpg', createdAt: '2026-01-06T09:00:00.000Z', rating: 4.9, sold: 380, desc: 'การเดินทางดำเนินต่อท่ามกลางบททดสอบที่ยากขึ้น พร้อมการเปิดเผยความลับของโลกและการเผชิญหน้ากับศัตรูที่แข็งแกร่งกว่าเดิม' },
    { id: 'b003', title: 'อ่านชะตาวันสิ้นโลก เล่ม 3', author: 'Sing N song', category: 'นิยายแฟนตาซี', price: 245, stock: 64, status: 'available', cover: 'assets/cover/b003.jpg', createdAt: '2026-01-10T09:00:00.000Z', rating: 4.6, sold: 156, desc: 'เรื่องราวเข้าสู่ช่วงเข้มข้น เมื่อการตัดสินใจของตัวเอกส่งผลต่อชะตากรรมของผู้คนและอนาคตของโลกทั้งใบ' },
    { id: 'b004', title: 'Hunter × Hunter เล่ม 1', author: 'โยชิฮิโระ โทงาชิ', category: 'มังงะแอ็กชัน', price: 390, stock: 190, status: 'available', cover: 'assets/cover/b004.jpg', createdAt: '2026-01-14T09:00:00.000Z', rating: 4.7, sold: 301, desc: 'เรื่องราวการออกเดินทางของกอร์น ฟรีคส์ เด็กหนุ่มผู้มุ่งมั่นที่จะเป็นฮันเตอร์และตามหาพ่อของเขา' },
    { id: 'b005', title: 'Hunter × Hunter เล่ม 2', author: 'โยชิฮิโระ โทงาชิ', category: 'มังงะแอ็กชัน', price: 210, stock: 112, status: 'available', cover: 'assets/cover/b005.jpg', createdAt: '2026-01-17T09:00:00.000Z', rating: 4.5, sold: 177, desc: 'การทดสอบฮันเตอร์ดำเนินต่อไป พร้อมมิตรภาพและอุปสรรคที่ผู้เข้าสอบต้องเผชิญ' },
    { id: 'b006', title: 'Hunter × Hunter เล่ม 3', author: 'โยชิฮิโระ โทงาชิ', category: 'มังงะแอ็กชัน', price: 430, stock: 72, status: 'available', cover: 'assets/cover/b006.jpg', createdAt: '2026-01-21T09:00:00.000Z', rating: 4.9, sold: 418, desc: 'การเดินทางของกอร์น คิรัว คุราปิก้า และเลโอริโอ เข้าสู่บททดสอบที่ยากลำบากยิ่งขึ้น' },
    { id: 'b007', title: 'Hunter × Hunter เล่ม 4', author: 'โยชิฮิโระ โทงาชิ', category: 'มังงะแอ็กชัน', price: 299, stock: 58, status: 'available', cover: 'assets/cover/b007.jpg', createdAt: '2026-01-25T09:00:00.000Z', rating: 4.4, sold: 118, desc: 'การผจญภัยดำเนินต่อพร้อมการเผชิญหน้ากับศัตรูและความท้าทายใหม่ในการเป็นฮันเตอร์' },
    { id: 'b008', title: 'ไม่ยากถ้าอยากมีมารยาทดี', author: 'ปัก ฮย็อนจ็อง', category: 'การ์ตูนความรู้', price: 179, stock: 128, status: 'available', cover: 'assets/cover/b008.jpg', createdAt: '2026-01-29T09:00:00.000Z', rating: 4.6, sold: 205, desc: 'หนังสือการ์ตูนความรู้ที่สอนเรื่องมารยาทในชีวิตประจำวัน ผ่านเรื่องราวสนุก เข้าใจง่าย เหมาะสำหรับผู้อ่านทุกวัย' },
    { id: 'b009', title: 'ศรีธนญชัย', author: 'สุพรรณิการ์', category: 'วรรณกรรมไทย', price: 259, stock: 95, status: 'available', cover: 'assets/cover/b009.jpg', createdAt: '2026-02-02T09:00:00.000Z', rating: 4.7, sold: 183, desc: 'วรรณกรรมไทยคลาสสิกที่ถ่ายทอดเรื่องราวของศรีธนญชัย ผู้มีไหวพริบและปฏิภาณในการแก้ปัญหาด้วยอุบายและสติปัญญา' },
    { id: 'b010', title: 'เทรดแบบกราฟเปล่า ทำกำไรด้วยแท่งเทียน', author: 'ลภัสรดา เพ็งสุข', category: 'การลงทุน', price: 399, stock: 68, status: 'available', cover: 'assets/cover/b010.jpg', createdAt: '2026-02-06T09:00:00.000Z', rating: 4.8, sold: 247, desc: 'แนะนำการวิเคราะห์กราฟแท่งเทียนเพื่อการลงทุน เหมาะสำหรับผู้เริ่มต้นและผู้ที่ต้องการพัฒนาทักษะการเทรดในตลาดหุ้น คริปโต และฟอเร็กซ์' },
    { id: 'b011', title: 'จิตวิทยาสายดาร์ก', author: 'Dr.Hiro', category: 'จิตวิทยา', price: 295, stock: 84, status: 'available', cover: 'assets/cover/b011.jpg', createdAt: '2026-02-10T09:00:00.000Z', rating: 4.8, sold: 326, desc: 'หนังสือที่อธิบายหลักจิตวิทยาเกี่ยวกับการสื่อสาร การโน้มน้าวใจ และการทำความเข้าใจพฤติกรรมของผู้คน พร้อมยกตัวอย่างสถานการณ์ที่พบได้ในชีวิตประจำวัน' },
    { id: 'b012', title: 'โลจิสติกส์-โซ่อุปทาน : การออกแบบและจัดการเบื้องต้น', author: 'รศ.ดร. ประจวบ กล่อมจิตร', category: 'โลจิสติกส์', price: 349, stock: 76, status: 'available', cover: 'assets/cover/b012.jpg', createdAt: '2026-02-14T09:00:00.000Z', rating: 4.7, sold: 142, desc: 'หนังสือแนะนำพื้นฐานด้านโลจิสติกส์และการจัดการโซ่อุปทาน ครอบคลุมการออกแบบระบบ การขนส่ง การจัดเก็บสินค้า และการบริหารกระบวนการเพื่อเพิ่มประสิทธิภาพขององค์กร' },
    { id: 'b013', title: 'ผมคนนี้อยากหนีจากบทพระรอง', author: 'Sleepy-C', category: 'นิยายแปลเกาหลี', price: 430, stock: 54, status: 'available', cover: 'assets/cover/b013.jpg', createdAt: '2026-02-18T09:00:00.000Z', rating: 4.9, sold: 392, desc: 'นิยายแฟนตาซีโรแมนซ์ที่เล่าเรื่องของตัวละครผู้ตื่นขึ้นมาในโลกนิยายและพบว่าตัวเองได้รับบทเป็นพระรอง เขาจึงพยายามเปลี่ยนชะตากรรมและหลีกเลี่ยงเส้นทางเดิมของเรื่องราว' },
    { id: 'b014', title: 'มั่งคั่งทั้งชีวิต (Money Mastery)', author: 'ภัทรพล ศิลปาจารย์', category: 'การเงินและการลงทุน', price: 395, stock: 87, status: 'available', cover: 'assets/cover/b014.jpg', createdAt: '2026-02-22T09:00:00.000Z', rating: 4.8, sold: 412, desc: 'หนังสือที่รวบรวมแนวคิดด้านการเงิน การลงทุน และการวางแผนชีวิต เพื่อสร้างความมั่งคั่งทั้งด้านเงิน เวลา และสุขภาพ เหมาะสำหรับผู้ที่ต้องการพัฒนาวินัยทางการเงินและสร้างความมั่นคงในระยะยาว' },
    { id: 'b015', title: 'Money 101 เริ่มต้นนับหนึ่งสู่ชีวิตการเงินอุดมสุข', author: 'จักรพงษ์ เมษพันธุ์ (The Money Coach)', category: 'การเงินและการลงทุน', price: 325, stock: 102, status: 'available', cover: 'assets/cover/b015.jpg', createdAt: '2026-02-26T09:00:00.000Z', rating: 4.9, sold: 538, desc: 'คู่มือพื้นฐานด้านการเงินส่วนบุคคล ครอบคลุมการวางแผนรายรับรายจ่าย การออม การลงทุน และการบริหารหนี้ เหมาะสำหรับผู้ที่ต้องการเริ่มต้นสร้างความมั่นคงทางการเงิน' },
  ];

  function demoIsbn(index) {
    const body = `978616000${String(index).padStart(3, '0')}`;
    const sum = [...body].reduce((total, digit, position) => total + Number(digit) * (position % 2 ? 3 : 1), 0);
    return `${body}${(10 - (sum % 10)) % 10}`;
  }
  seedProducts.forEach((product, index) => { product.isbn = demoIsbn(index + 1); });

  const seedUsers = [
    { id: 'u001', name: 'ลูกค้าทดสอบ', email: 'customer@example.com', password: '123456', role: 'customer', phone: '080-111-2222' },
    { id: 'u002', name: 'พนักงานร้าน', email: 'staff@example.com', password: '123456', role: 'staff', phone: '080-333-4444' },
    { id: 'u003', name: 'ผู้ดูแลระบบ', email: 'admin@example.com', password: '123456', role: 'admin', phone: '080-555-6666' }
  ];

  const seedStaff = [
    { id: 's001', name: 'พนักงานร้าน', email: 'staff@example.com', position: 'Order Staff', status: 'active' },
    { id: 's002', name: 'เจ้าหน้าที่คลัง', email: 'stock@example.com', position: 'Stock Staff', status: 'active' }
  ];

  const statusText = {
    payment: { pending: 'รอตรวจสลิป', approved: 'ชำระเงินแล้ว', rejected: 'สลิปไม่ผ่าน' },
    order: { pending_review: 'รอตรวจสอบ', packing: 'จัดเตรียมสินค้า', shipped: 'ส่งสินค้าแล้ว', completed: 'เสร็จสมบูรณ์', cancelled: 'ยกเลิก' },
    delivery: { not_shipped: 'ยังไม่จัดส่ง', in_transit: 'อยู่ระหว่างขนส่ง', delivered: 'ได้รับสินค้าแล้ว', cancelled: 'ยกเลิกจัดส่ง' },
    product: { available: 'พร้อมขาย', reserved: 'จองสินค้า', sold: 'ขายแล้ว' }
  };
  const statusTone = {
    pending: 'yellow', approved: 'green', rejected: 'red', pending_review: 'yellow', packing: 'blue', shipped: 'blue', completed: 'green', cancelled: 'red', not_shipped: 'gray', in_transit: 'blue', delivered: 'green', available: 'green', reserved: 'yellow', sold: 'red'
  };

  function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (e) { return fallback; } }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function scopedKey(base) {
  const user = read(STORAGE.current, null);
  return `${base}_${user?.id || 'guest'}`;
}
function initData() {
  if (!localStorage.getItem(STORAGE.products)) write(STORAGE.products, seedProducts);
  else {
    const savedProducts = read(STORAGE.products, seedProducts);
    const migratedProducts = savedProducts.map((product, index) => product.isbn ? product : { ...product, isbn: demoIsbn(index + 1) });
    if (migratedProducts.some((product, index) => product.isbn !== savedProducts[index].isbn)) write(STORAGE.products, migratedProducts);
  }
  if (!localStorage.getItem(STORAGE.users)) write(STORAGE.users, seedUsers);
  if (!localStorage.getItem(STORAGE.staff)) write(STORAGE.staff, seedStaff);
  if (!localStorage.getItem(STORAGE.orders)) write(STORAGE.orders, []);
  if (!localStorage.getItem(STORAGE.addresses)) write(STORAGE.addresses, [
    { id: 'a001', name: 'บ้าน', receiver: 'ลูกค้าทดสอบ', phone: '080-111-2222', detail: '99/9 ถนนหนังสือ แขวงอ่านเพลิน เขตเมือง กรุงเทพมหานคร 10110' }
  ]);
}

  function formatTHB(n) { return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(Number(n) || 0); }
  function products() { return read(STORAGE.products, seedProducts); }
  function saveProducts(items) { write(STORAGE.products, items); }
  function users() { return read(STORAGE.users, seedUsers); }
  function saveUsers(items) { write(STORAGE.users, items); }
  function staff() { return read(STORAGE.staff, seedStaff); }
  function saveStaff(items) { write(STORAGE.staff, items); }
  function currentUser() { return read(STORAGE.current, null); }
function setCurrentUser(user) {
  if (!user) {
    localStorage.removeItem(STORAGE.current);
    renderNav();
    return;
  }
  write(STORAGE.current, user);
  renderNav();
}
  function cart() { return read(scopedKey(STORAGE.cart), []); }
function saveCart(items) { write(scopedKey(STORAGE.cart), items); renderNav(); }
function favorites() { return read(scopedKey(STORAGE.fav), []); }
function saveFavorites(items) { write(scopedKey(STORAGE.fav), items); renderNav(); }  function orders() { return read(STORAGE.orders, []); }
  function saveOrders(items) { write(STORAGE.orders, items); }
  function addresses() { return read(STORAGE.addresses, []); }
  function saveAddresses(items) { write(STORAGE.addresses, items); }
  function findProduct(id) { return products().find(p => p.id === id); }
  function cartDetailed() { return cart().map(item => ({ ...item, product: findProduct(item.id) })).filter(item => item.product); }
  function cartTotal() { return cartDetailed().reduce((sum, item) => sum + item.product.price * item.qty, 0); }
  function productStockStatus(stock) { return stock <= 0 ? 'sold' : 'available'; }
  function availableStock(product) { return Math.max(0, (product?.stock || 0) - (product?.reserved || 0)); }
  function statusLabel(type, value) { return statusText[type]?.[value] || value || '-'; }
  function statusBadge(type, value) { return `<span class="badge ${statusTone[value] || 'gray'}">${statusLabel(type, value)}</span>`; }

  function addToCart(id, qty = 1) {
    const product = findProduct(id);
    if (!product) { toast('ไม่พบสินค้านี้'); return false; }
    const avail = availableStock(product);
    if (avail <= 0) { toast('สินค้าหมดแล้ว'); return false; }
    const items = cart();
    const found = items.find(i => i.id === id);
    const nextQty = (found?.qty || 0) + qty;
    if (nextQty > avail) { toast('จำนวนที่เลือกมากกว่าสต็อก'); return false; }
    if (found) found.qty = nextQty; else items.push({ id, qty });
    saveCart(items);
    toast('เพิ่มลงตะกร้าแล้ว');
    return true;
  }
  function changeCartQty(id, qty) {
    const product = findProduct(id);
    const avail = product ? availableStock(product) : 1;
    const next = Math.max(1, Math.min(Number(qty) || 1, avail || 1));
    saveCart(cart().map(i => i.id === id ? { ...i, qty: next } : i));
  }
  function removeCartItem(id) { saveCart(cart().filter(i => i.id !== id)); }
  function toggleFavorite(id) {
    let fav = favorites();
    if (fav.includes(id)) { fav = fav.filter(x => x !== id); toast('นำออกจากรายการโปรดแล้ว'); }
    else { fav.push(id); toast('บันทึกรายการโปรดแล้ว'); }
    saveFavorites(fav);
    return fav.includes(id);
  }

  //--------------------------------------------------------------------------------------------//
  function shippingPriceByQty(qty, rates) {
    const count = Number(qty) || 0;
    if (count >= 50) return 0;
    if (count >= 31) return rates[3];
    if (count >= 11) return rates[2];
    if (count >= 4) return rates[1];
    if (count >= 1) return rates[0];
    return 0;
  }
  function shippingOptions(bookCount = 0) {
    const standardRates = [45, 70, 110, 160];
    const expressRates = [65, 100, 150, 220];
    const activeRateIndex = bookCount >= 50 ? 4 : bookCount >= 31 ? 3 : bookCount >= 11 ? 2 : bookCount >= 4 ? 1 : bookCount >= 1 ? 0 : -1;
    const shippingDesc = rates => [
      ['1-3 เล่ม', `${rates[0]} ฿`],
      ['4-10 เล่ม', `${rates[1]} ฿`],
      ['11-30 เล่ม', `${rates[2]} ฿`],
      ['31-49 เล่ม', `${rates[3]} ฿`],
      ['50 เล่ม', 'ส่งฟรี']
    ].map(([range, price], index) => `<span class="shipping-rate ${index === activeRateIndex ? 'active' : ''}"><span>${range}</span><span class="shipping-rate-price">${price}</span></span>`).join('');
    return [
      { id: 'standard', name: 'จัดส่งมาตรฐาน', price: shippingPriceByQty(bookCount, standardRates), desc: shippingDesc(standardRates) },
      { id: 'express', name: 'จัดส่งด่วน', price: shippingPriceByQty(bookCount, expressRates), desc: shippingDesc(expressRates) }
    ];
  }
  //--------------------------------------------------------------------------------------------//
  function makeOrder(draft, slipName, slipData, slipType, contactPhone) {
    const current = currentUser();
    const stamp = Date.now().toString(36).toUpperCase();
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const id = `ORD${stamp}${suffix}`;
    const order = {
      id,
      createdAt: new Date().toISOString(),
      customerId: current?.id || 'guest',
      customerName: current?.name || 'ลูกค้า',
      customerEmail: current?.email || '',
      customerPhone: contactPhone || draft.address?.phone || current?.phone || '',
      items: draft.items,
      subtotal: draft.subtotal,
      shipping: draft.shipping,
      total: draft.total,
      address: draft.address,
      shippingMethod: draft.shippingMethod,
      paymentStatus: 'pending',
      orderStatus: 'pending_review',
      deliveryStatus: 'not_shipped',
      stockAdjusted: false,
      staffName: '-',
      slipName: slipName || 'payment-slip.jpg',
      slipData: slipData || '',
      slipType: slipType || '',
      timeline: [
        { time: new Date().toISOString(), text: 'ลูกค้าสร้างคำสั่งซื้อ' },
        { time: new Date().toISOString(), text: 'แนบหลักฐานการชำระเงินแล้ว' },
        { time: new Date().toISOString(), text: 'ระบบจองสินค้าเพื่อรอตรวจสอบ' }
      ]
    };
    const all = orders(); all.unshift(order); saveOrders(all);
    const qtyById = new Map(draft.items.map(i => [i.id, i.qty]));
    saveProducts(products().map(p => qtyById.has(p.id) ? { ...p, reserved: (p.reserved || 0) + qtyById.get(p.id), status: 'reserved' } : p));
    saveCart([]);
    localStorage.removeItem(STORAGE.checkoutDraft);
    return order;
  }
  function resubmitSlip(id, slipName, slipData, slipType) {
    let result = { ok: false, message: 'ไม่พบคำสั่งซื้อ' };
    const productList = products();
    const nextOrders = orders().map(order => {
      if (order.id !== id) return order;
      if (order.paymentStatus !== 'rejected') { result = { ok: false, message: 'คำสั่งซื้อนี้ไม่สามารถแนบหลักฐานใหม่ได้' }; return order; }
      const attempts = order.resubmitCount || 0;
      if (attempts >= 2) { result = { ok: false, message: 'ครบจำนวนครั้งที่แนบหลักฐานได้แล้ว คำสั่งซื้อนี้ถูกยกเลิกถาวร' }; return order; }
      const insufficient = order.items.find(item => availableStock(productList.find(p => p.id === item.id)) < item.qty);
      if (insufficient) { result = { ok: false, message: `สต็อกไม่พอสำหรับ: ${insufficient.title}` }; return order; }
      order.items.forEach(item => {
        const p = productList.find(x => x.id === item.id);
        if (p) { p.reserved = (p.reserved || 0) + item.qty; p.status = 'reserved'; }
      });
      const nextAttempts = attempts + 1;
      const isLastChance = nextAttempts >= 2;
      result = { ok: true, message: isLastChance ? 'แนบหลักฐานครั้งสุดท้ายแล้ว รอตรวจสอบ หากไม่ผ่านคำสั่งซื้อจะถูกยกเลิกถาวร' : 'แนบหลักฐานใหม่แล้ว รอตรวจสอบ' };
      return withTimeline({ ...order, paymentStatus: 'pending', orderStatus: 'pending_review', deliveryStatus: 'not_shipped', resubmitCount: nextAttempts, slipName: slipName || order.slipName, slipData: slipData || order.slipData, slipType: slipType || order.slipType }, `ลูกค้าแนบหลักฐานการชำระเงินใหม่ (ครั้งที่ ${nextAttempts})`);
    });
    if (result.ok) { saveProducts(productList); saveOrders(nextOrders); }
    return result;
  }
  function withTimeline(order, text) { return { ...order, timeline: [...(order.timeline || []), { time: new Date().toISOString(), text }] }; }
  function approveOrder(id, staffName) {
    let result = { ok: false, message: 'ไม่พบคำสั่งซื้อ' };
    const nextOrders = orders().map(order => {
      if (order.id !== id) return order;
      if (order.paymentStatus === 'approved') { result = { ok: false, message: 'คำสั่งซื้อนี้อนุมัติแล้ว' }; return order; }
      if (order.paymentStatus === 'rejected' || order.orderStatus === 'cancelled') { result = { ok: false, message: 'รายการนี้ถูกยกเลิกแล้ว' }; return order; }
      result = { ok: true, message: 'อนุมัติสลิปแล้ว รอจัดเตรียม/ส่งสินค้าเพื่อตัดสต็อก' };
      return withTimeline({ ...order, paymentStatus: 'approved', orderStatus: 'packing', deliveryStatus: 'not_shipped', staffName }, `พนักงาน ${staffName} อนุมัติสลิป`);
    });
    if (result.ok) saveOrders(nextOrders);
    return result;
  }
  function rejectOrder(id, staffName) {
    let result = { ok: false, message: 'ไม่พบคำสั่งซื้อ' };
    const productList = products();
    const nextOrders = orders().map(order => {
      if (order.id !== id) return order;
      if (order.orderStatus === 'completed') { result = { ok: false, message: 'รายการนี้เสร็จสมบูรณ์แล้ว' }; return order; }
      if (order.stockAdjusted) {
        order.items.forEach(item => {
          const p = productList.find(x => x.id === item.id);
          if (p) { p.stock += item.qty; p.sold = Math.max(0, (p.sold || 0) - item.qty); p.status = productStockStatus(p.stock); }
        });
      } else {
        order.items.forEach(item => {
          const p = productList.find(x => x.id === item.id);
          if (p) { p.reserved = Math.max(0, (p.reserved || 0) - item.qty); p.status = productStockStatus(p.stock); }
        });
      }
      result = { ok: true, message: 'ยกเลิกและคืนสถานะสินค้าแล้ว' };
      return withTimeline({ ...order, paymentStatus: 'rejected', orderStatus: 'cancelled', deliveryStatus: 'cancelled', stockAdjusted: false, staffName }, `พนักงาน ${staffName} ไม่อนุมัติสลิป`);
    });
    if (result.ok) { saveProducts(productList); saveOrders(nextOrders); }
    return result;
  }
  function updateOrderStage(id, stage, staffName) {
    let result = { ok: false, message: 'ไม่พบคำสั่งซื้อ' };
    const productList = products();
    let touchedProducts = false;
    const nextOrders = orders().map(order => {
      if (order.id !== id) return order;
      if (order.paymentStatus !== 'approved') { result = { ok: false, message: 'ต้องอนุมัติสลิปก่อน' }; return order; }
      if (order.orderStatus === 'cancelled') { result = { ok: false, message: 'รายการนี้ถูกยกเลิกแล้ว' }; return order; }
      if (stage === 'packing') {
        result = { ok: true, message: 'อัปเดตเป็นจัดเตรียมสินค้าแล้ว' };
        return withTimeline({ ...order, orderStatus: 'packing', staffName }, `พนักงาน ${staffName} กำลังจัดเตรียมสินค้า`);
      }
      if (stage === 'shipped') {
        if (!order.stockAdjusted) {
          const insufficient = order.items.find(item => (productList.find(p => p.id === item.id)?.stock || 0) < item.qty);
          if (insufficient) { result = { ok: false, message: `สต็อกไม่พอ: ${insufficient.title}` }; return order; }
          order.items.forEach(item => {
            const p = productList.find(x => x.id === item.id);
            if (p) {
              p.stock = Math.max(0, p.stock - item.qty);
              p.reserved = Math.max(0, (p.reserved || 0) - item.qty);
              p.sold = (p.sold || 0) + item.qty;
              p.status = productStockStatus(p.stock);
            }
          });
          touchedProducts = true;
        }
        result = { ok: true, message: 'ส่งสินค้าและตัดสต็อกแล้ว' };
        return withTimeline({ ...order, orderStatus: 'shipped', deliveryStatus: 'in_transit', stockAdjusted: true, staffName }, `พนักงาน ${staffName} ส่งสินค้าและตัดสต็อก`);
      }
      result = { ok: false, message: 'ไม่รู้จักสถานะนี้' };
      return order;
    });
    if (result.ok) { if (touchedProducts) saveProducts(productList); saveOrders(nextOrders); }
    return result;
  }
  function customerReceive(id) {
    let result = { ok: false, message: 'ไม่พบคำสั่งซื้อ' };
    const nextOrders = orders().map(order => {
      if (order.id !== id) return order;
      if (order.deliveryStatus !== 'in_transit') { result = { ok: false, message: 'ยังไม่อยู่ในขั้นตอนจัดส่ง' }; return order; }
      result = { ok: true, message: 'ยืนยันการได้รับสินค้าแล้ว' };
      return withTimeline({ ...order, deliveryStatus: 'delivered', orderStatus: 'completed' }, 'ลูกค้ายืนยันว่าได้รับสินค้าแล้ว');
    });
    if (result.ok) saveOrders(nextOrders);
    return result;
  }
  function getOrderStatusIndex(order) {
    if (order.orderStatus === 'completed' || order.deliveryStatus === 'delivered') return 3;
    if (order.orderStatus === 'shipped' || order.deliveryStatus === 'in_transit') return 2;
    if (order.orderStatus === 'packing') return 1;
    return 0;
  }

  function bookCard(product) {
    const fav = favorites().includes(product.id);
    const avail = availableStock(product);
    const outOfStock = avail <= 0;
    const stockBadge = outOfStock
      ? '<span class="badge red">สินค้าหมด</span>'
      : `<span class="badge ${avail < 100 ? 'red' : 'green'}">คงเหลือ ${avail} เล่ม</span>`;
    const coverStockBadge = outOfStock ? '<span class="cover-stock-badge">สินค้าหมด</span>' : '';
    const cartButton = outOfStock
      ? `<button class="btn btn-primary btn-small" type="button" disabled>${icon('cart')} สินค้าหมด</button>`
      : `<button class="btn btn-primary btn-small" data-cart="${product.id}">${icon('cart')} ใส่ตะกร้า</button>`;
    return `
      <article class="book-card ${outOfStock ? 'is-out-of-stock' : ''}" data-id="${product.id}" data-category="${escapeHtml(product.category)}">
        <button class="icon-btn fav-btn ${fav ? 'active' : ''}" data-fav="${product.id}" title="บันทึกรายการโปรด" aria-label="บันทึกรายการโปรด">${icon(fav ? 'heartFill' : 'heart')}</button>
        <a href="book-detail.html?id=${product.id}" class="book-cover">
          <img src="${product.cover}" alt="${escapeHtml(product.title)}" class="cover-img" onerror="this.onerror=null;this.src='assets/cover/default.jpg'">
          ${coverStockBadge}
        </a>
        <div class="book-info">
          <div class="pill-row"><span class="badge orange">${escapeHtml(product.category)}</span>${stockBadge}</div>
          <h3><a href="book-detail.html?id=${product.id}">${escapeHtml(product.title)}</a></h3>
          <p>${escapeHtml(product.author)}</p>
          <div class="price-row"><span class="price">${formatTHB(product.price)}</span><span class="helper">ขายแล้ว ${product.sold}</span></div>
          <div class="book-actions">
            <a class="btn btn-secondary btn-small" href="book-detail.html?id=${product.id}">รายละเอียด</a>
            ${cartButton}
          </div>
        </div>
      </article>`;
  }
  function escapeHtml(str) { return String(str || '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[c])); }
  function toast(message) {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }
  function requireLogin() {
    if (!currentUser()) {
      toast('กรุณาเข้าสู่ระบบก่อน');
      setTimeout(() => location.href = 'login.html', 700);
      return false;
    }
    return true;
  }

  function requireRole(roles) {
    const user = currentUser();
    const allowed = Array.isArray(roles) ? roles : [roles];
    if (!user || !allowed.includes(user.role)) {
      toast('ไม่มีสิทธิ์เข้าถึงหน้านี้');
      setTimeout(() => location.href = 'login.html', 700);
      return false;
    }
    return true;
  }


  function renderNav() {
    const nav = document.getElementById('appNav');
    if (!nav) return;
    const user = currentUser();
    const page = document.body.dataset.page || '';
    const cartCount = cart().reduce((s, i) => s + i.qty, 0);
    const favCount = favorites().length;
    const isStaffOnly = user?.role === 'staff';
    const adminLinks = user?.role === 'admin' ? `<a class="${page === 'admin' ? 'active' : ''}" href="admin.html">Admin</a>` : '';
    const staffLinks = user?.role === 'staff' || user?.role === 'admin' ? `<a class="${page === 'staff' ? 'active' : ''}" href="staff.html">Staff</a>` : '';

    const customerLinks = isStaffOnly ? '' : `
    <a class="${page === 'home' ? 'active' : ''}" href="index.html">หน้าหลัก</a>
    <a class="${page === 'products' ? 'active' : ''}" href="products.html">หนังสือ</a>
    <a class="${page === 'favorites' ? 'active' : ''}" href="favorites.html">รายการโปรด <span class="nav-count">${favCount}</span></a>
    <a class="${page === 'cart' ? 'active' : ''}" href="cart.html">ตะกร้า <span class="nav-count">${cartCount}</span></a>
    <a class="${page === 'tracking' ? 'active' : ''}" href="tracking.html">ติดตาม</a>
    <a class="${page === 'support' ? 'active' : ''}" href="support.html">แจ้งปัญหา</a>`;

    nav.innerHTML = `
    <header class="site-header">
      <div class="container navbar">
        <a class="brand" href="index.html">
          <span class="brand-badge">${icon('book')}</span>
          <span class="brand-text">Lamoon Book<span>Online Book Store</span></span>
        </a>
        <button class="mobile-toggle" id="mobileToggle" aria-label="เปิดเมนู">${icon('menu')}</button>
        <div class="nav-links" id="navLinks">
          ${customerLinks}
          ${staffLinks}${adminLinks}
          ${user ? `<a class="${page === 'profile' ? 'active' : ''}" href="profile.html">ตั้งค่า</a><button id="logoutBtn">ออกจากระบบ</button>` : `<a class="${page === 'login' ? 'active' : ''}" href="login.html">เข้าสู่ระบบ</a>`}
        </div>
      </div>
    </header>`;
    document.getElementById('mobileToggle')?.addEventListener('click', () => document.getElementById('navLinks')?.classList.toggle('open'));
    document.getElementById('logoutBtn')?.addEventListener('click', () => { setCurrentUser(null); toast('ออกจากระบบแล้ว'); setTimeout(() => location.href = 'index.html', 600); });
  }

  function renderFooter() {
    const footer = document.getElementById('appFooter');
    if (!footer) return;
    footer.innerHTML = `
    <div class="container footer-content">
      <div class="footer-brand">
        <h3>Lamoon Book</h3>
        <p>ร้านหนังสือออนไลน์ ครบจบในที่เดียว</p>
      </div>
      <div class="footer-links">
        <h4>ช่วยเหลือ</h4>
        <a href="support.html">แจ้งปัญหา</a>
        <a href="tracking.html">ติดตามพัสดุ</a>
      </div>
      <div class="footer-contact">
        <h4>ติดต่อเรา</h4>
        <a href="mailto:support@lamoonbook.com">support@lamoonbook.com</a>
      </div>
    </div>
    <div class="container footer-bottom">
      <p>© 2026 Lamoon Book</p>
    </div>`;
  }

function bindGlobalActions(root = document) {
  document.addEventListener('click', (e) => {
    const cartBtn = e.target.closest('[data-cart]');
    if (cartBtn) {
      if (!requireLogin()) return;
      addToCart(cartBtn.dataset.cart, 1);
      return;
    }
    const favBtn = e.target.closest('[data-fav]');
    if (favBtn) {
      if (!requireLogin()) return;
      const active = toggleFavorite(favBtn.dataset.fav);
      favBtn.classList.toggle('active', active);
      favBtn.innerHTML = icon(active ? 'heartFill' : 'heart');
      renderNav();
    }
  });
}
  function dateTH(iso) { return new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }); }
  function timelineList(order) {
    const items = order.timeline || [];
    return items.map(item => `<li><span>${escapeHtml(typeof item === 'string' ? item : item.text)}</span>${typeof item === 'object' && item.time ? `<small>${dateTH(item.time)}</small>` : ''}</li>`).join('');
  }
  function stepHtml(order) {
    const current = getOrderStatusIndex(order);
    const names = ['ตรวจสอบ', 'จัดเตรียม', 'จัดส่ง', 'ได้รับสินค้า'];
    return `<div class="status-steps">${names.map((name, i) => `<div class="step ${i < current ? 'done' : i === current ? 'active' : ''}"><span class="dot"></span>${name}</div>`).join('')}</div>`;
  }

  window.BookApp = {
    STORAGE, icon, formatTHB, products, saveProducts, users, saveUsers, currentUser, setCurrentUser,
    cart, saveCart, cartDetailed, cartTotal, addToCart, changeCartQty, removeCartItem,
    favorites, saveFavorites, toggleFavorite, orders, saveOrders, addresses, saveAddresses,
    staff, saveStaff, shippingOptions, makeOrder, approveOrder, rejectOrder, updateOrderStage,
    customerReceive, getOrderStatusIndex, stepHtml, statusLabel, statusBadge, timelineList,
    bookCard, toast, requireLogin, requireRole, renderNav, renderFooter, bindGlobalActions, findProduct,
    dateTH, escapeHtml, productStockStatus, availableStock, resubmitSlip
  };
  document.addEventListener('DOMContentLoaded', () => { renderNav(); renderFooter(); bindGlobalActions(); });
})();