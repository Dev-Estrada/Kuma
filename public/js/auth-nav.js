(function () {
  const user = window.getAuthUser && window.getAuthUser();
  const el = document.getElementById('nav-auth');
  if (!el || !user) return;
  if (user.role === 'admin') {
    const a = document.createElement('a');
    a.href = 'admin.html';
    a.className = 'topbar__link';
    a.textContent = 'Administración';
    el.appendChild(a);
  }
  const out = document.createElement('a');
  out.href = '#';
  out.className = 'topbar__link';
  out.textContent = 'Cerrar sesión (' + (user.displayName || user.username) + ')';
  out.onclick = function (e) {
    e.preventDefault();
    window.logout();
  };
  el.appendChild(out);
})();
