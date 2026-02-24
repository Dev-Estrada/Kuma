const API = '';

interface Category {
  id: number;
  name: string;
}

interface Product {
  id?: number;
  sku: string;
  name: string;
  quantity?: number;
  minimumStock?: number;
  listPrice?: number;
  costPrice?: number;
  categoryId?: number;
  categoryName?: string;
  isFavorite?: boolean;
}

let allCategories: Category[] = [];
let currentProducts: Product[] = [];
let editingProduct: Product | null = null;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(`${API}${url}`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json() as Promise<T>;
}

async function fetchCategories(): Promise<Category[]> {
  return getJson<Category[]>('/api/categories');
}

async function loadCategories() {
  allCategories = await fetchCategories();
  const filter = document.getElementById('category-filter') as HTMLSelectElement;
  const modalCat = document.getElementById('category') as HTMLSelectElement;
  filter.innerHTML = '<option value="">Todas las categorías</option>';
  modalCat.innerHTML = '<option value="">— Ninguna —</option>';
  allCategories.forEach((c) => {
    filter.appendChild(new Option(c.name, String(c.id)));
    modalCat.appendChild(new Option(c.name, String(c.id)));
  });
}

async function fetchProducts(q?: string): Promise<Product[]> {
  const url = q ? `/api/products/search?q=${encodeURIComponent(q)}` : '/api/products';
  return getJson<Product[]>(url);
}

function stockClass(p: Product): string {
  const q = p.quantity ?? 0;
  const min = p.minimumStock ?? 0;
  if (q <= min) return 'stock-low';
  if (q <= min * 2) return 'stock-medium';
  return 'stock-ok';
}

function renderTable(products: Product[]) {
  const tbody = document.getElementById('products-tbody')!;
  tbody.innerHTML = products
    .map(
      (p) =>
        `<tr>
          <td><button type="button" class="btn-favorite ${p.isFavorite ? 'btn-favorite--on' : ''}" data-id="${p.id}" data-fav="${p.isFavorite ? '1' : '0'}" title="${p.isFavorite ? 'Quitar de favoritos' : 'Marcar favorito'}">★</button></td>
          <td>${p.sku}</td>
          <td>${p.name}</td>
          <td>$${(p.listPrice ?? 0).toFixed(2)}</td>
          <td class="${stockClass(p)}">${p.quantity ?? 0}</td>
          <td>${p.minimumStock ?? 0}</td>
          <td>${p.categoryName ?? ''}</td>
          <td>
            <button type="button" class="btn btn--sm btn--ghost adjust-stock" data-id="${p.id}" data-name="${(p.name || '').replace(/"/g, '&quot;')}" data-qty="${p.quantity ?? 0}">Ajustar</button>
            <button type="button" class="btn btn--sm btn--ghost edit-product" data-id="${p.id}">Editar</button>
            <button type="button" class="btn btn--sm btn--danger delete-product" data-id="${p.id}">Eliminar</button>
          </td>
        </tr>`
    )
    .join('');
}

async function loadAndRender() {
  const q = (document.getElementById('search') as HTMLInputElement).value.trim();
  const catId = (document.getElementById('category-filter') as HTMLSelectElement).value;
  let list = await fetchProducts(q || undefined);
  if (catId) list = list.filter((p) => String(p.categoryId) === catId);
  currentProducts = list;
  renderTable(list);
}

const modal = document.getElementById('product-modal')!;
const form = document.getElementById('product-form') as HTMLFormElement;
const modalTitle = document.getElementById('modal-title')!;
const productIdInput = document.getElementById('product-id') as HTMLInputElement;

function openModal(editProduct?: Product) {
  editingProduct = editProduct ?? null;
  if (editProduct) {
    modalTitle.textContent = 'Editar producto';
    productIdInput.value = String(editProduct.id);
    (document.getElementById('sku') as HTMLInputElement).value = editProduct.sku;
    (document.getElementById('name') as HTMLInputElement).value = editProduct.name;
    (document.getElementById('listPrice') as HTMLInputElement).value = String(editProduct.listPrice ?? 0);
    (document.getElementById('costPrice') as HTMLInputElement).value = String(editProduct.costPrice ?? 0);
    (document.getElementById('quantity') as HTMLInputElement).value = String(editProduct.quantity ?? 0);
    (document.getElementById('minimumStock') as HTMLInputElement).value = String(editProduct.minimumStock ?? 5);
    (document.getElementById('category') as HTMLSelectElement).value = editProduct.categoryId ? String(editProduct.categoryId) : '';
  } else {
    modalTitle.textContent = 'Nuevo producto';
    productIdInput.value = '';
    form.reset();
    (document.getElementById('quantity') as HTMLInputElement).value = '0';
    (document.getElementById('minimumStock') as HTMLInputElement).value = '5';
    (document.getElementById('costPrice') as HTMLInputElement).value = '0';
  }
  modal.style.display = 'flex';
}

