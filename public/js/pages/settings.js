const API = '';
(function hideAdminOnlySettings() {
    const user = typeof window.getAuthUser === 'function' ? window.getAuthUser() : null;
    if (!user || user.role !== 'admin') {
        document.querySelectorAll('.settings-card--admin-only').forEach(function (el) {
            el.style.display = 'none';
        });
    }
})();
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
    const showAlert = window.showAlert;
    if (typeof showAlert === 'function') {
        showAlert({ title: isError ? 'Aviso' : 'Listo', message: text, type: isError ? 'error' : 'success' });
        return;
    }
    el.textContent = text;
    el.className = isError ? 'msg msg--error' : 'msg msg--success';
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 3000);
}
async function loadRate() {
    const r = await getJson('/api/settings/exchange-rate');
    document.getElementById('exchange-rate').value = String(r.exchangeRate);
}
const ROWS_PER_PAGE = 7;
let rateHistoryList = [];
let rateHistoryPage = 1;
function renderRateHistoryPagination(containerId, totalItems, currentPage, onPageChange) {
    const totalPages = Math.ceil(totalItems / ROWS_PER_PAGE) || 1;
    const el = document.getElementById(containerId);
    if (!el) return;
    if (totalItems === 0) { el.innerHTML = ''; return; }
    const start = (currentPage - 1) * ROWS_PER_PAGE + 1;
    const end = Math.min(currentPage * ROWS_PER_PAGE, totalItems);
    el.innerHTML = '<span class="table-pagination__range">Mostrando ' + start + '-' + end + ' de ' + totalItems + '</span><div class="table-pagination__nav"><button type="button" class="btn btn--ghost btn--sm" id="' + containerId + '-prev"' + (currentPage <= 1 ? ' disabled' : '') + '>Anterior</button><span>Página ' + currentPage + ' de ' + totalPages + '</span><button type="button" class="btn btn--ghost btn--sm" id="' + containerId + '-next"' + (currentPage >= totalPages ? ' disabled' : '') + '>Siguiente</button></div>';
    document.getElementById(containerId + '-prev')?.addEventListener('click', function () { if (currentPage > 1) onPageChange(currentPage - 1); });
    document.getElementById(containerId + '-next')?.addEventListener('click', function () { if (currentPage < totalPages) onPageChange(currentPage + 1); });
}
function renderRateHistory(history, page) {
    const tbody = document.getElementById('rate-history-tbody');
    const msg = document.getElementById('rate-history-msg');
    if (!history.length) {
        msg.textContent = 'Aún no hay cambios de tasa registrados. Al guardar una tasa se creará el historial.';
        tbody.innerHTML = '';
        document.getElementById('rate-history-pagination').innerHTML = '';
        return;
    }
    msg.textContent = '';
    const totalPages = Math.ceil(history.length / ROWS_PER_PAGE) || 1;
    const p = Math.max(1, Math.min(page || 1, totalPages));
    const slice = history.slice((p - 1) * ROWS_PER_PAGE, p * ROWS_PER_PAGE);
    tbody.innerHTML = slice
        .map((row) => '<tr><td>' + formatDateTime(row.createdAt) + '</td><td><strong>' + Number(row.rate).toFixed(2) + '</strong></td><td class="text-muted">' + (row.notes || '—') + '</td></tr>')
        .join('');
    renderRateHistoryPagination('rate-history-pagination', history.length, p, function (newPage) {
        rateHistoryPage = newPage;
        renderRateHistory(rateHistoryList, newPage);
    });
}
async function loadRateHistory() {
    const tbody = document.getElementById('rate-history-tbody');
    const msg = document.getElementById('rate-history-msg');
    try {
        const history = await getJson('/api/settings/exchange-rate-history?limit=100');
        rateHistoryList = history;
        rateHistoryPage = 1;
        renderRateHistory(history, 1);
    }
    catch (e) {
        msg.textContent = 'Error al cargar el historial.';
        tbody.innerHTML = '';
        document.getElementById('rate-history-pagination').innerHTML = '';
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
const restoreFile = document.getElementById('restore-file');
const btnRestore = document.getElementById('btn-restore');
const restoreMsg = document.getElementById('restore-msg');
if (restoreFile && btnRestore && restoreMsg) {
    restoreFile.addEventListener('change', () => {
        btnRestore.setAttribute('disabled', 'true');
        if (restoreFile.files && restoreFile.files.length > 0)
            btnRestore.removeAttribute('disabled');
    });
    btnRestore.addEventListener('click', async () => {
        if (!restoreFile.files || restoreFile.files.length === 0)
            return;
        const file = restoreFile.files[0];
        restoreMsg.style.display = 'block';
        restoreMsg.textContent = 'Enviando…';
        restoreMsg.className = 'text-muted mt-1 mb-0';
        try {
            const buf = await file.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let binary = '';
            const chunk = 8192;
            for (let i = 0; i < bytes.length; i += chunk) {
                const slice = bytes.subarray(i, i + chunk);
                binary += String.fromCharCode.apply(null, Array.from(slice));
            }
            const b64 = btoa(binary);
            const res = await fetch(`${API}/api/backup/restore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: b64 }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.ok) {
                const msg = data.message || 'Listo. Reinicie el servidor para completar la restauración.';
                restoreMsg.textContent = msg;
                restoreMsg.className = 'msg msg--success mt-1 mb-0';
                restoreFile.value = '';
                btnRestore.setAttribute('disabled', 'true');
                if (typeof window.showAlert === 'function') window.showAlert({ title: 'Listo', message: msg, type: 'success' });
            }
            else {
                const errMsg = data.error || 'Error al restaurar.';
                restoreMsg.textContent = errMsg;
                restoreMsg.className = 'msg msg--error mt-1 mb-0';
                if (typeof window.showAlert === 'function') window.showAlert({ title: 'Error', message: errMsg, type: 'error' });
            }
        }
        catch (e) {
            restoreMsg.textContent = 'Error de conexión.';
            restoreMsg.className = 'msg msg--error mt-1 mb-0';
            if (typeof window.showAlert === 'function') window.showAlert({ title: 'Error', message: 'Error de conexión.', type: 'error' });
        }
    });
}
const btnRestoreDemo = document.getElementById('btn-restore-demo');
const restoreDemoMsg = document.getElementById('restore-demo-msg');
if (btnRestoreDemo && restoreDemoMsg) {
    btnRestoreDemo.addEventListener('click', async () => {
        restoreDemoMsg.style.display = 'block';
        restoreDemoMsg.textContent = 'Preparando…';
        restoreDemoMsg.className = 'text-muted mt-1 mb-0';
        try {
            const res = await fetch(`${API}/api/backup/restore-demo`, { method: 'POST' });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.ok) {
                const msg = data.message || 'Reinicie el servidor para cargar la base de demostración.';
                restoreDemoMsg.textContent = msg;
                restoreDemoMsg.className = 'msg msg--success mt-1 mb-0';
                if (typeof window.showAlert === 'function') window.showAlert({ title: 'Listo', message: msg, type: 'success' });
            }
            else {
                const errMsg = data.error || 'Error. Asegúrese de que demoBD.db exista (ejecute: node scripts/create-demo-db.js).';
                restoreDemoMsg.textContent = errMsg;
                restoreDemoMsg.className = 'msg msg--error mt-1 mb-0';
                if (typeof window.showAlert === 'function') window.showAlert({ title: 'Error', message: errMsg, type: 'error' });
            }
        }
        catch (e) {
            restoreDemoMsg.textContent = 'Error de conexión.';
            restoreDemoMsg.className = 'msg msg--error mt-1 mb-0';
            if (typeof window.showAlert === 'function') window.showAlert({ title: 'Error', message: 'Error de conexión.', type: 'error' });
        }
    });
}
const btnDeleteDb = document.getElementById('btn-delete-db');
const deleteDbMsg = document.getElementById('delete-db-msg');
if (btnDeleteDb && deleteDbMsg) {
    btnDeleteDb.addEventListener('click', async () => {
        if (!confirm('¿Eliminar la base de datos actual? Se borrarán todos los datos. Puede restaurar después desde una copia o la demo.'))
            return;
        deleteDbMsg.style.display = 'block';
        deleteDbMsg.textContent = 'Eliminando…';
        deleteDbMsg.className = 'text-muted mt-1 mb-0';
        try {
            const res = await fetch(`${API}/api/backup/delete-database`, { method: 'POST' });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.ok) {
                const msg = data.message || 'Base de datos eliminada. Recargando…';
                deleteDbMsg.textContent = msg;
                deleteDbMsg.className = 'msg msg--success mt-1 mb-0';
                if (typeof window.showAlert === 'function') window.showAlert({ title: 'Listo', message: msg, type: 'success' });
                setTimeout(() => window.location.replace('/login.html'), 2000);
            }
            else {
                const errMsg = data.error || 'Error al eliminar.';
                deleteDbMsg.textContent = errMsg;
                deleteDbMsg.className = 'msg msg--error mt-1 mb-0';
                if (typeof window.showAlert === 'function') window.showAlert({ title: 'Error', message: errMsg, type: 'error' });
            }
        }
        catch (e) {
            deleteDbMsg.textContent = 'Error de conexión.';
            deleteDbMsg.className = 'msg msg--error mt-1 mb-0';
            if (typeof window.showAlert === 'function') window.showAlert({ title: 'Error', message: 'Error de conexión.', type: 'error' });
        }
    });
}
document.getElementById('btn-print-settings')?.addEventListener('click', async () => {
    if (typeof window.openPrintWindow !== 'function') return;
    try {
        const [rateRes, history] = await Promise.all([
            getJson('/api/settings/exchange-rate'),
            getJson('/api/settings/exchange-rate-history').catch(() => []),
        ]);
        let html = '<h1>Configuración - KUMA</h1><h2>Tasa de cambio (USD → Bs)</h2><p><strong>Tasa actual:</strong> ' + Number(rateRes?.exchangeRate ?? 0).toFixed(2) + ' Bs por 1 USD</p>';
        html += '<h2>Historial de tasas</h2><table><thead><tr><th>Fecha</th><th>Tasa (Bs/USD)</th><th>Notas</th></tr></thead><tbody>';
        (Array.isArray(history) ? history : []).forEach((row) => {
            html += '<tr><td>' + formatDateTime(row.createdAt) + '</td><td>' + Number(row.rate).toFixed(2) + '</td><td>' + (row.notes || '—').replace(/</g, '&lt;') + '</td></tr>';
        });
        html += '</tbody></table>';
        window.openPrintWindow('Configuración - KUMA', html);
    } catch (e) {
        if (typeof window.showAlert === 'function')
            window.showAlert({ title: 'Error', message: 'Error al cargar la configuración.', type: 'error' });
        else alert('Error al cargar la configuración.');
    }
});
loadRate();
loadRateHistory();
export {};
