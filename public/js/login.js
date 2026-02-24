(function () {
  const form = document.getElementById('login-form');
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('btn-login');

  if (!form || !usernameInput || !passwordInput || !errorEl || !btn) return;

  function showError(msg) {
    errorEl.textContent = msg || '';
    errorEl.style.display = msg ? 'block' : 'none';
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    e.stopPropagation();
    const username = (usernameInput.value || '').trim();
    const password = passwordInput.value || '';
    showError('');
    if (!username || !password) {
      showError('Usuario y contraseña son obligatorios.');
      return;
    }
    btn.disabled = true;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showError(data.error || 'Error al iniciar sesión.');
        btn.disabled = false;
        return;
      }
      if (!data.token || !data.user) {
        showError('Error al iniciar sesión. Respuesta inválida.');
        btn.disabled = false;
        return;
      }
      localStorage.setItem('kuma_token', data.token);
      localStorage.setItem('kuma_user', JSON.stringify(data.user));
      var redirect = new URLSearchParams(window.location.search).get('redirect') || '';
      if (!redirect || redirect === '/' || redirect === 'login.html' || redirect.endsWith('/login')) {
        redirect = 'index.html';
      }
      window.location.replace(redirect);
    } catch {
      showError('Error de conexión.');
      btn.disabled = false;
    }
  });
})();
