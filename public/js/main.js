const API = '';
async function getJson(url) {
    const res = await fetch(`${API}${url}`);
    if (!res.ok)
        throw new Error(res.statusText);
    return res.json();
}
function formatDate(s) {
    const d = new Date(s);
    return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function todayStr() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}
async function loadDashboard() {
    try {
        const [products, lowStock, rateRes, sales] = await Promise.all([
            getJson('/api/products'),
            getJson('/api/products/low-stock'),
            getJson('/api/settings/exchange-rate'),
            getJson('/api/sales?limit=50'),
        ]);
        const activeCount = products.length;
        document.getElementById('stat-products').textContent = String(activeCount);
        document.getElementById('stat-low').textContent = String(lowStock.length);
        document.getElementById('stat-rate').textContent = String(rateRes.exchangeRate);
        const today = todayStr();
        const salesToday = sales.filter((s) => (s.createdAt || '').slice(0, 10) === today);
        document.getElementById('stat-sales').textContent = String(salesToday.length);
        const alertEl = document.getElementById('low-stock-alert');
        const alertText = document.getElementById('low-stock-alert-text');
        const lowStockCard = document.getElementById('low-stock-card');
        const lowStockTbody = document.getElementById('low-stock-tbody');
        if (lowStock.length > 0) {
            alertEl.style.display = 'block';
            alertText.textContent = `${lowStock.length} producto(s) con stock por debajo del mínimo.`;
            lowStockCard.style.display = 'block';
            lowStockTbody.innerHTML = lowStock
                .map((p) => `<tr>
              <td>${p.name || p.sku}</td>
              <td>${p.sku}</td>
              <td class="stock-low">${p.quantity}</td>
              <td>${p.minimumStock}</td>
              <td class="stock-low">${p.missingUnits ?? (p.minimumStock - p.quantity)}</td>
            </tr>`)
                .join('');
        }
        else {
            alertEl.style.display = 'none';
            lowStockCard.style.display = 'none';
        }
        const tbody = document.getElementById('recent-sales');
        const msg = document.getElementById('recent-sales-msg');
        const recent = sales.slice(0, 10);
        if (recent.length === 0) {
            msg.textContent = 'No hay ventas recientes.';
            tbody.innerHTML = '';
        }
        else {
            msg.textContent = '';
            tbody.innerHTML = recent
                .map((s) => `<tr>
              <td>${s.id}</td>
              <td>${formatDate(s.createdAt || '')}</td>
              <td>$${Number(s.totalUsd).toFixed(2)}</td>
              <td>Bs ${Number(s.totalBs).toFixed(2)}</td>
              <td>${s.itemCount ?? '-'}</td>
            </tr>`)
                .join('');
        }
    }
    catch (e) {
        console.error(e);
        document.getElementById('stat-products').textContent = '—';
        document.getElementById('recent-sales-msg').textContent = 'Error al cargar datos.';
    }
}
loadDashboard();
export {};