function closeModal() {
  modal.style.display = 'none';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = productIdInput.value ? Number(productIdInput.value) : null;
  const formData: Partial<Product> = {
    sku: (document.getElementById('sku') as HTMLInputElement).value.trim(),
    name: (document.getElementById('name') as HTMLInputElement).value.trim(),
    listPrice: parseFloat((document.getElementById('listPrice') as HTMLInputElement).value) || 0,
    costPrice: parseFloat((document.getElementById('costPrice') as HTMLInputElement).value) || 0,
    quantity: parseInt((document.getElementById('quantity') as HTMLInputElement).value, 10) || 0,
    minimumStock: parseInt((document.getElementById('minimumStock') as HTMLInputElement).value, 10) || 0,
    categoryId: parseInt((document.getElementById('category') as HTMLSelectElement).value, 10) || undefined,
  };
  const payload: Product = id && editingProduct
    ? { ...editingProduct, ...formData }
    : { ...formData, sku: formData.sku!, name: formData.name! };
  try {
    if (id) {
      await fetch(`${API}/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(`${API}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    closeModal();
    editingProduct = null;
    loadAndRender();
  } catch (err) {
    alert('Error al guardar');
  }
});

document.getElementById('btn-cancel-product')?.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).classList.contains('overlay')) closeModal();
});

document.getElementById('btn-new')?.addEventListener('click', () => openModal());

document.getElementById('btn-export-csv')?.addEventListener('click', async (e) => {
  e.preventDefault();
  try {
    const res = await fetch(`${API}/api/products/export`);
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'inventario.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (_) {
    alert('Error al exportar. Comprueba la conexión.');
  }
});

document.getElementById('products-tbody')?.addEventListener('click', async (e) => {
  const t = e.target as HTMLElement;
  const btn = t.closest('button');
  const idAttr = btn?.getAttribute('data-id');
  if (!idAttr) return;
  const id = Number(idAttr);
  if (t.classList.contains('btn-favorite') || (btn?.classList.contains('btn-favorite'))) {
    const b = (btn || t) as HTMLElement;
    const isFav = b.getAttribute('data-fav') !== '1';
    try {
      await fetch(`${API}/api/products/${id}/favorite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: isFav }),
      });
      loadAndRender();
    } catch (_) {
      alert('Error al actualizar favorito.');
    }
    return;
  }
  if ((t.classList.contains('adjust-stock') || btn?.classList.contains('adjust-stock'))) {
    const row = (btn || t).closest('tr');
    const name = (btn || t).getAttribute('data-name') || row?.querySelector('td:nth-child(3)')?.textContent || 'Producto';
    const qty = parseInt((btn || t).getAttribute('data-qty') || '0', 10);
    (document.getElementById('adjust-product-id') as HTMLInputElement).value = String(id);
    document.getElementById('adjust-product-name')!.textContent = `Producto: ${name} · Stock actual: ${qty}`;
    (document.getElementById('adjust-delta') as HTMLInputElement).value = '0';
    (document.getElementById('adjust-reason') as HTMLInputElement).value = '';
    (document.getElementById('adjust-modal') as HTMLElement).style.display = 'flex';
    return;
  }
  if (t.classList.contains('edit-product')) {
    const res = await fetch(`${API}/api/products/${id}`);
    const p = await res.json();
    openModal(p);
  }
  if (t.classList.contains('delete-product')) {
    if (!confirm('¿Eliminar este producto?')) return;
    await fetch(`${API}/api/products/${id}`, { method: 'DELETE' });
    loadAndRender();
  }
});

document.getElementById('btn-adjust-cancel')?.addEventListener('click', () => {
  (document.getElementById('adjust-modal') as HTMLElement).style.display = 'none';
});
document.getElementById('adjust-modal')?.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).classList.contains('overlay')) (document.getElementById('adjust-modal') as HTMLElement).style.display = 'none';
});
document.getElementById('btn-adjust-save')?.addEventListener('click', async () => {
  const id = Number((document.getElementById('adjust-product-id') as HTMLInputElement).value);
  const delta = parseInt((document.getElementById('adjust-delta') as HTMLInputElement).value, 10);
  const reason = (document.getElementById('adjust-reason') as HTMLInputElement).value.trim();
  if (isNaN(delta) || delta === 0) {
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
      alert((data as { error?: string }).error || 'Error al ajustar');
      return;
    }
    (document.getElementById('adjust-modal') as HTMLElement).style.display = 'none';
    loadAndRender();
  } catch (_) {
    alert('Error de conexión.');
  }
});

document.getElementById('search')?.addEventListener('input', () => loadAndRender());
document.getElementById('category-filter')?.addEventListener('change', () => loadAndRender());
document.getElementById('btn-low-stock')?.addEventListener('click', async () => {
  const list = await getJson<Product[]>('/api/products/low-stock');
  renderTable(list);
});

async function loadLowStockBanner() {
  try {
    const low = await getJson<{ id: number }[]>('/api/products/low-stock');
    const banner = document.getElementById('low-stock-banner');
    const text = document.getElementById('low-stock-banner-text');
    if (banner && text && low.length > 0) {
      text.textContent = `${low.length} producto(s) con stock por debajo del mínimo.`;
      banner.style.display = 'block';
    } else if (banner) {
      banner.style.display = 'none';
    }
  } catch (_) {}
}

loadCategories().then(() => {
  loadAndRender();
  loadLowStockBanner();
});
export {};
