document.addEventListener('DOMContentLoaded', () => {
  if (!BookApp.requireLogin()) return;
  const user = BookApp.currentUser();
  const form = document.getElementById('profileForm');
  form.innerHTML = `<div class="form-group"><label>ชื่อผู้ใช้</label><input class="input" name="name" value="${BookApp.escapeHtml(user.name)}"></div><div class="form-group"><label>อีเมล</label><input class="input" name="email" value="${BookApp.escapeHtml(user.email)}" disabled></div><div class="form-group"><label>เบอร์โทร</label><input class="input" name="phone" value="${BookApp.escapeHtml(user.phone || '')}"></div><div class="form-group"><label>รหัสผ่านใหม่</label><input class="input" name="password" placeholder="เว้นว่างหากไม่เปลี่ยน"></div><button class="btn btn-primary" type="submit">บันทึกข้อมูล</button>`;
  form.onsubmit = e => { e.preventDefault(); const fd = new FormData(form); const updated = { ...user, name: fd.get('name'), phone: fd.get('phone'), password: fd.get('password') || user.password }; BookApp.saveUsers(BookApp.users().map(u => u.id === user.id ? updated : u)); BookApp.setCurrentUser(updated); BookApp.toast('บันทึกโปรไฟล์แล้ว'); };
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
  list.innerHTML = addrs.map(a => `<article class="card address-item"><div><strong>${a.name}</strong><p class="helper">${a.receiver} · ${a.phone}<br>${a.detail}</p></div><button class="btn btn-danger btn-small" data-del="${a.id}">ลบ</button></article>`).join('') + `<form id="newAddr" class="grid"><input class="input" name="name" placeholder="ชื่อที่อยู่" required><input class="input" name="receiver" placeholder="ผู้รับ" required><input class="input" name="phone" placeholder="เบอร์โทร" required><textarea class="textarea" name="detail" placeholder="รายละเอียดที่อยู่" required></textarea><button class="btn btn-secondary" type="submit">+ เพิ่มที่อยู่</button></form>`;
  list.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { BookApp.saveAddresses(BookApp.addresses().filter(a => a.id !== b.dataset.del)); renderAddr(); });
  document.getElementById('newAddr').onsubmit = e => { e.preventDefault(); const fd = new FormData(e.target); BookApp.saveAddresses([...BookApp.addresses(), { id: 'a' + Date.now(), name: fd.get('name'), receiver: fd.get('receiver'), phone: fd.get('phone'), detail: fd.get('detail') }]); BookApp.toast('เพิ่มที่อยู่แล้ว'); renderAddr(); };
}