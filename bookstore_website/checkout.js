document.addEventListener("DOMContentLoaded", () => {
  if (!BookApp.requireLogin()) return;
  if (!BookApp.cartDetailed().length) {
    location.href = "cart.html";
    return;
  }
  let selectedAddress = BookApp.addresses()[0]?.id;
  let selectedShipping = BookApp.getSelectedShipping();
  const main = document.getElementById("checkoutMain");
  const summary = document.getElementById("checkoutSummary");
  const cartBookCount = () =>
    BookApp.cartDetailed().reduce((sum, item) => sum + item.qty, 0);

  function openAddAddressModal() {
    const overlay = document.createElement("div");
    overlay.id = "addrModalOverlay";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:1000";
    overlay.innerHTML = `
      <div class="card" style="width:min(460px,90vw);padding:24px;max-height:90vh;overflow:auto">
        <h3 style="margin-top:0">เพิ่มที่อยู่จัดส่ง</h3>
        <form id="addrForm" class="form-grid">
          <input class="input" name="receiver" placeholder="ชื่อผู้รับ" required>
          <input class="input" name="phone" placeholder="เบอร์โทร (10 หลัก)" type="tel" inputmode="numeric" pattern="[0-9]{10}" maxlength="10" required>
          <input class="input" name="detail" placeholder="รายละเอียดที่อยู่ (บ้านเลขที่ ถนน)" required>
          <input class="input" name="subdistrict" placeholder="ตำบล" required>
          <input class="input" name="district" placeholder="อำเภอ" required>
          <input class="input" name="province" placeholder="จังหวัด" required>
          <input class="input" name="postalCode" placeholder="เลขไปรษณีย์" inputmode="numeric" maxlength="5" required>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button class="btn btn-primary" type="submit" style="flex:1">${BookApp.icon("plus")} เพิ่มที่อยู่</button>
            <button class="btn btn-secondary" type="button" id="addrModalCancel" style="flex:1">ยกเลิก</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    document.getElementById("addrModalCancel").onclick = close;

    const phoneInput = overlay.querySelector('[name="phone"]');
    phoneInput.addEventListener("input", () => {
      phoneInput.value = phoneInput.value.replace(/\D/g, "").slice(0, 10);
    });
    const postalInput = overlay.querySelector('[name="postalCode"]');
    postalInput.addEventListener("input", () => {
      postalInput.value = postalInput.value.replace(/\D/g, "").slice(0, 5);
    });

    document.getElementById("addrForm").onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const phone = String(fd.get("phone") || "").replace(/\D/g, "");
      const postalCode = String(fd.get("postalCode") || "").replace(/\D/g, "");
      
      if (phone.length !== 10) {
        BookApp.toast("กรุณากรอกเบอร์โทรให้ครบ 10 หลัก (ตัวเลขเท่านั้น)");
        return;
      }
      if (!/^\d{5}$/.test(postalCode)) {
        BookApp.toast("กรุณากรอกเลขไปรษณีย์ 5 หลักเป็นตัวเลขเท่านั้น");
        return;
      }

      // ยุบรวมช่องกรอกทั้งหมดให้เป็น string ก้อนเดียวใน detail
      const detailCombined = [
        fd.get("detail"),
        fd.get("subdistrict") && `ตำบล${fd.get("subdistrict")}`,
        fd.get("district") && `อำเภอ${fd.get("district")}`,
        fd.get("province") && `จังหวัด${fd.get("province")}`,
        postalCode,
      ].filter(Boolean).join(" ");

      const address = BookApp.createAddress({
        name: fd.get("receiver"),
        receiver: fd.get("receiver"),
        phone,
        detail: detailCombined
      });

      if (!address) {
        BookApp.toast("ไม่สามารถเพิ่มที่อยู่ได้");
        return;
      }
      selectedAddress = address.id;
      BookApp.toast("เพิ่มที่อยู่แล้ว");
      close();
      render();
    };
  }

  function render() {
    const addresses = BookApp.addresses();
    const bookCount = cartBookCount();
    const shippingOptions = BookApp.shippingOptions(bookCount);
    if (!shippingOptions.some((s) => s.id === selectedShipping))
      selectedShipping = shippingOptions[0]?.id || "";
    BookApp.setSelectedShipping(selectedShipping);
    
    main.innerHTML = `
      <section class="card">
        <h3>ที่อยู่จัดส่ง</h3>
        <div class="grid grid-2" id="addrList">
          ${addresses.map((a) => `
            <article class="card address-card ${a.id === selectedAddress ? "active" : ""}" data-address="${a.id}">
              <strong>${BookApp.escapeHtml(a.name || a.receiver || 'ที่อยู่จัดส่ง')}</strong>
              <p class="helper">
                ${BookApp.escapeHtml(a.receiver || '')}
                ${a.phone ? ` · ${BookApp.escapeHtml(a.phone)}` : ''}
                ${a.detail ? `<br>${BookApp.escapeHtml(a.detail)}` : ''}
              </p>
            </article>
          `).join("")}
        </div>
        <button class="btn btn-secondary" id="addAddrBtn" style="margin-top:14px">${BookApp.icon("plus")} เพิ่มที่อยู่</button>
      </section>`;

    document.querySelectorAll("[data-address]").forEach(
      (el) => (el.onclick = () => { selectedAddress = el.dataset.address; render(); }),
    );
    document.getElementById("addAddrBtn").onclick = openAddAddressModal;
    renderSummary();
  }

  function renderSummary() {
    const items = BookApp.cartDetailed();
    const subtotal = BookApp.cartTotal();
    const bookCount = items.reduce((sum, item) => sum + item.qty, 0);
    const ship = BookApp.shippingOptions(bookCount).find(
      (s) => s.id === selectedShipping,
    ) || { id: "unknown", name: "กรุณาเลือกวิธีจัดส่ง", price: 0 };

    const address = BookApp.addresses().find((a) => a.id === selectedAddress);
    const total = subtotal + ship.price;
    const addressText = address ? address.detail : "กรุณาเพิ่มที่อยู่";

    summary.innerHTML = `
      <h3 style="margin-top:0;color:var(--brown)">สรุปยอดชำระ</h3>
      ${items.map((i) => `
        <div class="summary-row">
          <span>${BookApp.escapeHtml(i.product.title)} × ${i.qty}</span>
          <strong>${BookApp.formatTHB(i.product.price * i.qty)}</strong>
        </div>
      `).join("")}
      <div class="summary-row">
        <span>รวมสินค้า</span>
        <strong>${BookApp.formatTHB(subtotal)}</strong>
      </div>
      <div class="summary-row">
        <span>${BookApp.escapeHtml(ship.name)}</span>
        <strong>${BookApp.formatTHB(ship.price)}</strong>
      </div>
      <div class="summary-row total-row">
        <span>ยอดสุทธิ</span>
        <span>${BookApp.formatTHB(total)}</span>
      </div>
      <p class="helper">ที่อยู่: ${BookApp.escapeHtml(addressText)}</p>
      <button class="btn btn-primary" id="payBtn" style="width:100%">ไปหน้าชำระเงิน</button>
    `;

    document.getElementById("payBtn").onclick = () => {
      if (!address) { BookApp.toast("กรุณาเพิ่มที่อยู่จัดส่ง"); return; }
      if (ship.id === "unknown") { BookApp.toast("กรุณาเลือกวิธีจัดส่ง"); return; }

      const checkoutDraft = {
        items: items.map((i) => ({ id: i.id, qty: i.qty, title: i.product.title, price: i.product.price })),
        subtotal,
        shipping: ship.price,
        total,
        address,
        shippingMethod: ship,
      };
      BookApp.setCheckoutDraft(checkoutDraft);
      location.href = "payment.html";
    };
  }
  render();
});
