document.addEventListener('DOMContentLoaded', () => {
  const search = document.getElementById('searchInput');
  const cat = document.getElementById('categorySelect');
  const stock = document.getElementById('stockSelect');
  const grid = document.getElementById('productsGrid');
  const categories = [...new Set(BookApp.products().map(p => p.category))];
  cat.innerHTML += categories.map(c => `<option value="${BookApp.escapeHtml(c)}">${BookApp.escapeHtml(c)}</option>`).join('');
  const selectedCategory = new URLSearchParams(location.search).get('category');
  if (selectedCategory && categories.includes(selectedCategory)) cat.value = selectedCategory;
  function render() {
    const q = search.value.trim().toLowerCase();
    let items = BookApp.products().filter(p => [p.title, p.author, p.isbn, p.category].join(' ').toLowerCase().includes(q));
    if (cat.value !== 'all') items = items.filter(p => p.category === cat.value);
    const stockVal = stock ? stock.value : 'all';
    if (stockVal === 'ready') items = items.filter(p => BookApp.availableStock(p) > 0);
    if (stockVal === 'low') items = items.filter(p => BookApp.availableStock(p) < 100);
    items.sort((a, b) => {
      const aOut = BookApp.availableStock(a) <= 0;
      const bOut = BookApp.availableStock(b) <= 0;
      return aOut === bOut ? 0 : aOut ? 1 : -1;
    });
    grid.innerHTML = items.length ? items.map(BookApp.bookCard).join('') : `<div class="empty-state" style="grid-column:1/-1"><div class="icon">${BookApp.icon('search')}</div><h3>ไม่พบหนังสือ</h3><p>ลองเปลี่ยนคำค้นหาหรือหมวดหมู่</p></div>`;
    BookApp.bindGlobalActions(grid);
  }
  const inputs = [search, cat];
  if (stock) inputs.push(stock);
  inputs.forEach(el => el.addEventListener('input', render));
  render();
});
