// Controla o menu mobile (drawer lateral) aberto pelo botão ☰, presente em
// loja.html, categoria.html e produto.html. Também destaca a categoria atual
// (via ?cat= na URL) tanto na sidebar desktop quanto no drawer mobile.

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof loadCatalogData === 'function') {
    await loadCatalogData();
    const counts = PRODUCTS.reduce((result, product) => {
      result[product.category] = (result[product.category] || 0) + 1;
      return result;
    }, {});

    const categories = getCatalogCategories();
    const sidebarList = document.querySelector('.sidebar ul');
    if (sidebarList) {
      sidebarList.innerHTML = categories.map((category) => `
        <li data-cat="${catalogEscape(category.id)}"><a href="categoria.html?cat=${encodeURIComponent(category.id)}">${catalogEscape(category.name)}</a></li>
      `).join('');
    }
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

    // Fecha o drawer automaticamente se a tela crescer pra desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900 && drawer.classList.contains('open')) closeDrawer();
    });
  }

  // ---- Destaca a categoria atual (sidebar desktop + drawer mobile) ----
  const activeCat = new URLSearchParams(window.location.search).get('cat');
  if (activeCat) {
    document.querySelectorAll(`.sidebar li[data-cat="${activeCat}"]`).forEach((li) => {
      li.classList.add('active');
    });
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
