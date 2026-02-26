const API = '';
const ROWS_PER_PAGE = 7;
let allCategories = [];
let currentProducts = [];
let editingProduct = null;
let lowStockMode = false;
let currentInventoryPage = 1;
async function getJson(url) {
    const res = await fetch(`${API}${url}`);
    if (!res.ok)
        throw new Error(res.statusText);
    return res.json();
}
async function fetchCategories() {
    return getJson('/api/categories');
}
async function loadCategories() {
    allCategories = await fetchCategories();
    const filter = document.getElementById('category-filter');
    const modalCat = document.getElementById('category');
    filter.innerHTML = '<option value="">Todas las categorías</option>';
    modalCat.innerHTML = '<option value="">— Ninguna —</option>';
    allCategories.forEach((c) => {
        filter.appendChild(new Option(c.name, String(c.id)));
        modalCat.appendChild(new Option(c.name, String(c.id)));
    });
}
async function fetchProducts(q) {
    const url = q ? `/api/products/search?q=${encodeURIComponent(q)}` : '/api/products';
    return getJson(url);
}
function stockClass(p) {
    const q = p.quantity ?? 0;
    const min = p.minimumStock ?? 0;
    if (q <= min)
        return 'stock-low';
    if (q <= min * 2)
        return 'stock-medium';
    return 'stock-ok';
}
function escapeHtml(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
function renderPagination(containerId, totalItems, currentPage, onPageChange) {
    const totalPages = Math.ceil(totalItems / ROWS_PER_PAGE) || 1;
    const el = document.getElementById(containerId);
    if (!el)
        return;
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
    document.getElementById(`${containerId}-prev`)?.addEventListener('click', () => { if (currentPage > 1)
        onPageChange(currentPage - 1); });
    document.getElementById(`${containerId}-next`)?.addEventListener('click', () => { if (currentPage < totalPages)
        onPageChange(currentPage + 1); });
}
function renderTable(products, page = 1) {
    const tbody = document.getElementById('products-tbody');
    const paginationEl = document.getElementById('products-pagination');
    const totalPages = Math.ceil(products.length / ROWS_PER_PAGE) || 1;
    const p = Math.max(1, Math.min(page, totalPages));
    const slice = products.slice((p - 1) * ROWS_PER_PAGE, p * ROWS_PER_PAGE);
    tbody.innerHTML = slice
        .map((p) => `<tr>
          <td><button type="button" class="btn-favorite ${p.isFavorite ? 'btn-favorite--on' : ''}" data-id="${p.id}" data-fav="${p.isFavorite ? '1' : '0'}" title="${p.isFavorite ? 'Quitar de favoritos' : 'Marcar favorito'}">★</button></td>
          <td>${p.id ?? ''}</td>
          <td>${escapeHtml(p.sku)}</td>
          <td>${escapeHtml(p.barcode ?? '')}</td>
          <td>${escapeHtml(p.name ?? '')}</td>
          <td>$${(p.listPrice ?? 0).toFixed(2)}</td>
          <td>$${(p.costPrice ?? 0).toFixed(2)}</td>
          <td class="${stockClass(p)}">${p.quantity ?? 0}</td>
          <td>${p.minimumStock ?? 0}</td>
          <td>${escapeHtml(p.categoryName ?? '')}</td>
          <td>
            <button type="button" class="btn btn--sm btn--ghost adjust-stock" data-id="${p.id}" data-name="${escapeHtml(p.name || '').replace(/"/g, '&quot;')}" data-qty="${p.quantity ?? 0}">Ajustar</button>
            <button type="button" class="btn btn--sm btn--ghost edit-product" data-id="${p.id}">Editar</button>
            <button type="button" class="btn btn--sm btn--danger delete-product" data-id="${p.id}">Eliminar</button>
          </td>
        </tr>`)
        .join('');
    renderPagination('products-pagination', products.length, p, (newPage) => {
        currentInventoryPage = newPage;
        renderTable(currentProducts, newPage);
    });
}
async function loadAndRender() {
    lowStockMode = false;
    currentInventoryPage = 1;
    const btnLow = document.getElementById('btn-low-stock');
    if (btnLow)
        btnLow.textContent = 'Bajo stock';
    const q = document.getElementById('search').value.trim();
    const catId = document.getElementById('category-filter').value;
    let list = await fetchProducts(q || undefined);
    if (catId)
        list = list.filter((p) => String(p.categoryId) === catId);
    currentProducts = list;
    renderTable(list, 1);
}
const modal = document.getElementById('product-modal');
const form = document.getElementById('product-form');
const modalTitle = document.getElementById('modal-title');
const productIdInput = document.getElementById('product-id');
function openModal(editProduct) {
    editingProduct = editProduct ?? null;
    const barcodeEl = document.getElementById('barcode');
    if (editProduct) {
        modalTitle.textContent = 'Editar producto';
        productIdInput.value = String(editProduct.id);
        document.getElementById('sku').value = editProduct.sku;
        if (barcodeEl)
            barcodeEl.value = editProduct.barcode ?? '';
        document.getElementById('name').value = editProduct.name;
        document.getElementById('listPrice').value = String(editProduct.listPrice ?? 0);
        document.getElementById('costPrice').value = String(editProduct.costPrice ?? 0);
        document.getElementById('quantity').value = String(editProduct.quantity ?? 0);
        document.getElementById('minimumStock').value = String(editProduct.minimumStock ?? 5);
        document.getElementById('category').value = editProduct.categoryId ? String(editProduct.categoryId) : '';
    }
    else {
        modalTitle.textContent = 'Nuevo producto';
        productIdInput.value = '';
        form.reset();
        if (barcodeEl)
            barcodeEl.value = '';
        document.getElementById('quantity').value = '0';
        document.getElementById('minimumStock').value = '5';
        document.getElementById('costPrice').value = '0';
    }
    modal.style.display = 'flex';
}
function closeModal() {
    modal.style.display = 'none';
}
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = productIdInput.value ? Number(productIdInput.value) : null;
    const barcodeInput = document.getElementById('barcode')?.value?.trim() ?? '';
    const formData = {
        sku: document.getElementById('sku').value.trim(),
        barcode: barcodeInput || undefined,
        name: document.getElementById('name').value.trim(),
        listPrice: parseFloat(document.getElementById('listPrice').value) || 0,
        costPrice: parseFloat(document.getElementById('costPrice').value) || 0,
        quantity: parseInt(document.getElementById('quantity').value, 10) || 0,
        minimumStock: parseInt(document.getElementById('minimumStock').value, 10) || 0,
        categoryId: parseInt(document.getElementById('category').value, 10) || undefined,
    };
    const payload = id && editingProduct
        ? { ...editingProduct, ...formData }
        : { ...formData, sku: formData.sku, name: formData.name };
    try {
        if (id) {
            await fetch(`${API}/api/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        }
        else {
            await fetch(`${API}/api/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        }
        closeModal();
        editingProduct = null;
        loadAndRender();
    }
    catch (err) {
        if (typeof window.showAlert === 'function')
            window.showAlert({ title: 'Error', message: 'Error al guardar.', type: 'error' });
        else
            alert('Error al guardar');
    }
});
document.getElementById('btn-cancel-product')?.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
    if (e.target.classList.contains('overlay'))
        closeModal();
});
document.getElementById('btn-new')?.addEventListener('click', () => openModal());
document.getElementById('btn-export-csv')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        const res = await fetch(`${API}/api/products/export`);
        if (!res.ok)
            throw new Error('Export failed');
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'inventario.csv';
        a.click();
        URL.revokeObjectURL(a.href);
    }
    catch (_) {
        if (typeof window.showAlert === 'function')
            window.showAlert({ title: 'Error', message: 'Error al exportar. Comprueba la conexión.', type: 'error' });
        else
            alert('Error al exportar. Comprueba la conexión.');
    }
});
document.getElementById('products-tbody')?.addEventListener('click', async (e) => {
    const t = e.target;
    const btn = t.closest('button');
    const idAttr = btn?.getAttribute('data-id');
    if (!idAttr)
        return;
    const id = Number(idAttr);
    if (t.classList.contains('btn-favorite') || (btn?.classList.contains('btn-favorite'))) {
        const b = (btn || t);
        const isFav = b.getAttribute('data-fav') !== '1';
        try {
            await fetch(`${API}/api/products/${id}/favorite`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isFavorite: isFav }),
            });
            loadAndRender();
        }
        catch (_) {
            if (typeof window.showAlert === 'function')
                window.showAlert({ title: 'Error', message: 'Error al actualizar favorito.', type: 'error' });
            else
                alert('Error al actualizar favorito.');
        }
        return;
    }
    if ((t.classList.contains('adjust-stock') || btn?.classList.contains('adjust-stock'))) {
        const row = (btn || t).closest('tr');
        const name = (btn || t).getAttribute('data-name') || row?.querySelector('td:nth-child(3)')?.textContent || 'Producto';
        const qty = parseInt((btn || t).getAttribute('data-qty') || '0', 10);
        document.getElementById('adjust-product-id').value = String(id);
        document.getElementById('adjust-product-name').textContent = `Producto: ${name} · Stock actual: ${qty}`;
        document.getElementById('adjust-delta').value = '0';
        document.getElementById('adjust-reason').value = '';
        document.getElementById('adjust-modal').style.display = 'flex';
        return;
    }
    if (t.classList.contains('edit-product')) {
        const res = await fetch(`${API}/api/products/${id}`);
        const p = await res.json();
        openModal(p);
    }
    if (t.classList.contains('delete-product')) {
        if (!confirm('¿Eliminar este producto?'))
            return;
        await fetch(`${API}/api/products/${id}`, { method: 'DELETE' });
        loadAndRender();
    }
});
document.getElementById('btn-adjust-cancel')?.addEventListener('click', () => {
    document.getElementById('adjust-modal').style.display = 'none';
});
document.getElementById('adjust-modal')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('overlay'))
        document.getElementById('adjust-modal').style.display = 'none';
});
document.getElementById('btn-adjust-save')?.addEventListener('click', async () => {
    const id = Number(document.getElementById('adjust-product-id').value);
    const delta = parseInt(document.getElementById('adjust-delta').value, 10);
    const reason = document.getElementById('adjust-reason').value.trim();
    if (isNaN(delta) || delta === 0) {
        if (typeof window.showAlert === 'function')
            window.showAlert({ title: 'Aviso', message: 'Indica un cambio de cantidad (positivo o negativo).', type: 'warning' });
        else
            alert('Indica un cambio de cantidad (positivo o negativo).');
        return;
    }
    try {
        const res = await fetch(`${API}/api/movements/adjustment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: id, quantity: delta, reason: reason || undefined }),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            const msg = data.error || 'Error al ajustar';
            if (typeof window.showAlert === 'function')
                window.showAlert({ title: 'Error', message: msg, type: 'error' });
            else
                alert(msg);
            return;
        }
        document.getElementById('adjust-modal').style.display = 'none';
        loadAndRender();
    }
    catch (_) {
        if (typeof window.showAlert === 'function')
            window.showAlert({ title: 'Error', message: 'Error de conexión.', type: 'error' });
        else
            alert('Error de conexión.');
    }
});
document.getElementById('search')?.addEventListener('input', () => loadAndRender());
document.getElementById('category-filter')?.addEventListener('change', () => loadAndRender());
document.getElementById('btn-low-stock')?.addEventListener('click', async () => {
    if (lowStockMode) {
        loadAndRender();
        return;
    }
    const list = await getJson('/api/products/low-stock');
    currentProducts = list;
    lowStockMode = true;
    currentInventoryPage = 1;
    const btnLow = document.getElementById('btn-low-stock');
    if (btnLow)
        btnLow.textContent = 'Ver todo el inventario';
    renderTable(list, 1);
});
async function loadLowStockBanner() {
    try {
        const low = await getJson('/api/products/low-stock');
        const banner = document.getElementById('low-stock-banner');
        const text = document.getElementById('low-stock-banner-text');
        if (banner && text && low.length > 0) {
            text.textContent = `${low.length} producto(s) con stock por debajo del mínimo.`;
            banner.style.display = 'block';
        }
        else if (banner) {
            banner.style.display = 'none';
        }
    }
    catch (_) { }
}
document.getElementById('btn-print-catalog')?.addEventListener('click', () => {
    const openPrintWindow = window.openPrintWindow;
    if (typeof openPrintWindow !== 'function') {
        if (typeof window.showAlert === 'function')
            window.showAlert({ title: 'Error', message: 'No se pudo abrir la ventana de impresión.', type: 'error' });
        else
            alert('No se pudo abrir la ventana de impresión.');
        return;
    }
    const list = currentProducts;
    if (list.length === 0) {
        if (typeof window.showAlert === 'function')
            window.showAlert({ title: 'Aviso', message: 'No hay productos para imprimir.', type: 'warning' });
        else
            alert('No hay productos para imprimir.');
        return;
    }
    const rows = list
        .map((p) => `<tr><td>${p.id ?? ''}</td><td>${escapeHtml(p.sku)}</td><td>${escapeHtml(p.barcode ?? '')}</td><td>${escapeHtml(p.name ?? '')}</td><td>$${(p.listPrice ?? 0).toFixed(2)}</td><td>$${(p.costPrice ?? 0).toFixed(2)}</td><td>${p.quantity ?? 0}</td><td>${p.minimumStock ?? 0}</td><td>${escapeHtml(p.categoryName ?? '')}</td></tr>`)
        .join('');
    const html = '<h1>Catálogo de inventario</h1><table><thead><tr><th>ID</th><th>SKU</th><th>Cód. barras</th><th>Nombre</th><th>P. venta USD</th><th>P. costo USD</th><th>Cantidad</th><th>Mínimo</th><th>Categoría</th></tr></thead><tbody>' + rows + '</tbody></table>';
    openPrintWindow('Catálogo de inventario', html);
});
loadCategories().then(() => {
    loadAndRender();
    loadLowStockBanner();
});
export {};
