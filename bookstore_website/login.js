document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');

  form.addEventListener('submit', async e=>{
    e.preventDefault();

    const fd = new FormData(form);
    const payload = {
      email: String(fd.get('email') || '').trim(),
      password: String(fd.get('password') || '')
    };

    try {
      const data = await BookApp.apiRequest('POST', '/auth/login', payload);

      if (!data?.ok) {
        throw new Error(data?.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }
      if (!data?.token || !data?.user) {
        throw new Error('Backend ไม่ได้ส่ง token สำหรับการเข้าสู่ระบบ');
      }

      const user = {
        id: String(data.user.id),
        name: data.user.fullName || data.user.username,
        email: data.user.email,
        phone: data.user.phone || '',
        role: data.user.role
      };

      BookApp.setCurrentUser(user, data.token);
      BookApp.toast('เข้าสู่ระบบสำเร็จ');
      setTimeout(() => {
        location.href = user.role === 'admin' ? 'admin.html' : user.role === 'staff' ? 'staff.html' : 'products.html';
      }, 600);
    } catch (error) {
      BookApp.toast(error.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
  });
});
