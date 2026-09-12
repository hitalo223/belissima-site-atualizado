(function setupBelissimaSupport() {
  const config = {
    phone: '5516994219264',
    message: 'Olá! 💗 Vim pelo site da Belíssima e gostaria de ajuda com uma dúvida.'
  };

  const whatsappUrl = `https://wa.me/${config.phone}?text=${encodeURIComponent(config.message)}`;

  document.querySelectorAll('[data-whatsapp-link]').forEach((link) => {
    link.href = whatsappUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });

  if (document.querySelector('.whatsapp-support')) return;

  const support = document.createElement('a');
  support.className = 'whatsapp-support';
  support.href = whatsappUrl;
  support.target = '_blank';
  support.rel = 'noopener noreferrer';
  support.setAttribute('aria-label', 'Falar com a Belíssima pelo WhatsApp');
  support.innerHTML = `
    <span class="whatsapp-support-label" aria-hidden="true">Fale conosco</span>
    <span class="whatsapp-support-icon" aria-hidden="true">
      <svg viewBox="0 0 32 32" focusable="false">
        <path fill="currentColor" d="M16.04 3.2A12.8 12.8 0 0 0 5.15 22.72L3.2 28.8l6.27-1.87A12.8 12.8 0 1 0 16.04 3.2Zm0 23.26c-2.08 0-4.12-.62-5.84-1.78l-.42-.28-3.72 1.11 1.18-3.62-.3-.45a10.46 10.46 0 1 1 9.1 5.02Zm5.74-7.84c-.31-.16-1.86-.92-2.15-1.02-.29-.11-.5-.16-.71.16-.21.31-.81 1.02-.99 1.23-.18.21-.37.24-.68.08-.31-.16-1.33-.49-2.53-1.56a9.48 9.48 0 0 1-1.75-2.18c-.18-.31-.02-.48.14-.64.14-.14.31-.37.47-.55.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.55-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.54-.71-.55h-.6c-.21 0-.55.08-.84.39-.29.31-1.1 1.08-1.1 2.63s1.13 3.05 1.29 3.26c.16.21 2.22 3.39 5.38 4.75.75.32 1.34.52 1.8.66.76.24 1.44.21 1.99.13.61-.09 1.86-.76 2.13-1.5.26-.73.26-1.36.18-1.49-.08-.13-.29-.21-.6-.37Z"/>
      </svg>
    </span>`;
  document.body.appendChild(support);
})();
