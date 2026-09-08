const QUOTE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_FREE_THRESHOLD_CENTS = 19900;
const { getValidAccessToken } = require('./shipping-oauth');

class ShippingError extends Error {
  constructor(message, status = 400, code = 'shipping_error') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    const error = new ShippingError('O cálculo de frete ainda está sendo configurado.', 503, 'shipping_not_configured');
    error.missingConfiguration = name;
    throw error;
  }
  return value;
}

function normalizePostalCode(value) {
  const postalCode = String(value || '').replace(/\D/g, '');
  if (!/^\d{8}$/.test(postalCode)) {
    throw new ShippingError('Digite um CEP válido com 8 números.', 400, 'invalid_postal_code');
  }
  return postalCode;
}

function normalizeItems(items) {
  if (!Array.isArray(items) || !items.length) {
    throw new ShippingError('Adicione um produto antes de calcular o frete.', 400, 'empty_cart');
  }
  if (items.length > 50) throw new ShippingError('A sacola possui itens demais.', 400, 'too_many_items');
  return items.map((item) => {
    const id = String(item?.id || '');
    if (!/^[a-z0-9-]{2,100}$/.test(id)) {
      throw new ShippingError('A sacola contém um produto inválido.', 400, 'invalid_product');
    }
    return { id, quantity: Math.max(1, Math.min(10, Number(item.quantity) || 1)) };
  });
}

function getFreeThresholdCents() {
  const configured = Number(process.env.FREE_SHIPPING_THRESHOLD_CENTS || DEFAULT_FREE_THRESHOLD_CENTS);
  return Number.isInteger(configured) && configured >= 0 ? configured : DEFAULT_FREE_THRESHOLD_CENTS;
}

function isShippingEnabled() {
  return String(process.env.SHIPPING_ENABLED || '').toLowerCase() === 'true';
}

function supabaseHeaders() {
  const serviceRole = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  return { apikey: serviceRole, Authorization: `Bearer ${serviceRole}` };
}

async function getCatalogProducts(ids) {
  const baseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
  const encodedIds = ids.map((id) => `"${id}"`).join(',');
  const fields = 'id,name,price_cents,active,stock_quantity,weight_kg,height_cm,width_cm,length_cm';
  const url = `${baseUrl}/rest/v1/products?select=${fields}&id=in.(${encodeURIComponent(encodedIds)})`;
  const response = await fetch(url, { headers: supabaseHeaders() });
  if (!response.ok) throw new ShippingError('Não foi possível consultar os produtos.', 503, 'catalog_unavailable');
  return response.json();
}

function buildShipment(normalizedItems, products) {
  const catalog = new Map(products.map((product) => [product.id, product]));
  let subtotalCents = 0;
  const shipmentProducts = normalizedItems.map((item) => {
    const product = catalog.get(item.id);
    if (!product || !product.active) {
      throw new ShippingError(`Produto indisponível: ${item.id}`, 409, 'product_unavailable');
    }
    if (product.stock_quantity !== null && Number(product.stock_quantity) < item.quantity) {
      throw new ShippingError(`Estoque insuficiente: ${product.name}`, 409, 'insufficient_stock');
    }
    const logistics = ['weight_kg', 'height_cm', 'width_cm', 'length_cm'];
    if (logistics.some((field) => !Number.isFinite(Number(product[field])) || Number(product[field]) <= 0)) {
      throw new ShippingError(`O frete de “${product.name}” ainda não está configurado.`, 409, 'product_logistics_missing');
    }
    subtotalCents += Number(product.price_cents) * item.quantity;
    return {
      id: product.id,
      width: Number(product.width_cm),
      height: Number(product.height_cm),
      length: Number(product.length_cm),
      weight: Number(product.weight_kg),
      insurance_value: Number((Number(product.price_cents) / 100).toFixed(2)),
      quantity: item.quantity,
    };
  });
  return { subtotalCents, shipmentProducts, catalog };
}

