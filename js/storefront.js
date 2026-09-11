document.addEventListener('DOMContentLoaded', async () => {
  const result = await loadCatalogData();
  const categories = result.categories || [];
  const categoryGrid = document.getElementById('store-category-grid');
  const secondaryCategoryGrid = document.getElementById('store-category-grid-secondary');
  const featuredGrid = document.getElementById('featured-products');

  if (categoryGrid && categories.length) {
    const categoryFallbacks = {
      sutias: { url: 'assets/images/categoria-sutias.webp', type: 'image' },
      calcinhas: { url: 'assets/images/categoria-calcinhas.webp', type: 'image' },
      bodies: { url: 'assets/images/categoria-bodies.webp', type: 'image' },
    };
    const activeCategories = categories.filter((category) => category.active !== false);
    const renderCategories = (items, animated) => items.map((category, index) => {
      const fallback = categoryFallbacks[category.id] || {};
      const mediaUrl = category.image_url || fallback.url || '';
      const mediaType = category.media_type || fallback.type || 'image';
      const media = mediaUrl
        ? mediaType === 'video'
          ? `<video src="${catalogEscape(mediaUrl)}" aria-label="${catalogEscape(category.name)}" autoplay muted loop playsinline preload="metadata"></video>`
          : `<img src="${catalogEscape(mediaUrl)}" alt="${catalogEscape(category.name)}" loading="lazy">`
        : '<span class="placeholder-note">[foto categoria]</span>';
      return `
        <a class="cat-card ${animated ? 'story-reveal-piece' : 'reveal revealed'}" style="transition-delay:${(index * .08).toFixed(2)}s" href="categoria.html?cat=${encodeURIComponent(category.id)}">
          ${media}
          <div><div class="label">${catalogEscape(category.name)}</div><span class="discover">DESCOBRIR ›</span></div>
        </a>
      `;
    }).join('');
    categoryGrid.innerHTML = renderCategories(activeCategories.slice(0, 3), false);
    if (secondaryCategoryGrid) {
      const remainingCategories = activeCategories.slice(3);
      secondaryCategoryGrid.innerHTML = renderCategories(remainingCategories, true);
      secondaryCategoryGrid.hidden = remainingCategories.length === 0;
    }
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
