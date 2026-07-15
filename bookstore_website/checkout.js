document.addEventListener('DOMContentLoaded', () => {
  if(!BookApp.requireLogin()) return;
  if(!BookApp.cartDetailed().length){ location.href='cart.html'; return; }
  let selectedAddress = BookApp.addresses()[0]?.id;
  let selectedShipping = localStorage.getItem(BookApp.STORAGE.selectedShipping) || 'standard';
  const main = document.getElementById('checkoutMain');
  const summary = document.getElementById('checkoutSummary');
  // แก้ไข: นับจำนวนเล่มในตะกร้า เพื่อส่งไปคำนวณค่าจัดส่งตามช่วงราคา
  const cartBookCount = () => BookApp.cartDetailed().reduce((sum, item) => sum + item.qty, 0);
  function render(){
    const addresses = BookApp.addresses();
    const bookCount = cartBookCount();
    const shippingOptions = BookApp.shippingOptions(bookCount);
    if(!shippingOptions.some(s=>s.id===selectedShipping)) selectedShipping = 'standard';
    localStorage.setItem(BookApp.STORAGE.selectedShipping, selectedShipping);
    main.innerHTML = `
      <section class="card"><h3>ที่อยู่จัดส่ง</h3><div class="grid grid-2" id="addrList">${addresses.map(a=>`<article class="card address-card ${a.id===selectedAddress?'active':''}" data-address="${a.id}"><strong>${BookApp.escapeHtml(a.name || a.receiver || 'ที่อยู่จัดส่ง')}</strong><p class="helper">${BookApp.escapeHtml(a.receiver || '')}${a.phone ? ` · ${BookApp.escapeHtml(a.phone)}` : ''}${a.subdistrict || a.district || a.province || a.postalCode ? `<br>${BookApp.escapeHtml([a.subdistrict, a.district, a.province, a.postalCode].filter(Boolean).join(' '))}` : ''}${a.detail ? `<br>${BookApp.escapeHtml(a.detail)}` : ''}</p></article>`).join('')}</div><form id="addrForm" class="form-grid" style="margin-top:14px"><input class="input" name="receiver" placeholder="ชื่อผู้รับ" required><input class="input" name="phone" placeholder="เบอร์โทร" inputmode="numeric" maxlength="10" required><input class="input" name="subdistrict" placeholder="ตำบล" required><input class="input" name="district" placeholder="อำเภอ" required><input class="input" name="province" placeholder="จังหวัด" required><input class="input" name="postalCode" placeholder="เลขไปรษณีย์" inputmode="numeric" maxlength="5" required><textarea class="textarea" name="detail" placeholder="รายละเอียดที่อยู่" required></textarea><button class="btn btn-secondary" type="submit">${BookApp.icon('plus')} เพิ่มที่อยู่</button></form></section>`;
    document.querySelectorAll('[data-address]').forEach(el=>el.onclick=()=>{selectedAddress=el.dataset.address; render();});
    const phoneInput = document.querySelector('#addrForm input[name="phone"]');
    phoneInput?.addEventListener('input', () => { phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10); });
    const postalInput = document.querySelector('#addrForm input[name="postalCode"]');
    postalInput?.addEventListener('input', () => { postalInput.value = postalInput.value.replace(/\D/g, '').slice(0, 5); });
    document.getElementById('addrForm').onsubmit = (e)=>{ e.preventDefault(); const fd=new FormData(e.target); const phone = String(fd.get('phone') || '').replace(/\D/g, ''); const postalCode = String(fd.get('postalCode') || '').replace(/\D/g, ''); if(!/^\d{10}$/.test(phone)){ BookApp.toast('กรุณากรอกเบอร์โทร 10 หลักเป็นตัวเลขเท่านั้น'); return; } if(!/^\d{5}$/.test(postalCode)){ BookApp.toast('กรุณากรอกเลขไปรษณีย์ 5 หลักเป็นตัวเลขเท่านั้น'); return; } const item={id:'a'+Date.now(),name:fd.get('receiver'),receiver:fd.get('receiver'),phone,subdistrict:fd.get('subdistrict'),district:fd.get('district'),province:fd.get('province'),postalCode,detail:fd.get('detail')}; BookApp.saveAddresses([...BookApp.addresses(),item]); selectedAddress=item.id; BookApp.toast('เพิ่มที่อยู่แล้ว'); render(); };
    renderSummary();
  }
  function renderSummary(){
    const items=BookApp.cartDetailed();
    const subtotal=BookApp.cartTotal();
    const bookCount=items.reduce((sum,item)=>sum+item.qty,0);
    // แก้ไข: ใช้ราคาจัดส่งที่คำนวณจากจำนวนเล่มจริงในสรุปยอด
    const ship=BookApp.shippingOptions(bookCount).find(s=>s.id===selectedShipping);
    const address=BookApp.addresses().find(a=>a.id===selectedAddress);
    const total=subtotal+(ship?.price||0);
    summary.innerHTML=`<h3 style="margin-top:0;color:var(--brown)">สรุปยอดชำระ</h3>${items.map(i=>`<div class="summary-row"><span>${BookApp.escapeHtml(i.product.title)} × ${i.qty}</span><strong>${BookApp.formatTHB(i.product.price*i.qty)}</strong></div>`).join('')}<div class="summary-row"><span>รวมสินค้า</span><strong>${BookApp.formatTHB(subtotal)}</strong></div><div class="summary-row"><span>${ship.name}</span><strong>${BookApp.formatTHB(ship.price)}</strong></div><div class="summary-row total-row"><span>ยอดสุทธิ</span><span>${BookApp.formatTHB(total)}</span></div><p class="helper">ที่อยู่: ${address ? BookApp.escapeHtml([address.subdistrict, address.district, address.province, address.postalCode, address.detail].filter(Boolean).join(' ')) : 'กรุณาเพิ่มที่อยู่'}</p><button class="btn btn-primary" id="payBtn" style="width:100%">ไปหน้าชำระเงิน</button>`;
    document.getElementById('payBtn').onclick=()=>{
      if(!address){ BookApp.toast('กรุณาเพิ่มที่อยู่จัดส่ง'); return; }
      localStorage.setItem(BookApp.STORAGE.checkoutDraft, JSON.stringify({items:items.map(i=>({id:i.id,qty:i.qty,title:i.product.title,price:i.product.price})),subtotal,shipping:ship.price,total,address,shippingMethod:ship}));
      location.href='payment.html';
    };
  }
  render();
});
