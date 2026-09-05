// Revela elementos com classe .reveal (fade-in + leve subida) assim que
// entram na área visível da tela, conforme o usuário rola a página.
// Cada elemento anima uma única vez (unobserve após revelar), por performance.

document.addEventListener('DOMContentLoaded', () => {
  const items = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window)) {
    // Fallback: navegadores muito antigos só mostram tudo direto, sem animação.
    items.forEach((item) => item.classList.add('revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  items.forEach((item) => observer.observe(item));
});
