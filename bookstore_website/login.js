document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');

  document.querySelectorAll('[data-demo]').forEach(btn => {
    btn.onclick = () => {
      form.email.value = btn.dataset.demo;
      form.password.value = '123456';
      document.querySelectorAll('[data-demo]').forEach(item => item.classList.toggle('active', item === btn));
    };
  });

  form.addEventListener('submit', e=>{
    e.preventDefault();
    const fd = new FormData(form);
    const user = BookApp.users().find(u=>u.email===fd.get('email') && u.password===fd.get('password'));
    if(!user){ BookApp.toast('อีเมลหรือรหัสผ่านไม่ถูกต้อง'); return; }
    BookApp.setCurrentUser(user);
    BookApp.toast('เข้าสู่ระบบสำเร็จ');
    setTimeout(()=>{ location.href = user.role==='admin'?'admin.html':user.role==='staff'?'staff.html':'products.html'; },600);
  });
});