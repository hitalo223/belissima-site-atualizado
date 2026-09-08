const crypto = require('node:crypto');

function environment() {
  return String(process.env.MELHOR_ENVIO_ENV || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox';
}

function baseUrl() {
  return (process.env.MELHOR_ENVIO_API_BASE_URL
    || (environment() === 'production' ? 'https://melhorenvio.com.br' : 'https://sandbox.melhorenvio.com.br')).replace(/\/$/, '');
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing configuration: ${name}`);
  return value;
}

function encryptionKey() {
  return crypto.createHash('sha256').update(required('SHIPPING_TOKEN_ENCRYPTION_KEY')).digest();
}

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

function decrypt(value) {
  const [version, iv, tag, encrypted] = String(value || '').split('.');
  if (version !== 'v1' || !iv || !tag || !encrypted) throw new Error('Invalid encrypted token');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8');
}

function supabaseHeaders(prefer) {
  const role = required('SUPABASE_SERVICE_ROLE_KEY');
  return {
    apikey: role,
    Authorization: `Bearer ${role}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${required('SUPABASE_URL').replace(/\/$/, '')}/rest/v1/${path}`, {
    ...options,
    headers: { ...supabaseHeaders(options.prefer), ...(options.headers || {}) },
  });
  const text = await response.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch (_) { data = text; } }
  if (!response.ok) throw new Error(`Token storage failed (${response.status})`);
  return data;
}

async function saveTokens(tokenResponse) {
  const expiresIn = Math.max(60, Number(tokenResponse.expires_in || 2592000));
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  await supabaseRequest('shipping_integrations?on_conflict=provider,environment', {
    method: 'POST',
    body: JSON.stringify({
      provider: 'melhor_envio',
      environment: environment(),
      access_token_encrypted: encrypt(tokenResponse.access_token),
      refresh_token_encrypted: encrypt(tokenResponse.refresh_token),
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }),
    prefer: 'resolution=merge-duplicates,return=minimal',
  });
  return expiresAt;
}

async function tokenRequest(parameters) {
  const response = await fetch(`${baseUrl()}/oauth/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': required('MELHOR_ENVIO_USER_AGENT'),
    },
    body: new URLSearchParams(parameters),
  });
  let data = null;
  try { data = await response.json(); } catch (_) {}
  if (!response.ok || !data?.access_token || !data?.refresh_token) {
    console.error('[Belíssima/Frete] Falha ao renovar autorização', { status: response.status, error: data?.error });
    throw new Error('Melhor Envio authorization failed');
  }
  await saveTokens(data);
  return data.access_token;
}

async function exchangeAuthorizationCode(code) {
  return tokenRequest({
    grant_type: 'authorization_code',
    client_id: required('MELHOR_ENVIO_CLIENT_ID'),
    client_secret: required('MELHOR_ENVIO_CLIENT_SECRET'),
    redirect_uri: required('MELHOR_ENVIO_REDIRECT_URI'),
    code,
  });
}

async function getStoredAuthorization() {
  const rows = await supabaseRequest(`shipping_integrations?select=access_token_encrypted,refresh_token_encrypted,expires_at&provider=eq.melhor_envio&environment=eq.${environment()}&limit=1`);
  return Array.isArray(rows) ? rows[0] : null;
}

async function getValidAccessToken() {
  if (process.env.MELHOR_ENVIO_ACCESS_TOKEN) return process.env.MELHOR_ENVIO_ACCESS_TOKEN;
  const stored = await getStoredAuthorization();
  if (!stored) throw new Error('Melhor Envio is not authorized');
  if (new Date(stored.expires_at).getTime() > Date.now() + 5 * 60 * 1000) {
    return decrypt(stored.access_token_encrypted);
  }
  return tokenRequest({
    grant_type: 'refresh_token',
    client_id: required('MELHOR_ENVIO_CLIENT_ID'),
    client_secret: required('MELHOR_ENVIO_CLIENT_SECRET'),
    refresh_token: decrypt(stored.refresh_token_encrypted),
  });
}

function createState() {
  const payload = `${Date.now()}.${crypto.randomBytes(16).toString('hex')}`;
  const signature = crypto.createHmac('sha256', required('SHIPPING_OAUTH_STATE_SECRET')).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyState(state) {
  const value = String(state || '');
  const parts = value.split('.');
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = crypto.createHmac('sha256', required('SHIPPING_OAUTH_STATE_SECRET')).update(payload).digest('base64url');
  const validSignature = parts[2].length === expected.length && crypto.timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expected));
  return validSignature && Date.now() - Number(parts[0]) < 15 * 60 * 1000;
}

module.exports = { environment, baseUrl, exchangeAuthorizationCode, getValidAccessToken, createState, verifyState };
