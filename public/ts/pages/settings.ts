const API = '';
const ROWS_PER_PAGE = 7;

let rateHistoryData: RateHistoryRow[] = [];
let currentRateHistoryPage = 1;

function applyAdminOnlyVisibility() {
  const getAuthUser = (window as any).getAuthUser;
  const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
  const isAdmin = user && user.role === 'admin';
  document.querySelectorAll('.settings-btn--admin-only').forEach((el) => {
    (el as HTMLElement).style.display = isAdmin ? '' : 'none';
  });
}

function openSettingsModal(modalId: string, onOpen?: () => void) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    if (typeof onOpen === 'function') onOpen();
  }
}

function closeSettingsModal(modalId: string) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'none';
}

function updateBrandingPreview() {
  const preview = document.getElementById('branding-preview') as HTMLImageElement;
  if (!preview) return;
  const url = (window as any).getCustomLogo ? (window as any).getCustomLogo() : null;
  preview.src = url || '/assets/logo.png';
}
async function loadBrandingFromServer() {
  try {
    const r = await getJson('/api/settings/branding-logo');
    if (r && r.url && typeof (window as any).setCustomLogoUrl === 'function') {
      (window as any).setCustomLogoUrl(r.url);
      if (typeof (window as any).applyCustomBranding === 'function') (window as any).applyCustomBranding();
    }
  } catch (_) {}
}
document.getElementById('btn-settings-appearance')?.addEventListener('click', () => openSettingsModal('settings-modal-appearance', () => {
  loadBrandingFromServer().then(() => updateBrandingPreview());
}));
document.getElementById('btn-branding-select')?.addEventListener('click', () => document.getElementById('branding-logo-input')?.click());
document.getElementById('btn-branding-remove')?.addEventListener('click', async () => {
  try {
    await fetch(`${API}/api/settings/branding-logo`, { method: 'DELETE', credentials: 'same-origin' });
  } catch (_) {}
  if (typeof (window as any).setCustomLogoUrl === 'function') (window as any).setCustomLogoUrl(null);
  updateBrandingPreview();
  if (typeof (window as any).applyCustomBranding === 'function') (window as any).applyCustomBranding();
  if (typeof (window as any).showAlert === 'function') (window as any).showAlert({ title: 'Listo', message: 'Logo de fondo quitado.', type: 'success' });
});
document.getElementById('branding-logo-input')?.addEventListener('change', async function (e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input?.files?.[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('logo', file);
  try {
    const res = await fetch(`${API}/api/settings/branding-logo`, {
      method: 'POST',
      credentials: 'same-origin',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (typeof (window as any).showAlert === 'function') (window as any).showAlert({ title: 'Error', message: err.error || 'No se pudo subir el logo.', type: 'error' });
      return;
    }
    const data = await res.json();
    if (data && data.url && typeof (window as any).setCustomLogoUrl === 'function') {
      (window as any).setCustomLogoUrl(data.url);
      updateBrandingPreview();
      if (typeof (window as any).applyCustomBranding === 'function') (window as any).applyCustomBranding();
      if (typeof (window as any).showAlert === 'function') (window as any).showAlert({ title: 'Listo', message: 'Logo de fondo guardado. Se aplicará en todas las pantallas.', type: 'success' });
    }
  } catch (err) {
    if (typeof (window as any).showAlert === 'function') (window as any).showAlert({ title: 'Error', message: 'No se pudo subir el logo.', type: 'error' });
  }
  input.value = '';
});

document.getElementById('btn-settings-rate')?.addEventListener('click', () => openSettingsModal('settings-modal-rate', () => loadRate()));
document.getElementById('btn-settings-backup')?.addEventListener('click', () => openSettingsModal('settings-modal-backup'));
document.getElementById('btn-settings-restore')?.addEventListener('click', () => openSettingsModal('settings-modal-restore'));
document.getElementById('btn-settings-demo')?.addEventListener('click', () => openSettingsModal('settings-modal-demo'));
document.getElementById('btn-settings-delete-db')?.addEventListener('click', () => openSettingsModal('settings-modal-delete-db'));
document.getElementById('btn-settings-auto-backup')?.addEventListener('click', () => openSettingsModal('settings-modal-auto-backup'));

document.querySelectorAll('[data-settings-close]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const modalId = btn.getAttribute('data-settings-close');
    if (modalId) closeSettingsModal(modalId);
  });
});

