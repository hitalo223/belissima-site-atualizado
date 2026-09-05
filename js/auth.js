// Motor de autenticação da Belíssima, usando Supabase Auth.
// Roda em TODAS as páginas: sincroniza o ícone de conta no header, e nas
// páginas login.html / cadastro.html também cuida dos formulários.
//
// Se js/supabase-config.js ainda não foi preenchido com as chaves reais,
// este script avisa no console e não quebra o resto do site.

(function () {
  if (typeof window.supabase === 'undefined') {
    console.warn('[Belíssima] SDK do Supabase não carregou. Confira o <script> do CDN.');
    return;
  }

  if (
    typeof SUPABASE_URL === 'undefined' ||
    typeof SUPABASE_ANON_KEY === 'undefined' ||
    SUPABASE_URL.startsWith('COLE_AQUI') ||
    SUPABASE_ANON_KEY.startsWith('COLE_AQUI')
  ) {
    console.warn('[Belíssima] Configure js/supabase-config.js com as chaves do seu projeto Supabase para ativar login/cadastro.');
    return;
  }

  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Dicionário simples de tradução dos erros mais comuns do Supabase
  function traduzErro(msg) {
    const dict = {
      'Invalid login credentials': 'E-mail ou senha incorretos.',
      'User already registered': 'Esse e-mail já está cadastrado. Tente entrar.',
      'Email not confirmed': 'Confirme seu e-mail antes de entrar — veja sua caixa de entrada.',
      'Password should be at least 6 characters': 'A senha precisa ter pelo menos 6 caracteres.',
      'Unable to validate email address: invalid format': 'Esse e-mail não parece válido.',
    };
    return dict[msg] || msg;
  }

  // ---------------------------------------------------------------
  // Ícone de conta no header (👤 → login.html, ou avatar quando logada)
  // ---------------------------------------------------------------
  function setupAccountIcon(session) {
    const link = document.getElementById('account-link');
    if (!link) return;

    let dropdown = document.getElementById('account-dropdown');

    if (session) {
      const email = session.user.email || '';
      const meta = session.user.user_metadata || {};
      const nome = (meta.nome || meta.full_name || email.split('@')[0] || 'Cliente').trim();
      const inicial = nome.charAt(0).toUpperCase();

      link.textContent = inicial;
      link.classList.add('account-icon', 'logged-in');
      link.setAttribute('href', '#');
      link.setAttribute('aria-label', `Conta de ${nome}`);

      if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'account-dropdown';
        dropdown.className = 'account-dropdown';
        dropdown.innerHTML =
          '<div class="account-dropdown-name">Olá, ' + nome + '</div>' +
          '<div class="account-dropdown-email">' + email + '</div>' +
          '<button type="button" class="account-dropdown-logout" id="logout-btn">Sair</button>';

        const container = link.parentElement;
        container.style.position = 'relative';
        container.appendChild(dropdown);

        document.getElementById('logout-btn').addEventListener('click', async () => {
          await supabaseClient.auth.signOut();
          window.location.href = 'loja.html';
        });
      }

      link.onclick = (e) => {
        e.preventDefault();
        dropdown.classList.toggle('open');
      };

      document.addEventListener('click', (e) => {
        if (dropdown && dropdown.classList.contains('open') && !dropdown.contains(e.target) && e.target !== link) {
          dropdown.classList.remove('open');
        }
      });
    } else {
      link.textContent = '👤';
      link.classList.add('account-icon');
      link.classList.remove('logged-in');
      link.setAttribute('href', 'login.html');
      link.removeAttribute('aria-label');
      link.onclick = null;
      if (dropdown) dropdown.classList.remove('open');
    }
  }

  // ---------------------------------------------------------------
  // Helpers de UI usados nos formulários de login/cadastro
  // ---------------------------------------------------------------
  function showMessage(el, texto, tipo) {
    el.textContent = texto;
    el.className = 'auth-message ' + (tipo || '');
  }

  function setLoading(botao, carregando, textoNormal) {
    botao.disabled = carregando;
    botao.textContent = carregando ? 'UM MOMENTO…' : textoNormal;
  }

  // ---------------------------------------------------------------
  // Formulário de LOGIN (login.html)
  // ---------------------------------------------------------------
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    const msgEl = document.getElementById('login-message');
    const btn = loginForm.querySelector('.auth-submit');

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showMessage(msgEl, '', '');
      const email = loginForm.email.value.trim();
      const password = loginForm.password.value;

      setLoading(btn, true, 'ENTRAR');
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      setLoading(btn, false, 'ENTRAR');

      if (error) {
        showMessage(msgEl, traduzErro(error.message), 'error');
        return;
      }
      window.location.href = 'loja.html';
    });
  }

  const forgotLink = document.getElementById('forgot-link');
  if (forgotLink) {
    forgotLink.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = prompt('Digite o e-mail da sua conta para receber o link de redefinição de senha:');
      if (!email) return;
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + '/login.html',
      });
      if (error) {
        alert('Não foi possível enviar o e-mail: ' + traduzErro(error.message));
      } else {
        alert('Se esse e-mail estiver cadastrado, você vai receber um link para redefinir a senha.');
      }
    });
  }

  // ---------------------------------------------------------------
  // Formulário de CADASTRO (cadastro.html)
  // ---------------------------------------------------------------
  const cadastroForm = document.getElementById('cadastro-form');
  if (cadastroForm) {
    const msgEl = document.getElementById('cadastro-message');
    const btn = cadastroForm.querySelector('.auth-submit');

    cadastroForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showMessage(msgEl, '', '');

      const nome = cadastroForm.nome.value.trim();
      const email = cadastroForm.email.value.trim();
      const password = cadastroForm.password.value;
      const confirmar = cadastroForm.confirmar.value;

      if (password !== confirmar) {
        showMessage(msgEl, 'As senhas não conferem.', 'error');
        return;
      }
      if (password.length < 6) {
        showMessage(msgEl, 'A senha precisa ter pelo menos 6 caracteres.', 'error');
        return;
      }

      setLoading(btn, true, 'CRIAR CONTA');
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { nome } },
      });
      setLoading(btn, false, 'CRIAR CONTA');

      if (error) {
        showMessage(msgEl, traduzErro(error.message), 'error');
        return;
      }

      if (data.session) {
        window.location.href = 'loja.html';
      } else {
        showMessage(msgEl, 'Cadastro realizado! Verifique seu e-mail para confirmar a conta antes de entrar.', 'success');
        cadastroForm.reset();
      }
    });
  }

  // ---------------------------------------------------------------
  // Botão "Continuar com Google" (login.html e cadastro.html)
  // ---------------------------------------------------------------
  document.querySelectorAll('#google-login-btn, #google-cadastro-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/loja.html' },
      });
    });
  });

  // ---------------------------------------------------------------
  // Inicialização: pega a sessão atual e escuta mudanças (login/logout)
  // ---------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    setupAccountIcon(session);

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      setupAccountIcon(session);
    });
  });
})();
