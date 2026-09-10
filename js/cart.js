// Carrinho da Belíssima — persiste no navegador e prepara o checkout Stripe.
(function () {
  const LEGACY_STORAGE_KEY = 'belissima_cart_v1';
  const STORAGE_PREFIX = 'belissima_cart_v2:';
  const CHECKOUT_STORAGE_KEY = 'belissima_checkout_cart_key';
  const MAX_QTY = 10;
  let cartOwner = 'guest';
  let cartOwnerReady = false;
  const pendingItems = [];
  let selectedShipping = null;
  let shippingOptions = [];
  let quotedPostalCode = '';
  let freeThresholdCents = 19900;
  let shippingEnabled = false;

  function storageKey() {
    return STORAGE_PREFIX + cartOwner;
  }

  function migrateLegacyCart() {
    const guestKey = STORAGE_PREFIX + 'guest';
    const legacyValue = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyValue !== null && localStorage.getItem(guestKey) === null) {
      try {
        const cart = JSON.parse(legacyValue);
        if (Array.isArray(cart)) localStorage.setItem(guestKey, JSON.stringify(cart));
      } catch (_) {
        // Ignora dados antigos inválidos.
      }
    }
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }

  function money(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function getCart() {
    if (!cartOwnerReady) return [];
    try {
      const value = JSON.parse(localStorage.getItem(storageKey()) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(storageKey(), JSON.stringify(cart));
    invalidateShipping();
    render();
  }

  function invalidateShipping() {
    selectedShipping = null;
    shippingOptions = [];
    const options = document.getElementById('belissima-shipping-options');
    const status = document.getElementById('belissima-shipping-status');
    if (options) options.innerHTML = '';
    if (status) status.textContent = quotedPostalCode ? 'A sacola mudou. Calcule o frete novamente.' : '';
  }

  function itemKey(item) {
    return [item.id, item.size || '', item.color || ''].join('|');
  }

  function addItem(item) {
    if (!cartOwnerReady) {
      pendingItems.push(item);
      return;
    }

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
        image: item.image || '',
        size: item.size || '',
        color: item.color || '',
        quantity,
      });
    }

    saveCart(cart);
    openDrawer();
  }

  function setCartOwner(userId) {
    const nextOwner = userId ? `user:${userId}` : 'guest';
    const changed = nextOwner !== cartOwner;
    cartOwner = nextOwner;
    cartOwnerReady = true;

    if (changed) {
      invalidateShipping();
      quotedPostalCode = '';
      closeDrawer();
    }
    render();

    while (pendingItems.length) addItem(pendingItems.shift());
  }

  function waitForAuthClient() {
    if (window.BelissimaAuth?.client) return Promise.resolve(window.BelissimaAuth.client);

    return new Promise((resolve) => {
      const timeout = window.setTimeout(() => resolve(null), 5000);
      window.addEventListener('belissima:auth-ready', () => {
        window.clearTimeout(timeout);
        resolve(window.BelissimaAuth?.client || null);
      }, { once: true });
    });
  }

  async function setupCartOwner() {
    try {
      const client = await waitForAuthClient();
      if (!client) {
        setCartOwner(null);
        return;
      }

      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      setCartOwner(data.session?.user?.id || null);

      client.auth.onAuthStateChange((_event, session) => {
        setCartOwner(session?.user?.id || null);
      });
    } catch (error) {
      console.error('[Belíssima/Cart] Não foi possível identificar a conta', error);
      setCartOwner(null);
    }
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
      .belissima-cart-icon>img{display:block;width:17px;height:17px;object-fit:contain}
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
      .cart-item-thumb img{width:100%;height:100%;object-fit:cover}
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
      .cart-free-progress{margin-bottom:16px}.cart-free-copy{display:flex;justify-content:space-between;gap:12px;margin-bottom:7px;color:#806d63;font-size:10px}.cart-free-copy b{color:#C0304F}.cart-progress-track{height:5px;overflow:hidden;border-radius:99px;background:rgba(96,76,67,.12)}.cart-progress-fill{display:block;width:0;height:100%;border-radius:inherit;background:linear-gradient(90deg,#9f5674,#d85678);transition:width .35s ease}
      .cart-shipping{margin-bottom:16px;padding:14px;border:1px solid rgba(96,76,67,.13);background:rgba(255,255,255,.38)}.cart-shipping-title{display:block;margin-bottom:9px;font-size:11px;font-weight:600}.cart-postal-row{display:flex;gap:7px}.cart-postal-row input{min-width:0;flex:1;border:1px solid rgba(96,76,67,.25);background:#fff;padding:10px;font:11px 'Manrope',sans-serif;outline:0}.cart-postal-row button{border:1px solid #604C43;background:#fff;color:#604C43;padding:0 12px;font:600 9px 'Manrope',sans-serif;letter-spacing:.08em;cursor:pointer}.cart-postal-row button:disabled{opacity:.5;cursor:wait}.cart-shipping-status{margin-top:8px;color:#8a7568;font-size:10px;line-height:1.45}.cart-shipping-status.error{color:#a8263f}.cart-shipping-options{display:grid;gap:7px;margin-top:9px}.cart-shipping-option{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:9px;padding:9px;border:1px solid rgba(96,76,67,.13);background:#fff;cursor:pointer}.cart-shipping-option:has(input:checked){border-color:#A64B6B;box-shadow:0 0 0 1px #A64B6B}.cart-shipping-option input{accent-color:#A64B6B}.cart-shipping-option span{display:grid;gap:2px;font-size:10px}.cart-shipping-option small{color:#927f73;font-size:8px}.cart-shipping-option b{font-size:10px;white-space:nowrap}.cart-shipping-option b.free{color:#C0304F}
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
          <div class="cart-free-progress" id="belissima-free-progress" data-shipping-ui hidden>
            <div class="cart-free-copy"><span id="belissima-free-copy">Frete grátis a partir de R$ 199</span><b id="belissima-free-remaining"></b></div>
            <div class="cart-progress-track"><span class="cart-progress-fill" id="belissima-progress-fill"></span></div>
          </div>
          <section class="cart-shipping" data-shipping-ui hidden aria-labelledby="belissima-shipping-title">
            <label class="cart-shipping-title" id="belissima-shipping-title" for="belissima-postal-code">Calcule e escolha o frete</label>
            <div class="cart-postal-row"><input id="belissima-postal-code" data-postal-code inputmode="numeric" autocomplete="postal-code" maxlength="9" placeholder="00000-000"><button id="belissima-calculate-shipping" type="button">CALCULAR</button></div>
            <div class="cart-shipping-status" id="belissima-shipping-status" role="status" aria-live="polite"></div>
            <div class="cart-shipping-options" id="belissima-shipping-options"></div>
          </section>
          <div class="cart-total-line"><span>Produtos</span><span id="belissima-cart-subtotal">R$ 0,00</span></div>
          <div class="cart-total-line" data-shipping-ui hidden><span>Frete</span><span id="belissima-cart-shipping">A calcular</span></div>
          <div class="cart-total-line"><span>Total</span><strong id="belissima-cart-total">R$ 0,00</strong></div>
          <div class="cart-note">O frete é recalculado com segurança antes do pagamento.</div>
          <button class="cart-checkout" id="belissima-checkout" type="button">FINALIZAR COMPRA</button>
          <div class="cart-error" id="belissima-cart-error"></div>
        </div>
      </aside>`;
    document.body.appendChild(drawer);
    drawer.querySelectorAll('[data-cart-close]').forEach((el) => el.addEventListener('click', closeDrawer));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
    document.getElementById('belissima-checkout').addEventListener('click', checkout);
    document.getElementById('belissima-calculate-shipping').addEventListener('click', calculateCartShipping);
    document.getElementById('belissima-postal-code').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); calculateCartShipping(); }
    });
  }

  function setupIcon() {
    const header = document.querySelector('.header-icons');
    if (!header) return;
    if (header.querySelector('.belissima-cart-icon')) return;

    const bag = header.querySelector('.cart-icon-placeholder');
    const icon = document.createElement('a');
    icon.href = '#';
    icon.className = 'belissima-cart-icon';
    icon.setAttribute('aria-label', 'Abrir sacola');
    icon.innerHTML = '<img src="assets/icons/bag.svg" alt="" aria-hidden="true"><span class="belissima-cart-count is-empty" id="belissima-cart-count">0</span>';

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

  function renderShippingChoices() {
    const container = document.getElementById('belissima-shipping-options');
    if (!container || !window.BelissimaShipping) return;
    container.innerHTML = shippingOptions.map((option) => `
      <label class="cart-shipping-option">
        <input type="radio" name="belissima-shipping-service" value="${escapeHtml(option.serviceId)}" ${selectedShipping?.serviceId === option.serviceId ? 'checked' : ''}>
        <span><strong>${escapeHtml(option.service)}</strong><small>${escapeHtml(option.carrier)} · ${BelissimaShipping.deliveryText(option.deliveryDays)}</small></span>
        <b class="${option.free ? 'free' : ''}">${BelissimaShipping.optionPrice(option)}</b>
      </label>`).join('');
    container.querySelectorAll('input').forEach((input) => input.addEventListener('change', () => {
      selectedShipping = shippingOptions.find((option) => option.serviceId === input.value) || null;
      render();
    }));
  }

  async function calculateCartShipping() {
    const input = document.getElementById('belissima-postal-code');
    const button = document.getElementById('belissima-calculate-shipping');
    const status = document.getElementById('belissima-shipping-status');
    const cart = getCart();
    if (!input || !button || !status || !window.BelissimaShipping || !cart.length) return;
    const postalCode = BelissimaShipping.normalizePostalCode(input.value);
    if (postalCode.length !== 8) {
      status.className = 'cart-shipping-status error';
      status.textContent = 'Digite um CEP válido com 8 números.';
      input.focus();
      return;
    }
    button.disabled = true;
    button.textContent = '…';
    status.className = 'cart-shipping-status';
    status.textContent = 'Consultando transportadoras…';
    selectedShipping = null;
    shippingOptions = [];
    renderShippingChoices();
    try {
      const quote = await BelissimaShipping.quote(postalCode, cart.map(({ id, quantity }) => ({ id, quantity })));
      quotedPostalCode = quote.destinationPostalCode;
      freeThresholdCents = quote.freeShippingThresholdCents;
      shippingOptions = quote.options;
      selectedShipping = shippingOptions[0] || null;
      status.className = 'cart-shipping-status';
      status.textContent = 'Escolha a modalidade que prefere.';
      renderShippingChoices();
      render();
    } catch (error) {
      quotedPostalCode = postalCode;
      status.className = 'cart-shipping-status error';
      status.textContent = error.message;
      render();
    } finally {
      button.disabled = false;
      button.textContent = 'CALCULAR';
    }
  }

  function render() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const total = cart.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity || 0)), 0);
    const badge = document.getElementById('belissima-cart-count');
    const itemsEl = document.getElementById('belissima-cart-items');
    const totalEl = document.getElementById('belissima-cart-total');
    const subtotalEl = document.getElementById('belissima-cart-subtotal');
    const shippingEl = document.getElementById('belissima-cart-shipping');
    const progressFill = document.getElementById('belissima-progress-fill');
    const freeCopy = document.getElementById('belissima-free-copy');
    const freeRemaining = document.getElementById('belissima-free-remaining');
    const checkoutBtn = document.getElementById('belissima-checkout');

    if (badge) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.classList.toggle('is-empty', count === 0);
    }
    const subtotalCents = Math.round(total * 100);
    const shippingCents = selectedShipping?.chargedCents || 0;
    if (subtotalEl) subtotalEl.textContent = money(total);
    if (shippingEl) shippingEl.textContent = selectedShipping ? (shippingCents === 0 ? 'Grátis' : money(shippingCents / 100)) : 'A calcular';
    if (totalEl) totalEl.textContent = money((subtotalCents + shippingCents) / 100);
    if (checkoutBtn) checkoutBtn.disabled = cart.length === 0 || (shippingEnabled && !selectedShipping);
    if (progressFill) progressFill.style.width = `${Math.min(100, (subtotalCents / freeThresholdCents) * 100)}%`;
    if (freeCopy) freeCopy.textContent = subtotalCents >= freeThresholdCents ? 'Você desbloqueou o benefício de frete grátis' : `Frete grátis a partir de ${money(freeThresholdCents / 100)}`;
    if (freeRemaining) freeRemaining.textContent = subtotalCents >= freeThresholdCents ? '✓' : `Faltam ${money((freeThresholdCents - subtotalCents) / 100)}`;
    if (!itemsEl) return;

    if (!cart.length) {
      itemsEl.innerHTML = '<div class="cart-empty"><strong>Sua sacola está vazia</strong>Escolha suas peças favoritas e elas aparecerão aqui.</div>';
      return;
    }

    itemsEl.innerHTML = cart.map((item, index) => `
      <div class="cart-item">
        <div class="cart-item-thumb">${item.image
          ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy">`
          : 'BELÍSSIMA'}</div>
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
    if (shippingEnabled && (!selectedShipping || !quotedPostalCode)) {
      errorEl.textContent = 'Calcule o frete e escolha uma modalidade de entrega.';
      errorEl.style.display = 'block';
      document.getElementById('belissima-postal-code')?.focus();
      return;
    }

    errorEl.style.display = 'none';
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'ABRINDO CHECKOUT…';

    try {
      const headers = { 'Content-Type': 'application/json' };
      const authClient = window.BelissimaAuth?.client;
      if (authClient) {
        const { data } = await authClient.auth.getSession();
        if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
      }

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items: cart.map(({ id, quantity, size, color }) => ({ id, quantity, size, color })),
          ...(shippingEnabled ? { shipping: {
            postalCode: quotedPostalCode,
            serviceId: selectedShipping.serviceId,
            chargedCents: selectedShipping.chargedCents,
          } } : {}),
        }),
      });
      const data = await response.json();
      if (response.status === 409 && data.code === 'shipping_changed' && Array.isArray(data.options)) {
        shippingOptions = data.options;
        selectedShipping = null;
        renderShippingChoices();
        render();
      }
      if (!response.ok || !data.url) throw new Error(data.error || 'Não foi possível iniciar o checkout.');
      sessionStorage.setItem(CHECKOUT_STORAGE_KEY, storageKey());
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
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        image: catalogImageUrl(product),
        size,
        color,
        quantity,
      });
    });
  }

  function init() {
    migrateLegacyCart();
    injectStyles();
    injectDrawer();
    setupIcon();
    setupProductButton();
    render();
    setupCartOwner();
    window.BelissimaShipping?.getConfig().then((config) => {
      shippingEnabled = config.enabled === true;
      freeThresholdCents = Number(config.freeShippingThresholdCents || 19900);
      document.querySelectorAll('#belissima-cart-drawer [data-shipping-ui]').forEach((element) => { element.hidden = !shippingEnabled; });
      render();
    });
  }

  window.BelissimaCart = { addItem, getCart, open: openDrawer, close: closeDrawer };
  window.addEventListener('storage', render);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
