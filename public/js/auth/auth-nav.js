(function () {
  const user = window.getAuthUser && window.getAuthUser();
  const el = document.getElementById('nav-auth');
  const welcomeEl = document.getElementById('topbar-welcome');
  if (welcomeEl && user) {
    welcomeEl.textContent = 'Bienvenido/a, ' + (user.displayName || user.username);
  }
  if (!el || !user) return;
  if (user.role === 'admin') {
    const a = document.createElement('a');
    a.href = '/pages/admin.html';
    a.className = 'topbar__link';
    a.textContent = 'Administración';
    el.appendChild(a);
  }
  const out = document.createElement('a');
  out.href = '#';
  out.className = 'topbar__link topbar__link--logout';
  out.textContent = 'Cerrar sesión';
  out.onclick = function (e) {
    e.preventDefault();
    window.logout();
  };
  el.appendChild(out);
})();
