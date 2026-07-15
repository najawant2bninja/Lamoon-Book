
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('registerForm').addEventListener('submit', e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const users = BookApp.users();
    if(users.some(u=>u.email===fd.get('email'))){ BookApp.toast('อีเมลนี้ถูกใช้งานแล้ว'); return; }
    const user = {id:'u'+Date.now(),name:fd.get('name'),email:fd.get('email'),phone:fd.get('phone'),password:fd.get('password'),role:'customer'};
    BookApp.saveUsers([...users,user]); BookApp.setCurrentUser(user); BookApp.toast('สมัครสมาชิกสำเร็จ'); setTimeout(()=>location.href='profile.html',700);
  });
});
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');

  form.addEventListener('submit', e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const users = BookApp.users();
    const email = String(fd.get('email') || '').trim();
    const phone = String(fd.get('phone') || '').replace(/\D/g, '');

    if (users.some(u => u.email === email)) {
      BookApp.toast('อีเมลนี้ถูกใช้งานแล้ว');
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      BookApp.toast('กรุณากรอกเบอร์โทรศัพท์เป็นตัวเลข 10 หลักเท่านั้น');
      return;
    }

    if (users.some(u => String(u.phone || '').replace(/\D/g, '') === phone)) {
      BookApp.toast('เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว');
      return;
    }

    const user = { id: 'u' + Date.now(), name: String(fd.get('name')||'').trim(), email, phone, password: String(fd.get('password')||'').trim(), role: 'customer' };
    BookApp.saveUsers([...users, user]);
    BookApp.setCurrentUser(user);
    BookApp.toast('สมัครสมาชิกสำเร็จ');
    setTimeout(() => location.href = 'profile.html', 700);
  });
  form.phone.addEventListener('input', () => {
    form.phone.value = form.phone.value.replace(/\D/g, '').slice(0, 10);
  });
});