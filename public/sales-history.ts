const API = '';

interface SaleListItem {
  id: number;
  totalUsd: number;
  totalBs: number;
  exchangeRate: number;
  discountPercent?: number;
  createdAt: string;
  itemCount?: number;
}

interface SaleItemDetail {
  productId: number;
  productName: string;
  productSku: string;
  quantity: number;
  unitPriceUsd: number;
  subtotalUsd: number;
}

interface SaleDetail {
  id: number;
  totalUsd: number;
  totalBs: number;
  exchangeRate: number;
  discountPercent?: number;
  notes?: string;
  createdAt: string;
  items: SaleItemDetail[];
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(`${API}${url}`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json() as Promise<T>;
}

function formatDateTime(s: string): string {
  if (!s) return '—';
  const iso = s.includes('T') ? s : s.replace(' ', 'T');
  const d = new Date(iso.includes('Z') || /[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + '-04:00');
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

function renderSalesRows(sales: SaleListItem[]) {
  const tbody = document.getElementById('sales-tbody')!;
  tbody.innerHTML = sales
    .map(
      (s) =>
        `<tr>
          <td><strong>#${s.id}</strong></td>
          <td>${formatDateTime(s.createdAt)}</td>
          <td>${Number(s.exchangeRate).toFixed(2)}</td>
          <td>$${Number(s.totalUsd).toFixed(2)}</td>
          <td>Bs ${Number(s.totalBs).toFixed(2)}</td>
          <td>${s.itemCount ?? '-'}</td>
          <td><button type="button" class="btn btn--sm btn--ghost btn-view-detail" data-sale-id="${s.id}">Ver detalle</button></td>
        </tr>`
    )
    .join('');
}

let allSales: SaleListItem[] = [];

async function loadSalesList() {
  const tbody = document.getElementById('sales-tbody')!;
  const msg = document.getElementById('sales-msg')!;
  try {
    const sales = await getJson<SaleListItem[]>('/api/sales?limit=200');
    allSales = sales;
    if (sales.length === 0) {
      msg.textContent = 'No hay ventas registradas.';
      tbody.innerHTML = '';
      return;
    }
    msg.textContent = '';
    applySaleFilter();
  } catch (e) {
    msg.textContent = 'Error al cargar las ventas.';
    tbody.innerHTML = '';
  }
}

function applySaleFilter() {
  const q = (document.getElementById('sale-search') as HTMLInputElement)?.value.trim() || '';
  const msg = document.getElementById('sales-msg')!;
  if (!q) {
    renderSalesRows(allSales);
    msg.textContent = '';
    return;
  }
  const filtered = allSales.filter((s) => String(s.id).includes(q));
  renderSalesRows(filtered);
  if (filtered.length === 0) {
    msg.textContent = `Ninguna venta coincide con el ID "${q}".`;
  } else {
    msg.textContent = `${filtered.length} venta(s) encontrada(s).`;
  }
}

function openDetailModal(sale: SaleDetail) {
  const modal = document.getElementById('sale-detail-modal')!;
  const title = document.getElementById('sale-detail-title')!;
  const content = document.getElementById('sale-detail-content')!;
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
            .map(
              (i) =>
                `<tr>
                  <td>${i.productName}</td>
                  <td>${i.productSku}</td>
                  <td>${i.quantity}</td>
                  <td>$${Number(i.unitPriceUsd).toFixed(2)}</td>
                  <td>$${Number(i.subtotalUsd).toFixed(2)}</td>
                </tr>`
            )
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
  (document.getElementById('sale-detail-modal') as HTMLElement).style.display = 'none';
}

document.getElementById('sales-tbody')?.addEventListener('click', async (e) => {
  const btn = (e.target as HTMLElement).closest('.btn-view-detail');
  if (!btn) return;
  const id = Number(btn.getAttribute('data-sale-id'));
  try {
    const sale = await getJson<SaleDetail>(`/api/sales/${id}`);
    openDetailModal(sale);
  } catch (_) {
    alert('Error al cargar el detalle de la venta.');
  }
});

document.getElementById('btn-close-detail')?.addEventListener('click', closeDetailModal);
document.getElementById('sale-detail-modal')?.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).classList.contains('overlay')) closeDetailModal();
});

document.getElementById('sale-search')?.addEventListener('input', applySaleFilter);
document.getElementById('sale-search')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
});

loadSalesList();
export {};
