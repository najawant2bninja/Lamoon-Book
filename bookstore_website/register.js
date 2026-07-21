
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const fd = new FormData(e.target);
    const email = String(fd.get('email') || '').trim();
    const phone = String(fd.get('phone') || '').replace(/\D/g, '');
    const password = String(fd.get('password') || '');
    const username = String(fd.get('name') || '').trim();

    if (!username || !email || !password) {
      BookApp.toast('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (password.length < 8) {
      BookApp.toast('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      BookApp.toast('กรุณากรอกเบอร์โทรศัพท์เป็นตัวเลข 10 หลักเท่านั้น');
      return;
    }

    try {
      const data = await BookApp.apiRequest('POST', '/auth/register', {
        username,
        email,
        password,
        fullName: username,
        phone
      });

      if (!data?.ok) {
        throw new Error(data.message || 'สมัครสมาชิกไม่สำเร็จ');
      }

      BookApp.toast('สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ');
      setTimeout(() => location.href = 'login.html', 700);
    } catch (error) {
      BookApp.toast(error.message || 'สมัครสมาชิกไม่สำเร็จ');
    }
  });

  form.phone.addEventListener('input', () => {
    form.phone.value = form.phone.value.replace(/\D/g, '').slice(0, 10);
  });
});
