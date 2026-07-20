document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('detailRoot');
  const id = location.hash ? location.hash.replace('#id=', '') : 'b001';
  const product = BookApp.findProduct(id);
  
  if (!product) {
    root.innerHTML = `<div class="empty-state"><div class="icon">${BookApp.icon('book')}</div><h3>ไม่พบหนังสือ</h3><a href="products.html" class="btn btn-primary">กลับไปหน้ารายการหนังสือ</a></div>`;
    return;
  }
  
  const related = BookApp.products().filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);
  const favActive = BookApp.favorites().includes(product.id);
  const avail = BookApp.availableStock(product);
  const outOfStock = avail <= 0;
  
  const stockText = outOfStock
    ? '<span class="badge red">สินค้าหมด</span>'
    : `<span>คงเหลือ <strong>${avail}</strong> เล่ม</span>`;
    
  const cartButton = outOfStock
    ? `<button class="btn btn-primary" type="button" disabled>${BookApp.icon('cart')} สินค้าหมด</button>`
    : `<button class="btn btn-primary" id="mainCartBtn" data-cart="${product.id}">${BookApp.icon('cart')} เพิ่มลงตะกร้า</button>`;
    
  root.innerHTML = `
    <div class="detail-layout">
      <div class="book-cover detail-cover">
        <img src="${BookApp.escapeHtml(product.coverUrl || product.cover)}" alt="${BookApp.escapeHtml(product.title)}" class="detail-cover-img" onerror="this.onerror=null;this.src='assets/cover/default.jpg'">
      </div>
      <article class="card detail-panel">
        <div class="detail-meta">
          <a class="badge orange category-link" href="products.html?category=${encodeURIComponent(product.category)}">${BookApp.escapeHtml(product.category)}</a>
        </div>
        <h1>${BookApp.escapeHtml(product.title)}</h1>
        <p class="helper">ผู้แต่ง: ${BookApp.escapeHtml(product.author)}</p>
        <div class="stock-stats">
          <span>ขายแล้ว <strong>${product.sold}</strong> เล่ม</span>
          <span class="divider">|</span>
          ${stockText}
        </div>
        <p class="detail-desc">${BookApp.escapeHtml(product.desc)}</p>
        <div class="book-detail-row">
          <span class="book-detail-label">ISBN</span>
          <strong>${BookApp.escapeHtml(product.isbn || 'ไม่มีข้อมูล')}</strong>
        </div>
        <div class="notice">แนะนำหนังสือหมวดเดียวกันไว้ด้านล่าง เพื่อช่วยเลือกเล่มที่ใกล้เคียงกัน</div>
        <div class="buy-box">
          <div><span class="helper">ราคาเล่มละ</span><div class="price" style="font-size:34px">${BookApp.formatTHB(product.price)}</div></div>
          <div class="pill-row">
            <button class="btn btn-secondary" id="favBtn">${BookApp.icon(favActive ? 'heartFill' : 'heart')} ${favActive ? 'อยู่ในรายการโปรด' : 'บันทึกรายการโปรด'}</button>
            ${cartButton}
          </div>
        </div>
      </article>
    </div>
    <div class="section-title recommend-title"><div><h2>หนังสือที่เกี่ยวข้อง</h2><p>หมวด ${BookApp.escapeHtml(product.category)}</p></div></div>
    <div class="book-grid">${related.length ? related.map(BookApp.bookCard).join('') : '<div class="empty-state" style="grid-column:1/-1">ยังไม่มีหนังสือที่เกี่ยวข้อง</div>'}</div>`;

  document.getElementById('favBtn').addEventListener('click', (e) => {
    if (!BookApp.requireLogin()) return;
    const active = BookApp.toggleFavorite(product.id);
    e.currentTarget.innerHTML = `${BookApp.icon(active ? 'heartFill' : 'heart')} ${active ? 'อยู่ในรายการโปรด' : 'บันทึกโปรด'}`;
    BookApp.renderNav();
  });


});
