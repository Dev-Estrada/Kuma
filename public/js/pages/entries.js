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

function showEntryProductResults(list) {
  const container = document.getElementById('entry-product-results');
  if (!container) return;
  if (!list || list.length === 0) {
    container.classList.remove('is-visible');
    container.innerHTML = '';
    container.setAttribute('aria-hidden', 'true');
    return;
  }
  container.setAttribute('aria-hidden', 'false');
  container.classList.add('is-visible');
  container.innerHTML = list
    .map(
      (p) =>
        '<div class="entry-product-item" data-product-id="' +
        p.id +
        '" role="button" tabindex="0"><span class="entry-product-item__name">' +
        (p.name || 'Sin nombre').replace(/</g, '&lt;') +
        '</span><span class="entry-product-item__meta">SKU: ' +
        (p.sku || '—').replace(/</g, '&lt;') +
        ' · ID: ' +
        p.id +
        ' · Stock: ' +
        (p.quantity ?? 0) +
        '</span></div>'
    )
    .join('');
  container.querySelectorAll('.entry-product-item').forEach((el) => {
    el.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-product-id'), 10);
      const p = allProducts.find((x) => x.id === id);
      if (p) selectEntryProduct(p);
    });
  });
}

function selectEntryProduct(p) {
  selectedProduct = p;
  document.getElementById('entry-product-id').value = p.id;
  document.getElementById('entry-product-picked').innerHTML =
    '<strong>' +
    (p.name || '').replace(/</g, '&lt;') +
    '</strong> · SKU: ' +
    (p.sku || '').replace(/</g, '&lt;') +
    ' · Stock actual: ' +
    (p.quantity ?? 0);
  document.getElementById('entry-product-search').value = p.name || p.sku || '';
  document.getElementById('entry-product-results').classList.remove('is-visible');
  document.getElementById('entry-product-results').innerHTML = '';
  document.getElementById('entry-product-results').setAttribute('aria-hidden', 'true');
}

document.getElementById('entry-product-search')?.addEventListener('input', (e) => {
  const q = e.target.value.trim();
  document.getElementById('entry-product-id').value = '';
  selectedProduct = null;
  document.getElementById('entry-product-picked').textContent = '';
  showEntryProductResults([]);
  if (!q) {
    allProducts = [];
    return;
  }
  if (productSearchDebounce) clearTimeout(productSearchDebounce);
  productSearchDebounce = setTimeout(async () => {
    try {
      const list = await getJson(`/api/products/pos-search?q=${encodeURIComponent(q)}&limit=50`);
      allProducts = list || [];
      if (allProducts.length === 0) {
        document.getElementById('entry-product-picked').textContent = 'Ningún producto encontrado.';
        showEntryProductResults([]);
        return;
      }
      showEntryProductResults(allProducts);
      if (allProducts.length === 1 && (q === String(allProducts[0].id) || (allProducts[0].sku || '') === q || (allProducts[0].name || '').toLowerCase() === q.toLowerCase())) {
        selectEntryProduct(allProducts[0]);
      } else {
        document.getElementById('entry-product-picked').textContent = allProducts.length + ' producto(s) encontrado(s). Haz clic en uno para seleccionarlo.';
      }
    } catch (_) {
      document.getElementById('entry-product-picked').textContent = 'Error al buscar.';
      showEntryProductResults([]);
    }
  }, 200);
});

document.getElementById('entry-product-search')?.addEventListener('blur', () => {
  setTimeout(() => {
    const res = document.getElementById('entry-product-results');
    if (res) res.classList.remove('is-visible');
    if (allProducts.length === 1 && !selectedProduct) {
      selectedProduct = allProducts[0];
      document.getElementById('entry-product-id').value = selectedProduct.id;
      document.getElementById('entry-product-picked').innerHTML =
        '<strong>' + (selectedProduct.name || '').replace(/</g, '&lt;') + '</strong> · SKU: ' + (selectedProduct.sku || '').replace(/</g, '&lt;') + ' · Stock actual: ' + (selectedProduct.quantity ?? 0);
      document.getElementById('entry-product-search').value = selectedProduct.name || selectedProduct.sku || '';
    }
  }, 150);
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

document.getElementById('btn-print-entries')?.addEventListener('click', async () => {
  if (typeof window.openPrintWindow !== 'function') return;
  try {
    const list = await getJson('/api/movements');
    const entradas = (list || []).filter((m) => m.movementType === 'entrada').slice(0, 200);
    let html = '<h1>Últimas entradas de mercancía - KUMA</h1><table><thead><tr><th>ID</th><th>Producto ID</th><th>Cantidad</th><th>Ref.</th><th>Motivo / Notas</th><th>Fecha</th></tr></thead><tbody>';
    entradas.forEach((m) => {
      html += '<tr><td>' + m.id + '</td><td>' + m.productId + '</td><td>' + m.quantity + '</td><td>' + String(m.referenceNumber || '—').replace(/</g, '&lt;') + '</td><td>' + String(m.reason || m.notes || '—').replace(/</g, '&lt;') + '</td><td>' + formatDateTime(m.createdAt) + '</td></tr>';
    });
    html += '</tbody></table>';
    window.openPrintWindow('Entradas de mercancía - KUMA', html);
  } catch (e) {
    if (window.showAlert) window.showAlert({ title: 'Error', message: 'Error al cargar entradas.', type: 'error' });
    else alert('Error al cargar entradas.');
  }
});

loadRecentEntries();
export {};
