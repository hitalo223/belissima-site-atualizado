const test = require('node:test');
const assert = require('node:assert/strict');
const { createState, verifyState } = require('../lib/shipping-oauth');

test('estado OAuth é assinado e alterações são rejeitadas', () => {
  process.env.SHIPPING_OAUTH_STATE_SECRET = 'segredo-de-teste-comprido';
  const state = createState();
  assert.equal(verifyState(state), true);
  assert.equal(verifyState(`${state}alterado`), false);
  assert.equal(verifyState('invalido'), false);
});
