const API = '';
let products = [];
let cart = [];
let exchangeRate = 36.5;
async function getJson(url) {
    const res = await fetch(`${API}${url}`);
    if (!res.ok)
        throw new Error(res.statusText);
    return res.json();
}
async function loadRate() {
    const r = await getJson('/api/settings/exchange-rate');
    exchangeRate = r.exchangeRate;
    const el = document.getElementById('cart-rate');
    if (el)
        el.textContent = `1 USD = ${exchangeRate.toFixed(2)} Bs`;
}
async function loadProducts() {
    products = await getJson('/api/products');
    products.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
    renderProductGrid(products);
}
function renderProductGrid(list) {
    const grid = document.getElementById('product-grid');
    const withStock = list.filter((p) => (p.quantity ?? 0) > 0);
    if (withStock.length === 0) {
        grid.innerHTML = '<div class="product-grid__empty">No hay productos con stock disponible. Revisa el inventario.</div>';
        return;
    }
    grid.innerHTML = withStock
        .map((p) => `<div class="product-tile" data-id="${p.id}" data-name="${(p.name || '').replace(/"/g, '&quot;')}" data-sku="${(p.sku || '').replace(/"/g, '&quot;')}" data-price="${p.listPrice ?? 0}" data-qty="${p.quantity ?? 0}">
          <div class="product-tile__name">${p.isFavorite ? '★ ' : ''}${p.name || p.sku}</div>
          <div class="product-tile__meta">${p.sku} · Stock: ${p.quantity ?? 0}</div>
          <div class="product-tile__price">$${(p.listPrice ?? 0).toFixed(2)} USD</div>
        </div>`)
        .join('');
}
function getAvailableForProduct(productId) {
    const product = products.find((p) => p.id === productId);
    const inCart = cart.reduce((s, l) => (l.productId === productId ? s + l.quantity : s), 0);
    return (product?.quantity ?? 0) - inCart;
}
function renderCart() {
    const container = document.getElementById('cart-items');
    const totalsSection = document.getElementById('cart-totals');
    if (cart.length === 0) {
        container.innerHTML = '<div class="cart__empty">Añade productos desde la lista</div>';
        totalsSection.style.display = 'none';
        return;
    }
    totalsSection.style.display = 'block';
    container.innerHTML = cart
        .map((line) => {
        const canIncrease = getAvailableForProduct(line.productId) > 0;
        return `<div class="cart-item" data-product-id="${line.productId}">
          <div class="cart-item__info">
            <div class="cart-item__name">${line.name}</div>
            <div class="cart-item__qty">$${line.unitPriceUsd.toFixed(2)} c/u</div>
          </div>
          <div class="cart-item__controls">
            <button type="button" class="cart-item__btn cart-qty-minus" title="Quitar 1" aria-label="Menos uno">−</button>
            <span class="cart-item__quantity">${line.quantity}</span>
            <button type="button" class="cart-item__btn cart-qty-plus" title="Agregar 1" aria-label="Más uno" ${canIncrease ? '' : 'disabled'}>+</button>
          </div>
          <div class="cart-item__right">
            <span class="cart-item__subtotal">$${line.subtotalUsd.toFixed(2)}</span>
            <button type="button" class="btn btn--sm btn--ghost remove-line" title="Quitar todo">Quitar</button>
          </div>
        </div>`;
    })
        .join('');
    const discountInput = document.getElementById('sale-discount');
    const discount = Math.max(0, Math.min(100, parseFloat(discountInput?.value || '0') || 0));
    const subtotalUsd = cart.reduce((s, l) => s + l.subtotalUsd, 0);
    const totalUsd = Math.round(subtotalUsd * (1 - discount / 100) * 100) / 100;
    const totalBs = Math.round(totalUsd * exchangeRate * 100) / 100;
    document.getElementById('subtotal-usd').textContent = `$${subtotalUsd.toFixed(2)}`;
    document.getElementById('discount-display').textContent = `${discount}%`;
    document.getElementById('total-usd').textContent = `$${totalUsd.toFixed(2)}`;
    document.getElementById('total-bs').textContent = `Bs ${totalBs.toFixed(2)}`;
}
function getPosQuantity() {
    const input = document.getElementById('pos-quantity');
    const n = parseInt(input?.value || '1', 10);
    return isNaN(n) || n < 1 ? 1 : n;
}
function addToCart(productId, name, sku, unitPriceUsd, _qty) {
    const product = products.find((p) => p.id === productId);
    const inCart = cart.reduce((s, l) => (l.productId === productId ? s + l.quantity : s), 0);
    const available = (product?.quantity ?? 0) - inCart;
    const want = getPosQuantity();
    const addQty = Math.min(want, available);
    if (addQty <= 0)
        return;
    const existing = cart.find((l) => l.productId === productId);
    if (existing) {
        existing.quantity += addQty;
        existing.subtotalUsd = Math.round(existing.unitPriceUsd * existing.quantity * 100) / 100;
    }
    else {
        cart.push({
            productId,
            name,
            sku,
            quantity: addQty,
            unitPriceUsd,
            subtotalUsd: Math.round(unitPriceUsd * addQty * 100) / 100,
        });
    }
    renderCart();
}
function removeFromCart(productId) {
    cart = cart.filter((l) => l.productId !== productId);
    renderCart();
}
function decreaseQty(productId) {
    const line = cart.find((l) => l.productId === productId);
    if (!line)
        return;
    if (line.quantity <= 1) {
        removeFromCart(productId);
        return;
    }
    line.quantity -= 1;
    line.subtotalUsd = Math.round(line.unitPriceUsd * line.quantity * 100) / 100;
    renderCart();
}
function increaseQty(productId) {
    const line = cart.find((l) => l.productId === productId);
    if (!line)
        return;
    const available = getAvailableForProduct(line.productId);
    if (available <= 0)
        return;
    const add = Math.min(1, available);
    line.quantity += add;
    line.subtotalUsd = Math.round(line.unitPriceUsd * line.quantity * 100) / 100;
    renderCart();
}
function clearCart() {
    if (cart.length > 0 && !confirm('¿Vaciar todo el carrito?'))
        return;
    cart = [];
    renderCart();
}
function showMsg(text, isError) {
    const el = document.getElementById('sale-msg');
    el.textContent = text;
    el.className = isError ? 'msg msg--error' : 'msg msg--success';
    el.style.display = 'block';
    setTimeout(() => {
        el.style.display = 'none';
    }, 4000);
}
async function completeSale(retries = 1) {
    if (cart.length === 0) {
        showMsg('Añade al menos un producto al carrito.', true);
        return;
    }
    const discountInput = document.getElementById('sale-discount');
    const discountPercent = Math.max(0, Math.min(100, parseFloat(discountInput?.value || '0') || 0));
    const clientIdEl = document.getElementById('pos-client-id');
    const clientId = clientIdEl?.value ? parseInt(clientIdEl.value, 10) : null;
    const body = {
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        discountPercent,
        clientId: clientId && !isNaN(clientId) ? clientId : undefined,
    };
    try {
        const res = await fetch(`${API}/api/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            showMsg(data.error || 'Error al registrar la venta', true);
            return;
        }
        clearCart();
        loadProducts();
        if (typeof window.showAlert === 'function') {
            window.showAlert({
                title: 'Venta completada',
                message: `Venta #${data.id} registrada. Total: $${Number(data.totalUsd).toFixed(2)} USD / Bs ${Number(data.totalBs).toFixed(2)}`,
                type: 'success',
                skipNotificationSeen: true,
            });
        } else {
            showMsg(`Venta #${data.id} registrada. Total: $${data.totalUsd.toFixed(2)} USD / Bs ${data.totalBs.toFixed(2)}`, false);
        }
    }
    catch (e) {
        if (retries > 0) {
            showMsg('Sin conexión. Reintentando…', true);
            setTimeout(() => completeSale(retries - 1), 1500);
        }
        else {
            showMsg('Sin conexión. Revisa la red y vuelve a intentar.', true);
        }
    }
}
document.getElementById('product-grid')?.addEventListener('click', (e) => {
    const tile = e.target.closest('.product-tile');
    if (!tile)
        return;
    const id = Number(tile.getAttribute('data-id'));
    const name = tile.getAttribute('data-name') || '';
    const sku = tile.getAttribute('data-sku') || '';
    const price = parseFloat(tile.getAttribute('data-price') || '0');
    const qty = parseInt(tile.getAttribute('data-qty') || '0', 10);
    addToCart(id, name, sku, price, qty);
});
document.getElementById('cart-items')?.addEventListener('click', (e) => {
    const target = e.target;
    const item = target.closest('.cart-item');
    if (!item)
        return;
    const productId = Number(item.getAttribute('data-product-id'));
    if (target.closest('.remove-line')) {
        removeFromCart(productId);
        return;
    }
    if (target.closest('.cart-qty-minus')) {
        decreaseQty(productId);
        return;
    }
    if (target.closest('.cart-qty-plus')) {
        increaseQty(productId);
    }
});
document.getElementById('sale-discount')?.addEventListener('input', renderCart);
document.getElementById('btn-complete')?.addEventListener('click', () => completeSale());
document.getElementById('btn-clear')?.addEventListener('click', clearCart);
document.getElementById('product-search')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) {
        renderProductGrid(products);
        return;
    }
    const filtered = products.filter((p) => (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q));
    renderProductGrid(filtered);
});
// ——— Cliente: buscador + registro desde POS ———
let clientSearchTimeout = null;
function hideClientResults() {
  const el = document.getElementById('pos-client-results');
  if (el) el.style.display = 'none';
}
function showClientResults(html) {
  const el = document.getElementById('pos-client-results');
  if (!el) return;
  el.innerHTML = html;
  el.style.display = 'block';
}
function selectClient(id, name) {
  const input = document.getElementById('pos-client-id');
  const search = document.getElementById('pos-client-search');
  if (input) input.value = id ? String(id) : '';
  if (search) search.value = name || '';
  hideClientResults();
}
async function searchClients(q) {
  if (!q || !q.trim()) {
    showClientResults('<div class="pos-client-results__item pos-client-results__item--new" data-action="new">+ Registrar nuevo cliente</div>');
    return;
  }
  try {
    const list = await getJson(`/api/clients/search?q=${encodeURIComponent(q.trim())}`);
    let html = list.map((c) => `<div class="pos-client-results__item" data-id="${c.id}" data-name="${(c.name || '').replace(/"/g, '&quot;')}">${(c.name || '').replace(/</g, '&lt;')}${c.document ? ' · ' + String(c.document).replace(/</g, '&lt;') : ''}</div>`).join('');
    html += '<div class="pos-client-results__item pos-client-results__item--new" data-action="new">+ Registrar nuevo cliente</div>';
    showClientResults(html || '<div class="pos-client-results__item">Sin resultados</div>');
  } catch (_) {
    showClientResults('<div class="pos-client-results__item">Error al buscar</div>');
  }
}
document.getElementById('pos-client-search')?.addEventListener('input', (e) => {
  const q = e.target.value.trim();
  const idEl = document.getElementById('pos-client-id');
  if (!q) {
    if (idEl) idEl.value = '';
    clearTimeout(clientSearchTimeout);
    hideClientResults();
    return;
  }
  clearTimeout(clientSearchTimeout);
  clientSearchTimeout = setTimeout(() => searchClients(q), 250);
});
document.getElementById('pos-client-search')?.addEventListener('focus', (e) => {
  const q = e.target.value.trim();
  if (q) searchClients(q);
  else showClientResults('<div class="pos-client-results__item pos-client-results__item--new" data-action="new">+ Registrar nuevo cliente</div>');
});
document.getElementById('pos-client-results')?.addEventListener('click', (e) => {
  const item = e.target.closest('.pos-client-results__item');
  if (!item) return;
  if (item.getAttribute('data-action') === 'new') {
    hideClientResults();
    openNewClientModal();
    return;
  }
  const id = item.getAttribute('data-id');
  const name = item.getAttribute('data-name') || '';
  if (id) selectClient(id, name);
});
document.addEventListener('click', (e) => {
  const wrap = document.querySelector('.pos-client-wrap');
  if (wrap && !wrap.contains(e.target)) hideClientResults();
});
function openNewClientModal() {
  document.getElementById('pos-new-client-name').value = '';
  document.getElementById('pos-new-client-document').value = '';
  document.getElementById('pos-new-client-phone').value = '';
  document.getElementById('pos-new-client-email').value = '';
  document.getElementById('pos-new-client-address').value = '';
  document.getElementById('pos-new-client-notes').value = '';
  document.getElementById('pos-new-client-modal').style.display = 'flex';
}
function closeNewClientModal() {
  document.getElementById('pos-new-client-modal').style.display = 'none';
}
document.getElementById('pos-new-client-modal')?.addEventListener('click', (e) => {
  if (e.target.classList.contains('overlay')) closeNewClientModal();
});
document.getElementById('pos-new-client-cancel')?.addEventListener('click', closeNewClientModal);
document.getElementById('pos-new-client-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('pos-new-client-name').value.trim();
  if (!name) return;
  const payload = {
    name,
    document: document.getElementById('pos-new-client-document').value.trim() || undefined,
    phone: document.getElementById('pos-new-client-phone').value.trim() || undefined,
    email: document.getElementById('pos-new-client-email').value.trim() || undefined,
    address: document.getElementById('pos-new-client-address').value.trim() || undefined,
    notes: document.getElementById('pos-new-client-notes').value.trim() || undefined,
  };
  try {
    const res = await fetch(`${API}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showMsg(data.error || 'Error al crear cliente', true);
      return;
    }
    selectClient(data.id, name);
    closeNewClientModal();
    showMsg(`Cliente "${name}" registrado.`, false);
  } catch (_) {
    showMsg('Error de conexión', true);
  }
});

document.getElementById('barcode-input')?.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter')
        return;
    const input = e.target;
    const barcode = input.value.trim();
    if (!barcode)
        return;
    e.preventDefault();
    try {
        const res = await fetch(`${API}/api/products/by-barcode?barcode=${encodeURIComponent(barcode)}`);
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            showMsg(data.error || 'Producto no encontrado', true);
            return;
        }
        const p = await res.json();
        const available = (p.quantity ?? 0) - cart.reduce((s, l) => (l.productId === p.id ? s + l.quantity : s), 0);
        const want = getPosQuantity();
        const addQty = Math.min(want, available);
        if (addQty <= 0) {
            showMsg('Sin stock disponible para este producto.', true);
            return;
        }
        addToCart(p.id, p.name || p.sku, p.sku || '', p.listPrice ?? 0, p.quantity ?? 0);
        input.value = '';
        showMsg(`Añadido: ${p.name || p.sku} x${addQty}`, false);
    }
    catch (_) {
        showMsg('Error de conexión', true);
    }
});
loadRate();
loadProducts();
export {};