['settings-modal-appearance', 'settings-modal-rate', 'settings-modal-backup', 'settings-modal-restore', 'settings-modal-demo', 'settings-modal-delete-db', 'settings-modal-auto-backup'].forEach((modalId) => {
  document.getElementById(modalId)?.addEventListener('click', (e) => {
    if (e.target && (e.target as HTMLElement).id === modalId) closeSettingsModal(modalId);
  });
});

interface RateHistoryRow {
  id: number;
  rate: number;
  notes: string | null;
  createdAt: string;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(`${API}${url}`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json() as Promise<T>;
}

function formatDateTime(s: string | number | null | undefined): string {
  try {
    if (s == null) return '—';
    if (typeof s === 'number') {
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    const raw = String(s).trim();
    if (!raw) return '—';
    const iso = raw.includes('T') ? raw : raw.replace(/\s+/, 'T');
    const withTz = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + '-04:00';
    const d = new Date(withTz);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('es-VE', {
      timeZone: 'America/Caracas',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return typeof s === 'string' ? s : '—';
  }
}

function showMsg(el: HTMLElement, text: string, isError: boolean) {
  const showAlert = (window as any).showAlert;
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
  const r = await getJson<{ exchangeRate: number }>('/api/settings/exchange-rate');
  (document.getElementById('exchange-rate') as HTMLInputElement).value = String(r.exchangeRate);
}

function renderRateHistoryPagination(containerId: string, totalItems: number, currentPage: number, onPageChange: (page: number) => void) {
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

function renderRateHistoryPage(page: number) {
  const tbody = document.getElementById('rate-history-tbody')!;
  const totalPages = Math.ceil(rateHistoryData.length / ROWS_PER_PAGE) || 1;
  const p = Math.max(1, Math.min(page, totalPages));
  const slice = rateHistoryData.slice((p - 1) * ROWS_PER_PAGE, p * ROWS_PER_PAGE);
  tbody.innerHTML = slice
    .map(
      (row) =>
        `<tr>
          <td>${formatDateTime(row.createdAt)}</td>
          <td><strong>${Number(row.rate).toFixed(2)}</strong></td>
          <td class="text-muted">${row.notes || '—'}</td>
        </tr>`
    )
    .join('');
  renderRateHistoryPagination('rate-history-pagination', rateHistoryData.length, p, (newPage) => {
    currentRateHistoryPage = newPage;
    renderRateHistoryPage(newPage);
  });
}

async function loadRateHistory() {
  const tbody = document.getElementById('rate-history-tbody')!;
  const msg = document.getElementById('rate-history-msg')!;
  const paginationEl = document.getElementById('rate-history-pagination')!;
  try {
    const history = await getJson<RateHistoryRow[]>('/api/settings/exchange-rate-history?limit=100');
    rateHistoryData = history;
    currentRateHistoryPage = 1;
    if (history.length === 0) {
      msg.textContent = 'Aún no hay cambios de tasa registrados. Al guardar una tasa se creará el historial.';
      tbody.innerHTML = '';
      paginationEl.innerHTML = '';
      return;
    }
    msg.textContent = '';
    renderRateHistoryPage(1);
  } catch (e) {
    msg.textContent = 'Error al cargar el historial.';
    tbody.innerHTML = '';
    paginationEl.innerHTML = '';
  }
}

async function saveRate() {
  const input = document.getElementById('exchange-rate') as HTMLInputElement;
  const notesInput = document.getElementById('rate-notes') as HTMLInputElement;
  const msgEl = document.getElementById('settings-msg')!;
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
      showMsg(msgEl, (data as { error?: string }).error || 'Error al guardar', true);
      return;
    }
    showMsg(msgEl, 'Tasa guardada. Quedó registrada en el historial.', false);
    if (notesInput) notesInput.value = '';
    loadRate();
    loadRateHistory();
  } catch (e) {
    showMsg(msgEl, 'Error al guardar.', true);
  }
}

const THEME_KEY = 'theme';

function getTheme(): 'light' | 'dark' {
  return (localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light') as 'light' | 'dark';
}

function setTheme(theme: 'light' | 'dark') {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
  const label = document.getElementById('theme-toggle-label');
  if (label) label.textContent = theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro';
}

function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
setTheme(getTheme());

document.getElementById('btn-save-rate')?.addEventListener('click', saveRate);

async function showRateReminder() {
  try {
    const r = await getJson<{ lastUpdate: string | null }>('/api/settings/last-rate-update');
    if (!r.lastUpdate) return;
    const last = new Date(r.lastUpdate);
    const days = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
    if (days > 7) {
      const banner = document.getElementById('rate-reminder-banner');
      if (banner) {
        banner.innerHTML = `La tasa de cambio no se actualiza desde hace más de 7 días. Actualízala para reflejar el valor correcto en bolívares. <a href="settings.html" class="alert__link">Actualizar aquí</a>`;
        banner.style.display = 'block';
      }
    }
  } catch (_) {}
}

const rateBanner = document.getElementById('rate-reminder-banner');
if (rateBanner) showRateReminder();

const btnBackup = document.getElementById('btn-backup') as HTMLButtonElement;
const backupMsg = document.getElementById('backup-msg');
if (btnBackup && backupMsg) {
  btnBackup.addEventListener('click', async () => {
    (backupMsg as HTMLElement).style.display = 'none';
    backupMsg.textContent = '';
    btnBackup.disabled = true;
    try {
      const res = await fetch(`${API}/api/backup`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        const showAlert = (window as any).showAlert;
        if (typeof showAlert === 'function') showAlert({ title: 'Error', message: data.error || 'No se pudo descargar la copia. Compruebe que tiene permisos de administrador.', type: 'error' });
        else { (backupMsg as HTMLElement).style.display = 'block'; backupMsg.textContent = data.error || 'No se pudo descargar la copia.'; }
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inventory.db';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      const showAlertOk = (window as any).showAlert;
      if (typeof showAlertOk === 'function') showAlertOk({ title: 'Listo', message: 'Copia de Seguridad descargada correctamente.', type: 'success', skipNotificationSeen: true });
    } catch (e) {
      const showAlertErr = (window as any).showAlert;
      if (typeof showAlertErr === 'function') showAlertErr({ title: 'Error', message: 'Error de conexión al descargar.', type: 'error' });
      else { (backupMsg as HTMLElement).style.display = 'block'; backupMsg.textContent = 'Error de conexión al descargar.'; }
    } finally {
      btnBackup.disabled = false;
    }
  });
}

const restoreFile = document.getElementById('restore-file') as HTMLInputElement;
const btnRestore = document.getElementById('btn-restore');
const restoreMsg = document.getElementById('restore-msg');
if (restoreFile && btnRestore && restoreMsg) {
  restoreFile.addEventListener('change', () => {
    btnRestore.setAttribute('disabled', 'true');
    if (restoreFile.files && restoreFile.files.length > 0) btnRestore.removeAttribute('disabled');
  });
  btnRestore.addEventListener('click', async () => {
    if (!restoreFile.files || restoreFile.files.length === 0) return;
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
      const data = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; message?: string };
      (restoreMsg as HTMLElement).style.display = 'none';
      restoreMsg.textContent = '';
      if (res.ok && data.ok) {
        const msg = data.message || 'Restauración aplicada. Al cerrar esta ventana se recargará la página para usar la nueva base de datos.';
        const showAlert = (window as any).showAlert;
        if (typeof showAlert === 'function') {
          showAlert({ title: 'Restauración completada', message: msg, type: 'success', skipNotificationSeen: true, onClose: () => { restoreFile.value = ''; btnRestore.setAttribute('disabled', 'true'); location.reload(); } });
        } else { restoreFile.value = ''; btnRestore.setAttribute('disabled', 'true'); setTimeout(() => location.reload(), 1500); }
      } else {
        const showAlertErr = (window as any).showAlert;
        if (typeof showAlertErr === 'function') showAlertErr({ title: 'Error al restaurar', message: data.error || 'No se pudo restaurar la copia.', type: 'error' });
        else { (restoreMsg as HTMLElement).style.display = 'block'; restoreMsg.textContent = data.error || 'Error al restaurar.'; restoreMsg.className = 'msg msg--error mt-1 mb-0'; }
      }
    } catch (e) {
      (restoreMsg as HTMLElement).style.display = 'none';
      const showAlertErr = (window as any).showAlert;
      if (typeof showAlertErr === 'function') showAlertErr({ title: 'Error', message: 'Error de conexión al restaurar.', type: 'error' });
      else { (restoreMsg as HTMLElement).style.display = 'block'; restoreMsg.textContent = 'Error de conexión.'; restoreMsg.className = 'msg msg--error mt-1 mb-0'; }
    }
  });
}

const btnRestoreDemo = document.getElementById('btn-restore-demo');
const restoreDemoMsg = document.getElementById('restore-demo-msg');
if (btnRestoreDemo && restoreDemoMsg) {
  btnRestoreDemo.addEventListener('click', async () => {
    (restoreDemoMsg as HTMLElement).style.display = 'block';
    restoreDemoMsg.textContent = 'Preparando…';
    restoreDemoMsg.className = 'text-muted mt-1 mb-0';
    try {
      const res = await fetch(`${API}/api/backup/restore-demo`, { method: 'POST' });
      const data = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; message?: string };
      (restoreDemoMsg as HTMLElement).style.display = 'none';
      restoreDemoMsg.textContent = '';
      if (res.ok && data.ok) {
        const msg = data.message || 'Base de datos de demostración aplicada. Al cerrar esta ventana se recargará la página.';
        const showAlert = (window as any).showAlert;
        if (typeof showAlert === 'function') {
          showAlert({ title: 'Base de datos de demostración', message: msg, type: 'success', skipNotificationSeen: true, onClose: () => location.reload() });
        } else setTimeout(() => location.reload(), 1500);
      } else {
        const showAlertErr = (window as any).showAlert;
        if (typeof showAlertErr === 'function') showAlertErr({ title: 'Error', message: data.error || 'No se encontró demoBD.db. Ejecute: node scripts/create-demo-db.js', type: 'error' });
        else { (restoreDemoMsg as HTMLElement).style.display = 'block'; restoreDemoMsg.textContent = data.error || 'Error.'; restoreDemoMsg.className = 'msg msg--error mt-1 mb-0'; }
      }
    } catch (e) {
      (restoreDemoMsg as HTMLElement).style.display = 'none';
      const showAlertErr = (window as any).showAlert;
      if (typeof showAlertErr === 'function') showAlertErr({ title: 'Error', message: 'Error de conexión.', type: 'error' });
      else { (restoreDemoMsg as HTMLElement).style.display = 'block'; restoreDemoMsg.textContent = 'Error de conexión.'; restoreDemoMsg.className = 'msg msg--error mt-1 mb-0'; }
    }
  });
}

const btnDeleteDb = document.getElementById('btn-delete-db');
const deleteDbMsg = document.getElementById('delete-db-msg');
if (btnDeleteDb && deleteDbMsg) {
  btnDeleteDb.addEventListener('click', async () => {
    if (!confirm('¿Eliminar la base de datos actual? Se borrarán todos los datos. Puede restaurar después desde una copia o la demo.')) return;
    deleteDbMsg.style.display = 'block';
    deleteDbMsg.textContent = 'Eliminando…';
    deleteDbMsg.className = 'text-muted mt-1 mb-0';
    try {
      const res = await fetch(`${API}/api/backup/delete-database`, { method: 'POST' });
      const data = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; message?: string };
      if (res.ok && data.ok) {
        const msg = data.message || 'Base de datos eliminada. Recargue la página; se creará una base de datos nueva. Si desea restaurar datos, use "Restaurar desde copia".';
        try { sessionStorage.setItem('kuma_redirect_message', msg); } catch (_) {}
        window.location.replace('/login.html');
      } else {
        deleteDbMsg.textContent = data.error || 'Error al eliminar.';
        deleteDbMsg.className = 'msg msg--error mt-1 mb-0';
      }
    } catch (e) {
      deleteDbMsg.textContent = 'Error de conexión.';
      deleteDbMsg.className = 'msg msg--error mt-1 mb-0';
    }
  });
}

applyAdminOnlyVisibility();
loadRate();
loadRateHistory();
export {};
