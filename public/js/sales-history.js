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
function renderSalesRows(sales) {
    const tbody = document.getElementById('sales-tbody');
    tbody.innerHTML = sales
        .map((s) => `<tr>
          <td><strong>#${s.id}</strong></td>
          <td>${formatDateTime(s.createdAt)}</td>
          <td>${Number(s.exchangeRate).toFixed(2)}</td>
          <td>$${Number(s.totalUsd).toFixed(2)}</td>
          <td>Bs ${Number(s.totalBs).toFixed(2)}</td>
          <td>${s.itemCount ?? '-'}</td>
          <td><button type="button" class="btn btn--sm btn--ghost btn-view-detail" data-sale-id="${s.id}">Ver detalle</button></td>
        </tr>`)
        .join('');
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
        renderSalesRows(allSales);
        msg.textContent = '';
        return;
    }
    const filtered = allSales.filter((s) => String(s.id).includes(q));
    renderSalesRows(filtered);
    if (filtered.length === 0) {
        msg.textContent = `Ninguna venta coincide con el ID "${q}".`;
    }
    else {
        msg.textContent = `${filtered.length} venta(s) encontrada(s).`;
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
loadSalesList(false);
export {};
