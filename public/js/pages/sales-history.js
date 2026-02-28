import { BANKS, PAYMENT_METHOD_LABELS } from '../shared/banks';
const API = '';
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
function getStatusLabel(status) {
    return status === 'anulada' ? 'Anulada' : 'Completada';
}
function renderPagination(containerId, totalItems, currentPage, onPageChange) {
    const totalPages = Math.ceil(totalItems / ROWS_PER_PAGE) || 1;
    const el = document.getElementById(containerId);
    if (!el)
        return;
    if (totalItems === 0) {
        el.innerHTML = '';
        return;
    }
    const start = (currentPage - 1) * ROWS_PER_PAGE + 1;
    const end = Math.min(currentPage * ROWS_PER_PAGE, totalItems);
    el.innerHTML =
        `<span class="table-pagination__range">Mostrando ${start}-${end} de ${totalItems}</span>` +
            `<div class="table-pagination__nav">` +
            `<button type="button" class="btn btn--ghost btn--sm" id="${containerId}-prev" ${currentPage <= 1 ? ' disabled' : ''}>Anterior</button>` +
            `<span>Página ${currentPage} de ${totalPages}</span>` +
            `<button type="button" class="btn btn--ghost btn--sm" id="${containerId}-next" ${currentPage >= totalPages ? ' disabled' : ''}>Siguiente</button>` +
            `</div>`;
    document.getElementById(`${containerId}-prev`)?.addEventListener('click', () => { if (currentPage > 1)
        onPageChange(currentPage - 1); });
    document.getElementById(`${containerId}-next`)?.addEventListener('click', () => { if (currentPage < totalPages)
        onPageChange(currentPage + 1); });
}
function renderSalesRows(sales, page = 1) {
    const tbody = document.getElementById('sales-tbody');
    const totalPages = Math.ceil(sales.length / ROWS_PER_PAGE) || 1;
    const p = Math.max(1, Math.min(page, totalPages));
    const slice = sales.slice((p - 1) * ROWS_PER_PAGE, p * ROWS_PER_PAGE);
    tbody.innerHTML = slice
        .map((s) => `<tr>
          <td><strong>#${s.id}</strong></td>
          <td>${getStatusLabel(s.status)}</td>
          <td>${formatDateTime(s.createdAt)}</td>
          <td>${Number(s.exchangeRate).toFixed(2)}</td>
          <td>$${Number(s.totalUsd).toFixed(2)}</td>
          <td>Bs ${Number(s.totalBs).toFixed(2)}</td>
          <td>${s.itemCount ?? '-'}</td>
          <td>${(s.clientName || '—').replace(/</g, '&lt;')}</td>
          <td>
            <button type="button" class="btn btn--sm btn--ghost btn-view-detail" data-sale-id="${s.id}">Ver detalle</button>
            <button type="button" class="btn btn--sm btn--ghost btn-view-payment" data-sale-id="${s.id}">Método de pago</button>
          </td>
        </tr>`)
        .join('');
    renderPagination('sales-pagination', sales.length, p, (newPage) => {
        currentSalesPage = newPage;
        renderSalesRows(sales, newPage);
    });
}
const ROWS_PER_PAGE = 7;
let allSales = [];
let currentSalesPage = 1;
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
        currentSalesPage = 1;
        if (sales.length === 0) {
            msg.textContent = from && to ? 'No hay ventas en ese rango de fechas.' : 'No hay ventas registradas.';
            tbody.innerHTML = '';
            document.getElementById('sales-pagination').innerHTML = '';
            return;
        }
        msg.textContent = '';
        applySaleFilter();
    }
    catch (e) {
        msg.textContent = 'Error al cargar las ventas.';
        tbody.innerHTML = '';
    }
}
function applySaleFilter() {
    const q = document.getElementById('sale-search')?.value.trim() || '';
    const msg = document.getElementById('sales-msg');
    if (!q) {
        renderSalesRows(allSales, currentSalesPage);
        msg.textContent = '';
        return;
    }
    const qLower = q.toLowerCase();
    const filtered = allSales.filter((s) =>
        String(s.id).includes(q) ||
        ((s.clientName || '').toLowerCase().includes(qLower))
    );
    currentSalesPage = 1;
    renderSalesRows(filtered, 1);
    if (filtered.length === 0) {
        msg.textContent = `Ninguna venta coincide con "${q}".`;
    }
    else {
        msg.textContent = `${filtered.length} venta(s) encontrada(s).`;
    }
}
function getPaymentsFromSale(sale) {
    if (sale.payments && sale.payments.length > 0) return sale.payments;
    if (sale.paymentMethod)
        return [{ method: sale.paymentMethod, amountUsd: sale.totalUsd ?? 0, bankCode: sale.paymentBankCode ?? null, reference: sale.paymentReference ?? null, mon: null }];
    return [];
}
function formatPaymentInfoHtml(sale) {
    const payments = getPaymentsFromSale(sale);
    if (payments.length === 0) return '';
    const lines = payments.map((p) => {
        const label = PAYMENT_METHOD_LABELS[p.method] || p.method;
        const bankName = p.bankCode ? (BANKS.find((b) => b.code === p.bankCode)?.name || p.bankCode) : '';
        const rate = sale.exchangeRate || 0;
        const amountBs = rate > 0 ? (Math.round(p.amountUsd * rate * 100) / 100) : 0;
        let html = `<p><strong>${label}:</strong> $${Number(p.amountUsd).toFixed(2)} USD (Bs ${amountBs.toFixed(2)})</p>`;
        if (p.bankCode && bankName) html += `<p><strong>Banco:</strong> ${bankName}</p>`;
        if (p.reference) html += `<p><strong>Referencia:</strong> ${String(p.reference).replace(/</g, '&lt;')}</p>`;
        if (p.mon) html += `<p><strong>MON:</strong> ${String(p.mon).replace(/</g, '&lt;')}</p>`;
        return html;
    });
    return `<div class="sale-detail-payment"><p><strong>Pagos:</strong></p>${lines.join('')}</div>`;
}
function formatPaymentMessage(sale) {
    const payments = getPaymentsFromSale(sale);
    if (payments.length === 0) return 'Sin información de pago.';
    return payments.map((p) => {
        const label = PAYMENT_METHOD_LABELS[p.method] || p.method;
        const bankName = p.bankCode ? (BANKS.find((b) => b.code === p.bankCode)?.name || p.bankCode) : '';
        const rate = sale.exchangeRate || 0;
        const amountBs = rate > 0 ? (Math.round(p.amountUsd * rate * 100) / 100) : 0;
        let line = `${label}: $${Number(p.amountUsd).toFixed(2)} USD (Bs ${amountBs.toFixed(2)})`;
        if (p.bankCode && bankName) line += ` · Banco: ${bankName}`;
        if (p.reference) line += ` · Ref: ${String(p.reference).replace(/</g, '&lt;')}`;
        if (p.mon) line += ` · MON: ${String(p.mon).replace(/</g, '&lt;')}`;
        return line;
    }).join('\n');
}
function openDetailModal(sale) {
    const modal = document.getElementById('sale-detail-modal');
    const title = document.getElementById('sale-detail-title');
    const content = document.getElementById('sale-detail-content');
    title.textContent = `Venta #${sale.id}`;
    const subtotalBeforeDiscount = sale.items.reduce((s, i) => s + i.subtotalUsd, 0);
    const discount = sale.discountPercent ?? 0;
    const paymentInfo = formatPaymentInfoHtml(sale);
    content.innerHTML = `
    <div class="sale-detail-meta">
      <p><strong>Fecha y hora:</strong> ${formatDateTime(sale.createdAt)}</p>
      <p class="sale-detail-rate"><strong>Tasa aplicada en esta venta:</strong> 1 USD = <strong>${Number(sale.exchangeRate).toFixed(2)} Bs</strong></p>
      ${sale.notes ? `<p><strong>Notas:</strong> ${sale.notes}</p>` : ''}
      ${paymentInfo}
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
function showPaymentModal(sale) {
    const message = formatPaymentMessage(sale);
    if (typeof window.showAlert === 'function') {
        window.showAlert({ title: `Venta #${sale.id} – Métodos de pago`, message, type: 'info', skipNotificationSeen: true });
        return;
    }
    const root = document.getElementById('alert-modal-root');
    if (root) {
        root.innerHTML = `<div class="alert-modal-overlay" id="payment-info-overlay"><div class="alert-modal"><h3 class="alert-modal__title">Venta #${sale.id} – Métodos de pago</h3><p class="alert-modal__message" style="white-space: pre-line;">${message.replace(/</g, '&lt;')}</p><button type="button" class="btn btn--ghost" id="payment-info-close">Cerrar</button></div></div>`;
        root.style.display = 'block';
        document.getElementById('payment-info-close')?.addEventListener('click', () => { root.innerHTML = ''; root.style.display = 'none'; });
        document.getElementById('payment-info-overlay')?.addEventListener('click', (ev) => { if (ev.target.id === 'payment-info-overlay') { root.innerHTML = ''; root.style.display = 'none'; } });
    }
}
document.getElementById('sales-tbody')?.addEventListener('click', async (e) => {
    const target = e.target;
    const btnDetail = target.closest('.btn-view-detail');
    const btnPayment = target.closest('.btn-view-payment');
    const btn = btnDetail || btnPayment;
    if (!btn)
        return;
    const id = Number(btn.getAttribute('data-sale-id'));
    try {
        const sale = await getJson(`/api/sales/${id}`);
        if (btnPayment) {
            showPaymentModal(sale);
        }
        else {
            openDetailModal(sale);
        }
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
function getSalesToPrint() {
    const q = document.getElementById('sale-search')?.value.trim() || '';
    if (!q)
        return allSales;
    const qLower = q.toLowerCase();
    return allSales.filter((s) =>
        String(s.id).includes(q) ||
        ((s.clientName || '').toLowerCase().includes(qLower))
    );
}
document.getElementById('btn-print-sales')?.addEventListener('click', () => {
    const sales = getSalesToPrint();
    if (sales.length === 0) {
        if (typeof window.showAlert === 'function') {
            window.showAlert({ title: 'Aviso', message: 'No hay ventas para imprimir.', type: 'warning' });
        }
        else {
            alert('No hay ventas para imprimir.');
        }
        return;
    }
    const openPrintWindow = window.openPrintWindow;
    if (typeof openPrintWindow !== 'function') {
        if (typeof window.showAlert === 'function') {
            window.showAlert({ title: 'Error', message: 'No se pudo abrir la ventana de impresión.', type: 'error' });
        }
        else {
            alert('No se pudo abrir la ventana de impresión.');
        }
        return;
    }
    const tableRows = sales
        .map((s) => `<tr>
          <td>#${s.id}</td>
          <td>${getStatusLabel(s.status)}</td>
          <td>${formatDateTime(s.createdAt)}</td>
          <td>${Number(s.exchangeRate).toFixed(2)}</td>
          <td>$${Number(s.totalUsd).toFixed(2)}</td>
          <td>Bs ${Number(s.totalBs).toFixed(2)}</td>
          <td>${s.itemCount ?? '-'}</td>
          <td>${(s.clientName || '—').replace(/</g, '&lt;')}</td>
        </tr>`)
        .join('');
    const html = '<h1>Historial de ventas</h1>' +
        '<table><thead><tr><th>ID</th><th>Estado</th><th>Fecha y hora</th><th>Tasa (Bs/USD)</th><th>Total USD</th><th>Total Bs</th><th>Items</th><th>Cliente</th></tr></thead><tbody>' +
        tableRows +
        '</tbody></table>';
    openPrintWindow('Historial de ventas', html);
});
loadSalesList(false);
