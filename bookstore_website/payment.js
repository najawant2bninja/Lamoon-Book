document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('bankIcon').innerHTML = BookApp.icon('bank');
  document.getElementById('uploadLabel').innerHTML = `${BookApp.icon('upload')} แนบสลิปการโอนเงิน`;
  if(!BookApp.requireLogin()) return;
  const draft = JSON.parse(localStorage.getItem(BookApp.STORAGE.checkoutDraft) || 'null');
  if(!draft){ BookApp.toast('ไม่พบข้อมูล Checkout'); setTimeout(()=>location.href='cart.html',700); return; }
  document.getElementById('paymentSummary').innerHTML = `<h3 style="margin-top:0;color:var(--brown)">ยอดที่ต้องชำระ</h3>${draft.items.map(i=>`<div class="summary-row"><span>${BookApp.escapeHtml(i.title)} × ${i.qty}</span><strong>${BookApp.formatTHB(i.price*i.qty)}</strong></div>`).join('')}<div class="summary-row"><span>รวมสินค้า</span><strong>${BookApp.formatTHB(draft.subtotal)}</strong></div><div class="summary-row"><span>${draft.shippingMethod ? BookApp.escapeHtml(draft.shippingMethod.name) : 'ค่าจัดส่ง'}</span><strong>${BookApp.formatTHB(draft.shipping)}</strong></div><div class="summary-row total-row"><span>ยอดสุทธิ</span><span>${BookApp.formatTHB(draft.total)}</span></div>${draft.address ? `<p class="helper">ที่อยู่: ${BookApp.escapeHtml(draft.address.detail)}</p>` : ''}<div class="status-panel"><strong>หลังส่งสลิป</strong><br><span class="helper">สถานะจะเป็น “รอตรวจสลิป” และสินค้าเป็น “จองสินค้า”</span></div>`;
  const input = document.getElementById('slipInput');
  const preview = document.getElementById('slipPreview');
  let slipData = '';
  let slipType = '';

  function renderPreview(file){
    if(!file){
      preview.className = 'slip-preview empty';
      preview.textContent = 'ยังไม่มีตัวอย่างสลิป';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      slipData = reader.result;
      slipType = file.type || '';
      preview.className = 'slip-preview';
      if(slipType.startsWith('image/')){
        preview.innerHTML = `<img src="${slipData}" alt="ตัวอย่างสลิปการโอนเงิน"><span>ตัวอย่างสลิปที่เลือก</span>`;
      }else{
        preview.innerHTML = `<div class="pdf-preview">${BookApp.icon('file')} ไฟล์ PDF พร้อมส่งให้พนักงานตรวจสอบ</div>`;
      }
    };
    reader.readAsDataURL(file);
  }

  input.addEventListener('change',()=>{
    const file = input.files[0];
    document.getElementById('fileName').textContent = file?.name || 'ยังไม่ได้เลือกไฟล์';
    renderPreview(file);
  });
  document.getElementById('paymentForm').addEventListener('submit', e=>{
    e.preventDefault();
    const file = input.files[0];
    if(!file){ BookApp.toast('กรุณาแนบสลิปก่อน'); return; }
    if(!slipData){ BookApp.toast('ระบบกำลังอ่านไฟล์สลิป กรุณากดอีกครั้ง'); return; }
    const order = BookApp.makeOrder(draft, file.name, slipData, slipType);
    BookApp.toast('ส่งสลิปแล้ว รอพนักงานตรวจสอบ');
    setTimeout(()=>location.href='tracking.html?order='+order.id,700);
  });
});