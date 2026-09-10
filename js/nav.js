// Controla o menu lateral aberto pelo botão ☰, presente em loja.html,
// categoria.html e produto.html. Também destaca a categoria atual no menu.

function normalizeSearchText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function searchEscape(value) {
  if (typeof catalogEscape === 'function') return catalogEscape(value);
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

async function waitForSearchCatalog() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (typeof loadCatalogData === 'function') {
      await loadCatalogData();
      return Array.isArray(window.PRODUCTS) ? window.PRODUCTS : PRODUCTS;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
  return [];
}

function setupSiteSearch() {
  const search = document.querySelector('[data-site-search]');
  if (!search || search.dataset.ready === 'true') return;
  search.dataset.ready = 'true';

  const button = search.querySelector('.site-search-button');
  const input = search.querySelector('input[type="search"]');
  const results = search.querySelector('.site-search-results');
  let debounceTimer = 0;
  let requestId = 0;

  const closeSearch = () => {
    search.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Abrir pesquisa');
    results.hidden = true;
  };

  const openSearch = () => {
    search.classList.add('is-open');
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-label', 'Fechar pesquisa');
    window.setTimeout(() => input.focus(), 180);
  };

  const renderResults = async () => {
    const currentRequest = ++requestId;
    const query = normalizeSearchText(input.value);
    const terms = query.split(/\s+/).filter(Boolean);
    if (!terms.length) {
      results.hidden = true;
      results.innerHTML = '';
      return;
    }

    results.hidden = false;
    results.innerHTML = '<div class="site-search-message">Buscando produtos…</div>';
    const products = await waitForSearchCatalog();
    if (currentRequest !== requestId) return;

    const matches = products.filter((product) => {
      if (product.active === false) return false;
      const category = typeof CATEGORY_LABELS === 'object' ? CATEGORY_LABELS[product.category] : '';
      const searchable = normalizeSearchText([
        product.name, product.description, product.category, category, product.badge,
        ...(Array.isArray(product.colors) ? product.colors : []),
        ...(Array.isArray(product.sizes) ? product.sizes : []),
      ].join(' '));
      return terms.every((term) => searchable.includes(term));
    }).slice(0, 8);

    if (!matches.length) {
      results.innerHTML = `<div class="site-search-message">Nenhum produto encontrado para “${searchEscape(input.value.trim())}”.</div>`;
      return;
    }

    results.innerHTML = matches.map((product) => {
      const image = typeof catalogImageUrl === 'function' ? catalogImageUrl(product) : (product.images?.[0] || '');
      const price = Number(product.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const category = typeof CATEGORY_LABELS === 'object' ? (CATEGORY_LABELS[product.category] || product.category) : product.category;
      return `<a class="site-search-result" role="option" href="produto.html?id=${encodeURIComponent(product.id)}">
        <span class="site-search-result-image">${image ? `<img src="${searchEscape(image)}" alt="" loading="lazy">` : 'B'}</span>
        <span><small>${searchEscape(category || '')}</small><strong>${searchEscape(product.name)}</strong><b>${price}</b></span>
      </a>`;
    }).join('');
  };

  button.addEventListener('click', () => {
    if (search.classList.contains('is-open')) closeSearch();
    else openSearch();
  });
  input.addEventListener('input', () => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(renderResults, 120);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSearch();
      button.focus();
    }
    if (event.key === 'Enter') {
      const firstResult = results.querySelector('.site-search-result');
      if (firstResult) {
        event.preventDefault();
        firstResult.click();
      }
    }
  });
  document.addEventListener('click', (event) => {
    if (!search.contains(event.target)) closeSearch();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  setupSiteSearch();
  if (typeof loadCatalogData === 'function') {
    await loadCatalogData();
    const counts = PRODUCTS.reduce((result, product) => {
      result[product.category] = (result[product.category] || 0) + 1;
      return result;
    }, {});

    const categories = getCatalogCategories();
    const drawerList = document.querySelector('.mobile-drawer-section.categories');
    if (drawerList) {
      drawerList.innerHTML = categories.map((category) => `
        <a href="categoria.html?cat=${encodeURIComponent(category.id)}" data-cat="${catalogEscape(category.id)}">${catalogEscape(category.name)} <span>${counts[category.id] || 0}</span></a>
      `).join('');
    }
  }

  const toggle = document.querySelector('.menu-toggle');
  const drawer = document.getElementById('mobile-drawer');

  if (toggle && drawer) {
    const closers = drawer.querySelectorAll('[data-drawer-close]');

    function openDrawer() {
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'mobile-drawer');
    toggle.addEventListener('click', openDrawer);
    closers.forEach((el) => el.addEventListener('click', closeDrawer));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
    });

  }

  // ---- Destaca a categoria atual no menu lateral ----
  const activeCat = new URLSearchParams(window.location.search).get('cat');
  if (activeCat) {
    document.querySelectorAll(`#mobile-drawer a[data-cat="${activeCat}"]`).forEach((a) => {
      a.classList.add('active');
    });
  }
});

// Carrega o carrinho compartilhado nas páginas principais sem duplicar markup.
(function loadCart() {
  if (document.querySelector('script[data-belissima-cart]')) return;
  const script = document.createElement('script');
  script.src = 'js/cart.js?v=shipping-1';
  script.defer = true;
  script.dataset.belissimaCart = 'true';
  document.body.appendChild(script);
})();
