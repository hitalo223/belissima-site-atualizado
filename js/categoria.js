// Lê o parâmetro "cat" da URL (ex: categoria.html?cat=sutias), busca os
// produtos dessa categoria em products-data.js, e monta o grid na tela.

document.addEventListener('DOMContentLoaded', async () => {
  await loadCatalogData();
  const params = new URLSearchParams(window.location.search);
  const cat = params.get('cat') || 'sutias';
  const label = CATEGORY_LABELS[cat] || 'Categoria';

  document.title = `${label} — Belíssima Moda Íntima`;
  document.getElementById('category-title').textContent = label;
  document.getElementById('breadcrumb-cat').textContent = label;

  const products = getProductsByCategory(cat);
  const grid = document.getElementById('product-grid');
  const emptyState = document.getElementById('empty-state');

  if (products.length === 0) {
    grid.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  grid.innerHTML = products.map((p, i) => `
    <a class="prod-card reveal" data-product-id="${catalogEscape(p.id)}" style="transition-delay:${(i * 0.08).toFixed(2)}s" href="produto.html?id=${p.id}">
      <div class="prod-img">
        ${p.badge ? `<span class="badge">${catalogEscape(p.badge)}</span>` : ''}
        ${catalogProductCardMedia(p)}
      </div>
      <div class="p-name">${catalogEscape(p.name)}</div>
      <div class="p-price">R$ ${p.price.toFixed(2).replace('.', ',')}</div>
    </a>
  `).join('');
  setupProductCardHover(grid);

  // Reaplica a animação de scroll-reveal nos cards recém-criados via JS
  // (o reveal.js já rodou no DOMContentLoaded antes desses elementos existirem)
  const items = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  items.forEach((item) => observer.observe(item));
});
