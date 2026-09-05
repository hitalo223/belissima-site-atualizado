// Vercel Function: consulta somente o estado necessário da Checkout Session usada na página de retorno.

const Stripe = require('stripe');

const STRIPE_API_VERSION = '2026-07-29.dahlia';

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: STRIPE_API_VERSION });
}

function getSessionId(req) {
  const fromQuery = Array.isArray(req.query?.session_id) ? req.query.session_id[0] : req.query?.session_id;
  if (fromQuery) return String(fromQuery);

  try {
    const url = new URL(req.url, 'https://belissima.local');
    return url.searchParams.get('session_id') || '';
  } catch (_) {
    return '';
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return res.status(503).json({ error: 'Checkout ainda não configurado.' });
  }

  const sessionId = getSessionId(req);
  if (!sessionId || !sessionId.startsWith('cs_') || sessionId.length > 255) {
    return res.status(400).json({ error: 'Sessão inválida.' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.store !== 'belissima') {
      return res.status(404).json({ error: 'Sessão não encontrada.' });
    }

    return res.status(200).json({
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
    });
  } catch (error) {
    console.error('[Belíssima/Stripe] Falha ao consultar Checkout Session', {
      type: error?.type,
      code: error?.code,
      requestId: error?.requestId,
    });
    return res.status(404).json({ error: 'Não foi possível validar esta sessão.' });
  }
};
