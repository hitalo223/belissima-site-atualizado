const { calculateShipping, ShippingError, isShippingEnabled } = require('../lib/shipping');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }
  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  if (!isShippingEnabled()) return res.status(503).json({ error: 'O cálculo de frete ainda está sendo configurado.', code: 'shipping_not_configured' });
  try {
    const quote = await calculateShipping({ postalCode: body.postalCode, items: body.items });
    return res.status(200).json({
      provider: quote.provider,
      environment: quote.environment,
      destinationPostalCode: quote.destinationPostalCode,
      subtotalCents: quote.subtotalCents,
      freeShippingThresholdCents: quote.freeShippingThresholdCents,
      options: quote.options,
    });
  } catch (error) {
    const known = error instanceof ShippingError;
    console.error('[Belíssima/Frete] Falha na cotação', { code: error.code, missingConfiguration: error.missingConfiguration, message: error.message });
    return res.status(known ? error.status : 500).json({
      error: known ? error.message : 'Não foi possível calcular o frete agora.',
      code: known ? error.code : 'shipping_error',
    });
  }
};
