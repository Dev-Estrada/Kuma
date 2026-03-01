const API = '';
const ROWS_PER_PAGE = 7;

let topProductsData: TopProductRow[] = [];
let currentTopProductsPage = 1;

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
  const msg = document.getElementById('day-summary-msg');
  const content = document.getElementById('day-summary-content');
  if (!content) return;
  if (msg) msg.textContent = 'Cargando…';
  try {
    const data = await getJson<DaySummary>('/api/reports/day-summary-with-profit');
    if (msg) msg.remove();
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
    if (msg) msg.textContent = 'Error al cargar el resumen del día.';
    if (typeof (window as any).showAlert === 'function') (window as any).showAlert({ title: 'Error', message: 'Error al cargar el resumen del día.', type: 'error' });
  }
}

async function loadInventoryValue() {
  const msg = document.getElementById('inventory-value-msg');
  const content = document.getElementById('inventory-value-content');
  if (!content) return;
  if (msg) msg.textContent = 'Cargando…';
  try {
    const data = await getJson<InventoryValue>('/api/reports/inventory-value');
    if (msg) msg.remove();
    content.innerHTML = `
      <div class="reports-summary__row"><strong>Valor en costo:</strong> $${Number(data.totalCostValue ?? 0).toFixed(2)} USD</div>
      <div class="reports-summary__row"><strong>Valor a precio de venta:</strong> $${Number(data.totalListValue ?? 0).toFixed(2)} USD</div>
      <div class="reports-summary__row"><strong>Productos:</strong> ${data.totalProducts ?? 0} · <strong>Unidades:</strong> ${data.totalUnits ?? 0}</div>
    `;
  } catch (e) {
    if (msg) msg.textContent = 'Error al cargar valor del inventario.';
    if (typeof (window as any).showAlert === 'function') (window as any).showAlert({ title: 'Error', message: 'Error al cargar valor del inventario.', type: 'error' });
  }
}

function openReportModal(modalId: string, onOpen?: () => void) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    if (typeof onOpen === 'function') onOpen();
  }
}

function closeReportModal(modalId: string) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'none';
}

async function createBackup(): Promise<void> {
  const showAlert = (window as any).showAlert;
  try {
    const res = await fetch(`${API}/api/backup/save`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (typeof showAlert === 'function') showAlert({ title: 'Error', message: data.error || (res.status === 403 ? 'Solo administradores pueden crear copias de seguridad.' : 'No se pudo crear la copia.'), type: 'error' });
      return;
    }
    if (data.ok && data.filename) {
      const where = (data as { fullPath?: string }).fullPath ? `\n\nUbicación:\n${(data as { fullPath: string }).fullPath}` : '';
      if (typeof showAlert === 'function') showAlert({ title: 'Copia creada', message: `Se guardó la copia de seguridad: ${data.filename}${where}`, type: 'success' });
    } else {
      if (typeof showAlert === 'function') showAlert({ title: 'Listo', message: 'Copia de seguridad creada correctamente.', type: 'success' });
    }
  } catch (e) {
    if (typeof showAlert === 'function') showAlert({ title: 'Error', message: 'Error de conexión al crear la copia de seguridad.', type: 'error' });
  }
}

document.getElementById('btn-report-day')?.addEventListener('click', () => {
  openReportModal('report-modal-day', () => loadDaySummary());
});

document.getElementById('btn-report-backup')?.addEventListener('click', () => createBackup());
document.getElementById('btn-report-backup-in-modal')?.addEventListener('click', () => createBackup());

document.getElementById('btn-report-period')?.addEventListener('click', () => {
  const fromInput = document.getElementById('report-from') as HTMLInputElement;
  const toInput = document.getElementById('report-to') as HTMLInputElement;
  if (fromInput && toInput && !fromInput.value) fromInput.value = toInput.value = todayStr();
  openReportModal('report-modal-period');
});

document.getElementById('btn-report-inventory')?.addEventListener('click', () => {
  openReportModal('report-modal-inventory', () => loadInventoryValue());
});

