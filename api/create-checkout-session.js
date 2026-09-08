// Vercel Function: cria uma sessão segura usando preços do catálogo no Supabase.
const Stripe = require('stripe');

const STRIPE_API_VERSION = '2026-07-29.dahlia';
const INTEGRATION_IDENTIFIER = 'belissima_checkout_nqvszklt';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

function getOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

function cleanOption(value) {
  return value ? String(value).slice(0, 40) : '';
}

function serviceHeaders() {
  const serviceRole = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  return { apikey: serviceRole, Authorization: `Bearer ${serviceRole}` };
}

async function getCatalog(ids) {
  const baseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
  const encodedIds = ids.map((id) => `"${id}"`).join(',');
  const url = `${baseUrl}/rest/v1/products?select=id,name,price_cents,active,stock_quantity&id=in.(${encodeURIComponent(encodedIds)})`;
  const response = await fetch(url, { headers: serviceHeaders() });
  if (!response.ok) throw new Error(`Falha ao consultar catálogo (${response.status}).`);
  return response.json();
}

async function getAuthenticatedUser(req) {
  const authorization = req.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) return null;
  const baseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/auth/v1/user`, {
    headers: { apikey: requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), Authorization: authorization },
  });
  if (!response.ok) return null;
  const user = await response.json();
  return user?.id ? user : null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  let stripe;
  try {
    stripe = new Stripe(requiredEnv('STRIPE_SECRET_KEY'), { apiVersion: STRIPE_API_VERSION });
    requiredEnv('SUPABASE_URL');
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  } catch (error) {
    console.error('[Belíssima/Stripe] Checkout sem configuração completa', { message: error.message });
    return res.status(503).json({ error: 'Checkout temporariamente indisponível.' });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return res.status(400).json({ error: 'Sua sacola está vazia.' });
  if (items.length > 50) return res.status(400).json({ error: 'Sua sacola possui itens demais.' });

  const normalizedItems = [];
  for (const item of items) {
    const id = String(item?.id || '');
    if (!/^[a-z0-9-]{2,100}$/.test(id)) {
      return res.status(400).json({ error: 'A sacola contém um produto inválido.' });
    }
    normalizedItems.push({
      id,
      quantity: Math.max(1, Math.min(10, Number(item.quantity) || 1)),
      size: cleanOption(item.size),
      color: cleanOption(item.color),
    });
  }

  try {
    const ids = [...new Set(normalizedItems.map((item) => item.id))];
    const products = await getCatalog(ids);
    const catalog = new Map(products.map((product) => [product.id, product]));
    const user = await getAuthenticatedUser(req);

    const lineItems = normalizedItems.map((item) => {
      const product = catalog.get(item.id);
      if (!product || !product.active) throw new Error(`Produto indisponível: ${item.id}`);
      if (product.stock_quantity !== null && product.stock_quantity < item.quantity) {
        throw new Error(`Estoque insuficiente: ${product.name}`);
      }
      const details = [item.size ? `Tam. ${item.size}` : '', item.color ? `Cor ${item.color}` : '']
        .filter(Boolean)
        .join(' · ');
      return {
        quantity: item.quantity,
        price_data: {
          currency: 'brl',
          unit_amount: Number(product.price_cents),
          product_data: {
            name: product.name,
            ...(details ? { description: details } : {}),
            metadata: { catalog_id: item.id, size: item.size, color: item.color },
          },
        },
      };
    });

    const origin = getOrigin(req);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: ['BR'] },
      allow_promotion_codes: true,
      success_url: `${origin}/pedido-sucesso.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/loja.html`,
      integration_identifier: INTEGRATION_IDENTIFIER,
      ...(user?.email ? { customer_email: user.email } : {}),
      metadata: { store: 'belissima', ...(user?.id ? { user_id: user.id } : {}) },
    });
    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('[Belíssima/Stripe] Falha ao criar Checkout Session', { message: error?.message });
    const isCatalogError = /Produto indisponível|Estoque insuficiente/.test(error?.message || '');
    return res.status(isCatalogError ? 409 : 400).json({
      error: isCatalogError ? error.message : 'Não foi possível iniciar o checkout. Tente novamente.',
    });
  }
};
