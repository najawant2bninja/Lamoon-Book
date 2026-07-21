document.addEventListener('DOMContentLoaded', () => {
  if (!BookApp.requireLogin()) return;
  const grid = document.getElementById('favGrid');
  const actions = document.getElementById('favoriteActions');
  const selectAll = document.getElementById('selectAllFavorites');
  const selectedCount = document.getElementById('selectedFavoriteCount');
  const addSelected = document.getElementById('addSelectedToCart');
  const selected = new Set();

  function updateSelectionControls(items) {
    const selectableIds = items
      .filter(p => BookApp.availableStock(p) > 0)
      .map(p => String(p.id));
    const selectedAvailable = selectableIds.filter(id => selected.has(id));
    selectedCount.textContent = `เลือกแล้ว ${selectedAvailable.length} รายการ`;
    selectAll.checked = selectableIds.length > 0 && selectedAvailable.length === selectableIds.length;
    selectAll.indeterminate = selectedAvailable.length > 0 && !selectAll.checked;
    addSelected.disabled = selectedAvailable.length === 0;
  }

  function render() {
    const favoriteIds = new Set(BookApp.favorites().map(id => String(id)));
    const items = BookApp.products().filter(p => favoriteIds.has(String(p.id)));
    [...selected].forEach(id => {
      const product = items.find(p => String(p.id) === String(id));
      if (!product || BookApp.availableStock(product) <= 0) selected.delete(id);
    });
    actions.hidden = !items.length;
    grid.innerHTML = items.length
      ? items.map(BookApp.bookCard).join('')
      : `<div class="empty-state" style="grid-column:1/-1"><div class="icon">${BookApp.icon('heart')}</div><h3>ยังไม่มีรายการโปรด</h3><p>กดปุ่มบันทึกรายการโปรดในหน้าหนังสือ</p><a href="products.html" class="btn btn-primary">ไปเลือกหนังสือ</a></div>`;

    grid.querySelectorAll('.book-card').forEach(card => {
      const product = BookApp.findProduct(card.dataset.id);
      if (!product || BookApp.availableStock(product) <= 0) return;
      const productId = String(product.id);
      card.insertAdjacentHTML('afterbegin', `<label class="favorite-select"><input type="checkbox" data-favorite-select="${productId}" ${selected.has(productId) ? 'checked' : ''}><span class="sr-only">เลือก ${BookApp.escapeHtml(product.title)}</span></label>`);
      card.classList.toggle('is-selected', selected.has(productId));
    });
    grid.querySelectorAll('[data-favorite-select]').forEach(input => input.addEventListener('change', event => {
      const id = event.currentTarget.dataset.favoriteSelect;
      event.currentTarget.checked ? selected.add(id) : selected.delete(id);
      event.currentTarget.closest('.book-card').classList.toggle('is-selected', event.currentTarget.checked);
      updateSelectionControls(items);
    }));
    grid.querySelectorAll('[data-fav]').forEach(btn => btn.addEventListener('click', () => setTimeout(render, 50)));
    updateSelectionControls(items);
  }

  selectAll.addEventListener('change', () => {
    const favoriteIds = new Set(BookApp.favorites().map(id => String(id)));
    const items = BookApp.products().filter(p => favoriteIds.has(String(p.id)) && BookApp.availableStock(p) > 0);
    items.forEach(product => selectAll.checked ? selected.add(String(product.id)) : selected.delete(String(product.id)));
    render();
  });
  addSelected.addEventListener('click', () => {
    let added = 0;
    [...selected].forEach(id => { if (BookApp.addToCart(id)) added++; });
    selected.clear();
    BookApp.toast(added ? `เพิ่มหนังสือ ${added} รายการลงตะกร้าแล้ว` : 'ไม่สามารถเพิ่มรายการที่เลือกลงตะกร้าได้');
    render();
  });
  render();
});
