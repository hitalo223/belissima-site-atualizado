(function () {
  function waitForClient() {
    if (window.BelissimaAuth?.client) return Promise.resolve(window.BelissimaAuth.client);
    return new Promise((resolve) => {
      const timeout = window.setTimeout(() => resolve(window.BelissimaAuth?.client || null), 4500);
      window.addEventListener('belissima:auth-ready', () => {
        window.clearTimeout(timeout);
        resolve(window.BelissimaAuth?.client || null);
      }, { once: true });
    });
  }

  function createMedia(current, item) {
    const next = document.createElement(item.media_type === 'video' ? 'video' : 'img');
    next.className = current.className;
    next.dataset.mediaSlot = item.slot_key;

    if (item.media_type === 'video') {
      next.src = item.media_url;
      next.autoplay = true;
      next.muted = true;
      next.defaultMuted = true;
      next.loop = true;
      next.playsInline = true;
      next.preload = 'metadata';
      next.setAttribute('aria-label', item.label || 'Vídeo Belíssima');
    } else {
      next.src = item.media_url;
      next.alt = current.getAttribute('alt') || item.label || 'Imagem Belíssima';
      next.loading = 'lazy';
    }
    return next;
  }

  async function applySiteMedia() {
    const targets = [...document.querySelectorAll('[data-media-slot]')];
    if (!targets.length) return;
    const client = await waitForClient();
    if (!client) return;
    const { data, error } = await client.from('site_media').select('slot_key,label,media_type,media_url').eq('active', true);
    if (error) {
      console.warn('[Belíssima/Mídia] Usando mídias padrão.', error.message);
      return;
    }
    const bySlot = new Map((data || []).filter((item) => item.media_url).map((item) => [item.slot_key, item]));
    targets.forEach((target) => {
      const item = bySlot.get(target.dataset.mediaSlot);
      if (!item) return;
      const replacement = createMedia(target, item);
      target.replaceWith(replacement);
      if (replacement.tagName === 'VIDEO') replacement.play().catch(() => {});
    });
  }

  document.addEventListener('DOMContentLoaded', applySiteMedia);
})();
