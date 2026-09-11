// Base de produtos do site. Enquanto não temos backend/banco de dados real,
// os produtos ficam aqui. Cada um tem: id (usado na URL), categoria, nome,
// preço, badge opcional (NOVO, -15% etc.), cores disponíveis e tamanhos.

const CATEGORY_LABELS = {
  sutias: 'Sutiãs',
  calcinhas: 'Calcinhas',
  bodies: 'Bodies',
  conjuntos: 'Conjuntos',
  pijamas: 'Pijamas',
  modeladores: 'Modeladores',
  outlet: 'Outlet',
};

const PRODUCTS = [
  // SUTIÃS
  { id: 'sutia-renda-sem-costura', category: 'sutias', name: 'Sutiã Renda Sem Costura', price: 189.90, badge: 'NOVO', colors: ['#604C43', '#C8AD88'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'sutia-bojo-basico', category: 'sutias', name: 'Sutiã Bojo Básico', price: 129.90, colors: ['#A99586', '#F3EDE4'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'sutia-triangulo-cropped', category: 'sutias', name: 'Sutiã Triângulo Cropped', price: 159.90, badge: '-15%', colors: ['#9B7D7D', '#604C43'], sizes: ['P', 'M', 'G'] },
  { id: 'sutia-pushup-renda', category: 'sutias', name: 'Sutiã Push-up Renda', price: 199.90, colors: ['#604C43', '#B88F70'], sizes: ['P', 'M', 'G', 'GG'] },

  // CALCINHAS
  { id: 'calcinha-biquini-lisa', category: 'calcinhas', name: 'Calcinha Biquíni Lisa', price: 79.90, badge: '-15%', colors: ['#A99586', '#F3EDE4'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'calcinha-tanga-renda', category: 'calcinhas', name: 'Calcinha Tanga Renda', price: 69.90, colors: ['#604C43', '#C8AD88'], sizes: ['P', 'M', 'G'] },
  { id: 'calcinha-boyshort-algodao', category: 'calcinhas', name: 'Calcinha Boyshort Algodão', price: 59.90, colors: ['#9B7D7D', '#F3EDE4'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'calcinha-fio-renda', category: 'calcinhas', name: 'Calcinha Fio Dental Renda', price: 49.90, badge: 'NOVO', colors: ['#604C43', '#B88F70'], sizes: ['P', 'M', 'G'] },

  // BODIES
  { id: 'body-decote-v', category: 'bodies', name: 'Body Decote V', price: 219.90, badge: 'NOVO', colors: ['#604C43', '#C8AD88'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'body-renda-costas-nu', category: 'bodies', name: 'Body Renda Costas Nu', price: 239.90, colors: ['#9B7D7D', '#604C43'], sizes: ['P', 'M', 'G'] },
  { id: 'body-manga-longa-tule', category: 'bodies', name: 'Body Manga Longa Tule', price: 259.90, colors: ['#A99586', '#F3EDE4'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'body-basico-algodao', category: 'bodies', name: 'Body Básico Algodão', price: 179.90, colors: ['#604C43', '#A99586'], sizes: ['P', 'M', 'G'] },

  // CONJUNTOS
  { id: 'conjunto-seda-natural', category: 'conjuntos', name: 'Conjunto Seda Natural', price: 259.90, colors: ['#B88F70', '#604C43'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'conjunto-renda-floral', category: 'conjuntos', name: 'Conjunto Renda Floral', price: 279.90, badge: 'NOVO', colors: ['#9B7D7D', '#C8AD88'], sizes: ['P', 'M', 'G'] },
  { id: 'conjunto-basico-microfibra', category: 'conjuntos', name: 'Conjunto Básico Microfibra', price: 149.90, colors: ['#A99586', '#F3EDE4'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'conjunto-noite-cetim', category: 'conjuntos', name: 'Conjunto Noite Cetim', price: 299.90, colors: ['#604C43', '#B88F70'], sizes: ['P', 'M', 'G'] },

  // PIJAMAS
  { id: 'pijama-longo-cetim', category: 'pijamas', name: 'Pijama Longo Cetim', price: 249.90, colors: ['#604C43', '#A99586'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'pijama-curto-algodao', category: 'pijamas', name: 'Pijama Curto Algodão', price: 159.90, colors: ['#9B7D7D', '#F3EDE4'], sizes: ['P', 'M', 'G'] },
  { id: 'camisola-renda', category: 'pijamas', name: 'Camisola Renda', price: 219.90, badge: 'NOVO', colors: ['#604C43', '#C8AD88'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'short-doll-seda', category: 'pijamas', name: 'Short Doll Seda', price: 199.90, colors: ['#B88F70', '#A99586'], sizes: ['P', 'M', 'G'] },

  // MODELADORES
  { id: 'cinta-modeladora-alta', category: 'modeladores', name: 'Cinta Modeladora Alta', price: 179.90, colors: ['#604C43', '#F3EDE4'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'short-modelador', category: 'modeladores', name: 'Short Modelador', price: 139.90, colors: ['#A99586'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'body-modelador', category: 'modeladores', name: 'Body Modelador', price: 229.90, colors: ['#604C43', '#9B7D7D'], sizes: ['P', 'M', 'G'] },
  { id: 'cinta-pos-parto', category: 'modeladores', name: 'Cinta Cirúrgica Pós-parto', price: 199.90, colors: ['#F3EDE4'], sizes: ['P', 'M', 'G', 'GG'] },

  // OUTLET
  { id: 'outlet-sutia-basico', category: 'outlet', name: 'Sutiã Básico (Outlet)', price: 69.90, badge: '-40%', colors: ['#A99586', '#604C43'], sizes: ['P', 'M', 'G'] },
  { id: 'outlet-conjunto-renda', category: 'outlet', name: 'Conjunto Renda (Outlet)', price: 149.90, badge: '-30%', colors: ['#9B7D7D'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'outlet-pijama-algodao', category: 'outlet', name: 'Pijama Algodão (Outlet)', price: 89.90, badge: '-35%', colors: ['#604C43', '#F3EDE4'], sizes: ['P', 'M'] },
  { id: 'outlet-body-tule', category: 'outlet', name: 'Body Tule (Outlet)', price: 119.90, badge: '-40%', colors: ['#C8AD88'], sizes: ['P', 'M', 'G'] },
];

function getProductsByCategory(cat) {
  return PRODUCTS.filter((p) => p.category === cat);
}

function getProductById(id) {
  return PRODUCTS.find((p) => p.id === id);
}

function getCatalogCategories() {
  return Object.entries(CATEGORY_LABELS).map(([id, name]) => ({ id, name }));
}

function catalogImageUrl(product) {
  return Array.isArray(product?.images) && product.images.length ? product.images[0] : '';
}

function catalogProductCardMedia(product) {
  const images = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
  if (!images.length) return '<span class="placeholder-note">[foto produto]</span>';
  const first = catalogEscape(images[0]);
  const alt = catalogEscape(product.name);
  const hover = product.hoverMediaUrl
    ? `<img class="prod-card-media prod-card-hover-media" src="${catalogEscape(product.hoverMediaUrl)}" alt="" loading="lazy">`
    : images.length > 1
      ? `<img class="prod-card-media prod-card-media-next" src="${catalogEscape(images[1])}" alt="" loading="lazy">`
      : '';
  return `<img class="prod-card-media prod-card-media-primary" src="${first}" alt="${alt}" loading="lazy">${hover}`;
}

function setupProductCardHover(root = document) {
  root.querySelectorAll('.prod-card[data-product-id]').forEach((card) => {
    if (card.dataset.mediaReady === 'true') return;
    card.dataset.mediaReady = 'true';
    const product = getProductById(card.dataset.productId);
    const images = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
    if (product?.hoverMediaUrl) {
      card.classList.add('has-hover-media');
      return;
    }
    if (images.length < 2) return;

    const media = card.querySelector('.prod-img');
    const primary = card.querySelector('.prod-card-media-primary');
    const next = card.querySelector('.prod-card-media-next');
    let index = 0;
    let timer = 0;

    const advance = () => {
      const nextIndex = (index + 1) % images.length;
      next.src = images[nextIndex];
      media.classList.add('is-media-sliding');
      timer = window.setTimeout(() => {
        index = nextIndex;
        primary.src = images[index];
        media.classList.add('is-media-resetting');
        media.classList.remove('is-media-sliding');
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => media.classList.remove('is-media-resetting')));
        timer = window.setTimeout(advance, 850);
      }, 380);
    };

    card.addEventListener('mouseenter', () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(advance, 220);
    });
    card.addEventListener('mouseleave', () => {
      window.clearTimeout(timer);
      index = 0;
      media.classList.add('is-media-resetting');
      media.classList.remove('is-media-sliding');
      primary.src = images[0];
      next.src = images[1];
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => media.classList.remove('is-media-resetting')));
    });
  });
}

function catalogEscape(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function waitForCatalogClient() {
  if (window.BelissimaAuth?.client) return Promise.resolve(window.BelissimaAuth.client);
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => resolve(window.BelissimaAuth?.client || null), 4500);
    window.addEventListener('belissima:auth-ready', () => {
      window.clearTimeout(timeout);
      resolve(window.BelissimaAuth?.client || null);
    }, { once: true });
  });
}

let catalogLoadPromise = null;

async function loadCatalogData() {
  if (catalogLoadPromise) return catalogLoadPromise;

  catalogLoadPromise = (async () => {
    const client = await waitForCatalogClient();
    if (!client) return { categories: getCatalogCategories(), products: PRODUCTS, source: 'fallback' };

    const [categoryResult, productResult] = await Promise.all([
      client.from('categories').select('id,name,description,image_url,media_type,sort_order,active').order('sort_order'),
      client.from('products').select('id,category_id,name,description,price_cents,badge,colors,sizes,image_urls,hover_media_url,stock_quantity,active,featured,characteristics,created_at').order('created_at'),
    ]);

    if (categoryResult.error || productResult.error) {
      throw categoryResult.error || productResult.error;
    }

    const categories = categoryResult.data || [];
    const products = (productResult.data || []).map((product) => ({
      id: product.id,
      category: product.category_id,
      name: product.name,
      description: product.description || '',
      price: Number(product.price_cents || 0) / 100,
      badge: product.badge || '',
      colors: Array.isArray(product.colors) ? product.colors : [],
      sizes: Array.isArray(product.sizes) ? product.sizes : [],
      images: Array.isArray(product.image_urls) ? product.image_urls : [],
      hoverMediaUrl: product.hover_media_url || '',
      stockQuantity: product.stock_quantity,
      active: product.active !== false,
      featured: product.featured === true,
      characteristics: Array.isArray(product.characteristics) ? product.characteristics : [],
    }));

    Object.keys(CATEGORY_LABELS).forEach((key) => delete CATEGORY_LABELS[key]);
    categories.forEach((category) => { CATEGORY_LABELS[category.id] = category.name; });
    PRODUCTS.splice(0, PRODUCTS.length, ...products);

    window.dispatchEvent(new CustomEvent('belissima:catalog-ready', {
      detail: { categories, products: PRODUCTS },
    }));
    return { categories, products: PRODUCTS, source: 'supabase' };
  })().catch((error) => {
    catalogLoadPromise = null;
    console.error('[Belíssima/Catálogo] Não foi possível carregar o catálogo atualizado', error);
    return { categories: getCatalogCategories(), products: PRODUCTS, source: 'fallback' };
  });

  return catalogLoadPromise;
}
