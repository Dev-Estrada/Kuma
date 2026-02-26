const API = '';
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
        const [products, lowStock, rateRes, sales, lastRate] = await Promise.all([
            getJson('/api/products'),
            getJson('/api/products/low-stock'),
            getJson('/api/settings/exchange-rate'),
            getJson('/api/sales?limit=50'),
            getJson('/api/settings/last-rate-update').catch(() => ({ lastUpdate: null })),
        ]);
        const activeCount = products.length;
        document.getElementById('stat-products').textContent = String(activeCount);
        document.getElementById('stat-low').textContent = String(lowStock.length);
        document.getElementById('stat-rate').textContent = String(rateRes.exchangeRate);
        const today = todayStr();
        const salesToday = sales.filter((s) => (s.createdAt || '').slice(0, 10) === today);
        document.getElementById('stat-sales').textContent = String(salesToday.length);
        const lowStockMsg = document.getElementById('low-stock-msg');
        const lowStockTbody = document.getElementById('dashboard-modal-low-stock-tbody');
        if (lowStockMsg) {
            lowStockMsg.textContent = lowStock.length > 0
                ? `${lowStock.length} producto(s) con stock por debajo del mínimo.`
                : 'No hay productos con bajo stock.';
        }
        if (lowStockTbody) {
            lowStockTbody.innerHTML = lowStock
                .map((p) => `<tr>
              <td>${(p.name || p.sku || '').replace(/</g, '&lt;')}</td>
              <td>${(p.sku || '').replace(/</g, '&lt;')}</td>
              <td class="stock-low">${p.quantity}</td>
              <td>${p.minimumStock}</td>
              <td class="stock-low">${p.missingUnits ?? (p.minimumStock - p.quantity)}</td>
            </tr>`)
                .join('');
        }
        const rateReminder = document.getElementById('rate-reminder-alert');
        if (rateReminder && lastRate?.lastUpdate) {
            const last = new Date(lastRate.lastUpdate);
            const days = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
            rateReminder.style.display = days > 7 ? 'block' : 'none';
        }
        const tbody = document.getElementById('dashboard-modal-recent-sales-tbody');
        const msg = document.getElementById('recent-sales-msg');
        const recent = sales.slice(0, 10);
        if (msg)
            msg.textContent = recent.length === 0 ? 'No hay ventas recientes.' : '';
        if (tbody) {
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
        const statProducts = document.getElementById('stat-products');
        if (statProducts)
            statProducts.textContent = '—';
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
        if (typeof window.showAlert === 'function') {
            window.showAlert({ title: 'Error', message: 'No se pudieron cargar los datos del inicio.', type: 'error' });
        }
    }
}
function setupDashboardModals() {
    const btnRecent = document.getElementById('btn-show-recent-sales');
    const modalRecent = document.getElementById('dashboard-modal-recent-sales');
    const btnLow = document.getElementById('btn-show-low-stock');
    const modalLow = document.getElementById('dashboard-modal-low-stock');
    const btnCloseRecent = document.getElementById('btn-close-recent-sales');
    const btnCloseLow = document.getElementById('btn-close-low-stock');
    if (btnRecent && modalRecent) {
        btnRecent.addEventListener('click', () => { modalRecent.style.display = 'flex'; });
    }
    if (btnCloseRecent && modalRecent) {
        btnCloseRecent.addEventListener('click', () => { modalRecent.style.display = 'none'; });
    }
    if (btnLow && modalLow) {
        btnLow.addEventListener('click', () => { modalLow.style.display = 'flex'; });
    }
    if (btnCloseLow && modalLow) {
        btnCloseLow.addEventListener('click', () => { modalLow.style.display = 'none'; });
    }
}
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => { });
}
setupDashboardModals();
loadDashboard();
export {};
