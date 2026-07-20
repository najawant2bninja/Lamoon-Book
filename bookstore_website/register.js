
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  const API_URL = 'http://localhost:3000/api/auth/register';

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const fd = new FormData(e.target);
    const email = String(fd.get('email') || '').trim();
    const phone = String(fd.get('phone') || '').replace(/\D/g, '');
    const password = String(fd.get('password') || '').trim();
    const username = String(fd.get('name') || '').trim();

    if (!username || !email || !password) {
      BookApp.toast('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      BookApp.toast('กรุณากรอกเบอร์โทรศัพท์เป็นตัวเลข 10 หลักเท่านั้น');
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          password,
          fullName: username,
          phone
        })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'สมัครสมาชิกไม่สำเร็จ');
      }

      const localUser = { id: String(data.user?.id || data.userId), name: data.user?.fullName || username, email, phone, password, role: data.user?.role || 'member' };

      BookApp.setCurrentUser(localUser);
      BookApp.toast('สมัครสมาชิกสำเร็จ');
      setTimeout(() => location.href = 'profile.html', 700);
    } catch (error) {
      BookApp.toast(error.message || 'สมัครสมาชิกไม่สำเร็จ');
    }
  });

  form.phone.addEventListener('input', () => {
    form.phone.value = form.phone.value.replace(/\D/g, '').slice(0, 10);
  });
});
