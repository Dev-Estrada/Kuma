const API = '';
let allCategories = [];
let currentProducts = [];
let editingProduct = null;
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
function renderTable(products) {
    const tbody = document.getElementById('products-tbody');
    tbody.innerHTML = products
        .map((p) => `<tr>
          <td>${p.sku}</td>
          <td>${p.name}</td>
          <td>$${(p.listPrice ?? 0).toFixed(2)}</td>
          <td class="${stockClass(p)}">${p.quantity ?? 0}</td>
          <td>${p.minimumStock ?? 0}</td>
          <td>${p.categoryName ?? ''}</td>
          <td>
            <button type="button" class="btn btn--sm btn--ghost edit-product" data-id="${p.id}">Editar</button>
            <button type="button" class="btn btn--sm btn--danger delete-product" data-id="${p.id}">Eliminar</button>
          </td>
        </tr>`)
        .join('');
}
async function loadAndRender() {
    const q = document.getElementById('search').value.trim();
    const catId = document.getElementById('category-filter').value;
    let list = await fetchProducts(q || undefined);
    if (catId)
        list = list.filter((p) => String(p.categoryId) === catId);
    currentProducts = list;
    renderTable(list);
}
const modal = document.getElementById('product-modal');
const form = document.getElementById('product-form');
const modalTitle = document.getElementById('modal-title');
const productIdInput = document.getElementById('product-id');
function openModal(editProduct) {
    editingProduct = editProduct ?? null;
    if (editProduct) {
        modalTitle.textContent = 'Editar producto';
        productIdInput.value = String(editProduct.id);
        document.getElementById('sku').value = editProduct.sku;
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
    const formData = {
        sku: document.getElementById('sku').value.trim(),
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
        alert('Error al guardar');
    }
});
document.getElementById('btn-cancel-product')?.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
    if (e.target.classList.contains('overlay'))
        closeModal();
});
document.getElementById('btn-new')?.addEventListener('click', () => openModal());
document.getElementById('products-tbody')?.addEventListener('click', async (e) => {
    const t = e.target;
    const idAttr = t.closest('button')?.getAttribute('data-id');
    if (!idAttr)
        return;
    const id = Number(idAttr);
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
document.getElementById('search')?.addEventListener('input', () => loadAndRender());
document.getElementById('category-filter')?.addEventListener('change', () => loadAndRender());
document.getElementById('btn-low-stock')?.addEventListener('click', async () => {
    const list = await getJson('/api/products/low-stock');
    renderTable(list);
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
loadCategories().then(() => {
    loadAndRender();
    loadLowStockBanner();
});
export {};
