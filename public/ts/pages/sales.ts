import { BANKS, PAYMENT_METHOD_LABELS } from '../shared/banks';

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

type PaymentMethodType = 'pago_movil' | 'tarjeta_debito' | 'efectivo_usd' | 'efectivo_bs' | 'biopago';
interface PaymentEntry {
  method: PaymentMethodType;
  amountUsd: number;
  bankCode: string | null;
  reference: string | null;
  mon: string | null;
}
const METHODS_WITH_BANK_REF: PaymentMethodType[] = ['pago_movil', 'tarjeta_debito', 'biopago'];

function openPaymentModal() {
  if (cart.length === 0) {
    showMsg('Añade al menos un producto al carrito.', true);
    return;
  }
  const { totalUsd, totalBs, discountPercent } = getTotals();
  const modal = document.getElementById('pos-payment-modal')!;
  const methodSelect = document.getElementById('payment-method') as HTMLSelectElement;
  const amountInput = document.getElementById('payment-amount-input') as HTMLInputElement;
  const amountLabel = document.getElementById('payment-amount-label');
  const amountEquivalent = document.getElementById('payment-amount-equivalent') as HTMLElement | null;
  const bankRef = document.getElementById('payment-bank-ref')!;
  const bankSelect = document.getElementById('payment-bank') as HTMLInputElement | null;
  const bankSearchInput = document.getElementById('payment-bank-search') as HTMLInputElement | null;
  const refInput = document.getElementById('payment-reference') as HTMLInputElement;
  const paymentList = document.getElementById('payment-list')!;
  const paymentListEmpty = document.getElementById('payment-list-empty')!;
  const paymentSummary = document.getElementById('payment-summary')!;
  const addBtn = document.getElementById('payment-add-btn')!;
  const submitBtn = document.getElementById('pos-payment-submit') as HTMLButtonElement;

  let paymentEntries: PaymentEntry[] = [];

  if (bankSearchInput) bankSearchInput.value = '';
  if (bankSelect) bankSelect.value = '';
  methodSelect.value = 'pago_movil';
  amountInput.value = '';
  refInput.value = '';
  bankRef.style.display = 'none';
  const bankResultsEl = document.getElementById('payment-bank-results');
  if (bankResultsEl) (bankResultsEl as HTMLElement).style.display = 'none';

  function updateAmountLabelAndEquivalent() {
    const method = methodSelect.value as PaymentMethodType;
    const isUsd = method === 'efectivo_usd';
    if (amountLabel) amountLabel.textContent = isUsd ? 'Monto (USD) *' : 'Monto (Bs) *';
    if (amountEquivalent) {
      amountEquivalent.style.display = isUsd ? 'none' : 'block';
      const val = parseFloat(amountInput.value || '0') || 0;
      if (!isUsd && exchangeRate > 0 && val > 0) {
        const equiv = Math.round((val / exchangeRate) * 100) / 100;
        amountEquivalent.textContent = 'Equiv. USD: $' + equiv.toFixed(2);
      } else {
        amountEquivalent.textContent = '';
      }
    }
  }

  function updateAddFormVisibility() {
    const method = methodSelect.value as PaymentMethodType;
    const show = METHODS_WITH_BANK_REF.indexOf(method) >= 0;
    bankRef.style.display = show ? 'block' : 'none';
    if (!show && bankResultsEl) (bankResultsEl as HTMLElement).style.display = 'none';
    updateAmountLabelAndEquivalent();
  }

  function renderPaymentList() {
    const totalPaid = paymentEntries.reduce((s, p) => s + p.amountUsd, 0);
    paymentList.innerHTML = paymentEntries
      .map((p, i) => {
        const label = PAYMENT_METHOD_LABELS[p.method] || p.method;
        let extra = '';
        if (p.bankCode) {
          const bank = BANKS.find((b) => b.code === p.bankCode);
          extra += bank ? ` · ${bank.name}` : '';
        }
        if (p.reference) extra += ` · Ref: ${String(p.reference).replace(/</g, '&lt;')}`;
        const amountBs = Math.round((p.amountUsd * exchangeRate) * 100) / 100;
        return `<li class="payment-list-item">
          <span>${label} · $${Number(p.amountUsd).toFixed(2)} USD (Bs ${amountBs.toFixed(2)})${extra ? ` <span class="text-muted">${extra}</span>` : ''}</span>
          <button type="button" class="btn btn--ghost btn--sm payment-remove-btn" data-index="${i}" aria-label="Quitar">Quitar</button>
        </li>`;
      })
      .join('');
    paymentListEmpty.style.display = paymentEntries.length > 0 ? 'none' : 'block';
    const paidRounded = Math.round(totalPaid * 100) / 100;
    const ok = paidRounded >= totalUsd;
    if (paymentEntries.length === 0) {
      paymentSummary.textContent = 'Agrega al menos un pago. La suma debe ser mayor o igual al total.';
      paymentSummary.style.color = '';
    } else if (!ok) {
      const missingUsd = totalUsd - paidRounded;
      const missingBs = totalUsd > 0 ? Math.round((missingUsd * totalBs / totalUsd) * 100) / 100 : 0;
      paymentSummary.textContent = `Total pagado: $${paidRounded.toFixed(2)} USD. Falta $${missingUsd.toFixed(2)} USD (Bs ${missingBs.toFixed(2)}) para completar la venta.`;
      paymentSummary.style.color = 'var(--danger, #c00)';
    } else {
      const paidBs = totalUsd > 0 ? Math.round((paidRounded * totalBs / totalUsd) * 100) / 100 : 0;
      let msg = `Total pagado: $${paidRounded.toFixed(2)} USD (Bs ${paidBs.toFixed(2)}).`;
      if (paidRounded > totalUsd) {
        const changeUsd = paidRounded - totalUsd;
        const changeBs = totalUsd > 0 ? Math.round((changeUsd * totalBs / totalUsd) * 100) / 100 : 0;
        msg += ` Cambio: $${changeUsd.toFixed(2)} USD / Bs ${changeBs.toFixed(2)}.`;
      }
      paymentSummary.textContent = msg;
      paymentSummary.style.color = '';
    }
    submitBtn.disabled = !ok;
    paymentList.querySelectorAll('.payment-remove-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index')!, 10);
        paymentEntries = paymentEntries.filter((_, i) => i !== idx);
        renderPaymentList();
      });
    });
  }

  document.getElementById('payment-total-usd-display')!.textContent = totalUsd.toFixed(2);
  document.getElementById('payment-total-bs-display')!.textContent = totalBs.toFixed(2);
  paymentEntries = [];
  renderPaymentList();
  updateAddFormVisibility();
  methodSelect.addEventListener('change', updateAddFormVisibility);
  amountInput.addEventListener('input', updateAmountLabelAndEquivalent);

  addBtn.onclick = () => {
    const method = methodSelect.value as PaymentMethodType;
    const amount = parseFloat(amountInput.value || '0') || 0;
    if (amount <= 0) {
      showMsg('El monto debe ser mayor a 0.', true);
      return;
    }
    const amountRounded = Math.round(amount * 100) / 100;
    const amountUsd = method === 'efectivo_usd' ? amountRounded : Math.round((amountRounded / exchangeRate) * 100) / 100;
    if (METHODS_WITH_BANK_REF.indexOf(method) >= 0) {
      const ref = refInput.value?.trim();
      if (!ref) {
        showMsg('Indica la referencia de la transacción.', true);
        return;
      }
      const bank = (bankSelect && bankSelect.value) ? bankSelect.value.trim() || null : null;
      paymentEntries.push({ method, amountUsd, bankCode: bank, reference: ref, mon: null });
    } else {
      paymentEntries.push({ method, amountUsd, bankCode: null, reference: null, mon: null });
    }
    amountInput.value = '';
    if (amountEquivalent) amountEquivalent.textContent = '';
    refInput.value = '';
    renderPaymentList();
  };

  modal.style.display = 'flex';
  document.getElementById('pos-payment-cancel')!.onclick = () => { modal.style.display = 'none'; };

  submitBtn.onclick = async () => {
    const totalPaid = paymentEntries.reduce((s, p) => s + p.amountUsd, 0);
    if (Math.round(totalPaid * 100) / 100 < totalUsd) {
      showMsg('La suma de los pagos no puede ser menor al total de la venta.', true);
      return;
    }
    const clientIdEl = document.getElementById('pos-client-id') as HTMLInputElement;
    const clientId = clientIdEl?.value ? parseInt(clientIdEl.value, 10) : null;
    const body: Record<string, unknown> = {
      items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      discountPercent,
      payments: paymentEntries.map((p) => ({ method: p.method, amountUsd: p.amountUsd, bankCode: p.bankCode || null, reference: p.reference || null, mon: null })),
    };
    if (clientId != null && !isNaN(clientId)) body.clientId = clientId;
    submitBtn.disabled = true;
    try {
      const res = await fetch(`${API}/api/sales`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { id?: number; totalUsd?: number; totalBs?: number; error?: string };
      if (!res.ok) {
        showMsg(data.error || 'Error al registrar la venta', true);
        return;
      }
      showMsg(`Venta #${data.id} registrada. Total: $${data.totalUsd!.toFixed(2)} USD / Bs ${data.totalBs!.toFixed(2)}`, false);
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

(function () {
  const searchInput = document.getElementById('payment-bank-search') as HTMLInputElement | null;
  const resultsEl = document.getElementById('payment-bank-results');
  const hiddenBank = document.getElementById('payment-bank') as HTMLInputElement | null;
  if (!searchInput || !resultsEl || !hiddenBank) return;
  searchInput.addEventListener('input', function () {
    const q = (this.value || '').trim().toLowerCase();
    const list = q ? BANKS.filter((b) => b.code.toLowerCase().includes(q) || b.name.toLowerCase().includes(q)) : BANKS;
    if (list.length === 0) {
      resultsEl.innerHTML = '<div class="payment-bank-results__item" style="pointer-events:none; color: var(--text-muted);">Sin resultados</div>';
    } else {
      resultsEl.innerHTML = list
        .map((b) => `<button type="button" class="payment-bank-results__item" data-code="${b.code}" data-name="${(b.name || '').replace(/"/g, '&quot;')}"><span class="payment-bank-results__code">${b.code}</span>${b.name || ''}</button>`)
        .join('');
    }
    (resultsEl as HTMLElement).style.display = 'block';
  });
  searchInput.addEventListener('focus', function () {
    if (this.value.trim()) return;
    const list = BANKS;
    resultsEl.innerHTML = list
      .map((b) => `<button type="button" class="payment-bank-results__item" data-code="${b.code}" data-name="${(b.name || '').replace(/"/g, '&quot;')}"><span class="payment-bank-results__code">${b.code}</span>${b.name || ''}</button>`)
      .join('');
    (resultsEl as HTMLElement).style.display = list.length ? 'block' : 'none';
  });
  resultsEl.addEventListener('click', (e) => {
    const item = (e.target as HTMLElement).closest('.payment-bank-results__item');
    if (!item || !item.getAttribute('data-code')) return;
    const code = item.getAttribute('data-code')!;
    const name = item.getAttribute('data-name') || '';
    hiddenBank.value = code;
    searchInput.value = name;
    (resultsEl as HTMLElement).style.display = 'none';
  });
  document.addEventListener('click', (e) => {
    if ((resultsEl as HTMLElement).style.display !== 'none' && e.target !== searchInput && e.target !== resultsEl && !resultsEl.contains(e.target as Node))
      (resultsEl as HTMLElement).style.display = 'none';
  });
})();

export {};