document.getElementById('report-modal-day-close')?.addEventListener('click', () => closeReportModal('report-modal-day'));
document.getElementById('report-modal-period-close')?.addEventListener('click', () => closeReportModal('report-modal-period'));
document.getElementById('report-modal-inventory-close')?.addEventListener('click', () => closeReportModal('report-modal-inventory'));

document.getElementById('report-modal-day')?.addEventListener('click', (e) => { if (e.target && (e.target as HTMLElement).id === 'report-modal-day') closeReportModal('report-modal-day'); });
document.getElementById('report-modal-period')?.addEventListener('click', (e) => { if (e.target && (e.target as HTMLElement).id === 'report-modal-period') closeReportModal('report-modal-period'); });
document.getElementById('report-modal-inventory')?.addEventListener('click', (e) => { if (e.target && (e.target as HTMLElement).id === 'report-modal-inventory') closeReportModal('report-modal-inventory'); });

function renderPagination(containerId: string, totalItems: number, currentPage: number, onPageChange: (page: number) => void) {
  const totalPages = Math.ceil(totalItems / ROWS_PER_PAGE) || 1;
  const el = document.getElementById(containerId);
  if (!el) return;
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
  document.getElementById(`${containerId}-prev`)?.addEventListener('click', () => { if (currentPage > 1) onPageChange(currentPage - 1); });
  document.getElementById(`${containerId}-next`)?.addEventListener('click', () => { if (currentPage < totalPages) onPageChange(currentPage + 1); });
}

