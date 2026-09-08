const { exchangeAuthorizationCode, verifyState } = require('../lib/shipping-oauth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Método não permitido.');
  }
  const code = Array.isArray(req.query?.code) ? req.query.code[0] : req.query?.code;
  const state = Array.isArray(req.query?.state) ? req.query.state[0] : req.query?.state;
  try {
    if (!code || !verifyState(state)) return res.status(400).send('Autorização inválida ou expirada.');
    await exchangeAuthorizationCode(String(code));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Frete autorizado</title><body style="font-family:system-ui;padding:48px;background:#f6eee8;color:#604c43"><h1>Melhor Envio conectado</h1><p>A autorização de teste foi salva com segurança. Você já pode fechar esta página.</p></body></html>');
  } catch (error) {
    console.error('[Belíssima/Frete] Callback de autorização falhou', { message: error.message });
    return res.status(502).send('Não foi possível concluir a autorização.');
  }
};
