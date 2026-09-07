(function () {
  const shell = document.getElementById('auth-shell');
  if (!shell) return;

  const loginPanel = shell.querySelector('.auth-login-panel');
  const signupPanel = shell.querySelector('.auth-signup-panel');
  const newCustomerCopy = shell.querySelector('.auth-visual-new');
  const memberCopy = shell.querySelector('.auth-visual-member');

  function setMode(mode, updateHistory) {
    const signup = mode === 'signup';

    shell.classList.toggle('is-signup', signup);
    document.body.dataset.authMode = signup ? 'signup' : 'login';
    loginPanel.setAttribute('aria-hidden', String(signup));
    signupPanel.setAttribute('aria-hidden', String(!signup));
    newCustomerCopy.setAttribute('aria-hidden', String(signup));
    memberCopy.setAttribute('aria-hidden', String(!signup));
    loginPanel.inert = signup;
    signupPanel.inert = !signup;

    document.title = signup
      ? 'Criar conta — Belíssima Moda Íntima'
      : 'Entrar — Belíssima Moda Íntima';

    if (updateHistory) {
      const nextPage = signup ? 'cadastro.html' : 'login.html';
      window.history.pushState({ authMode: mode }, '', new URL(nextPage, window.location.href));
    }
  }

  shell.querySelectorAll('[data-auth-target]').forEach((control) => {
    control.addEventListener('click', (event) => {
      if (window.matchMedia('(max-width: 820px)').matches) return;
      event.preventDefault();
      setMode(control.dataset.authTarget, true);
    });
  });

  window.addEventListener('popstate', () => {
    setMode(window.location.pathname.endsWith('cadastro.html') ? 'signup' : 'login', false);
  });

  setMode(document.body.dataset.authMode === 'signup' ? 'signup' : 'login', false);
})();
