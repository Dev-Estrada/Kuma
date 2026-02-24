const API = '';
async function getJson(url) {
    const res = await fetch(`${API}${url}`);
    if (!res.ok)
        throw new Error(res.statusText);
    return res.json();
}
function formatDateTime(s) {
    const d = new Date(s);
    return d.toLocaleDateString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}
async function loadSalesList() {
    const tbody = document.getElementById('sales-tbody');
    const msg = document.getElementById('sales-msg');
    try {
        const sales = await getJson('/api/sales?limit=200');
        if (sales.length === 0) {
            msg.textContent = 'No hay ventas registradas.';
            tbody.innerHTML = '';
            return;
        }
        msg.textContent = '';
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
    catch (e) {
        msg.textContent = 'Error al cargar las ventas.';
        tbody.innerHTML = '';
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
loadSalesList();
export {};
