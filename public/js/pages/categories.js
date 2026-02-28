const API = '';
async function getJson(url) {
    const res = await fetch(`${API}${url}`);
    if (!res.ok)
        throw new Error(res.statusText);
    return res.json();
}
function escapeHtml(s) {
    if (s == null || s === '')
        return '—';
    return String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
let allCategories = [];
async function loadCategories() {
    const tbody = document.getElementById('categories-tbody');
    const msg = document.getElementById('categories-msg');
    try {
        allCategories = await getJson('/api/categories');
        if (allCategories.length === 0) {
            msg.textContent = 'No hay categorías. Crea una con "Nueva categoría" para usarlas en Inventario.';
            tbody.innerHTML = '';
            return;
        }
        msg.textContent = `${allCategories.length} categoría(s).`;
        tbody.innerHTML = allCategories
            .map((c) => `<tr>
            <td><strong>${c.id ?? ''}</strong></td>
            <td>${escapeHtml(c.name)}</td>
            <td class="text-muted" style="max-width: 20rem;">${escapeHtml(c.description)}</td>
            <td>
              <button type="button" class="btn btn--sm btn--ghost btn-edit-category" data-id="${c.id}" data-name="${escapeHtml(c.name).replace(/"/g, '&quot;')}" data-desc="${escapeHtml(c.description || '').replace(/"/g, '&quot;')}">Editar</button>
              <button type="button" class="btn btn--sm btn--danger btn-delete-category" data-id="${c.id}" data-name="${escapeHtml(c.name).replace(/"/g, '&quot;')}">Eliminar</button>
            </td>
          </tr>`)
            .join('');
    }
    catch (e) {
        msg.textContent = 'Error al cargar categorías.';
        tbody.innerHTML = '';
        if (typeof window.showAlert === 'function')
            window.showAlert({ title: 'Error', message: 'Error al cargar la lista de categorías.', type: 'error' });
    }
}
const modal = document.getElementById('category-modal');
const form = document.getElementById('category-form');
const modalTitle = document.getElementById('category-modal-title');
const categoryIdInput = document.getElementById('category-id');
function openModal(editCategory) {
    if (editCategory) {
        modalTitle.textContent = 'Editar categoría';
        categoryIdInput.value = String(editCategory.id);
        document.getElementById('category-name').value = editCategory.name || '';
        document.getElementById('category-description').value = editCategory.description || '';
    }
    else {
        modalTitle.textContent = 'Nueva categoría';
        categoryIdInput.value = '';
        form.reset();
    }
    modal.style.display = 'flex';
}
function closeModal() {
    modal.style.display = 'none';
}
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = categoryIdInput.value ? Number(categoryIdInput.value) : null;
    const name = document.getElementById('category-name').value.trim();
    const description = document.getElementById('category-description').value.trim() || undefined;
    if (!name)
        return;
    try {
        const res = id
            ? await fetch(`${API}/api/categories/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description }),
            })
            : await fetch(`${API}/api/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description }),
            });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            const msg = data.error || 'Error al guardar.';
            if (typeof window.showAlert === 'function')
                window.showAlert({ title: 'Error', message: msg, type: 'error' });
            else
                alert(msg);
            return;
        }
        closeModal();
        loadCategories();
    }
    catch (err) {
        if (typeof window.showAlert === 'function')
            window.showAlert({ title: 'Error', message: 'Error de conexión.', type: 'error' });
        else
            alert('Error de conexión.');
    }
});
document.getElementById('btn-cancel-category')?.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
    if (e.target.classList.contains('overlay'))
        closeModal();
});
document.getElementById('btn-new-category')?.addEventListener('click', () => openModal());
document.getElementById('categories-tbody')?.addEventListener('click', async (e) => {
    const t = e.target;
    const editBtn = t.closest('.btn-edit-category');
    const deleteBtn = t.closest('.btn-delete-category');
    if (editBtn) {
        const id = Number(editBtn.getAttribute('data-id'));
        const name = editBtn.getAttribute('data-name') || '';
        const desc = editBtn.getAttribute('data-desc') || '';
        openModal({ id, name, description: desc || undefined });
        return;
    }
    if (deleteBtn) {
        const id = Number(deleteBtn.getAttribute('data-id'));
        const name = deleteBtn.getAttribute('data-name') || 'esta categoría';
        if (!confirm(`¿Eliminar la categoría "${name}"? Los Productos que la usen quedarán sin categoría.`))
            return;
        try {
            const res = await fetch(`${API}/api/categories/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                if (typeof window.showAlert === 'function')
                    window.showAlert({ title: 'Error', message: data.error || 'Error al eliminar.', type: 'error' });
                return;
            }
            loadCategories();
        }
        catch (_) {
            if (typeof window.showAlert === 'function')
                window.showAlert({ title: 'Error', message: 'Error de conexión.', type: 'error' });
        }
    }
});
loadCategories();
export {};
