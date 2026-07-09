document.addEventListener('DOMContentLoaded', () => {
  const products = BookApp.products();
  const featured = [...products]
    .sort((a, b) => (Number(b.sold) || 0) - (Number(a.sold) || 0))
    .map(BookApp.bookCard)
    .join('');
  document.getElementById('featuredBooks').innerHTML = featured;
  BookApp.bindGlobalActions(document.getElementById('featuredBooks'));
});
