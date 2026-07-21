document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const API_URL = 'http://localhost:3000/api/auth/login';

  form.addEventListener('submit', async e=>{
    e.preventDefault();

    const fd = new FormData(form);
    const payload = {
      email: String(fd.get('email') || '').trim(),
      password: String(fd.get('password') || '').trim()
    };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }

      const user = {
        id: String(data.user.id),
        name: data.user.fullName || data.user.username,
        email: data.user.email,
        phone: data.user.phone || '',
        password: payload.password,
        role: data.user.role
      };

      BookApp.setCurrentUser(user);
      BookApp.toast('เข้าสู่ระบบสำเร็จ');
      setTimeout(() => {
        location.href = user.role === 'admin' ? 'admin.html' : user.role === 'staff' ? 'staff.html' : 'products.html';
      }, 600);
    } catch (error) {
      BookApp.toast(error.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
  });
});
