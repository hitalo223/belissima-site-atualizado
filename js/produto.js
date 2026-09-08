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
  let showGalleryImage = () => {};
  if (gallery && product.images?.length) {
    gallery.innerHTML = `
      <div class="pdp-carousel-stage">
        <img id="pdp-primary-image" src="${catalogEscape(product.images[0])}" alt="${catalogEscape(product.name)} — imagem 1">
        <button type="button" class="pdp-carousel-arrow prev" aria-label="Imagem anterior">‹</button>
        <button type="button" class="pdp-carousel-arrow next" aria-label="Próxima imagem">›</button>
        <span class="pdp-carousel-count" aria-live="polite">1 / ${product.images.length}</span>
      </div>
      <div class="pdp-carousel-thumbs" aria-label="Imagens do produto">
        ${product.images.map((url, index) => `<button type="button" class="pdp-carousel-thumb${index === 0 ? ' active' : ''}" data-image-index="${index}" aria-label="Ver imagem ${index + 1}"><img src="${catalogEscape(url)}" alt="" loading="lazy"></button>`).join('')}
      </div>`;
    let currentImage = 0;
    const primaryImage = document.getElementById('pdp-primary-image');
    const count = gallery.querySelector('.pdp-carousel-count');
    const thumbStrip = gallery.querySelector('.pdp-carousel-thumbs');
    const thumbs = [...gallery.querySelectorAll('.pdp-carousel-thumb')];
    showGalleryImage = (index) => {
      currentImage = (index + product.images.length) % product.images.length;
      primaryImage.classList.add('changing');
      window.setTimeout(() => {
        primaryImage.src = product.images[currentImage];
        primaryImage.alt = `${product.name} — imagem ${currentImage + 1}`;
        count.textContent = `${currentImage + 1} / ${product.images.length}`;
        thumbs.forEach((thumb, thumbIndex) => thumb.classList.toggle('active', thumbIndex === currentImage));
        const activeThumb = thumbs[currentImage];
        if (activeThumb) thumbStrip.scrollTo({ left: activeThumb.offsetLeft - thumbStrip.clientWidth / 2 + activeThumb.offsetWidth / 2, behavior: 'smooth' });
        primaryImage.classList.remove('changing');
      }, 130);
    };
    gallery.querySelector('.prev').addEventListener('click', () => showGalleryImage(currentImage - 1));
    gallery.querySelector('.next').addEventListener('click', () => showGalleryImage(currentImage + 1));
    thumbs.forEach((thumb) => thumb.addEventListener('click', () => showGalleryImage(Number(thumb.dataset.imageIndex))));
    if (product.images.length === 1) gallery.classList.add('single-image');
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
      if (image) showGalleryImage(Number(el.dataset.colorIndex));
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

  // ---- Cotação real de frete ----
  const postalInput = document.getElementById('product-postal-code');
  const shippingButton = document.getElementById('product-shipping-button');
  const shippingStatus = document.getElementById('product-shipping-status');
  const shippingOptions = document.getElementById('product-shipping-options');
  const shippingToggle = document.getElementById('shipping-calculator-toggle');
  const shippingPanel = document.getElementById('shipping-address-panel');
  const shippingAddressFields = [
    ['product-shipping-street', 'Informe o nome da rua.'],
    ['product-shipping-number', 'Informe o número do endereço.'],
    ['product-shipping-neighborhood', 'Informe o bairro.'],
    ['product-shipping-city', 'Informe a cidade.'],
    ['product-shipping-state', 'Selecione o estado.'],
  ];
  if (shippingToggle && shippingPanel) {
    shippingToggle.addEventListener('click', () => {
      const willOpen = shippingPanel.hidden;
      shippingPanel.hidden = !willOpen;
      shippingToggle.setAttribute('aria-expanded', String(willOpen));
      if (willOpen) postalInput?.focus();
    });
  }
  if (postalInput && shippingButton && window.BelissimaShipping) {
    const calculateProductShipping = async () => {
      const postalCode = BelissimaShipping.normalizePostalCode(postalInput.value);
      shippingOptions.innerHTML = '';
      if (postalCode.length !== 8) {
        shippingStatus.className = 'shipping-status error';
        shippingStatus.textContent = 'Digite um CEP válido com 8 números.';
        postalInput.focus();
        return;
      }
      for (const [fieldId, message] of shippingAddressFields) {
        const field = document.getElementById(fieldId);
        if (!field?.value.trim()) {
          shippingStatus.className = 'shipping-status error';
          shippingStatus.textContent = message;
          field?.focus();
          return;
        }
      }
      shippingButton.disabled = true;
      shippingButton.textContent = 'CALCULANDO…';
      shippingStatus.className = 'shipping-status loading';
      shippingStatus.textContent = 'Consultando transportadoras…';
      try {
        const config = await BelissimaShipping.getConfig();
        if (!config.enabled) {
          shippingStatus.className = 'shipping-status notice';
          shippingStatus.textContent = 'Endereço preenchido. As opções de frete serão liberadas assim que as medidas de embalagem dos produtos forem cadastradas.';
          return;
        }
        const quote = await BelissimaShipping.quote(postalCode, [{ id: product.id, quantity: qty }]);
        shippingStatus.className = 'shipping-status success';
        shippingStatus.textContent = `${quote.options.length} ${quote.options.length === 1 ? 'opção encontrada' : 'opções encontradas'} para ${BelissimaShipping.formatPostalCode(postalCode)}.`;
        shippingOptions.innerHTML = quote.options.map((option) => `
          <article class="shipping-option-card">
            <div><strong>${catalogEscape(option.service)}</strong><span>${catalogEscape(option.carrier)} · ${BelissimaShipping.deliveryText(option.deliveryDays)}</span></div>
            <b class="${option.free ? 'free' : ''}">${BelissimaShipping.optionPrice(option)}</b>
          </article>`).join('');
      } catch (error) {
        shippingStatus.className = 'shipping-status error';
        shippingStatus.textContent = error.message;
      } finally {
        shippingButton.disabled = false;
        shippingButton.textContent = 'CONSULTAR FRETE';
      }
    };
    shippingButton.addEventListener('click', calculateProductShipping);
    postalInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); calculateProductShipping(); }
    });
  }

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
    <a class="prod-card" data-product-id="${catalogEscape(p.id)}" href="produto.html?id=${p.id}">
      <div class="prod-img">
        ${p.badge ? `<span class="badge">${catalogEscape(p.badge)}</span>` : ''}
        ${catalogProductCardMedia(p)}
      </div>
      <div class="p-name">${catalogEscape(p.name)}</div>
      <div class="p-price">R$ ${p.price.toFixed(2).replace('.', ',')}</div>
    </a>
  `).join('');
  setupProductCardHover(relatedGrid);
});
