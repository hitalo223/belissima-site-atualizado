// Carrinho da Belíssima — persiste no navegador e prepara o checkout Stripe.
(function () {
  const STORAGE_KEY = 'belissima_cart_v1';
  const MAX_QTY = 10;

  function money(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function getCart() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    render();
  }

  function itemKey(item) {
    return [item.id, item.size || '', item.color || ''].join('|');
  }

  function addItem(item) {
    const cart = getCart();
    const key = itemKey(item);
    const existing = cart.find((entry) => itemKey(entry) === key);
    const quantity = Math.max(1, Math.min(MAX_QTY, Number(item.quantity) || 1));

    if (existing) {
      existing.quantity = Math.min(MAX_QTY, existing.quantity + quantity);
    } else {
      cart.push({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        size: item.size || '',
        color: item.color || '',
        quantity,
      });
    }

    saveCart(cart);
    openDrawer();
  }

  function updateQuantity(index, delta) {
    const cart = getCart();
    if (!cart[index]) return;
    cart[index].quantity = Math.max(1, Math.min(MAX_QTY, cart[index].quantity + delta));
    saveCart(cart);
  }

  function removeItem(index) {
    const cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
  }

  function injectStyles() {
    if (document.getElementById('belissima-cart-styles')) return;
    const style = document.createElement('style');
    style.id = 'belissima-cart-styles';
    style.textContent = `
      .belissima-cart-icon{position:relative;display:inline-flex;align-items:center;justify-content:center;color:#604C43;text-decoration:none;opacity:.82;transition:transform .2s ease,opacity .2s ease;cursor:pointer;font-size:15px}
      .belissima-cart-icon:hover{transform:translateY(-2px);opacity:1}
      .belissima-cart-count{position:absolute;right:-9px;top:-9px;min-width:17px;height:17px;padding:0 4px;border-radius:20px;background:#C0304F;color:#fff;font:700 9px/17px 'Manrope',sans-serif;text-align:center;box-shadow:0 0 0 2px #F3EDE4}
      .belissima-cart-count.is-empty{display:none}
      .cart-drawer{position:fixed;inset:0;z-index:500;pointer-events:none;visibility:hidden}
      .cart-drawer.open{pointer-events:auto;visibility:visible}
      .cart-overlay{position:absolute;inset:0;background:rgba(45,34,29,.36);opacity:0;transition:opacity .28s ease}
      .cart-drawer.open .cart-overlay{opacity:1}
      .cart-panel{position:absolute;right:0;top:0;width:min(440px,94vw);height:100%;background:#F8F3EC;box-shadow:-24px 0 70px rgba(53,38,31,.18);transform:translateX(100%);transition:transform .32s ease;display:flex;flex-direction:column;color:#604C43}
      .cart-drawer.open .cart-panel{transform:translateX(0)}
      .cart-head{padding:26px 26px 20px;border-bottom:1px solid rgba(96,76,67,.12);display:flex;align-items:center;justify-content:space-between}
      .cart-head-title{font-family:'DM Serif Display',serif;font-size:27px;letter-spacing:.4px}
      .cart-close{border:0;background:none;color:#604C43;font-size:20px;cursor:pointer;padding:6px}
      .cart-body{flex:1;overflow:auto;padding:8px 26px 24px}
      .cart-empty{text-align:center;padding:70px 20px;color:#A99586;font-size:13px;line-height:1.7}
      .cart-empty strong{display:block;font-family:'DM Serif Display',serif;color:#604C43;font-size:22px;margin-bottom:8px;font-weight:400}
      .cart-item{padding:20px 0;border-bottom:1px solid rgba(96,76,67,.11);display:grid;grid-template-columns:70px 1fr;gap:16px}
      .cart-item-thumb{height:88px;background:linear-gradient(155deg,#E9DED0,#F3EDE4);display:flex;align-items:center;justify-content:center;color:#B6A494;font-size:9px;letter-spacing:1px}
      .cart-item-top{display:flex;justify-content:space-between;gap:12px}
      .cart-item-name{font-size:13px;font-weight:600;line-height:1.4}
      .cart-remove{border:0;background:none;color:#A99586;font-size:11px;text-decoration:underline;cursor:pointer}
      .cart-meta{font-size:11px;color:#A99586;margin:6px 0 12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .cart-color{width:11px;height:11px;border-radius:50%;display:inline-block;border:1px solid rgba(96,76,67,.2)}
      .cart-item-bottom{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .cart-qty{display:flex;align-items:center;border:1px solid rgba(96,76,67,.2);height:30px}
      .cart-qty button{width:28px;height:28px;border:0;background:transparent;color:#604C43;cursor:pointer;font-size:15px}
      .cart-qty span{width:25px;text-align:center;font-size:11px}
      .cart-item-price{font-size:13px;color:#C0304F;font-weight:700}
      .cart-footer{padding:22px 26px 26px;border-top:1px solid rgba(96,76,67,.13);background:#F3EDE4}
      .cart-total-line{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px;font-size:13px}
      .cart-total-line strong{font-family:'DM Serif Display',serif;font-size:24px;font-weight:400;color:#604C43}
      .cart-note{font-size:10px;color:#A99586;margin-bottom:18px;line-height:1.5}
      .cart-checkout{width:100%;border:0;background:#C0304F;color:#fff;padding:15px 18px;font:600 11px 'Manrope',sans-serif;letter-spacing:1.8px;cursor:pointer;transition:background .2s ease,transform .2s ease}
      .cart-checkout:hover:not(:disabled){background:#a8263f;transform:translateY(-1px)}
      .cart-checkout:disabled{opacity:.45;cursor:not-allowed}
      .cart-error{display:none;margin-top:10px;color:#A8263F;font-size:11px;line-height:1.5}
      body.cart-open{overflow:hidden}
      @media(max-width:600px){.cart-head,.cart-body,.cart-footer{padding-left:20px;padding-right:20px}.header-icons{gap:14px!important;min-width:auto!important}}
    `;
    document.head.appendChild(style);
  }

  function injectDrawer() {
    if (document.getElementById('belissima-cart-drawer')) return;
    const drawer = document.createElement('div');
    drawer.id = 'belissima-cart-drawer';
    drawer.className = 'cart-drawer';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = `
      <div class="cart-overlay" data-cart-close></div>
      <aside class="cart-panel" role="dialog" aria-modal="true" aria-label="Sua sacola">
        <div class="cart-head">
          <div class="cart-head-title">Sua sacola</div>
          <button class="cart-close" type="button" data-cart-close aria-label="Fechar sacola">✕</button>
        </div>
        <div class="cart-body" id="belissima-cart-items"></div>
        <div class="cart-footer">
          <div class="cart-total-line"><span>Total</span><strong id="belissima-cart-total">R$ 0,00</strong></div>
          <div class="cart-note">Frete e condições de pagamento são definidos no checkout seguro.</div>
          <button class="cart-checkout" id="belissima-checkout" type="button">FINALIZAR COMPRA</button>
          <div class="cart-error" id="belissima-cart-error"></div>
        </div>
      </aside>`;
    document.body.appendChild(drawer);
    drawer.querySelectorAll('[data-cart-close]').forEach((el) => el.addEventListener('click', closeDrawer));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
    document.getElementById('belissima-checkout').addEventListener('click', checkout);
  }

  function setupIcon() {
    const header = document.querySelector('.header-icons');
    if (!header) return;
    if (header.querySelector('.belissima-cart-icon')) return;

    let bag = Array.from(header.querySelectorAll('span')).find((el) => el.textContent.trim().includes('🛍'));
    const icon = document.createElement('a');
    icon.href = '#';
    icon.className = 'belissima-cart-icon';
    icon.setAttribute('aria-label', 'Abrir sacola');
    icon.innerHTML = '🛍<span class="belissima-cart-count is-empty" id="belissima-cart-count">0</span>';

    if (bag) bag.replaceWith(icon);
    else header.appendChild(icon);

    icon.addEventListener('click', (e) => {
      e.preventDefault();
      openDrawer();
    });
  }

  function openDrawer() {
    const drawer = document.getElementById('belissima-cart-drawer');
    if (!drawer) return;
    render();
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-open');
  }

  function closeDrawer() {
    const drawer = document.getElementById('belissima-cart-drawer');
    if (!drawer) return;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-open');
  }

  function render() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const total = cart.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity || 0)), 0);
    const badge = document.getElementById('belissima-cart-count');
    const itemsEl = document.getElementById('belissima-cart-items');
    const totalEl = document.getElementById('belissima-cart-total');
    const checkoutBtn = document.getElementById('belissima-checkout');

    if (badge) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.classList.toggle('is-empty', count === 0);
    }
    if (totalEl) totalEl.textContent = money(total);
    if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;
    if (!itemsEl) return;

    if (!cart.length) {
      itemsEl.innerHTML = '<div class="cart-empty"><strong>Sua sacola está vazia</strong>Escolha suas peças favoritas e elas aparecerão aqui.</div>';
      return;
    }

    itemsEl.innerHTML = cart.map((item, index) => `
      <div class="cart-item">
        <div class="cart-item-thumb">BELÍSSIMA</div>
        <div>
          <div class="cart-item-top">
            <div class="cart-item-name">${escapeHtml(item.name)}</div>
            <button type="button" class="cart-remove" data-remove="${index}">remover</button>
          </div>
          <div class="cart-meta">
            ${item.size ? `<span>Tam. ${escapeHtml(item.size)}</span>` : ''}
            ${item.color ? `<span class="cart-color" style="background:${escapeHtml(item.color)}"></span>` : ''}
          </div>
          <div class="cart-item-bottom">
            <div class="cart-qty">
              <button type="button" data-qty-minus="${index}" aria-label="Diminuir quantidade">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-qty-plus="${index}" aria-label="Aumentar quantidade">+</button>
            </div>
            <div class="cart-item-price">${money(item.price * item.quantity)}</div>
          </div>
        </div>
      </div>`).join('');

    itemsEl.querySelectorAll('[data-remove]').forEach((btn) => btn.addEventListener('click', () => removeItem(Number(btn.dataset.remove))));
    itemsEl.querySelectorAll('[data-qty-minus]').forEach((btn) => btn.addEventListener('click', () => updateQuantity(Number(btn.dataset.qtyMinus), -1)));
    itemsEl.querySelectorAll('[data-qty-plus]').forEach((btn) => btn.addEventListener('click', () => updateQuantity(Number(btn.dataset.qtyPlus), 1)));
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  }

  async function checkout() {
    const btn = document.getElementById('belissima-checkout');
    const errorEl = document.getElementById('belissima-cart-error');
    const cart = getCart();
    if (!cart.length || !btn) return;

    errorEl.style.display = 'none';
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'ABRINDO CHECKOUT…';

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(({ id, quantity, size, color }) => ({ id, quantity, size, color }))
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || 'Não foi possível iniciar o checkout.');
      window.location.href = data.url;
    } catch (error) {
      errorEl.textContent = error.message || 'Não foi possível abrir o checkout. Tente novamente.';
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = original;
    }
  }

  function setupProductButton() {
    const addBtn = document.getElementById('add-to-bag');
    if (!addBtn || typeof getProductById !== 'function') return;

    addBtn.addEventListener('click', () => {
      const id = new URLSearchParams(window.location.search).get('id');
      const product = getProductById(id);
      if (!product) return;
      const size = document.querySelector('#size-options .size-btn.active')?.dataset.size || product.sizes?.[0] || '';
      const color = document.querySelector('#color-options .color-swatch.active')?.dataset.color || product.colors?.[0] || '';
      const quantity = Number(document.getElementById('qty-value')?.textContent || 1);
      addItem({ id: product.id, name: product.name, price: product.price, size, color, quantity });
    });
  }

  function init() {
    injectStyles();
    injectDrawer();
    setupIcon();
    setupProductButton();
    render();
  }

  window.BelissimaCart = { addItem, getCart, open: openDrawer, close: closeDrawer };
  window.addEventListener('storage', render);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
