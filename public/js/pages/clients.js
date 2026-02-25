const API = '';
const ROWS_PER_PAGE = 7;
let allClients = [];
let currentClientsPage = 1;

async function getJson(url) {
  const res = await fetch(`${API}${url}`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

function formatDateTime(s) {
  if (s == null) return '—';
  const raw = String(s).trim();
  if (!raw) return '—';
  const iso = raw.includes('T') ? raw : raw.replace(/\s+/, 'T');
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(s) {
  if (s == null || s === '') return '—';
  return String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderPagination(containerId, totalItems, currentPage, onPageChange) {
  const totalPages = Math.ceil(totalItems / ROWS_PER_PAGE) || 1;
  const el = document.getElementById(containerId);
  if (!el) return;
  if (totalItems === 0) { el.innerHTML = ''; return; }
  const start = (currentPage - 1) * ROWS_PER_PAGE + 1;
  const end = Math.min(currentPage * ROWS_PER_PAGE, totalItems);
  el.innerHTML = '<span class="table-pagination__range">Mostrando ' + start + '-' + end + ' de ' + totalItems + '</span><div class="table-pagination__nav"><button type="button" class="btn btn--ghost btn--sm" id="' + containerId + '-prev"' + (currentPage <= 1 ? ' disabled' : '') + '>Anterior</button><span>Página ' + currentPage + ' de ' + totalPages + '</span><button type="button" class="btn btn--ghost btn--sm" id="' + containerId + '-next"' + (currentPage >= totalPages ? ' disabled' : '') + '>Siguiente</button></div>';
  document.getElementById(containerId + '-prev')?.addEventListener('click', function () { if (currentPage > 1) onPageChange(currentPage - 1); });
  document.getElementById(containerId + '-next')?.addEventListener('click', function () { if (currentPage < totalPages) onPageChange(currentPage + 1); });
}

function renderClients(list, page) {
  const tbody = document.getElementById('clients-tbody');
  const msg = document.getElementById('clients-msg');
  if (!list.length) {
    tbody.innerHTML = '';
    msg.textContent = 'No hay clientes. Crea uno con "Nuevo cliente".';
    document.getElementById('clients-pagination').innerHTML = '';
    return;
  }
  msg.textContent = list.length + ' cliente(s).';
  const totalPages = Math.ceil(list.length / ROWS_PER_PAGE) || 1;
  const p = Math.max(1, Math.min(page || 1, totalPages));
  const slice = list.slice((p - 1) * ROWS_PER_PAGE, p * ROWS_PER_PAGE);
  tbody.innerHTML = slice
    .map(
      (c) => '<tr><td><strong>' + c.id + '</strong></td><td>' + escapeHtml(c.name) + '</td><td>' + escapeHtml(c.document) + '</td><td>' + escapeHtml(c.phone) + '</td><td>' + escapeHtml(c.email) + '</td><td class="text-muted" style="max-width: 10rem;">' + escapeHtml(c.address) + '</td><td class="text-muted" style="max-width: 12rem;">' + escapeHtml(c.notes) + '</td><td>' + formatDateTime(c.createdAt) + '</td><td><button type="button" class="btn btn--sm btn--ghost btn-edit-client" data-id="' + c.id + '">Editar</button> <button type="button" class="btn btn--sm btn--danger btn-delete-client" data-id="' + c.id + '">Eliminar</button></td></tr>'
    )
    .join('');
  renderPagination('clients-pagination', list.length, p, function (newPage) {
    currentClientsPage = newPage;
    renderClients(allClients, newPage);
  });
}

async function loadClients() {
  const q = document.getElementById('client-search')?.value?.trim();
  try {
    if (q) {
      allClients = await getJson(`/api/clients/search?q=${encodeURIComponent(q)}`);
    } else {
      allClients = await getJson('/api/clients');
    }
    currentClientsPage = 1;
    renderClients(allClients, 1);
  } catch (e) {
    document.getElementById('clients-msg').textContent = 'Error al cargar clientes.';
    document.getElementById('clients-tbody').innerHTML = '';
    if (window.showAlert) window.showAlert({ title: 'Error', message: 'Error al cargar la lista de clientes.', type: 'error' });
  }
}

function openModal(client = null) {
  document.getElementById('client-modal-title').textContent = client ? 'Editar cliente' : 'Nuevo cliente';
  document.getElementById('client-id').value = client ? client.id : '';
  document.getElementById('client-name').value = client?.name ?? '';
  document.getElementById('client-document').value = client?.document ?? '';
  document.getElementById('client-phone').value = client?.phone ?? '';
  document.getElementById('client-email').value = client?.email ?? '';
  document.getElementById('client-address').value = client?.address ?? '';
  document.getElementById('client-notes').value = client?.notes ?? '';
  document.getElementById('client-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('client-modal').style.display = 'none';
}

document.getElementById('client-search')?.addEventListener('input', () => loadClients());
document.getElementById('btn-new-client')?.addEventListener('click', () => openModal());
document.getElementById('btn-cancel-client')?.addEventListener('click', closeModal);
document.getElementById('client-modal')?.addEventListener('click', (e) => {
  if (e.target.classList.contains('overlay')) closeModal();
});

document.getElementById('client-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('client-id').value;
  const payload = {
    name: document.getElementById('client-name').value.trim(),
    document: document.getElementById('client-document').value.trim() || undefined,
    phone: document.getElementById('client-phone').value.trim() || undefined,
    email: document.getElementById('client-email').value.trim() || undefined,
    address: document.getElementById('client-address').value.trim() || undefined,
    notes: document.getElementById('client-notes').value.trim() || undefined,
  };
  if (!payload.name) return;
  try {
    let res;
    if (id) {
      res = await fetch(`${API}/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch(`${API}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error || 'Error al guardar.';
      if (window.showAlert) window.showAlert({ title: 'Error', message: msg, type: 'error' });
      else alert(msg);
      return;
    }
    closeModal();
    loadClients();
    if (window.showAlert) window.showAlert({ title: 'Listo', message: 'Cliente guardado correctamente.', type: 'success' });
    else alert('Cliente guardado correctamente.');
  } catch (_) {
    if (window.showAlert) window.showAlert({ title: 'Error', message: 'Error de conexión al guardar.', type: 'error' });
    else alert('Error de conexión.');
  }
});

document.getElementById('clients-tbody')?.addEventListener('click', async (e) => {
  const editBtn = e.target.closest('.btn-edit-client');
  const delBtn = e.target.closest('.btn-delete-client');
  if (editBtn) {
    const id = parseInt(editBtn.getAttribute('data-id'), 10);
    const client = allClients.find((c) => c.id === id);
    if (client) openModal(client);
    return;
  }
  if (delBtn) {
    const id = delBtn.getAttribute('data-id');
    if (!confirm('¿Eliminar este cliente? Las ventas asociadas quedarán sin cliente.')) return;
    try {
      const res = await fetch(`${API}/api/clients/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error || 'Error al eliminar.';
        if (window.showAlert) window.showAlert({ title: 'Error', message: msg, type: 'error' });
        else alert(msg);
        return;
      }
      loadClients();
      if (window.showAlert) window.showAlert({ title: 'Listo', message: 'Cliente eliminado correctamente.', type: 'success' });
    } catch (_) {
      if (window.showAlert) window.showAlert({ title: 'Error', message: 'Error de conexión.', type: 'error' });
      else alert('Error de conexión.');
    }
  }
});

loadClients();
export {};
