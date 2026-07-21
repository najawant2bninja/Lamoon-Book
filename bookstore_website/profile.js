document.addEventListener('DOMContentLoaded', () => {
  if (!BookApp.requireLogin()) return;
  const user = BookApp.currentUser();
  const form = document.getElementById('profileForm');
  form.innerHTML = `
    <div class="form-group"><label>ชื่อผู้ใช้</label><input class="input" name="name" value="${BookApp.escapeHtml(user.name)}"></div>
    <div class="form-group"><label>อีเมล</label><input class="input" name="email" value="${BookApp.escapeHtml(user.email)}" disabled></div>
    <div class="form-group"><label>เบอร์โทร</label><input class="input" name="phone" value="${BookApp.escapeHtml(user.phone || '')}" inputmode="numeric" maxlength="10"></div>
    <div class="form-group">
      <label>รหัสผ่าน</label>
      <button type="button" class="btn btn-secondary" id="openPwdModalBtn">${BookApp.icon ? BookApp.icon('login') : ''} เปลี่ยนรหัสผ่าน</button>
    </div>
    <button class="btn btn-primary" type="submit">บันทึกข้อมูล</button>`;

  const phoneInput = form.querySelector('input[name="phone"]');
  phoneInput?.addEventListener('input', () => { phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10); });

  form.onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const phone = String(fd.get('phone') || '').replace(/\D/g, '');
    if (!/^\d{10}$/.test(phone)) { BookApp.toast('กรุณากรอกเบอร์โทร 10 หลักเป็นตัวเลขเท่านั้น'); return; }
    const name = String(fd.get('name') || '').trim();
    if (!name) { BookApp.toast('กรุณากรอกชื่อผู้ใช้'); return; }
    const result = await BookApp.apiRequest('PUT', `/users/${encodeURIComponent(user.id)}`, { name, phone });
    if (!result?.ok) { BookApp.toast(result?.message || 'ไม่สามารถบันทึกโปรไฟล์ได้'); return; }
    const updated = { ...BookApp.currentUser(), name, phone };
    BookApp.saveUsers(BookApp.users().map(u => u.id === updated.id ? updated : u));
    BookApp.setCurrentUser(updated);
    BookApp.toast('บันทึกโปรไฟล์แล้ว');
  };

  document.getElementById('openPwdModalBtn').addEventListener('click', openPasswordModal);

  const addrSection = document.getElementById('addressList')?.closest('.card');
  const layout = document.querySelector('.profile-layout');
  const doesNotUseShippingAddress = user.role === 'admin' || user.role === 'staff';
  if (doesNotUseShippingAddress) {
    if (addrSection) addrSection.style.display = 'none';
    layout?.classList.add('is-single');
    const subtitle = document.getElementById('profileSubtitle');
    if (subtitle) subtitle.textContent = 'จัดการข้อมูลบัญชีและรหัสผ่าน';
  } else {
    renderAddr();
  }
});

