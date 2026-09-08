const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ShippingError,
  normalizePostalCode,
  buildShipment,
  normalizeProviderOptions,
} = require('../lib/shipping');

test('normaliza CEP brasileiro e rejeita valor incompleto', () => {
  assert.equal(normalizePostalCode('01001-000'), '01001000');
  assert.throws(() => normalizePostalCode('0100'), (error) => error instanceof ShippingError && error.code === 'invalid_postal_code');
});

test('monta a cotação com preço e logística do catálogo', () => {
  const items = [{ id: 'produto-real', quantity: 2 }];
  const products = [{ id: 'produto-real', name: 'Produto real', active: true, stock_quantity: 50, price_cents: 9999, weight_kg: 0.25, height_cm: 5, width_cm: 20, length_cm: 25 }];
  const shipment = buildShipment(items, products);
  assert.equal(shipment.subtotalCents, 19998);
  assert.deepEqual(shipment.shipmentProducts[0], { id: 'produto-real', width: 20, height: 5, length: 25, weight: 0.25, insurance_value: 99.99, quantity: 2 });
});

test('bloqueia produto sem medidas em vez de inventar frete', () => {
  const products = [{ id: 'produto', name: 'Produto', active: true, stock_quantity: 1, price_cents: 1000, weight_kg: null, height_cm: null, width_cm: null, length_cm: null }];
  assert.throws(() => buildShipment([{ id: 'produto', quantity: 1 }], products), (error) => error.code === 'product_logistics_missing');
});

test('frete grátis começa exatamente em R$ 199 e subsidia o econômico', () => {
  process.env.FREE_SHIPPING_THRESHOLD_CENTS = '19900';
  const provider = [
    { id: 2, name: 'SEDEX', custom_price: '32.50', custom_delivery_time: 2, company: { name: 'Correios' } },
    { id: 1, name: 'PAC', custom_price: '18.00', custom_delivery_time: 6, company: { name: 'Correios' } },
  ];
  const below = normalizeProviderOptions(provider, 19899, 1000);
  const exact = normalizeProviderOptions(provider, 19900, 1000);
  const above = normalizeProviderOptions(provider, 19901, 1000);
  assert.equal(below[0].chargedCents, 1800);
  assert.equal(exact[0].chargedCents, 0);
  assert.equal(exact[1].chargedCents, 1450);
  assert.equal(above[0].chargedCents, 0);
});

test('ignora serviços que retornaram erro e usa preço e prazo customizados', () => {
  const options = normalizeProviderOptions([
    { id: 1, name: 'PAC', custom_price: '21.43', price: '99.00', custom_delivery_time: 7, delivery_time: 20, company: { name: 'Correios' } },
    { id: 2, name: 'SEDEX', error: 'indisponível' },
  ], 10000, 1000);
  assert.equal(options.length, 1);
  assert.equal(options[0].costCents, 2143);
  assert.equal(options[0].deliveryDays, 7);
});
