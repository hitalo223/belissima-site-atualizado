// Autenticação da Belíssima com Supabase Auth.
(function () {
  const LOGIN_PAGE = 'login.html';
  const STORE_PAGE = 'loja.html';
  const currentPage = window.location.pathname.split('/').pop() || '';

  function getPageMessage() {
    return document.getElementById('login-message') || document.getElementById('cadastro-message');
  }

  function showMessage(el, texto, tipo) {
    if (!el) return;
    el.textContent = texto;
    el.className = 'auth-message ' + (tipo || '');
    el.hidden = !texto;
    el.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    el.setAttribute('aria-live', tipo === 'error' ? 'assertive' : 'polite');
    el.style.padding = texto ? '12px 14px' : '0';
    el.style.border = texto
      ? `1px solid ${tipo === 'error' ? 'rgba(194, 47, 79, 0.24)' : 'rgba(92, 125, 95, 0.28)'}`
      : '0';
    el.style.background = texto
      ? (tipo === 'error' ? 'rgba(194, 47, 79, 0.06)' : 'rgba(92, 125, 95, 0.08)')
      : 'transparent';
  }

  function showSetupError(texto) {
    document.addEventListener('DOMContentLoaded', () => {
      showMessage(getPageMessage(), texto, 'error');
    });
  }

  if (typeof window.supabase === 'undefined') {
    console.warn('[Belíssima] SDK do Supabase não carregou.');
    showSetupError('Não foi possível carregar o acesso à conta. Atualize a página e tente novamente.');
    return;
  }

  if (
    typeof SUPABASE_URL === 'undefined' ||
    typeof SUPABASE_ANON_KEY === 'undefined' ||
    SUPABASE_URL.startsWith('COLE_AQUI') ||
    SUPABASE_ANON_KEY.startsWith('COLE_AQUI')
  ) {
    console.warn('[Belíssima] Configure js/supabase-config.js para ativar login e cadastro.');
    showSetupError('O acesso à conta está temporariamente indisponível. Tente novamente mais tarde.');
    return;
  }

  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  let redirectScheduled = false;
  let formSubmissionInProgress = false;

  function traduzErro(msg) {
    const normalized = String(msg || '').toLowerCase();
    const dict = {
      'Invalid login credentials': 'E-mail ou senha incorretos.',
      'User already registered': 'Esse e-mail já está cadastrado. Tente entrar.',
      'Email not confirmed': 'Confirme seu e-mail antes de entrar — veja sua caixa de entrada e a pasta de spam.',
      'Password should be at least 6 characters': 'A senha precisa ter pelo menos 6 caracteres.',
      'Unable to validate email address: invalid format': 'Esse e-mail não parece válido.',
      'Signup is disabled': 'Novos cadastros estão temporariamente desativados.',
      'Email rate limit exceeded': 'Muitas tentativas foram feitas. Aguarde alguns minutos e tente novamente.',
      'Request rate limit reached': 'Muitas tentativas foram feitas. Aguarde alguns minutos e tente novamente.',
      'Failed to fetch': 'Falha de conexão. Verifique sua internet e tente novamente.',
    };

    if (dict[msg]) return dict[msg];
    if (normalized.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (normalized.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar — veja sua caixa de entrada e a pasta de spam.';
    if (normalized.includes('email') && normalized.includes('invalid')) return 'Esse e-mail não parece válido.';
    if (normalized.includes('email rate limit') || normalized.includes('over_email_send_rate_limit')) {
      return 'O limite temporário de envio de e-mails foi atingido. Aguarde alguns minutos e tente novamente.';
    }
    if (normalized.includes('rate limit')) return 'Muitas tentativas foram feitas. Aguarde alguns minutos e tente novamente.';
    if (normalized.includes('security purposes')) return 'Aguarde alguns segundos antes de tentar novamente.';
    return 'Não foi possível concluir a operação. Tente novamente.';
  }

  function setLoading(botao, carregando, textoNormal) {
    if (!botao) return;
    botao.disabled = carregando;
    botao.textContent = carregando ? 'UM MOMENTO…' : textoNormal;
  }

  function scheduleStoreRedirect(messageEl, texto) {
    if (redirectScheduled) return;
    redirectScheduled = true;
    showMessage(messageEl, texto, 'success');
    window.setTimeout(() => window.location.replace(STORE_PAGE), 1200);
  }

  function setupAccountIcon(session) {
    const link = document.getElementById('account-link');
    if (!link) return;

    let dropdown = document.getElementById('account-dropdown');

    if (session) {
      const email = session.user.email || '';
      const meta = session.user.user_metadata || {};
      const nome = (meta.nome || meta.full_name || email.split('@')[0] || 'Cliente').trim();

      link.textContent = nome.charAt(0).toUpperCase();
      link.classList.add('account-icon', 'logged-in');
      link.setAttribute('href', '#');
      link.setAttribute('aria-label', `Conta de ${nome}`);

      if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'account-dropdown';
        dropdown.className = 'account-dropdown';

        const nameEl = document.createElement('div');
        nameEl.className = 'account-dropdown-name';
        nameEl.textContent = `Olá, ${nome}`;

        const emailEl = document.createElement('div');
        emailEl.className = 'account-dropdown-email';
        emailEl.textContent = email;

        const logoutBtn = document.createElement('button');
        logoutBtn.type = 'button';
        logoutBtn.className = 'account-dropdown-logout';
        logoutBtn.textContent = 'Sair';
        logoutBtn.addEventListener('click', async () => {
          await supabaseClient.auth.signOut();
          window.location.href = STORE_PAGE;
        });

        dropdown.append(nameEl, emailEl, logoutBtn);
        const container = link.parentElement;
        container.style.position = 'relative';
        container.appendChild(dropdown);
      }

      link.onclick = (event) => {
        event.preventDefault();
        dropdown.classList.toggle('open');
      };
    } else {
      link.textContent = '👤';
      link.classList.add('account-icon');
      link.classList.remove('logged-in');
      link.setAttribute('href', LOGIN_PAGE);
      link.removeAttribute('aria-label');
      link.onclick = null;
      if (dropdown) dropdown.remove();
    }
  }

  document.addEventListener('click', (event) => {
    const dropdown = document.getElementById('account-dropdown');
    const link = document.getElementById('account-link');
    if (dropdown && dropdown.classList.contains('open') && !dropdown.contains(event.target) && event.target !== link) {
      dropdown.classList.remove('open');
    }
  });

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    const msgEl = document.getElementById('login-message');
    const btn = loginForm.querySelector('.auth-submit');

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      showMessage(msgEl, '', '');

      const email = loginForm.email.value.trim();
      const password = loginForm.password.value;
      if (!email || !password) {
        showMessage(msgEl, 'Preencha seu e-mail e sua senha.', 'error');
        return;
      }

      formSubmissionInProgress = true;
      setLoading(btn, true, 'ENTRAR');

      try {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
          showMessage(msgEl, traduzErro(error.message), 'error');
          return;
        }
        scheduleStoreRedirect(msgEl, 'Login realizado com sucesso! Redirecionando para a loja…');
      } catch (error) {
        console.error('[Belíssima/Auth] Falha no login', error);
        showMessage(msgEl, 'Falha de conexão. Verifique sua internet e tente novamente.', 'error');
      } finally {
        formSubmissionInProgress = false;
        if (!redirectScheduled) setLoading(btn, false, 'ENTRAR');
      }
    });
  }

  const forgotLink = document.getElementById('forgot-link');
  if (forgotLink) {
    forgotLink.addEventListener('click', async (event) => {
      event.preventDefault();
      const email = window.prompt('Digite o e-mail da sua conta para receber o link de redefinição de senha:');
      if (!email) return;

      const { error } = await supabaseClient.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/${LOGIN_PAGE}?redefinir=1`,
      });

      if (error) {
        window.alert('Não foi possível enviar o e-mail: ' + traduzErro(error.message));
      } else {
        window.alert('Se esse e-mail estiver cadastrado, você receberá um link para redefinir a senha.');
      }
    });
  }

  const cadastroForm = document.getElementById('cadastro-form');
  if (cadastroForm) {
    const msgEl = document.getElementById('cadastro-message');
    const btn = cadastroForm.querySelector('.auth-submit');

    cadastroForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      showMessage(msgEl, '', '');

      const nome = cadastroForm.nome.value.trim();
      const email = cadastroForm.email.value.trim();
      const password = cadastroForm.password.value;
      const confirmar = cadastroForm.confirmar.value;

      if (!nome || !email || !password || !confirmar) {
        showMessage(msgEl, 'Preencha todos os campos.', 'error');
        return;
      }
      if (password !== confirmar) {
        showMessage(msgEl, 'As senhas não conferem.', 'error');
        return;
      }
      if (password.length < 6) {
        showMessage(msgEl, 'A senha precisa ter pelo menos 6 caracteres.', 'error');
        return;
      }

      formSubmissionInProgress = true;
      setLoading(btn, true, 'CRIAR CONTA');

      try {
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: { nome },
            emailRedirectTo: `${window.location.origin}/${LOGIN_PAGE}?cadastro=confirmado`,
          },
        });

        if (error) {
          showMessage(msgEl, traduzErro(error.message), 'error');
          return;
        }

        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          showMessage(msgEl, 'Esse e-mail já está cadastrado. Tente entrar ou recupere sua senha.', 'error');
          return;
        }

        cadastroForm.reset();
        if (data.session) {
          scheduleStoreRedirect(msgEl, 'Cadastro realizado com sucesso! Sua conta já está conectada. Redirecionando…');
        } else {
          showMessage(
            msgEl,
            'Cadastro realizado com sucesso! Enviamos um e-mail de confirmação. Abra o link recebido para ativar sua conta.',
            'success'
          );
        }
      } catch (error) {
        console.error('[Belíssima/Auth] Falha no cadastro', error);
        showMessage(msgEl, 'Falha de conexão. Verifique sua internet e tente novamente.', 'error');
      } finally {
        formSubmissionInProgress = false;
        if (!redirectScheduled) setLoading(btn, false, 'CRIAR CONTA');
      }
    });
  }

  document.querySelectorAll('#google-login-btn, #google-cadastro-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const msgEl = getPageMessage();
      btn.disabled = true;
      showMessage(msgEl, 'Abrindo o acesso com Google…', 'success');

      try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/${STORE_PAGE}` },
        });
        if (error) {
          showMessage(msgEl, traduzErro(error.message), 'error');
          btn.disabled = false;
        }
      } catch (error) {
        console.error('[Belíssima/Auth] Falha no login com Google', error);
        showMessage(msgEl, 'Não foi possível abrir o login com Google. Tente novamente.', 'error');
        btn.disabled = false;
      }
    });
  });

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      if (error) throw error;
      setupAccountIcon(session);

      if (session && (currentPage === LOGIN_PAGE || currentPage === 'cadastro.html') && !formSubmissionInProgress) {
        const params = new URLSearchParams(window.location.search);
        const texto = params.get('cadastro') === 'confirmado'
          ? 'E-mail confirmado com sucesso! Sua conta está ativa. Redirecionando para a loja…'
          : 'Você já está conectada. Redirecionando para a loja…';
        scheduleStoreRedirect(getPageMessage(), texto);
      }

      supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
        setupAccountIcon(nextSession);
      });
    } catch (error) {
      console.error('[Belíssima/Auth] Falha ao restaurar a sessão', error);
      showMessage(getPageMessage(), 'Não foi possível verificar sua sessão. Atualize a página e tente novamente.', 'error');
    }
  });
})();
