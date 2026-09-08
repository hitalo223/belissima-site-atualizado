document.addEventListener('DOMContentLoaded', async () => {
  await loadCatalogData();
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const product = getProductById(id);

  if (!product) {
    document.querySelector('.pdp-wrap').innerHTML = '<p style="padding:40px;">Produto não encontrado.</p>';
    return;
  }

  // ---- Preenche informações básicas ----
  const label = CATEGORY_LABELS[product.category] || product.category;
  document.title = `${product.name} — Belíssima Moda Íntima`;
  document.getElementById('pdp-name').textContent = product.name;
  document.getElementById('breadcrumb-name').textContent = product.name;
  document.getElementById('breadcrumb-cat').textContent = label;
  document.getElementById('breadcrumb-cat').href = `categoria.html?cat=${product.category}`;
  document.getElementById('pdp-price').textContent = `R$ ${product.price.toFixed(2).replace('.', ',')}`;
  document.getElementById('pdp-installment').textContent = `Em até 6x de R$ ${(product.price / 6).toFixed(2).replace('.', ',')} sem juros`;

  const badgeEl = document.getElementById('pdp-badge');
  if (product.badge) {
    badgeEl.textContent = product.badge;
    badgeEl.style.display = 'inline-block';
  }

  const gallery = document.querySelector('.pdp-gallery');
  if (gallery && product.images?.length) {
    gallery.innerHTML = product.images.slice(0, 4).map((url, index) => `
      <div class="g-img has-image">
        <img src="${catalogEscape(url)}" alt="${catalogEscape(product.name)} — imagem ${index + 1}"${index === 0 ? ' id="pdp-primary-image"' : ''}>
      </div>
    `).join('');
  }

  // ---- Cores ----
  const colorWrap = document.getElementById('color-options');
  const colors = product.colors.map((entry, index) => {
    const separator = entry.indexOf('|');
    return separator > 0
      ? { name: entry.slice(0, separator), value: entry.slice(separator + 1) }
      : { name: `Cor ${index + 1}`, value: entry };
  });
  const selectedColor = document.getElementById('selected-color-name');
  if (selectedColor) selectedColor.textContent = colors[0]?.name || '';
  colorWrap.innerHTML = colors.map((color, i) =>
    `<button type="button" class="color-swatch${i === 0 ? ' active' : ''}" style="background:${catalogEscape(color.value)}" data-color="${catalogEscape(color.name)}" data-color-index="${i}" aria-label="${catalogEscape(color.name)}" title="${catalogEscape(color.name)}"></button>`
  ).join('');
  colorWrap.querySelectorAll('.color-swatch').forEach((el) => {
    el.addEventListener('click', () => {
      colorWrap.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
      el.classList.add('active');
      if (selectedColor) selectedColor.textContent = el.dataset.color;
      const image = product.images?.[Number(el.dataset.colorIndex)];
      const primaryImage = document.getElementById('pdp-primary-image');
      if (image && primaryImage) {
        primaryImage.src = image;
        primaryImage.alt = `${product.name} — ${el.dataset.color}`;
      }
    });
  });

  // ---- Tamanhos ----
  const sizeWrap = document.getElementById('size-options');
  sizeWrap.innerHTML = product.sizes.map((s, i) =>
    `<div class="size-btn${i === 0 ? ' active' : ''}" data-size="${s}">${s}</div>`
  ).join('');
  sizeWrap.querySelectorAll('.size-btn').forEach((el) => {
    el.addEventListener('click', () => {
      sizeWrap.querySelectorAll('.size-btn').forEach((s) => s.classList.remove('active'));
      el.classList.add('active');
    });
  });

  // ---- Quantidade ----
  let qty = 1;
  const qtyValue = document.getElementById('qty-value');
  document.getElementById('qty-minus').addEventListener('click', () => {
    qty = Math.max(1, qty - 1);
    qtyValue.textContent = qty;
  });
  document.getElementById('qty-plus').addEventListener('click', () => {
    qty = Math.min(10, qty + 1);
    qtyValue.textContent = qty;
  });

  // ---- Adicionar à sacola (visual apenas — sem carrinho real ainda) ----
  const addBtn = document.getElementById('add-to-bag');
  addBtn.addEventListener('click', () => {
    const originalText = addBtn.textContent;
    addBtn.textContent = 'ADICIONADO ✓';
    addBtn.classList.add('added');
    setTimeout(() => {
      addBtn.textContent = originalText;
      addBtn.classList.remove('added');
    }, 1800);
  });

  // ---- Sanfona (Sobre a peça / Trocas e devoluções) ----
  document.querySelectorAll('.accordion-item').forEach((item) => {
    item.querySelector('.acc-head').addEventListener('click', () => {
      item.classList.toggle('open');
    });
  });
  const description = document.querySelector('#acc-1 .acc-body');
  if (description && product.description) description.textContent = product.description;

  // ---- Veja também: outros produtos da mesma categoria ----
  const related = getProductsByCategory(product.category).filter((p) => p.id !== product.id).slice(0, 4);
  const relatedGrid = document.getElementById('related-grid');
  relatedGrid.innerHTML = related.map((p) => `
    <a class="prod-card" href="produto.html?id=${p.id}">
      <div class="prod-img">
        ${p.badge ? `<span class="badge">${catalogEscape(p.badge)}</span>` : ''}
        ${catalogImageUrl(p)
          ? `<img src="${catalogEscape(catalogImageUrl(p))}" alt="${catalogEscape(p.name)}" loading="lazy">`
          : '<span class="placeholder-note">[foto produto]</span>'}
      </div>
      <div class="p-name">${catalogEscape(p.name)}</div>
      <div class="p-price">R$ ${p.price.toFixed(2).replace('.', ',')}</div>
    </a>
  `).join('');
});
