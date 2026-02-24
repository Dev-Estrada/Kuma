/**
 * Módulo de administración de usuarios. Solo accesible por rol admin.
 */
(function () {
  const API = '';

  // Solo administradores pueden estar aquí
  const user = window.getAuthUser && window.getAuthUser();
  if (!user || user.role !== 'admin') {
    window.location.replace('index.html');
    return;
  }
  document.querySelector('#nav-auth a[href="admin.html"]')?.classList.add('active');

  function getJson(url) {
    return fetch(API + url).then(function (res) {
      if (!res.ok) throw { status: res.status, body: res };
      return res.json();
    });
  }

  function getJsonBody(res) {
    return res.json().then(function (data) { throw { status: res.status, data }; });
  }

  function formatDateTime(s) {
    if (s == null) return '—';
    const raw = String(s).trim();
    if (!raw) return '—';
    const d = new Date(raw.includes('T') ? raw : raw.replace(/\s+/, 'T'));
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(s) {
    if (s == null || s === '') return '—';
    return String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderUsers(list) {
    const tbody = document.getElementById('users-tbody');
    const msg = document.getElementById('users-msg');
    if (!tbody || !msg) return;
    if (!list.length) {
      tbody.innerHTML = '';
      msg.textContent = 'No hay usuarios.';
      return;
    }
    msg.textContent = list.length + ' usuario(s).';
    tbody.innerHTML = list
      .map(function (u) {
        return (
          '<tr>' +
          '<td><strong>' + u.id + '</strong></td>' +
          '<td>' + escapeHtml(u.username) + '</td>' +
          '<td>' + escapeHtml(u.displayName) + '</td>' +
          '<td>' + (u.role === 'admin' ? 'Administrador' : 'Usuario') + '</td>' +
          '<td>' + (u.isActive ? 'Sí' : 'No') + '</td>' +
          '<td>' + formatDateTime(u.createdAt) + '</td>' +
          '<td>' +
          '<button type="button" class="btn btn--sm btn--ghost btn-edit-user" data-id="' + u.id + '">Editar</button> ' +
          '<button type="button" class="btn btn--sm btn--danger btn-delete-user" data-id="' + u.id + '">Eliminar</button>' +
          '</td></tr>'
        );
      })
      .join('');
  }

  function showError(message) {
    var root = document.getElementById('alert-modal-root');
    if (root && window.showAlert) window.showAlert(message, 'error');
    else alert(message);
  }

  async function loadUsers() {
    const msg = document.getElementById('users-msg');
    const tbody = document.getElementById('users-tbody');
    if (!msg || !tbody) return;
    msg.textContent = 'Cargando…';
    tbody.innerHTML = '';
    try {
      const list = await getJson('/api/users');
      renderUsers(list);
    } catch (e) {
      if (e && e.status === 403) {
        window.location.replace('index.html');
        return;
      }
      msg.textContent = 'Error al cargar usuarios.';
    }
  }

  function openModal(editUser) {
    var modal = document.getElementById('user-modal');
    var title = document.getElementById('user-modal-title');
    var form = document.getElementById('user-form');
    var userId = document.getElementById('user-id');
    var username = document.getElementById('user-username');
    var displayName = document.getElementById('user-displayName');
    var password = document.getElementById('user-password');
    var wrapPassword = document.getElementById('wrap-user-password');
    var role = document.getElementById('user-role');
    var wrapActive = document.getElementById('wrap-user-active');
    var active = document.getElementById('user-active');
    if (!modal || !form) return;

    if (editUser) {
      title.textContent = 'Editar usuario';
      userId.value = editUser.id;
      username.value = editUser.username;
      username.readOnly = true;
      displayName.value = editUser.displayName || '';
      password.value = '';
      password.required = false;
      wrapPassword.querySelector('label').innerHTML = 'Nueva contraseña <span class="text-muted">(dejar en blanco para no cambiar)</span>';
      role.value = editUser.role || 'user';
      wrapActive.style.display = 'block';
      active.checked = editUser.isActive !== false;
    } else {
      title.textContent = 'Nuevo usuario';
      userId.value = '';
      username.value = '';
      username.readOnly = false;
      displayName.value = '';
      password.value = '';
      password.required = true;
      wrapPassword.querySelector('label').innerHTML = 'Contraseña *';
      role.value = 'user';
      wrapActive.style.display = 'none';
      active.checked = true;
    }
    modal.style.display = 'flex';
  }

  function closeModal() {
    var modal = document.getElementById('user-modal');
    if (modal) modal.style.display = 'none';
  }

  document.getElementById('btn-new-user')?.addEventListener('click', function () { openModal(null); });
  document.getElementById('btn-cancel-user')?.addEventListener('click', closeModal);
  document.getElementById('user-modal')?.addEventListener('click', function (e) {
    if (e.target.classList.contains('overlay')) closeModal();
  });

  document.getElementById('user-form')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    var idEl = document.getElementById('user-id');
    var usernameEl = document.getElementById('user-username');
    var displayNameEl = document.getElementById('user-displayName');
    var passwordEl = document.getElementById('user-password');
    var roleEl = document.getElementById('user-role');
    var activeEl = document.getElementById('user-active');
    var id = idEl?.value?.trim();
    var isEdit = !!id;

    var payload = {
      displayName: displayNameEl?.value?.trim() || undefined,
      role: roleEl?.value === 'admin' ? 'admin' : 'user',
    };
    if (!isEdit) {
      payload.username = usernameEl?.value?.trim();
      payload.password = passwordEl?.value || '';
    } else {
      if (passwordEl?.value?.trim()) payload.password = passwordEl.value;
      payload.isActive = activeEl?.checked;
    }

    try {
      if (isEdit) {
        var res = await fetch(API + '/api/users/' + id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          var err = await res.json().catch(function () { return {}; });
          throw new Error(err.error || res.statusText);
        }
      } else {
        var resCreate = await fetch(API + '/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!resCreate.ok) {
          var errCreate = await resCreate.json().catch(function () { return {}; });
          throw new Error(errCreate.error || resCreate.statusText);
        }
      }
      closeModal();
      loadUsers();
    } catch (err) {
      showError(err.message || 'Error al guardar.');
    }
  });

  document.getElementById('users-tbody')?.addEventListener('click', function (e) {
    var id = e.target.getAttribute('data-id');
    if (!id) return;
    if (e.target.classList.contains('btn-edit-user')) {
      fetch(API + '/api/users/' + id)
        .then(function (res) {
          if (!res.ok) throw new Error('No se pudo cargar el usuario.');
          return res.json();
        })
        .then(function (u) { openModal(u); })
        .catch(function () { showError('Error al cargar el usuario.'); });
    } else if (e.target.classList.contains('btn-delete-user')) {
      if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return;
      fetch(API + '/api/users/' + id, { method: 'DELETE' })
        .then(function (res) {
          if (!res.ok) return res.json().then(function (d) { throw new Error(d.error || res.statusText); });
          loadUsers();
        })
        .catch(function (err) { showError(err.message || 'Error al eliminar.'); });
    }
  });

  loadUsers();
})();
