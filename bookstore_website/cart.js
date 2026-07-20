document.addEventListener('DOMContentLoaded', render);
function render() {
  const itemsEl = document.getElementById('cartItems');
  const shippingEl = document.getElementById('cartShipping');
  const summaryEl = document.getElementById('cartSummary');
  const items = BookApp.cartDetailed();
  if (!items.length) {
    itemsEl.innerHTML = `<div class="empty-state"><div class="icon">${BookApp.icon('cart')}</div><h3>ตะกร้ายังว่าง</h3><p>เลือกหนังสือแล้วเพิ่มลงตะกร้า</p><a class="btn btn-primary" href="products.html">เลือกซื้อหนังสือ</a></div>`;
    shippingEl.innerHTML = `<h3 style="margin-top:0;color:var(--brown)">รูปแบบการจัดส่ง</h3><p class="helper">เพิ่มสินค้าในตะกร้าก่อนเลือกจัดส่ง</p>`;
    summaryEl.innerHTML = `<h3>สรุปยอด</h3><p class="helper">ยังไม่มีสินค้าในตะกร้า</p>`;
    return;
  }
  itemsEl.innerHTML = items.map(({ product, qty }) => `
    <div class="cart-row">
      <div class="book-cover mini-cover">
        <img src="${BookApp.escapeHtml(product.coverUrl || product.cover || 'assets/cover/default.jpg')}" alt="${BookApp.escapeHtml(product.title)}" class="mini-cover-img" onerror="this.onerror=null;this.src='assets/cover/default.jpg'">
      </div>
      <div><h3 style="margin:0;color:var(--brown)">${BookApp.escapeHtml(product.title)}</h3><p class="helper">${BookApp.escapeHtml(product.author)} · คงเหลือ ${product.stock} เล่ม</p><strong class="price">${BookApp.formatTHB(product.price)}</strong></div>
      <div class="cart-actions"><div class="qty-control"><button data-minus="${product.id}">−</button><span>${qty}</span><button data-plus="${product.id}">+</button></div><button class="btn btn-danger btn-small" data-remove="${product.id}" style="margin-left:8px">${BookApp.icon('trash')} ลบ</button></div>
    </div>`).join('');
  const subtotal = BookApp.cartTotal();
  const bookCount = items.reduce((s, i) => s + i.qty, 0);
  const shippingOptions = BookApp.shippingOptions(bookCount);
  const savedShipping = localStorage.getItem(BookApp.STORAGE.selectedShipping);
  const selectedShipping = shippingOptions.some(s => s.id === savedShipping) ? savedShipping : shippingOptions[0]?.id;
  localStorage.setItem(BookApp.STORAGE.selectedShipping, selectedShipping);
  const ship = shippingOptions.find(s => s.id === selectedShipping) || { name: '-', price: 0 };
  shippingEl.innerHTML = `<h3 style="margin-top:0;color:var(--brown)">รูปแบบการจัดส่ง</h3><div class="cart-shipping-grid">${shippingOptions.map(s => `<article class="card shipping-card ${s.id === selectedShipping ? 'active' : ''}" data-shipping="${s.id}"><strong>${s.name}</strong><p class="helper">${s.desc}</p></article>`).join('')}</div>`;
  summaryEl.innerHTML = `<h3 style="margin-top:0;color:var(--brown)">สรุปตะกร้า</h3><div class="summary-line"><span>รายการ</span><strong>${items.length}</strong></div><div class="summary-line"><span>จำนวนหนังสือ</span><strong>${bookCount} เล่ม</strong></div><div class="summary-line"><span>รวมสินค้า</span><strong>${BookApp.formatTHB(subtotal)}</strong></div><div class="summary-line"><span>${ship.name}</span><strong>${BookApp.formatTHB(ship.price)}</strong></div><div class="summary-line total"><span>ยอดสุทธิ</span><span>${BookApp.formatTHB(subtotal + ship.price)}</span></div><a href="checkout.html" class="btn btn-primary" style="width:100%">ดำเนินการสั่งซื้อ</a><a href="products.html" class="btn btn-secondary" style="width:100%;margin-top:10px">เลือกเพิ่ม</a>`;
  shippingEl.querySelectorAll('[data-shipping]').forEach(el => el.onclick = () => { localStorage.setItem(BookApp.STORAGE.selectedShipping, el.dataset.shipping); render(); });
  itemsEl.querySelectorAll('[data-plus]').forEach(b => b.onclick = () => { const item = BookApp.cart().find(i => String(i.id) === String(b.dataset.plus)); if (!item) return; BookApp.changeCartQty(b.dataset.plus, item.qty + 1); render(); });
  itemsEl.querySelectorAll('[data-minus]').forEach(b => b.onclick = () => { const item = BookApp.cart().find(i => String(i.id) === String(b.dataset.minus)); if (!item) return; BookApp.changeCartQty(b.dataset.minus, item.qty - 1); render(); });
  itemsEl.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => { BookApp.removeCartItem(b.dataset.remove); BookApp.toast('ลบออกจากตะกร้าแล้ว'); render(); });
}