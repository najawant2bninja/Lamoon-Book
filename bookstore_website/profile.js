document.addEventListener('DOMContentLoaded', () => {
  if (!BookApp.requireLogin()) return;
  const user = BookApp.currentUser();
  const form = document.getElementById('profileForm');
  form.innerHTML = `<div class="form-group"><label>ชื่อผู้ใช้</label><input class="input" name="name" value="${BookApp.escapeHtml(user.name)}"></div><div class="form-group"><label>อีเมล</label><input class="input" name="email" value="${BookApp.escapeHtml(user.email)}" disabled></div><div class="form-group"><label>เบอร์โทร</label><input class="input" name="phone" value="${BookApp.escapeHtml(user.phone || '')}" inputmode="numeric" maxlength="10"></div><div class="form-group"><label>รหัสผ่านใหม่</label><input class="input" name="password" placeholder="เว้นว่างหากไม่เปลี่ยน"></div><button class="btn btn-primary" type="submit">บันทึกข้อมูล</button>`;
  const phoneInput = form.querySelector('input[name="phone"]');
  phoneInput?.addEventListener('input', () => { phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10); });
  form.onsubmit = e => { e.preventDefault(); const fd = new FormData(form); const phone = String(fd.get('phone') || '').replace(/\D/g, ''); if (!/^\d{10}$/.test(phone)) { BookApp.toast('กรุณากรอกเบอร์โทร 10 หลักเป็นตัวเลขเท่านั้น'); return; } const updated = { ...user, name: String(fd.get('name') || '').trim(), phone, password: String(fd.get('password') || '').trim() || user.password }; BookApp.saveUsers(BookApp.users().map(u => u.id === user.id ? updated : u)); BookApp.setCurrentUser(updated); BookApp.toast('บันทึกโปรไฟล์แล้ว'); };
  const addrSection = document.getElementById('addressList')?.closest('.card');
  const layout = document.querySelector('.profile-layout');
  if (user.role === 'staff') {
    if (addrSection) addrSection.style.display = 'none';
    layout?.classList.add('is-single');
  } else {
    renderAddr();
  }
});
function renderAddr() {
  const list = document.getElementById('addressList');
  const addrs = BookApp.addresses();
  list.innerHTML = addrs.map(a => `<article class="card address-item"><div class="address-content"><strong>${BookApp.escapeHtml(a.name || a.receiver || 'ที่อยู่จัดส่ง')}</strong><p class="helper">${BookApp.escapeHtml(a.receiver || '')}${a.phone ? ` · ${BookApp.escapeHtml(a.phone)}` : ''}${a.subdistrict || a.district || a.province || a.postalCode ? `<br>${BookApp.escapeHtml([a.subdistrict, a.district, a.province, a.postalCode].filter(Boolean).join(' '))}` : ''}${a.detail ? `<br>${BookApp.escapeHtml(a.detail)}` : ''}</p></div><button class="btn btn-danger btn-small" data-del="${a.id}">ลบ</button></article>`).join('') + `<form id="newAddr" class="grid"><input class="input" name="receiver" placeholder="ชื่อผู้รับ" required><input class="input" name="phone" placeholder="เบอร์โทร" inputmode="numeric" maxlength="10" required><textarea class="textarea" name="detail" placeholder="รายละเอียดที่อยู่" required></textarea><input class="input" name="subdistrict" placeholder="ตำบล" required><input class="input" name="district" placeholder="อำเภอ" required><input class="input" name="province" placeholder="จังหวัด" required><input class="input" name="postalCode" placeholder="เลขไปรษณีย์" inputmode="numeric" maxlength="5" required><button class="btn btn-secondary" type="submit">+ เพิ่มที่อยู่</button></form>`;
  list.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { BookApp.saveAddresses(BookApp.addresses().filter(a => a.id !== b.dataset.del)); renderAddr(); });
  const phoneInput = list.querySelector('input[name="phone"]');
  phoneInput?.addEventListener('input', () => { phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10); });
  const postalInput = list.querySelector('input[name="postalCode"]');
  postalInput?.addEventListener('input', () => { postalInput.value = postalInput.value.replace(/\D/g, '').slice(0, 5); });
  document.getElementById('newAddr').onsubmit = e => { e.preventDefault(); const fd = new FormData(e.target); const phone = String(fd.get('phone') || '').replace(/\D/g, ''); const postalCode = String(fd.get('postalCode') || '').replace(/\D/g, ''); if (!/^\d{10}$/.test(phone)) { BookApp.toast('กรุณากรอกเบอร์โทร 10 หลักเป็นตัวเลขเท่านั้น'); return; } if (!/^\d{5}$/.test(postalCode)) { BookApp.toast('กรุณากรอกเลขไปรษณีย์ 5 หลักเป็นตัวเลขเท่านั้น'); return; } BookApp.saveAddresses([...BookApp.addresses(), { id: 'a' + Date.now(), name: fd.get('receiver'), receiver: fd.get('receiver'), phone, subdistrict: fd.get('subdistrict'), district: fd.get('district'), province: fd.get('province'), postalCode, detail: fd.get('detail') }]); BookApp.toast('เพิ่มที่อยู่แล้ว'); renderAddr(); };
}