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
document.getElementById('btn-save-rate')?.addEventListener('click', saveRate);
loadRate();
loadRateHistory();
export {};
