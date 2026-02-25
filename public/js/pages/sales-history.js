const API = '';
const ROWS_PER_PAGE = 7;
let currentSalesPage = 1;
let currentSalesList = [];
async function getJson(url) {
    const res = await fetch(`${API}${url}`);
    if (!res.ok)
        throw new Error(res.statusText);
    return res.json();
}
function formatDateTime(s) {
    try {
        if (s == null)
            return '—';
        if (typeof s === 'number') {
            const d = new Date(s);
            if (Number.isNaN(d.getTime()))
                return '—';
            return d.toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
        const raw = String(s).trim();
        if (!raw)
            return '—';
        const iso = raw.includes('T') ? raw : raw.replace(/\s+/, 'T');
        const withTz = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + '-04:00';
        const d = new Date(withTz);
        if (Number.isNaN(d.getTime()))
            return raw;
        return d.toLocaleDateString('es-VE', {
            timeZone: 'America/Caracas',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    }
    catch {
        return typeof s === 'string' ? s : '—';
    }
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
function renderSalesRows(sales, page) {
    const tbody = document.getElementById('sales-tbody');
    if (!sales.length) {
        tbody.innerHTML = '';
        document.getElementById('sales-pagination').innerHTML = '';
        return;
    }
    const totalPages = Math.ceil(sales.length / ROWS_PER_PAGE) || 1;
    const p = Math.max(1, Math.min(page || 1, totalPages));
    const slice = sales.slice((p - 1) * ROWS_PER_PAGE, p * ROWS_PER_PAGE);
    const statusLabel = (st) => (st === 'anulada' ? 'Anulada' : st === 'completada' ? 'Completada' : st || '—');
    tbody.innerHTML = slice
        .map((s) => {
            const estado = statusLabel(s.status);
            const cliente = (s.clientName && String(s.clientName).trim()) ? String(s.clientName).replace(/</g, '&lt;') : '—';
            return '<tr><td><strong>#' + s.id + '</strong></td><td>' + estado + '</td><td>' + formatDateTime(s.createdAt) + '</td><td>' + Number(s.exchangeRate).toFixed(2) + '</td><td>$' + Number(s.totalUsd).toFixed(2) + '</td><td>Bs ' + Number(s.totalBs).toFixed(2) + '</td><td>' + (s.itemCount ?? '-') + '</td><td>' + cliente + '</td><td><button type="button" class="btn btn--sm btn--ghost btn-view-detail" data-sale-id="' + s.id + '">Ver detalle</button></td></tr>';
        })
        .join('');
    renderPagination('sales-pagination', sales.length, p, function (newPage) {
        currentSalesPage = newPage;
        renderSalesRows(currentSalesList, newPage);
    });
}
let allSales = [];
function todayStr() {
    const d = new Date();
    const y = d.toLocaleString('en-CA', { timeZone: 'America/Caracas', year: 'numeric' });
    const m = d.toLocaleString('en-CA', { timeZone: 'America/Caracas', month: '2-digit' });
    const day = d.toLocaleString('en-CA', { timeZone: 'America/Caracas', day: '2-digit' });
    return `${y}-${m}-${day}`;
}
async function loadSalesList(useDateFilter) {
    const tbody = document.getElementById('sales-tbody');
    const msg = document.getElementById('sales-msg');
    const fromEl = document.getElementById('filter-from');
    const toEl = document.getElementById('filter-to');
    const from = useDateFilter && fromEl?.value ? fromEl.value : '';
    const to = useDateFilter && toEl?.value ? toEl.value : '';
    try {
        let sales;
        if (from && to) {
            sales = await getJson(`/api/sales?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
        }
        else {
            sales = await getJson('/api/sales?limit=200');
        }
        allSales = sales;
        if (sales.length === 0) {
            msg.textContent = from && to ? 'No hay ventas en ese rango de fechas.' : 'No hay ventas registradas.';
            tbody.innerHTML = '';
            var pagEl = document.getElementById('sales-pagination');
            if (pagEl) pagEl.innerHTML = '';
            return;
        }
        msg.textContent = '';
        applySaleFilter();
    }
    catch (e) {
        msg.textContent = 'Error al cargar las ventas.';
        tbody.innerHTML = '';
        if (typeof window.showAlert === 'function')
            window.showAlert({ title: 'Error', message: 'Error al cargar el historial de ventas.', type: 'error' });
    }
}
function applySaleFilter() {
    const q = document.getElementById('sale-search')?.value.trim() || '';
    const msg = document.getElementById('sales-msg');
    currentSalesPage = 1;
    if (!q) {
        currentSalesList = allSales;
        renderSalesRows(allSales, 1);
        msg.textContent = '';
        return;
    }
    const filtered = allSales.filter((s) => String(s.id).includes(q));
    currentSalesList = filtered;
    renderSalesRows(filtered, 1);
    if (filtered.length === 0) {
        msg.textContent = 'Ninguna venta coincide con el ID "' + q + '".';
    }
    else {
        msg.textContent = filtered.length + ' venta(s) encontrada(s).';
    }
}
function openDetailModal(sale) {
    const modal = document.getElementById('sale-detail-modal');
    const title = document.getElementById('sale-detail-title');
    const content = document.getElementById('sale-detail-content');
    title.textContent = `Venta #${sale.id}`;
    const subtotalBeforeDiscount = sale.items.reduce((s, i) => s + i.subtotalUsd, 0);
    const discount = sale.discountPercent ?? 0;
    content.innerHTML = `
    <div class="sale-detail-meta">
      <p><strong>Fecha y hora:</strong> ${formatDateTime(sale.createdAt)}</p>
      <p class="sale-detail-rate"><strong>Tasa aplicada en esta venta:</strong> 1 USD = <strong>${Number(sale.exchangeRate).toFixed(2)} Bs</strong></p>
      ${sale.notes ? `<p><strong>Notas:</strong> ${sale.notes}</p>` : ''}
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>SKU</th>
            <th>Cantidad</th>
            <th>Precio unit. USD</th>
            <th>Subtotal USD</th>
          </tr>
        </thead>
        <tbody>
          ${sale.items
        .map((i) => `<tr>
                  <td>${i.productName}</td>
                  <td>${i.productSku}</td>
                  <td>${i.quantity}</td>
                  <td>$${Number(i.unitPriceUsd).toFixed(2)}</td>
                  <td>$${Number(i.subtotalUsd).toFixed(2)}</td>
                </tr>`)
        .join('')}
        </tbody>
      </table>
    </div>
    <div class="sale-detail-totals">
      <div class="cart__row"><span>Subtotal USD</span><span>$${subtotalBeforeDiscount.toFixed(2)}</span></div>
      ${discount > 0 ? `<div class="cart__row"><span>Descuento</span><span>${discount}%</span></div>` : ''}
      <div class="cart__row cart__row--total"><span>Total USD</span><span>$${Number(sale.totalUsd).toFixed(2)}</span></div>
      <div class="cart__row cart__row--bs"><span>Total Bs</span><span>Bs ${Number(sale.totalBs).toFixed(2)}</span></div>
    </div>
  `;
    modal.style.display = 'flex';
}
function closeDetailModal() {
    document.getElementById('sale-detail-modal').style.display = 'none';
}
document.getElementById('sales-tbody')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-view-detail');
    if (!btn)
        return;
    const id = Number(btn.getAttribute('data-sale-id'));
    try {
        const sale = await getJson(`/api/sales/${id}`);
        openDetailModal(sale);
    }
    catch (_) {
        if (typeof window.showAlert === 'function')
            window.showAlert({ title: 'Error', message: 'Error al cargar el detalle de la venta.', type: 'error' });
        else
            alert('Error al cargar el detalle de la venta.');
    }
});
document.getElementById('btn-close-detail')?.addEventListener('click', closeDetailModal);
document.getElementById('sale-detail-modal')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('overlay'))
        closeDetailModal();
});
document.getElementById('sale-search')?.addEventListener('input', applySaleFilter);
document.getElementById('sale-search')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')
        e.target.blur();
});
document.getElementById('btn-filter-dates')?.addEventListener('click', () => loadSalesList(true));
document.getElementById('btn-clear-dates')?.addEventListener('click', () => {
    const fromEl = document.getElementById('filter-from');
    const toEl = document.getElementById('filter-to');
    if (fromEl)
        fromEl.value = '';
    if (toEl)
        toEl.value = '';
    loadSalesList(false);
});
document.getElementById('btn-print-sales')?.addEventListener('click', async () => {
    if (typeof window.openPrintWindow !== 'function') return;
    try {
        const fromEl = document.getElementById('filter-from');
        const toEl = document.getElementById('filter-to');
        const from = fromEl?.value?.trim();
        const to = toEl?.value?.trim();
        let sales;
        if (from && to)
            sales = await getJson(`/api/sales?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
        else
            sales = await getJson('/api/sales?limit=500');
        const statusLabel = (st) => (st === 'anulada' ? 'Anulada' : st === 'completada' ? 'Completada' : st || '—');
        let html = '<h1>Historial de ventas - KUMA</h1>';
        if (from && to) html += '<p class="print-meta">Período: ' + from + ' a ' + to + '</p>';
        html += '<table><thead><tr><th>ID</th><th>Estado</th><th>Fecha y hora</th><th>Tasa Bs/USD</th><th>Total USD</th><th>Total Bs</th><th>Items</th><th>Cliente</th></tr></thead><tbody>';
        (sales || []).forEach((s) => {
            const cliente = (s.clientName && String(s.clientName).trim()) ? String(s.clientName).replace(/</g, '&lt;') : '—';
            html += '<tr><td>#' + s.id + '</td><td>' + statusLabel(s.status) + '</td><td>' + formatDateTime(s.createdAt) + '</td><td>' + Number(s.exchangeRate).toFixed(2) + '</td><td>$' + Number(s.totalUsd).toFixed(2) + '</td><td>Bs ' + Number(s.totalBs).toFixed(2) + '</td><td>' + (s.itemCount ?? '—') + '</td><td>' + cliente + '</td></tr>';
        });
        html += '</tbody></table>';
        window.openPrintWindow('Historial de ventas - KUMA', html);
    } catch (e) {
        if (typeof window.showAlert === 'function')
            window.showAlert({ title: 'Error', message: 'Error al cargar ventas para imprimir.', type: 'error' });
        else alert('Error al cargar ventas.');
    }
});
loadSalesList(false);
export {};
