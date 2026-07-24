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
  itemsEl.innerHTML = items.map(({ product, qty }) => {
    const productId = BookApp.escapeHtml(String(product.id));
    const quantity = Math.max(1, Number(qty) || 1);
    const maxQuantity = BookApp.availableStock(product);
    return `
      <div class="cart-row">
        <div class="book-cover mini-cover">
          <img src="${BookApp.escapeHtml(product.coverUrl || product.cover || 'assets/cover/default.svg')}" alt="${BookApp.escapeHtml(product.title)}" class="mini-cover-img" onerror="this.onerror=null;this.src='assets/cover/default.svg'">
        </div>
        <div><h3 style="margin:0;color:var(--brown)">${BookApp.escapeHtml(product.title)}</h3><p class="helper">${BookApp.escapeHtml(product.author)} · คงเหลือ ${maxQuantity} เล่ม</p><strong class="price">${BookApp.formatTHB(product.price)}</strong></div>
        <div class="cart-actions">
          <div class="qty-control" data-qty-control="${productId}" data-max="${maxQuantity}">
            <button class="qty-step" type="button" data-minus="${productId}" aria-label="ลดจำนวน ${BookApp.escapeHtml(product.title)}" ${quantity <= 1 ? 'disabled' : ''}>−</button>
            <button class="qty-value" type="button" data-qty-display="${productId}" aria-label="แก้ไขจำนวน ${BookApp.escapeHtml(product.title)}">${quantity}</button>
            <input class="qty-input" data-qty-input="${productId}" type="number" inputmode="numeric" min="1" max="${Math.max(1, maxQuantity)}" step="1" value="${quantity}" aria-label="จำนวน ${BookApp.escapeHtml(product.title)}" hidden>
            <button class="qty-step" type="button" data-plus="${productId}" aria-label="เพิ่มจำนวน ${BookApp.escapeHtml(product.title)}" ${maxQuantity <= 0 || quantity >= maxQuantity ? 'disabled' : ''}>+</button>
          </div>
          <button class="btn btn-danger btn-small" type="button" data-remove="${productId}">${BookApp.icon('trash')} ลบ</button>
        </div>
      </div>`;
  }).join('');
  const subtotal = items.reduce((sum, item) => sum + Number(item.product.price) * Number(item.qty), 0);
  const bookCount = items.reduce((s, i) => s + i.qty, 0);
  const shippingOptions = BookApp.shippingOptions(bookCount);
  const savedShipping = BookApp.getSelectedShipping();
  const selectedShipping = shippingOptions.some(s => s.id === savedShipping) ? savedShipping : shippingOptions[0]?.id;
  BookApp.setSelectedShipping(selectedShipping);
  const ship = shippingOptions.find(s => s.id === selectedShipping) || { name: '-', price: 0 };
  shippingEl.innerHTML = `<h3 style="margin-top:0;color:var(--brown)">รูปแบบการจัดส่ง</h3><div class="cart-shipping-grid">${shippingOptions.map(s => `<article class="card shipping-card ${s.id === selectedShipping ? 'active' : ''}" data-shipping="${s.id}"><strong>${s.name}</strong><p class="helper">${s.desc}</p></article>`).join('')}</div>`;
  summaryEl.innerHTML = `<h3 style="margin-top:0;color:var(--brown)">สรุปตะกร้า</h3><div class="summary-line"><span>รายการ</span><strong>${items.length}</strong></div><div class="summary-line"><span>จำนวนหนังสือ</span><strong>${bookCount} เล่ม</strong></div><div class="summary-line"><span>รวมสินค้า</span><strong>${BookApp.formatTHB(subtotal)}</strong></div><div class="summary-line"><span>${ship.name}</span><strong>${BookApp.formatTHB(ship.price)}</strong></div><div class="summary-line total"><span>ยอดสุทธิ</span><span>${BookApp.formatTHB(subtotal + ship.price)}</span></div><a href="checkout.html" class="btn btn-primary" style="width:100%">ดำเนินการสั่งซื้อ</a><a href="products.html" class="btn btn-secondary" style="width:100%;margin-top:10px">เลือกเพิ่ม</a>`;
  shippingEl.querySelectorAll('[data-shipping]').forEach(el => el.onclick = () => { BookApp.setSelectedShipping(el.dataset.shipping); render(); });

  const findItem = id => items.find(item => String(item.product.id) === String(id));
  const saveQuantity = (id, requestedQuantity) => {
    const item = findItem(id);
    if (!item) return;
    const maxQuantity = BookApp.availableStock(item.product);
    if (maxQuantity <= 0) {
      BookApp.toast('สินค้านี้ไม่มีสต็อกคงเหลือ');
      render();
      return;
    }

    let nextQuantity = Math.trunc(Number(requestedQuantity));
    if (!Number.isFinite(nextQuantity) || nextQuantity < 1) nextQuantity = 1;
    if (nextQuantity > maxQuantity) {
      nextQuantity = maxQuantity;
      BookApp.toast(`จำนวนสินค้าสูงสุดคือ ${maxQuantity} เล่ม`);
    }

    if (nextQuantity === Number(item.qty)) {
      render();
      return;
    }
    BookApp.changeCartQty(id, nextQuantity);
    render();
  };

  itemsEl.querySelectorAll('[data-plus]').forEach(button => button.onclick = () => {
    const item = findItem(button.dataset.plus);
    if (!item) return;
    const maxQuantity = BookApp.availableStock(item.product);
    if (Number(item.qty) >= maxQuantity) {
      BookApp.toast(`จำนวนสินค้าสูงสุดคือ ${maxQuantity} เล่ม`);
      return;
    }
    saveQuantity(button.dataset.plus, Number(item.qty) + 1);
  });
  itemsEl.querySelectorAll('[data-minus]').forEach(button => button.onclick = () => {
    const item = findItem(button.dataset.minus);
    if (!item || Number(item.qty) <= 1) return;
    saveQuantity(button.dataset.minus, Number(item.qty) - 1);
  });

  itemsEl.querySelectorAll('[data-qty-display]').forEach(display => display.onclick = () => {
    const input = itemsEl.querySelector(`[data-qty-input="${display.dataset.qtyDisplay}"]`);
    if (!input) return;
    display.hidden = true;
    input.hidden = false;
    input.focus();
    input.select();
  });

  itemsEl.querySelectorAll('[data-qty-input]').forEach(input => {
    const id = input.dataset.qtyInput;
    const display = itemsEl.querySelector(`[data-qty-display="${id}"]`);
    const closeEditor = () => {
      input.hidden = true;
      if (display) display.hidden = false;
    };

    input.addEventListener('input', () => {
      if (input.value === '') return;
      const maxQuantity = Number(input.max);
      const entered = Number(input.value);
      if (Number.isFinite(entered) && entered > maxQuantity) {
        input.value = String(maxQuantity);
        BookApp.toast(`จำนวนสินค้าสูงสุดคือ ${maxQuantity} เล่ม`);
      }
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        input.blur();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        input.dataset.cancelEdit = 'true';
        input.blur();
      }
    });
    input.addEventListener('blur', () => {
      if (input.dataset.cancelEdit === 'true') {
        delete input.dataset.cancelEdit;
        closeEditor();
        return;
      }
      saveQuantity(id, input.value);
    });
  });
  itemsEl.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => {
    if (!BookApp.removeCartItem(b.dataset.remove)) return;
    BookApp.toast('ลบออกจากตะกร้าแล้ว');
    render();
  });
}
