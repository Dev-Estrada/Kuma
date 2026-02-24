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
        const [products, lowStock, rateRes, sales, lastRate, expiring] = await Promise.all([
            getJson('/api/products'),
            getJson('/api/products/low-stock'),
            getJson('/api/settings/exchange-rate'),
            getJson('/api/sales?limit=50'),
            getJson('/api/settings/last-rate-update').catch(() => ({ lastUpdate: null })),
            getJson('/api/products/expiring?days=30').catch(() => []),
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
        const rateReminder = document.getElementById('rate-reminder-alert');
        if (rateReminder && lastRate?.lastUpdate) {
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
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => { });
}
loadDashboard();
export {};
