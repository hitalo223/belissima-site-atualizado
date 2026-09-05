// Vercel Function: cria uma sessão de Checkout da Stripe sem expor credenciais no frontend.
// Configure STRIPE_SECRET_KEY como variável sensível na Vercel. Prefira uma restricted key (rk_) com o mínimo de permissões.

const Stripe = require('stripe');

const STRIPE_API_VERSION = '2026-07-29.dahlia';
const INTEGRATION_IDENTIFIER = 'belissima_checkout_nqvszklt';

const CATALOG = {
  'sutia-renda-sem-costura': { name: 'Sutiã Renda Sem Costura', price: 18990 },
  'sutia-bojo-basico': { name: 'Sutiã Bojo Básico', price: 12990 },
  'sutia-triangulo-cropped': { name: 'Sutiã Triângulo Cropped', price: 15990 },
  'sutia-pushup-renda': { name: 'Sutiã Push-up Renda', price: 19990 },
  'calcinha-biquini-lisa': { name: 'Calcinha Biquíni Lisa', price: 7990 },
  'calcinha-tanga-renda': { name: 'Calcinha Tanga Renda', price: 6990 },
  'calcinha-boyshort-algodao': { name: 'Calcinha Boyshort Algodão', price: 5990 },
  'calcinha-fio-renda': { name: 'Calcinha Fio Dental Renda', price: 4990 },
  'body-decote-v': { name: 'Body Decote V', price: 21990 },
  'body-renda-costas-nu': { name: 'Body Renda Costas Nu', price: 23990 },
  'body-manga-longa-tule': { name: 'Body Manga Longa Tule', price: 25990 },
  'body-basico-algodao': { name: 'Body Básico Algodão', price: 17990 },
  'conjunto-seda-natural': { name: 'Conjunto Seda Natural', price: 25990 },
  'conjunto-renda-floral': { name: 'Conjunto Renda Floral', price: 27990 },
  'conjunto-basico-microfibra': { name: 'Conjunto Básico Microfibra', price: 14990 },
  'conjunto-noite-cetim': { name: 'Conjunto Noite Cetim', price: 29990 },
  'pijama-longo-cetim': { name: 'Pijama Longo Cetim', price: 24990 },
  'pijama-curto-algodao': { name: 'Pijama Curto Algodão', price: 15990 },
  'camisola-renda': { name: 'Camisola Renda', price: 21990 },
  'short-doll-seda': { name: 'Short Doll Seda', price: 19990 },
  'cinta-modeladora-alta': { name: 'Cinta Modeladora Alta', price: 17990 },
  'short-modelador': { name: 'Short Modelador', price: 13990 },
  'body-modelador': { name: 'Body Modelador', price: 22990 },
  'cinta-pos-parto': { name: 'Cinta Cirúrgica Pós-parto', price: 19990 },
  'outlet-sutia-basico': { name: 'Sutiã Básico (Outlet)', price: 6990 },
  'outlet-conjunto-renda': { name: 'Conjunto Renda (Outlet)', price: 14990 },
  'outlet-pijama-algodao': { name: 'Pijama Algodão (Outlet)', price: 8990 },
  'outlet-body-tule': { name: 'Body Tule (Outlet)', price: 11990 },
};

function getOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: STRIPE_API_VERSION });
}

function cleanOption(value) {
  return value ? String(value).slice(0, 40) : '';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return res.status(503).json({
      error: 'Checkout ainda não configurado. Adicione STRIPE_SECRET_KEY nas variáveis sensíveis da Vercel.'
    });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return res.status(400).json({ error: 'Sua sacola está vazia.' });
  if (items.length > 50) return res.status(400).json({ error: 'Sua sacola possui itens demais.' });

  const lineItems = [];
  for (const item of items) {
    const product = CATALOG[item.id];
    if (!product) return res.status(400).json({ error: `Produto inválido: ${item.id}` });

    const quantity = Math.max(1, Math.min(10, Number(item.quantity) || 1));
    const size = cleanOption(item.size);
    const color = cleanOption(item.color);
    const details = [size ? `Tam. ${size}` : '', color ? `Cor ${color}` : '']
      .filter(Boolean)
      .join(' · ');

    lineItems.push({
      quantity,
      price_data: {
        currency: 'brl',
        unit_amount: product.price,
        product_data: {
          name: product.name,
          ...(details ? { description: details } : {}),
          metadata: {
            catalog_id: String(item.id),
            size,
            color,
          },
        },
      },
    });
  }

  const origin = getOrigin(req);

  try {
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
      metadata: {
        store: 'belissima',
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('[Belíssima/Stripe] Falha ao criar Checkout Session', {
      type: error?.type,
      code: error?.code,
      requestId: error?.requestId,
    });
    return res.status(400).json({ error: 'Não foi possível iniciar o checkout. Tente novamente.' });
  }
};
