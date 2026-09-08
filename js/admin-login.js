(function () {
  const form = document.getElementById('admin-login-form');
  const message = document.getElementById('admin-login-message');
  const googleButton = document.getElementById('admin-google-login');
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  function showMessage(text, type = 'error') {
    message.textContent = text;
    message.className = `admin-form-message ${type}`;
    message.hidden = !text;
  }

  async function isAdmin(userId) {
    const { data, error } = await client.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }

  async function redirectIfAuthorized(session) {
    if (!session?.user) return false;
    if (await isAdmin(session.user.id)) {
      window.location.replace('admin.html');
      return true;
    }
    return false;
  }

  if (new URLSearchParams(window.location.search).get('erro') === 'sem-acesso') {
    showMessage('Esta conta não possui acesso administrativo.');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showMessage('');
    const button = form.querySelector('[type="submit"]');
    const email = form.email.value.trim();
    const password = form.password.value;
    if (!email || !password) return showMessage('Preencha seu e-mail e sua senha.');

    button.disabled = true;
    button.textContent = 'VERIFICANDO…';
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!await redirectIfAuthorized(data.session)) {
        await client.auth.signOut();
        showMessage('Esta conta não possui acesso administrativo.');
      }
    } catch (error) {
      const invalid = String(error?.message || '').toLowerCase().includes('invalid login');
      showMessage(invalid ? 'E-mail ou senha incorretos.' : 'Não foi possível verificar o acesso. Tente novamente.');
    } finally {
      button.disabled = false;
      button.textContent = 'ENTRAR NO PAINEL';
    }
  });

  googleButton.addEventListener('click', async () => {
    googleButton.disabled = true;
    showMessage('Abrindo o acesso com Google…', 'success');
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/admin.html` },
    });
    if (error) {
      showMessage('Não foi possível abrir o Google. Tente novamente.');
      googleButton.disabled = false;
    }
  });

  (async () => {
    try {
      const { data } = await client.auth.getSession();
      await redirectIfAuthorized(data.session);
      if (new URLSearchParams(window.location.search).get('erro') === 'sem-acesso') {
        showMessage('Esta conta não possui acesso administrativo.');
      }
    } catch (_) {
      // O formulário permanece disponível para uma nova tentativa.
    }
  })();
})();
