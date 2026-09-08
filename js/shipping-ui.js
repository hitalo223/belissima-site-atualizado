(function () {
  const FALLBACK_THRESHOLD_CENTS = 19900;
  let configPromise;

  function moneyFromCents(cents) {
    return (Number(cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatPostalCode(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
    return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
  }

  function normalizePostalCode(value) {
    return String(value || '').replace(/\D/g, '');
  }

  async function getConfig() {
    if (!configPromise) {
      configPromise = fetch('/api/shipping-config')
        .then((response) => response.ok ? response.json() : Promise.reject(new Error()))
        .catch(() => ({ freeShippingThresholdCents: FALLBACK_THRESHOLD_CENTS }));
    }
    return configPromise;
  }

  async function quote(postalCode, items) {
    const response = await fetch('/api/shipping-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postalCode: normalizePostalCode(postalCode), items }),
    });
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) {
      const error = new Error(data.error || 'Não foi possível calcular o frete agora.');
      error.code = data.code;
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function deliveryText(days) {
    return days ? `Chega em até ${days} dias úteis` : 'Prazo informado no checkout';
  }

  function optionPrice(option) {
    return option.free || option.chargedCents === 0 ? 'Grátis' : moneyFromCents(option.chargedCents);
  }

  async function updateCampaignCopy() {
    const config = await getConfig();
    document.querySelectorAll('[data-shipping-ui]').forEach((element) => { element.hidden = !config.enabled; });
    if (!config.enabled) return;
    const amount = moneyFromCents(config.freeShippingThresholdCents).replace(/,00$/, '');
    document.querySelectorAll('.announce').forEach((element) => {
      element.textContent = `Frete grátis para todo o Brasil em compras a partir de ${amount} · 10% OFF na primeira compra`;
    });
    document.querySelectorAll('[data-free-shipping-threshold]').forEach((element) => {
      element.textContent = amount;
    });
    window.dispatchEvent(new CustomEvent('belissima:shipping-config', { detail: config }));
  }

  document.addEventListener('input', (event) => {
    if (event.target.matches('[data-postal-code]')) event.target.value = formatPostalCode(event.target.value);
  });
  document.addEventListener('DOMContentLoaded', updateCampaignCopy);

  window.BelissimaShipping = {
    getConfig,
    quote,
    moneyFromCents,
    formatPostalCode,
    normalizePostalCode,
    deliveryText,
    optionPrice,
  };
})();
