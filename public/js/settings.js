const API = '';
async function getJson(url) {
    const res = await fetch(`${API}${url}`);
    if (!res.ok)
        throw new Error(res.statusText);
    return res.json();
}
function formatDateTime(s) {
    try {
        if (s == null)
            return '—';
        if (typeof s === 'number') {
            const d = new Date(s);
            if (Number.isNaN(d.getTime()))
                return '—';
            return d.toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
        const raw = String(s).trim();
        if (!raw)
            return '—';
        const iso = raw.includes('T') ? raw : raw.replace(/\s+/, 'T');
        const withTz = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + '-04:00';
        const d = new Date(withTz);
        if (Number.isNaN(d.getTime()))
            return raw;
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
    catch {
        return typeof s === 'string' ? s : '—';
    }
}
function showMsg(el, text, isError) {
    el.textContent = text;
    el.className = isError ? 'msg msg--error' : 'msg msg--success';
    el.style.display = 'block';
    setTimeout(() => {
        el.style.display = 'none';
    }, 3000);
}
async function loadRate() {
    const r = await getJson('/api/settings/exchange-rate');
    document.getElementById('exchange-rate').value = String(r.exchangeRate);
}
async function loadRateHistory() {
    const tbody = document.getElementById('rate-history-tbody');
    const msg = document.getElementById('rate-history-msg');
    try {
        const history = await getJson('/api/settings/exchange-rate-history?limit=100');
        if (history.length === 0) {
            msg.textContent = 'Aún no hay cambios de tasa registrados. Al guardar una tasa se creará el historial.';
            tbody.innerHTML = '';
            return;
        }
        msg.textContent = '';
        tbody.innerHTML = history
            .map((row) => `<tr>
            <td>${formatDateTime(row.createdAt)}</td>
            <td><strong>${Number(row.rate).toFixed(2)}</strong></td>
            <td class="text-muted">${row.notes || '—'}</td>
          </tr>`)
            .join('');
    }
    catch (e) {
        msg.textContent = 'Error al cargar el historial.';
        tbody.innerHTML = '';
    }
}
async function saveRate() {
    const input = document.getElementById('exchange-rate');
    const notesInput = document.getElementById('rate-notes');
    const msgEl = document.getElementById('settings-msg');
    const rate = parseFloat(input.value);
    if (isNaN(rate) || rate <= 0) {
        showMsg(msgEl, 'Ingresa una tasa válida mayor que cero.', true);
        return;
    }
    try {
        const res = await fetch(`${API}/api/settings/exchange-rate`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rate, notes: (notesInput?.value || '').trim() || undefined }),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            showMsg(msgEl, data.error || 'Error al guardar', true);
            return;
        }
        showMsg(msgEl, 'Tasa guardada. Quedó registrada en el historial.', false);
        if (notesInput)
            notesInput.value = '';
        loadRate();
        loadRateHistory();
    }
    catch (e) {
        showMsg(msgEl, 'Error al guardar.', true);
    }
}
const THEME_KEY = 'theme';
function getTheme() {
    return (localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light');
}
function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
    const label = document.getElementById('theme-toggle-label');
    if (label)
        label.textContent = theme === 'dark' ? 'Modo claro' : 'Modo oscuro';
}
function toggleTheme() {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}
document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
setTheme(getTheme());
document.getElementById('btn-save-rate')?.addEventListener('click', saveRate);
async function showRateReminder() {
    try {
        const r = await getJson('/api/settings/last-rate-update');
        if (!r.lastUpdate)
            return;
        const last = new Date(r.lastUpdate);
        const days = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
        if (days > 7) {
            const banner = document.getElementById('rate-reminder-banner');
            if (banner) {
                banner.innerHTML = `La tasa de cambio no se actualiza desde hace más de 7 días. Actualízala para reflejar el valor correcto en bolívares. <a href="settings.html" class="alert__link">Actualizar aquí</a>`;
                banner.style.display = 'block';
            }
        }
    }
    catch (_) { }
}
const rateBanner = document.getElementById('rate-reminder-banner');
if (rateBanner)
    showRateReminder();
const backupLink = document.getElementById('btn-backup');
if (backupLink)
    backupLink.href = `${API}/api/backup`;
loadRate();
loadRateHistory();
export {};