async function providerConfig() {
  const environment = String(process.env.MELHOR_ENVIO_ENV || 'sandbox').toLowerCase();
  const baseUrl = process.env.MELHOR_ENVIO_API_BASE_URL
    || (environment === 'production' ? 'https://melhorenvio.com.br' : 'https://sandbox.melhorenvio.com.br');
  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    token: await getValidAccessToken(),
    userAgent: requiredEnv('MELHOR_ENVIO_USER_AGENT'),
    environment,
  };
}

async function requestProviderQuote(destinationPostalCode, shipmentProducts) {
  const originPostalCode = normalizePostalCode(requiredEnv('SHIPPING_ORIGIN_POSTAL_CODE'));
  const config = await providerConfig();
  const response = await fetch(`${config.baseUrl}/api/v2/me/shipment/calculate`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.token}`,
      'User-Agent': config.userAgent,
    },
    body: JSON.stringify({
      from: { postal_code: originPostalCode },
      to: { postal_code: destinationPostalCode },
      products: shipmentProducts,
      options: { receipt: false, own_hand: false },
    }),
  });
  let data;
  try { data = await response.json(); } catch (_) { data = null; }
  if (!response.ok) {
    console.error('[Belíssima/Frete] Melhor Envio rejeitou a cotação', { status: response.status, data });
    const invalid = response.status === 422;
    throw new ShippingError(
      invalid ? 'Não foi possível calcular o frete para esse CEP.' : 'O cálculo de frete está temporariamente indisponível.',
      invalid ? 422 : 503,
      invalid ? 'quote_unavailable' : 'provider_unavailable'
    );
  }
  if (!Array.isArray(data)) throw new ShippingError('A transportadora não retornou opções de frete.', 503, 'invalid_provider_response');
  return { data, environment: config.environment };
}

function normalizeProviderOptions(rawOptions, subtotalCents, now = Date.now()) {
  const available = rawOptions
    .filter((option) => !option.error && option.id && (option.custom_price || option.price))
    .map((option) => {
      const costCents = Math.round(Number(option.custom_price || option.price) * 100);
      const range = option.custom_delivery_range || option.delivery_range;
      const days = Number(option.custom_delivery_time || option.delivery_time || range?.max || 0);
      return {
        serviceId: String(option.id),
        service: String(option.name || 'Entrega'),
        carrier: String(option.company?.name || 'Transportadora'),
        costCents,
        deliveryDays: Number.isFinite(days) && days > 0 ? Math.ceil(days) : null,
      };
    })
    .filter((option) => Number.isInteger(option.costCents) && option.costCents >= 0)
    .sort((a, b) => a.costCents - b.costCents || (a.deliveryDays || 999) - (b.deliveryDays || 999));

  if (!available.length) throw new ShippingError('Nenhuma modalidade de entrega está disponível para esse CEP.', 422, 'no_shipping_options');
  const threshold = getFreeThresholdCents();
  const discountCents = subtotalCents >= threshold ? available[0].costCents : 0;
  const expiresAt = new Date(now + QUOTE_TTL_MS).toISOString();
  return available.map((option) => ({
    ...option,
    chargedCents: Math.max(0, option.costCents - discountCents),
    free: option.costCents <= discountCents,
    quoteId: `${option.serviceId}:${now}`,
    expiresAt,
  }));
}

async function calculateShipping({ postalCode, items }) {
  const destinationPostalCode = normalizePostalCode(postalCode);
  const normalizedItems = normalizeItems(items);
  const ids = [...new Set(normalizedItems.map((item) => item.id))];
  const products = await getCatalogProducts(ids);
  const shipment = buildShipment(normalizedItems, products);
  const provider = await requestProviderQuote(destinationPostalCode, shipment.shipmentProducts);
  const options = normalizeProviderOptions(provider.data, shipment.subtotalCents);
  return {
    provider: 'melhor_envio',
    environment: provider.environment,
    destinationPostalCode,
    subtotalCents: shipment.subtotalCents,
    freeShippingThresholdCents: getFreeThresholdCents(),
    options,
    catalog: shipment.catalog,
  };
}

module.exports = {
  ShippingError,
  normalizePostalCode,
  normalizeItems,
  getFreeThresholdCents,
  isShippingEnabled,
  getCatalogProducts,
  buildShipment,
  normalizeProviderOptions,
  calculateShipping,
};
