import { BANKS } from '../shared/banks';

const API = '';

interface Product {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  listPrice?: number;
  categoryName?: string;
  isFavorite?: boolean;
  barcode?: string;
}

interface CartLine {
  productId: number;
  name: string;
  sku: string;
  quantity: number;
  unitPriceUsd: number;
  subtotalUsd: number;
}

interface Client {
  id: number;
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

let products: Product[] = [];
let cart: CartLine[] = [];
let exchangeRate = 36.5;
const PRODUCT_GRID_PAGE_SIZE = 12;
let productGridPage = 1;
let currentProductList: Product[] = [];

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(`${API}${url}`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json() as Promise<T>;
}

async function loadRate() {
  const r = await getJson<{ exchangeRate: number }>('/api/settings/exchange-rate');
  exchangeRate = r.exchangeRate;
  const el = document.getElementById('cart-rate');
  if (el) el.textContent = `1 USD = ${exchangeRate.toFixed(2)} Bs`;
}

async function loadProducts() {
  products = await getJson<Product[]>('/api/products');
  products.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
  renderProductGrid(products);
}

function renderProductGrid(list: Product[], resetPage = true) {
  const grid = document.getElementById('product-grid')!;
  const paginationEl = document.getElementById('product-grid-pagination');
  const withStock = (list || []).filter((p) => (p.quantity ?? 0) > 0);
  currentProductList = withStock;
  if (resetPage) productGridPage = 1;
  if (withStock.length === 0) {
    grid.innerHTML = '<div class="product-grid__empty">No hay productos con stock disponible. Revisa el inventario.</div>';
    if (paginationEl) paginationEl.innerHTML = '';
    return;
  }
  const totalPages = Math.max(1, Math.ceil(withStock.length / PRODUCT_GRID_PAGE_SIZE));
  if (productGridPage > totalPages) productGridPage = totalPages;
  const start = (productGridPage - 1) * PRODUCT_GRID_PAGE_SIZE;
  const pageItems = withStock.slice(start, start + PRODUCT_GRID_PAGE_SIZE);
  grid.innerHTML = pageItems
    .map(
      (p) =>
        `<div class="product-tile" data-id="${p.id}" data-name="${(p.name || '').replace(/"/g, '&quot;')}" data-sku="${(p.sku || '').replace(/"/g, '&quot;')}" data-price="${p.listPrice ?? 0}" data-qty="${p.quantity ?? 0}">
          <div class="product-tile__name">${p.isFavorite ? '★ ' : ''}${p.name || p.sku}</div>
          <div class="product-tile__meta">${p.sku} · Stock: ${p.quantity ?? 0}</div>
          <div class="product-tile__price">$${(p.listPrice ?? 0).toFixed(2)} USD</div>
        </div>`
    )
    .join('');
  if (withStock.length > PRODUCT_GRID_PAGE_SIZE && paginationEl) {
    paginationEl.innerHTML =
      '<span class="pos-products__pagination-range">' + (start + 1) + '-' + (start + pageItems.length) + ' de ' + withStock.length + '</span>' +
      '<div class="pos-products__pagination-nav">' +
      '<button type="button" class="btn btn--ghost btn--sm product-grid-prev" ' + (productGridPage <= 1 ? ' disabled' : '') + '>Anterior</button>' +
      '<span>Pág. ' + productGridPage + ' / ' + totalPages + '</span>' +
      '<button type="button" class="btn btn--ghost btn--sm product-grid-next" ' + (productGridPage >= totalPages ? ' disabled' : '') + '>Siguiente</button>' +
      '</div>';
    paginationEl.querySelector('.product-grid-prev')?.addEventListener('click', () => { productGridPage = Math.max(1, productGridPage - 1); renderProductGrid(currentProductList, false); });
    paginationEl.querySelector('.product-grid-next')?.addEventListener('click', () => { productGridPage = Math.min(totalPages, productGridPage + 1); renderProductGrid(currentProductList, false); });
  } else if (paginationEl) {
    paginationEl.innerHTML = '';
  }
}

function getAvailableForProduct(productId: number): number {
  const product = products.find((p) => p.id === productId);
  const inCart = cart.reduce((s, l) => (l.productId === productId ? s + l.quantity : s), 0);
  return (product?.quantity ?? 0) - inCart;
}

function renderCart() {
  const container = document.getElementById('cart-items')!;
  const totalsSection = document.getElementById('cart-totals')!;
  if (cart.length === 0) {
    container.innerHTML = '<div class="cart__empty">Añade productos desde la lista</div>';
    totalsSection.style.display = 'none';
    return;
  }
  totalsSection.style.display = 'block';
  container.innerHTML = cart
    .map((line) => {
      const unitBs = Math.round(line.unitPriceUsd * exchangeRate * 100) / 100;
      const subtotalBs = Math.round(line.subtotalUsd * exchangeRate * 100) / 100;
      const canIncrease = getAvailableForProduct(line.productId) > 0;
      return `<div class="cart-item" data-product-id="${line.productId}">
          <div class="cart-item__info">
            <div class="cart-item__name">${line.name}</div>
            <div class="cart-item__qty">$${line.unitPriceUsd.toFixed(2)} <span class="cart-item__qty-bs">(Bs ${unitBs.toFixed(2)})</span> c/u</div>
          </div>
          <div class="cart-item__controls">
            <button type="button" class="cart-item__btn cart-qty-minus" title="Quitar 1" aria-label="Menos uno">−</button>
            <span class="cart-item__quantity">${line.quantity}</span>
            <button type="button" class="cart-item__btn cart-qty-plus" title="Agregar 1" aria-label="Más uno" ${canIncrease ? '' : 'disabled'}>+</button>
          </div>
          <div class="cart-item__right">
            <span class="cart-item__subtotal">$${line.subtotalUsd.toFixed(2)} <span class="cart-item__subtotal-bs">(Bs ${subtotalBs.toFixed(2)})</span></span>
            <button type="button" class="btn btn--sm btn--ghost remove-line" title="Quitar todo">Quitar</button>
          </div>
        </div>`;
    })
    .join('');

  const discountInput = document.getElementById('sale-discount') as HTMLInputElement;
  const discount = Math.max(0, Math.min(100, parseFloat(discountInput?.value || '0') || 0));
  const subtotalUsd = cart.reduce((s, l) => s + l.subtotalUsd, 0);
  const totalUsd = Math.round(subtotalUsd * (1 - discount / 100) * 100) / 100;
  const totalBs = Math.round(totalUsd * exchangeRate * 100) / 100;

  (document.getElementById('subtotal-usd') as HTMLElement).textContent = `$${subtotalUsd.toFixed(2)}`;
  (document.getElementById('discount-display') as HTMLElement).textContent = `${discount}%`;
  (document.getElementById('total-usd') as HTMLElement).textContent = `$${totalUsd.toFixed(2)}`;
  (document.getElementById('total-bs') as HTMLElement).textContent = `Bs ${totalBs.toFixed(2)}`;
}

function getPosQuantity(): number {
  const input = document.getElementById('pos-quantity') as HTMLInputElement;
  const n = parseInt(input?.value || '1', 10);
  return isNaN(n) || n < 1 ? 1 : n;
}

function addToCart(productId: number, name: string, sku: string, unitPriceUsd: number, _qty: number) {
  const product = products.find((p) => p.id === productId);
  const inCart = cart.reduce((s, l) => (l.productId === productId ? s + l.quantity : s), 0);
  const available = (product?.quantity ?? 0) - inCart;
  const want = getPosQuantity();
  const addQty = Math.min(want, available);
  if (addQty <= 0) return;
  const existing = cart.find((l) => l.productId === productId);
  if (existing) {
    existing.quantity += addQty;
    existing.subtotalUsd = Math.round(existing.unitPriceUsd * existing.quantity * 100) / 100;
  } else {
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

function removeFromCart(productId: number) {
  cart = cart.filter((l) => l.productId !== productId);
  renderCart();
}

function decreaseQty(productId: number) {
  const line = cart.find((l) => l.productId === productId);
  if (!line) return;
  if (line.quantity <= 1) {
    removeFromCart(productId);
    return;
  }
  line.quantity -= 1;
  line.subtotalUsd = Math.round(line.unitPriceUsd * line.quantity * 100) / 100;
  renderCart();
}

function increaseQty(productId: number) {
  const line = cart.find((l) => l.productId === productId);
  if (!line) return;
  const available = getAvailableForProduct(line.productId);
  if (available <= 0) return;
  const add = Math.min(1, available);
  line.quantity += add;
  line.subtotalUsd = Math.round(line.unitPriceUsd * line.quantity * 100) / 100;
  renderCart();
}

function clearCart() {
  if (cart.length > 0 && !confirm('¿Vaciar todo el carrito?')) return;
  cart = [];
  renderCart();
}

function showMsg(text: string, isError: boolean) {
  const showAlert = (window as any).showAlert;
  if (typeof showAlert === 'function') {
    showAlert({
      title: isError ? 'Aviso' : 'Listo',
      message: text,
      type: isError ? 'error' : 'success',
    });
    return;
  }
  const el = document.getElementById('sale-msg');
  if (el) {
    el.textContent = text;
    el.className = isError ? 'msg msg--error' : 'msg msg--success';
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
  }
}

function getTotals(): { totalUsd: number; totalBs: number; discountPercent: number } {
  const discountInput = document.getElementById('sale-discount') as HTMLInputElement;
  const discountPercent = Math.max(0, Math.min(100, parseFloat(discountInput?.value || '0') || 0));
  const subtotalUsd = cart.reduce((s, l) => s + l.subtotalUsd, 0);
  const totalUsd = Math.round(subtotalUsd * (1 - discountPercent / 100) * 100) / 100;
  const totalBs = Math.round(totalUsd * exchangeRate * 100) / 100;
  return { totalUsd, totalBs, discountPercent };
}

function openPaymentModal() {
  if (cart.length === 0) {
    showMsg('Añade al menos un producto al carrito.', true);
    return;
  }
  const { totalUsd, totalBs, discountPercent } = getTotals();
  const modal = document.getElementById('pos-payment-modal')!;
  const methodSelect = document.getElementById('payment-method') as HTMLSelectElement;
  const bankRef = document.getElementById('payment-bank-ref')!;
  const cashUsd = document.getElementById('payment-cash-usd')!;
  const cashBs = document.getElementById('payment-cash-bs')!;
  const bankSelect = document.getElementById('payment-bank') as HTMLSelectElement;
  const bankSearchInput = document.getElementById('payment-bank-search') as HTMLInputElement;
  const refInput = document.getElementById('payment-reference') as HTMLInputElement;
  const cashUsdInput = document.getElementById('payment-cash-received-usd') as HTMLInputElement;
  const cashBsInput = document.getElementById('payment-cash-received-bs') as HTMLInputElement;

  function fillBankSelect(filter: string) {
    const q = (filter || '').trim().toLowerCase();
    const list = q
      ? BANKS.filter((b) => b.code.toLowerCase().includes(q) || b.name.toLowerCase().includes(q))
      : BANKS;
    bankSelect.innerHTML =
      '<option value="">Seleccione el banco...</option>' +
      list.map((b) => `<option value="${b.code}">${b.code} - ${b.name}</option>`).join('');
  }
  fillBankSelect('');
  if (bankSearchInput) bankSearchInput.value = '';
  methodSelect.value = '';
  refInput.value = '';
  cashUsdInput.value = '';
  cashBsInput.value = '';
  bankRef.style.display = 'none';
  cashUsd.style.display = 'none';
  cashBs.style.display = 'none';

  (document.getElementById('payment-total-usd-display')!).textContent = totalUsd.toFixed(2);
  (document.getElementById('payment-total-bs-display')!).textContent = totalBs.toFixed(2);
  (document.getElementById('payment-change-usd-display')!).textContent = '0.00';
  (document.getElementById('payment-change-bs-display')!).textContent = '0.00';
  (document.getElementById('payment-change-bs-only-display')!).textContent = '0.00';
  (document.getElementById('payment-total-bs-display')!).textContent = totalBs.toFixed(2);

  function updatePaymentUI() {
    const method = methodSelect.value;
    bankRef.style.display = method === 'pago_movil' || method === 'tarjeta_debito' ? 'block' : 'none';
    cashUsd.style.display = method === 'efectivo_usd' ? 'block' : 'none';
    cashBs.style.display = method === 'efectivo_bs' ? 'block' : 'none';
    if (method === 'efectivo_usd') {
      const received = parseFloat(cashUsdInput.value || '0') || 0;
      const changeUsd = Math.max(0, Math.round((received - totalUsd) * 100) / 100);
      const changeBs = Math.round(changeUsd * exchangeRate * 100) / 100;
      (document.getElementById('payment-change-usd-display')!).textContent = changeUsd.toFixed(2);
      (document.getElementById('payment-change-bs-display')!).textContent = changeBs.toFixed(2);
    }
    if (method === 'efectivo_bs') {
      const received = parseFloat(cashBsInput.value || '0') || 0;
      const changeBs = Math.max(0, Math.round((received - totalBs) * 100) / 100);
      (document.getElementById('payment-change-bs-only-display')!).textContent = changeBs.toFixed(2);
    }
  }
  methodSelect.addEventListener('change', updatePaymentUI);
  cashUsdInput.addEventListener('input', updatePaymentUI);
  cashBsInput.addEventListener('input', updatePaymentUI);
  modal.style.display = 'flex';

  document.getElementById('pos-payment-cancel')!.onclick = () => {
    modal.style.display = 'none';
  };
  document.getElementById('pos-payment-form')!.onsubmit = async (e) => {
    e.preventDefault();
    const method = methodSelect.value as 'pago_movil' | 'tarjeta_debito' | 'efectivo_usd' | 'efectivo_bs';
    if (!method) {
      showMsg('Seleccione un método de pago.', true);
      return;
    }
    const clientIdEl = document.getElementById('pos-client-id') as HTMLInputElement;
    const clientId = clientIdEl?.value ? parseInt(clientIdEl.value, 10) : null;

    const body: Record<string, unknown> = {
      items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      discountPercent: getTotals().discountPercent,
      paymentMethod: method,
    };
    if (clientId != null && !isNaN(clientId)) body.clientId = clientId;
    if (method === 'pago_movil' || method === 'tarjeta_debito') {
      const bank = bankSelect.value?.trim();
      const ref = refInput.value?.trim();
      if (!ref) {
        showMsg('Indique la referencia de la transacción.', true);
        return;
      }
      body.paymentBankCode = bank || null;
      body.paymentReference = ref;
    }
    if (method === 'efectivo_usd') {
      const received = parseFloat(cashUsdInput.value || '0') || 0;
      if (received < totalUsd) {
        showMsg('El efectivo recibido no puede ser menor al total.', true);
        return;
      }
      const changeUsd = Math.round((received - totalUsd) * 100) / 100;
      const changeBs = Math.round(changeUsd * exchangeRate * 100) / 100;
      body.paymentCashReceived = received;
      body.paymentChangeUsd = changeUsd;
      body.paymentChangeBs = changeBs;
    }
    if (method === 'efectivo_bs') {
      const received = parseFloat(cashBsInput.value || '0') || 0;
      if (received < totalBs) {
        showMsg('El efectivo recibido no puede ser menor al total.', true);
        return;
      }
      const changeBs = Math.round((received - totalBs) * 100) / 100;
      body.paymentCashReceived = received;
      body.paymentChangeBs = changeBs;
    }

    const submitBtn = document.getElementById('pos-payment-submit') as HTMLButtonElement;
    submitBtn.disabled = true;
    try {
      const res = await fetch(`${API}/api/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showMsg((data as { error?: string }).error || 'Error al registrar la venta', true);
        return;
      }
      showMsg(`Venta #${data.id} registrada. Total: $${data.totalUsd.toFixed(2)} USD / Bs ${data.totalBs.toFixed(2)}`, false);
      modal.style.display = 'none';
      clearCart();
      loadProducts();
    } catch (err) {
      showMsg('Sin conexión. Revisa la red y vuelve a intentar.', true);
    } finally {
      submitBtn.disabled = false;
    }
  };
}

document.getElementById('product-grid')?.addEventListener('click', (e) => {
  const tile = (e.target as HTMLElement).closest('.product-tile');
  if (!tile) return;
  const id = Number(tile.getAttribute('data-id'));
  const name = tile.getAttribute('data-name') || '';
  const sku = tile.getAttribute('data-sku') || '';
  const price = parseFloat(tile.getAttribute('data-price') || '0');
  const qty = parseInt(tile.getAttribute('data-qty') || '0', 10);
  addToCart(id, name, sku, price, qty);
});

document.getElementById('cart-items')?.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const item = target.closest('.cart-item');
  if (!item) return;
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

document.getElementById('btn-complete')?.addEventListener('click', openPaymentModal);
document.getElementById('btn-clear')?.addEventListener('click', clearCart);

const posSearchInput = document.getElementById('pos-search-input') as HTMLInputElement;
if (posSearchInput) {
  posSearchInput.addEventListener('input', () => {
    const q = posSearchInput.value.trim().toLowerCase();
    if (!q) {
      renderProductGrid(products);
      return;
    }
    const filtered = products.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        String(p.id) === q ||
        (p.barcode || '').toLowerCase().includes(q)
    );
    renderProductGrid(filtered);
  });
  posSearchInput.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    const raw = posSearchInput.value.trim();
    if (!raw) return;
    e.preventDefault();
    let p: Product | null = null;
    const idNum = /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
    try {
      const res = await fetch(`${API}/api/products/by-barcode?barcode=${encodeURIComponent(raw)}`);
      if (res.ok) p = (await res.json()) as Product;
    } catch (_) {}
    if (!p && !isNaN(idNum)) p = products.find((x) => x.id === idNum) || null;
    if (!p) p = products.find((x) => (x.sku || '').toLowerCase() === raw.toLowerCase()) || null;
    if (!p) p = products.find((x) => (x.sku || '').toLowerCase().includes(raw.toLowerCase())) || null;
    if (!p) {
      showMsg('Producto no encontrado.', true);
      return;
    }
    const available = (p.quantity ?? 0) - cart.reduce((s, l) => (l.productId === p!.id ? s + l.quantity : s), 0);
    const want = getPosQuantity();
    const addQty = Math.min(want, available);
    if (addQty <= 0) {
      showMsg('Sin stock disponible para este producto.', true);
      return;
    }
    addToCart(p.id, p.name || p.sku, p.sku || '', p.listPrice ?? 0, p.quantity ?? 0);
    posSearchInput.value = '';
    renderProductGrid(products);
    showMsg(`Añadido: ${p.name || p.sku} x${addQty}`, false);
  });
}

let clientSearchTimer: number | null = null;
const posClientSearch = document.getElementById('pos-client-search') as HTMLInputElement;
const posClientResults = document.getElementById('pos-client-results');
const posClientId = document.getElementById('pos-client-id') as HTMLInputElement;

function hideClientResults() {
  if (posClientResults) posClientResults.style.display = 'none';
}

function selectClient(clientId: number, clientName: string) {
  if (posClientId) posClientId.value = String(clientId);
  if (posClientSearch) posClientSearch.value = clientName;
  hideClientResults();
}

function showNewClientModal() {
  hideClientResults();
  const modal = document.getElementById('pos-new-client-modal');
  if (modal) modal.style.display = 'flex';
}

if (posClientSearch && posClientResults) {
  posClientSearch.addEventListener('input', () => {
    if (posClientId) posClientId.value = '';
    const q = posClientSearch.value.trim();
    if (clientSearchTimer != null) window.clearTimeout(clientSearchTimer);
    if (!q) {
      posClientResults.innerHTML = '';
      posClientResults.style.display = 'none';
      return;
    }
    clientSearchTimer = window.setTimeout(async () => {
      clientSearchTimer = null;
      try {
        const list = await getJson<Client[]>(`/api/clients/search?q=${encodeURIComponent(q)}`);
        if (list.length === 0) {
          posClientResults.innerHTML = '<div class="pos-client-item pos-client-item--new" data-action="new"><span>No encontrado.</span> <button type="button" class="btn btn--sm btn--primary">Agregar nuevo cliente</button></div>';
        } else {
          posClientResults.innerHTML =
            list
              .map(
                (c) =>
                  `<div class="pos-client-item" data-client-id="${c.id}" data-client-name="${(c.name || '').replace(/"/g, '&quot;')}"><span>${(c.name || '').replace(/</g, '&lt;')}</span>${c.document ? ` <span class="text-muted">${String(c.document).replace(/</g, '&lt;')}</span>` : ''}</div>`
              )
              .join('') +
            '<div class="pos-client-item pos-client-item--new" data-action="new"><button type="button" class="btn btn--sm btn--ghost">➕ Agregar nuevo cliente</button></div>';
        }
        posClientResults.style.display = 'block';
        posClientResults.querySelectorAll('.pos-client-item').forEach((el) => {
          const action = (el as HTMLElement).getAttribute('data-action');
          const id = (el as HTMLElement).getAttribute('data-client-id');
          const name = (el as HTMLElement).getAttribute('data-client-name');
          if (action === 'new') {
            el.addEventListener('click', () => showNewClientModal());
          } else if (id && name) {
            el.addEventListener('click', () => selectClient(Number(id), name));
          }
        });
      } catch (_) {
        posClientResults.innerHTML = '<div class="pos-client-item text-muted">Error al buscar.</div>';
        posClientResults.style.display = 'block';
      }
    }, 250);
  });
  posClientSearch.addEventListener('blur', () => {
    setTimeout(hideClientResults, 150);
  });
}

document.getElementById('pos-new-client-cancel')?.addEventListener('click', () => {
  const modal = document.getElementById('pos-new-client-modal');
  if (modal) modal.style.display = 'none';
});

document.getElementById('pos-new-client-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = (document.getElementById('pos-new-client-name') as HTMLInputElement)?.value.trim();
  if (!name) return;
  const payload = {
    name,
    document: (document.getElementById('pos-new-client-document') as HTMLInputElement)?.value.trim() || undefined,
    phone: (document.getElementById('pos-new-client-phone') as HTMLInputElement)?.value.trim() || undefined,
    email: (document.getElementById('pos-new-client-email') as HTMLInputElement)?.value.trim() || undefined,
    address: (document.getElementById('pos-new-client-address') as HTMLInputElement)?.value.trim() || undefined,
    notes: (document.getElementById('pos-new-client-notes') as HTMLInputElement)?.value.trim() || undefined,
  };
  try {
    const res = await fetch(`${API}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showMsg((data as { error?: string }).error || 'Error al crear el cliente', true);
      return;
    }
    const newId = (data as { id: number }).id;
    selectClient(newId, name);
    const modal = document.getElementById('pos-new-client-modal');
    if (modal) modal.style.display = 'none';
    (document.getElementById('pos-new-client-name') as HTMLInputElement).value = '';
    (document.getElementById('pos-new-client-document') as HTMLInputElement).value = '';
    (document.getElementById('pos-new-client-phone') as HTMLInputElement).value = '';
    (document.getElementById('pos-new-client-email') as HTMLInputElement).value = '';
    (document.getElementById('pos-new-client-address') as HTMLInputElement).value = '';
    (document.getElementById('pos-new-client-notes') as HTMLInputElement).value = '';
    showMsg(`Cliente "${name}" agregado y seleccionado.`, false);
  } catch (_) {
    showMsg('Error de conexión al crear el cliente.', true);
  }
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

loadRate();
loadProducts();
loadLowStockBanner();
export {};
