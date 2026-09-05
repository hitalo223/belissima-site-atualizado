// Controla o menu mobile (drawer lateral) aberto pelo botão ☰, presente em
// loja.html, categoria.html e produto.html. Também destaca a categoria atual
// (via ?cat= na URL) tanto na sidebar desktop quanto no drawer mobile.

document.addEventListener('DOMContentLoaded', () => {
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
