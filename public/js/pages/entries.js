const API = '';
const ROWS_PER_PAGE = 7;
let productSearchDebounce = null;
let allProducts = [];
let selectedProduct = null;
let allEntradas = [];
let currentEntriesPage = 1;

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
  const withTz = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + '-04:00';
  const d = new Date(withTz);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

document.getElementById('entry-product-search')?.addEventListener('input', (e) => {
  const q = e.target.value.trim();
  document.getElementById('entry-product-id').value = '';
  selectedProduct = null;
  document.getElementById('entry-product-picked').textContent = '';
  if (!q) {
    allProducts = [];
    return;
  }
  if (productSearchDebounce) clearTimeout(productSearchDebounce);
  productSearchDebounce = setTimeout(async () => {
    try {
      const list = await getJson(`/api/products/pos-search?q=${encodeURIComponent(q)}&limit=20`);
      allProducts = list;
      if (list.length === 1 && (list[0].name || '').toLowerCase() === q.toLowerCase() || String(list[0].id) === q || (list[0].sku || '') === q) {
        selectedProduct = list[0];
        document.getElementById('entry-product-id').value = selectedProduct.id;
        document.getElementById('entry-product-picked').innerHTML = `<strong>${(selectedProduct.name || '').replace(/</g, '&lt;')}</strong> · SKU: ${(selectedProduct.sku || '').replace(/</g, '&lt;')} · Stock actual: ${selectedProduct.quantity ?? 0}`;
      } else if (list.length > 1) {
        document.getElementById('entry-product-picked').textContent = `${list.length} producto(s) encontrado(s). Selecciona uno o escribe más para filtrar.`;
      } else if (list.length === 0) {
        document.getElementById('entry-product-picked').textContent = 'Ningún producto encontrado.';
      }
    } catch (_) {
      document.getElementById('entry-product-picked').textContent = 'Error al buscar.';
    }
  }, 200);
});

document.getElementById('entry-product-search')?.addEventListener('blur', () => {
  if (allProducts.length === 1 && !selectedProduct) {
    selectedProduct = allProducts[0];
    document.getElementById('entry-product-id').value = selectedProduct.id;
    document.getElementById('entry-product-picked').innerHTML = `<strong>${(selectedProduct.name || '').replace(/</g, '&lt;')}</strong> · SKU: ${(selectedProduct.sku || '').replace(/</g, '&lt;')} · Stock actual: ${selectedProduct.quantity ?? 0}`;
    document.getElementById('entry-product-search').value = selectedProduct.name || selectedProduct.sku || '';
  }
});

document.getElementById('btn-submit-entry')?.addEventListener('click', async () => {
  const productId = document.getElementById('entry-product-id')?.value?.trim();
  const quantity = parseInt(document.getElementById('entry-quantity')?.value || '0', 10);
  const reference = document.getElementById('entry-reference')?.value?.trim();
  const reason = document.getElementById('entry-reason')?.value?.trim();
  const msgEl = document.getElementById('entry-msg');
  if (!productId || isNaN(quantity) || quantity < 1) {
    msgEl.style.display = 'block';
    msgEl.textContent = 'Selecciona un producto e indica una cantidad mayor a 0.';
    msgEl.className = 'msg msg--error mt-1 mb-0';
    if (window.showAlert) window.showAlert({ title: 'Aviso', message: 'Selecciona un producto e indica una cantidad mayor a 0.', type: 'warning' });
    return;
  }
  msgEl.style.display = 'block';
  msgEl.textContent = 'Registrando…';
  msgEl.className = 'text-muted mt-1 mb-0';
  try {
    const res = await fetch(`${API}/api/movements/entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: parseInt(productId, 10),
        quantity,
        referenceNumber: reference || undefined,
        reason: reason || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = data.error || 'Error al registrar la entrada.';
      msgEl.textContent = errMsg;
      msgEl.className = 'msg msg--error mt-1 mb-0';
      if (window.showAlert) window.showAlert({ title: 'Error', message: errMsg, type: 'error' });
      return;
    }
    msgEl.textContent = 'Entrada registrada correctamente. El stock se actualizó.';
    msgEl.className = 'msg msg--success mt-1 mb-0';
    if (window.showAlert) window.showAlert({ title: 'Listo', message: 'Entrada registrada correctamente. El stock se actualizó.', type: 'success' });
    document.getElementById('entry-quantity').value = '1';
    document.getElementById('entry-reference').value = '';
    document.getElementById('entry-reason').value = '';
    document.getElementById('entry-product-search').value = '';
    document.getElementById('entry-product-id').value = '';
    document.getElementById('entry-product-picked').textContent = '';
    selectedProduct = null;
    loadRecentEntries();
  } catch (e) {
    msgEl.textContent = 'Error de conexión.';
    msgEl.className = 'msg msg--error mt-1 mb-0';
    if (window.showAlert) window.showAlert({ title: 'Error', message: 'Error de conexión.', type: 'error' });
  }
});

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

function renderEntries(entradas, page) {
  const tbody = document.getElementById('entries-tbody');
  const msg = document.getElementById('entries-msg');
  if (!entradas.length) {
    msg.textContent = 'Aún no hay entradas registradas.';
    tbody.innerHTML = '';
    document.getElementById('entries-pagination').innerHTML = '';
    return;
  }
  msg.textContent = '';
  const totalPages = Math.ceil(entradas.length / ROWS_PER_PAGE) || 1;
  const p = Math.max(1, Math.min(page || 1, totalPages));
  const slice = entradas.slice((p - 1) * ROWS_PER_PAGE, p * ROWS_PER_PAGE);
  tbody.innerHTML = slice
    .map(
      (m) =>
        '<tr><td>' + m.id + '</td><td>' + m.productId + '</td><td>' + m.quantity + '</td><td>' + (m.referenceNumber || '—').replace(/</g, '&lt;') + '</td><td>' + (m.reason || m.notes || '—').replace(/</g, '&lt;') + '</td><td>' + formatDateTime(m.createdAt) + '</td></tr>'
    )
    .join('');
  renderPagination('entries-pagination', entradas.length, p, function (newPage) {
    currentEntriesPage = newPage;
    renderEntries(allEntradas, newPage);
  });
}

async function loadRecentEntries() {
  const tbody = document.getElementById('entries-tbody');
  const msg = document.getElementById('entries-msg');
  try {
    const list = await getJson('/api/movements');
    allEntradas = (list || []).filter((m) => m.movementType === 'entrada').slice(0, 50);
    currentEntriesPage = 1;
    renderEntries(allEntradas, 1);
  } catch (e) {
    msg.textContent = 'Error al cargar movimientos.';
    tbody.innerHTML = '';
    document.getElementById('entries-pagination').innerHTML = '';
    if (window.showAlert) window.showAlert({ title: 'Error', message: 'Error al cargar el historial de entradas.', type: 'error' });
  }
}

loadRecentEntries();
export {};
