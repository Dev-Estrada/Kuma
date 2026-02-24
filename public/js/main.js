const API = '';
let dashboardSales = [];
let dashboardLowStock = [];

async function getJson(url) {
    const res = await fetch(`${API}${url}`);
    if (!res.ok)
        throw new Error(res.statusText);
    return res.json();
}
function formatDate(s) {
    try {
        if (s == null)
            return '—';
        if (typeof s === 'number') {
            const d = new Date(s);
            return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
        const raw = String(s).trim();
        if (!raw)
            return '—';
        const iso = raw.includes('T') ? raw : raw.replace(/\s+/, 'T');
        const withTz = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + '-04:00';
        const d = new Date(withTz);
        if (Number.isNaN(d.getTime()))
            return raw;
        return d.toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    catch {
        return typeof s === 'string' ? s : '—';
    }
}
function todayStr() {
    const d = new Date();
    const y = d.toLocaleString('en-CA', { timeZone: 'America/Caracas', year: 'numeric' });
    const m = d.toLocaleString('en-CA', { timeZone: 'America/Caracas', month: '2-digit' });
    const day = d.toLocaleString('en-CA', { timeZone: 'America/Caracas', day: '2-digit' });
    return `${y}-${m}-${day}`;
}
async function loadDashboard() {
    try {
        const [products, lowStock, rateRes, sales, lastRate, expiring] = await Promise.all([
            getJson('/api/products'),
            getJson('/api/products/low-stock'),
            getJson('/api/settings/exchange-rate'),
            getJson('/api/sales?limit=50'),
            getJson('/api/settings/last-rate-update').catch(() => ({ lastUpdate: null })),
            getJson('/api/products/expiring?days=30').catch(() => []),
        ]);
        const activeCount = products.length;
        const statProducts = document.getElementById('stat-products');
        const statLow = document.getElementById('stat-low');
        const statRate = document.getElementById('stat-rate');
        const statSales = document.getElementById('stat-sales');
        if (statProducts) statProducts.textContent = String(activeCount);
        if (statLow) statLow.textContent = String((lowStock || []).length);
        if (statRate) statRate.textContent = String(rateRes?.exchangeRate ?? '—');
        const today = todayStr();
        const salesToday = (sales || []).filter((s) => (s.createdAt || '').slice(0, 10) === today);
        if (statSales) statSales.textContent = String(salesToday.length);
        dashboardSales = sales || [];
        dashboardLowStock = lowStock || [];
        const lowStockMsg = document.getElementById('low-stock-msg');
        if (lowStockMsg) {
            lowStockMsg.textContent = lowStock.length > 0
                ? `${lowStock.length} producto(s) con bajo stock.`
                : 'Ningún producto con bajo stock.';
        }
        const rateReminder = document.getElementById('rate-reminder-alert');
        if (rateReminder != null && lastRate?.lastUpdate) {
            const last = new Date(lastRate.lastUpdate);
            const days = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
            rateReminder.style.display = days > 7 ? 'block' : 'none';
        }
        const expiringCard = document.getElementById('expiring-card');
        const expiringTbody = document.getElementById('expiring-tbody');
        const expiringMsg = document.getElementById('expiring-msg');
        if (expiringCard && expiringTbody && expiringMsg) {
            if (expiring.length > 0) {
                expiringCard.style.display = 'block';
                expiringMsg.textContent = '';
                expiringTbody.innerHTML = expiring
                    .slice(0, 10)
                    .map((p) => `<tr>
                <td>${p.name || p.sku || '—'}</td>
                <td>${p.sku || '—'}</td>
                <td>${p.expiryDate || '—'}</td>
              </tr>`)
                    .join('');
            }
            else {
                expiringCard.style.display = 'none';
            }
        }
        const msg = document.getElementById('recent-sales-msg');
        if (msg) {
            const total = (sales || []).length;
            msg.textContent = total === 0 ? 'No hay ventas recientes.' : `${total} venta(s) reciente(s).`;
        }
    }
    catch (e) {
        console.error(e);
        const statProductsEl = document.getElementById('stat-products');
        if (statProductsEl) statProductsEl.textContent = '—';
        const msgEl = document.getElementById('recent-sales-msg');
        if (msgEl) {
            msgEl.textContent = 'Error al cargar datos. ';
            const retry = document.createElement('button');
            retry.className = 'btn btn--sm btn--ghost';
            retry.textContent = 'Reintentar';
            retry.type = 'button';
            retry.onclick = () => loadDashboard();
            msgEl.appendChild(retry);
        }
    }
}
function openRecentSalesModal() {
    const modal = document.getElementById('dashboard-modal-recent-sales');
    const tbody = document.getElementById('dashboard-modal-recent-sales-tbody');
    if (!modal || !tbody) return;
    const list = dashboardSales.slice(0, 50);
    tbody.innerHTML = list.length === 0
        ? '<tr><td colspan="5" class="text-muted">No hay ventas.</td></tr>'
        : list.map((s) => `<tr>
              <td>${s.id}</td>
              <td>${formatDate(s.createdAt || '')}</td>
              <td>$${Number(s.totalUsd).toFixed(2)}</td>
              <td>Bs ${Number(s.totalBs).toFixed(2)}</td>
              <td>${s.itemCount ?? '-'}</td>
            </tr>`).join('');
    modal.style.display = 'flex';
}

function closeRecentSalesModal() {
    const modal = document.getElementById('dashboard-modal-recent-sales');
    if (modal) modal.style.display = 'none';
}

function openLowStockModal() {
    const modal = document.getElementById('dashboard-modal-low-stock');
    const tbody = document.getElementById('dashboard-modal-low-stock-tbody');
    if (!modal || !tbody) return;
    const list = dashboardLowStock;
    tbody.innerHTML = list.length === 0
        ? '<tr><td colspan="5" class="text-muted">Ningún producto con bajo stock.</td></tr>'
        : list.map((p) => `<tr>
              <td>${(p.name || p.sku || '').replace(/</g, '&lt;')}</td>
              <td>${(p.sku || '').replace(/</g, '&lt;')}</td>
              <td class="stock-low">${p.quantity}</td>
              <td>${p.minimumStock}</td>
              <td class="stock-low">${p.missingUnits ?? (p.minimumStock - p.quantity)}</td>
            </tr>`).join('');
    modal.style.display = 'flex';
}

function closeLowStockModal() {
    const modal = document.getElementById('dashboard-modal-low-stock');
    if (modal) modal.style.display = 'none';
}

document.getElementById('btn-show-recent-sales')?.addEventListener('click', openRecentSalesModal);
document.getElementById('btn-close-recent-sales')?.addEventListener('click', closeRecentSalesModal);
document.getElementById('dashboard-modal-recent-sales')?.addEventListener('click', (e) => {
    if (e.target.id === 'dashboard-modal-recent-sales') closeRecentSalesModal();
});

document.getElementById('btn-show-low-stock')?.addEventListener('click', openLowStockModal);
document.getElementById('btn-close-low-stock')?.addEventListener('click', closeLowStockModal);
document.getElementById('dashboard-modal-low-stock')?.addEventListener('click', (e) => {
    if (e.target.id === 'dashboard-modal-low-stock') closeLowStockModal();
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => { });
}
loadDashboard();
export {};
