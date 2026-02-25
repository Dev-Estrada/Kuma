const API = '';
async function getJson(url) {
    const res = await fetch(`${API}${url}`);
    if (!res.ok)
        throw new Error(res.statusText);
    return res.json();
}
function todayStr() {
    const d = new Date();
    const y = d.toLocaleString('en-CA', { timeZone: 'America/Caracas', year: 'numeric' });
    const m = d.toLocaleString('en-CA', { timeZone: 'America/Caracas', month: '2-digit' });
    const day = d.toLocaleString('en-CA', { timeZone: 'America/Caracas', day: '2-digit' });
    return `${y}-${m}-${day}`;
}
async function loadDaySummary() {
    const msg = document.getElementById('day-summary-msg');
    const content = document.getElementById('day-summary-content');
    try {
        const data = await getJson('/api/reports/day-summary-with-profit');
        msg.remove();
        const cost = data.totalCostUsd ?? 0;
        const profit = data.profitUsd ?? (data.totalUsd ?? 0) - cost;
        const margin = data.marginPercent ?? ((data.totalUsd ?? 0) > 0 ? (profit / (data.totalUsd ?? 0)) * 100 : 0);
        content.innerHTML = `
      <div class="reports-summary__row"><strong>Ventas hoy:</strong> ${data.count}</div>
      <div class="reports-summary__row"><strong>Total USD:</strong> $${Number(data.totalUsd ?? 0).toFixed(2)}</div>
      <div class="reports-summary__row"><strong>Total Bs:</strong> Bs ${Number(data.totalBs ?? 0).toFixed(2)}</div>
      <div class="reports-summary__row"><strong>Costo USD:</strong> $${Number(cost).toFixed(2)}</div>
      <div class="reports-summary__row"><strong>Utilidad USD:</strong> $${Number(profit).toFixed(2)}</div>
      <div class="reports-summary__row"><strong>Margen %:</strong> ${Number(margin).toFixed(1)}%</div>
    `;
    }
    catch (e) {
        msg.textContent = 'Error al cargar el resumen del día.';
        if (typeof window.showAlert === 'function')
            window.showAlert({ title: 'Error', message: 'Error al cargar el resumen del día.', type: 'error' });
    }
}
async function loadInventoryValue() {
    const msg = document.getElementById('inventory-value-msg');
    const content = document.getElementById('inventory-value-content');
    try {
        const data = await getJson('/api/reports/inventory-value');
        msg.remove();
        content.innerHTML = `
      <div class="reports-summary__row"><strong>Valor en costo:</strong> $${Number(data.totalCostValue ?? 0).toFixed(2)} USD</div>
      <div class="reports-summary__row"><strong>Valor a precio de venta:</strong> $${Number(data.totalListValue ?? 0).toFixed(2)} USD</div>
      <div class="reports-summary__row"><strong>Productos:</strong> ${data.totalProducts ?? 0} · <strong>Unidades:</strong> ${data.totalUnits ?? 0}</div>
    `;
    }
    catch (e) {
        msg.textContent = 'Error al cargar valor del inventario.';
        if (typeof window.showAlert === 'function')
            window.showAlert({ title: 'Error', message: 'Error al cargar valor del inventario.', type: 'error' });
    }
}
const ROWS_PER_PAGE = 7;
let topProductsList = [];
let topProductsPage = 1;
function renderTopProductsPagination(containerId, totalItems, currentPage, onPageChange) {
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
function renderTopProducts(data, page) {
    const tbody = document.getElementById('top-products-tbody');
    const msg = document.getElementById('top-products-msg');
    if (!data.length) {
        msg.textContent = 'No hay ventas registradas.';
        tbody.innerHTML = '';
        document.getElementById('top-products-pagination').innerHTML = '';
        return;
    }
    msg.textContent = '';
    const totalPages = Math.ceil(data.length / ROWS_PER_PAGE) || 1;
    const p = Math.max(1, Math.min(page || 1, totalPages));
    const slice = data.slice((p - 1) * ROWS_PER_PAGE, p * ROWS_PER_PAGE);
    tbody.innerHTML = slice
        .map((row, i) => {
            const idx = (p - 1) * ROWS_PER_PAGE + i + 1;
            const cost = row.totalCostUsd ?? 0;
            const profit = row.profitUsd ?? (Number(row.totalUsd) - cost);
            const margin = (row.totalUsd ?? 0) > 0 ? (row.marginPercent ?? (profit / Number(row.totalUsd) * 100)) : 0;
            return '<tr><td>' + idx + '</td><td>' + (row.productName || '—').replace(/</g, '&lt;') + '</td><td>' + (row.productSku || '—').replace(/</g, '&lt;') + '</td><td>' + row.totalQuantity + '</td><td>$' + Number(row.totalUsd).toFixed(2) + '</td><td>$' + Number(cost).toFixed(2) + '</td><td>$' + Number(profit).toFixed(2) + '</td><td>' + Number(margin).toFixed(1) + '%</td></tr>';
        })
        .join('');
    renderTopProductsPagination('top-products-pagination', data.length, p, function (newPage) {
        topProductsPage = newPage;
        renderTopProducts(topProductsList, newPage);
    });
}
async function loadTopProducts() {
    const tbody = document.getElementById('top-products-tbody');
    const msg = document.getElementById('top-products-msg');
    try {
        const data = await getJson('/api/reports/top-products?limit=100');
        topProductsList = data;
        topProductsPage = 1;
        renderTopProducts(data, 1);
    }
    catch (e) {
        msg.textContent = 'Error al cargar productos más vendidos.';
        tbody.innerHTML = '';
        document.getElementById('top-products-pagination').innerHTML = '';
        if (typeof window.showAlert === 'function')
            window.showAlert({ title: 'Error', message: 'Error al cargar productos más vendidos.', type: 'error' });
    }
}
document.getElementById('btn-period')?.addEventListener('click', async () => {
    const from = document.getElementById('report-from').value.trim();
    const to = document.getElementById('report-to').value.trim();
    const msg = document.getElementById('period-summary-msg');
    const content = document.getElementById('period-summary-content');
    if (!from || !to) {
        content.innerHTML = '<span id="period-summary-msg" class="text-muted">Indica desde y hasta (YYYY-MM-DD).</span>';
        return;
    }
    if (from > to) {
        content.innerHTML = '<span id="period-summary-msg" class="msg msg--error">La fecha "Desde" no puede ser mayor que "Hasta".</span>';
        if (typeof window.showAlert === 'function')
            window.showAlert({ title: 'Aviso', message: 'La fecha "Desde" no puede ser mayor que "Hasta".', type: 'warning' });
        return;
    }
    try {
        const data = await getJson(`/api/reports/sales-by-period?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
        content.innerHTML = `
      <div class="reports-summary__row"><strong>Ventas en el período:</strong> ${data.count}</div>
      <div class="reports-summary__row"><strong>Total USD:</strong> $${Number(data.totalUsd).toFixed(2)}</div>
      <div class="reports-summary__row"><strong>Total Bs:</strong> Bs ${Number(data.totalBs).toFixed(2)}</div>
    `;
    }
    catch (e) {
        content.innerHTML = '<span id="period-summary-msg" class="msg msg--error">Error al consultar el período.</span>';
        if (typeof window.showAlert === 'function')
            window.showAlert({ title: 'Error', message: 'Error al consultar el período.', type: 'error' });
    }
});
const fromInput = document.getElementById('report-from');
const toInput = document.getElementById('report-to');
if (fromInput && toInput) {
    const today = todayStr();
    fromInput.value = today;
    toInput.value = today;
}
document.getElementById('btn-print-report')?.addEventListener('click', async () => {
    if (typeof window.openPrintWindow !== 'function') return;
    try {
        const [dayData, invData, topData] = await Promise.all([
            getJson('/api/reports/day-summary-with-profit').catch(() => ({})),
            getJson('/api/reports/inventory-value').catch(() => ({})),
            getJson('/api/reports/top-products?limit=100').catch(() => []),
        ]);
        const from = fromInput?.value?.trim();
        const to = toInput?.value?.trim();
        let periodHtml = '';
        if (from && to && from <= to) {
            try {
                const periodData = await getJson(`/api/reports/sales-by-period?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
                periodHtml = '<h2>Ventas por período (' + from + ' a ' + to + ')</h2><div class="reports-summary__row"><strong>Ventas:</strong> ' + (periodData.count ?? 0) + '</div><div class="reports-summary__row"><strong>Total USD:</strong> $' + Number(periodData.totalUsd ?? 0).toFixed(2) + '</div><div class="reports-summary__row"><strong>Total Bs:</strong> Bs ' + Number(periodData.totalBs ?? 0).toFixed(2) + '</div>';
            } catch (_) { }
        }
        const cost = dayData.totalCostUsd ?? 0;
        const profit = dayData.profitUsd ?? ((dayData.totalUsd ?? 0) - cost);
        const margin = (dayData.totalUsd ?? 0) > 0 ? (profit / (dayData.totalUsd ?? 0)) * 100 : 0;
        let html = '<h1>Reporte - KUMA</h1>';
        html += '<h2>Cierre del día (hoy)</h2><div class="reports-summary__row"><strong>Ventas hoy:</strong> ' + (dayData.count ?? 0) + '</div><div class="reports-summary__row"><strong>Total USD:</strong> $' + Number(dayData.totalUsd ?? 0).toFixed(2) + '</div><div class="reports-summary__row"><strong>Total Bs:</strong> Bs ' + Number(dayData.totalBs ?? 0).toFixed(2) + '</div><div class="reports-summary__row"><strong>Costo USD:</strong> $' + Number(cost).toFixed(2) + '</div><div class="reports-summary__row"><strong>Utilidad USD:</strong> $' + Number(profit).toFixed(2) + '</div><div class="reports-summary__row"><strong>Margen %:</strong> ' + Number(margin).toFixed(1) + '%</div>';
        if (periodHtml) html += periodHtml;
        html += '<h2>Valor del inventario</h2><div class="reports-summary__row"><strong>Valor en costo:</strong> $' + Number(invData.totalCostValue ?? 0).toFixed(2) + ' USD</div><div class="reports-summary__row"><strong>Valor a precio de venta:</strong> $' + Number(invData.totalListValue ?? 0).toFixed(2) + ' USD</div><div class="reports-summary__row"><strong>Productos:</strong> ' + (invData.totalProducts ?? 0) + ' · <strong>Unidades:</strong> ' + (invData.totalUnits ?? 0) + '</div>';
        html += '<h2>Productos más vendidos</h2><table><thead><tr><th>#</th><th>Producto</th><th>SKU</th><th>Cant. vendida</th><th>Ventas USD</th><th>Costo USD</th><th>Utilidad USD</th><th>Margen %</th></tr></thead><tbody>';
        (topData || []).slice(0, 50).forEach((row, i) => {
            const costR = row.totalCostUsd ?? 0;
            const profitR = row.profitUsd ?? (Number(row.totalUsd) - costR);
            const marginR = (row.totalUsd ?? 0) > 0 ? (row.marginPercent ?? (profitR / Number(row.totalUsd) * 100)) : 0;
            html += '<tr><td>' + (i + 1) + '</td><td>' + String(row.productName || '—').replace(/</g, '&lt;') + '</td><td>' + String(row.productSku || '—').replace(/</g, '&lt;') + '</td><td>' + row.totalQuantity + '</td><td>$' + Number(row.totalUsd).toFixed(2) + '</td><td>$' + Number(costR).toFixed(2) + '</td><td>$' + Number(profitR).toFixed(2) + '</td><td>' + Number(marginR).toFixed(1) + '%</td></tr>';
        });
        html += '</tbody></table>';
        window.openPrintWindow('Reporte - KUMA', html);
    } catch (e) {
        if (typeof window.showAlert === 'function')
            window.showAlert({ title: 'Error', message: 'Error al generar el reporte.', type: 'error' });
        else alert('Error al generar el reporte.');
    }
});
loadDaySummary();
loadInventoryValue();
loadTopProducts();
export {};
