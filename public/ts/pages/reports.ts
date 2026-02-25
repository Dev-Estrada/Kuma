const API = '';

interface DaySummary {
  totalUsd: number;
  totalBs: number;
  count: number;
  totalCostUsd?: number;
  profitUsd?: number;
  marginPercent?: number;
}

interface InventoryValue {
  totalCostValue: number;
  totalListValue: number;
  totalProducts: number;
  totalUnits: number;
}

interface TopProductRow {
  productId: number;
  productName: string;
  productSku: string;
  totalQuantity: number;
  totalUsd: number;
  totalCostUsd?: number;
  profitUsd?: number;
  marginPercent?: number;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(`${API}${url}`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json() as Promise<T>;
}

function todayStr(): string {
  const d = new Date();
  const y = d.toLocaleString('en-CA', { timeZone: 'America/Caracas', year: 'numeric' });
  const m = d.toLocaleString('en-CA', { timeZone: 'America/Caracas', month: '2-digit' });
  const day = d.toLocaleString('en-CA', { timeZone: 'America/Caracas', day: '2-digit' });
  return `${y}-${m}-${day}`;
}

async function loadDaySummary() {
  const msg = document.getElementById('day-summary-msg')!;
  const content = document.getElementById('day-summary-content')!;
  try {
    const data = await getJson<DaySummary>('/api/reports/day-summary-with-profit');
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
  } catch (e) {
    msg.textContent = 'Error al cargar el resumen del día.';
    if (typeof (window as any).showAlert === 'function') (window as any).showAlert({ title: 'Error', message: 'Error al cargar el resumen del día.', type: 'error' });
  }
}

async function loadInventoryValue() {
  const msg = document.getElementById('inventory-value-msg')!;
  const content = document.getElementById('inventory-value-content')!;
  try {
    const data = await getJson<InventoryValue>('/api/reports/inventory-value');
    msg.remove();
    content.innerHTML = `
      <div class="reports-summary__row"><strong>Valor en costo:</strong> $${Number(data.totalCostValue ?? 0).toFixed(2)} USD</div>
      <div class="reports-summary__row"><strong>Valor a precio de venta:</strong> $${Number(data.totalListValue ?? 0).toFixed(2)} USD</div>
      <div class="reports-summary__row"><strong>Productos:</strong> ${data.totalProducts ?? 0} · <strong>Unidades:</strong> ${data.totalUnits ?? 0}</div>
    `;
  } catch (e) {
    msg.textContent = 'Error al cargar valor del inventario.';
    if (typeof (window as any).showAlert === 'function') (window as any).showAlert({ title: 'Error', message: 'Error al cargar valor del inventario.', type: 'error' });
  }
}

async function loadTopProducts() {
  const tbody = document.getElementById('top-products-tbody')!;
  const msg = document.getElementById('top-products-msg')!;
  try {
    const data = await getJson<TopProductRow[]>('/api/reports/top-products?limit=20');
    if (data.length === 0) {
      msg.textContent = 'No hay ventas registradas.';
      tbody.innerHTML = '';
      return;
    }
    msg.textContent = '';
    tbody.innerHTML = data
      .map(
        (row, i) => {
          const cost = row.totalCostUsd ?? 0;
          const profit = row.profitUsd ?? (Number(row.totalUsd) - cost);
          const margin = (row.totalUsd ?? 0) > 0 ? ((row.marginPercent ?? (profit / Number(row.totalUsd) * 100))) : 0;
          return `<tr>
            <td>${i + 1}</td>
            <td>${(row.productName || '—').replace(/</g, '&lt;')}</td>
            <td>${(row.productSku || '—').replace(/</g, '&lt;')}</td>
            <td>${row.totalQuantity}</td>
            <td>$${Number(row.totalUsd).toFixed(2)}</td>
            <td>$${Number(cost).toFixed(2)}</td>
            <td>$${Number(profit).toFixed(2)}</td>
            <td>${Number(margin).toFixed(1)}%</td>
          </tr>`;
        }
      )
      .join('');
  } catch (e) {
    msg.textContent = 'Error al cargar productos más vendidos.';
    tbody.innerHTML = '';
    if (typeof (window as any).showAlert === 'function') (window as any).showAlert({ title: 'Error', message: 'Error al cargar productos más vendidos.', type: 'error' });
  }
}

document.getElementById('btn-period')?.addEventListener('click', async () => {
  const from = (document.getElementById('report-from') as HTMLInputElement).value.trim();
  const to = (document.getElementById('report-to') as HTMLInputElement).value.trim();
  const msg = document.getElementById('period-summary-msg')!;
  const content = document.getElementById('period-summary-content')!;
  if (!from || !to) {
    content.innerHTML = '<span id="period-summary-msg" class="text-muted">Indica desde y hasta (YYYY-MM-DD).</span>';
    return;
  }
  if (from > to) {
    content.innerHTML = '<span id="period-summary-msg" class="msg msg--error">La fecha "Desde" no puede ser mayor que "Hasta".</span>';
    if (typeof (window as any).showAlert === 'function') (window as any).showAlert({ title: 'Aviso', message: 'La fecha "Desde" no puede ser mayor que "Hasta".', type: 'warning' });
    return;
  }
  try {
    const data = await getJson<DaySummary>(`/api/reports/sales-by-period?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    content.innerHTML = `
      <div class="reports-summary__row"><strong>Ventas en el período:</strong> ${data.count}</div>
      <div class="reports-summary__row"><strong>Total USD:</strong> $${Number(data.totalUsd).toFixed(2)}</div>
      <div class="reports-summary__row"><strong>Total Bs:</strong> Bs ${Number(data.totalBs).toFixed(2)}</div>
    `;
  } catch (e) {
    content.innerHTML = '<span id="period-summary-msg" class="msg msg--error">Error al consultar el período.</span>';
    if (typeof (window as any).showAlert === 'function') (window as any).showAlert({ title: 'Error', message: 'Error al consultar el período.', type: 'error' });
  }
});

const fromInput = document.getElementById('report-from') as HTMLInputElement;
const toInput = document.getElementById('report-to') as HTMLInputElement;
if (fromInput && toInput) {
  const today = todayStr();
  fromInput.value = today;
  toInput.value = today;
}

loadDaySummary();
loadInventoryValue();
loadTopProducts();
export {};
