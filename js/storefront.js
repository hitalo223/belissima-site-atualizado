document.addEventListener('DOMContentLoaded', async () => {
  const result = await loadCatalogData();
  const categories = result.categories || [];
  const categoryGrid = document.getElementById('store-category-grid');
  const featuredGrid = document.getElementById('featured-products');

  if (categoryGrid && categories.length) {
    categoryGrid.innerHTML = categories
      .filter((category) => category.active !== false)
      .map((category, index) => `
        <a class="cat-card reveal revealed" style="transition-delay:${(index * .05).toFixed(2)}s" href="categoria.html?cat=${encodeURIComponent(category.id)}">
          ${category.image_url
            ? `<img src="${catalogEscape(category.image_url)}" alt="${catalogEscape(category.name)}" loading="lazy">`
            : '<span class="placeholder-note">[foto categoria]</span>'}
          <div><div class="label">${catalogEscape(category.name)}</div><span class="discover">DESCOBRIR ›</span></div>
        </a>
      `).join('');
  }

  if (featuredGrid) {
    const featured = PRODUCTS.filter((product) => product.featured).slice(0, 8);
    const products = featured.length ? featured : PRODUCTS.slice(0, 4);
    featuredGrid.innerHTML = products.map((product, index) => `
      <a class="prod-card reveal revealed" data-product-id="${catalogEscape(product.id)}" style="transition-delay:${(index * .08).toFixed(2)}s" href="produto.html?id=${encodeURIComponent(product.id)}">
        <div class="prod-img">
          ${product.badge ? `<span class="badge">${catalogEscape(product.badge)}</span>` : ''}
          ${catalogProductCardMedia(product)}
        </div>
        <div class="p-name">${catalogEscape(product.name)}</div>
        <div class="p-price">${Number(product.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
      </a>
    `).join('');
    setupProductCardHover(featuredGrid);
  }
});
