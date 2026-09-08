const { getFreeThresholdCents, isShippingEnabled } = require('../lib/shipping');

module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido.' });
  }
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  return res.status(200).json({ enabled: isShippingEnabled(), freeShippingThresholdCents: getFreeThresholdCents() });
};
