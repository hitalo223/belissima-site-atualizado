(function () {
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  const state = { session: null, products: [], categories: [], customers: [], orders: [], orderItems: [], siteMedia: [], siteMediaError: null };
  const SITE_MEDIA_SLOTS = [
    { key: 'atelier-1-left', label: 'Grade principal · quadro 1', section: 'Grade Rituais', description: 'Primeiro quadro visual da grade grande.', defaultUrl: 'assets/video/acesso-belissima.mp4', defaultType: 'video' },
    { key: 'atelier-1-right', label: 'Grade principal · quadro 2', section: 'Grade Rituais', description: 'Terceiro quadro visual da primeira tela.', defaultUrl: 'assets/images/presente-belissima.webp', defaultType: 'image' },
    { key: 'atelier-2-left', label: 'Grade principal · quadro 3', section: 'Grade Rituais', description: 'Primeiro quadro visual da segunda tela.', defaultUrl: 'assets/images/belissima-busto-rosa.webp', defaultType: 'image' },
    { key: 'atelier-2-right', label: 'Grade principal · quadro 4', section: 'Grade Rituais', description: 'Terceiro quadro visual da segunda tela.', defaultUrl: 'assets/video/ritual-corporal-belissima.mp4', defaultType: 'video' },
    { key: 'editorial-1-main', label: 'História · mídia 1', section: 'Grade de histórias', description: 'Mídia central do primeiro capítulo.', defaultUrl: 'assets/video/acesso-belissima.mp4', defaultType: 'video' },
    { key: 'editorial-1-detail', label: 'História · detalhe', section: 'Grade de histórias', description: 'Imagem pequena do primeiro capítulo.', defaultUrl: 'assets/images/presente-belissima.webp', defaultType: 'image' },
    { key: 'editorial-2-main', label: 'História · mídia 2', section: 'Grade de histórias', description: 'Mídia central do segundo capítulo.', defaultUrl: 'assets/video/ritual-corporal-belissima.mp4', defaultType: 'video' },
    { key: 'editorial-3-main', label: 'História · mídia 3', section: 'Grade de histórias', description: 'Mídia central do terceiro capítulo.', defaultUrl: 'assets/images/belissima-busto-rosa.webp', defaultType: 'image' },
  ];
  let editingProduct = null;
  let editingCategory = null;
  let productImages = [];
  let productHoverMedia = '';
  let categoryImage = '';
  let categoryMediaType = 'image';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = (cents) => (Number(cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const date = (value) => value ? new Date(value).toLocaleDateString('pt-BR') : '—';
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  const slugify = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);

  function showMessage(text, type = 'success') {
    const element = $('#admin-global-message');
    element.textContent = text;
    element.className = `admin-global-message ${type}`;
    element.hidden = !text;
    if (text) window.setTimeout(() => { element.hidden = true; }, 4500);
  }

  function statusLabel(value, type) {
    const labels = type === 'payment'
      ? { paid: 'Pago', unpaid: 'Não pago', no_payment_required: 'Sem cobrança' }
      : { pending: 'Pendente', processing: 'Em separação', shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado' };
    const good = ['paid', 'delivered'].includes(value);
    const bad = ['unpaid', 'cancelled'].includes(value);
    return `<span class="admin-status ${good ? 'good' : bad ? 'bad' : 'warn'}">${escapeHtml(labels[value] || value || 'Pendente')}</span>`;
  }

  async function requireAdmin() {
    const { data, error } = await client.auth.getSession();
    if (error || !data.session?.user) {
      window.location.replace('admin-login.html');
      return false;
    }
    const { data: admin, error: adminError } = await client.from('admin_users').select('user_id').eq('user_id', data.session.user.id).maybeSingle();
    if (adminError || !admin) {
      window.location.replace('admin-login.html?erro=sem-acesso');
      return false;
    }
    state.session = data.session;
    return true;
  }

  async function loadData() {
    const results = await Promise.all([
      client.from('categories').select('*').order('sort_order'),
      client.from('products').select('*').order('created_at', { ascending: false }),
      client.from('profiles').select('*').order('created_at', { ascending: false }),
      client.from('orders').select('*').order('created_at', { ascending: false }),
      client.from('order_items').select('*'),
    ]);
    const failed = results.find((result) => result.error);
    if (failed) throw failed.error;
    [state.categories, state.products, state.customers, state.orders, state.orderItems] = results.map((result) => result.data || []);
    const mediaResult = await client.from('site_media').select('*').order('sort_order');
    state.siteMedia = mediaResult.data || [];
    state.siteMediaError = mediaResult.error || null;
    renderAll();
  }

  function renderAll() {
    renderDashboard();
    renderProducts();
    renderCategories();
    renderSiteMedia();
    renderCustomers();
    renderOrders();
    populateCategorySelects();
  }

  function renderDashboard() {
    const days = Number($('#dashboard-period').value || 30);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - days + 1);
    const periodOrders = state.orders.filter((order) => new Date(order.created_at) >= start);
    const paidOrders = periodOrders.filter((order) => order.payment_status === 'paid');
    const revenue = paidOrders.reduce((sum, order) => sum + Number(order.amount_total || 0), 0);
    const newCustomers = state.customers.filter((customer) => new Date(customer.created_at) >= start).length;
    $('#metric-revenue').textContent = money(revenue);
    $('#metric-orders').textContent = String(periodOrders.length);
    $('#metric-orders-pending').textContent = `${periodOrders.filter((order) => ['pending', 'processing'].includes(order.fulfillment_status)).length} aguardando envio`;
    $('#metric-average').textContent = money(paidOrders.length ? revenue / paidOrders.length : 0);
    $('#metric-customers').textContent = String(state.customers.length);
    $('#metric-new-customers').textContent = `${newCustomers} novos no período`;
    $('#summary-products').textContent = String(state.products.length);
    $('#summary-active').textContent = String(state.products.filter((product) => product.active).length);
    $('#summary-out-stock').textContent = String(state.products.filter((product) => product.stock_quantity === 0).length);
    renderChart(paidOrders, days);
    $('#recent-orders-body').innerHTML = state.orders.slice(0, 6).map((order) => `
      <tr><td>${escapeHtml(order.customer_name || order.customer_email || 'Cliente')}</td><td>${date(order.created_at)}</td><td>${money(order.amount_total)}</td><td>${statusLabel(order.payment_status, 'payment')}</td><td>${statusLabel(order.fulfillment_status, 'fulfillment')}</td></tr>
    `).join('') || '<tr><td colspan="5">Nenhum pedido registrado.</td></tr>';
  }

  function renderChart(orders, days) {
    const points = [];
    const now = new Date();
    for (let index = days - 1; index >= 0; index -= 1) {
      const current = new Date(now);
      current.setHours(0, 0, 0, 0);
      current.setDate(current.getDate() - index);
      const key = current.toISOString().slice(0, 10);
      const value = orders.filter((order) => new Date(order.created_at).toISOString().slice(0, 10) === key).reduce((sum, order) => sum + Number(order.amount_total || 0), 0);
      points.push({ label: current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), value });
    }
    const display = points.length > 14 ? points.filter((_, index) => index % Math.ceil(points.length / 14) === 0 || index === points.length - 1) : points;
    const max = Math.max(...display.map((point) => point.value), 100);
    const coords = display.map((point, index) => ({ ...point, x: display.length === 1 ? 50 : (index / (display.length - 1)) * 100, y: 90 - (point.value / max) * 72 }));
    const line = coords.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
    const area = `${line} L 100 92 L 0 92 Z`;
    $('#sales-chart').innerHTML = `<svg viewBox="0 0 100 105" preserveAspectRatio="none" role="img">
      <defs><linearGradient id="adminChartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e05382" stop-opacity=".42"/><stop offset="1" stop-color="#e05382" stop-opacity="0"/></linearGradient></defs>
      <g stroke="rgba(255,255,255,.07)" stroke-width=".3">${[20,44,68,92].map((y) => `<line x1="0" y1="${y}" x2="100" y2="${y}"/>`).join('')}</g>
      <path d="${area}" fill="url(#adminChartFill)"/><path d="${line}" fill="none" stroke="#e982a5" stroke-width="1.15" vector-effect="non-scaling-stroke"/>
      ${coords.filter((point) => point.value > 0).map((point) => `<circle cx="${point.x}" cy="${point.y}" r="1.2" fill="#f2bfd1"/>`).join('')}
      <g fill="#7f7079" font-size="3" font-family="Manrope">${coords.filter((_, index) => index === 0 || index === coords.length - 1 || index === Math.floor(coords.length / 2)).map((point) => `<text x="${point.x}" y="103" text-anchor="middle">${point.label}</text>`).join('')}</g>
    </svg>`;
  }

  function filteredProducts() {
    const query = $('#product-search').value.trim().toLowerCase();
    const category = $('#product-category-filter').value;
    const status = $('#product-status-filter').value;
    return state.products.filter((product) => (!query || `${product.name} ${product.id}`.toLowerCase().includes(query)) && (!category || product.category_id === category) && (!status || (status === 'active') === product.active));
  }

  function renderProducts() {
    const products = filteredProducts();
    $('#products-empty').hidden = products.length > 0;
    $('#products-body').innerHTML = products.map((product) => {
      const image = product.image_urls?.[0];
      const category = state.categories.find((item) => item.id === product.category_id);
      const status = product.active ? '<span class="admin-status good">Ativo</span>' : '<span class="admin-status bad">Inativo</span>';
      return `<tr><td><div class="admin-product-cell"><span class="admin-product-thumb">${image ? `<img src="${escapeHtml(image)}" alt="">` : 'SEM FOTO'}</span><div><b>${escapeHtml(product.name)}</b><small>${escapeHtml(product.id)}</small></div></div></td><td>${escapeHtml(category?.name || product.category_id)}</td><td>${money(product.price_cents)}</td><td>${product.stock_quantity === null ? 'Livre' : product.stock_quantity}</td><td>${status}</td><td><div class="admin-table-actions"><button data-edit-product="${escapeHtml(product.id)}">Editar</button><button class="danger" data-delete-product="${escapeHtml(product.id)}">Remover</button></div></td></tr>`;
    }).join('');
    $$('[data-edit-product]').forEach((button) => button.addEventListener('click', () => openProductModal(button.dataset.editProduct)));
    $$('[data-delete-product]').forEach((button) => button.addEventListener('click', () => deleteProduct(button.dataset.deleteProduct)));
  }

  function renderCategories() {
    $('#categories-grid').innerHTML = state.categories.map((category) => {
      const count = state.products.filter((product) => product.category_id === category.id).length;
      const media = category.image_url
        ? category.media_type === 'video'
          ? `<video src="${escapeHtml(category.image_url)}" autoplay muted loop playsinline preload="metadata"></video>`
          : `<img src="${escapeHtml(category.image_url)}" alt="" loading="lazy">`
        : '';
      return `<article class="admin-category-card"><div class="admin-category-image">${media}</div><div class="admin-category-body"><h3>${escapeHtml(category.name)}</h3><p>${escapeHtml(category.description || 'Categoria da coleção Belíssima.')}</p><div class="admin-category-meta"><span>${count} produto${count === 1 ? '' : 's'} · ${category.active ? 'Ativa' : 'Inativa'}</span><div class="admin-category-actions"><button data-edit-category="${escapeHtml(category.id)}">Editar</button><button data-delete-category="${escapeHtml(category.id)}">Remover</button></div></div></div></article>`;
    }).join('');
    $$('[data-edit-category]').forEach((button) => button.addEventListener('click', () => openCategoryModal(button.dataset.editCategory)));
    $$('[data-delete-category]').forEach((button) => button.addEventListener('click', () => deleteCategory(button.dataset.deleteCategory)));
  }

  function mediaPreview(url, type, label) {
    if (type === 'video') return `<video src="${escapeHtml(url)}" autoplay muted loop playsinline preload="metadata" aria-label="${escapeHtml(label)}"></video>`;
    return `<img src="${escapeHtml(url)}" alt="${escapeHtml(label)}" loading="lazy">`;
  }

  function renderSiteMedia() {
    const grid = $('#site-media-grid');
    if (!grid) return;
    if (state.siteMediaError) {
      grid.innerHTML = '<div class="admin-media-help">A área de mídia ainda está sendo preparada. Atualize a página em alguns instantes.</div>';
      return;
    }
    grid.innerHTML = SITE_MEDIA_SLOTS.map((slot) => {
      const saved = state.siteMedia.find((item) => item.slot_key === slot.key);
      const url = saved?.media_url || slot.defaultUrl;
      const type = saved?.media_type || slot.defaultType;
      return `<article class="admin-media-card" data-site-media-card="${escapeHtml(slot.key)}">
        <div class="admin-media-preview">${mediaPreview(url, type, slot.label)}<span>${escapeHtml(slot.section)} · ${type === 'video' ? 'VÍDEO' : 'IMAGEM'}</span></div>
        <div class="admin-media-body"><div><h3>${escapeHtml(slot.label)}</h3><p>${escapeHtml(slot.description)}</p></div>
          <label class="admin-media-file">Nova imagem ou vídeo<input type="file" data-site-media-file accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm"></label>
          <div class="admin-media-actions"><button class="admin-primary-button admin-media-save" type="button" data-save-site-media="${escapeHtml(slot.key)}">SALVAR</button><button class="admin-secondary-button" type="button" data-reset-site-media="${escapeHtml(slot.key)}">PADRÃO</button></div>
        </div>
      </article>`;
    }).join('');
    $$('[data-save-site-media]', grid).forEach((button) => button.addEventListener('click', () => saveSiteMedia(button.dataset.saveSiteMedia, button)));
    $$('[data-reset-site-media]', grid).forEach((button) => button.addEventListener('click', () => resetSiteMedia(button.dataset.resetSiteMedia, button)));
  }

  function renderCustomers() {
    const query = $('#customer-search').value.trim().toLowerCase();
    const customers = state.customers.filter((customer) => !query || `${customer.full_name || ''} ${customer.email || ''}`.toLowerCase().includes(query));
    $('#customers-body').innerHTML = customers.map((customer) => `<tr><td>${escapeHtml(customer.full_name || 'Cliente')}</td><td>${escapeHtml(customer.email || '—')}</td><td>${date(customer.created_at)}</td><td>${date(customer.last_sign_in_at)}</td><td>${customer.email_confirmed_at ? '<span class="admin-status good">Confirmado</span>' : '<span class="admin-status warn">Pendente</span>'}</td></tr>`).join('') || '<tr><td colspan="5">Nenhum cliente encontrado.</td></tr>';
  }

  function renderOrders() {
    const query = $('#order-search').value.trim().toLowerCase();
    const payment = $('#order-payment-filter').value;
    const orders = state.orders.filter((order) => (!query || `${order.id} ${order.customer_name || ''} ${order.customer_email || ''}`.toLowerCase().includes(query)) && (!payment || order.payment_status === payment));
    $('#orders-body').innerHTML = orders.map((order) => {
      const delivery = order.shipping_service
        ? `<div class="admin-product-cell"><div><b>${escapeHtml(order.shipping_carrier || 'Transportadora')} · ${escapeHtml(order.shipping_service)}</b><small>${escapeHtml(order.shipping_destination_postal_code || '')}${order.shipping_delivery_days ? ` · até ${order.shipping_delivery_days} dias úteis` : ''}</small></div></div>`
        : '—';
      const label = order.shipping_label_status === 'created' || order.shipping_label_status === 'printed'
        ? '<span class="admin-status good">Gerada</span>'
        : '<span class="admin-status warn">Não gerada</span>';
      return `<tr><td>#${escapeHtml(order.id.slice(0, 8).toUpperCase())}</td><td><div class="admin-product-cell"><div><b>${escapeHtml(order.customer_name || 'Cliente')}</b><small>${escapeHtml(order.customer_email || '—')}</small></div></div></td><td>${date(order.created_at)}</td><td>${money(order.amount_total)}</td><td>${statusLabel(order.payment_status, 'payment')}</td><td>${delivery}</td><td>${label}</td><td><select class="admin-order-status" data-order-status="${escapeHtml(order.id)}">${[['pending','Pendente'],['processing','Em separação'],['shipped','Enviado'],['delivered','Entregue'],['cancelled','Cancelado']].map(([value,label]) => `<option value="${value}" ${order.fulfillment_status === value ? 'selected' : ''}>${label}</option>`).join('')}</select></td></tr>`;
    }).join('') || '<tr><td colspan="8">Nenhum pedido encontrado.</td></tr>';
    $$('[data-order-status]').forEach((select) => select.addEventListener('change', () => updateOrderStatus(select.dataset.orderStatus, select.value)));
  }

  function populateCategorySelects() {
    const options = state.categories.map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`).join('');
    const filter = $('#product-category-filter');
    const current = filter.value;
    filter.innerHTML = `<option value="">Todas as categorias</option>${options}`;
    filter.value = current;
    $('#product-form [name="category_id"]').innerHTML = options;
  }

  function renderImagePreview(container, images, type, mediaType = 'image') {
    container.innerHTML = images.map((url) => `<span class="admin-preview-item">${mediaType === 'video' ? `<video src="${escapeHtml(url)}" autoplay muted loop playsinline preload="metadata"></video>` : `<img src="${escapeHtml(url)}" alt="Imagem atual">`}<button type="button" data-remove-${type}-image="${escapeHtml(url)}" aria-label="Remover imagem">×</button></span>`).join('');
    $$(`[data-remove-${type}-image]`, container).forEach((button) => button.addEventListener('click', () => {
      if (type === 'product') productImages = productImages.filter((url) => url !== button.dataset.removeProductImage);
      else { categoryImage = ''; categoryMediaType = 'image'; }
      renderImagePreview(container, type === 'product' ? productImages : categoryImage ? [categoryImage] : [], type, type === 'category' ? categoryMediaType : 'image');
    }));
  }

  function renderCharacteristicsEditor(items = []) {
    const editor = $('#product-characteristics-editor');
    const normalized = Array.isArray(items) ? items : [];
    editor.innerHTML = normalized.map((item) => `
      <div class="admin-characteristic-row">
        <label>Grupo<input data-characteristic-group maxlength="60" required value="${escapeHtml(item.group || 'Características principais')}" placeholder="Características principais"></label>
        <label>Característica<input data-characteristic-label maxlength="80" required value="${escapeHtml(item.label || '')}" placeholder="Material"></label>
        <label>Valor<input data-characteristic-value maxlength="240" required value="${escapeHtml(item.value || '')}" placeholder="Renda e microfibra"></label>
        <button type="button" data-remove-characteristic aria-label="Remover característica">×</button>
      </div>`).join('');
    $$('[data-remove-characteristic]', editor).forEach((button) => button.addEventListener('click', () => button.closest('.admin-characteristic-row').remove()));
    editor.classList.toggle('is-empty', normalized.length === 0);
  }

  function addCharacteristicRow() {
    const current = collectProductCharacteristics(true);
    current.push({ group: current.at(-1)?.group || 'Características principais', label: '', value: '' });
    renderCharacteristicsEditor(current);
    $('#product-characteristics-editor').lastElementChild?.querySelector('[data-characteristic-label]')?.focus();
  }

  function collectProductCharacteristics(includeIncomplete = false) {
    const items = $$('.admin-characteristic-row', $('#product-characteristics-editor')).map((row) => ({
      group: $('[data-characteristic-group]', row).value.trim(),
      label: $('[data-characteristic-label]', row).value.trim(),
      value: $('[data-characteristic-value]', row).value.trim(),
    }));
    return includeIncomplete ? items : items.filter((item) => item.group && item.label && item.value);
  }

  function openProductModal(id = '') {
    editingProduct = state.products.find((product) => product.id === id) || null;
    productImages = [...(editingProduct?.image_urls || [])];
    productHoverMedia = editingProduct?.hover_media_url || '';
    const form = $('#product-form');
    form.reset();
    $('#product-modal-title').textContent = editingProduct ? 'Editar produto' : 'Novo produto';
    form.elements.id.value = editingProduct?.id || '';
    form.elements.id.readOnly = Boolean(editingProduct);
    form.elements.name.value = editingProduct?.name || '';
    form.category_id.value = editingProduct?.category_id || state.categories[0]?.id || '';
    form.price.value = editingProduct ? (Number(editingProduct.price_cents) / 100).toFixed(2) : '';
    form.stock_quantity.value = editingProduct?.stock_quantity ?? '';
    form.weight_kg.value = editingProduct?.weight_kg ?? '';
    form.height_cm.value = editingProduct?.height_cm ?? '';
    form.width_cm.value = editingProduct?.width_cm ?? '';
    form.length_cm.value = editingProduct?.length_cm ?? '';
    form.badge.value = editingProduct?.badge || '';
    form.sizes.value = (editingProduct?.sizes || []).join(', ');
    form.colors.value = (editingProduct?.colors || []).join(', ');
    form.description.value = editingProduct?.description || '';
    renderCharacteristicsEditor(editingProduct?.characteristics || []);
    form.active.checked = editingProduct ? editingProduct.active : true;
    form.featured.checked = editingProduct?.featured || false;
    renderImagePreview($('#product-image-preview'), productImages, 'product');
    renderHoverMediaPreview();
    $('#product-modal').showModal();
  }

  function renderHoverMediaPreview() {
    const container = $('#product-hover-preview');
    container.innerHTML = productHoverMedia
      ? `<span class="admin-preview-item"><img src="${escapeHtml(productHoverMedia)}" alt="GIF atual"><button type="button" id="remove-product-hover" aria-label="Remover GIF">×</button></span>`
      : '';
    $('#remove-product-hover')?.addEventListener('click', () => {
      productHoverMedia = '';
      renderHoverMediaPreview();
    });
  }

  function openCategoryModal(id = '') {
    editingCategory = state.categories.find((category) => category.id === id) || null;
    categoryImage = editingCategory?.image_url || '';
    categoryMediaType = editingCategory?.media_type || 'image';
    const form = $('#category-form');
    form.reset();
    $('#category-modal-title').textContent = editingCategory ? 'Editar categoria' : 'Nova categoria';
    form.elements.id.value = editingCategory?.id || '';
    form.elements.id.readOnly = Boolean(editingCategory);
    form.elements.name.value = editingCategory?.name || '';
    form.sort_order.value = editingCategory?.sort_order ?? state.categories.length * 10;
    form.description.value = editingCategory?.description || '';
    form.active.checked = editingCategory ? editingCategory.active : true;
    renderImagePreview($('#category-image-preview'), categoryImage ? [categoryImage] : [], 'category', categoryMediaType);
    $('#category-modal').showModal();
  }

  function validateSiteMedia(file) {
    if (!file || (!file.type.startsWith('image/') && !file.type.startsWith('video/'))) throw new Error('Escolha uma imagem ou um vídeo válido.');
    const limit = file.type.startsWith('video/') ? 30 * 1024 * 1024 : 8 * 1024 * 1024;
    if (file.size > limit) throw new Error(file.type.startsWith('video/') ? 'O vídeo deve ter até 30 MB.' : 'A imagem deve ter até 8 MB.');
  }

  async function uploadFiles(files, folder, bucket = 'product-images') {
    const urls = [];
    for (const file of files) {
      const extension = (file.name.split('.').pop() || 'webp').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
      const { error } = await client.storage.from(bucket).upload(path, file, { cacheControl: '31536000', contentType: file.type });
      if (error) throw error;
      const { data } = client.storage.from(bucket).getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function saveProduct(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $('#save-product');
    const id = editingProduct?.id || slugify(form.elements.id.value || form.elements.name.value);
    if (!id) return showMessage('Informe um identificador válido.', 'error');
    button.disabled = true;
    button.textContent = 'SALVANDO…';
    try {
      const files = [...form.images.files];
      if (files.length) productImages.push(...await uploadFiles(files, `products/${id}`));
      if (form.hover_media.files[0]) productHoverMedia = (await uploadFiles([form.hover_media.files[0]], `products/${id}/hover`))[0];
      const optionalNumber = (field) => form.elements[field].value === '' ? null : Number(form.elements[field].value);
      const payload = { id, category_id: form.category_id.value, name: form.elements.name.value.trim(), description: form.description.value.trim() || null, price_cents: Math.round(Number(form.price.value) * 100), badge: form.badge.value.trim() || null, colors: form.colors.value.split(',').map((item) => item.trim()).filter(Boolean), sizes: form.sizes.value.split(',').map((item) => item.trim()).filter(Boolean), characteristics: collectProductCharacteristics(), image_urls: productImages, hover_media_url: productHoverMedia || null, stock_quantity: form.stock_quantity.value === '' ? null : Number(form.stock_quantity.value), weight_kg: optionalNumber('weight_kg'), height_cm: optionalNumber('height_cm'), width_cm: optionalNumber('width_cm'), length_cm: optionalNumber('length_cm'), active: form.active.checked, featured: form.featured.checked };
      const query = editingProduct ? client.from('products').update(payload).eq('id', id) : client.from('products').insert(payload);
      const { error } = await query;
      if (error) throw error;
      $('#product-modal').close();
      await loadData();
      showMessage(editingProduct ? 'Produto atualizado com sucesso.' : 'Produto adicionado com sucesso.');
    } catch (error) {
      showMessage(`Não foi possível salvar o produto: ${error.message}`, 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'SALVAR PRODUTO';
    }
  }

  async function saveCategory(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $('#save-category');
    const id = editingCategory?.id || slugify(form.elements.id.value || form.elements.name.value);
    if (!id) return showMessage('Informe um identificador válido.', 'error');
    button.disabled = true;
    button.textContent = 'SALVANDO…';
    try {
      if (form.image.files[0]) {
        validateSiteMedia(form.image.files[0]);
        categoryMediaType = form.image.files[0].type.startsWith('video/') ? 'video' : 'image';
        categoryImage = (await uploadFiles([form.image.files[0]], `categories/${id}`, 'site-media'))[0];
      }
      const payload = { id, name: form.elements.name.value.trim(), description: form.description.value.trim() || null, image_url: categoryImage || null, media_type: categoryMediaType, sort_order: Number(form.sort_order.value || 0), active: form.active.checked };
      const query = editingCategory ? client.from('categories').update(payload).eq('id', id) : client.from('categories').insert(payload);
      const { error } = await query;
      if (error) throw error;
      $('#category-modal').close();
      await loadData();
      showMessage(editingCategory ? 'Categoria atualizada com sucesso.' : 'Categoria adicionada com sucesso.');
    } catch (error) {
      showMessage(`Não foi possível salvar a categoria: ${error.message}`, 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'SALVAR CATEGORIA';
    }
  }

  async function saveSiteMedia(key, button) {
    const slot = SITE_MEDIA_SLOTS.find((item) => item.key === key);
    const card = button.closest('[data-site-media-card]');
    const file = $('[data-site-media-file]', card)?.files?.[0];
    if (!slot || !file) return showMessage('Escolha uma imagem ou um vídeo antes de salvar.', 'error');
    button.disabled = true;
    button.textContent = 'SALVANDO…';
    try {
      validateSiteMedia(file);
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      const mediaUrl = (await uploadFiles([file], `grids/${key}`, 'site-media'))[0];
      const { error } = await client.from('site_media').upsert({ slot_key: key, label: slot.label, section: slot.section, media_type: mediaType, media_url: mediaUrl, active: true }, { onConflict: 'slot_key' });
      if (error) throw error;
      await loadData();
      showMessage('Mídia atualizada na loja.');
    } catch (error) {
      showMessage(`Não foi possível atualizar a mídia: ${error.message}`, 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'SALVAR';
    }
  }

  async function resetSiteMedia(key, button) {
    const slot = SITE_MEDIA_SLOTS.find((item) => item.key === key);
    if (!slot) return;
    button.disabled = true;
    try {
      const { error } = await client.from('site_media').upsert({ slot_key: key, label: slot.label, section: slot.section, media_type: slot.defaultType, media_url: slot.defaultUrl, active: true }, { onConflict: 'slot_key' });
      if (error) throw error;
      await loadData();
      showMessage('Mídia padrão restaurada.');
    } catch (error) {
      showMessage(`Não foi possível restaurar: ${error.message}`, 'error');
    } finally {
      button.disabled = false;
    }
  }

  async function deleteProduct(id) {
    const product = state.products.find((item) => item.id === id);
    if (!window.confirm(`Remover “${product?.name || id}” da loja?`)) return;
    const { error } = await client.from('products').delete().eq('id', id);
    if (error) return showMessage(`Não foi possível remover: ${error.message}`, 'error');
    await loadData();
    showMessage('Produto removido.');
  }

  async function deleteCategory(id) {
    const category = state.categories.find((item) => item.id === id);
    if (!window.confirm(`Remover a categoria “${category?.name || id}”?`)) return;
    const { error } = await client.from('categories').delete().eq('id', id);
    if (error) return showMessage('Mova ou remova os produtos desta categoria antes de excluí-la.', 'error');
    await loadData();
    showMessage('Categoria removida.');
  }

  async function updateOrderStatus(id, fulfillmentStatus) {
    const { error } = await client.from('orders').update({ fulfillment_status: fulfillmentStatus }).eq('id', id);
    if (error) return showMessage('Não foi possível atualizar o pedido.', 'error');
    const order = state.orders.find((item) => item.id === id);
    if (order) order.fulfillment_status = fulfillmentStatus;
    renderDashboard();
    showMessage('Andamento do pedido atualizado.');
  }

  function setupEvents() {
    $$('[data-admin-view]').forEach((button) => button.addEventListener('click', () => showView(button.dataset.adminView)));
    $$('[data-go-view]').forEach((button) => button.addEventListener('click', () => showView(button.dataset.goView)));
    $('#admin-menu-open').addEventListener('click', () => $('#admin-sidebar').classList.add('open'));
    $('#admin-menu-close').addEventListener('click', () => $('#admin-sidebar').classList.remove('open'));
    $('#admin-logout').addEventListener('click', async () => { await client.auth.signOut(); window.location.replace('admin-login.html'); });
    $('#dashboard-period').addEventListener('change', renderDashboard);
    $('#product-search').addEventListener('input', renderProducts);
    $('#product-category-filter').addEventListener('change', renderProducts);
    $('#product-status-filter').addEventListener('change', renderProducts);
    $('#customer-search').addEventListener('input', renderCustomers);
    $('#order-search').addEventListener('input', renderOrders);
    $('#order-payment-filter').addEventListener('change', renderOrders);
    $('#new-product').addEventListener('click', () => openProductModal());
    $('#add-product-characteristic').addEventListener('click', addCharacteristicRow);
    $('#new-category').addEventListener('click', () => openCategoryModal());
    $('#product-form').addEventListener('submit', saveProduct);
    $('#category-form').addEventListener('submit', saveCategory);
    $$('[data-close-modal]').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
  }

  function showView(view) {
    $$('[data-admin-view]').forEach((button) => button.classList.toggle('active', button.dataset.adminView === view));
    $$('[data-admin-section]').forEach((section) => section.classList.toggle('active', section.dataset.adminSection === view));
    const titles = { dashboard: 'Visão geral', products: 'Produtos', categories: 'Categorias', 'site-media': 'Mídia do site', customers: 'Clientes', orders: 'Pedidos' };
    $('#admin-page-title').textContent = titles[view] || 'Painel';
    $('#admin-sidebar').classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  (async () => {
    try {
      if (!await requireAdmin()) return;
      const user = state.session.user;
      const name = user.user_metadata?.nome || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Administradora';
      $('#admin-user-name').textContent = name;
      $('#admin-greeting-name').textContent = name.split(' ')[0];
      $('#admin-user-email').textContent = user.email || '';
      $('#admin-user-avatar').textContent = name.charAt(0).toUpperCase();
      setupEvents();
      await loadData();
      $('#admin-loading').hidden = true;
      $('#admin-app').hidden = false;
    } catch (error) {
      console.error('[Belíssima/Admin] Falha ao abrir painel', error);
      $('#admin-loading p').textContent = 'Não foi possível carregar o painel. Atualize a página.';
    }
  })();
})();