// ---------------- Modal เปลี่ยนรหัสผ่าน ----------------
function openPasswordModal() {
  document.getElementById('pwdModalOverlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'pwdModalOverlay';
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,.5);
    display:flex; align-items:center; justify-content:center;
    z-index:1000; padding:16px;`;

  overlay.innerHTML = `
    <div class="card" style="max-width:400px;width:100%;position:relative">
      <button type="button" id="closePwdModalBtn" aria-label="ปิด"
        style="position:absolute;top:12px;right:12px;background:none;border:none;cursor:pointer;color:var(--brown)">
        ${BookApp.icon ? BookApp.icon('close') : '✕'}
      </button>
      <h3 style="margin-top:0;color:var(--brown)">เปลี่ยนรหัสผ่าน</h3>
      <form id="pwdChangeForm">
        <div class="form-group">
          <label>รหัสผ่านปัจจุบัน</label>
          <input class="input" type="password" name="currentPassword" autocomplete="current-password" required>
        </div>
        <div class="form-group">
          <label>รหัสผ่านใหม่</label>
          <input class="input" type="password" name="newPassword" autocomplete="new-password" required minlength="8">
        </div>
        <div class="form-group">
          <label>ยืนยันรหัสผ่านใหม่</label>
          <input class="input" type="password" name="confirmPassword" autocomplete="new-password" required minlength="8">
        </div>
        <div class="pill-row" style="justify-content:flex-end;margin-top:8px">
          <button type="button" class="btn btn-secondary" id="cancelPwdBtn">ยกเลิก</button>
          <button type="submit" class="btn btn-primary">บันทึกรหัสผ่านใหม่</button>
        </div>
      </form>
    </div>`;

  document.body.appendChild(overlay);

  const closeModal = () => overlay.remove();
  document.getElementById('closePwdModalBtn').onclick = closeModal;
  document.getElementById('cancelPwdBtn').onclick = closeModal;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  document.getElementById('pwdChangeForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const currentPassword = String(fd.get('currentPassword') || '');
    const newPassword = String(fd.get('newPassword') || '');
    const confirmPassword = String(fd.get('confirmPassword') || '');
    const user = BookApp.currentUser();

    if (newPassword.length < 8) {
      BookApp.toast('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      BookApp.toast('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน');
      return;
    }
    if (newPassword === currentPassword) {
      BookApp.toast('รหัสผ่านใหม่ต้องไม่เหมือนรหัสผ่านเดิม');
      return;
    }

    try {
      const data = await BookApp.apiRequest('POST', `/users/${encodeURIComponent(user.id)}/password`, {
        currentPassword,
        newPassword
      });
      if (!data?.ok) throw new Error(data?.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
      BookApp.toast('เปลี่ยนรหัสผ่านสำเร็จ');
      closeModal();
    } catch (error) {
      BookApp.toast(error.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
    }
  };
}

// ---------------- ที่อยู่จัดส่ง (เหมือนเดิม ไม่แก้) ----------------
function renderAddr() {
  const list = document.getElementById('addressList');
  const addrs = BookApp.addresses();

  list.innerHTML = addrs.map(a => `
    <article class="card address-item">
      <div class="address-content">
        <strong>${BookApp.escapeHtml(a.name || a.receiver || 'ที่อยู่จัดส่ง')}</strong>
        <p class="helper">
          ${BookApp.escapeHtml(a.receiver || '')}
          ${a.phone ? ` · ${BookApp.escapeHtml(a.phone)}` : ''}
          ${a.detail ? `<br>${BookApp.escapeHtml(a.detail)}` : ''}
        </p>
      </div>
      <button class="btn btn-danger btn-small" data-del="${a.id}">ลบ</button>
    </article>
  `).join('') + `
    <form id="newAddr" class="grid">
      <input class="input" name="receiver" placeholder="ชื่อผู้รับ" required>
      <input class="input" name="phone" placeholder="เบอร์โทร" inputmode="numeric" maxlength="10" required>
      <textarea class="textarea" name="detail" placeholder="รายละเอียดที่อยู่ (บ้านเลขที่ ถนน)" required></textarea>
      <input class="input" name="subdistrict" placeholder="ตำบล" required>
      <input class="input" name="district" placeholder="อำเภอ" required>
      <input class="input" name="province" placeholder="จังหวัด" required>
      <input class="input" name="postalCode" placeholder="เลขไปรษณีย์" inputmode="numeric" maxlength="5" required>
      <button class="btn btn-secondary" type="submit">+ เพิ่มที่อยู่</button>
    </form>
  `;

  list.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    if (BookApp.deleteAddress(b.dataset.del)) { BookApp.toast('ลบที่อยู่แล้ว'); renderAddr(); }
    else BookApp.toast('ไม่สามารถลบที่อยู่ได้');
  });

  const phoneInput = list.querySelector('input[name="phone"]');
  phoneInput?.addEventListener('input', () => { phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10); });

  const postalInput = list.querySelector('input[name="postalCode"]');
  postalInput?.addEventListener('input', () => { postalInput.value = postalInput.value.replace(/\D/g, '').slice(0, 5); });

  document.getElementById('newAddr').onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const phone = String(fd.get('phone') || '').replace(/\D/g, '');
    const postalCode = String(fd.get('postalCode') || '').replace(/\D/g, '');

    if (!/^\d{10}$/.test(phone)) { BookApp.toast('กรุณากรอกเบอร์โทร 10 หลักเป็นตัวเลขเท่านั้น'); return; }
    if (!/^\d{5}$/.test(postalCode)) { BookApp.toast('กรุณากรอกเลขไปรษณีย์ 5 หลักเป็นตัวเลขเท่านั้น'); return; }

    const detailCombined = [
      fd.get('detail'),
      fd.get('subdistrict') && `ตำบล${fd.get('subdistrict')}`,
      fd.get('district') && `อำเภอ${fd.get('district')}`,
      fd.get('province') && `จังหวัด${fd.get('province')}`,
      postalCode,
    ].filter(Boolean).join(' ');

    const address = BookApp.createAddress({
      name: fd.get('receiver'),
      receiver: fd.get('receiver'),
      phone,
      detail: detailCombined
    });

    if (!address) { BookApp.toast('ไม่สามารถเพิ่มที่อยู่ได้'); return; }
    BookApp.toast('เพิ่มที่อยู่แล้ว');
    renderAddr();
  };
}
