const { baseUrl, createState } = require('../lib/shipping-oauth');

module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido.' });
  }
  try {
    const url = new URL('/oauth/authorize', baseUrl());
    url.searchParams.set('client_id', process.env.MELHOR_ENVIO_CLIENT_ID || '');
    url.searchParams.set('redirect_uri', process.env.MELHOR_ENVIO_REDIRECT_URI || '');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('state', createState());
    url.searchParams.set('scope', 'shipping-calculate');
    return res.redirect(302, url.toString());
  } catch (error) {
    console.error('[Belíssima/Frete] Autorização não configurada', { message: error.message });
    return res.status(503).send('Integração ainda não configurada.');
  }
};
