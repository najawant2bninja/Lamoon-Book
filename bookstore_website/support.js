document.addEventListener('DOMContentLoaded', () => {
  const user = BookApp.currentUser();
  if (user) document.querySelector('[name="email"]').value = user.email;
  document.getElementById('supportForm').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const response = await fetch('http://localhost:3000/api/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id || null, email: fd.get('email'), topic: fd.get('topic'), message: fd.get('message') }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message);
      e.target.reset();
      if (user) document.querySelector('[name="email"]').value = user.email;
      BookApp.toast('ส่งเรื่องแจ้งปัญหาแล้ว');
    } catch (error) { BookApp.toast(error.message || 'ไม่สามารถส่งเรื่องแจ้งปัญหาได้'); }
  };
});