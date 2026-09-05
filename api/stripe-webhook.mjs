import Stripe from 'stripe';

const STRIPE_API_VERSION = '2026-07-29.dahlia';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

function getStripeClient() {
  return new Stripe(requiredEnv('STRIPE_SECRET_KEY'), { apiVersion: STRIPE_API_VERSION });
}

function supabaseHeaders(prefer) {
  const serviceRole = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  return {
    apikey: serviceRole,
    Authorization: `Bearer ${serviceRole}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function supabaseRequest(path, options = {}) {
  const baseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...supabaseHeaders(options.prefer),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch (_) { data = text; }
  }

  if (!response.ok) {
    const error = new Error(`Supabase respondeu ${response.status}`);
    error.details = data;
    throw error;
  }

  return data;
}

function getShippingDetails(session) {
  return session.shipping_details || session.collected_information?.shipping_details || null;
}

async function persistOrder(stripe, session) {
  if (session.metadata?.store !== 'belissima') return;

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ['data.price.product'],
  });

  const customer = session.customer_details || {};
  const shipping = getShippingDetails(session);
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id || null;

  const orderPayload = {
    stripe_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId,
    customer_email: customer.email || null,
    customer_name: customer.name || null,
    customer_phone: customer.phone || null,
    amount_total: session.amount_total || 0,
    currency: session.currency || 'brl',
    checkout_status: session.status || null,
    payment_status: session.payment_status || 'unpaid',
    fulfillment_status: 'pending',
    shipping_address: shipping || customer.address || null,
    stripe_created_at: session.created ? new Date(session.created * 1000).toISOString() : null,
  };

  const orders = await supabaseRequest('orders?on_conflict=stripe_session_id', {
    method: 'POST',
    body: JSON.stringify(orderPayload),
    prefer: 'resolution=merge-duplicates,return=representation',
  });

  const order = Array.isArray(orders) ? orders[0] : null;
  if (!order?.id) throw new Error('Supabase não retornou o pedido persistido.');

  await supabaseRequest(`order_items?order_id=eq.${encodeURIComponent(order.id)}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  });

  const items = lineItems.data.map((lineItem) => {
    const product = lineItem.price?.product;
    const productObject = product && typeof product === 'object' ? product : null;
    const metadata = productObject?.metadata || {};

    return {
      order_id: order.id,
      catalog_id: metadata.catalog_id || null,
      product_name: lineItem.description || productObject?.name || 'Produto Belíssima',
      size: metadata.size || null,
      color: metadata.color || null,
      quantity: lineItem.quantity || 1,
      unit_amount: lineItem.price?.unit_amount || 0,
      currency: lineItem.currency || session.currency || 'brl',
    };
  });

  if (items.length) {
    await supabaseRequest('order_items', {
      method: 'POST',
      body: JSON.stringify(items),
      prefer: 'return=minimal',
    });
  }
}

async function updateOrderPaymentState(session) {
  if (session.metadata?.store !== 'belissima') return;

  await supabaseRequest(`orders?stripe_session_id=eq.${encodeURIComponent(session.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      checkout_status: session.status || null,
      payment_status: session.payment_status || 'unpaid',
    }),
    prefer: 'return=minimal',
  });
}

async function handleRequest(request) {
  if (request.method !== 'POST') {
    return new Response('Método não permitido.', {
      status: 405,
      headers: { Allow: 'POST' },
    });
  }

  let stripe;
  let webhookSecret;

  try {
    stripe = getStripeClient();
    webhookSecret = requiredEnv('STRIPE_WEBHOOK_SECRET');
    requiredEnv('SUPABASE_URL');
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  } catch (error) {
    console.error('[Belíssima/Stripe] Webhook sem configuração completa', { message: error.message });
    return new Response('Webhook não configurado.', { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('Assinatura ausente.', { status: 400 });

  const rawBody = await request.text();
  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('[Belíssima/Stripe] Assinatura de webhook inválida', { message: error.message });
    return new Response('Assinatura inválida.', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await persistOrder(stripe, event.data.object);
        break;
      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired':
        await updateOrderPaymentState(event.data.object);
        break;
      default:
        break;
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('[Belíssima/Stripe] Falha ao processar webhook', {
      eventType: event.type,
      eventId: event.id,
      message: error.message,
      details: error.details,
    });
    return new Response('Falha ao processar webhook.', { status: 500 });
  }
}

export default { fetch: handleRequest };