function renderTopProductsTable(data: TopProductRow[], page = 1) {
  const tbody = document.getElementById('top-products-tbody')!;
  const paginationEl = document.getElementById('top-products-pagination')!;
  const totalPages = Math.ceil(data.length / ROWS_PER_PAGE) || 1;
  const p = Math.max(1, Math.min(page, totalPages));
  const slice = data.slice((p - 1) * ROWS_PER_PAGE, p * ROWS_PER_PAGE);
  tbody.innerHTML = slice
    .map(
      (row, i) => {
        const cost = row.totalCostUsd ?? 0;
        const profit = row.profitUsd ?? (Number(row.totalUsd) - cost);
        const margin = (row.totalUsd ?? 0) > 0 ? ((row.marginPercent ?? (profit / Number(row.totalUsd) * 100))) : 0;
        const globalIndex = (p - 1) * ROWS_PER_PAGE + i + 1;
        return `<tr>
          <td>${globalIndex}</td>
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
  renderPagination('top-products-pagination', data.length, p, (newPage) => {
    currentTopProductsPage = newPage;
    renderTopProductsTable(topProductsData, newPage);
  });
}

async function loadTopProducts() {
  const tbody = document.getElementById('top-products-tbody')!;
  const msg = document.getElementById('top-products-msg')!;
  try {
    const data = await getJson<TopProductRow[]>('/api/reports/top-products?limit=100');
    topProductsData = data;
    currentTopProductsPage = 1;
    if (data.length === 0) {
      msg.textContent = 'No hay ventas registradas.';
      tbody.innerHTML = '';
      (document.getElementById('top-products-pagination') as HTMLElement).innerHTML = '';
      return;
    }
    msg.textContent = '';
    renderTopProductsTable(data, 1);
  } catch (e) {
    msg.textContent = 'Error al cargar Productos más vendidos.';
    tbody.innerHTML = '';
    (document.getElementById('top-products-pagination') as HTMLElement).innerHTML = '';
    if (typeof (window as any).showAlert === 'function') (window as any).showAlert({ title: 'Error', message: 'Error al cargar Productos más vendidos.', type: 'error' });
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

document.getElementById('btn-print-report')?.addEventListener('click', async () => {
  const openPrintWindow = (window as any).openPrintWindow;
  if (typeof openPrintWindow !== 'function') {
    if (typeof (window as any).showAlert === 'function') (window as any).showAlert({ title: 'Error', message: 'No se pudo abrir la ventana de impresión.', type: 'error' });
    else alert('No se pudo abrir la ventana de impresión.');
    return;
  }
  let dayContent = document.getElementById('day-summary-content')?.innerHTML ?? '';
  const periodContent = document.getElementById('period-summary-content')?.innerHTML ?? '';
  let invContent = document.getElementById('inventory-value-content')?.innerHTML ?? '';
  if (dayContent.includes('day-summary-msg') || dayContent.includes('Cargando')) {
    try {
      const data = await getJson<DaySummary>('/api/reports/day-summary-with-profit');
      const cost = data.totalCostUsd ?? 0;
      const profit = data.profitUsd ?? (data.totalUsd ?? 0) - cost;
      const margin = data.marginPercent ?? ((data.totalUsd ?? 0) > 0 ? (profit / (data.totalUsd ?? 0)) * 100 : 0);
      dayContent = `<div class="reports-summary__row"><strong>Ventas hoy:</strong> ${data.count}</div><div class="reports-summary__row"><strong>Total USD:</strong> $${Number(data.totalUsd ?? 0).toFixed(2)}</div><div class="reports-summary__row"><strong>Total Bs:</strong> Bs ${Number(data.totalBs ?? 0).toFixed(2)}</div><div class="reports-summary__row"><strong>Costo USD:</strong> $${Number(cost).toFixed(2)}</div><div class="reports-summary__row"><strong>Utilidad USD:</strong> $${Number(profit).toFixed(2)}</div><div class="reports-summary__row"><strong>Margen %:</strong> ${Number(margin).toFixed(1)}%</div>`;
    } catch (_) { dayContent = '—'; }
  }
  if (invContent.includes('inventory-value-msg') || invContent.includes('Cargando')) {
    try {
      const data = await getJson<InventoryValue>('/api/reports/inventory-value');
      invContent = `<div class="reports-summary__row"><strong>Valor en costo:</strong> $${Number(data.totalCostValue ?? 0).toFixed(2)} USD</div><div class="reports-summary__row"><strong>Valor a precio de venta:</strong> $${Number(data.totalListValue ?? 0).toFixed(2)} USD</div><div class="reports-summary__row"><strong>Productos:</strong> ${data.totalProducts ?? 0} · <strong>Unidades:</strong> ${data.totalUnits ?? 0}</div>`;
    } catch (_) { invContent = '—'; }
  }
  const topRows = topProductsData
    .map(
      (row, i) => {
        const cost = row.totalCostUsd ?? 0;
        const profit = row.profitUsd ?? (Number(row.totalUsd) - cost);
        const margin = (row.totalUsd ?? 0) > 0 ? ((row.marginPercent ?? (profit / Number(row.totalUsd) * 100))) : 0;
        return `<tr><td>${i + 1}</td><td>${(row.productName || '—').replace(/</g, '&lt;')}</td><td>${(row.productSku || '—').replace(/</g, '&lt;')}</td><td>${row.totalQuantity}</td><td>$${Number(row.totalUsd).toFixed(2)}</td><td>$${Number(cost).toFixed(2)}</td><td>$${Number(profit).toFixed(2)}</td><td>${Number(margin).toFixed(1)}%</td></tr>`;
      }
    )
    .join('');
  const topTable = `<h2>Productos más vendidos</h2><table><thead><tr><th>#</th><th>Producto</th><th>SKU</th><th>Cant. vendida</th><th>Ventas USD</th><th>Costo USD</th><th>Utilidad USD</th><th>Margen %</th></tr></thead><tbody>${topRows}</tbody></table>`;
  const html = '<h1>Reporte</h1><h2>Cierre del Día (Hoy)</h2><div class="reports-summary">' + dayContent + '</div><h2>Ventas por período</h2><div class="reports-summary">' + periodContent + '</div><h2>Valor del Inventario</h2><div class="reports-summary">' + invContent + '</div>' + topTable;
  openPrintWindow('Reporte', html);
});

loadTopProducts();
export {};
