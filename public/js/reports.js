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
        const data = await getJson('/api/reports/day-summary');
        msg.remove();
        content.innerHTML = `
      <div class="reports-summary__row"><strong>Ventas hoy:</strong> ${data.count}</div>
      <div class="reports-summary__row"><strong>Total USD:</strong> $${Number(data.totalUsd).toFixed(2)}</div>
      <div class="reports-summary__row"><strong>Total Bs:</strong> Bs ${Number(data.totalBs).toFixed(2)}</div>
    `;
    }
    catch (e) {
        msg.textContent = 'Error al cargar el resumen del día.';
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
    }
}
async function loadTopProducts() {
    const tbody = document.getElementById('top-products-tbody');
    const msg = document.getElementById('top-products-msg');
    try {
        const data = await getJson('/api/reports/top-products?limit=20');
        if (data.length === 0) {
            msg.textContent = 'No hay ventas registradas.';
            tbody.innerHTML = '';
            return;
        }
        msg.textContent = '';
        tbody.innerHTML = data
            .map((row, i) => {
                const costUsd = row.totalCostUsd ?? 0;
                const profitUsd = row.profitUsd ?? (Number(row.totalUsd) - costUsd);
                const marginPct = row.marginPercent ?? (row.totalUsd > 0 ? (profitUsd / Number(row.totalUsd)) * 100 : 0);
                return `<tr>
            <td>${i + 1}</td>
            <td>${(row.productName || '—').replace(/</g, '&lt;')}</td>
            <td>${(row.productSku || '—').replace(/</g, '&lt;')}</td>
            <td>${row.totalQuantity}</td>
            <td>$${Number(row.totalUsd).toFixed(2)}</td>
            <td>$${Number(costUsd).toFixed(2)}</td>
            <td>$${Number(profitUsd).toFixed(2)}</td>
            <td>${Number(marginPct).toFixed(1)}%</td>
          </tr>`;
            })
            .join('');
    }
    catch (e) {
        msg.textContent = 'Error al cargar productos más vendidos.';
        tbody.innerHTML = '';
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
    }
});
const fromInput = document.getElementById('report-from');
const toInput = document.getElementById('report-to');
if (fromInput && toInput) {
    const today = todayStr();
    fromInput.value = today;
    toInput.value = today;
}
loadDaySummary();
loadInventoryValue();
loadTopProducts();
export {};
