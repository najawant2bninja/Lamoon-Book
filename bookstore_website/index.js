document.addEventListener('DOMContentLoaded', () => {
  const products = BookApp.products();
  const search = document.getElementById('homeSearchInput');
  const category = document.getElementById('homeCategorySelect');
  const grid = document.getElementById('featuredBooks');
  const title = document.getElementById('homeBooksTitle');
  const subtitle = document.getElementById('homeBooksSubtitle');
  const categories = [...new Set(products.map(product => product.category).filter(Boolean))];

  category.innerHTML += categories
    .map(name => `<option value="${BookApp.escapeHtml(name)}">${BookApp.escapeHtml(name)}</option>`)
    .join('');

  function render() {
    const query = search.value.trim().toLowerCase();
    const isFiltering = Boolean(query) || category.value !== 'all';
    let items = products.filter(product =>
      [product.title, product.author, product.isbn, product.category]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );

    if (category.value !== 'all') {
      items = items.filter(product => product.category === category.value);
    }

    items.sort((a, b) => (Number(b.sold) || 0) - (Number(a.sold) || 0));
    if (!isFiltering) items = items.slice(0, 6);

    title.textContent = isFiltering ? 'ผลการค้นหา' : 'หนังสือขายดี';
    subtitle.textContent = isFiltering
      ? `พบ ${items.length} รายการ`
      : 'ค้นหาหนังสือจากชื่อ ผู้แต่ง ISBN หรือหมวดหมู่';
    grid.innerHTML = items.length
      ? items.map(BookApp.bookCard).join('')
      : `<div class="empty-state" style="grid-column:1/-1"><div class="icon">${BookApp.icon('search')}</div><h3>ไม่พบหนังสือ</h3><p>ลองเปลี่ยนคำค้นหาหรือหมวดหมู่</p></div>`;
  }

  search.addEventListener('input', render);
  category.addEventListener('change', render);
  render();
});
